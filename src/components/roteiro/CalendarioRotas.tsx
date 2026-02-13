import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { useRotas } from '@/context/RotasContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DetalhesRota } from './DetalhesRota';
import { cn } from '@/lib/utils';

export function CalendarioRotas() {
  const { rotas, osRotas, tecnicos } = useRotas();
  const [mesAtual, setMesAtual] = useState(new Date());
  const [rotaSelecionada, setRotaSelecionada] = useState<string | null>(null);

  // Obter todas as datas com rotas no mês atual
  const datasComRotas = useMemo(() => {
    const inicio = startOfMonth(mesAtual);
    const fim = endOfMonth(mesAtual);
    const dias = eachDayOfInterval({ start: inicio, end: fim });

    return dias.map(dia => {
      const dataStr = format(dia, 'yyyy-MM-dd');
      const rotasDoDia = rotas.filter(r => r.data === dataStr);
      
      return {
        data: dia,
        dataStr,
        rotas: rotasDoDia,
        totalOSs: rotasDoDia.reduce((acc, rota) => acc + rota.os_ids.length, 0),
      };
    });
  }, [mesAtual, rotas]);

  const proximoMes = () => setMesAtual(addMonths(mesAtual, 1));
  const mesAnterior = () => setMesAtual(subMonths(mesAtual, 1));

  const getStatusColor = (status: string) => {
    const cores: Record<string, string> = {
      pendente: 'bg-gray-200 text-gray-700',
      atribuida: 'bg-blue-200 text-blue-700',
      em_andamento: 'bg-yellow-200 text-yellow-700',
      pre_finalizada: 'bg-orange-200 text-orange-700',
      finalizada: 'bg-green-200 text-green-700',
      cancelada: 'bg-red-200 text-red-700',
      reagendada: 'bg-purple-200 text-purple-700',
    };
    return cores[status] || cores.pendente;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Calendário de Rotas
              </CardTitle>
              <CardDescription>
                Visualize e gerencie as rotas agendadas por data
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={mesAnterior}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[150px] text-center">
                {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button variant="outline" size="icon" onClick={proximoMes}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {/* Cabeçalho dos dias da semana */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
              <div key={dia} className="text-center font-semibold text-sm text-muted-foreground p-2">
                {dia}
              </div>
            ))}

            {/* Espaços vazios para alinhar o primeiro dia */}
            {Array.from({ length: datasComRotas[0]?.data.getDay() || 0 }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}

            {/* Dias do mês */}
            {datasComRotas.map(({ data, dataStr, rotas: rotasDoDia, totalOSs }) => {
              const isToday = isSameDay(data, new Date());
              const hasRotas = rotasDoDia.length > 0;

              return (
                <div
                  key={dataStr}
                  className={cn(
                    'border rounded-lg p-2 min-h-[100px] hover:bg-accent/50 transition-colors',
                    isToday && 'border-orange-600 border-2',
                    hasRotas && 'bg-blue-50/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn('text-sm font-medium', isToday && 'text-orange-600')}>
                      {format(data, 'd')}
                    </span>
                    {totalOSs > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {totalOSs} OS{totalOSs > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    {rotasDoDia.map(rota => {
                      const tecnico = tecnicos.find(t => t.id === rota.tecnico_id);
                      const ossRota = osRotas.filter(os => rota.os_ids.includes(os.id));
                      const statusCounts = ossRota.reduce((acc, os) => {
                        acc[os.status] = (acc[os.status] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);

                      return (
                        <button
                          key={rota.id}
                          onClick={() => setRotaSelecionada(rota.id)}
                          className="w-full text-left p-2 bg-white rounded border hover:border-orange-600 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <User className="w-3 h-3" />
                            <span className="font-medium truncate">
                              {tecnico?.sigla || rota.tecnico_nome}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            {Object.entries(statusCounts).map(([status, count]) => (
                              <Badge
                                key={status}
                                className={cn('text-[10px] px-1 py-0', getStatusColor(status))}
                              >
                                {count}
                              </Badge>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Legenda de Status:</p>
            <div className="flex flex-wrap gap-2">
              <Badge className={getStatusColor('pendente')}>Pendente</Badge>
              <Badge className={getStatusColor('atribuida')}>Atribuída</Badge>
              <Badge className={getStatusColor('em_andamento')}>Em Andamento</Badge>
              <Badge className={getStatusColor('pre_finalizada')}>Pré-finalizada</Badge>
              <Badge className={getStatusColor('finalizada')}>Finalizada</Badge>
              <Badge className={getStatusColor('cancelada')}>Cancelada</Badge>
              <Badge className={getStatusColor('reagendada')}>Reagendada</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de detalhes da rota */}
      {rotaSelecionada && (
        <DetalhesRota
          rotaId={rotaSelecionada}
          onClose={() => setRotaSelecionada(null)}
        />
      )}
    </div>
  );
}
