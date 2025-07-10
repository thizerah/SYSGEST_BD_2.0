import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import useData from '@/context/useData';
import { PrimeiroPagamento } from '@/types';
import { 
  CloudDownload, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Loader2,
  Trash2,
  Cloud,
  HardDrive,
  RotateCcw
} from 'lucide-react';

export function DataMigrationPanel() {
  console.log('=== PAINEL DE MIGRAÇÃO RENDERIZADO ===');
  
  const { migrateFromLocalStorage, syncing, pagamentos: supabasePagamentos } = useSupabaseData();
  const { clearLocalStorageAfterMigration, isSupabaseOnlyMode, disableSupabaseOnlyMode } = useData();
  const { toast } = useToast();
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [hasPotentialUpdates, setHasPotentialUpdates] = useState(false);
  
  // Log básico para verificar se há dados de pagamentos
  const pagamentosLocal = localStorage.getItem('sysgest_pagamentos');
  console.log('Pagamentos localStorage:', pagamentosLocal ? 'TEM DADOS' : 'VAZIO');
  console.log('📄 Conteúdo localStorage:', pagamentosLocal);
  console.log('Pagamentos Supabase:', supabasePagamentos?.length || 0);
  console.log('🔧 Modo Supabase-only:', isSupabaseOnlyMode());
  console.log('hasPotentialUpdates:', hasPotentialUpdates);

  // Verificar se existem dados no localStorage
  const checkLocalStorageData = () => {
    const STORAGE_KEYS = {
      'Ordens de Serviço': 'sysgest_service_orders',
      'Vendas': 'sysgest_vendas',
      'Pagamentos': 'sysgest_pagamentos',
      'Metas': 'sysgest_metas',
      'Vendas Meta': 'sysgest_vendas_meta',
      'Base Data': 'sysgest_base_data'
    };

    const dataFound: { name: string; count: number }[] = [];

    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const data = localStorage.getItem(key);
      console.log(`🔍 Verificando ${name} (${key}):`, data ? `TEM DADOS (${data.length} chars)` : 'VAZIO');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          console.log(`🔍 ${name} parsed:`, Array.isArray(parsed) ? `Array com ${parsed.length} items` : typeof parsed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            dataFound.push({ name, count: parsed.length });
            console.log(`✅ ${name} adicionado ao dataFound: ${parsed.length} registros`);
          }
        } catch (error) {
          console.error(`❌ Erro ao parsear ${key}:`, error);
        }
      }
    });

    console.log('📋 dataFound final:', dataFound);
    return dataFound;
  };

  // Verificar se há potenciais atualizações nos pagamentos
  const checkPotentialPagamentosUpdates = useCallback(async () => {
    try {
      console.log('🔍 [INICIO] checkPotentialPagamentosUpdates executado');
      
      const localPagamentos = localStorage.getItem('sysgest_pagamentos');
      if (!localPagamentos) {
        console.log('❌ Nenhum dado no localStorage');
        return false;
      }

      const parsedLocalPagamentos: PrimeiroPagamento[] = JSON.parse(localPagamentos);
      console.log('📦 Dados locais:', parsedLocalPagamentos.length, 'registros');
      
      if (parsedLocalPagamentos.length === 0) {
        console.log('❌ Array vazio no localStorage');
        return false;
      }

      // Verificar se há registros no localStorage que podem atualizar os do Supabase
      const supabasePagamentosMap = new Map<string, Date>();
      console.log('📦 Dados Supabase:', supabasePagamentos.length, 'registros');
      
      supabasePagamentos.forEach(pagamento => {
        supabasePagamentosMap.set(
          pagamento.proposta, 
          new Date(pagamento.data_importacao)
        );
      });

      // Verificar se há registros locais mais recentes que os do Supabase
      let novosRegistros = 0;
      let atualizacoesPossveis = 0;
      
      const hasUpdates = parsedLocalPagamentos.some(localPagamento => {
        const supabaseDate = supabasePagamentosMap.get(localPagamento.proposta);
        if (!supabaseDate) {
          novosRegistros++;
          return true; // Novo registro
        }

        const localDate = new Date(localPagamento.data_importacao);
        if (localDate > supabaseDate) {
          atualizacoesPossveis++;
          console.log(`🔄 Atualização possível: ${localPagamento.proposta} (${localDate.toISOString()} > ${supabaseDate.toISOString()})`);
          return true; // Registro mais recente
        }
        
        return false;
      });

      console.log('🔍 Verificação de atualizações:', {
        hasUpdates,
        novosRegistros,
        atualizacoesPossveis,
        totalLocal: parsedLocalPagamentos.length,
        totalSupabase: supabasePagamentos.length
      });

      return hasUpdates;
    } catch (error) {
      console.error('❌ Erro ao verificar potenciais atualizações de pagamentos:', error);
      return false;
    }
  }, [supabasePagamentos]);

  // Verificar potenciais atualizações quando os dados do Supabase mudarem
  useEffect(() => {
    const checkUpdates = async () => {
      const hasUpdates = await checkPotentialPagamentosUpdates();
      console.log('🔄 useEffect executado - hasPotentialUpdates:', hasUpdates);
      setHasPotentialUpdates(hasUpdates);
    };

    checkUpdates();
  }, [checkPotentialPagamentosUpdates]);

  const localStorageData = checkLocalStorageData();
  const hasLocalData = localStorageData.length > 0;
  const canMigrate = hasLocalData || hasPotentialUpdates;
  
  console.log('🎯 Estado do botão:', { 
    hasLocalData, 
    hasPotentialUpdates, 
    canMigrate
  });

  const handleMigration = async () => {
    try {
      const result = await migrateFromLocalStorage();
      setMigrationResult(result);

      if (result.success) {
        toast({
          title: "✅ Migração Concluída",
          description: result.message,
          variant: "default"
        });
      } else {
        toast({
          title: "❌ Erro na Migração",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro durante a migração:', error);
      toast({
        title: "❌ Erro na Migração",
        description: "Erro inesperado durante a migração. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleClearLocalStorage = () => {
    clearLocalStorageAfterMigration();
    setMigrationResult(null);
    toast({
      title: "🧹 LocalStorage Limpo",
      description: "Dados locais removidos. Sistema agora trabalha apenas com Supabase.",
      variant: "default"
    });
  };

  const handleEnableLocalStorage = () => {
    disableSupabaseOnlyMode();
    toast({
      title: "🔄 Modo LocalStorage Ativado",
      description: "Sistema voltará a usar localStorage para novos dados importados.",
      variant: "default"
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="space-y-6 pt-6">
        {/* Status do modo de operação */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center space-x-2">
            {isSupabaseOnlyMode() ? (
              <>
                <Cloud className="h-4 w-4 text-blue-600" />
                <span>Modo: Apenas Supabase (Nuvem)</span>
              </>
            ) : (
              <>
                <HardDrive className="h-4 w-4 text-gray-600" />
                <span>Modo: LocalStorage + Supabase</span>
              </>
            )}
          </h3>
          
          <Alert className={isSupabaseOnlyMode() ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}>
            {isSupabaseOnlyMode() ? (
              <>
                <Cloud className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Sistema em modo nuvem:</strong> Dados são carregados diretamente do Supabase. 
                  Importações são salvas temporariamente no localStorage para revisão antes da migração.
                </AlertDescription>
              </>
            ) : (
              <>
                <HardDrive className="h-4 w-4 text-gray-600" />
                <AlertDescription className="text-gray-800">
                  <strong>Sistema em modo híbrido:</strong> Dados podem ser importados para localStorage 
                  e depois migrados para Supabase.
                </AlertDescription>
              </>
            )}
          </Alert>

          {/* Botão para alternar modo */}
          {isSupabaseOnlyMode() && (
            <Button 
              onClick={handleEnableLocalStorage}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Voltar ao Modo LocalStorage
            </Button>
          )}
        </div>

        {/* Status dos dados no localStorage */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Dados Encontrados no LocalStorage</span>
          </h3>
          
          {hasLocalData ? (
            <div className="space-y-2">
              {localStorageData.map((data, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{data.name}</span>
                  <span className="text-sm text-gray-600">{data.count.toLocaleString()} registros</span>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Nenhum dado encontrado no localStorage para migrar.
              </AlertDescription>
            </Alert>
          )}

          {/* Status especial para atualizações de pagamentos */}
          {hasPotentialUpdates && !hasLocalData && (
            <Alert className="mt-3 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Atualizações disponíveis:</strong> Há registros de pagamentos no localStorage 
                que podem atualizar dados existentes no Supabase (baseado na data de importação).
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Informações sobre a migração */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> A migração irá transferir todos os seus dados do navegador 
            para o Supabase{hasPotentialUpdates && !hasLocalData ? ' e atualizar registros existentes com dados mais recentes' : ''}. 
            Após a migração, seus dados ficarão seguros na nuvem e sincronizados entre dispositivos.
          </AlertDescription>
        </Alert>

        {/* Botão de migração */}
        <div className="space-y-4">
          {syncing && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Migrando dados para o Supabase...</span>
              </div>
              <Progress value={50} className="h-2" />
            </div>
          )}

          <Button 
            onClick={handleMigration}
            disabled={!canMigrate || syncing}
            className="w-full"
            size="lg"
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Migrando...
              </>
            ) : (
              <>
                <CloudDownload className="h-4 w-4 mr-2" />
                {canMigrate ? 
                  (hasLocalData ? 'Migrar Dados para Supabase' : 'Atualizar Dados no Supabase') : 
                  'Nenhum Dado para Migrar'
                }
              </>
            )}
          </Button>
        </div>

        {/* Resultado da migração */}
        {migrationResult && (
          <div className="space-y-3">
            <Alert className={migrationResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {migrationResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={migrationResult.success ? 'text-green-800' : 'text-red-800'}>
                {migrationResult.message}
              </AlertDescription>
            </Alert>

            {/* Botão para limpar localStorage após migração bem-sucedida */}
            {migrationResult.success && hasLocalData && (
              <Button 
                onClick={handleClearLocalStorage}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Dados Locais e Carregar do Supabase
              </Button>
            )}
          </div>
        )}

        {/* Instruções */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• <strong>Fluxo de importação:</strong> Importe → Revise → Migre → Sistema limpa automaticamente</p>
          <p>• <strong>Importação:</strong> Dados novos são salvos temporariamente no localStorage para revisão</p>
          <p>• <strong>Migração:</strong> Envia apenas registros novos para o Supabase (ignora duplicatas)</p>
          <p>• <strong>Limpeza automática:</strong> Após migração, localStorage é limpo automaticamente</p>
          <p>• <strong>Performance:</strong> Sistema carrega dados sempre do Supabase para melhor performance</p>
        </div>
      </CardContent>
    </Card>
  );
} 