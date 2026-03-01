import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Calendar, AlertTriangle, CheckCircle2, Loader2, Info, ArrowRight, CheckCircle, ArrowRightLeft, PauseCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/useAuth';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { toast } from '@/hooks/use-toast';

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

interface PreviewData {
  mes_anterior: number;
  ano_anterior: number;
  total_registros: number;
  mes_nome: string;
  a_transferir: number;
  a_manter: number;
}

interface FinalizacaoResult {
  sucesso: boolean;
  mes_finalizado: number;
  ano_finalizado: number;
  transferidos: number;
  mantidos: number;
  duplicatas_ignoradas: number;
  mensagem: string;
  erro?: string;
}

const isAguardando = (status: string | null | undefined): boolean => {
  return (status ?? '').toUpperCase().includes('AGUARDANDO');
};

export function VendasMetaCleaner() {
  const { user, authExtras } = useAuth();
  const { importToSupabase } = useSupabaseData();
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<FinalizacaoResult | null>(null);

  // uid consistente com o resto do sistema
  const uid = authExtras?.donoUserId ?? user?.id;

  const loadPreview = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;
      const anoAtual = hoje.getFullYear();
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
      const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;

      const { data, error } = await supabase
        .from('vendas_meta')
        .select('numero_proposta, status_proposta')
        .eq('user_id', uid)
        .eq('mes', mesAnterior)
        .eq('ano', anoAnterior);

      if (error) throw error;

      const registros = data || [];
      const aManter = registros.filter(r => isAguardando(r.status_proposta)).length;
      const aTransferir = registros.length - aManter;

      setPreview({
        mes_anterior: mesAnterior,
        ano_anterior: anoAnterior,
        total_registros: registros.length,
        mes_nome: MESES[mesAnterior - 1],
        a_transferir: aTransferir,
        a_manter: aManter,
      });
    } catch (error) {
      console.error('Erro ao carregar preview:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do preview.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizar = async () => {
    if (!uid || !preview) return;
    setCleaning(true);
    try {
      // 1. Busca todos os registros do mês anterior em vendas_meta
      const { data: vendasMetaData, error: fetchError } = await supabase
        .from('vendas_meta')
        .select('*')
        .eq('user_id', uid)
        .eq('mes', preview.mes_anterior)
        .eq('ano', preview.ano_anterior);

      if (fetchError) throw fetchError;

      const registros = vendasMetaData || [];
      const aManter = registros.filter(r => isAguardando(r.status_proposta));
      const aTransferir = registros.filter(r => !isAguardando(r.status_proposta));

      let transferidos = 0;
      let duplicatasIgnoradas = 0;

      if (aTransferir.length > 0) {
        // 2. Mapear VendaMeta → Venda
        const hoje = new Date();
        const novasVendas = aTransferir.map(r => {
          const dataHabilitacao = r.data_venda || new Date().toISOString();
          const diffTime = Math.abs(hoje.getTime() - new Date(dataHabilitacao).getTime());
          const diasCorridos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          return {
            numero_proposta: r.numero_proposta,
            id_vendedor: r.vendedor || '',
            nome_proprietario: r.nome_proprietario || '',
            cpf: r.cpf || '',
            nome_fantasia: r.nome_fantasia || '',
            agrupamento_produto: r.categoria || '',
            produto_principal: r.produto || '',
            valor: r.valor || 0,
            status_proposta: r.status_proposta || '',
            data_habilitacao: dataHabilitacao,
            dias_corridos: diasCorridos,
            telefone_celular: r.telefone_celular || null,
            cidade: r.cidade || null,
            bairro: r.bairro || null,
            produtos_secundarios: r.produtos_secundarios || null,
            forma_pagamento: r.forma_pagamento || null,
          };
        });

        // 3. Inserir em vendas usando importToSupabase
        // (trata sanitização, RLS, duplicatas e user_id corretamente)
        const importResult = await importToSupabase(
          'vendas',
          novasVendas as Record<string, unknown>[],
          true
        );

        transferidos = importResult.newRecords;
        duplicatasIgnoradas = importResult.duplicatesIgnored;

        // 4. Somente após inserção confirmada: remover da vendas_meta
        const propostasParaDeletar = aTransferir.map(r => r.numero_proposta);
        const { error: deleteError } = await supabase
          .from('vendas_meta')
          .delete()
          .eq('user_id', uid)
          .in('numero_proposta', propostasParaDeletar);

        if (deleteError) throw deleteError;
      }

      setResult({
        sucesso: true,
        mes_finalizado: preview.mes_anterior,
        ano_finalizado: preview.ano_anterior,
        transferidos,
        mantidos: aManter.length,
        duplicatas_ignoradas: duplicatasIgnoradas,
        mensagem: 'Mês finalizado com sucesso.',
      });

      toast({
        title: "Sucesso!",
        description: `${transferidos} registros transferidos para vendas. ${aManter.length} aguardando mantidos em vendas_meta.`,
      });
    } catch (error) {
      console.error('Erro ao finalizar mês:', error);
      setResult({
        sucesso: false,
        mes_finalizado: preview.mes_anterior,
        ano_finalizado: preview.ano_anterior,
        transferidos: 0,
        mantidos: 0,
        duplicatas_ignoradas: 0,
        mensagem: 'Erro ao finalizar o mês.',
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      toast({
        title: "Erro",
        description: "Não foi possível finalizar o mês.",
        variant: "destructive",
      });
    } finally {
      setCleaning(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadPreview();
      setResult(null);
    }
  };

  const resetDialog = () => {
    setPreview(null);
    setResult(null);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400 px-2 sm:px-3 py-1"
        >
          <Calendar className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="text-sm font-medium">
            {loading ? 'Carregando...' : preview ? `Finalizar ${preview.mes_nome}` : 'Finalizar Mês'}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b-2 border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-md">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-800">
                Finalizar Período — {preview ? preview.mes_nome : 'Mês Anterior'}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Transfere registros para vendas e prepara o sistema para o próximo mês
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          {loading && (
            <div className="flex items-center justify-center py-12 bg-blue-50 rounded-xl border-2 border-blue-200">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
              <span className="text-base font-semibold text-blue-900">Carregando informações...</span>
            </div>
          )}

          {!loading && preview && !result && (
            <>
              {/* Aviso de ação irreversível */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-5 border-2 border-red-300 shadow-lg">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-red-500 rounded-lg flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <h4 className="text-sm font-bold text-red-900">Atenção — Ação Irreversível</h4>

                    <div className="flex items-center space-x-2 bg-white rounded-lg p-3 border-2 border-red-200">
                      <Calendar className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-gray-700">Período:</span>
                      <Badge className="bg-red-600 text-white font-bold px-3 py-1">
                        {preview.mes_nome}/{preview.ano_anterior}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-2 bg-white rounded-lg p-3 border-2 border-red-200">
                      <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">A transferir para vendas:</span>
                      <Badge className="bg-blue-600 text-white font-bold px-3 py-1 text-base">
                        {preview.a_transferir} registro(s)
                      </Badge>
                    </div>

                    {preview.a_manter > 0 && (
                      <div className="flex items-center space-x-2 bg-white rounded-lg p-3 border-2 border-amber-200">
                        <PauseCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-gray-700">Aguardando (permanecem):</span>
                        <Badge className="bg-amber-500 text-white font-bold px-3 py-1 text-base">
                          {preview.a_manter} registro(s)
                        </Badge>
                      </div>
                    )}

                    {preview.total_registros === 0 && (
                      <div className="bg-green-100 rounded-lg p-3 border-2 border-green-300">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <p className="text-sm font-bold text-green-900">
                            Nenhum registro encontrado — período já finalizado
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Como funciona */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-300 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="text-base font-bold text-gray-800">Como funciona</h4>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-blue-200">
                    <ArrowRightLeft className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      <strong className="text-gray-900">Transfere automaticamente</strong> os registros de <strong>vendas_meta</strong> para <strong>vendas</strong>
                    </p>
                  </div>
                  <div className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-blue-200">
                    <PauseCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      <strong className="text-gray-900">Mantém em vendas_meta</strong> os registros com status <strong>Aguardando</strong> — serão atualizados na próxima importação
                    </p>
                  </div>
                  <div className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-blue-200">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      <strong className="text-gray-900">Evita duplicações</strong> — propostas já existentes em vendas são ignoradas
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={resetDialog}
                  className="flex-1 h-12 border-2 border-gray-300 hover:bg-gray-50 font-semibold shadow-sm"
                  size="lg"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleFinalizar}
                  disabled={cleaning || preview.a_transferir === 0}
                  className="flex-1 h-12 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                >
                  {cleaning ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-5 w-5 mr-2" />
                      {preview.a_transferir === 0 ? 'Já Finalizado' : 'Finalizar Período'}
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {result && (
            <>
              {/* Resultado */}
              <div className={`rounded-xl p-5 border-2 shadow-lg ${
                result.sucesso
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                  : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300'
              }`}>
                <div className="flex items-start space-x-3 mb-4">
                  <div className={`p-2 rounded-lg ${result.sucesso ? 'bg-green-500' : 'bg-red-500'}`}>
                    {result.sucesso
                      ? <CheckCircle2 className="h-5 w-5 text-white" />
                      : <AlertTriangle className="h-5 w-5 text-white" />
                    }
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-base font-bold mb-3 ${result.sucesso ? 'text-green-900' : 'text-red-900'}`}>
                      {result.sucesso ? 'Período Finalizado com Sucesso!' : 'Erro na Finalização'}
                    </h4>

                    {result.sucesso && (
                      <div className="space-y-2">
                        <div className="bg-white rounded-lg p-3 border-2 border-green-200 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">Transferidos para vendas:</span>
                          </div>
                          <Badge className="bg-blue-600 text-white font-bold px-3 py-1">
                            {result.transferidos}
                          </Badge>
                        </div>

                        {result.mantidos > 0 && (
                          <div className="bg-white rounded-lg p-3 border-2 border-amber-200 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <PauseCircle className="h-4 w-4 text-amber-500" />
                              <span className="text-sm font-medium text-gray-700">Aguardando (mantidos):</span>
                            </div>
                            <Badge className="bg-amber-500 text-white font-bold px-3 py-1">
                              {result.mantidos}
                            </Badge>
                          </div>
                        )}

                        {result.duplicatas_ignoradas > 0 && (
                          <div className="bg-white rounded-lg p-3 border-2 border-gray-200 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Info className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">Duplicatas ignoradas:</span>
                            </div>
                            <Badge variant="outline" className="font-bold px-3 py-1">
                              {result.duplicatas_ignoradas}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}

                    {result.erro && (
                      <div className="mt-3 bg-red-100 rounded-lg p-3 border border-red-300">
                        <p className="text-red-800 text-sm font-semibold">Erro: {result.erro}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Próximos passos */}
              {result.sucesso && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-300 shadow-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="text-base font-bold text-gray-800">Próximos Passos</h4>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-green-200">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">1</span>
                      <p className="text-sm text-gray-700">
                        Importe o Excel do novo mês normalmente pela importação comercial
                      </p>
                    </div>
                    <div className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-green-200">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">2</span>
                      <p className="text-sm text-gray-700">
                        Propostas <strong>Aguardando</strong> serão atualizadas automaticamente ao importar
                      </p>
                    </div>
                    <div className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-green-200">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-bold text-green-900">
                        Sistema pronto para o novo período!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={resetDialog}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Fechar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
