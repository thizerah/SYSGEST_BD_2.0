import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import useData from '@/context/useData';
import { PrimeiroPagamento } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CloudDownload, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Loader2,
  Trash2,
  ArrowRight,
  Shield,
  FileText,
  Download,
  CheckCircle
} from 'lucide-react';

export function DataMigrationPanel() {
  console.log('=== PAINEL DE MIGRAÇÃO RENDERIZADO ===');
  
  const { migrateFromLocalStorage, syncing, migrationProgress, pagamentos: supabasePagamentos } = useSupabaseData();
  const { clearLocalStorageAfterMigration, lastServiceOrderImportSummary, addRejectedOrdersToPlatform } = useData();
  const { toast } = useToast();
  const [osRejeitadasModalOpen, setOsRejeitadasModalOpen] = useState(false);
  const [selectedRejectedKeys, setSelectedRejectedKeys] = useState<Set<string>>(new Set());
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

  return (
    <div className="space-y-6">
      {/* Status dos dados no localStorage */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200 shadow-lg">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-purple-500 rounded-lg">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">Dados Encontrados no LocalStorage</h3>
            <p className="text-xs text-gray-600 mt-0.5">Dados locais prontos para migração</p>
          </div>
        </div>
        
        {hasLocalData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {localStorageData.map((data, index) => (
              <div 
                key={index} 
                className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-sm hover:shadow-md transition-all flex flex-col gap-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-purple-100 rounded group-hover:bg-purple-200 transition-colors">
                      <Database className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{data.name}</span>
                  </div>
                  <Badge className="bg-purple-600 text-white font-bold px-3 py-1 text-xs shadow-sm">
                    {data.count.toLocaleString('pt-BR')} registros
                  </Badge>
                </div>
                {data.name === 'Ordens de Serviço' && lastServiceOrderImportSummary && (
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-purple-100">
                    <p className="text-xs text-gray-600">
                      Última importação: planilha <strong>{lastServiceOrderImportSummary.totalPlanilha}</strong>, aceitas <strong>{lastServiceOrderImportSummary.totalAceito}</strong>, não aceitas <strong>{lastServiceOrderImportSummary.osNaoAceitas.length}</strong>.
                    </p>
                    {lastServiceOrderImportSummary.osNaoAceitas.length > 0 && (
                      <Dialog open={osRejeitadasModalOpen} onOpenChange={setOsRejeitadasModalOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-fit text-xs border-purple-300 text-purple-700 hover:bg-purple-50">
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            Ver OS não aceitas
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                          <DialogHeader>
                            <DialogTitle>OS não aceitas na importação</DialogTitle>
                          </DialogHeader>
                          <div className="flex flex-col gap-3 min-h-0 flex-1">
                            <p className="text-sm text-gray-600">
                              {lastServiceOrderImportSummary.osNaoAceitas.length} OS não atendem aos critérios.
                            </p>
                            {(() => {
                              const itemsComOrder = lastServiceOrderImportSummary.osNaoAceitas.filter((it): it is typeof it & { order: NonNullable<typeof it.order> } => !!it.order);
                              const allKeys = new Set(itemsComOrder.map(it => `${it.codigo_os}-${it.codigo_item ?? ''}`));
                              const allSelected = itemsComOrder.length > 0 && itemsComOrder.every(it => selectedRejectedKeys.has(`${it.codigo_os}-${it.codigo_item ?? ''}`));
                              const toggleKey = (key: string) => {
                                setSelectedRejectedKeys(prev => {
                                  const next = new Set(prev);
                                  if (next.has(key)) next.delete(key);
                                  else next.add(key);
                                  return next;
                                });
                              };
                              const toggleAll = () => {
                                if (allSelected) setSelectedRejectedKeys(new Set());
                                else setSelectedRejectedKeys(new Set(allKeys));
                              };
                              return (
                                <>
                                  {itemsComOrder.length > 0 && (
                                    <div className="flex flex-nowrap items-center gap-2 text-sm font-medium text-gray-700 pb-1 border-b">
                                      <Checkbox
                                        checked={allSelected}
                                        onCheckedChange={toggleAll}
                                        aria-label="Selecionar todas"
                                      />
                                      <span>Selecionar todas</span>
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    {lastServiceOrderImportSummary.osNaoAceitas.map((item, i) => {
                                      const key = `${item.codigo_os}-${item.codigo_item ?? ''}`;
                                      const temOrder = 'order' in item && item.order;
                                      const checked = selectedRejectedKeys.has(key);
                                      const mostraItem = item.codigo_item != null && String(item.codigo_item).trim() !== "";
                                      const motivoOS = (item.motivo != null && String(item.motivo).trim() !== "") ? String(item.motivo).trim() : item.reason;
                                      return (
                                        <div key={i} className="flex flex-nowrap items-center gap-2 text-sm bg-gray-50 rounded px-2 py-1.5">
                                          {temOrder ? (
                                            <Checkbox
                                              checked={checked}
                                              onCheckedChange={() => toggleKey(key)}
                                              aria-label={`Incluir OS ${item.codigo_os}`}
                                            />
                                          ) : (
                                            <span className="w-4" />
                                          )}
                                          <span className="font-mono font-semibold text-gray-800">{item.codigo_os}</span>
                                          {mostraItem && (
                                            <>
                                              <span className="text-gray-600">—</span>
                                              <span className="font-mono font-semibold text-gray-800">{item.codigo_item}</span>
                                            </>
                                          )}
                                          <span className="text-gray-600">—</span>
                                          <span className="text-gray-700">{motivoOS}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                          <DialogFooter className="flex-shrink-0 pt-2 border-t gap-2 flex-wrap">
                            {selectedRejectedKeys.size > 0 && (
                              <Button
                                type="button"
                                size="sm"
                                className="relative z-10 bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  const itemsComOrder = lastServiceOrderImportSummary.osNaoAceitas.filter((it): it is typeof it & { order: NonNullable<typeof it.order> } => !!it.order);
                                  const toAdd = itemsComOrder.filter(it => selectedRejectedKeys.has(`${it.codigo_os}-${it.codigo_item ?? ''}`)).map(it => it.order);
                                  const { added, alreadyPresent } = addRejectedOrdersToPlatform(toAdd);
                                  setSelectedRejectedKeys(new Set());
                                  if (added > 0) {
                                    toast({
                                      title: 'OS incluídas',
                                      description: alreadyPresent > 0
                                        ? `${added} OS incluídas na plataforma (salvas no localStorage). ${alreadyPresent} já existiam.`
                                        : `${added} OS incluídas na plataforma (salvas no localStorage).`
                                    });
                                  } else {
                                    toast({ title: 'Nenhuma nova OS', description: 'Todas as selecionadas já estavam na plataforma.' });
                                  }
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Incluir selecionadas na plataforma ({selectedRejectedKeys.size})
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="relative z-10"
                              onClick={() => {
                                const linhas = lastServiceOrderImportSummary.osNaoAceitas.map(o => {
                                  const mostraItem = o.codigo_item != null && String(o.codigo_item).trim() !== "";
                                  const motivoOS = (o.motivo != null && String(o.motivo).trim() !== "") ? String(o.motivo).trim() : o.reason;
                                  return mostraItem
                                    ? `${o.codigo_os} — ${o.codigo_item} — ${motivoOS}`
                                    : `${o.codigo_os} — ${motivoOS}`;
                                });
                                const texto = linhas.join('\n');
                                const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `os-nao-aceitas-importacao-${new Date().toISOString().slice(0, 10)}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                                toast({ title: 'Exportado', description: 'Arquivo .txt baixado com OS e motivo de cada uma.' });
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Exportar .txt (OS - motivo)
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
            <div className="flex items-center space-x-3">
              <Info className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-600 font-medium">
                Nenhum dado encontrado no localStorage para migrar.
              </p>
            </div>
          </div>
        )}

        {/* Status especial para atualizações de pagamentos */}
        {hasPotentialUpdates && !hasLocalData && (
          <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border-2 border-amber-300 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="p-1.5 bg-amber-500 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900 mb-1">Atualizações disponíveis</p>
                <p className="text-xs text-amber-800">
                  Há registros de pagamentos no localStorage que podem atualizar dados existentes no Supabase 
                  (baseado na data de importação).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Informações importantes sobre a migração */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-5 border-2 border-yellow-300 shadow-lg">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-yellow-500 rounded-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-yellow-900 mb-2">Importante</h4>
            <p className="text-sm text-yellow-800 leading-relaxed">
              A migração irá transferir todos os seus dados do navegador para o Supabase
              {hasPotentialUpdates && !hasLocalData ? ' e atualizar registros existentes com dados mais recentes' : ''}. 
              Após a migração, seus dados ficarão seguros na nuvem e sincronizados entre dispositivos.
            </p>
          </div>
        </div>
      </div>

      {/* Botão de migração */}
      <div className="space-y-4">
        {syncing && (
          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">
                    {migrationProgress
                      ? `Migrando: ${migrationProgress.label} (${migrationProgress.current}/${migrationProgress.total})`
                      : 'Preparando migração...'}
                  </span>
                </div>
                {migrationProgress && (
                  <span className="text-xs font-medium text-blue-700">
                    {Math.round((migrationProgress.current / migrationProgress.total) * 100)}%
                  </span>
                )}
              </div>
              <Progress
                value={migrationProgress ? (migrationProgress.current / migrationProgress.total) * 100 : 0}
                className="h-2.5 bg-blue-100"
              />
            </div>
          </div>
        )}

        <Button 
          onClick={handleMigration}
          disabled={!canMigrate || syncing}
          className="w-full h-14 text-base font-bold shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          size="lg"
        >
          {syncing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-3" />
              Migrando...
            </>
          ) : (
            <>
              <CloudDownload className="h-5 w-5 mr-3" />
              {canMigrate ? 
                (hasLocalData ? 'Migrar Dados para Supabase' : 'Atualizar Dados no Supabase') : 
                'Nenhum Dado para Migrar'
              }
              <ArrowRight className="h-5 w-5 ml-3" />
            </>
          )}
        </Button>
      </div>

      {/* Resultado da migração */}
      {migrationResult && (
        <div className="space-y-4">
          <div className={`rounded-xl p-5 border-2 shadow-lg ${
            migrationResult.success 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
              : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300'
          }`}>
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${migrationResult.success ? 'bg-green-500' : 'bg-red-500'}`}>
                {migrationResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-white" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-white" />
                )}
              </div>
              <p className={`text-sm font-semibold flex-1 ${migrationResult.success ? 'text-green-900' : 'text-red-900'}`}>
                {migrationResult.message}
              </p>
            </div>
          </div>

          {/* Botão para limpar localStorage após migração bem-sucedida */}
          {migrationResult.success && hasLocalData && (
            <Button 
              onClick={handleClearLocalStorage}
              variant="outline"
              className="w-full h-12 border-2 border-gray-300 hover:bg-gray-50 font-semibold shadow-sm"
              size="lg"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Dados Locais e Carregar do Supabase
            </Button>
          )}
        </div>
      )}
    </div>
  );
} 