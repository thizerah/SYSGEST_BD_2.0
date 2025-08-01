import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Finalizar Período - {preview ? preview.mes_nome : 'Mês Anterior'}
          </DialogTitle>
          <DialogDescription>
            Finalizar o período atual e preparar sistema para o próximo mês
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-sm">Carregando informações...</span>
            </div>
          )}

          {!loading && preview && !result && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">
                      📅 Dados de <span className="text-red-600">{preview.mes_nome}/{preview.ano_anterior}</span>
                    </p>
                    <p>
                      🗑️ <strong>{preview.total_registros}</strong> registros serão removidos da tabela vendas_meta
                    </p>
                    {preview.total_registros === 0 && (
                                          <p className="text-green-600 text-sm">
                      ✅ Período já finalizado - nada para processar
                    </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <h4 className="font-medium text-blue-800 mb-2">ℹ️ Como funciona:</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• Remove vendas antigas da tabela vendas_meta</li>
                  <li>• Prepara o sistema para importação do Excel</li>
                  <li>• Evita duplicação nas métricas de metas</li>
                  <li>• <strong>Só afeta seus dados</strong> (outras empresas intocadas)</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={resetDialog}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleLimpeza}
                  disabled={cleaning || preview.total_registros === 0}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {cleaning && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {preview.total_registros === 0 ? 'Já Finalizado' : 'Finalizar Período'}
                </Button>
              </div>
            </>
          )}

          {result && (
            <>
              <Alert className={result.sucesso ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {result.sucesso ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
                <AlertDescription>
                  <div className="space-y-1">
                    <p className={`font-medium ${result.sucesso ? 'text-green-800' : 'text-red-800'}`}>
                      {result.sucesso ? '✅ Período Finalizado!' : '❌ Erro na Finalização'}
                    </p>
                    {result.sucesso && (
                      <p className="text-green-700">
                        🗑️ {result.registros_removidos} registros removidos
                      </p>
                    )}
                    <p className={result.sucesso ? 'text-green-700' : 'text-red-700'}>
                      {result.mensagem}
                    </p>
                    {result.erro && (
                      <p className="text-red-600 text-sm mt-1">
                        Erro: {result.erro}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {result.sucesso && (
                <div className="bg-green-50 p-3 rounded-lg text-sm">
                  <h4 className="font-medium text-green-800 mb-2">🎯 Próximos Passos:</h4>
                  <ol className="space-y-1 text-green-700 list-decimal list-inside">
                    <li>Faça a cópia manual no Excel (vendas atual → permanência)</li>
                    <li>Delete dados antigos da aba vendas atual no Excel</li>
                    <li>Faça a importação das 3 abas para o Supabase normalmente</li>
                    <li>Sistema estará livre de duplicações! 🎉</li>
                  </ol>
                </div>
              )}

              <Button 
                onClick={resetDialog}
                className="w-full"
              >
                Fechar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}