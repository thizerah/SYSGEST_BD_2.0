import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRotas } from '@/context/RotasContext';
import { useToast } from '@/components/ui/use-toast';
import { 
  Clock, 
  Search, 
  Calendar as CalendarIcon,
  Download,
  User,
  AlertCircle
} from 'lucide-react';
import { RotaOS, TecnicoRota } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface UltimoServicoTecnico {
  tecnico: TecnicoRota;
  os: RotaOS | null;
  horarioChegada: string | null;
  horarioSaida: string | null;
  dataServico: string | null;
  tempoServico: string | null;
  tempoTotalTrabalhado: string; // Tempo total do dia
}

export function ControleSaida() {
  const { osRotas, tecnicos } = useRotas();
  const { toast } = useToast();

  const [busca, setBusca] = useState('');
  const [filtroTecnico, setFiltroTecnico] = useState<string>('todos');
  const [filtroData, setFiltroData] = useState<Date | undefined>(undefined);
  const [popoverDataAberto, setPopoverDataAberto] = useState(false);

  // Calcular tempo no serviço (HH:MM)
  const calcularTempoServico = (chegada: string | null, saida: string | null): string | null => {
    if (!chegada || !saida) return null;
    
    try {
      const [horaChegada, minutoChegada] = chegada.split(':').map(Number);
      const [horaSaida, minutoSaida] = saida.split(':').map(Number);
      
      const minutosChegada = horaChegada * 60 + minutoChegada;
      const minutosSaida = horaSaida * 60 + minutoSaida;
      
      const diferencaMinutos = minutosSaida - minutosChegada;
      
      if (diferencaMinutos < 0 || diferencaMinutos > 480) return null; // 8h máximo
      
      const horas = Math.floor(diferencaMinutos / 60);
      const minutos = diferencaMinutos % 60;
      
      return `${horas}h${minutos.toString().padStart(2, '0')}min`;
    } catch {
      return null;
    }
  };

  // Calcular tempo total trabalhado no dia (soma de todos os serviços)
  const calcularTempoTotalDia = (tecnicoId: string, dataFiltro: Date | undefined): string => {
    const dataStr = dataFiltro ? format(dataFiltro, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    
    const ossDoDia = osRotas.filter(os => {
      if (os.tecnico_id !== tecnicoId) return false;
      if (os.status !== 'finalizada' && os.status !== 'cancelada') return false;
      if (!os.registro_tempo?.saida) return false;
      
      // Verificar se é do dia
      if (os.data_finalizacao) {
        const dataFinalStr = os.data_finalizacao.split('T')[0];
        return dataFinalStr === dataStr;
      }
      if (os.data_agendada) {
        const dataAgendadaStr = os.data_agendada.split('T')[0];
        return dataAgendadaStr === dataStr;
      }
      return false;
    });

    let totalMinutos = 0;
    
    ossDoDia.forEach(os => {
      if (os.registro_tempo?.chegada && os.registro_tempo?.saida) {
        try {
          const [horaChegada, minutoChegada] = os.registro_tempo.chegada.split(':').map(Number);
          const [horaSaida, minutoSaida] = os.registro_tempo.saida.split(':').map(Number);
          
          const minutosChegada = horaChegada * 60 + minutoChegada;
          const minutosSaida = horaSaida * 60 + minutoSaida;
          
          const diferencaMinutos = minutosSaida - minutosChegada;
          
          if (diferencaMinutos > 0 && diferencaMinutos <= 480) {
            totalMinutos += diferencaMinutos;
          }
        } catch {
          // Ignorar erros
        }
      }
    });

    if (totalMinutos === 0) return '-';
    
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    
    return `${horas}h${minutos.toString().padStart(2, '0')}min`;
  };

  // Buscar último serviço de cada técnico
  const ultimosServicos = useMemo(() => {
    // Se não houver data selecionada, retornar array vazio
    if (!filtroData) {
      return [];
    }
    
    const dataFiltro = format(filtroData, 'yyyy-MM-dd');
    
    return tecnicos.map(tecnico => {
      // Filtrar OSs do técnico que foram finalizadas ou canceladas com horário de saída
      const ossTecnico = osRotas.filter(os => {
        if (os.tecnico_id !== tecnico.id) return false;
        if (os.status !== 'finalizada' && os.status !== 'cancelada') return false;
        if (!os.registro_tempo?.saida) return false;
        
        // Verificar se é do dia selecionado
        if (os.data_finalizacao) {
          const dataFinalStr = os.data_finalizacao.split('T')[0];
          return dataFinalStr === dataFiltro;
        }
        if (os.data_agendada) {
          const dataAgendadaStr = os.data_agendada.split('T')[0];
          return dataAgendadaStr === dataFiltro;
        }
        return false;
      });

      // Ordenar por data de finalização (mais recente primeiro) ou por horário de saída
      ossTecnico.sort((a, b) => {
        // Priorizar data_finalizacao
        if (a.data_finalizacao && b.data_finalizacao) {
          const dataA = new Date(a.data_finalizacao);
          const dataB = new Date(b.data_finalizacao);
          if (dataA.getTime() !== dataB.getTime()) {
            return dataB.getTime() - dataA.getTime();
          }
        }
        
        // Se mesma data, ordenar por horário de saída
        if (a.registro_tempo?.saida && b.registro_tempo?.saida) {
          return b.registro_tempo.saida.localeCompare(a.registro_tempo.saida);
        }
        
        return 0;
      });

      const ultimaOS = ossTecnico[0] || null;
      
      let horarioChegada: string | null = null;
      let horarioSaida: string | null = null;
      let dataServico: string | null = null;
      let tempoServico: string | null = null;

      if (ultimaOS) {
        horarioChegada = ultimaOS.registro_tempo?.chegada || null;
        horarioSaida = ultimaOS.registro_tempo?.saida || null;
        
        if (ultimaOS.data_finalizacao) {
          dataServico = format(new Date(ultimaOS.data_finalizacao), 'dd/MM/yyyy', { locale: ptBR });
        } else if (ultimaOS.data_agendada) {
          const [ano, mes, dia] = ultimaOS.data_agendada.split('-');
          if (ano && mes && dia) {
            dataServico = `${dia}/${mes}/${ano}`;
          }
        }
        
        tempoServico = calcularTempoServico(horarioChegada, horarioSaida);
      }

      const tempoTotalTrabalhado = calcularTempoTotalDia(tecnico.id, filtroData);

      return {
        tecnico,
        os: ultimaOS,
        horarioChegada,
        horarioSaida,
        dataServico,
        tempoServico,
        tempoTotalTrabalhado
      };
    });
  }, [osRotas, tecnicos, filtroData]);

  // Aplicar filtros e busca
  const dadosFiltrados = useMemo(() => {
    let filtrados = ultimosServicos;

    // Filtro por técnico
    if (filtroTecnico !== 'todos') {
      filtrados = filtrados.filter(item => item.tecnico.id === filtroTecnico);
    }

    // Busca
    if (busca) {
      const buscaLower = busca.toLowerCase();
      filtrados = filtrados.filter(item => {
        const nomeTecnico = item.tecnico.nome.toLowerCase();
        const codigoOS = item.os?.codigo_os.toLowerCase() || '';
        const nomeCliente = item.os?.nome_cliente.toLowerCase() || '';
        
        return nomeTecnico.includes(buscaLower) || 
               codigoOS.includes(buscaLower) || 
               nomeCliente.includes(buscaLower);
      });
    }

    return filtrados;
  }, [ultimosServicos, filtroTecnico, busca]);

  // Estatísticas
  const estatisticas = useMemo(() => {
    const comRegistro = dadosFiltrados.filter(item => item.os !== null).length;
    const semRegistro = dadosFiltrados.filter(item => item.os === null).length;
    
    return {
      total: dadosFiltrados.length,
      comRegistro,
      semRegistro
    };
  }, [dadosFiltrados]);

  // Exportar para CSV
  const handleExportarExcel = () => {
    const headers = ['Técnico', 'OS', 'Cliente', 'Tipo de Serviço', 'Motivo', 'Horário Saída', 'Data do Serviço', 'Status', 'Tempo Total Trabalhado'];
    const rows = dadosFiltrados.map(item => [
      item.tecnico.nome,
      item.os?.codigo_os || '-',
      item.os?.nome_cliente || '-',
      item.os?.tipo_servico || '-',
      item.os?.motivo || '-',
      item.horarioSaida || '-',
      item.dataServico || '-',
      item.os?.status === 'finalizada' ? 'Finalizada' : item.os?.status === 'cancelada' ? 'Cancelada' : '-',
      item.tempoTotalTrabalhado
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `controle_saida_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Exportado com sucesso',
      description: 'Os dados foram exportados para CSV.',
    });
  };

  return (
    <div className="space-y-4">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Técnicos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Com Registro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{estatisticas.comRegistro}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sem Registro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{estatisticas.semRegistro}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Controle de Saída</CardTitle>
          <CardDescription>
            Último horário de saída de cada técnico para controle de ponto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por técnico, OS ou cliente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filtroTecnico} onValueChange={setFiltroTecnico}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Técnico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os técnicos</SelectItem>
                  {tecnicos.map(tecnico => (
                    <SelectItem key={tecnico.id} value={tecnico.id}>
                      {tecnico.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover open={popoverDataAberto} onOpenChange={setPopoverDataAberto}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-40 justify-start text-left font-normal",
                      !filtroData && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filtroData ? format(filtroData, 'dd/MM/yyyy', { locale: ptBR }) : 'Filtrar por data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filtroData}
                    onSelect={(date) => {
                      setFiltroData(date);
                      setPopoverDataAberto(false);
                    }}
                    initialFocus
                    locale={ptBR}
                  />
                  {filtroData && (
                    <div className="p-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setFiltroData(undefined);
                          setPopoverDataAberto(false);
                        }}
                      >
                        Limpar filtro
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <Button variant="outline" onClick={handleExportarExcel} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Nome do Técnico</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">OS</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Cliente</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Tipo de Serviço</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Motivo</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Horário Saída</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Data do Serviço</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Tempo Total Trabalhado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filtroData ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <CalendarIcon className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Selecione uma data</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Selecione uma data no filtro acima para visualizar os registros de saída dos técnicos.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : dadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Nenhum registro encontrado</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Não há serviços finalizados para a data selecionada.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  dadosFiltrados.map((item) => (
                    <TableRow 
                      key={item.tecnico.id}
                      className={cn(
                        !item.os && "bg-orange-50"
                      )}
                    >
                      <TableCell className="text-xs p-3 font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {item.tecnico.nome}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs p-3">
                        {item.os ? (
                          <span className="font-medium">{item.os.codigo_os}</span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Sem registro
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs p-3">
                        {item.os?.nome_cliente || '-'}
                      </TableCell>
                      <TableCell className="text-xs p-3">
                        {item.os ? (
                          <div className="flex flex-col">
                            <span>{item.os.tipo_servico}</span>
                            {item.os.subtipo_servico && (
                              <span className="text-muted-foreground">{item.os.subtipo_servico}</span>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-xs p-3 max-w-xs truncate" title={item.os?.motivo || ''}>
                        {item.os?.motivo || '-'}
                      </TableCell>
                      <TableCell className="text-xs p-3">
                        {item.horarioSaida ? (
                          <div className="flex items-center justify-center">
                            <Badge 
                              variant="outline" 
                              className="bg-green-500 text-white border-green-600 px-4 py-2 text-lg font-bold min-w-[90px] justify-center"
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              {item.horarioSaida}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs p-3">
                        {item.dataServico || '-'}
                      </TableCell>
                      <TableCell className="text-xs p-3">
                        {item.os ? (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              item.os.status === 'finalizada' 
                                ? 'bg-green-50 text-green-700 border-green-300'
                                : 'bg-red-50 text-red-700 border-red-300'
                            )}
                          >
                            {item.os.status === 'finalizada' ? 'Finalizada' : 'Cancelada'}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-xs p-3">
                        {item.tempoTotalTrabalhado !== '-' ? (
                          <div className="flex items-center justify-center">
                            <Badge 
                              variant="outline" 
                              className="bg-blue-500 text-white border-blue-600 px-4 py-2 text-lg font-bold min-w-[90px] justify-center"
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              {item.tempoTotalTrabalhado}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
