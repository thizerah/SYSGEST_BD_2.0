import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRotas } from '@/context/RotasContext';
import {
  MapPin,
  User,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DetalhesRotaProps {
  rotaId: string;
  onClose: () => void;
}

export function DetalhesRota({ rotaId, onClose }: DetalhesRotaProps) {
  const {
    buscarRotaPorId,
    osRotas,
    confirmarFinalizacao,
    cancelarOS,
    reagendarOS,
  } = useRotas();

  const rota = useMemo(() => buscarRotaPorId(rotaId), [rotaId, buscarRotaPorId]);
  const ossRota = useMemo(() => {
    if (!rota) return [];
    return osRotas.filter(os => rota.os_ids.includes(os.id));
  }, [rota, osRotas]);

  if (!rota) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    const icons: Record<string, JSX.Element> = {
      pendente: <Clock className="w-4 h-4" />,
      atribuida: <User className="w-4 h-4" />,
      em_andamento: <MapPin className="w-4 h-4" />,
      pre_finalizada: <AlertCircle className="w-4 h-4" />,
      finalizada: <CheckCircle2 className="w-4 h-4" />,
      cancelada: <XCircle className="w-4 h-4" />,
      reagendada: <Calendar className="w-4 h-4" />,
    };
    return icons[status] || icons.pendente;
  };

  const getStatusColor = (status: string) => {
    const cores: Record<string, string> = {
      pendente: 'bg-gray-100 text-gray-700 border-gray-300',
      atribuida: 'bg-blue-100 text-blue-700 border-blue-300',
      em_andamento: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      pre_finalizada: 'bg-orange-100 text-orange-700 border-orange-300',
      finalizada: 'bg-green-100 text-green-700 border-green-300',
      cancelada: 'bg-red-100 text-red-700 border-red-300',
      reagendada: 'bg-purple-100 text-purple-700 border-purple-300',
    };
    return cores[status] || cores.pendente;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendente: 'Pendente',
      atribuida: 'Atribuída',
      em_andamento: 'Em Andamento',
      pre_finalizada: 'Pré-finalizada',
      finalizada: 'Finalizada',
      cancelada: 'Cancelada',
      reagendada: 'Reagendada',
    };
    return labels[status] || status;
  };

  const estatisticas = useMemo(() => {
    const total = ossRota.length;
    const finalizadas = ossRota.filter(os => os.status === 'finalizada').length;
    const emAndamento = ossRota.filter(os => os.status === 'em_andamento').length;
    const preFinalizadas = ossRota.filter(os => os.status === 'pre_finalizada').length;
    const canceladas = ossRota.filter(os => os.status === 'cancelada').length;
    const pendentes = ossRota.filter(os => os.status === 'atribuida' || os.status === 'pendente').length;

    return { total, finalizadas, emAndamento, preFinalizadas, canceladas, pendentes };
  }, [ossRota]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-600" />
            Detalhes da Rota - {rota.tecnico_nome}
          </DialogTitle>
          <DialogDescription>
            {format(new Date(rota.data), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{estatisticas.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{estatisticas.pendentes}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-700">{estatisticas.emAndamento}</p>
              <p className="text-xs text-muted-foreground">Em Andamento</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-orange-700">{estatisticas.preFinalizadas}</p>
              <p className="text-xs text-muted-foreground">Pré-finalizadas</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{estatisticas.finalizadas}</p>
              <p className="text-xs text-muted-foreground">Finalizadas</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{estatisticas.canceladas}</p>
              <p className="text-xs text-muted-foreground">Canceladas</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de OSs */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {ossRota.map(os => (
              <Card key={os.id} className={cn('border-l-4', getStatusColor(os.status))}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {os.codigo_os}
                        </Badge>
                        <Badge className={cn('border', getStatusColor(os.status))}>
                          {getStatusIcon(os.status)}
                          <span className="ml-1">{getStatusLabel(os.status)}</span>
                        </Badge>
                      </div>
                      <h4 className="font-semibold">{os.nome_cliente}</h4>
                      <p className="text-sm text-muted-foreground">{os.tipo_servico}</p>
                    </div>

                    {/* Ações para OSs pré-finalizadas */}
                    {os.status === 'pre_finalizada' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => confirmarFinalizacao(os.id)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-700 border-red-300 hover:bg-red-50"
                          onClick={() => cancelarOS(os.id, 'Cancelada pela torre de controle')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator className="my-2" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{os.endereco}</p>
                        <p className="text-muted-foreground">
                          {os.bairro} - {os.cidade}
                        </p>
                      </div>
                    </div>

                    {os.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{os.telefone}</span>
                      </div>
                    )}

                    {os.registro_tempo?.chegada && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Chegada</p>
                          <p>
                            {format(new Date(os.registro_tempo.chegada), 'HH:mm', {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {os.registro_tempo?.saida && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Saída</p>
                          <p>
                            {format(new Date(os.registro_tempo.saida), 'HH:mm', {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Materiais utilizados */}
                  {os.materiais_utilizados && os.materiais_utilizados.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Materiais:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {os.materiais_utilizados.map((material, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {material.nome}: {material.quantidade}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observações do técnico */}
                  {os.observacoes_tecnico && (
                    <div className="mt-3 p-2 bg-muted rounded text-sm">
                      <p className="font-medium mb-1">Observações:</p>
                      <p className="text-muted-foreground">{os.observacoes_tecnico}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
