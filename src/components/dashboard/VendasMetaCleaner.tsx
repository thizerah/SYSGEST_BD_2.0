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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, AlertTriangle, CheckCircle2, Loader2, Info, Trash2, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/useAuth';
import { toast } from '@/hooks/use-toast';

interface PreviewData {
  mes_anterior: number;
  ano_anterior: number;
  total_registros: number;
  mes_nome: string;
}

interface LimpezaResult {
  sucesso: boolean;
  mes_limpo: number;
  ano_limpo: number;
  registros_removidos: number;
  mensagem: string;
  erro?: string;
}

export function VendasMetaCleaner() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<LimpezaResult | null>(null);

  const loadPreview = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('preview_limpeza_vendas_meta', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Erro ao carregar preview:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do preview.",
          variant: "destructive",
        });
        return;
      }

      setPreview(data);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLimpeza = async () => {
    if (!user?.id || !preview) return;
    
    setCleaning(true);
    try {
      const { data, error } = await supabase.rpc('limpar_vendas_meta_mes_anterior', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Erro ao limpar dados:', error);
        toast({
          title: "Erro",
          description: "Não foi possível limpar os dados.",
          variant: "destructive",
        });
        return;
      }

      setResult(data);
      
      if (data.sucesso) {
        toast({
          title: "Sucesso!",
          description: `${data.registros_removidos} registros de ${preview.mes_nome}/${preview.ano_anterior} foram removidos.`,
        });
      } else {
        toast({
          title: "Erro",
          description: data.mensagem || "Erro ao limpar dados.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado durante a limpeza.",
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
                Finalizar Período - {preview ? preview.mes_nome : 'Mês Anterior'}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Finalizar o período atual e preparar sistema para o próximo mês
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
              {/* Card de Aviso */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-5 border-2 border-red-300 shadow-lg">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="p-2 bg-red-500 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-red-900 mb-2">Atenção - Ação Irreversível</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 bg-white rounded-lg p-3 border-2 border-red-200">
                        <Calendar className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-gray-700">Dados de</span>
                        <Badge className="bg-red-600 text-white font-bold px-3 py-1">
                          {preview.mes_nome}/{preview.ano_anterior}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 bg-white rounded-lg p-3 border-2 border-red-200">
                        <Trash2 className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-gray-700">Serão removidos</span>
                        <Badge className="bg-red-600 text-white font-bold px-3 py-1 text-base">
                          {preview.total_registros.toLocaleString('pt-BR')} registros
                        </Badge>
                      </div>
                      <p className="text-xs text-red-800 font-medium">
                        da tabela <strong>vendas_meta</strong>
                      </p>
                      {preview.total_registros === 0 && (
                        <div className="bg-green-100 rounded-lg p-3 border-2 border-green-300 mt-3">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <p className="text-sm font-bold text-green-900">
                              Período já finalizado - nada para processar
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card de Informações */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-300 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="text-base font-bold text-gray-800">Como funciona</h4>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-blue-200">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      <strong className="text-gray-900">Remove vendas antigas</strong> da tabela vendas_meta
                    </p>
                  </div>
                  <div className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-blue-200">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      <strong className="text-gray-900">Prepara o sistema</strong> para importação do Excel
                    </p>
                  </div>
                  <div className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-blue-200">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      <strong className="text-gray-900">Evita duplicação</strong> nas métricas de metas
                    </p>
                  </div>
                  <div className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-blue-200">
                    <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      <strong className="text-gray-900">Só afeta seus dados</strong> (outras empresas intocadas)
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
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
                  onClick={handleLimpeza}
                  disabled={cleaning || preview.total_registros === 0}
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
                      {preview.total_registros === 0 ? 'Já Finalizado' : 'Finalizar Período'}
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {result && (
            <>
              {/* Resultado da finalização */}
              <div className={`rounded-xl p-5 border-2 shadow-lg ${
                result.sucesso 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
                  : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300'
              }`}>
                <div className="flex items-start space-x-3 mb-4">
                  <div className={`p-2 rounded-lg ${result.sucesso ? 'bg-green-500' : 'bg-red-500'}`}>
                    {result.sucesso ? (
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-base font-bold mb-2 ${result.sucesso ? 'text-green-900' : 'text-red-900'}`}>
                      {result.sucesso ? 'Período Finalizado!' : 'Erro na Finalização'}
                    </h4>
                    {result.sucesso && (
                      <div className="bg-white rounded-lg p-3 border-2 border-green-200 mb-3">
                        <div className="flex items-center space-x-2">
                          <Trash2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-700">Registros removidos:</span>
                          <Badge className="bg-green-600 text-white font-bold px-3 py-1">
                            {result.registros_removidos.toLocaleString('pt-BR')}
                          </Badge>
                        </div>
                      </div>
                    )}
                    <p className={`text-sm ${result.sucesso ? 'text-green-800' : 'text-red-800'}`}>
                      {result.mensagem}
                    </p>
                    {result.erro && (
                      <div className="mt-3 bg-red-100 rounded-lg p-3 border border-red-300">
                        <p className="text-red-800 text-sm font-semibold">
                          Erro: {result.erro}
                        </p>
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
                        Faça a cópia manual no Excel (vendas atual → permanência)
                      </p>
                    </div>
                    <div className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-green-200">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">2</span>
                      <p className="text-sm text-gray-700">
                        Delete dados antigos da aba vendas atual no Excel
                      </p>
                    </div>
                    <div className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-green-200">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">3</span>
                      <p className="text-sm text-gray-700">
                        Faça a importação das 3 abas para o Supabase normalmente
                      </p>
                    </div>
                    <div className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-green-200">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-bold text-green-900">
                        Sistema estará livre de duplicações!
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