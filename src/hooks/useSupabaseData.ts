import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/useAuth';
import { 
  ServiceOrder, 
  Venda, 
  PrimeiroPagamento, 
  Meta, 
  VendaMeta, 
  BaseData 
} from '@/types';

interface ImportResult {
  totalProcessed: number;
  newRecords: number;
  updatedRecords: number;
  duplicatesIgnored: number;
}

export interface SupabaseDataState {
  serviceOrders: ServiceOrder[];
  vendas: Venda[];
  pagamentos: PrimeiroPagamento[];
  metas: Meta[];
  vendasMeta: VendaMeta[];
  baseData: BaseData[];
  loading: boolean;
  syncing: boolean;
}

export function useSupabaseData() {
  const { user } = useAuth();
  const [state, setState] = useState<SupabaseDataState>({
    serviceOrders: [],
    vendas: [],
    pagamentos: [],
    metas: [],
    vendasMeta: [],
    baseData: [],
    loading: false,
    syncing: false
  });

  // Função para obter campos de timestamp por tabela
  const getTimestampFields = (tableName: string): string[] => {
    const timestampFields: Record<string, string[]> = {
      service_orders: ['data_criacao', 'data_finalizacao'],
      vendas: ['data_habilitacao'],
      pagamentos: ['data_passo_cobranca', 'vencimento_fatura', 'data_importacao'],
      metas: ['data_criacao', 'data_atualizacao'],
      vendas_meta: ['data_venda'],
      base_data: [] // base_data não tem campos de timestamp específicos dos dados do usuário
    };
    return timestampFields[tableName] || [];
  };

  // Função para sanitizar dados antes da inserção no Supabase
  const sanitizeDataForSupabase = useCallback((data: Record<string, unknown>[], tableName: string): Record<string, unknown>[] => {
    console.log(`[SANITIZAÇÃO] Iniciando sanitização para ${tableName}: ${data.length} registros`);
    
    return data.map((item, index) => {
      const sanitized = { ...item };
      
      // APLICAR LÓGICA DE NEGÓCIO PRIMEIRO (igual ao DataContext)
      if (tableName === 'service_orders') {
        // Replicar lógica para casos cancelados - usar data de criação como finalização se necessário
        if (sanitized.status === "Cancelada" && 
            (sanitized.subtipo_servico === "Corretiva" || sanitized.subtipo_servico === "Corretiva BL") && 
            (!sanitized.data_finalizacao || sanitized.data_finalizacao === "" || sanitized.data_finalizacao === null) && 
            sanitized.data_criacao) {
          console.log(`[SANITIZAÇÃO] OS ${sanitized.codigo_os} (cancelada ${sanitized.subtipo_servico}): Replicando data de criação para finalização`);
          sanitized.data_finalizacao = sanitized.data_criacao;
        }
      }
      
      // SANITIZAR CAMPOS DE TIMESTAMP - converter strings vazias para null
      const timestampFields = getTimestampFields(tableName);
      timestampFields.forEach(field => {
        if (sanitized[field] === "" || sanitized[field] === null || sanitized[field] === undefined) {
          // Converter string vazia para null (aceito pelo Supabase)
          sanitized[field] = null;
          console.log(`[SANITIZAÇÃO] ${tableName}[${index}].${field}: string vazia convertida para null`);
        } else if (typeof sanitized[field] === 'string' && sanitized[field] !== null) {
          // Validar e formatar timestamps válidos
          try {
            const date = new Date(sanitized[field] as string);
            if (isNaN(date.getTime())) {
              console.warn(`[SANITIZAÇÃO] ${tableName}[${index}].${field}: timestamp inválido "${sanitized[field]}" convertido para null`);
              sanitized[field] = null;
            } else {
              // Manter timestamp válido no formato ISO
              sanitized[field] = date.toISOString();
            }
          } catch (error) {
            console.warn(`[SANITIZAÇÃO] ${tableName}[${index}].${field}: erro ao processar timestamp "${sanitized[field]}" - convertido para null`);
            sanitized[field] = null;
          }
        }
      });
      
      return sanitized;
    });
  }, []);

  // Função para carregar dados do Supabase
  const loadFromSupabase = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      console.log('[SUPABASE] Carregando dados do usuário...');

      // Carregar todos os tipos de dados em paralelo
      const [
        serviceOrdersResponse,
        vendasResponse,
        pagamentosResponse,
        metasResponse,
        vendasMetaResponse,
        baseDataResponse
      ] = await Promise.all([
        supabase.from('service_orders').select('*').eq('user_id', user.id),
        supabase.from('vendas').select('*').eq('user_id', user.id),
        supabase.from('pagamentos').select('*').eq('user_id', user.id),
        supabase.from('metas').select('*').eq('user_id', user.id),
        supabase.from('vendas_meta').select('*').eq('user_id', user.id),
        supabase.from('base_data').select('*').eq('user_id', user.id)
      ]);

      // Verificar erros
      const responses = [
        { name: 'service_orders', response: serviceOrdersResponse },
        { name: 'vendas', response: vendasResponse },
        { name: 'pagamentos', response: pagamentosResponse },
        { name: 'metas', response: metasResponse },
        { name: 'vendas_meta', response: vendasMetaResponse },
        { name: 'base_data', response: baseDataResponse }
      ];

      for (const { name, response } of responses) {
        if (response.error) {
          console.error(`[SUPABASE] Erro ao carregar ${name}:`, response.error);
          throw response.error;
        }
      }

      setState(prev => ({
        ...prev,
        serviceOrders: serviceOrdersResponse.data || [],
        vendas: vendasResponse.data || [],
        pagamentos: pagamentosResponse.data || [],
        metas: metasResponse.data || [],
        vendasMeta: vendasMetaResponse.data || [],
        baseData: baseDataResponse.data || [],
        loading: false
      }));

      console.log('[SUPABASE] Dados carregados com sucesso');

    } catch (error) {
      console.error('[SUPABASE] Erro ao carregar dados:', error);
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [user]);

  // Carregar dados quando o usuário mudar
  useEffect(() => {
    if (user) {
      loadFromSupabase();
    }
  }, [user, loadFromSupabase]);

  // Função para verificar duplicatas antes da inserção
  const handleDuplicateCheck = useCallback(async (tableName: string, newData: Record<string, unknown>[]) => {
    if (!user) throw new Error('Usuário não autenticado');

    // Buscar dados existentes
    const { data: existingData, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    let dataToInsert: Record<string, unknown>[] = [];
    let duplicatesIgnored = 0;

    // Lógica específica de duplicatas por tipo de tabela
    switch (tableName) {
      case 'service_orders': {
        const existingCodes = new Set(existingData?.map((item: Record<string, unknown>) => item.codigo_os) || []);
        dataToInsert = newData.filter((item: Record<string, unknown>) => !existingCodes.has(item.codigo_os));
        duplicatesIgnored = newData.length - dataToInsert.length;
        break;
      }

      case 'vendas': {
        const existingPropostas = new Set(existingData?.map((item: Record<string, unknown>) => item.numero_proposta) || []);
        dataToInsert = newData.filter((item: Record<string, unknown>) => !existingPropostas.has(item.numero_proposta));
        duplicatesIgnored = newData.length - dataToInsert.length;
        break;
      }

      case 'pagamentos': {
        // Para pagamentos, manter sempre o mais recente por proposta baseado na data_importacao
        // Primeiro, criar um mapa com todos os dados existentes no Supabase
        const existingByProposta = new Map<string, {
          data: Record<string, unknown>;
          dataImportacao: Date;
        }>();
        
        (existingData || []).forEach((item: Record<string, unknown>) => {
          const proposta = item.proposta as string;
          const dataImportacao = new Date(item.data_importacao as string || 0);
          existingByProposta.set(proposta, {
            data: item,
            dataImportacao
          });
        });

        // Processar os novos dados e determinar quais devem ser mantidos
        const registrosParaInserir: Record<string, unknown>[] = [];
        const propostasParaAtualizar: string[] = [];
        
        newData.forEach((item: Record<string, unknown>) => {
          const proposta = item.proposta as string;
          const novaDataImportacao = new Date(item.data_importacao as string || 0);
          
          if (existingByProposta.has(proposta)) {
            const existingItem = existingByProposta.get(proposta)!;
            
            // Substituir apenas se o novo registro for mais recente
            if (novaDataImportacao > existingItem.dataImportacao) {
              registrosParaInserir.push(item);
              propostasParaAtualizar.push(proposta);
              console.log(`[PAGAMENTO MIGRAÇÃO] Atualizado proposta ${proposta} (${existingItem.dataImportacao.toISOString()} -> ${novaDataImportacao.toISOString()})`);
            } else {
              console.log(`[PAGAMENTO MIGRAÇÃO] Ignorado proposta ${proposta} (registro mais antigo: ${novaDataImportacao.toISOString()} vs ${existingItem.dataImportacao.toISOString()})`);
            }
          } else {
            // Proposta não existia, adicionar
            registrosParaInserir.push(item);
            console.log(`[PAGAMENTO MIGRAÇÃO] Adicionado novo pagamento para proposta ${proposta}`);
          }
        });
        
        // Se há registros para atualizar, deletar os existentes primeiro
        if (propostasParaAtualizar.length > 0) {
          console.log(`[PAGAMENTO MIGRAÇÃO] Deletando ${propostasParaAtualizar.length} propostas existentes que serão atualizadas`);
          
          // Deletar registros existentes que serão atualizados de forma síncrona
          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .eq('user_id', user.id)
            .in('proposta', propostasParaAtualizar);
          
          if (deleteError) {
            console.error('[PAGAMENTO MIGRAÇÃO] Erro ao deletar registros para atualização:', deleteError);
            throw deleteError;
          }
        }
        
        dataToInsert = registrosParaInserir;
        duplicatesIgnored = newData.length - registrosParaInserir.length;
        break;
      }

      case 'metas': {
        const existingMetas = new Set(
          existingData?.map((item: Record<string, unknown>) => `${item.mes}-${item.ano}`) || []
        );
        dataToInsert = newData.filter((item: Record<string, unknown>) => 
          !existingMetas.has(`${item.mes}-${item.ano}`)
        );
        duplicatesIgnored = newData.length - dataToInsert.length;
        break;
      }

      case 'vendas_meta': {
        const existingPropostas = new Set(existingData?.map((item: Record<string, unknown>) => item.numero_proposta) || []);
        dataToInsert = newData.filter((item: Record<string, unknown>) => !existingPropostas.has(item.numero_proposta));
        duplicatesIgnored = newData.length - dataToInsert.length;
        break;
      }

      case 'base_data': {
        const existingBaseData = new Set(existingData?.map((item: Record<string, unknown>) => item.mes) || []);
        dataToInsert = newData.filter((item: Record<string, unknown>) => !existingBaseData.has(item.mes));
        duplicatesIgnored = newData.length - dataToInsert.length;
        break;
      }

      default: {
        // Fallback: inserir todos os dados
        dataToInsert = newData;
        duplicatesIgnored = 0;
        break;
      }
    }

    return { dataToInsert, duplicatesIgnored };
  }, [user]);

  // Função para migrar dados do localStorage para Supabase
  const migrateFromLocalStorage = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'Usuário não autenticado' };

    setState(prev => ({ ...prev, syncing: true }));

    try {
      const STORAGE_KEYS = {
        SERVICE_ORDERS: 'sysgest_service_orders',
        VENDAS: 'sysgest_vendas',
        PAGAMENTOS: 'sysgest_pagamentos',
        METAS: 'sysgest_metas',
        VENDAS_META: 'sysgest_vendas_meta',
        BASE_DATA: 'sysgest_base_data'
      };

      let migratedCount = 0;
      let totalProcessed = 0;
      let totalDuplicates = 0;

      for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
        const data = localStorage.getItem(storageKey);
        if (data) {
          const parsedData = JSON.parse(data);
          if (parsedData.length > 0) {
            let tableName = '';
            switch (key) {
              case 'SERVICE_ORDERS':
                tableName = 'service_orders';
                break;
              case 'VENDAS':
                tableName = 'vendas';
                break;
              case 'PAGAMENTOS':
                tableName = 'pagamentos';
                break;
              case 'METAS':
                tableName = 'metas';
                break;
              case 'VENDAS_META':
                tableName = 'vendas_meta';
                break;
              case 'BASE_DATA':
                tableName = 'base_data';
                break;
            }

            if (tableName) {
              console.log(`[MIGRAÇÃO] Processando ${tableName}: ${parsedData.length} registros`);
              
              // Verificar duplicatas antes de inserir
              const { dataToInsert, duplicatesIgnored } = await handleDuplicateCheck(tableName, parsedData);
              
              if (dataToInsert.length > 0) {
                // APLICAR SANITIZAÇÃO ANTES DA INSERÇÃO
                const sanitizedData = sanitizeDataForSupabase(dataToInsert, tableName);
                
                const dataWithUserId = sanitizedData.map(item => ({
                  ...item,
                  user_id: user.id,
                  imported_at: new Date().toISOString()
                }));

                const { error } = await supabase.from(tableName).insert(dataWithUserId);
                if (error) throw error;

                console.log(`[MIGRAÇÃO] ${tableName}: ${dataToInsert.length} novos registros, ${duplicatesIgnored} duplicatas ignoradas`);
                migratedCount++;
              }

              totalProcessed += parsedData.length;
              totalDuplicates += duplicatesIgnored;
            }
          }
        }
      }

      await loadFromSupabase();
      setState(prev => ({ ...prev, syncing: false }));
      
      if (migratedCount > 0) {
        return { 
          success: true, 
          message: `Migração concluída! ${migratedCount} tipos de dados migrados. Total processado: ${totalProcessed}, duplicatas ignoradas: ${totalDuplicates}.` 
        };
      } else {
        return { 
          success: true, 
          message: 'Nenhum dado novo encontrado para migrar (todos já existem no Supabase).' 
        };
      }

    } catch (error) {
      console.error('[MIGRAÇÃO] Erro durante a migração:', error);
      setState(prev => ({ ...prev, syncing: false }));
      return { success: false, message: `Erro durante a migração: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
    }
  }, [user, loadFromSupabase, handleDuplicateCheck, sanitizeDataForSupabase]);

  // Função para importar dados direto para o Supabase (bypass localStorage)
  const importToSupabase = useCallback(async (
    tableName: string,
    data: Record<string, unknown>[],
    append: boolean = true
  ): Promise<ImportResult> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setState(prev => ({ ...prev, syncing: true }));

      if (data.length === 0) {
        return { totalProcessed: 0, newRecords: 0, updatedRecords: 0, duplicatesIgnored: 0 };
      }

      console.log(`[IMPORTAÇÃO] ${tableName}: Processando ${data.length} registros (append: ${append})`);

      let result: ImportResult;

      if (append) {
        // Verificar duplicatas e inserir apenas novos registros
        const { dataToInsert, duplicatesIgnored } = await handleDuplicateCheck(tableName, data);
        
        if (dataToInsert.length > 0) {
          // APLICAR SANITIZAÇÃO ANTES DA INSERÇÃO
          const sanitizedData = sanitizeDataForSupabase(dataToInsert, tableName);
          
          const dataWithUserId = sanitizedData.map(item => ({
            ...item,
            user_id: user.id,
            imported_at: new Date().toISOString()
          }));

          const { error } = await supabase.from(tableName).insert(dataWithUserId);
          if (error) throw error;

          console.log(`[IMPORTAÇÃO] ${tableName}: ${dataToInsert.length} novos registros, ${duplicatesIgnored} duplicatas ignoradas`);
        }

        result = {
          totalProcessed: data.length,
          newRecords: dataToInsert.length,
          updatedRecords: 0,
          duplicatesIgnored
        };
      } else {
        // Substituir completamente - deletar dados existentes do usuário
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // APLICAR SANITIZAÇÃO ANTES DA INSERÇÃO
        const sanitizedData = sanitizeDataForSupabase(data, tableName);

        // Inserir novos dados
        const dataWithUserId = sanitizedData.map(item => ({
          ...item,
          user_id: user.id,
          imported_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase.from(tableName).insert(dataWithUserId);
        if (insertError) throw insertError;

        console.log(`[IMPORTAÇÃO] ${tableName}: ${data.length} registros substituídos`);

        result = {
          totalProcessed: data.length,
          newRecords: data.length,
          updatedRecords: 0,
          duplicatesIgnored: 0
        };
      }

      // Recarregar dados do Supabase
      await loadFromSupabase();

      return result;
    } finally {
      setState(prev => ({ ...prev, syncing: false }));
    }
  }, [user, handleDuplicateCheck, loadFromSupabase, sanitizeDataForSupabase]);

  return {
    ...state,
    loadFromSupabase,
    migrateFromLocalStorage,
    importToSupabase
  };
} 