import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRotas } from '@/context/RotasContext';
import { useAuth } from '@/context/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { fetchHistoricoPagamento, insertHistoricoPagamento } from '@/lib/roteiro';
import { 
  DollarSign, 
  Search, 
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  History,
  Pencil,
  Download,
  Calendar as CalendarIcon
} from 'lucide-react';
import { RotaOS } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface HistoricoPagamento {
  timestamp: string;
  acao: string;
  valor_anterior?: number;
  valor_novo?: number;
  forma_anterior?: string;
  forma_nova?: string;
  pago_anterior?: boolean;
  pago_novo?: boolean;
  observacao?: string;
}

export function BaixaPagamento() {
  const { osRotas, atualizarOS } = useRotas();
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const usuarioId = user?.id ?? '';

  const [historicoMap, setHistoricoMap] = useState<Record<string, HistoricoPagamento[]>>({});
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pagos' | 'pendentes'>('todos');
  const [filtroForma, setFiltroForma] = useState<string>('todas');
  const [filtroData, setFiltroData] = useState<Date | undefined>(undefined);
  const [popoverDataAberto, setPopoverDataAberto] = useState(false);
  const [osSelecionadaHistorico, setOsSelecionadaHistorico] = useState<string | null>(null);
  const [osEditandoValorPago, setOsEditandoValorPago] = useState<string | null>(null);
  const [osEditandoForma, setOsEditandoForma] = useState<string | null>(null);
  const [valorPagoEditado, setValorPagoEditado] = useState<string>('');
  const [modalObservacaoAberto, setModalObservacaoAberto] = useState(false);
  const [osAguardandoObservacao, setOsAguardandoObservacao] = useState<{ osId: string; valorNovo: number | undefined } | null>(null);
  const [observacaoValor, setObservacaoValor] = useState<string>('');

  // Filtrar OSs finalizadas com serviço cobrado
  const osBaixaPagamento = useMemo(() => {
    return osRotas.filter(os => 
      os.status === 'finalizada' && 
      os.servico_cobrado === true && 
      os.valor !== undefined &&
      os.valor > 0
    );
  }, [osRotas]);

  // Aplicar filtros e busca
  const osFiltradas = useMemo(() => {
    // Se não houver data selecionada, retornar array vazio
    if (!filtroData) {
      return [];
    }

    let filtradas = osBaixaPagamento;

    // Filtro de data (obrigatório)
    const dataFiltroStr = format(filtroData, 'yyyy-MM-dd');
    filtradas = filtradas.filter(os => {
      // Verificar data de finalização ou data agendada
      if (os.data_finalizacao) {
        const dataFinalStr = os.data_finalizacao.split('T')[0];
        return dataFinalStr === dataFiltroStr;
      }
      // Se não tiver data_finalizacao, usar data_agendada
      if (os.data_agendada) {
        const dataAgendadaStr = os.data_agendada.split('T')[0];
        return dataAgendadaStr === dataFiltroStr;
      }
      return false;
    });

    // Busca
    if (busca) {
      const buscaLower = busca.toLowerCase();
      filtradas = filtradas.filter(
        os =>
          os.codigo_os.toLowerCase().includes(buscaLower) ||
          os.nome_cliente.toLowerCase().includes(buscaLower)
      );
    }

    // Filtro de status
    if (filtroStatus === 'pagos') {
      filtradas = filtradas.filter(os => os.servico_pago === true);
    } else if (filtroStatus === 'pendentes') {
      filtradas = filtradas.filter(os => os.servico_pago !== true);
    }

    // Filtro de forma de pagamento
    if (filtroForma !== 'todas') {
      filtradas = filtradas.filter(os => os.forma_pagamento === filtroForma);
    }

    return filtradas;
  }, [osBaixaPagamento, busca, filtroStatus, filtroForma, filtroData]);

  useEffect(() => {
    if (osFiltradas.length === 0) {
      setHistoricoMap({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const next: Record<string, HistoricoPagamento[]> = {};
      await Promise.all(
        osFiltradas.map(async (os) => {
          try {
            const list = await fetchHistoricoPagamento(os.id);
            if (!cancelled) next[os.id] = list;
          } catch {
            if (!cancelled) next[os.id] = [];
          }
        })
      );
      if (!cancelled) setHistoricoMap(next);
    };
    load();
    return () => { cancelled = true; };
  }, [osFiltradas]);

  // Calcular resumo financeiro
  const resumoFinanceiro = useMemo(() => {
    const totalCobrado = osFiltradas.reduce((sum, os) => sum + (os.valor || 0), 0);
    const totalRecebido = osFiltradas
      .filter(os => os.servico_pago)
      .reduce((sum, os) => sum + (os.valor_pago || os.valor || 0), 0);
    const pendente = totalCobrado - totalRecebido;

    return {
      total: osFiltradas.length,
      cobrado: totalCobrado,
      recebido: totalRecebido,
      pendente: pendente
    };
  }, [osFiltradas]);

  // Verificar OSs pendentes há muito tempo (mais de 30 dias)
  const osPendentesAntigas = useMemo(() => {
    const hoje = new Date();
    return osFiltradas.filter(os => {
      if (os.servico_pago) return false;
      if (!os.registro_tempo?.saida && !os.data_finalizacao) return false;
      
      const dataFinalizacao = os.data_finalizacao 
        ? new Date(os.data_finalizacao)
        : new Date(); // Se não tiver data_finalizacao, usar data atual
      
      const diasPendente = Math.floor((hoje.getTime() - dataFinalizacao.getTime()) / (1000 * 60 * 60 * 24));
      return diasPendente > 30;
    });
  }, [osFiltradas]);

  // Função para formatar valor
  const formatarValor = (valor: number | undefined): string => {
    if (!valor) return '0,00';
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Função para converter valor formatado para número
  const converterValorParaNumero = (valorFormatado: string): number | undefined => {
    if (!valorFormatado) return undefined;
    const apenasNumeros = valorFormatado.replace(/\D/g, '');
    if (!apenasNumeros) return undefined;
    return parseFloat(apenasNumeros) / 100;
  };

  // Salvar valor pago
  const handleSalvarValorPago = (osId: string) => {
    // Converter valor formatado para número
    const apenasNumeros = valorPagoEditado.replace(/\D/g, '');
    const valorNumerico = apenasNumeros ? parseFloat(apenasNumeros) / 100 : undefined;
    
    const os = osFiltradas.find(o => o.id === osId);
    
    if (!os) return;

    // Se o valor pago for diferente do valor cobrado, abrir modal de observação
    if (os.valor && valorNumerico !== undefined && Math.abs(valorNumerico - os.valor) > 0.01) {
      setOsAguardandoObservacao({ osId, valorNovo: valorNumerico });
      setModalObservacaoAberto(true);
      return;
    }

    // Se o valor for igual ou não houver diferença, salvar normalmente
    salvarValorPagoComHistorico(osId, valorNumerico, undefined);
  };

  // Função auxiliar para salvar valor pago com histórico
  const salvarValorPagoComHistorico = (osId: string, valorNumerico: number | undefined, observacao?: string) => {
    const os = osFiltradas.find(o => o.id === osId);
    
    if (!os) return;

    // Registrar histórico apenas se o valor mudou
    if (os.valor_pago !== valorNumerico) {
      registrarHistoricoPagamento(osId, {
        acao: 'Valor pago alterado',
        valor_anterior: os.valor_pago,
        valor_novo: valorNumerico,
        observacao: observacao
      });
    }

    atualizarOS(osId, { valor_pago: valorNumerico });
    setOsEditandoValorPago(null);
    setValorPagoEditado('');
    setModalObservacaoAberto(false);
    setOsAguardandoObservacao(null);
    setObservacaoValor('');
    
    toast({
      title: 'Valor atualizado',
      description: 'Valor pago foi atualizado com sucesso.',
    });
  };

  // Função para confirmar observação e salvar
  const handleConfirmarObservacao = () => {
    if (!osAguardandoObservacao) return;
    
    if (!observacaoValor.trim()) {
      toast({
        title: 'Observação obrigatória',
        description: 'Por favor, informe o motivo da diferença entre o valor pago e o valor cobrado.',
        variant: 'destructive',
      });
      return;
    }

    salvarValorPagoComHistorico(
      osAguardandoObservacao.osId,
      osAguardandoObservacao.valorNovo,
      observacaoValor.trim()
    );
  };

  // Salvar forma de pagamento
  const handleSalvarFormaPagamento = (osId: string, forma: string) => {
    const os = osFiltradas.find(o => o.id === osId);
    
    if (!os) return;

    // Registrar histórico
    registrarHistoricoPagamento(osId, {
      acao: 'Forma de pagamento alterada',
      forma_anterior: os.forma_pagamento,
      forma_nova: forma === '__limpar__' ? undefined : forma
    });

    atualizarOS(osId, { forma_pagamento: forma === '__limpar__' ? undefined : forma });
    setOsEditandoForma(null);
    
    toast({
      title: 'Forma de pagamento atualizada',
      description: 'Forma de pagamento foi atualizada com sucesso.',
    });
  };

  // Alternar status de recebido
  const handleToggleRecebido = (os: RotaOS) => {
    const novoStatus = !os.servico_pago;
    
    const atualizacoes: Partial<RotaOS> = {
      servico_pago: novoStatus
    };

    // Se está marcando como recebido e não tem valor_pago, usar valor cobrado
    if (novoStatus && !os.valor_pago) {
      atualizacoes.valor_pago = os.valor;
    }

    // Se está marcando como recebido e não tem forma_pagamento, usar padrão
    if (novoStatus && !os.forma_pagamento) {
      atualizacoes.forma_pagamento = 'Dinheiro';
    }

    // Registrar histórico com todas as alterações
    registrarHistoricoPagamento(os.id, {
      acao: novoStatus ? 'Marcado como recebido' : 'Desmarcado como recebido',
      pago_anterior: os.servico_pago,
      pago_novo: novoStatus,
      valor_anterior: os.valor_pago,
      valor_novo: atualizacoes.valor_pago !== undefined ? atualizacoes.valor_pago : os.valor_pago,
      forma_anterior: os.forma_pagamento,
      forma_nova: atualizacoes.forma_pagamento !== undefined ? atualizacoes.forma_pagamento : os.forma_pagamento
    });

    atualizarOS(os.id, atualizacoes);
    
    toast({
      title: novoStatus ? 'Marcado como recebido' : 'Desmarcado como recebido',
      description: novoStatus 
        ? 'O serviço foi marcado como recebido.' 
        : 'O serviço foi desmarcado como recebido.',
    });
  };

  const registrarHistoricoPagamento = async (osId: string, dados: Omit<HistoricoPagamento, 'timestamp'>) => {
    if (!donoUserId || !usuarioId) return;
    try {
      await insertHistoricoPagamento(donoUserId, usuarioId, {
        roteiro_os_id: osId,
        acao: dados.acao,
        valor_anterior: dados.valor_anterior,
        valor_novo: dados.valor_novo,
        forma_anterior: dados.forma_anterior,
        forma_nova: dados.forma_nova,
        pago_anterior: dados.pago_anterior,
        pago_novo: dados.pago_novo,
        observacao: dados.observacao,
      });
      const list = await fetchHistoricoPagamento(osId);
      setHistoricoMap((prev) => ({ ...prev, [osId]: list }));
    } catch (e) {
      toast({
        title: 'Erro ao registrar histórico',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Exportar para Excel (formato CSV)
  const handleExportarExcel = () => {
    const headers = ['OS', 'Assinante', 'Tipo de Serviço', 'Status', 'Razão', 'Técnico', 'Data do Serviço', 'Valor Cobrado', 'Valor Pago', 'Forma de Pagamento', 'Recebido'];
    const rows = osFiltradas.map(os => [
      os.codigo_os,
      os.nome_cliente,
      os.tipo_servico,
      os.status,
      os.motivo || '',
      os.tecnico_nome || '',
      os.data_finalizacao 
        ? format(new Date(os.data_finalizacao), 'dd/MM/yyyy', { locale: ptBR })
        : os.data_agendada
          ? (() => {
              const [ano, mes, dia] = os.data_agendada.split('-');
              return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
            })()
          : '',
      formatarValor(os.valor),
      formatarValor(os.valor_pago),
      os.forma_pagamento || '',
      os.servico_pago ? 'Sim' : 'Não'
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `baixa_pagamento_${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
      {/* Notificações de OSs pendentes antigas */}
      {osPendentesAntigas.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-1">
                  Atenção: {osPendentesAntigas.length} OS(s) pendente(s) há mais de 30 dias
                </h3>
                <p className="text-sm text-orange-700">
                  Existem serviços finalizados há mais de 30 dias que ainda não foram marcados como recebidos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumoFinanceiro.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cobrado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              R$ {formatarValor(resumoFinanceiro.cobrado)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              R$ {formatarValor(resumoFinanceiro.recebido)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              resumoFinanceiro.pendente > 0 ? "text-red-700" : "text-gray-700"
            )}>
              R$ {formatarValor(resumoFinanceiro.pendente)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Baixa de Pagamento</CardTitle>
          <CardDescription>
            Gerencie os pagamentos dos serviços finalizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por OS ou Assinante..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filtroStatus} onValueChange={(value: any) => setFiltroStatus(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pagos">Pagos</SelectItem>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroForma} onValueChange={setFiltroForma}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Forma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as formas</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CC">Cartão de Crédito</SelectItem>
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
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">OS</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Assinante</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Tipo de Serviço</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Razão</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Técnico</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Data do Serviço</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Valor Cobrado</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Valor Pago</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Forma de Pagamento</TableHead>
                  <TableHead className="text-center text-xs p-3 font-semibold text-gray-700">Recebido</TableHead>
                  <TableHead className="text-center text-xs p-3 font-semibold text-gray-700">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filtroData ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <CalendarIcon className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Selecione uma data</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Selecione uma data no filtro acima para visualizar os serviços com pagamento.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : osFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Nenhuma OS encontrada</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Não há serviços finalizados com valor cobrado para a data selecionada.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  osFiltradas.map((os) => {
                    const historico = historicoMap[os.id] ?? [];
                    const diasPendente = os.servico_pago ? null : (() => {
                      if (!os.data_finalizacao) return null;
                      const hoje = new Date();
                      const dataFinal = new Date(os.data_finalizacao);
                      return Math.floor((hoje.getTime() - dataFinal.getTime()) / (1000 * 60 * 60 * 24));
                    })();

                    return (
                      <TableRow 
                        key={os.id}
                        className={cn(
                          osPendentesAntigas.some(o => o.id === os.id) && "bg-orange-50",
                          !os.servico_pago && diasPendente && diasPendente > 30 && "border-l-4 border-l-orange-500"
                        )}
                      >
                        <TableCell className="text-xs p-3 font-semibold text-gray-900">{os.codigo_os}</TableCell>
                        <TableCell className="text-xs p-3">{os.nome_cliente}</TableCell>
                        <TableCell className="text-xs p-3">
                          <div className="flex flex-col">
                            <span>{os.tipo_servico}</span>
                            {os.subtipo_servico && (
                              <span className="text-muted-foreground">{os.subtipo_servico}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs p-3">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            Finalizada
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs p-3 max-w-xs truncate" title={os.motivo || ''}>
                          {os.motivo || '-'}
                        </TableCell>
                        <TableCell className="text-xs p-3">
                          {os.tecnico_nome || '-'}
                        </TableCell>
                        <TableCell className="text-xs p-3">
                          {os.data_finalizacao ? (
                            format(new Date(os.data_finalizacao), 'dd/MM/yyyy', { locale: ptBR })
                          ) : os.data_agendada ? (
                            (() => {
                              const [ano, mes, dia] = os.data_agendada.split('-');
                              if (ano && mes && dia) {
                                return `${dia}/${mes}/${ano}`;
                              }
                              return '-';
                            })()
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs p-3 font-semibold text-green-700">
                          R$ {formatarValor(os.valor)}
                        </TableCell>
                        <TableCell className="text-xs p-3">
                          {osEditandoValorPago === os.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={valorPagoEditado}
                                onChange={(e) => {
                                  const formatado = e.target.value.replace(/\D/g, '');
                                  if (formatado) {
                                    const valor = parseFloat(formatado) / 100;
                                    setValorPagoEditado(valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                                  } else {
                                    setValorPagoEditado('');
                                  }
                                }}
                                placeholder="0,00"
                                className="w-24 h-8"
                                autoFocus
                                onBlur={() => handleSalvarValorPago(os.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSalvarValorPago(os.id);
                                  } else if (e.key === 'Escape') {
                                    setOsEditandoValorPago(null);
                                    setValorPagoEditado('');
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-medium",
                                os.valor_pago ? "text-blue-700" : "text-muted-foreground"
                              )}>
                                R$ {formatarValor(os.valor_pago)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setOsEditandoValorPago(os.id);
                                  setValorPagoEditado(os.valor_pago ? formatarValor(os.valor_pago) : '');
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs p-3">
                          {osEditandoForma === os.id ? (
                            <Select
                              value={os.forma_pagamento || ''}
                              onValueChange={(value) => handleSalvarFormaPagamento(os.id, value)}
                              onOpenChange={(open) => {
                                if (!open) {
                                  setOsEditandoForma(null);
                                }
                              }}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="PIX">PIX</SelectItem>
                                <SelectItem value="CC">Cartão de Crédito</SelectItem>
                                <SelectItem value="__limpar__">Limpar</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-2">
                              {os.forma_pagamento ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                  {os.forma_pagamento}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setOsEditandoForma(os.id)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs p-3">
                          <Checkbox
                            checked={os.servico_pago || false}
                            onCheckedChange={() => handleToggleRecebido(os)}
                          />
                        </TableCell>
                        <TableCell className="text-center text-xs p-3">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setOsSelecionadaHistorico(os.id)}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Histórico de Pagamento - OS {os.codigo_os}</DialogTitle>
                                <DialogDescription>
                                  Histórico completo de alterações de pagamento
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                {historico.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    Nenhum histórico disponível.
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {historico.slice().reverse().map((item, index) => (
                                      <div key={index} className="border rounded-lg p-3">
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <p className="font-medium text-sm">{item.acao}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {format(new Date(item.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                          {item.valor_anterior !== undefined && item.valor_novo !== undefined && (
                                            <div className="flex items-center gap-2">
                                              <span className="text-muted-foreground">Valor:</span>
                                              <span className={item.valor_anterior ? "line-through text-red-600" : ""}>
                                                {item.valor_anterior ? `R$ ${formatarValor(item.valor_anterior)}` : '-'}
                                              </span>
                                              <span>→</span>
                                              <span className="font-medium text-green-600">
                                                {item.valor_novo ? `R$ ${formatarValor(item.valor_novo)}` : '-'}
                                              </span>
                                            </div>
                                          )}
                                          {item.forma_anterior !== undefined && item.forma_nova !== undefined && (
                                            <div className="flex items-center gap-2">
                                              <span className="text-muted-foreground">Forma:</span>
                                              <span className={item.forma_anterior ? "line-through text-red-600" : ""}>
                                                {item.forma_anterior || '-'}
                                              </span>
                                              <span>→</span>
                                              <span className="font-medium text-green-600">
                                                {item.forma_nova || '-'}
                                              </span>
                                            </div>
                                          )}
                                          {item.pago_anterior !== undefined && item.pago_novo !== undefined && (
                                            <div className="flex items-center gap-2">
                                              <span className="text-muted-foreground">Status:</span>
                                              <span className={item.pago_anterior ? "line-through text-red-600" : ""}>
                                                {item.pago_anterior ? 'Recebido' : 'Pendente'}
                                              </span>
                                              <span>→</span>
                                              <span className={cn(
                                                "font-medium",
                                                item.pago_novo ? "text-green-600" : "text-orange-600"
                                              )}>
                                                {item.pago_novo ? 'Recebido' : 'Pendente'}
                                              </span>
                                            </div>
                                          )}
                                          {item.observacao && (
                                            <div className="mt-2 pt-2 border-t">
                                              <p className="text-xs text-muted-foreground mb-1">Observação:</p>
                                              <p className="text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-900">
                                                {item.observacao}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Observação para Valor Diferente */}
      <Dialog open={modalObservacaoAberto} onOpenChange={setModalObservacaoAberto}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Observação Obrigatória</DialogTitle>
            <DialogDescription>
              O valor pago é diferente do valor cobrado. Por favor, informe o motivo da diferença.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {osAguardandoObservacao && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Valor Cobrado:</span>
                  <span className="font-semibold text-green-600">
                    R$ {formatarValor(osFiltradas.find(o => o.id === osAguardandoObservacao.osId)?.valor)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Valor Pago:</span>
                  <span className="font-semibold text-blue-600">
                    R$ {formatarValor(osAguardandoObservacao.valorNovo)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <span className="text-sm font-medium text-orange-800">Diferença:</span>
                  <span className="font-semibold text-orange-600">
                    R$ {formatarValor(
                      Math.abs((osFiltradas.find(o => o.id === osAguardandoObservacao.osId)?.valor || 0) - (osAguardandoObservacao.valorNovo || 0))
                    )}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="observacao">Motivo da diferença *</Label>
              <Textarea
                id="observacao"
                placeholder="Ex: Desconto aplicado, pagamento parcial, ajuste de valor..."
                value={observacaoValor}
                onChange={(e) => setObservacaoValor(e.target.value)}
                className="min-h-[100px]"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Esta observação será registrada no histórico de alterações.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalObservacaoAberto(false);
                setOsAguardandoObservacao(null);
                setObservacaoValor('');
                setOsEditandoValorPago(null);
                setValorPagoEditado('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmarObservacao}>
              Confirmar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
