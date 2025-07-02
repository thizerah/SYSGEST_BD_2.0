import useData from "@/context/useData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  Users, 
  Repeat, 
  AlertTriangle,
  MapPin,
  BarChart2,
  UserCog,
  FileUp,
  FileIcon,
  X,
  CreditCard,
  Loader2,
  Upload,
  Trash,
  Calendar as CalendarIcon,
  Filter,
  Pencil,
  UserPlus,
  RefreshCcw,
  Search,
  MessageCircle,
  CheckCircle,
  Target,
  Gauge,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  DollarSign
} from "lucide-react";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ServiceOrder, User, VALID_STATUS, Venda, PrimeiroPagamento, Meta, VendaMeta, BaseData } from "@/types";
import { useAuth } from "@/context/auth";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from "xlsx";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ServiceOrderTable } from "@/components/dashboard/ServiceOrderTable";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { supabase } from "@/lib/supabase";
import { clearDefaultUsers } from "@/utils/clearDefaultUsers";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { PermanenciaPorTipoServico } from "./PermanenciaPorTipoServico";
import { ValorDeFaceVendas } from "@/components/dashboard/ValorDeFaceVendas";
import { VendasInstaladasPorCidade } from "@/components/dashboard/VendasInstaladasPorCidade";
import { PermanenciaTrendChart } from "@/components/dashboard/PermanenciaTrendChart";
import { DesempenhoTrendChart } from "@/components/dashboard/DesempenhoTrendChart";
import { VendedorPermanenciaTrendChart } from "@/components/dashboard/VendedorPermanenciaTrendChart";
import { VendedorDesempenhoTrendChart } from "@/components/dashboard/VendedorDesempenhoTrendChart";
import { VendedorDesempenhoPerPeriodoTrendChart } from "@/components/dashboard/VendedorDesempenhoPerPeriodoTrendChart";
import { VendedorDesempenhoCategoriaTrendChart } from "@/components/dashboard/VendedorDesempenhoCategoriaTrendChart";
import { standardizeServiceCategory, normalizeCityName, normalizeNeighborhoodName } from "@/context/DataUtils";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { getReopeningColorByServiceType, getTimeAttendanceColorByServiceType, getTimeAttendanceBackgroundColorByServiceType, getTimeAttendanceIndicatorColorByServiceType } from "@/utils/colorUtils";
import { BaseMetricsSection } from "@/components/dashboard/BaseMetricsSection";
import { useBaseMetrics } from "@/hooks/useBaseMetrics";

// Componente para o conteúdo da guia Metas
function MetasTabContent() {
  const { metas, vendas, vendasMeta, calculateMetaMetrics } = useData();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Debug: Log dos dados disponíveis
  // Logs removidos para melhor performance - ativar apenas se necessário para debug
  // console.log('[DEBUG MetasTabContent] Metas:', metas);
  // console.log('[DEBUG MetasTabContent] VendasMeta:', vendasMeta);
  // console.log('[DEBUG MetasTabContent] SelectedMonth:', selectedMonth);
  // console.log('[DEBUG MetasTabContent] SelectedYear:', selectedYear);

  // Função auxiliar para buscar vendas da fonte correta baseada no período
  const buscarVendasDoPeriodo = (mes: number, ano: number) => {
    const hoje = new Date();
    const isCurrentMonth = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;
    
    if (isCurrentMonth) {
      // Mês atual: buscar da aba "vendas meta"
      return vendasMeta.filter(venda => venda.mes === mes && venda.ano === ano);
    } else {
      // Meses anteriores: buscar da aba "vendas permanencia"
      return vendas.filter(venda => {
        if (!venda.data_habilitacao) return false;
        const dataVenda = new Date(venda.data_habilitacao);
        return dataVenda.getMonth() + 1 === mes && dataVenda.getFullYear() === ano;
      });
    }
  };

  // Função auxiliar para calcular dias úteis (sem domingos) de um mês
  const calcularDiasUteisMes = (mes: number, ano: number) => {
    const hoje = new Date();
    const isCurrentMonth = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;
    
    const primeiroDiaMes = new Date(ano, mes - 1, 1);
    const ultimoDiaMes = new Date(ano, mes, 0);
    
    let diasDecorridos = 0;
    let diasRestantes = 0;
    
    if (isCurrentMonth) {
      // Mês atual: calcular trabalhados até ontem e restantes de hoje em diante
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      
      // Dias trabalhados (até ontem)
      for (let d = new Date(primeiroDiaMes); d <= ontem; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) diasDecorridos++;
      }
      
      // Dias restantes (de hoje até fim do mês)
      for (let d = new Date(hoje); d <= ultimoDiaMes; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) diasRestantes++;
      }
    } else {
      // Mês passado: contar todos os dias úteis do mês
      for (let d = new Date(primeiroDiaMes); d <= ultimoDiaMes; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) diasDecorridos++;
      }
      diasRestantes = 0;
    }
    
    return { diasDecorridos: Math.max(1, diasDecorridos), diasRestantes: Math.max(0, diasRestantes), diasTotais: diasDecorridos + diasRestantes };
  };

  // Função para calcular tendência de meta por categorias (comparar com mês anterior)
  const calcularTendenciaMeta = () => {
    if (!selectedMonth || !selectedYear) return null;
    
    const metaAtual = calculateMetaMetrics(selectedMonth, selectedYear);
    if (!metaAtual) return null;
    
    // Calcular mês anterior
    let mesAnterior = selectedMonth - 1;
    let anoAnterior = selectedYear;
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anoAnterior = selectedYear - 1;
    }
    
    const metaAnterior = calculateMetaMetrics(mesAnterior, anoAnterior);
    if (!metaAnterior) return null;
    
    // Agrupar produtos nas categorias específicas
    const agrupamentos = {
      'PAY TV': {
        mesAtual: {
          meta: 0,
          vendas: 0,
          percentual: 0
        },
        mesAnterior: {
          meta: 0,
          vendas: 0,
          percentual: 0
        },
        produtos: ['PÓS-PAGO', 'FLEX/CONFORTO', 'NOVA PARABÓLICA']
      },
      'INTERNET/STREAMING': {
        mesAtual: {
          meta: 0,
          vendas: 0,
          percentual: 0
        },
        mesAnterior: {
          meta: 0,
          vendas: 0,
          percentual: 0
        },
        produtos: ['FIBRA', 'SKY MAIS']
      },
      'SEGUROS': {
        mesAtual: {
          meta: 0,
          vendas: 0,
          percentual: 0
        },
        mesAnterior: {
          meta: 0,
          vendas: 0,
          percentual: 0
        },
        produtos: ['SEGUROS POS', 'SEGUROS FIBRA']
      }
    };
    
    // Calcular totais por categoria para mês atual
    Object.keys(agrupamentos).forEach(categoria => {
      const config = agrupamentos[categoria as keyof typeof agrupamentos];
      
      config.produtos.forEach(produto => {
        const categoriaAtual = metaAtual.categorias.find(c => c.categoria === produto);
        const categoriaAnterior = metaAnterior.categorias.find(c => c.categoria === produto);
        
        if (categoriaAtual) {
          config.mesAtual.meta += categoriaAtual.meta_definida;
          config.mesAtual.vendas += categoriaAtual.vendas_realizadas;
        }
        
        if (categoriaAnterior) {
          config.mesAnterior.meta += categoriaAnterior.meta_definida;
          config.mesAnterior.vendas += categoriaAnterior.vendas_realizadas;
        }
      });
      
      // Calcular percentuais
      config.mesAtual.percentual = config.mesAtual.meta > 0 ? (config.mesAtual.vendas / config.mesAtual.meta) * 100 : 0;
      config.mesAnterior.percentual = config.mesAnterior.meta > 0 ? (config.mesAnterior.vendas / config.mesAnterior.meta) * 100 : 0;
    });
    
    return {
      mesAtual: {
        mes: selectedMonth,
        ano: selectedYear,
        percentual: metaAtual.percentual_geral
      },
      mesAnterior: {
        mes: mesAnterior,
        ano: anoAnterior,
        percentual: metaAnterior.percentual_geral
      },
      agrupamentos,
      diferencaGeral: metaAtual.percentual_geral - metaAnterior.percentual_geral,
      crescimentoGeral: metaAtual.percentual_geral > metaAnterior.percentual_geral,
      // Incluir as métricas completas para uso na renderização
      metricasAtual: metaAtual,
      metricasAnterior: metaAnterior
    };
  };

  // Função para obter meses e anos disponíveis nos dados
  const getAvailablePeriodsFromData = () => {
    const periods = new Set<string>();
    
    // Logs removidos para melhor performance
    // console.log('[DEBUG getAvailablePeriodsFromData] Iniciando...');
    // console.log('[DEBUG getAvailablePeriodsFromData] Metas length:', metas?.length || 0);
    // console.log('[DEBUG getAvailablePeriodsFromData] VendasMeta length:', vendasMeta?.length || 0);
    
    // Adicionar períodos das metas
    if (metas && metas.length > 0) {
      metas.forEach(meta => {
        const period = `${meta.mes}-${meta.ano}`;
        // console.log('[DEBUG getAvailablePeriodsFromData] Adicionando período da meta:', period);
        periods.add(period);
      });
    }
    
    // Adicionar períodos das vendas de meta (baseado nos campos mes/ano já processados)
    if (vendasMeta && vendasMeta.length > 0) {
      vendasMeta.forEach(venda => {
        const period = `${venda.mes}-${venda.ano}`;
                  // console.log('[DEBUG getAvailablePeriodsFromData] Adicionando período da venda meta:', period);
        periods.add(period);
      });
    }
    
    const result = Array.from(periods).map(period => {
      const [mes, ano] = period.split('-').map(Number);
      return { mes, ano };
    }).sort((a, b) => a.ano - b.ano || a.mes - b.mes);
    
    // console.log('[DEBUG getAvailablePeriodsFromData] Períodos finais:', result);
    return result;
  };

  const availablePeriods = getAvailablePeriodsFromData();
  
  // Verificar se o período selecionado tem dados disponíveis
  const hasSelectedPeriodData = selectedMonth && selectedYear && availablePeriods.some(period => 
    period.mes === selectedMonth && period.ano === selectedYear
  );

  // Só calcular métricas se ambos os filtros estiverem selecionados e tiverem dados
  const metaMetrics = (selectedMonth && selectedYear && hasSelectedPeriodData) ? 
    calculateMetaMetrics(selectedMonth, selectedYear) : null;
  
  // console.log('[DEBUG MetasTabContent] metaMetrics result:', metaMetrics);
  // console.log('[DEBUG MetasTabContent] availablePeriods:', availablePeriods);
  
  // Função para limpar filtros
  const clearFilters = () => {
    setSelectedMonth(null);
    setSelectedYear(null);
  };

  // Calcular status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'atingido':
        return 'text-green-600';
      case 'superado':
        return 'text-blue-600';
      case 'em_dia':
        return 'text-yellow-600';
      case 'atrasado':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'atingido':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'superado':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'em_dia':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'atrasado':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Função para obter cor da barra de progresso
  const getProgressColor = (percentual: number) => {
    if (percentual >= 100) return 'bg-green-500';
    if (percentual >= 80) return 'bg-blue-500';
    if (percentual >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <>
      {/* Controles de filtro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Acompanhamento de Metas
          </CardTitle>
          <CardDescription>
            Acompanhe o desempenho das vendas em relação às metas mensais definidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Label htmlFor="mes-select">Mês</Label>
              <Select
                value={selectedMonth?.toString() || ""}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.length > 0 ? (
                    // Mostrar apenas os meses que têm dados
                    Array.from(new Set(availablePeriods.map(p => p.mes))).sort().map(mes => (
                      <SelectItem key={mes} value={mes.toString()}>
                        {new Date(0, mes - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-data-month" disabled>
                      Nenhum dado disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="ano-select">Ano</Label>
              <Select
                value={selectedYear?.toString() || ""}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.length > 0 ? (
                    // Mostrar apenas os anos que têm dados
                    Array.from(new Set(availablePeriods.map(p => p.ano))).sort().map(ano => (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-data-year" disabled>
                      Nenhum dado disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Limpar Filtros
              </Button>
            </div>
            
            {availablePeriods.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <p>{availablePeriods.length} período(s) com dados disponíveis</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo principal */}
      {!metaMetrics ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Target className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {availablePeriods.length === 0 ? 'Nenhum Dado Importado' : 
                 (!selectedMonth || !selectedYear) ? 'Selecione um Período' : 
                 'Nenhuma Meta para este Período'}
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                {availablePeriods.length === 0 ? (
                  <>
                    Não foram encontrados dados de metas ou vendas de meta.
                    <br />
                    Importe os dados usando o tipo "Metas (3 Planilhas)" para visualizar o acompanhamento.
                  </>
                ) : (!selectedMonth || !selectedYear) ? (
                  <>
                    Selecione um mês e ano nos filtros acima para visualizar o acompanhamento de metas.
                    <br />
                    Períodos disponíveis: {availablePeriods.map(p => 
                      `${new Date(0, p.mes - 1).toLocaleDateString('pt-BR', { month: 'short' })}/${p.ano}`
                    ).join(', ')}
                  </>
                ) : (
                  <>
                    Não foram encontradas metas para {new Date(0, selectedMonth - 1).toLocaleDateString('pt-BR', { month: 'long' })} de {selectedYear}.
                    <br />
                    Períodos disponíveis: {availablePeriods.map(p => 
                      `${new Date(0, p.mes - 1).toLocaleDateString('pt-BR', { month: 'short' })}/${p.ano}`
                    ).join(', ')}
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Card de Tendência de Meta - Destaque */}
          {(() => {
            const tendencia = calcularTendenciaMeta();
            if (!tendencia) return null;
            
            return (
              <Card className="border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                    Tendência de Meta
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Comparação com o mês anterior
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  
                  {/* Tendências por Categoria - Produtos Detalhados */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Tendências por Categoria
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {Object.entries(tendencia.agrupamentos).map(([categoria, dados]) => {
                        return (
                          <div key={categoria} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-sm text-gray-800">{categoria}</h5>
                              <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                                {dados.produtos.length}
                              </span>
                            </div>
                          
                          {/* Lista de produtos detalhados */}
                          <div className="space-y-1.5">
                            {dados.produtos.map(produto => {
                              const categoriaAtual = tendencia.metricasAtual.categorias.find(c => c.categoria === produto);
                              const categoriaAnterior = tendencia.metricasAnterior.categorias.find(c => c.categoria === produto);
                              
                              if (!categoriaAtual || !categoriaAnterior) return null;
                              
                              const diferenca = categoriaAtual.percentual_atingido - categoriaAnterior.percentual_atingido;
                              const crescimento = diferenca > 0;
                              const percentualCrescimento = categoriaAnterior.percentual_atingido > 0 ? 
                                (Math.abs(diferenca) / categoriaAnterior.percentual_atingido) * 100 : 0;
                              
                              return (
                                <div key={produto} className="bg-gray-50 border border-gray-100 rounded-md p-2">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <h6 className="font-medium text-sm text-gray-700">{produto}</h6>
                                    <span className="text-xs text-muted-foreground">
                                      Meta: {categoriaAtual.meta_definida}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-2 items-center">
                                    {/* Mês Anterior */}
                                    <div className="text-center">
                                      <div className="text-xs text-muted-foreground mb-0.5">
                                        {new Date(0, tendencia.mesAnterior.mes - 1).toLocaleDateString('pt-BR', { month: 'short' })}/{tendencia.mesAnterior.ano}
                                      </div>
                                      <div className="text-sm font-bold text-gray-600">
                                        {categoriaAnterior.percentual_atingido.toFixed(1)}%
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {categoriaAnterior.vendas_realizadas}/{categoriaAnterior.meta_definida}
                                      </div>
                                    </div>
                                    
                                    {/* Indicador de Tendência */}
                                    <div className="text-center flex flex-col items-center">
                                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                        crescimento 
                                          ? 'bg-green-100 text-green-800' 
                                          : diferenca === 0
                                            ? 'bg-gray-100 text-gray-800'
                                            : 'bg-red-100 text-red-800'
                                      }`}>
                                        {crescimento ? (
                                          <TrendingUp className="h-3 w-3" />
                                        ) : diferenca === 0 ? (
                                          <span className="h-3 w-3 text-center">—</span>
                                        ) : (
                                          <TrendingDown className="h-3 w-3" />
                                        )}
                                        {diferenca === 0 ? '0pp' : `${diferenca > 0 ? '+' : ''}${diferenca.toFixed(1)}pp`}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {diferenca === 0 ? 'estável' : `${percentualCrescimento.toFixed(1)}% ${crescimento ? 'crescimento' : 'queda'}`}
                                      </div>
                                    </div>
                                    
                                    {/* Mês Atual */}
                                    <div className="text-center">
                                      <div className="text-xs text-muted-foreground mb-0.5">
                                        {new Date(0, tendencia.mesAtual.mes - 1).toLocaleDateString('pt-BR', { month: 'short' })}/{tendencia.mesAtual.ano}
                                      </div>
                                      <div className="text-sm font-bold text-blue-600">
                                        {categoriaAtual.percentual_atingido.toFixed(1)}%
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {categoriaAtual.vendas_realizadas}/{categoriaAtual.meta_definida}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Cards de Métricas - Grid com tamanhos diferentes */}
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            {/* Quadro Dias Totais do Mês - Compacto */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold">Dias Totais do Mês</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-1">
                <div className="space-y-3">
                  {(() => {
                    const { diasDecorridos, diasRestantes, diasTotais } = calcularDiasUteisMes(selectedMonth || 0, selectedYear || 0);
                    
                    return (
                      <>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-muted-foreground">Trabalhados</span>
                          <span className="text-lg font-bold text-blue-600">{diasDecorridos}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-muted-foreground">Restantes</span>
                          <span className="text-lg font-bold text-orange-600">{diasRestantes}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-muted-foreground">Totais</span>
                          <span className="text-lg font-bold text-gray-700">{diasTotais}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Total de Vendas por Forma de Pagamento */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold">Total de Vendas por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-1">
                {(() => {
                  // Filtrar vendas do período selecionado
                  const vendasDoPeriodo = buscarVendasDoPeriodo(selectedMonth || 0, selectedYear || 0);
                  
                                     // Mapear e agrupar formas de pagamento
                   const formasPagamento = vendasDoPeriodo.reduce((acc, venda) => {
                     const forma = ('forma_pagamento' in venda ? venda.forma_pagamento : '') || 'Não informado';
                    
                    // Normalizar formas de pagamento similares
                    let formaNormalizada = forma.toUpperCase();
                    
                    if (formaNormalizada.includes('CARTÃO DE CRÉDITO') || formaNormalizada.includes('CARTAO DE CREDITO')) {
                      formaNormalizada = 'CARTÃO DE CRÉDITO';
                    } else if (formaNormalizada.includes('DIGITAL') || formaNormalizada.includes('PIX') || formaNormalizada.includes('PEC') || formaNormalizada.includes('LINHA DIGITÁVEL')) {
                      formaNormalizada = 'DIGITAL/PIX/PEC';
                    } else if (formaNormalizada.includes('DÉBITO') || formaNormalizada.includes('DEBITO')) {
                      formaNormalizada = 'DÉBITO AUTOMÁTICO';
                    } else if (formaNormalizada.includes('BOLETO')) {
                      formaNormalizada = 'BOLETO';
                    } else if (formaNormalizada.includes('NÃO HÁ COBRANÇA') || formaNormalizada.includes('NAO HA COBRANCA') || formaNormalizada.includes('SEM COBRANÇA')) {
                      formaNormalizada = 'SEM COBRANÇA';
                    } else if (formaNormalizada.includes('DINHEIRO') || formaNormalizada.includes('ESPÉCIE')) {
                      formaNormalizada = 'DINHEIRO';
                    } else if (formaNormalizada === 'NÃO INFORMADO' || formaNormalizada === '' || formaNormalizada === 'NULL') {
                      formaNormalizada = 'NÃO INFORMADO';
                    }
                    
                    acc[formaNormalizada] = (acc[formaNormalizada] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  const totalVendas = vendasDoPeriodo.length;
                  
                  // Ordenar por quantidade (decrescente) e pegar top 5
                  const formasOrdenadas = Object.entries(formasPagamento)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5);
                  
                  return (
                    <div className="space-y-1">
                      {formasOrdenadas.map(([forma, quantidade]) => {
                        const percentual = totalVendas > 0 ? (quantidade / totalVendas) * 100 : 0;
                        
                        // Truncar nome da forma se muito longo
                        const formaExibicao = forma.length > 18 ? 
                          forma.substring(0, 15) + '...' : forma;
                        
                        return (
                          <div key={forma} className="flex justify-between items-center py-0.5">
                            <span className="text-xs text-muted-foreground" title={forma}>
                              {formaExibicao}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-xs">
                                {quantidade}
                              </span>
                              <span className="text-xs text-blue-600 font-medium">
                                ({percentual.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      
                      {totalVendas > 0 && (
                        <div className="border-t pt-1 mt-1">
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-xs font-bold">TOTAL</span>
                            <span className="text-xs font-bold text-purple-600">
                              {totalVendas} (100%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Valor dos Produtos (Pacotes Face) */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Valor dos Produtos (Pacotes Face)</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                {(() => {
                  // Filtrar vendas do período selecionado
                  const vendasDoPeriodo = buscarVendasDoPeriodo(selectedMonth || 0, selectedYear || 0);
                  
                  // Mapear categorias
                  const mapearCategoria = (categoria: string): string => {
                    if (categoria.includes('PÓS-PAGO') || categoria.includes('POS')) return 'POS';
                    if (categoria.includes('PRÉ-PAGO') || categoria.includes('PRE')) return 'PRE';
                    if (categoria.includes('NOVA PARABÓLICA') || categoria.includes('NP')) return 'NP';
                    if (categoria.includes('FIBRA') || categoria.includes('BL-DGO')) return 'FIBRA';
                    if (categoria.includes('SKY MAIS') || categoria.includes('DGO')) return 'SKY+';
                    return 'OUTROS';
                  };
                  
                                     // Agrupar valores por produto
                   const valoresPorProduto = vendasDoPeriodo.reduce((acc, venda) => {
                     const categoria = ('categoria' in venda ? venda.categoria : venda.agrupamento_produto) || '';
                     const produto = mapearCategoria(categoria);
                     // Para vendas de meta, não há campo "valor" direto, então assumir valor 0
                     const valor = ('valor' in venda ? (venda as Venda).valor : 0) || 0;
                     acc[produto] = (acc[produto] || 0) + valor;
                     return acc;
                   }, {} as Record<string, number>);
                  
                  // Calcular total
                  const valorTotal = Object.values(valoresPorProduto).reduce((sum, valor) => sum + valor, 0);
                  
                  // Produtos ordenados
                  const produtosOrdenados = ['POS', 'PRE', 'NP', 'FIBRA', 'SKY+'];
                  
                  return (
                    <div className="space-y-1">
                      {produtosOrdenados.map(produto => {
                        const valor = valoresPorProduto[produto] || 0;
                        return (
                          <div key={produto} className="flex justify-between items-center py-0.5">
                            <span className="text-sm text-muted-foreground">{produto}</span>
                            <span className="font-semibold text-sm">
                              {valor > 0 ? 
                                valor.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                }).replace('R$', 'R$').replace(/\s/g, '') : 'R$0,00'
                              }
                            </span>
                          </div>
                        );
                      })}
                      <div className="border-t pt-1 mt-1">
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-sm font-bold">TOTAL</span>
                          <span className="text-sm font-bold text-purple-600">
                            {valorTotal.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }).replace('R$', 'R$').replace(/\s/g, '')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Quantidade de Produtos Principais */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Quantidade de Produtos Principais</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                {(() => {
                  // Filtrar vendas do período selecionado
                  const vendasDoPeriodo = buscarVendasDoPeriodo(selectedMonth || 0, selectedYear || 0);
                  
                                     // Contar produtos principais
                   const produtosPorTipo = vendasDoPeriodo.reduce((acc, venda) => {
                     const produto = ('produto' in venda ? venda.produto : venda.produto_principal) || '';
                     acc[produto] = (acc[produto] || 0) + 1;
                     return acc;
                   }, {} as Record<string, number>);
                  
                  // Ordenar por quantidade (decrescente)
                  const produtosOrdenados = Object.entries(produtosPorTipo)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8); // Mostrar top 8
                  
                  // Calcular total
                  const totalQuantidade = Object.values(produtosPorTipo).reduce((sum, qtd) => sum + qtd, 0);
                  
                  return (
                    <div className="space-y-1">
                      {produtosOrdenados.map(([produto, quantidade]) => {
                        // Converter para caixa alta e truncar nome do produto se muito longo
                        const produtoUpperCase = (produto || '').toUpperCase();
                        const produtoExibicao = produtoUpperCase.length > 35 ? 
                          produtoUpperCase.substring(0, 32) + '...' : produtoUpperCase;
                        
                        return (
                          <div key={produto} className="flex justify-between items-center py-0.5">
                            <span className="text-xs text-muted-foreground" title={produtoUpperCase}>
                              {produtoExibicao || 'NÃO INFORMADO'}
                            </span>
                            <span className="font-semibold text-xs">
                              {quantidade}
                            </span>
                          </div>
                        );
                      })}
                      <div className="border-t pt-1 mt-1">
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-xs font-bold">TOTAL</span>
                          <span className="text-xs font-bold text-purple-600">
                            {totalQuantidade}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Vendas por Cidade - Segunda linha */}
          <div className="grid grid-cols-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  Vendas por Cidade
                </CardTitle>
                <CardDescription className="text-xs">
                  Top cidades por volume de vendas
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {(() => {
                     // Filtrar vendas do período selecionado
                     const vendasDoPeriodo = buscarVendasDoPeriodo(selectedMonth || 0, selectedYear || 0);
                     
                     interface VendaPorCidade {
                       total: number;
                       pos_pago: number;
                       flex_conforto: number;
                       nova_parabolica: number;
                       fibra: number;
                       sky_mais: number;
                     }
                     
                     interface VendaMetaComCidade extends VendaMeta {
                       cidade?: string;
                     }
                     
                     const vendasPorCidade: Record<string, VendaPorCidade> = {};
                     
                     vendasDoPeriodo.forEach(venda => {
                       // Usar o campo cidade da venda
                       const cidade = ('cidade' in venda ? venda.cidade : venda.cidade) || 'Não informado';
                       
                       if (!vendasPorCidade[cidade]) {
                         vendasPorCidade[cidade] = { 
                           total: 0, 
                           pos_pago: 0, 
                           flex_conforto: 0, 
                           nova_parabolica: 0, 
                           fibra: 0, 
                           sky_mais: 0 
                         };
                       }
                       vendasPorCidade[cidade].total++;
                       
                       // Categorizar por tipo específico baseado no Agrupamento do Produto
                       const agrupamento = (('categoria' in venda ? venda.categoria : venda.agrupamento_produto) || '').toUpperCase().trim();
                       
                       // Usar a mesma lógica de mapeamento do quadro de valores
                       if (agrupamento.includes('PÓS-PAGO') || agrupamento.includes('POS')) {
                         vendasPorCidade[cidade].pos_pago++;
                       } else if (agrupamento.includes('PRÉ-PAGO') || agrupamento.includes('PRE')) {
                         vendasPorCidade[cidade].flex_conforto++;
                       } else if (agrupamento.includes('NOVA PARABÓLICA') || agrupamento.includes('NP')) {
                         vendasPorCidade[cidade].nova_parabolica++;
                       } else if (agrupamento.includes('FIBRA') || agrupamento.includes('BL-DGO')) {
                         vendasPorCidade[cidade].fibra++;
                       } else if (agrupamento.includes('SKY MAIS') || agrupamento.includes('DGO')) {
                         vendasPorCidade[cidade].sky_mais++;
                       }
                     });

                     // Converter para array e ordenar
                     const cidadesArray = Object.entries(vendasPorCidade)
                       .map(([cidade, dados]) => ({
                         cidade,
                         total: dados.total,
                         pos_pago: dados.pos_pago,
                         flex_conforto: dados.flex_conforto,
                         nova_parabolica: dados.nova_parabolica,
                         fibra: dados.fibra,
                         sky_mais: dados.sky_mais,
                         percentual: (dados.total / calculateMetaMetrics(selectedMonth || 0, selectedYear || 0)?.total_vendas || 0) * 100
                       }))
                       .sort((a, b) => b.total - a.total)
                       .slice(0, 10); // Top 10

                     return cidadesArray.length > 0 ? (
                       <div className="space-y-2">
                         {/* Cabeçalho */}
                         <div className="grid grid-cols-9 gap-1 text-sm font-semibold border-b-2 border-slate-200 pb-2 bg-slate-50 px-2 py-1 rounded-t-md">
                           <div className="col-span-2">Cidade</div>
                           <div className="text-center">Total</div>
                           <div className="text-center">POS</div>
                           <div className="text-center">PRE</div>
                           <div className="text-center">NP</div>
                           <div className="text-center">FIBRA</div>
                           <div className="text-center">SKY+</div>
                           <div className="text-center">%</div>
                         </div>
                         
                         {/* Dados */}
                         {cidadesArray.map((item, index) => (
                           <div key={index} className={`grid grid-cols-9 gap-1 text-sm py-2 px-2 rounded-md transition-colors hover:bg-slate-100 ${
                             index % 2 === 0 ? 'bg-white' : 'bg-slate-25'
                           } border-b border-slate-100`}>
                             <div className="col-span-2 truncate font-medium" title={item.cidade}>
                               {item.cidade.toUpperCase()}
                             </div>
                             <div className="text-center font-semibold text-slate-800">
                               {item.total}
                             </div>
                             <div className="text-center text-blue-600">
                               {item.pos_pago}
                             </div>
                             <div className="text-center text-purple-600">
                               {item.flex_conforto}
                             </div>
                             <div className="text-center text-orange-600">
                               {item.nova_parabolica}
                             </div>
                             <div className="text-center text-green-600">
                               {item.fibra}
                             </div>
                             <div className="text-center text-cyan-600">
                               {item.sky_mais}
                             </div>
                             <div className="text-center text-blue-700 font-semibold">
                               {item.percentual.toFixed(1)}%
                             </div>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="text-center text-sm text-muted-foreground py-8 bg-slate-50 rounded-md">
                         Nenhum dado de cidade disponível
                       </div>
                     );
                   })()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalhamento por Categoria */}
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {(() => {
                  // Organizar categorias por grupos
                  const categoriasPorGrupo = {
                    payTV: metaMetrics.categorias.filter(c => 
                      ['PÓS-PAGO', 'FLEX/CONFORTO', 'NOVA PARABÓLICA'].includes(c.categoria)
                    ),
                    internetStreaming: metaMetrics.categorias.filter(c => 
                      ['FIBRA', 'SKY+', 'SKY MAIS'].includes(c.categoria)
                    ),
                    seguros: metaMetrics.categorias.filter(c => 
                      ['SEGUROS POS', 'SEGUROS FIBRA'].includes(c.categoria)
                    )
                  };

                  // Calcular totais por grupo
                  const calcularTotalGrupo = (categorias: typeof metaMetrics.categorias) => {
                    const totalMeta = categorias.reduce((sum, cat) => sum + cat.meta_definida, 0);
                    const totalVendas = categorias.reduce((sum, cat) => sum + cat.vendas_realizadas, 0);
                    const percentual = totalMeta > 0 ? (totalVendas / totalMeta) * 100 : 0;
                    return { totalMeta, totalVendas, percentual };
                  };

                  // Função global para calcular dias úteis (reutilizada em todos os lugares)
                  const calcularDiasUteisGlobal = (dataInicio: Date, dataFim: Date): number => {
                    let diasUteis = 0;
                    const dataAtual = new Date(dataInicio);
                    
                    // Normalizar as datas para evitar problemas de timezone
                    dataAtual.setHours(0, 0, 0, 0);
                    const dataFimNormalizada = new Date(dataFim);
                    dataFimNormalizada.setHours(23, 59, 59, 999);
                    
                    while (dataAtual <= dataFimNormalizada) {
                      if (dataAtual.getDay() !== 0) { // Não é domingo
                        diasUteis++;
                      }
                      dataAtual.setDate(dataAtual.getDate() + 1);
                    }
                    
                    return diasUteis;
                  };

                  const renderCategoria = (categoria: typeof metaMetrics.categorias[0], isSubcategory = false) => {
                    const saldo = categoria.vendas_realizadas - categoria.meta_definida;
                    const saldoPositivo = saldo >= 0;
                    
                    // Usar a função global para calcular dias úteis
                    const calcularDiasUteis = calcularDiasUteisGlobal;
                    
                    // Cálculos para as novas colunas (excluindo domingos)
                    const hoje = new Date();
                    const primeiroDiaMes = new Date(metaMetrics.ano, metaMetrics.mes - 1, 1);
                    const ultimoDiaMes = new Date(metaMetrics.ano, metaMetrics.mes, 0);
                    
                    // Dias úteis trabalhados (do primeiro dia do mês até ontem)
                    const ontem = new Date(hoje);
                    ontem.setDate(hoje.getDate() - 1);
                    const diasUteisDecorridos = Math.max(1, calcularDiasUteis(primeiroDiaMes, ontem));
                    
                    // Dias úteis restantes (de hoje até o final do mês)
                    const diasUteisRestantes = Math.max(1, calcularDiasUteis(hoje, ultimoDiaMes));
                    
                    // Total de dias úteis no mês
                    const totalDiasUteisMes = calcularDiasUteis(primeiroDiaMes, ultimoDiaMes);
                    
                    // Projeção baseada no realizado vs dias úteis
                    const mediaDiariaAtual = categoria.vendas_realizadas / diasUteisDecorridos;
                    const projecaoFinal = mediaDiariaAtual * totalDiasUteisMes;
                    
                    // Média de vendas por dia útil (baseada nas vendas realizadas e dias úteis trabalhados)
                    const mediaDiaria = mediaDiariaAtual;
                    
                    // Média de vendas por dia útil para atingir a meta (baseada no que falta e dias úteis restantes)
                    const saldoRestante = Math.max(0, categoria.meta_definida - categoria.vendas_realizadas);
                    const metaDiariaParaMeta = saldoRestante / diasUteisRestantes;
                    
                    // Determinar cor da Meta/Dia (verde se já atingiu meta, vermelho se está fora)
                    const corMetaDiaria = categoria.percentual_atingido >= 100 
                      ? 'text-green-600' 
                      : projecaoFinal >= categoria.meta_definida 
                        ? 'text-green-600' 
                        : 'text-red-600';
                    
                    // Calcular o "Ideal": meta / dias totais * dias trabalhados (até ontem)
                    const ideal = (categoria.meta_definida / totalDiasUteisMes) * diasUteisDecorridos;
                    
                    // Determinar cor do Ideal baseado na comparação com Realizado
                    let corIdeal = 'text-gray-600'; // padrão
                    if (ideal > categoria.vendas_realizadas) {
                      corIdeal = 'text-red-600'; // Ideal maior que realizado = vermelho
                    } else if (ideal === categoria.vendas_realizadas) {
                      corIdeal = 'text-yellow-600'; // Ideal igual ao realizado = amarelo
                    } else {
                      corIdeal = 'text-green-600'; // Ideal menor que realizado = verde
                    }

                    return (
                      <div className={`grid grid-cols-9 gap-3 py-3 px-3 rounded-lg ${isSubcategory ? 'bg-gray-50/80 ml-4 border-l-4 border-blue-200' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow'}`}>
                        <div className="flex items-center text-left">
                          <span className={`font-medium ${isSubcategory ? 'text-xs text-gray-700' : 'text-sm'}`}>
                            {categoria.categoria}
                          </span>
                        </div>
                        
                        <div className="text-center">
                          <p className="font-semibold text-blue-600 text-sm">
                            {categoria.meta_definida.toLocaleString('pt-BR')}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <p className="font-semibold text-green-600 text-sm">
                            {categoria.vendas_realizadas.toLocaleString('pt-BR')}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <p className={`font-semibold text-sm ${saldoPositivo ? 'text-green-600' : 'text-red-600'}`}>
                            {saldoPositivo ? '+' : ''}{Math.abs(saldo).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <span className={`text-sm font-bold px-2 py-1 rounded ${
                            categoria.percentual_atingido >= 100 
                              ? 'bg-green-100 text-green-800' 
                              : categoria.percentual_atingido >= 80 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {categoria.percentual_atingido.toFixed(1)}%
                          </span>
                        </div>
                        
                        <div className="text-center">
                          <p className="font-semibold text-purple-600 text-sm">
                            {projecaoFinal.toFixed(0)}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <p className={`font-semibold text-sm ${corIdeal}`}>
                            {ideal.toFixed(0)}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <p className="font-semibold text-blue-600 text-sm">
                            {mediaDiaria.toFixed(1)}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <p className={`font-semibold text-sm ${corMetaDiaria}`}>
                            {metaDiariaParaMeta.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    );
                  };

                  const renderGrupo = (titulo: string, categorias: typeof metaMetrics.categorias, cor: string) => {
                    if (categorias.length === 0) return null;
                    
                    const total = calcularTotalGrupo(categorias);
                    const saldoTotal = total.totalVendas - total.totalMeta;
                    const saldoPositivo = saldoTotal >= 0;

                                          return (
                      <div className="space-y-3">
                        {/* Cabeçalho do Grupo */}
                        <div className={`${cor} py-3 px-3 rounded-lg shadow-lg`}>
                          <div className="grid grid-cols-9 gap-3">
                            <div className="flex items-center text-left">
                              <h3 className="font-bold text-white text-lg">{titulo}</h3>
                            </div>
                            <div className="flex items-center justify-center text-center">
                              <p className="font-bold text-white text-base">
                                {total.totalMeta.toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <div className="flex items-center justify-center text-center">
                              <p className="font-bold text-white text-base">
                                {total.totalVendas.toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <div className="flex items-center justify-center text-center">
                              <p className="font-bold text-white text-base">
                                {saldoPositivo ? '+' : ''}{Math.abs(saldoTotal).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <div className="flex items-center justify-center text-center">
                              <p className="font-bold text-white text-base">
                                {total.percentual.toFixed(1)}%
                              </p>
                            </div>
                            <div className="flex items-center justify-center text-center">
                              <p className="font-bold text-white text-base">
                                {(() => {
                                  // Função para calcular dias úteis (excluindo domingos)
                                  const calcularDiasUteis = (dataInicio: Date, dataFim: Date): number => {
                                    let diasUteis = 0;
                                    const dataAtual = new Date(dataInicio);
                                    
                                    while (dataAtual <= dataFim) {
                                      if (dataAtual.getDay() !== 0) { // Não é domingo
                                        diasUteis++;
                                      }
                                      dataAtual.setDate(dataAtual.getDate() + 1);
                                    }
                                    
                                    return diasUteis;
                                  };
                                  
                                  const hoje = new Date();
                                  const primeiroDiaMes = new Date(metaMetrics.ano, metaMetrics.mes - 1, 1);
                                  const ultimoDiaMes = new Date(metaMetrics.ano, metaMetrics.mes, 0);
                                  const ontem = new Date(hoje);
                                  ontem.setDate(hoje.getDate() - 1);
                                  
                                  const diasUteisDecorridos = Math.max(1, calcularDiasUteis(primeiroDiaMes, ontem));
                                  const totalDiasUteisMes = calcularDiasUteis(primeiroDiaMes, ultimoDiaMes);
                                  const mediaDiaria = total.totalVendas / diasUteisDecorridos;
                                  const projecao = mediaDiaria * totalDiasUteisMes;
                                  return projecao.toFixed(0);
                                })()}
                              </p>
                            </div>
                            <div className="flex items-center justify-center text-center">
                              <p className="font-bold text-white text-base">
                                {(() => {
                                  // Calcular o "Ideal" para o grupo: meta total / dias totais * dias trabalhados
                                  const calcularDiasUteis = (dataInicio: Date, dataFim: Date): number => {
                                    let diasUteis = 0;
                                    const dataAtual = new Date(dataInicio);
                                    
                                    while (dataAtual <= dataFim) {
                                      if (dataAtual.getDay() !== 0) { // Não é domingo
                                        diasUteis++;
                                      }
                                      dataAtual.setDate(dataAtual.getDate() + 1);
                                    }
                                    
                                    return diasUteis;
                                  };
                                  
                                  const hoje = new Date();
                                  const primeiroDiaMes = new Date(metaMetrics.ano, metaMetrics.mes - 1, 1);
                                  const ultimoDiaMes = new Date(metaMetrics.ano, metaMetrics.mes, 0);
                                  const ontem = new Date(hoje);
                                  ontem.setDate(hoje.getDate() - 1);
                                  
                                  const diasUteisDecorridos = Math.max(1, calcularDiasUteis(primeiroDiaMes, ontem));
                                  const totalDiasUteisMes = calcularDiasUteis(primeiroDiaMes, ultimoDiaMes);
                                  const ideal = (total.totalMeta / totalDiasUteisMes) * diasUteisDecorridos;
                                  return ideal.toFixed(0);
                                })()}
                              </p>
                            </div>
                            <div className="flex items-center justify-center text-center">
                              <p className="font-bold text-white text-base">
                                {(() => {
                                  // Função para calcular dias úteis (excluindo domingos)
                                  const calcularDiasUteis = (dataInicio: Date, dataFim: Date): number => {
                                    let diasUteis = 0;
                                    const dataAtual = new Date(dataInicio);
                                    
                                    while (dataAtual <= dataFim) {
                                      if (dataAtual.getDay() !== 0) { // Não é domingo
                                        diasUteis++;
                                      }
                                      dataAtual.setDate(dataAtual.getDate() + 1);
                                    }
                                    
                                    return diasUteis;
                                  };
                                  
                                  const hoje = new Date();
                                  const primeiroDiaMes = new Date(metaMetrics.ano, metaMetrics.mes - 1, 1);
                                  const ontem = new Date(hoje);
                                  ontem.setDate(hoje.getDate() - 1);
                                  
                                  const diasUteisDecorridos = Math.max(1, calcularDiasUteis(primeiroDiaMes, ontem));
                                  const mediaDiaria = total.totalVendas / diasUteisDecorridos;
                                  return mediaDiaria.toFixed(1);
                                })()}
                              </p>
                            </div>
                            <div className="flex items-center justify-center text-center">
                              <p className="font-bold text-white text-base">
                                {(() => {
                                  // Função para calcular dias úteis (excluindo domingos)
                                  const calcularDiasUteis = (dataInicio: Date, dataFim: Date): number => {
                                    let diasUteis = 0;
                                    const dataAtual = new Date(dataInicio);
                                    
                                    while (dataAtual <= dataFim) {
                                      if (dataAtual.getDay() !== 0) { // Não é domingo
                                        diasUteis++;
                                      }
                                      dataAtual.setDate(dataAtual.getDate() + 1);
                                    }
                                    
                                    return diasUteis;
                                  };
                                  
                                  const hoje = new Date();
                                  const ultimoDiaMes = new Date(metaMetrics.ano, metaMetrics.mes, 0);
                                  const diasUteisRestantes = Math.max(1, calcularDiasUteis(hoje, ultimoDiaMes));
                                  const saldoRestante = Math.max(0, total.totalMeta - total.totalVendas);
                                  const metaDiaria = saldoRestante / diasUteisRestantes;
                                  return metaDiaria.toFixed(1);
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Subcategorias */}
                        <div className="space-y-1">
                          {categorias.map((categoria, index) => (
                            <div key={index}>
                              {renderCategoria(categoria, true)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <>
                      {/* Cabeçalho da Tabela */}
                      <div className="grid grid-cols-9 gap-3 py-4 px-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 font-bold text-sm text-gray-800 shadow-sm">
                        <div className="text-left">Categoria</div>
                        <div className="text-center">Meta</div>
                        <div className="text-center">Realizado</div>
                        <div className="text-center">Saldo</div>
                        <div className="text-center">%</div>
                        <div className="text-center">Projeção</div>
                        <div className="text-center">Ideal</div>
                        <div className="text-center">Média/Dia</div>
                        <div className="text-center">Meta/Dia</div>
                      </div>

                      {/* Grupos */}
                      {renderGrupo("PAY TV", categoriasPorGrupo.payTV, "bg-gradient-to-r from-blue-600 to-blue-700")}
                      {renderGrupo("INTERNET/STREAMING", categoriasPorGrupo.internetStreaming, "bg-gradient-to-r from-blue-600 to-blue-700")}
                      {renderGrupo("SEGUROS", categoriasPorGrupo.seguros, "bg-gradient-to-r from-blue-600 to-blue-700")}
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export function MetricsOverview() {
  const data = useData();
  const { calculateTimeMetrics, calculateReopeningMetrics, serviceOrders, technicians, getReopeningPairs, vendas, baseData } = data;
  const { user } = useAuth();
  const { getSetting, updateSetting } = useSystemSettings();

  // Suprimir warnings globais do Recharts sobre ResponsiveContainer
  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args) => {
      const message = args[0];
      if (typeof message === 'string' && 
          message.includes('The width') && 
          message.includes('and height') && 
          message.includes('are both fixed numbers') &&
          message.includes("maybe you don't need to use a ResponsiveContainer")) {
        return; // Suprimir este warning
      }
      originalWarn.apply(console, args);
    };
    
    return () => {
      console.warn = originalWarn;
    };
  }, []);
  
  // Estado para controlar qual aba está ativa
  const [activeTab, setActiveTab] = useState("time");
  
  // Estados para os filtros de mês e ano
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [showData, setShowData] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteringTimeout, setFilteringTimeout] = useState<NodeJS.Timeout | null>(null);
  // Novo estado para filtro de tipo de serviço original
  const [originalServiceTypeFilter, setOriginalServiceTypeFilter] = useState<string>("");
  // Estado para o filtro de data de habilitação (usado nos componentes de permanência)
  const [filtroDataHabilitacao, setFiltroDataHabilitacao] = useState<string[]>([]);

  // Função para calcular o mês de permanência (data de habilitação + 4 meses)
  const calcularMesPermanencia = useCallback((dataHabilitacao: string): string => {
    const dataAtual = new Date(dataHabilitacao);
    dataAtual.setMonth(dataAtual.getMonth() + 4); // Adiciona 4 meses
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[dataAtual.getMonth()];
  }, []);

  // Função para calcular o ano de permanência (data de habilitação + 4 meses)
  const calcularAnoPermanencia = useCallback((dataHabilitacao: string): number => {
    const dataAtual = new Date(dataHabilitacao);
    dataAtual.setMonth(dataAtual.getMonth() + 4); // Adiciona 4 meses
    return dataAtual.getFullYear();
  }, []);

  // Filtrar vendas para permanência na aba indicadores (lógica inversa da aba permanência)
  // Aqui: filtro de mês/ano (junho 2025) → busca vendas que geram permanência naquele período (vendas de fevereiro 2025)
  const vendasFiltradasPermanenciaIndicadores = useMemo(() => {
    // Só aplicar filtro na aba indicadores
    if (activeTab !== "indicadores" || !selectedMonth || !selectedYear) {
      return vendas; // Sem filtros ou em outra aba, retorna todas as vendas
    }

    return vendas.filter(venda => {
      if (!venda.data_habilitacao) return false;

      // Calcular mês e ano de permanência para esta venda
      const mesPermanencia = calcularMesPermanencia(venda.data_habilitacao);
      const anoPermanencia = calcularAnoPermanencia(venda.data_habilitacao);

      // Converter o número do mês selecionado para nome do mês
      const mesesNomes = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const mesNomeSelecionado = mesesNomes[parseInt(selectedMonth, 10) - 1];

      // Verificar se a permanência calculada corresponde ao período selecionado no filtro
      return mesPermanencia === mesNomeSelecionado && anoPermanencia.toString() === selectedYear;
    });
  }, [vendas, selectedMonth, selectedYear, activeTab, calcularMesPermanencia, calcularAnoPermanencia]);
  
  // Resetar o filtro de tipo de serviço original quando mudar de guia
  useEffect(() => {
    // Reset do filtro ao mudar de guia
    setOriginalServiceTypeFilter("");
  }, [activeTab]);
  
  // Hook para calcular métricas BASE
  const baseMetrics = useBaseMetrics({
    baseData,
    selectedMonth: selectedMonth ? parseInt(selectedMonth) : undefined,
    selectedYear: selectedYear ? parseInt(selectedYear) : undefined
  });
  
  // Função para determinar a cor do alerta baseado na taxa de reabertura
  const getReopeningAlertColor = (rate: number) => {
    if (rate < 5) return "text-green-500";
    if (rate < 10) return "text-yellow-500";
    return "text-red-500";
  };
  
  // Função para gerar o emoji de alerta
  const getReopeningAlertEmoji = (rate: number) => {
    if (rate < 5) return "🟢";
    if (rate < 10) return "🟡";
    return "🔴";
  };
  
  // Obter anos e meses únicos a partir das datas de finalização das ordens de serviço
  const { availableYears, availableMonths } = useMemo(() => {
    const years = new Set<string>();
    const months = new Set<string>();
    
    serviceOrders.forEach(order => {
      if (order.data_finalizacao) {
        const date = new Date(order.data_finalizacao);
        const year = date.getFullYear().toString();
        // Os meses em JavaScript são baseados em 0, então +1 para obter o mês correto
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        
        years.add(year);
        months.add(month);
      }
    });
    
    return {
      availableYears: Array.from(years).sort((a, b) => b.localeCompare(a)), // Ordenar decrescente
      availableMonths: Array.from(months).sort()
    };
  }, [serviceOrders]);
  
  // Função para obter o nome do mês a partir do número
  const getMonthName = (monthNumber: string): string => {
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return monthNames[parseInt(monthNumber, 10) - 1];
  };
  
  // Filtrar ordens de serviço com base no mês e ano selecionados
  const filteredServiceOrders = useMemo(() => {
    if (!selectedMonth || !selectedYear) return [];
    
    return serviceOrders.filter(order => {
      // Verificar data de finalização
      let includeByFinalization = false;
      if (order.data_finalizacao) {
        try {
          // Extrair os componentes da data do formato original da string
          // Formato esperado: DD/MM/YYYY HH:mm ou YYYY-MM-DDTHH:mm:ss.sssZ
          let day, month, year;
          
          if (order.data_finalizacao.includes('/')) {
            // Formato DD/MM/YYYY
            const dateParts = order.data_finalizacao.split(' ')[0].split('/');
            day = parseInt(dateParts[0], 10);
            month = parseInt(dateParts[1], 10);
            year = parseInt(dateParts[2], 10);
          } else if (order.data_finalizacao.includes('-')) {
            // Formato ISO YYYY-MM-DD
            const dateParts = order.data_finalizacao.split('T')[0].split('-');
            year = parseInt(dateParts[0], 10);
            month = parseInt(dateParts[1], 10);
            day = parseInt(dateParts[2], 10);
          } else {
            // Formato não reconhecido, tentar com o construtor Date
            const date = new Date(order.data_finalizacao);
            day = date.getDate();
            month = date.getMonth() + 1; // JavaScript meses são 0-indexed
            year = date.getFullYear();
          }
          
          // Verificar se a extração foi bem-sucedida
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            // Converter para o formato esperado pelo filtro
            const orderMonth = month.toString().padStart(2, '0');
            const orderYear = year.toString();
            
            // Verificar se a data de finalização está no mês/ano selecionado
            includeByFinalization = (orderMonth === selectedMonth && orderYear === selectedYear);
            
            // Log removido para melhor performance - executava a cada filtro
            // if (includeByFinalization) {
            //   console.log(`✅ OS incluída por FINALIZAÇÃO: ${order.codigo_os}, Data finalizacao: ${order.data_finalizacao}, Mês/Ano: ${orderMonth}/${orderYear}, Filtro: ${selectedMonth}/${selectedYear}`);
            // }
          }
        } catch (error) {
          console.error(`Erro ao processar data de finalização: ${order.data_finalizacao}`, error);
        }
      }
      
      // Verificar data de criação
      let includeByCreation = false;
      if (order.data_criacao) {
        try {
          // Extrair os componentes da data do formato original da string
          let day, month, year;
          
          if (order.data_criacao.includes('/')) {
            // Formato DD/MM/YYYY
            const dateParts = order.data_criacao.split(' ')[0].split('/');
            day = parseInt(dateParts[0], 10);
            month = parseInt(dateParts[1], 10);
            year = parseInt(dateParts[2], 10);
          } else if (order.data_criacao.includes('-')) {
            // Formato ISO YYYY-MM-DD
            const dateParts = order.data_criacao.split('T')[0].split('-');
            year = parseInt(dateParts[0], 10);
            month = parseInt(dateParts[1], 10);
            day = parseInt(dateParts[2], 10);
          } else {
            // Formato não reconhecido, tentar com o construtor Date
            const date = new Date(order.data_criacao);
            day = date.getDate();
            month = date.getMonth() + 1; // JavaScript meses são 0-indexed
            year = date.getFullYear();
          }
          
          // Verificar se a extração foi bem-sucedida
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            // Converter para o formato esperado pelo filtro
            const orderMonth = month.toString().padStart(2, '0');
            const orderYear = year.toString();
            
            // Verificar se a data de criação está no mês/ano selecionado
            includeByCreation = (orderMonth === selectedMonth && orderYear === selectedYear);
            
            // Log removido para melhor performance - executava a cada filtro
            // if (includeByCreation) {
            //   console.log(`✅ OS incluída por CRIAÇÃO: ${order.codigo_os}, Data criação: ${order.data_criacao}, Mês/Ano: ${orderMonth}/${orderYear}, Filtro: ${selectedMonth}/${selectedYear}`);
            // }
          }
        } catch (error) {
          console.error(`Erro ao processar data de criação: ${order.data_criacao}`, error);
        }
      }
      
      // Incluir a OS se ela satisfizer qualquer um dos critérios (criação OU finalização no mês)
      const shouldInclude = includeByFinalization || includeByCreation;
      
      // Log removido para melhor performance - executava a cada filtro
      // if (!shouldInclude) {
      //   console.log(`❌ OS excluída: ${order.codigo_os}`);
      // }
      
      return shouldInclude;
    });
  }, [serviceOrders, selectedMonth, selectedYear]);
  
  // Filtrar pares de reabertura com base no mês e ano selecionados
  // Considerando a data de criação da OS secundária (reabertura)
  const getFilteredReopeningPairs = useMemo(() => {
    if (!showData || !selectedMonth || !selectedYear) {
      return [];
    }
    
    // Obter todos os pares de reabertura
    const allPairs = getReopeningPairs();
    
    // Filtrar pelos pares onde a OS de reabertura foi criada no mês/ano selecionado
    return allPairs.filter(pair => {
      try {
        // Usar a data de criação da OS de reabertura para filtrar
        const reopeningDateStr = pair.reopeningOrder.data_criacao || '';
        if (!reopeningDateStr) {
          console.warn(`OS de reabertura sem data de criação: ${pair.reopeningOrder.codigo_os}`);
          return false;
        }
        
        let day, month, year;
        
        // Tentar extrair data do formato que estiver disponível
        if (reopeningDateStr.includes('/')) {
          // Formato BR DD/MM/YYYY
          const dateParts = reopeningDateStr.split('/');
          day = parseInt(dateParts[0], 10);
          month = parseInt(dateParts[1], 10);
          year = parseInt(dateParts[2], 10);
        } else if (reopeningDateStr.includes('-')) {
          // Formato ISO YYYY-MM-DD
          const dateParts = reopeningDateStr.split('T')[0].split('-');
          year = parseInt(dateParts[0], 10);
          month = parseInt(dateParts[1], 10);
          day = parseInt(dateParts[2], 10);
        } else {
          // Formato não reconhecido, tentar com o construtor Date
          const date = new Date(reopeningDateStr);
          day = date.getDate();
          month = date.getMonth() + 1; // JavaScript meses são 0-indexed
          year = date.getFullYear();
        }
        
        // Verificar se a extração foi bem-sucedida
        if (isNaN(day) || isNaN(month) || isNaN(year)) {
          console.error(`Data inválida de reabertura: ${reopeningDateStr}`);
          return false;
        }
        
        // Converter para o formato esperado pelo filtro
        const reopeningMonth = month.toString().padStart(2, '0');
        const reopeningYear = year.toString();
        
        // Logs removidos para melhor performance - executavam a cada filtro
        // if (reopeningMonth === selectedMonth && reopeningYear === selectedYear) {
        //   console.log(`✅ Reabertura incluída: ${pair.reopeningOrder.codigo_os}, Data criação: ${reopeningDateStr}, Mês/Ano identificado: ${reopeningMonth}/${reopeningYear}, Filtro selecionado: ${selectedMonth}/${selectedYear}`);
        // } else {
        //   console.log(`❌ Reabertura excluída: ${pair.reopeningOrder.codigo_os}, Data criação: ${reopeningDateStr}, Mês/Ano identificado: ${reopeningMonth}/${reopeningYear}, Filtro selecionado: ${selectedMonth}/${selectedYear}`);
        // }
        
        // Filtrar por mês/ano e pelo tipo de serviço original, se selecionado
        const matchesDateFilter = reopeningMonth === selectedMonth && reopeningYear === selectedYear;
        const matchesServiceTypeFilter = !originalServiceTypeFilter || 
                                        originalServiceTypeFilter === "all" || 
                                        pair.originalOrder.subtipo_servico === originalServiceTypeFilter;
        
        return matchesDateFilter && matchesServiceTypeFilter;
      } catch (error) {
        console.error(`Erro ao processar data de reabertura: ${pair.reopeningOrder.data_criacao}`, error);
        return false;
      }
    });
  }, [getReopeningPairs, selectedMonth, selectedYear, showData, originalServiceTypeFilter]);
  
  // Filtrar ordens de serviço apenas pela data de finalização (para métricas de tempo)
  const filteredServiceOrdersByFinalization = useMemo(() => {
    if (!selectedMonth || !selectedYear) return [];
    
    return serviceOrders.filter(order => {
      if (!order.data_finalizacao) return false;
      
      try {
        // Extrair os componentes da data do formato original da string
        // Formato esperado: DD/MM/YYYY HH:mm ou YYYY-MM-DDTHH:mm:ss.sssZ
        let day, month, year;
        
        if (order.data_finalizacao.includes('/')) {
          // Formato DD/MM/YYYY
          const dateParts = order.data_finalizacao.split(' ')[0].split('/');
          day = parseInt(dateParts[0], 10);
          month = parseInt(dateParts[1], 10);
          year = parseInt(dateParts[2], 10);
        } else if (order.data_finalizacao.includes('-')) {
          // Formato ISO YYYY-MM-DD
          const dateParts = order.data_finalizacao.split('T')[0].split('-');
          year = parseInt(dateParts[0], 10);
          month = parseInt(dateParts[1], 10);
          day = parseInt(dateParts[2], 10);
        } else {
          // Formato não reconhecido, tentar com o construtor Date
          const date = new Date(order.data_finalizacao);
          day = date.getDate();
          month = date.getMonth() + 1; // JavaScript meses são 0-indexed
          year = date.getFullYear();
        }
        
        // Verificar se a extração foi bem-sucedida
        if (isNaN(day) || isNaN(month) || isNaN(year)) {
          console.error(`Data inválida: ${order.data_finalizacao}`);
          return false;
        }
        
        // Converter para o formato esperado pelo filtro
        const orderMonth = month.toString().padStart(2, '0');
        const orderYear = year.toString();
        
        return orderMonth === selectedMonth && orderYear === selectedYear;
      } catch (error) {
        console.error(`Erro ao processar data: ${order.data_finalizacao}`, error);
        return false;
      }
    });
  }, [serviceOrders, selectedMonth, selectedYear]);
  
  // Obter métricas apenas com as ordens filtradas
  const timeMetrics = useMemo(() => {
    if (!showData || filteredServiceOrdersByFinalization.length === 0) {
      return {
        ordersWithinGoal: 0,
        ordersOutsideGoal: 0,
        percentWithinGoal: 0,
        averageTime: 0,
        servicesByType: {}
      };
    }
    
    return calculateTimeMetrics(filteredServiceOrdersByFinalization);
  }, [calculateTimeMetrics, filteredServiceOrdersByFinalization, showData]);

  // Calcular dados para comparação de serviços finalizados
  const finishedServicesComparison = useMemo(() => {
    if (!selectedMonth || !selectedYear || !showData) {
      return [];
    }

    const targetSubtypes = [
      "Corretiva",
      "Corretiva BL", 
      "Ponto Principal",
      "Ponto Principal BL",
      "Substituição",
      "Sistema Opcional",
      "Prestação de Serviço",
      "Preventiva"
    ];

    // Calcular o dia atual do mês selecionado
    const currentDate = new Date();
    const selectedMonthNum = parseInt(selectedMonth, 10);
    const selectedYearNum = parseInt(selectedYear, 10);
    
    // Se o mês/ano selecionado é o atual, usar o dia atual
    // Caso contrário, usar o último dia do mês
    let dayToCompare = 31; // último dia possível por padrão
    if (selectedYearNum === currentDate.getFullYear() && selectedMonthNum === currentDate.getMonth() + 1) {
      dayToCompare = currentDate.getDate();
    }

    // Calcular mês anterior
    let previousMonth = selectedMonthNum - 1;
    let previousYear = selectedYearNum;
    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear--;
    }

         const result = targetSubtypes.map(subtipo => {
       // Função helper para contar serviços em um mês específico
       const countServicesInMonth = (targetYear: number, targetMonth: number) => {
         return serviceOrders.filter(order => {
           if (!order.data_finalizacao || order.status !== "Finalizada" && order.status !== "Finalizado") {
             return false;
           }

           // Verificar se o subtipo corresponde
           if (order.subtipo_servico !== subtipo) {
             return false;
           }

           try {
             let day, month, year;
             
             if (order.data_finalizacao.includes('/')) {
               const dateParts = order.data_finalizacao.split(' ')[0].split('/');
               day = parseInt(dateParts[0], 10);
               month = parseInt(dateParts[1], 10);
               year = parseInt(dateParts[2], 10);
             } else if (order.data_finalizacao.includes('-')) {
               const dateParts = order.data_finalizacao.split('T')[0].split('-');
               year = parseInt(dateParts[0], 10);
               month = parseInt(dateParts[1], 10);
               day = parseInt(dateParts[2], 10);
             } else {
               const date = new Date(order.data_finalizacao);
               day = date.getDate();
               month = date.getMonth() + 1;
               year = date.getFullYear();
             }

             return year === targetYear && 
                    month === targetMonth && 
                    day <= dayToCompare;
           } catch (error) {
             return false;
           }
         }).length;
       };

       // Contar serviços finalizados do mês atual
       const currentMonthCount = countServicesInMonth(selectedYearNum, selectedMonthNum);

       // Contar serviços finalizados do mês anterior
       const previousMonthCount = countServicesInMonth(previousYear, previousMonth);

       // Calcular média dos últimos 3 meses (incluindo o mês atual)
       const monthsToCalculate = [];
       
       // Mês atual
       monthsToCalculate.push({ year: selectedYearNum, month: selectedMonthNum });
       
       // Mês anterior
       monthsToCalculate.push({ year: previousYear, month: previousMonth });
       
       // Dois meses atrás
       let twoMonthsAgoMonth = previousMonth - 1;
       let twoMonthsAgoYear = previousYear;
       if (twoMonthsAgoMonth === 0) {
         twoMonthsAgoMonth = 12;
         twoMonthsAgoYear--;
       }
       monthsToCalculate.push({ year: twoMonthsAgoYear, month: twoMonthsAgoMonth });

       // Calcular a média dos 3 meses
       const totalThreeMonths = monthsToCalculate.reduce((sum, monthData) => {
         return sum + countServicesInMonth(monthData.year, monthData.month);
       }, 0);
       
       const averageThreeMonths = totalThreeMonths / 3;

       return {
         subtipo,
         currentMonth: currentMonthCount,
         previousMonth: previousMonthCount,
         averageThreeMonths: parseFloat(averageThreeMonths.toFixed(1))
       };
     });

    // Filtrar apenas os subtipos que têm dados (pelo menos um dos meses > 0)
    return result.filter(item => item.currentMonth > 0 || item.previousMonth > 0);
  }, [serviceOrders, selectedMonth, selectedYear, showData]);
  
  // Obter métricas de reabertura apenas com base nos pares filtrados
  // Função para calcular quantos serviços são necessários para atingir a meta de tempo de atendimento
  const calculateServicesNeededForTimeTarget = (serviceType: string, currentWithinGoal: number, currentTotal: number) => {
    const currentRate = (currentWithinGoal / currentTotal) * 100;
    
    // Definir as metas por tipo de serviço (baseado nas regras de cor de tempo)
    let targetRate = 0;
    
    if (serviceType.includes("Assistência Técnica") && serviceType.includes("TV")) {
      targetRate = 75.0; // Verde >= 75%
    } else if (serviceType.includes("Assistência Técnica") && serviceType.includes("FIBRA")) {
      targetRate = 85.0; // Verde >= 85%
    } else if (serviceType.includes("Ponto Principal")) {
      targetRate = 75.0; // Verde >= 75%
    } else {
      targetRate = 75.0; // Padrão
    }
    
    // Se já está acima da meta, calcular quantos serviços "positivos" temos
    if (currentRate >= targetRate) {
      // Calcular quantos serviços podemos "perder" e ainda ficar na meta
      const minServicesNeeded = Math.ceil((currentTotal * targetRate) / 100);
      const servicesAboveTarget = currentWithinGoal - minServicesNeeded;
      return -servicesAboveTarget; // Negativo indica que estamos acima da meta
    }
    
    // Calcular quantos serviços adicionais são necessários para atingir a meta
    const servicesNeeded = Math.ceil((currentTotal * targetRate) / 100) - currentWithinGoal;
    
    return servicesNeeded > 0 ? servicesNeeded : 0;
  };

  // Função para formatar a exibição da meta de tempo
  const formatTimeMetaDisplay = (servicesNeeded: number) => {
    if (servicesNeeded < 0) {
      // Dentro da meta com serviços acima
      const servicesAbove = Math.abs(servicesNeeded);
      return (
        <span className="text-green-600 font-medium">
          +{servicesAbove} acima
        </span>
      );
    } else if (servicesNeeded === 0) {
      // Exatamente no limite da meta
      return (
        <span className="text-green-600 font-medium">
          limite
        </span>
      );
    } else {
      // Fora da meta - precisa de mais serviços
      return (
        <span className="text-red-600 font-medium">
          +{servicesNeeded} serviços
        </span>
      );
    }
  };



  // Função para calcular reaberturas permitidas ou serviços necessários
  const calculateServicesNeededForTarget = (serviceType: string, currentReopenings: number, currentTotal: number) => {
    // Se não há serviços, não há como calcular
    if (currentTotal === 0) {
      return 0;
    }
    
    const currentRate = (currentReopenings / currentTotal) * 100;
    
    // Definir os limites por tipo de serviço (baseado nas regras de cor)
    let targetRate = 0;
    
    // Verificar tipos específicos primeiro (mais específicos para menos específicos)
    if (serviceType.includes("Corretiva") && (serviceType.includes("BL") || serviceType.includes("FIBRA"))) {
      targetRate = 8.0; // Verde < 8%
    } else if (serviceType === "Corretiva" || serviceType.includes("Corretiva")) {
      targetRate = 3.5; // Verde < 3.5%
    } else if (serviceType.includes("Ponto Principal") && (serviceType.includes("BL") || serviceType.includes("FIBRA"))) {
      targetRate = 5.0; // Verde < 5%
    } else if (serviceType === "Ponto Principal" || (serviceType.includes("Ponto Principal") && serviceType.includes("TV"))) {
      targetRate = 2.0; // Verde < 2%
    } else {
      // Para tipos não reconhecidos, usar uma meta padrão
      targetRate = 5.0;
    }
    
    // Calcular o número máximo de reaberturas permitidas sem ultrapassar a meta
    // Fórmula: maxReaberturas = floor(totalServiços × metaPercentual ÷ 100)
    const maxReopeningsAllowed = Math.floor((currentTotal * targetRate) / 100);
    
    // Se estamos dentro da meta, calcular quantas reaberturas ainda estão disponíveis
    if (currentReopenings <= maxReopeningsAllowed) {
      const reopeningsAvailable = maxReopeningsAllowed - currentReopenings;
      
      // Se há reaberturas disponíveis, retornar negativo para indicar "reab. disponíveis"
      if (reopeningsAvailable > 0) {
        return -reopeningsAvailable;
      }
      
      // Se estamos exatamente no limite, mostrar "✓ Meta"
      return 0;
    }
    
    // Se estamos fora da meta, calcular quantos serviços precisamos para baixar o percentual
    // Queremos que o percentual fique ligeiramente abaixo da meta
    const desiredRate = targetRate - 0.04; // Margem de segurança de 0.04%
    
    // Fórmula: novoTotal = reaberturas ÷ (desiredRate ÷ 100)
    const targetTotal = currentReopenings / (desiredRate / 100);
    const servicesNeeded = Math.ceil(targetTotal - currentTotal);
    
    return servicesNeeded > 0 ? servicesNeeded : 1;
  };

  const getReopeningMetrics = useMemo(() => {
    if (!selectedMonth || !selectedYear) {
      return {
        reopenedOrders: 0,
        reopeningRate: 0,
        averageTimeBetween: 0,
        reopeningsByTechnician: {},
        reopeningsByTechnicianTV: {},
        reopeningsByTechnicianFibra: {},
        reopeningsByType: {},
        reopeningsByCity: {},
        reopeningsByNeighborhood: {},
        reopeningsByOriginalType: {
          "Corretiva": { reopenings: 0, totalOriginals: 0, reopeningRate: 0 },
          "Corretiva BL": { reopenings: 0, totalOriginals: 0, reopeningRate: 0 },
          "Ponto Principal": { reopenings: 0, totalOriginals: 0, reopeningRate: 0 },
          "Ponto Principal BL": { reopenings: 0, totalOriginals: 0, reopeningRate: 0 }
        },
        reopeningsByReason: {}
      };
    }
    
    // Se não houver pares de reabertura, ainda assim calcular os totais de ordens originais
    const hasReopenings = getFilteredReopeningPairs.length > 0;
    
    // Calcular as métricas manualmente com base nos pares de reabertura
    const reopenedOrders = getFilteredReopeningPairs.length;
    
    // Calcular tempo médio entre ordens
    const totalTimeBetween = getFilteredReopeningPairs.reduce((acc, pair) => acc + pair.timeBetween, 0);
    const averageTimeBetween = reopenedOrders > 0 ? parseFloat((totalTimeBetween / reopenedOrders).toFixed(2)) : 0;
    
    // Reaberturas por técnico (só processa se houver reaberturas)
    const reopeningsByTechnician: Record<string, number> = {};
    const reopeningsByTechnicianTV: Record<string, number> = {};
    const reopeningsByTechnicianFibra: Record<string, number> = {};
    
    // Reaberturas por tipo de serviço
    const reopeningsByType: Record<string, number> = {};
    const reopeningsByCity: Record<string, number> = {};
    const reopeningsByNeighborhood: Record<string, number> = {};
    
    // Só processar reaberturas se existirem
    if (hasReopenings) {
      getFilteredReopeningPairs.forEach(pair => {
        const techName = pair.originalOrder.nome_tecnico || "Desconhecido";
        reopeningsByTechnician[techName] = (reopeningsByTechnician[techName] || 0) + 1;
        
        // Verificar categoria do serviço para separar por segmento
        const originalCategory = pair.originalServiceCategory || "";
        
        if (originalCategory.includes("TV")) {
          reopeningsByTechnicianTV[techName] = (reopeningsByTechnicianTV[techName] || 0) + 1;
        } else if (originalCategory.includes("FIBRA")) {
          reopeningsByTechnicianFibra[techName] = (reopeningsByTechnicianFibra[techName] || 0) + 1;
        }
        
        // Reaberturas por tipo de serviço
        const serviceType = pair.reopeningOrder.subtipo_servico || "Desconhecido";
        reopeningsByType[serviceType] = (reopeningsByType[serviceType] || 0) + 1;
        
        // Reaberturas por cidade
        const city = normalizeCityName(pair.reopeningOrder.cidade) || "Desconhecido";
        reopeningsByCity[city] = (reopeningsByCity[city] || 0) + 1;
        
        // Reaberturas por bairro
        const neighborhood = normalizeNeighborhoodName(pair.reopeningOrder.bairro) || "Desconhecido";
        reopeningsByNeighborhood[neighborhood] = (reopeningsByNeighborhood[neighborhood] || 0) + 1;
      });
    }
    
    // Contar ordens originais por tipo para calcular taxas de reabertura
    const originalOrdersByType: Record<string, number> = {};
    
    // Lista de todos os tipos de serviço possíveis (incluindo os que não tem reaberturas)
    const allServiceTypes = new Set<string>();
    
    // Definir os tipos principais que devem sempre aparecer
    const requiredTypes = ["Corretiva", "Corretiva BL", "Ponto Principal", "Ponto Principal BL"];
    
    // Primeiro, inicializar todos os tipos obrigatórios com zero
    requiredTypes.forEach(type => {
      originalOrdersByType[type] = 0;
      allServiceTypes.add(type);
    });
    
    // Contar TODAS as ordens filtradas (criadas OU finalizadas no mês) dos tipos principais
    filteredServiceOrders.forEach(order => {
      if (!order.subtipo_servico) return;
      
      // Primeiro, tentar matching exato com os tipos obrigatórios
      let matched = false;
      requiredTypes.forEach(requiredType => {
        if (order.subtipo_servico === requiredType) {
          originalOrdersByType[requiredType] = (originalOrdersByType[requiredType] || 0) + 1;
          matched = true;
        }
      });
      
      // Se não houve match exato, tentar matching por conteúdo
      if (!matched) {
        requiredTypes.forEach(requiredType => {
          if (order.subtipo_servico?.includes(requiredType)) {
            originalOrdersByType[requiredType] = (originalOrdersByType[requiredType] || 0) + 1;
            matched = true;
          }
        });
      }
      
      // Para outros tipos que possam gerar reaberturas
      if (!matched) {
        const isOtherOriginalType = ["Ponto Principal", "Ponto Principal BL", "Corretiva", "Corretiva BL"].some(
          type => order.subtipo_servico?.includes(type)
        );
        
        if (isOtherOriginalType) {
          const type = order.subtipo_servico || "Desconhecido";
          originalOrdersByType[type] = (originalOrdersByType[type] || 0) + 1;
          allServiceTypes.add(type);
        }
      }
    });
    
    // Reaberturas por tipo original
    const reopeningsByOriginalType: Record<string, { 
      reopenings: number; 
      totalOriginals: number; 
      reopeningRate: number 
    }> = {};
    
    // Inicializar TODOS os tipos (obrigatórios e outros encontrados)
    allServiceTypes.forEach(type => {
      reopeningsByOriginalType[type] = {
        reopenings: 0,
        totalOriginals: originalOrdersByType[type] || 0,
        reopeningRate: 0
      };
    });
    
    // Garantir que os tipos obrigatórios sempre estejam presentes, mesmo com contagem zero
    requiredTypes.forEach(type => {
      if (!reopeningsByOriginalType[type]) {
        reopeningsByOriginalType[type] = {
          reopenings: 0,
          totalOriginals: originalOrdersByType[type] || 0,
          reopeningRate: 0
        };
      }
    });
    
    // Contabilizar reaberturas por tipo original (só se houver reaberturas)
    if (hasReopenings) {
      getFilteredReopeningPairs.forEach(pair => {
        const originalType = pair.originalOrder.subtipo_servico || "Desconhecido";
        
        if (!reopeningsByOriginalType[originalType]) {
          reopeningsByOriginalType[originalType] = {
            reopenings: 0,
            totalOriginals: originalOrdersByType[originalType] || 1,
            reopeningRate: 0
          };
        }
        
        reopeningsByOriginalType[originalType].reopenings++;
      });
    }
    
    // Calcular taxas de reabertura por tipo
    Object.keys(reopeningsByOriginalType).forEach(type => {
      const { reopenings, totalOriginals } = reopeningsByOriginalType[type];
      reopeningsByOriginalType[type].reopeningRate = totalOriginals > 0 
        ? (reopenings / totalOriginals) * 100
        : 0;
    });
    
    // Calcular motivos de reabertura (só se houver reaberturas)
    const reopeningsByReason: Record<string, {
      byOriginalType: Record<string, number>;
      total: number;
    }> = {};
    
    if (hasReopenings) {
      getFilteredReopeningPairs.forEach(pair => {
        const reason = pair.reopeningOrder.motivo || "Motivo não especificado";
        const originalType = pair.originalOrder.subtipo_servico || "Desconhecido";
        
        if (!reopeningsByReason[reason]) {
          reopeningsByReason[reason] = {
            byOriginalType: {},
            total: 0
          };
        }
        
        reopeningsByReason[reason].total++;
        
        if (!reopeningsByReason[reason].byOriginalType[originalType]) {
          reopeningsByReason[reason].byOriginalType[originalType] = 0;
        }
        
        reopeningsByReason[reason].byOriginalType[originalType]++;
      });
    }
    
    // Calcular taxa geral de reabertura - considerando os tipos filtrados, se houver
    let totalMainServices = 0;
    let filteredReopenings = reopenedOrders;
    
    if (originalServiceTypeFilter) {
      // Se há um filtro de tipo, contar apenas serviços desse tipo exato
      totalMainServices = filteredServiceOrders.filter(order => 
        order.subtipo_servico === originalServiceTypeFilter
      ).length;
      
      // Contar apenas as reaberturas relacionadas a ordens do tipo filtrado
      filteredReopenings = getFilteredReopeningPairs.filter(pair => 
        pair.originalOrder.subtipo_servico === originalServiceTypeFilter
      ).length;
    } else {
      // Se não há filtro, contar todos os tipos principais
      totalMainServices = filteredServiceOrders.filter(order => 
        ["Ponto Principal", "Ponto Principal BL", "Corretiva", "Corretiva BL"].some(
          type => order.subtipo_servico?.includes(type)
        )
      ).length;
    }
    
    const reopeningRate = totalMainServices > 0 
      ? (filteredReopenings / totalMainServices) * 100
      : 0;
    
    return {
      reopenedOrders,
      reopeningRate,
      averageTimeBetween,
      reopeningsByTechnician,
      reopeningsByTechnicianTV,
      reopeningsByTechnicianFibra,
      reopeningsByType,
      reopeningsByCity,
      reopeningsByNeighborhood,
      reopeningsByOriginalType,
      reopeningsByReason
    };
  }, [getFilteredReopeningPairs, filteredServiceOrders, selectedMonth, selectedYear, originalServiceTypeFilter]);
  
  // Extrair tipos de serviço únicos das ordens originais para o filtro
  const uniqueOriginalServiceTypes = useMemo(() => {
    if (!showData || !getReopeningPairs().length) {
      return [];
    }
    
    const allPairs = getReopeningPairs();
    
    // Extrair todos os tipos de serviço únicos das ordens originais
    const uniqueTypes = new Set<string>();
    
    allPairs.forEach(pair => {
      if (pair.originalOrder.subtipo_servico) {
        uniqueTypes.add(pair.originalOrder.subtipo_servico);
      }
    });
    
    // Converter o Set para array e ordenar alfabeticamente
    return Array.from(uniqueTypes).sort();
  }, [getReopeningPairs, showData]);
  
  // Resetar o estado de exibição quando o usuário troca de aba
  useEffect(() => {
    // Limpar o estado e os filtros quando o usuário muda de aba
    setShowData(false);
    setIsFiltering(false);
    
    // Limpar os filtros imediatamente ao trocar de aba
    setSelectedMonth(null);
    setSelectedYear(null);
  }, [activeTab]);
  
  // Verificar se podemos exibir os dados quando os filtros são alterados
  useEffect(() => {
    // Quando o mês ou ano mudam, aplicar filtros imediatamente
    if (selectedMonth && selectedYear) {
      setShowData(true);
      setIsFiltering(false);
    } else {
      setShowData(false);
      setIsFiltering(false);
    }
  }, [selectedMonth, selectedYear]);
  
  // Função para aplicar filtros
  const handleApplyFilters = () => {
    if (selectedMonth && selectedYear) {
      // Aplicar filtros imediatamente
      setShowData(true);
      setIsFiltering(false);
    }
  };
  
  // Função para limpar filtros
  const handleClearFilters = () => {
    setSelectedMonth(null);
    setSelectedYear(null);
    setShowData(false);
    setIsFiltering(false);
  };
  
  // Componente de filtro reutilizável
  const FilterControls = () => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          <div className="flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filtrar por Período
          </div>
        </CardTitle>
        <CardDescription>
          {activeTab === "reopening" ? (
            "Selecione o mês e ano para visualizar reaberturas criadas no período"
          ) : (
            activeTab === "time" ? 
            "Selecione o mês e ano para visualizar os dados (Data de Finalização)" :
            "Selecione o mês e ano para visualizar os dados (Data de Criação ou Finalização)"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="month-select">Mês</Label>
            <Select 
              value={selectedMonth || ""} 
              onValueChange={(value) => setSelectedMonth(value || null)}
              disabled={isFiltering}
            >
              <SelectTrigger id="month-select">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {getMonthName(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <Label htmlFor="year-select">Ano</Label>
            <Select 
              value={selectedYear || ""} 
              onValueChange={(value) => setSelectedYear(value || null)}
              disabled={isFiltering}
            >
              <SelectTrigger id="year-select">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end gap-2">
            <Button 
              onClick={handleApplyFilters}
              disabled={!selectedMonth || !selectedYear || isFiltering}
              variant="default"
            >
              {isFiltering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aplicando...
                </>
              ) : "Aplicar Filtros"}
            </Button>
            <Button 
              onClick={handleClearFilters}
              variant="outline"
              disabled={isFiltering}
            >
              Limpar
            </Button>
          </div>
        </div>
        {activeTab === "time" && (
          <div className="mt-2 text-xs text-muted-foreground">
            <strong>Nota:</strong> Os dados mostrados são das ordens de serviço <strong>finalizadas</strong> no mês e ano selecionados. O cálculo de tempo de atendimento considera apenas OSs que já foram concluídas.
          </div>
        )}
        {activeTab === "reopening" && (
          <div className="mt-2 text-xs text-muted-foreground">
            <strong>Nota:</strong> As reaberturas mostradas são aquelas <strong>criadas</strong> no mês e ano selecionados, mesmo que a OS original tenha sido finalizada em um mês anterior. A taxa de reabertura considera apenas os tipos de serviço que podem gerar reaberturas. O "Total de Ordens Abertas" considera as OSs <strong>criadas ou finalizadas</strong> no mês selecionado.
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  // Componente para exibir mensagem de dados não carregados
  const NoDataMessage = () => (
    <Card className="w-full h-64">
      <CardContent className="flex items-center justify-center h-full">
        <div className="text-center">
          {isFiltering ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 text-primary animate-spin mb-4" />
              <h3 className="text-lg font-medium">Filtrando dados...</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Aguarde enquanto aplicamos os filtros selecionados.
              </p>
            </>
          ) : (
            <>
              <CalendarIcon className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Selecione um período</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Escolha o mês e o ano para visualizar os dados.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
  
  return (
    <>
      <Tabs defaultValue="time" className="space-y-4 w-full" onValueChange={setActiveTab}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Indicadores de Desempenho</h2>
        <div className="overflow-x-auto">
          <TabsList className="flex flex-nowrap min-w-max">
            <TabsTrigger value="time" className="flex items-center whitespace-nowrap">
              <Clock className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Tempos</span>
            </TabsTrigger>
            <TabsTrigger value="reopening" className="flex items-center whitespace-nowrap">
              <Repeat className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Reaberturas</span>
            </TabsTrigger>
            <TabsTrigger value="permanencia" className="flex items-center whitespace-nowrap">
              <AlertTriangle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Permanência</span>
            </TabsTrigger>
            <TabsTrigger value="metas" className="flex items-center whitespace-nowrap">
              <BarChart2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Metas</span>
            </TabsTrigger>
            <TabsTrigger value="technicians" className="flex items-center whitespace-nowrap">
              <Users className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Técnicos</span>
            </TabsTrigger>
            <TabsTrigger value="vendedor" className="flex items-center whitespace-nowrap">
              <BarChart2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Vendedor</span>
            </TabsTrigger>
            <TabsTrigger value="indicadores" className="flex items-center whitespace-nowrap">
              <BarChart2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Indicadores</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center whitespace-nowrap">
              <UserCog className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center whitespace-nowrap">
              <CreditCard className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Pagamentos</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center whitespace-nowrap">
              <FileUp className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Importação</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </div>
      
      {/* Time Metrics Tab */}
      <TabsContent value="time" className="space-y-4">
        <FilterControls />
        
        {!showData ? (
          <NoDataMessage />
        ) : (
          <>
        {/* Dois quadros lado a lado */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Service Type Time Performance */}
          <Card>
            <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Desempenho por Tempo de Atendimento
                  </div>
                </CardTitle>
              <CardDescription>
                Análise do tempo médio de atendimento por tipo de serviço
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm font-medium w-[30%] px-2">Tipo de Serviço</TableHead>
                      <TableHead className="text-center text-sm font-medium w-[15%] px-2">Dentro Meta</TableHead>
                      <TableHead className="text-center text-sm font-medium w-[15%] px-2">Total</TableHead>
                      <TableHead className="text-center text-sm font-medium w-[15%] px-2">% Meta</TableHead>
                      <TableHead className="text-center text-sm font-medium w-[25%] px-2">Serv. p/ Meta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Ordem específica solicitada
                      const orderedTypes = [
                        'Assistência Técnica TV',
                        'Assistência Técnica FIBRA',
                        'Ponto Principal TV',
                        'Ponto Principal FIBRA'
                      ];
                      
                      // Filtrar e ordenar os tipos que existem nos dados
                      return orderedTypes
                        .filter(type => timeMetrics.servicesByType[type])
                        .map(type => {
                          const metrics = timeMetrics.servicesByType[type] as {
                            totalOrders: number;
                            withinGoal: number;
                            percentWithinGoal: number;
                            averageTime: number;
                          };
                          const goalPercent = metrics.percentWithinGoal;
                          const servicesNeeded = calculateServicesNeededForTimeTarget(type, metrics.withinGoal, metrics.totalOrders);
                          
                          return (
                            <TableRow key={type}>
                              <TableCell className="font-medium text-sm px-2">{type}</TableCell>
                              <TableCell className="text-center text-sm px-2">{metrics.withinGoal}</TableCell>
                              <TableCell className="text-center text-sm px-2">{metrics.totalOrders}</TableCell>
                              <TableCell className="text-center text-sm px-2">
                                <span className={`font-bold ${getTimeAttendanceColorByServiceType(type, goalPercent)}`}>
                                  {goalPercent.toFixed(2)}%
                                </span>
                              </TableCell>
                              <TableCell className="text-center text-sm px-2">
                                {formatTimeMetaDisplay(servicesNeeded)}
                              </TableCell>
                            </TableRow>
                          );
                        });
                    })()}
                    
                    {Object.keys(timeMetrics.servicesByType).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-sm px-2">
                          Nenhum dado disponível para análise no período selecionado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="mt-3 text-sm text-muted-foreground italic space-y-1">
                  <p><strong>Serv. p/ Meta:</strong> <span className="text-green-600 font-medium">+X acima</span> = dentro da meta com X serviços acima, <span className="text-green-600 font-medium">limite</span> = exatamente no limite da meta, <span className="text-red-600 font-medium">+X serviços</span> = fora da meta, precisa de X serviços adicionais para voltar à faixa verde.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total de Serviços Finalizados */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Total de Serviços Finalizados
                </div>
              </CardTitle>
              <CardDescription>
                Comparação mensal de serviços finalizados por subtipo
              </CardDescription>
            </CardHeader>
                         <CardContent className="py-4">
               <div className="space-y-2">
                 {/* Função para mapear os nomes dos tipos para a nova nomenclatura */}
                 {(() => {
                   const mapServiceTypeName = (originalType: string): string => {
                     const typeMapping: Record<string, string> = {
                       'Corretiva': 'Assistência Técnica TV',
                       'Corretiva BL': 'Assistência Técnica FIBRA'
                     };
                     return typeMapping[originalType] || originalType;
                   };

                   // Função para determinar a cor baseada no tipo de serviço e diferença
                   const getDifferenceColor = (serviceType: string, difference: number): string => {
                     const mappedType = mapServiceTypeName(serviceType);
                     
                     // Para Assistência Técnica, valores negativos são BONS (menos chamados = melhor)
                     if (mappedType === 'Assistência Técnica TV' || mappedType === 'Assistência Técnica FIBRA') {
                       if (difference > 0) return 'text-red-600'; // Aumento é ruim
                       if (difference < 0) return 'text-green-600'; // Diminuição é bom
                       return 'text-gray-600'; // Sem mudança
                     }
                     
                     // Para outros tipos, mantém lógica padrão
                     if (difference > 0) return 'text-green-600'; // Aumento é bom
                     if (difference < 0) return 'text-red-600'; // Diminuição é ruim
                     return 'text-gray-600'; // Sem mudança
                   };

                   // Separar serviços por categoria
                   const assistenciaTecnica = finishedServicesComparison.filter(item => 
                     ['Corretiva', 'Corretiva BL'].includes(item.subtipo)
                   );
                   
                   const outrosServicos = finishedServicesComparison.filter(item => 
                     !['Corretiva', 'Corretiva BL'].includes(item.subtipo)
                   );

                   return (
                     <>
                       {/* Seção Assistência Técnica */}
                       {assistenciaTecnica.length > 0 && (
                         <div className="mb-4">
                           <div className="flex items-center mb-2 pb-1 border-b border-blue-200">
                             <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                             <h4 className="font-semibold text-sm text-blue-700">Assistência Técnica</h4>
                             <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                               Redução = Melhoria
                             </span>
                           </div>
                           <div className="space-y-1 ml-5">
                             {assistenciaTecnica.map((item) => {
                               const percentChange = item.previousMonth > 0 
                                 ? ((item.currentMonth - item.previousMonth) / item.previousMonth) * 100 
                                 : item.currentMonth > 0 ? 100 : 0;
                               
                               const difference = item.currentMonth - item.previousMonth;

                               // Calcular diferença com a média dos 3 meses
                               const averageThreeMonths = Math.round(item.averageThreeMonths);
                               const averageDifference = item.currentMonth - averageThreeMonths;
                               const averagePercentChange = averageThreeMonths > 0 
                                 ? ((item.currentMonth - averageThreeMonths) / averageThreeMonths) * 100 
                                 : item.currentMonth > 0 ? 100 : 0;
                               
                               return (
                                 <div key={item.subtipo} className="border-b border-gray-50 pb-1 last:border-b-0">
                                   <div className="mb-0.5">
                                     <span className="font-medium text-xs">{mapServiceTypeName(item.subtipo)}</span>
                                   </div>
                                   
                                   <div className="grid grid-cols-12 gap-1 text-xs items-center">
                                     {/* Seção Mês Atual vs Anterior */}
                                     <div className="col-span-1">
                                       <div className="text-gray-400 text-xs">Atual</div>
                                       <div className="font-semibold text-xs">{item.currentMonth}</div>
                                     </div>
                                     <div className="col-span-1">
                                       <div className="text-gray-400 text-xs">Anterior</div>
                                       <div className="font-semibold text-xs">{item.previousMonth}</div>
                                     </div>
                                     <div className="col-span-3">
                                       <div className="text-gray-400 text-xs">Diferença</div>
                                       <div className={`font-semibold text-xs ${getDifferenceColor(item.subtipo, difference)}`}>
                                         {difference >= 0 ? '+' : ''}{difference} ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2).replace('.', ',')}%)
                                       </div>
                                     </div>

                                     {/* Separador Visual */}
                                     <div className="col-span-1 flex justify-center">
                                       <div className="border-l border-gray-300 h-8"></div>
                                     </div>

                                     {/* Seção Média 3 Meses */}
                                     <div className="col-span-2">
                                       <div className="text-gray-400 text-xs">Média 3 meses</div>
                                       <div className="font-semibold text-xs">{averageThreeMonths}</div>
                                     </div>
                                     <div className="col-span-4">
                                       <div className="text-gray-400 text-xs">Diferença</div>
                                       <div className={`font-semibold text-xs ${getDifferenceColor(item.subtipo, averageDifference)}`}>
                                         {averageDifference >= 0 ? '+' : ''}{averageDifference} ({averagePercentChange >= 0 ? '+' : ''}{averagePercentChange.toFixed(2).replace('.', ',')}%)
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         </div>
                       )}

                       {/* Seção Outros Serviços */}
                       {outrosServicos.length > 0 && (
                         <div>
                           <div className="flex items-center mb-2 pb-1 border-b border-green-200">
                             <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                             <h4 className="font-semibold text-sm text-green-700">Outros Serviços</h4>
                             <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                               Aumento = Melhoria
                             </span>
                           </div>
                           <div className="space-y-1 ml-5">
                             {outrosServicos.map((item) => {
                               const percentChange = item.previousMonth > 0 
                                 ? ((item.currentMonth - item.previousMonth) / item.previousMonth) * 100 
                                 : item.currentMonth > 0 ? 100 : 0;
                               
                               const difference = item.currentMonth - item.previousMonth;

                               // Calcular diferença com a média dos 3 meses
                               const averageThreeMonths = Math.round(item.averageThreeMonths);
                               const averageDifference = item.currentMonth - averageThreeMonths;
                               const averagePercentChange = averageThreeMonths > 0 
                                 ? ((item.currentMonth - averageThreeMonths) / averageThreeMonths) * 100 
                                 : item.currentMonth > 0 ? 100 : 0;
                               
                               return (
                                 <div key={item.subtipo} className="border-b border-gray-50 pb-1 last:border-b-0">
                                   <div className="mb-0.5">
                                     <span className="font-medium text-xs">{mapServiceTypeName(item.subtipo)}</span>
                                   </div>
                                   
                                   <div className="grid grid-cols-12 gap-1 text-xs items-center">
                                     {/* Seção Mês Atual vs Anterior */}
                                     <div className="col-span-1">
                                       <div className="text-gray-400 text-xs">Atual</div>
                                       <div className="font-semibold text-xs">{item.currentMonth}</div>
                                     </div>
                                     <div className="col-span-1">
                                       <div className="text-gray-400 text-xs">Anterior</div>
                                       <div className="font-semibold text-xs">{item.previousMonth}</div>
                                     </div>
                                     <div className="col-span-3">
                                       <div className="text-gray-400 text-xs">Diferença</div>
                                       <div className={`font-semibold text-xs ${getDifferenceColor(item.subtipo, difference)}`}>
                                         {difference >= 0 ? '+' : ''}{difference} ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2).replace('.', ',')}%)
                                       </div>
                                     </div>

                                     {/* Separador Visual */}
                                     <div className="col-span-1 flex justify-center">
                                       <div className="border-l border-gray-300 h-8"></div>
                                     </div>

                                     {/* Seção Média 3 Meses */}
                                     <div className="col-span-2">
                                       <div className="text-gray-400 text-xs">Média 3 meses</div>
                                       <div className="font-semibold text-xs">{averageThreeMonths}</div>
                                     </div>
                                     <div className="col-span-4">
                                       <div className="text-gray-400 text-xs">Diferença</div>
                                       <div className={`font-semibold text-xs ${getDifferenceColor(item.subtipo, averageDifference)}`}>
                                         {averageDifference >= 0 ? '+' : ''}{averageDifference} ({averagePercentChange >= 0 ? '+' : ''}{averagePercentChange.toFixed(2).replace('.', ',')}%)
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         </div>
                       )}
                     </>
                   );
                 })()}
                 
                 {finishedServicesComparison.length === 0 && (
                   <div className="text-center text-muted-foreground py-2 text-xs">
                     Nenhum dado disponível para comparação no período selecionado
                   </div>
                 )}
               </div>
             </CardContent>
          </Card>
        </div>
          </>
        )}
      </TabsContent>
      
      {/* Reopening Metrics Tab */}
      <TabsContent value="reopening" className="space-y-4">
        <FilterControls />
        
        {!showData ? (
          <NoDataMessage />
        ) : (
          <>
        {/* Filtro por tipo de serviço original - MOVIDO PARA AQUI */}
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="originalServiceTypeFilter" className="text-sm font-medium">
                Filtros por:
              </label>
              <div className="flex items-center space-x-3">
                <div className="w-full md:w-1/3">
                  <label htmlFor="originalServiceTypeFilter" className="text-xs text-muted-foreground block mb-1">
                    Tipo de Serviço da OS Original:
                  </label>
                  <select
                    id="originalServiceTypeFilter"
                    value={originalServiceTypeFilter}
                    onChange={(e) => setOriginalServiceTypeFilter(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    <option value="">Todos os tipos</option>
                    {uniqueOriginalServiceTypes.map((type) => {
                      // Função para mapear os nomes dos tipos originais para a nova nomenclatura
                      const mapOriginalServiceTypeName = (originalType: string): string => {
                        const typeMapping: Record<string, string> = {
                          'Corretiva': 'Assistência Técnica TV',
                          'Corretiva BL': 'Assistência Técnica FIBRA',
                          'Ponto Principal': 'Ponto Principal TV',
                          'Ponto Principal BL': 'Ponto Principal FIBRA'
                        };
                        return typeMapping[originalType] || originalType;
                      };
                      
                      const displayName = mapOriginalServiceTypeName(type);
                      return (
                        <option key={type} value={type}>{displayName}</option>
                      );
                    })}
                  </select>
                </div>
                {originalServiceTypeFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOriginalServiceTypeFilter("")}
                    className="mt-5"
                  >
                    Limpar filtro
                  </Button>
                )}
              </div>
            </div>
            {originalServiceTypeFilter && (
              <div className="mt-2 text-xs text-muted-foreground">
                {(() => {
                  // Função para mapear os nomes dos tipos originais para a nova nomenclatura
                  const mapOriginalServiceTypeName = (originalType: string): string => {
                    const typeMapping: Record<string, string> = {
                      'Corretiva': 'Assistência Técnica TV',
                      'Corretiva BL': 'Assistência Técnica FIBRA',
                      'Ponto Principal': 'Ponto Principal TV',
                      'Ponto Principal BL': 'Ponto Principal FIBRA'
                    };
                    return typeMapping[originalType] || originalType;
                  };
                  
                  const displayName = mapOriginalServiceTypeName(originalServiceTypeFilter);
                  return (
                    <>
                      <span className="text-primary font-medium">{getFilteredReopeningPairs.length}</span> reaberturas encontradas com o tipo de serviço original: <span className="font-medium">{displayName}</span>
                    </>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
            
        {/* Grid 2x3 - Posição Superior */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Primeira linha - 2 cards */}
          {/* Reopened Orders Count */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium">
                Ordens Reabertas
              </CardTitle>
              <CardDescription className="text-xs">
                Total de ordens identificadas como reabertas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
                  <div className="text-2xl font-bold">{getReopeningMetrics.reopenedOrders}</div>
            </CardContent>
          </Card>
          
          {/* Total Original Services */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium">
                Total de Ordens Abertas
              </CardTitle>
              <CardDescription className="text-xs">
                {originalServiceTypeFilter 
                  ? `Total de ${originalServiceTypeFilter}`
                  : "Soma de Corretiva, Corretiva BL, Ponto Principal e Ponto Principal BL"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <div className="text-2xl font-bold">
                {filteredServiceOrders.filter(order => {
                  if (originalServiceTypeFilter) {
                    // Se há um filtro, mostrar apenas as ordens do tipo exato filtrado
                    return order.subtipo_servico === originalServiceTypeFilter;
                  } else {
                    // Se não há filtro, mostrar todos os tipos principais
                    return ["Ponto Principal", "Ponto Principal BL", "Corretiva", "Corretiva BL"].some(
                      type => order.subtipo_servico?.includes(type)
                    );
                  }
                }).length}
              </div>
            </CardContent>
          </Card>
          
          {/* Reaberturas por Tipo da OS Original - Ocupa 3 colunas e 2 linhas */}
          <Card className="md:col-span-3 md:row-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">
                <div className="flex items-center">
                  <BarChart2 className="mr-2 h-5 w-5" />
                  Reaberturas por Tipo da OS Original
                </div>
              </CardTitle>
              <CardDescription className="text-sm">
                Análise de reaberturas por tipo de serviço
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto" style={{ maxHeight: "450px" }}>
              <div className="overflow-x-auto w-full">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm font-medium w-[35%] px-2">Tipo da OS Original</TableHead>
                      <TableHead className="text-center text-sm font-medium w-[15%] px-2">Serviços</TableHead>
                      <TableHead className="text-center text-sm font-medium w-[15%] px-2">Reab.</TableHead>
                      <TableHead className="text-center text-sm font-medium w-[15%] px-2">% Reabertura</TableHead>
                      <TableHead className="text-center text-sm font-medium w-[20%] px-2">Serv. p/ Meta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(getReopeningMetrics.reopeningsByOriginalType)
                      .filter(([type, data]) => {
                        // Se houver um filtro, mostrar apenas o tipo filtrado
                        if (originalServiceTypeFilter) {
                          return type === originalServiceTypeFilter;
                        }
                        // Caso contrário, mostrar todos os tipos
                        return true;
                      })
                      .sort((a, b) => {
                        // Array com a ordem desejada dos tipos principais
                        const orderPriority = ["Corretiva", "Corretiva BL", "Ponto Principal", "Ponto Principal BL"];
                        
                        // Se ambos são tipos principais, usar a ordem definida
                        if (orderPriority.includes(a[0]) && orderPriority.includes(b[0])) {
                          return orderPriority.indexOf(a[0]) - orderPriority.indexOf(b[0]);
                        }
                        
                        // Se só um é tipo principal, ele vem primeiro
                        if (orderPriority.includes(a[0])) return -1;
                        if (orderPriority.includes(b[0])) return 1;
                        
                        // Caso contrário, ordenar alfabeticamente
                        return a[0].localeCompare(b[0]);
                      })
                      .map(([type, data]) => {
                        // Função para mapear os nomes dos tipos originais para a nova nomenclatura
                        const mapOriginalServiceTypeName = (originalType: string): string => {
                          const typeMapping: Record<string, string> = {
                            'Corretiva': 'Assistência Técnica TV',
                            'Corretiva BL': 'Assistência Técnica FIBRA',
                            'Ponto Principal': 'Ponto Principal TV',
                            'Ponto Principal BL': 'Ponto Principal FIBRA'
                          };
                          return typeMapping[originalType] || originalType;
                        };
                        
                        const displayName = mapOriginalServiceTypeName(type);
                        const servicesNeeded = calculateServicesNeededForTarget(type, data.reopenings, data.totalOriginals);
                        return (
                          <TableRow key={type}>
                            <TableCell className="font-medium text-sm px-2">{displayName}</TableCell>
                            <TableCell className="text-center text-sm px-2">{data.totalOriginals}</TableCell>
                            <TableCell className="text-center text-sm px-2">{data.reopenings}</TableCell>
                            <TableCell className="text-center text-sm px-2">
                              <span className={`font-bold ${getReopeningColorByServiceType(type, (data.reopenings / data.totalOriginals * 100))}`}>
                                {(data.reopenings / data.totalOriginals * 100).toFixed(2)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-sm px-2">
                              {servicesNeeded < 0 ? (
                                <span className="text-green-600 font-medium">{Math.abs(servicesNeeded)} reab. disp.</span>
                              ) : servicesNeeded === 0 ? (
                                <span className="text-amber-600 font-medium">0 reab. disp.</span>
                              ) : (
                                <span className="text-red-600 font-medium">
                                  +{servicesNeeded} serviços
                                  <span className="text-muted-foreground ml-1">({data.totalOriginals + servicesNeeded} total)</span>
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    }
                    
                    {Object.keys(getReopeningMetrics.reopeningsByOriginalType).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-sm px-2">
                          Nenhuma reabertura encontrada no período selecionado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="mt-3 text-sm text-muted-foreground italic space-y-1">
                  <p><strong>Nota:</strong> Na coluna "Serviços" são contabilizadas todas as ordens que foram <strong>criadas OU finalizadas</strong> no mês selecionado.</p>
                  <p><strong>Serv. p/ Meta:</strong> <span className="text-green-600 font-medium">X reab. disp.</span> = dentro da meta com X reaberturas ainda disponíveis, <span className="text-amber-600 font-medium">0 reab. disp.</span> = no limite exato da meta (ponto de atenção), <span className="text-red-600 font-medium">+X serviços (Y total)</span> = fora da meta, precisa de X serviços adicionais (chegando a Y serviços no total) para voltar à faixa verde.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Segunda linha - 2 cards */}
          {/* Reopening Rate */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium">
                Chance de reabertura (Taxa de Reabertura)
              </CardTitle>
              <CardDescription className="text-xs">
                Percentual de reaberturas sobre o total
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <div className="text-2xl font-bold">{getReopeningMetrics.reopeningRate.toFixed(2).replace('.', ',')}%</div>
              <Progress 
                value={getReopeningMetrics.reopeningRate} 
                className="h-2 mt-2"
              />
            </CardContent>
          </Card>
          
          {/* Average Time Between */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium">
                Tempo Médio Entre OS
              </CardTitle>
              <CardDescription className="text-xs">
                Tempo médio entre finalização original e reabertura
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
                <div className="text-2xl font-bold">
                      {getReopeningMetrics.averageTimeBetween} horas 
                  <span className="text-base font-normal text-muted-foreground ml-2">
                        ({(getReopeningMetrics.averageTimeBetween / 24).toFixed(1)} dias)
                  </span>
                </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Reopening Pairs List */}
        <Card className="w-full">
          <CardHeader className="py-3">
            <CardTitle>
              <div className="flex items-center">
                <Repeat className="mr-2 h-5 w-5" />
                Ordens de Serviço Reabertas
              </div>
            </CardTitle>
            <CardDescription>
              Pares de OS original e reabertura identificados por cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
            {/* O filtro que estava aqui foi movido para cima */}
            <div className="overflow-x-auto w-full">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Técnico Responsável</TableHead>
                    <TableHead>OS Original</TableHead>
                    <TableHead>Ação Tomada Original</TableHead>
                    <TableHead>Finalização Original</TableHead>
                    <TableHead>OS Reabertura</TableHead>
                    <TableHead>Ação Tomada Reabertura</TableHead>
                    <TableHead>Data Criação Reabertura</TableHead>
                    <TableHead className="text-right">Tempo entre OS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {getFilteredReopeningPairs.map((pair, index) => {
                    const formatDate = (dateString: string) => {
                      const date = new Date(dateString);
                      return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    };
                        
                    // Definir uma classe de cor com base na proximidade do limite de 30 dias
                    const getDaysColor = (days: number) => {
                      if (days >= 25) return "text-red-500"; // Muito próximo do limite
                      if (days >= 20) return "text-amber-500"; // Próximo do limite
                      return "text-muted-foreground"; // Dentro do limite normal
                    };
                    
                    // Função para determinar a cor da badge baseada na ação tomada
                    const getAcaoTomadaBadge = (acaoTomada: string | null, orderStatus: string = "") => {
                      // Se ação tomada estiver vazia e o status for Finalizada, mostrar "Concluída"
                      if ((!acaoTomada || acaoTomada === "N/A") && orderStatus.toUpperCase() === "FINALIZADA") {
                        return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">Concluída</Badge>;
                      }
                      
                      // Se ação tomada estiver vazia para outros status
                      if (!acaoTomada || acaoTomada === "N/A") {
                        return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">N/A</Badge>;
                      }
                      
                      if (acaoTomada === "Cancelada via CCS") {
                        return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">Cancelada via CCS</Badge>;
                      }
                      
                      if (acaoTomada === "Cliente Cancelou via SAC") {
                        return <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">Cliente Cancelou via SAC</Badge>;
                      }
                      
                      // Para outras ações tomadas, usar cores baseadas na ação
                      if (acaoTomada.toLowerCase().includes("concluído") || acaoTomada.toLowerCase().includes("concluida")) {
                        return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">{acaoTomada}</Badge>;
                      }
                      
                      if (acaoTomada.toLowerCase().includes("não") || acaoTomada.toLowerCase().includes("nao") || acaoTomada.toLowerCase().includes("problema")) {
                        return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">{acaoTomada}</Badge>;
                      }
                      
                      // Para outras ações, uma cor padrão
                      return <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">{acaoTomada}</Badge>;
                    };
                    
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{pair.originalOrder.nome_cliente}</TableCell>
                        <TableCell className="font-medium">{pair.originalOrder.nome_tecnico}</TableCell>
                        <TableCell>{pair.originalOrder.codigo_os}<br/><span className="text-xs text-muted-foreground">{pair.originalOrder.subtipo_servico}</span></TableCell>
                        <TableCell>{getAcaoTomadaBadge(pair.originalOrder.acao_tomada, pair.originalOrder.status)}</TableCell>
                        <TableCell>{formatDate(pair.originalOrder.data_finalizacao)}</TableCell>
                        <TableCell>{pair.reopeningOrder.codigo_os}<br/><span className="text-xs text-muted-foreground">{pair.reopeningOrder.subtipo_servico}</span></TableCell>
                        <TableCell>{getAcaoTomadaBadge(pair.reopeningOrder.acao_tomada, pair.reopeningOrder.status)}</TableCell>
                        <TableCell>{formatDate(pair.reopeningOrder.data_criacao)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {pair.timeBetween.toFixed(1)} horas
                          <br />
                              <span className={`text-xs ${getDaysColor(pair.daysBetween)}`}>
                                ({pair.daysBetween} dias)
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                      {getFilteredReopeningPairs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                            Nenhum par de reabertura encontrado no período selecionado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-muted-foreground italic">
                      <p>Nota: As reaberturas são identificadas quando uma nova OS é criada no mesmo mês que a OS original foi finalizada.
                      <strong> Exceção:</strong> Se a OS original foi finalizada no último dia do mês e a reabertura ocorreu no primeiro dia do mês seguinte, 
                      também é considerada uma reabertura válida.</p>
                      
                      <p className="mt-1"><strong>Importante:</strong> O tempo entre OS é calculado da <strong>finalização da OS original</strong> até a <strong>criação da OS de reabertura</strong>.</p>
                      
                      <p className="mt-1"><strong>Importante:</strong> O filtro de Mês/Ano considera a <strong>data de criação da OS de reabertura</strong> (não a data da OS original). 
                      Isso significa que você verá as reaberturas que foram <strong>criadas</strong> no mês selecionado, mesmo que a OS original tenha sido finalizada em um mês anterior.</p>
                      
                      <p className="mt-1"><strong>Importante:</strong> OSs com Ação Tomada Original contendo "Cliente Cancelou via SAC" não são consideradas como OSs primárias de reabertura.</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs mt-2">
                      <div>Indicadores de proximidade ao limite:</div>
                      <div className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-muted mr-1"></span> Normal</div>
                      <div className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-1"></span> Próximo (20-24 dias)</div>
                      <div className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span> Crítico (25-30 dias)</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            

        
          {/* Organize all reopening cards in a 2x2 grid that fills the screen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Motivo da Reabertura por OS Primária */}
            <Card className="h-full w-full">
              <CardHeader className="py-3">
                <CardTitle>
                  <div className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Motivo da Reabertura por OS Primária
                  </div>
                </CardTitle>
                <CardDescription>
                  Motivos agrupados pela OS de origem (primária)
                </CardDescription>
          </CardHeader>
              <CardContent className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
                <div className="overflow-x-auto w-full">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Motivo da Reabertura</TableHead>
                        <TableHead>Total</TableHead>
                        {Object.keys(getReopeningMetrics.reopeningsByOriginalType).length > 0 && 
                          Object.keys(getReopeningMetrics.reopeningsByOriginalType)
                            .sort((a, b) => getReopeningMetrics.reopeningsByOriginalType[b].reopenings - getReopeningMetrics.reopeningsByOriginalType[a].reopenings)
                            .map(type => (
                              <TableHead key={type} className="text-center">
                                {type}
                              </TableHead>
                            ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getReopeningMetrics.reopeningsByReason && 
                        Object.entries(getReopeningMetrics.reopeningsByReason)
                          .sort((a, b) => b[1].total - a[1].total)
                          .map(([reason, data]) => (
                            <TableRow key={reason}>
                              <TableCell className="font-medium">{reason}</TableCell>
                              <TableCell className="text-center">{data.total}</TableCell>
                              {Object.keys(getReopeningMetrics.reopeningsByOriginalType).length > 0 && 
                                Object.keys(getReopeningMetrics.reopeningsByOriginalType)
                                  .sort((a, b) => getReopeningMetrics.reopeningsByOriginalType[b].reopenings - getReopeningMetrics.reopeningsByOriginalType[a].reopenings)
                                  .map(type => (
                                    <TableCell key={type} className="text-center">
                                      {data.byOriginalType[type] ? data.byOriginalType[type] : "-"}
                                    </TableCell>
                                  ))}
                            </TableRow>
                          ))}
                      {(!getReopeningMetrics.reopeningsByReason || Object.keys(getReopeningMetrics.reopeningsByReason).length === 0) && (
                        <TableRow>
                          <TableCell colSpan={Object.keys(getReopeningMetrics.reopeningsByOriginalType).length + 2} className="text-center py-4 text-muted-foreground">
                            Nenhum motivo de reabertura encontrado no período selecionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
            {/* Reopening by Technician */}
            <Card className="h-full w-full">
              <CardHeader className="py-3">
                <CardTitle>
                  <div className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Reaberturas por Técnico
                  </div>
                </CardTitle>
          </CardHeader>
              <CardContent className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
                <div className="space-y-4 w-full">
                    {Object.entries(getReopeningMetrics.reopeningsByTechnician)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([technician, count]: [string, number]) => {
                        const percent = (count / getReopeningMetrics.reopenedOrders) * 100;
                      return (
                        <div key={technician} className="space-y-1 w-full">
                          <div className="flex justify-between items-center w-full">
                            <span className="font-medium">{technician}</span>
                            <span className="text-sm">{count} reaberturas</span>
                          </div>
                          <div className="bg-orange-100 rounded-full h-2 overflow-hidden w-full">
                            <div 
                              className="bg-orange-400 h-full rounded-full" 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {percent.toFixed(1)}% do total de reaberturas
                          </div>
                        </div>
                      );
                    })
                  }
                    {Object.keys(getReopeningMetrics.reopeningsByTechnician).length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                        Nenhuma reabertura por técnico encontrada no período selecionado
                    </div>
                  )}
                </div>
          </CardContent>
        </Card>
        
            {/* By City */}
            <Card className="h-full w-full">
              <CardHeader className="py-3">
                <CardTitle>
                  <div className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Reaberturas por Cidade
                  </div>
                </CardTitle>
            </CardHeader>
              <CardContent className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
                <div className="space-y-4 w-full">
                    {Object.entries(getReopeningMetrics.reopeningsByCity)
                  .sort((a, b) => b[1] - a[1])
                    .map(([city, count]: [string, number]) => {
                        const percent = (count / getReopeningMetrics.reopenedOrders) * 100;
                    return (
                        <div key={city} className="space-y-1 w-full">
                          <div className="flex justify-between items-center w-full">
                          <span className="font-medium">{city.toUpperCase()}</span>
                          <span className="text-sm">{count} reaberturas</span>
                        </div>
                          <div className="bg-orange-100 rounded-full h-2 overflow-hidden w-full">
                          <div 
                            className="bg-orange-400 h-full rounded-full" 
                              style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {percent.toFixed(1)}% do total de reaberturas
                        </div>
                      </div>
                    );
                  })
                }
                    {Object.keys(getReopeningMetrics.reopeningsByCity).length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                        Nenhuma reabertura por cidade encontrada no período selecionado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
            {/* By Neighborhood */}
            <Card className="h-full w-full">
              <CardHeader className="py-3">
                <CardTitle>
                  <div className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Reaberturas por Bairro
                  </div>
                </CardTitle>
            </CardHeader>
              <CardContent className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
                <div className="space-y-4 w-full">
                    {Object.entries(getReopeningMetrics.reopeningsByNeighborhood)
                  .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([neighborhood, count]: [string, number]) => {
                        const percent = (count / getReopeningMetrics.reopenedOrders) * 100;
                    return (
                        <div key={neighborhood} className="space-y-1 w-full">
                          <div className="flex justify-between items-center w-full">
                          <span className="font-medium">{neighborhood.toUpperCase()}</span>
                          <span className="text-sm">{count} reaberturas</span>
                        </div>
                          <div className="bg-blue-100 rounded-full h-2 overflow-hidden w-full">
                          <div 
                            className="bg-blue-400 h-full rounded-full" 
                              style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {percent.toFixed(1)}% do total de reaberturas
                        </div>
                      </div>
                    );
                  })
                }
                    {Object.keys(getReopeningMetrics.reopeningsByNeighborhood).length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                        Nenhuma reabertura por bairro encontrada no período selecionado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
          </>
        )}
      </TabsContent>
      
      {/* Permanência Tab */}
      <TabsContent value="permanencia" className="space-y-4">
          <PermanenciaTabContent setFiltroGlobal={setFiltroDataHabilitacao} />
      </TabsContent>
      
      {/* Metas Tab */}
      <TabsContent value="metas" className="space-y-4">
          <MetasTabContent />
      </TabsContent>
      
      {/* Vendedor Tab */}
      <TabsContent value="vendedor" className="space-y-4">
        <VendedorTabContent />
      </TabsContent>
      
      {/* Indicadores Tab */}
      <TabsContent value="indicadores" className="space-y-4">
        <FilterControls />
        
        {!showData ? (
          <NoDataMessage />
        ) : (
          <>
            {/* Quadro unificado de métricas de desempenho */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <BarChart2 className="mr-2 h-5 w-5" />
                    Indicadores de Desempenho
                  </div>
                </CardTitle>
                <CardDescription>
                  Percentuais de Tempo de Atendimento e Reaberturas por tipo de serviço
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Assistência Técnica TV */}
                  <div className="border rounded-md p-4 shadow-sm">
                    <h3 className="text-lg font-medium text-center mb-3">Assistência Técnica TV</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground text-center">Tempo de Atendimento</div>
                        {(() => {
                          const metrics = Object.entries(timeMetrics.servicesByType)
                            .filter(([type]) => type === 'Assistência Técnica TV')
                            .map(([_, data]) => data)[0];
                          
                          if (!metrics) return <div className="text-center text-2xl font-bold">-</div>;
                          
                          const goalPercent = metrics.percentWithinGoal;
                          // Usar funções de coloração baseadas no tipo de serviço
                          const progressClass = getTimeAttendanceBackgroundColorByServiceType("Assistência Técnica TV", goalPercent);
                          const indicatorClass = getTimeAttendanceIndicatorColorByServiceType("Assistência Técnica TV", goalPercent);
                          const textColorClass = getTimeAttendanceColorByServiceType("Assistência Técnica TV", goalPercent);
                          
                          return (
                            <>
                              <div className={`text-center text-2xl font-bold ${textColorClass}`}>{goalPercent.toFixed(2)}%</div>
                              <div className={progressClass + " rounded-full h-2 overflow-hidden"}>
                                <div 
                                  className={indicatorClass + " h-full rounded-full"} 
                                  style={{ width: `${goalPercent}%` }}
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground text-center">Reaberturas</div>
                        {(() => {
                          const data = getReopeningMetrics.reopeningsByOriginalType["Corretiva"];
                          
                          if (!data) return <div className="text-center text-2xl font-bold">-</div>;
                          
                          // Critérios para Reaberturas de Assistência Técnica TV usando colorUtils
                          const colorClass = getReopeningColorByServiceType("Corretiva", data.reopeningRate);
                          const reopeningClass = data.reopeningRate < 3.5
                            ? "bg-green-100" 
                            : data.reopeningRate < 10.5
                              ? "bg-yellow-100" 
                              : "bg-red-100";
                          const reopeningIndicatorClass = data.reopeningRate < 3.5
                            ? "bg-green-400" 
                            : data.reopeningRate < 10.5
                              ? "bg-yellow-400" 
                              : "bg-red-400";
                          
                          return (
                            <>
                              <div className={`text-center text-2xl font-bold ${colorClass}`}>{data.reopeningRate.toFixed(2)}%</div>
                              <div className={reopeningClass + " rounded-full h-2 overflow-hidden"}>
                                <div 
                                  className={reopeningIndicatorClass + " h-full rounded-full"} 
                                  style={{ width: `${data.reopeningRate}%` }}
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Seção BASE TV */}
                    <BaseMetricsSection
                      type="tv"
                      metrics={baseMetrics}
                      title="Base de Clientes TV"
                    />
                  </div>
                  
                  {/* Ponto Principal TV */}
                  <div className="border rounded-md p-4 shadow-sm">
                    <h3 className="text-lg font-medium text-center mb-3">Ponto Principal TV</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground text-center">Tempo de Atendimento</div>
                        {(() => {
                          const metrics = Object.entries(timeMetrics.servicesByType)
                            .filter(([type]) => type === 'Ponto Principal TV')
                            .map(([_, data]) => data)[0];
                          
                          if (!metrics) return <div className="text-center text-2xl font-bold">-</div>;
                          
                          const goalPercent = metrics.percentWithinGoal;
                          // Usar funções de coloração baseadas no tipo de serviço
                          const progressClass = getTimeAttendanceBackgroundColorByServiceType("Ponto Principal TV", goalPercent);
                          const indicatorClass = getTimeAttendanceIndicatorColorByServiceType("Ponto Principal TV", goalPercent);
                          const textColorClass = getTimeAttendanceColorByServiceType("Ponto Principal TV", goalPercent);
                          
                          return (
                            <>
                              <div className={`text-center text-2xl font-bold ${textColorClass}`}>{goalPercent.toFixed(2)}%</div>
                              <div className={progressClass + " rounded-full h-2 overflow-hidden"}>
                                <div 
                                  className={indicatorClass + " h-full rounded-full"} 
                                  style={{ width: `${goalPercent}%` }}
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground text-center">Reaberturas</div>
                        {(() => {
                          const data = getReopeningMetrics.reopeningsByOriginalType["Ponto Principal"];
                          
                          if (!data) return <div className="text-center text-2xl font-bold">-</div>;
                          
                          // Critérios para Reaberturas de Ponto Principal TV usando colorUtils
                          const colorClass = getReopeningColorByServiceType("Ponto Principal", data.reopeningRate);
                          const reopeningClass = data.reopeningRate < 2
                            ? "bg-green-100" 
                            : data.reopeningRate < 5
                              ? "bg-yellow-100"
                              : "bg-red-100";
                          const reopeningIndicatorClass = data.reopeningRate < 2
                            ? "bg-green-400" 
                            : data.reopeningRate < 5
                              ? "bg-yellow-400"
                              : "bg-red-400";
                          
                          return (
                            <>
                              <div className={`text-center text-2xl font-bold ${colorClass}`}>{data.reopeningRate.toFixed(2)}%</div>
                              <div className={reopeningClass + " rounded-full h-2 overflow-hidden"}>
                                <div 
                                  className={reopeningIndicatorClass + " h-full rounded-full"} 
                                  style={{ width: `${data.reopeningRate}%` }}
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Assistência Técnica FIBRA */}
                  <div className="border rounded-md p-4 shadow-sm">
                    <h3 className="text-lg font-medium text-center mb-3">Assistência Técnica FIBRA</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground text-center">Tempo de Atendimento</div>
                        {(() => {
                          const metrics = Object.entries(timeMetrics.servicesByType)
                            .filter(([type]) => type === 'Assistência Técnica FIBRA')
                            .map(([_, data]) => data)[0];
                          
                          if (!metrics) return <div className="text-center text-2xl font-bold">-</div>;
                          
                          const goalPercent = metrics.percentWithinGoal;
                          // Usar funções de coloração baseadas no tipo de serviço
                          const progressClass = getTimeAttendanceBackgroundColorByServiceType("Assistência Técnica FIBRA", goalPercent);
                          const indicatorClass = getTimeAttendanceIndicatorColorByServiceType("Assistência Técnica FIBRA", goalPercent);
                          const textColorClass = getTimeAttendanceColorByServiceType("Assistência Técnica FIBRA", goalPercent);
                          
                          return (
                            <>
                              <div className={`text-center text-2xl font-bold ${textColorClass}`}>{goalPercent.toFixed(2)}%</div>
                              <div className={progressClass + " rounded-full h-2 overflow-hidden"}>
                                <div 
                                  className={indicatorClass + " h-full rounded-full"} 
                                  style={{ width: `${goalPercent}%` }}
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground text-center">Reaberturas</div>
                        {(() => {
                          const data = getReopeningMetrics.reopeningsByOriginalType["Corretiva BL"];
                          
                          if (!data) return <div className="text-center text-2xl font-bold">-</div>;
                          
                          // Critérios para Reaberturas de Assistência Técnica FIBRA usando colorUtils
                          const colorClass = getReopeningColorByServiceType("Corretiva BL", data.reopeningRate);
                          const reopeningClass = data.reopeningRate < 8
                            ? "bg-green-100" 
                            : data.reopeningRate < 16
                              ? "bg-yellow-100" 
                              : "bg-red-100";
                          const reopeningIndicatorClass = data.reopeningRate < 8
                            ? "bg-green-400" 
                            : data.reopeningRate < 16
                              ? "bg-yellow-400" 
                              : "bg-red-400";
                          
                          return (
                            <>
                              <div className={`text-center text-2xl font-bold ${colorClass}`}>{data.reopeningRate.toFixed(2)}%</div>
                              <div className={reopeningClass + " rounded-full h-2 overflow-hidden"}>
                                <div 
                                  className={reopeningIndicatorClass + " h-full rounded-full"} 
                                  style={{ width: `${data.reopeningRate}%` }}
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Seção BASE FIBRA */}
                    <BaseMetricsSection
                      type="fibra"
                      metrics={baseMetrics}
                      title="Base de Clientes FIBRA"
                    />
                  </div>
                  
                  {/* Ponto Principal FIBRA */}
                  <div className="border rounded-md p-4 shadow-sm">
                    <h3 className="text-lg font-medium text-center mb-3">Ponto Principal FIBRA</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground text-center">Tempo de Atendimento</div>
                        {(() => {
                          const metrics = Object.entries(timeMetrics.servicesByType)
                            .filter(([type]) => type === 'Ponto Principal FIBRA')
                            .map(([_, data]) => data)[0];
                          
                          if (!metrics) return <div className="text-center text-2xl font-bold">-</div>;
                          
                          const goalPercent = metrics.percentWithinGoal;
                          // Usar funções de coloração baseadas no tipo de serviço
                          const progressClass = getTimeAttendanceBackgroundColorByServiceType("Ponto Principal FIBRA", goalPercent);
                          const indicatorClass = getTimeAttendanceIndicatorColorByServiceType("Ponto Principal FIBRA", goalPercent);
                          const textColorClass = getTimeAttendanceColorByServiceType("Ponto Principal FIBRA", goalPercent);
                          
                          return (
                            <>
                              <div className={`text-center text-2xl font-bold ${textColorClass}`}>{goalPercent.toFixed(2)}%</div>
                              <div className={progressClass + " rounded-full h-2 overflow-hidden"}>
                                <div 
                                  className={indicatorClass + " h-full rounded-full"} 
                                  style={{ width: `${goalPercent}%` }}
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground text-center">Reaberturas</div>
                        {(() => {
                          const data = getReopeningMetrics.reopeningsByOriginalType["Ponto Principal BL"];
                          
                          if (!data) return <div className="text-center text-2xl font-bold">-</div>;
                          
                          // Critérios para Reaberturas de Ponto Principal FIBRA usando colorUtils
                          const colorClass = getReopeningColorByServiceType("Ponto Principal BL", data.reopeningRate);
                          const reopeningClass = data.reopeningRate < 5
                            ? "bg-green-100" 
                            : data.reopeningRate < 10
                              ? "bg-yellow-100"
                              : "bg-red-100";
                          const reopeningIndicatorClass = data.reopeningRate < 5
                            ? "bg-green-400" 
                            : data.reopeningRate < 10
                              ? "bg-yellow-400"
                              : "bg-red-400";
                          
                          return (
                            <>
                              <div className={`text-center text-2xl font-bold ${colorClass}`}>{data.reopeningRate.toFixed(2)}%</div>
                              <div className={reopeningClass + " rounded-full h-2 overflow-hidden"}>
                                <div 
                                  className={reopeningIndicatorClass + " h-full rounded-full"} 
                                  style={{ width: `${data.reopeningRate}%` }}
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Painel de Faixas de Desempenho e Bonificações */}
            <Card className="w-full mt-4">
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <BarChart2 className="mr-2 h-5 w-5" />
                    Faixas de Desempenho e Bonificações - Serviços
                  </div>
                </CardTitle>
                <CardDescription>
                  Associação entre TA e Reabertura e resultados de bonificação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* A) Assistência Técnica TV ↔ Corretiva */}
                  {(() => {
                    // Obter o percentual de TA para Assistência Técnica TV
                    const taPercentage = Object.entries(timeMetrics.servicesByType)
                      .filter(([type]) => type === 'Assistência Técnica TV')
                      .map(([_, metrics]) => metrics.percentWithinGoal)[0] || 0;
                    
                    // Obter o percentual de Reabertura para Corretiva
                    const reopeningRate = getReopeningMetrics.reopeningsByOriginalType["Corretiva"]?.reopeningRate || 0;
                    
                    // Determinar a bonificação com base nas tabelas
                    let bonusPercentage = 0;
                    if (taPercentage < 30) {
                      bonusPercentage = 0;
                    } else if (taPercentage < 45) {
                      if (reopeningRate < 3.5) bonusPercentage = 30;
                      else if (reopeningRate < 7) bonusPercentage = 20;
                      else if (reopeningRate < 10.5) bonusPercentage = 10;
                      else bonusPercentage = 0;
                    } else if (taPercentage < 60) {
                      if (reopeningRate < 3.5) bonusPercentage = 40;
                      else if (reopeningRate < 7) bonusPercentage = 30;
                      else if (reopeningRate < 10.5) bonusPercentage = 20;
                      else bonusPercentage = 0;
                    } else if (taPercentage < 75) {
                      if (reopeningRate < 3.5) bonusPercentage = 50;
                      else if (reopeningRate < 7) bonusPercentage = 40;
                      else if (reopeningRate < 10.5) bonusPercentage = 30;
                      else bonusPercentage = 0;
                    } else {
                      if (reopeningRate < 3.5) bonusPercentage = 60;
                      else if (reopeningRate < 7) bonusPercentage = 50;
                      else if (reopeningRate < 10.5) bonusPercentage = 40;
                      else bonusPercentage = 0;
                    }
                    
                    // Calcular ganho monetário: base TV × aliança
                    const baseTV = baseMetrics?.tv?.atual || 0;
                    const alianca = baseMetrics?.alianca?.atual || 0;
                    const ganhoMonetario = baseTV * alianca;
                    
                    // Calcular bônus da aliança: ganho base × (percentual bonificação / 100)
                    const bonusAlianca = bonusPercentage > 0 ? ganhoMonetario * (bonusPercentage / 100) : 0;
                    
                    // Calcular tendência comparado ao mês anterior usando diferencaQuantidade
                    const baseTVAnterior = baseTV - (baseMetrics?.tv?.diferencaQuantidade || 0);
                    const aliancaAnterior = alianca - (baseMetrics?.alianca?.diferencaQuantidade || 0);
                    const ganhoAnterior = baseTVAnterior * aliancaAnterior;
                    const bonusAnterior = ganhoAnterior > 0 ? ganhoAnterior * (bonusPercentage / 100) : 0;
                    const totalAtual = ganhoMonetario + bonusAlianca;
                    const totalAnterior = ganhoAnterior + bonusAnterior;
                    const diferencaValor = totalAtual - totalAnterior;
                    const diferencaPercentual = totalAnterior > 0 ? (diferencaValor / totalAnterior) * 100 : 0;
                    
                    const cardClass = bonusPercentage > 0 ? "bg-green-50" : "bg-red-50";
                    const textClass = bonusPercentage > 0 ? "text-green-700" : "text-red-700";
                    
                    return (
                      <Card className={cardClass}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            Assistência Técnica TV
                          </CardTitle>
                          <CardDescription>
                            TA: {taPercentage.toFixed(2)}% | Reabertura: {reopeningRate.toFixed(2)}%
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-xl font-bold ${textClass}`}>
                            {bonusPercentage > 0 ? `${bonusPercentage}% bonificação` : "Não Elegível"}
                          </div>
                          {baseMetrics && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="grid grid-cols-2 gap-3">
                                {/* Ganho Base */}
                                <div>
                                  <div className="text-sm text-gray-600 mb-1">Ganho Base</div>
                                  <div className="text-lg font-semibold text-blue-700">
                                    {ganhoMonetario.toLocaleString('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL' 
                                    })}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {baseTV.toLocaleString('pt-BR')} × R$ {alianca.toFixed(2)}
                                  </div>
                                </div>
                                
                                {/* Bônus Aliança */}
                                <div>
                                  <div className="text-sm text-gray-600 mb-1">Bônus Aliança</div>
                                  {bonusPercentage > 0 ? (
                                    <>
                                      <div className="text-lg font-semibold text-green-700">
                                        {bonusAlianca.toLocaleString('pt-BR', { 
                                          style: 'currency', 
                                          currency: 'BRL' 
                                        })}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {bonusPercentage}% do ganho base
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-lg font-semibold text-red-600">
                                        Não Vigente
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Não elegível
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {/* Tendência vs Mês Anterior */}
                              {totalAnterior > 0 && (
                                <div className="mt-3 pt-2 border-t border-gray-100">
                                  <div className="text-sm text-gray-600 mb-1">Tendência vs Mês Anterior</div>
                                  <div className={`text-sm font-medium flex items-center gap-1 ${
                                    diferencaValor > 0 ? 'text-green-600' : diferencaValor < 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    <span className="text-base">
                                      {diferencaValor > 0 ? '↗️' : diferencaValor < 0 ? '↘️' : '➡️'}
                                    </span>
                                    {diferencaValor > 0 ? '+' : ''}{diferencaPercentual.toFixed(1)}% 
                                    ({diferencaValor > 0 ? '+' : ''}{diferencaValor.toLocaleString('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL' 
                                    })})
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}
                  
                  {/* B) Assistência Técnica FIBRA ↔ Corretiva BL */}
                  {(() => {
                    // Obter o percentual de TA para Assistência Técnica FIBRA
                    const taPercentage = Object.entries(timeMetrics.servicesByType)
                      .filter(([type]) => type === 'Assistência Técnica FIBRA')
                      .map(([_, metrics]) => metrics.percentWithinGoal)[0] || 0;
                    
                    // Obter o percentual de Reabertura para Corretiva BL
                    const reopeningRate = getReopeningMetrics.reopeningsByOriginalType["Corretiva BL"]?.reopeningRate || 0;
                    
                    // Determinar a bonificação com base nas tabelas
                    let bonusPercentage = 0;
                    if (taPercentage < 40) {
                      bonusPercentage = 0;
                    } else if (taPercentage < 55) {
                      if (reopeningRate < 8) bonusPercentage = 30;
                      else if (reopeningRate < 12) bonusPercentage = 20;
                      else if (reopeningRate < 16) bonusPercentage = 10;
                      else bonusPercentage = 0;
                    } else if (taPercentage < 70) {
                      if (reopeningRate < 8) bonusPercentage = 40;
                      else if (reopeningRate < 12) bonusPercentage = 30;
                      else if (reopeningRate < 16) bonusPercentage = 20;
                      else bonusPercentage = 0;
                    } else if (taPercentage < 85) {
                      if (reopeningRate < 8) bonusPercentage = 50;
                      else if (reopeningRate < 12) bonusPercentage = 40;
                      else if (reopeningRate < 16) bonusPercentage = 30;
                      else bonusPercentage = 0;
                    } else {
                      if (reopeningRate < 8) bonusPercentage = 60;
                      else if (reopeningRate < 12) bonusPercentage = 50;
                      else if (reopeningRate < 16) bonusPercentage = 40;
                      else bonusPercentage = 0;
                    }
                    
                    // Calcular ganho monetário: base FIBRA × aliança
                    const baseFIBRA = baseMetrics?.fibra?.atual || 0;
                    const alianca = baseMetrics?.alianca?.atual || 0;
                    const ganhoMonetario = baseFIBRA * alianca;
                    
                    // Calcular bônus da aliança: ganho base × (percentual bonificação / 100)
                    const bonusAlianca = bonusPercentage > 0 ? ganhoMonetario * (bonusPercentage / 100) : 0;
                    
                    // Calcular tendência comparado ao mês anterior usando diferencaQuantidade
                    const baseFIBRAAnterior = baseFIBRA - (baseMetrics?.fibra?.diferencaQuantidade || 0);
                    const aliancaAnterior = alianca - (baseMetrics?.alianca?.diferencaQuantidade || 0);
                    const ganhoAnterior = baseFIBRAAnterior * aliancaAnterior;
                    const bonusAnterior = ganhoAnterior > 0 ? ganhoAnterior * (bonusPercentage / 100) : 0;
                    const totalAtual = ganhoMonetario + bonusAlianca;
                    const totalAnterior = ganhoAnterior + bonusAnterior;
                    const diferencaValor = totalAtual - totalAnterior;
                    const diferencaPercentual = totalAnterior > 0 ? (diferencaValor / totalAnterior) * 100 : 0;
                    
                    const cardClass = bonusPercentage > 0 ? "bg-green-50" : "bg-red-50";
                    const textClass = bonusPercentage > 0 ? "text-green-700" : "text-red-700";
                    
                    return (
                      <Card className={cardClass}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            Assistência Técnica FIBRA
                          </CardTitle>
                          <CardDescription>
                            TA: {taPercentage.toFixed(2)}% | Reabertura: {reopeningRate.toFixed(2)}%
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-xl font-bold ${textClass}`}>
                            {bonusPercentage > 0 ? `${bonusPercentage}% bonificação` : "Não Elegível"}
                          </div>
                          {baseMetrics && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="grid grid-cols-2 gap-3">
                                {/* Ganho Base */}
                                <div>
                                  <div className="text-sm text-gray-600 mb-1">Ganho Base</div>
                                  <div className="text-lg font-semibold text-blue-700">
                                    {ganhoMonetario.toLocaleString('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL' 
                                    })}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {baseFIBRA.toLocaleString('pt-BR')} × R$ {alianca.toFixed(2)}
                                  </div>
                                </div>
                                
                                {/* Bônus Aliança */}
                                <div>
                                  <div className="text-sm text-gray-600 mb-1">Bônus Aliança</div>
                                  {bonusPercentage > 0 ? (
                                    <>
                                      <div className="text-lg font-semibold text-green-700">
                                        {bonusAlianca.toLocaleString('pt-BR', { 
                                          style: 'currency', 
                                          currency: 'BRL' 
                                        })}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {bonusPercentage}% do ganho base
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-lg font-semibold text-red-600">
                                        Não Vigente
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Não elegível
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {/* Tendência vs Mês Anterior */}
                              {totalAnterior > 0 && (
                                <div className="mt-3 pt-2 border-t border-gray-100">
                                  <div className="text-sm text-gray-600 mb-1">Tendência vs Mês Anterior</div>
                                  <div className={`text-sm font-medium flex items-center gap-1 ${
                                    diferencaValor > 0 ? 'text-green-600' : diferencaValor < 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    <span className="text-base">
                                      {diferencaValor > 0 ? '↗️' : diferencaValor < 0 ? '↘️' : '➡️'}
                                    </span>
                                    {diferencaValor > 0 ? '+' : ''}{diferencaPercentual.toFixed(1)}% 
                                    ({diferencaValor > 0 ? '+' : ''}{diferencaValor.toLocaleString('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL' 
                                    })})
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}
                  
                  {/* C) Ponto Principal TV ↔ Ponto Principal */}
                  {(() => {
                    // Obter o percentual de TA para Ponto Principal TV
                    const taPercentage = Object.entries(timeMetrics.servicesByType)
                      .filter(([type]) => type === 'Ponto Principal TV')
                      .map(([_, metrics]) => metrics.percentWithinGoal)[0] || 0;
                    
                    // Obter o percentual de Reabertura para Ponto Principal
                    const reopeningRate = getReopeningMetrics.reopeningsByOriginalType["Ponto Principal"]?.reopeningRate || 0;
                    
                    // Contar serviços finalizados de Ponto Principal TV
                    const servicosFinalizados = filteredServiceOrdersByFinalization.filter(o => {
                      const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                      return category === "Ponto Principal TV" && o.include_in_metrics;
                    }).length;
                    
                    // Valor vigente por serviço
                    const valorPorServico = 20.00;
                    const ganhoTotal = servicosFinalizados * valorPorServico;
                    
                    // Calcular tendência - buscar serviços do mês anterior baseado nos filtros aplicados
                    const mesAtualFiltro = selectedMonth ? parseInt(selectedMonth) : new Date().getMonth() + 1;
                    const anoAtualFiltro = selectedYear ? parseInt(selectedYear) : new Date().getFullYear();
                    const mesAnterior = mesAtualFiltro === 1 ? 12 : mesAtualFiltro - 1;
                    const anoAnterior = mesAtualFiltro === 1 ? anoAtualFiltro - 1 : anoAtualFiltro;
                    
                    // Buscar nos dados completos (sem filtro de período) para pegar o mês anterior
                    const servicosFinalizadosAnterior = serviceOrders.filter(o => {
                      const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                      const dataFinalizacao = new Date(o.data_finalizacao);
                      return category === "Ponto Principal TV" && 
                             o.include_in_metrics &&
                             dataFinalizacao.getMonth() + 1 === mesAnterior &&
                             dataFinalizacao.getFullYear() === anoAnterior;
                    }).length;
                    
                    const ganhoAnterior = servicosFinalizadosAnterior * valorPorServico;
                    const diferencaValor = ganhoTotal - ganhoAnterior;
                    const diferencaPercentual = ganhoAnterior > 0 ? (diferencaValor / ganhoAnterior) * 100 : 0;
                    
                    // Determinar a bonificação com base nas tabelas
                    let result = "Não Elegível";
                    let isEligible = false;
                    
                    if (taPercentage >= 75 && reopeningRate <= 2) {
                      result = "R$20,00";
                      isEligible = true;
                    }
                    
                    const cardClass = isEligible ? "bg-green-50" : "bg-red-50";
                    const textClass = isEligible ? "text-green-700" : "text-red-700";
                    
                    return (
                      <Card className={cardClass}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            Ponto Principal TV
                          </CardTitle>
                          <CardDescription>
                            TA: {taPercentage.toFixed(2)}% | Reabertura: {reopeningRate.toFixed(2)}%
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-xl font-bold ${textClass}`}>
                            {result}
                          </div>
                          {servicosFinalizados > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="text-sm text-gray-600 mb-1">Ganho por Serviços</div>
                              <div className="text-lg font-semibold text-blue-700">
                                {ganhoTotal.toLocaleString('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {servicosFinalizados} serviços × R$ {valorPorServico.toFixed(2)}
                              </div>
                              
                              {/* Tendência vs Mês Anterior */}
                              {ganhoAnterior > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <div className="text-sm text-gray-600 mb-1">Tendência vs Mês Anterior</div>
                                  <div className={`text-sm font-medium flex items-center gap-1 ${
                                    diferencaValor > 0 ? 'text-green-600' : diferencaValor < 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    <span className="text-base">
                                      {diferencaValor > 0 ? '↗️' : diferencaValor < 0 ? '↘️' : '➡️'}
                                    </span>
                                    {diferencaValor > 0 ? '+' : ''}{diferencaPercentual.toFixed(1)}% 
                                    ({diferencaValor > 0 ? '+' : ''}{diferencaValor.toLocaleString('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL' 
                                    })})
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {servicosFinalizadosAnterior} serviços no mês anterior
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}
                  
                  {/* D) Ponto Principal FIBRA ↔ Ponto Principal BL */}
                  {(() => {
                    // Obter o percentual de TA para Ponto Principal FIBRA
                    const taPercentage = Object.entries(timeMetrics.servicesByType)
                      .filter(([type]) => type === 'Ponto Principal FIBRA')
                      .map(([_, metrics]) => metrics.percentWithinGoal)[0] || 0;
                    
                    // Obter o percentual de Reabertura para Ponto Principal BL
                    const reopeningRate = getReopeningMetrics.reopeningsByOriginalType["Ponto Principal BL"]?.reopeningRate || 0;
                    
                    // Contar serviços finalizados de Ponto Principal FIBRA
                    const servicosFinalizados = filteredServiceOrdersByFinalization.filter(o => {
                      const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                      return category === "Ponto Principal FIBRA" && o.include_in_metrics;
                    }).length;
                    
                    // Valor vigente por serviço
                    const valorPorServico = 40.00;
                    const ganhoTotal = servicosFinalizados * valorPorServico;
                    
                    // Calcular tendência - buscar serviços do mês anterior baseado nos filtros aplicados
                    const mesAtualFiltro = selectedMonth ? parseInt(selectedMonth) : new Date().getMonth() + 1;
                    const anoAtualFiltro = selectedYear ? parseInt(selectedYear) : new Date().getFullYear();
                    const mesAnterior = mesAtualFiltro === 1 ? 12 : mesAtualFiltro - 1;
                    const anoAnterior = mesAtualFiltro === 1 ? anoAtualFiltro - 1 : anoAtualFiltro;
                    
                    // Buscar nos dados completos (sem filtro de período) para pegar o mês anterior
                    const servicosFinalizadosAnterior = serviceOrders.filter(o => {
                      const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                      const dataFinalizacao = new Date(o.data_finalizacao);
                      return category === "Ponto Principal FIBRA" && 
                             o.include_in_metrics &&
                             dataFinalizacao.getMonth() + 1 === mesAnterior &&
                             dataFinalizacao.getFullYear() === anoAnterior;
                    }).length;
                    
                    const ganhoAnterior = servicosFinalizadosAnterior * valorPorServico;
                    const diferencaValor = ganhoTotal - ganhoAnterior;
                    const diferencaPercentual = ganhoAnterior > 0 ? (diferencaValor / ganhoAnterior) * 100 : 0;
                    
                    // Determinar a bonificação com base nas tabelas
                    let result = "Não Elegível";
                    let isEligible = false;
                    
                    if (taPercentage >= 75 && reopeningRate <= 5) {
                      result = "R$40,00";
                      isEligible = true;
                    }
                    
                    const cardClass = isEligible ? "bg-green-50" : "bg-red-50";
                    const textClass = isEligible ? "text-green-700" : "text-red-700";
                    
                    return (
                      <Card className={cardClass}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            Ponto Principal FIBRA
                          </CardTitle>
                          <CardDescription>
                            TA: {taPercentage.toFixed(2)}% | Reabertura: {reopeningRate.toFixed(2)}%
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-xl font-bold ${textClass}`}>
                            {result}
                          </div>
                          {servicosFinalizados > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="text-sm text-gray-600 mb-1">Ganho por Serviços</div>
                              <div className="text-lg font-semibold text-blue-700">
                                {ganhoTotal.toLocaleString('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {servicosFinalizados} serviços × R$ {valorPorServico.toFixed(2)}
                              </div>
                              
                              {/* Tendência vs Mês Anterior */}
                              {ganhoAnterior > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <div className="text-sm text-gray-600 mb-1">Tendência vs Mês Anterior</div>
                                  <div className={`text-sm font-medium flex items-center gap-1 ${
                                    diferencaValor > 0 ? 'text-green-600' : diferencaValor < 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    <span className="text-base">
                                      {diferencaValor > 0 ? '↗️' : diferencaValor < 0 ? '↘️' : '➡️'}
                                    </span>
                                    {diferencaValor > 0 ? '+' : ''}{diferencaPercentual.toFixed(1)}% 
                                    ({diferencaValor > 0 ? '+' : ''}{diferencaValor.toLocaleString('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL' 
                                    })})
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {servicosFinalizadosAnterior} serviços no mês anterior
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
            
            {/* Quadro Por Tipo de Serviço — Detalhamento por tipo (POS e BL-DGO) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Quadro de Permanência POS */}
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center">
                      <MapPin className="mr-2 h-5 w-5" />
                      Permanência POS
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Informações de permanência para serviços POS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PermanenciaPorTipoServico sigla="POS" datasHabilitacaoFiltradas={filtroDataHabilitacao} vendasFiltradas={vendasFiltradasPermanenciaIndicadores} />
                </CardContent>
              </Card>
              
              {/* Quadro de Permanência Fibra */}
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center">
                      <MapPin className="mr-2 h-5 w-5" />
                      Permanência Fibra
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Informações de permanência para serviços FIBRA
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PermanenciaPorTipoServico sigla="BL-DGO" datasHabilitacaoFiltradas={filtroDataHabilitacao} vendasFiltradas={vendasFiltradasPermanenciaIndicadores} />
                </CardContent>
              </Card>
            </div>
            
            {/* Novo quadro de Faixas de Desempenho e Bonificações - Vendas */}
            <div className="mb-6">
              <ValorDeFaceVendas vendasFiltradas={vendasFiltradasPermanenciaIndicadores} />
            </div>
          </>
        )}
      </TabsContent>
      
      {/* Technicians Metrics Tab */}
      <TabsContent value="technicians" className="space-y-4">
        <FilterControls />
        
        {!showData ? (
          <NoDataMessage />
        ) : technicians.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Technicians Reopening Table */}
              <Card className="col-span-1 md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Reabertura por Técnico
                  </CardTitle>
                  <CardDescription>
                    Quantidade e percentual de reaberturas por técnico, por tipo de serviço e segmento (TV/Fibra), ordenados pelo menor % de reabertura total e maior volume de serviços
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead rowSpan={2} className="align-middle">Técnico</TableHead>
                          <TableHead rowSpan={2} className="text-center align-middle">Total<br/>OS</TableHead>
                          <TableHead rowSpan={2} className="text-center align-middle">Total<br/>Reab.</TableHead>
                          <TableHead rowSpan={2} className="text-center align-middle">Taxa<br/>Total %</TableHead>
                          <TableHead className="text-center" colSpan={3}>Ponto Principal TV</TableHead>
                          <TableHead className="text-center" colSpan={3}>Ponto Principal FIBRA</TableHead>
                          <TableHead className="text-center" colSpan={3}>Assistência Técnica TV</TableHead>
                          <TableHead className="text-center" colSpan={3}>Assistência Técnica FIBRA</TableHead>
                        </TableRow>
                        <TableRow className="bg-muted">
                          <TableHead className="text-center py-2">Serv.</TableHead>
                          <TableHead className="text-center py-2">Reab.</TableHead>
                          <TableHead className="text-center py-2">%</TableHead>
                          <TableHead className="text-center py-2">Serv.</TableHead>
                          <TableHead className="text-center py-2">Reab.</TableHead>
                          <TableHead className="text-center py-2">%</TableHead>
                          <TableHead className="text-center py-2">Serv.</TableHead>
                          <TableHead className="text-center py-2">Reab.</TableHead>
                          <TableHead className="text-center py-2">%</TableHead>
                          <TableHead className="text-center py-2">Serv.</TableHead>
                          <TableHead className="text-center py-2">Reab.</TableHead>
                          <TableHead className="text-center py-2">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {technicians
                          .filter(name => name) // Filtrar nomes vazios
                          .map(name => {
                            const techOrders = filteredServiceOrders.filter(o => o.nome_tecnico === name);
                            const totalOrders = techOrders.length;
                            const reopenings = getReopeningMetrics.reopeningsByTechnician[name] || 0;
                            
                            // Contadores específicos por tipo
                            let pontoTVReopenings = 0;
                            let pontoFibraReopenings = 0;
                            let assistenciaTVReopenings = 0;
                            let assistenciaFibraReopenings = 0;
                            
                            // Contadores de serviços por tipo
                            let pontoPrincipalTVServices = 0;
                            let pontoPrincipalFibraServices = 0;
                            let assistenciaTecnicaTVServices = 0;
                            let assistenciaTecnicaFibraServices = 0;
                            
                            // Contar serviços por categoria
                            techOrders.forEach(order => {
                              const category = standardizeServiceCategory(
                                order.subtipo_servico || "",
                                order.motivo || ""
                              );
                              
                              if (category.includes("Ponto Principal TV")) {
                                pontoPrincipalTVServices++;
                              } else if (category.includes("Ponto Principal FIBRA")) {
                                pontoPrincipalFibraServices++;
                              } else if (category.includes("Assistência Técnica TV")) {
                                assistenciaTecnicaTVServices++;
                              } else if (category.includes("Assistência Técnica FIBRA")) {
                                assistenciaTecnicaFibraServices++;
                              }
                            });
                            
                            // Contagem por tipo de reabertura usando os pares
                            const techReopeningPairs = getFilteredReopeningPairs.filter(
                              pair => pair.originalOrder.nome_tecnico === name
                            );
                            
                            techReopeningPairs.forEach(pair => {
                              const originalCategory = pair.originalServiceCategory;
                              if (originalCategory?.includes("Ponto Principal TV")) {
                                pontoTVReopenings++;
                              } else if (originalCategory?.includes("Ponto Principal FIBRA")) {
                                pontoFibraReopenings++;
                              } else if (originalCategory?.includes("Assistência Técnica TV")) {
                                assistenciaTVReopenings++;
                              } else if (originalCategory?.includes("Assistência Técnica FIBRA")) {
                                assistenciaFibraReopenings++;
                              }
                            });
                            
                            // Calcular os percentuais para cada tipo de serviço
                            const pontoTVRate = pontoPrincipalTVServices > 0 ? (pontoTVReopenings / pontoPrincipalTVServices) * 100 : 0;
                            const pontoFibraRate = pontoPrincipalFibraServices > 0 ? (pontoFibraReopenings / pontoPrincipalFibraServices) * 100 : 0;
                            const assistenciaTVRate = assistenciaTecnicaTVServices > 0 ? (assistenciaTVReopenings / assistenciaTecnicaTVServices) * 100 : 0;
                            const assistenciaFibraRate = assistenciaTecnicaFibraServices > 0 ? (assistenciaFibraReopenings / assistenciaTecnicaFibraServices) * 100 : 0;
                            
                            // Calcular a taxa de reabertura total com base na soma dos serviços por tipo
                            const totalServices = pontoPrincipalTVServices + pontoPrincipalFibraServices + 
                                                assistenciaTecnicaTVServices + assistenciaTecnicaFibraServices;
                            const totalReopeningRate = totalServices > 0 ? (reopenings / totalServices) * 100 : 0;
                            
                            // Só exibir técnicos que têm dados no período filtrado
                            if (totalOrders === 0) return null;
                            
                            return {
                              name,
                              totalOrders,
                              reopenings,
                              totalReopeningRate,
                              pontoPrincipalTVServices,
                              pontoTVReopenings,
                              pontoTVRate,
                              pontoPrincipalFibraServices,
                              pontoFibraReopenings,
                              pontoFibraRate,
                              assistenciaTecnicaTVServices,
                              assistenciaTVReopenings,
                              assistenciaTVRate,
                              assistenciaTecnicaFibraServices,
                              assistenciaFibraReopenings,
                              assistenciaFibraRate
                            };
                          })
                          .filter(Boolean)
                          .sort((a, b) => {
                            // Primeiro critério: menor % de reabertura total
                            if (a.totalReopeningRate !== b.totalReopeningRate) {
                              return a.totalReopeningRate - b.totalReopeningRate;
                            }
                            // Segundo critério: maior quantidade de serviços total
                            const aTotal = a.pontoPrincipalTVServices + a.pontoPrincipalFibraServices + 
                                          a.assistenciaTecnicaTVServices + a.assistenciaTecnicaFibraServices;
                            const bTotal = b.pontoPrincipalTVServices + b.pontoPrincipalFibraServices + 
                                          b.assistenciaTecnicaTVServices + b.assistenciaTecnicaFibraServices;
                            return bTotal - aTotal;
                          })
                          .map((tech, index) => {
                            // Funções para colorir percentuais conforme as regras específicas por tipo
                            const getPontoPrincipalFibraColor = (rate: number) => {
                              if (rate < 5.00) return "text-green-600";
                              return "text-red-600";
                            };
                            
                            const getPontoPrincipalTVColor = (rate: number) => {
                              if (rate < 2.00) return "text-green-600";
                              return "text-red-600";
                            };
                            
                            const getAssistenciaTVColor = (rate: number) => {
                              if (rate < 3.50) return "text-green-600";
                              if (rate < 10.50) return "text-amber-600";
                              return "text-red-600";
                            };
                            
                            const getAssistenciaFibraColor = (rate: number) => {
                              if (rate < 8.00) return "text-green-600";
                              if (rate < 16.00) return "text-amber-600";
                              return "text-red-600";
                            };
                            
                            // Função para colorir taxa total
                            const getTotalReopeningColor = (rate: number) => {
                              if (rate < 5.00) return "text-green-600";
                              if (rate < 10.00) return "text-amber-600";
                              return "text-red-600";
                            };
                              
                            return (
                              <TableRow 
                                key={tech.name} 
                                className={index % 2 === 0 ? "bg-sky-50" : "bg-white"}
                              >
                                <TableCell className="font-medium">{tech.name}</TableCell>
                                <TableCell className="text-center">
                                  {tech.pontoPrincipalTVServices + tech.pontoPrincipalFibraServices + 
                                   tech.assistenciaTecnicaTVServices + tech.assistenciaTecnicaFibraServices}
                                </TableCell>
                                <TableCell className="text-center font-bold">{tech.reopenings}</TableCell>
                                <TableCell className={`text-center font-medium ${getTotalReopeningColor(tech.totalReopeningRate)}`}>
                                  {tech.totalReopeningRate.toFixed(2)}%
                                </TableCell>
                                <TableCell className="text-center">{tech.pontoPrincipalTVServices}</TableCell>
                                <TableCell className="text-center">{tech.pontoTVReopenings}</TableCell>
                                <TableCell className={`text-center ${getPontoPrincipalTVColor(tech.pontoTVRate)}`}>
                                  {tech.pontoTVRate.toFixed(2)}%
                                </TableCell>
                                <TableCell className="text-center">{tech.pontoPrincipalFibraServices}</TableCell>
                                <TableCell className="text-center">{tech.pontoFibraReopenings}</TableCell>
                                <TableCell className={`text-center ${getPontoPrincipalFibraColor(tech.pontoFibraRate)}`}>
                                  {tech.pontoFibraRate.toFixed(2)}%
                                </TableCell>
                                <TableCell className="text-center">{tech.assistenciaTecnicaTVServices}</TableCell>
                                <TableCell className="text-center">{tech.assistenciaTVReopenings}</TableCell>
                                <TableCell className={`text-center ${getAssistenciaTVColor(tech.assistenciaTVRate)}`}>
                                  {tech.assistenciaTVRate.toFixed(2)}%
                                </TableCell>
                                <TableCell className="text-center">{tech.assistenciaTecnicaFibraServices}</TableCell>
                                <TableCell className="text-center">{tech.assistenciaFibraReopenings}</TableCell>
                                <TableCell className={`text-center ${getAssistenciaFibraColor(tech.assistenciaFibraRate)}`}>
                                  {tech.assistenciaFibraRate.toFixed(2)}%
                                </TableCell>
                              </TableRow>
                          )})}
                        
                        {technicians.filter(name => name && filteredServiceOrders.some(o => o.nome_tecnico === name)).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={16} className="text-center py-4 text-muted-foreground">
                              Nenhum técnico encontrado no período selecionado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell className="font-bold text-left border-r border-muted">Total Geral</TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {getReopeningMetrics.reopenedOrders}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {getReopeningMetrics.reopeningRate.toFixed(2)}%
                          </TableCell>
                          
                          {/* Ponto Principal TV */}
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Ponto Principal TV";
                            }).length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {getFilteredReopeningPairs.filter(pair => 
                              pair.originalServiceCategory?.includes("Ponto Principal TV")
                            ).length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {(() => {
                              const services = filteredServiceOrders.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Ponto Principal TV";
                              }).length;
                              const reopenings = getFilteredReopeningPairs.filter(pair => 
                                pair.originalServiceCategory?.includes("Ponto Principal TV")
                              ).length;
                              return services > 0 ? ((reopenings / services) * 100).toFixed(2) + "%" : "0.00%";
                            })()}
                          </TableCell>

                          {/* Ponto Principal FIBRA */}
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Ponto Principal FIBRA";
                            }).length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {getFilteredReopeningPairs.filter(pair => 
                              pair.originalServiceCategory?.includes("Ponto Principal FIBRA")
                            ).length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {(() => {
                              const services = filteredServiceOrders.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Ponto Principal FIBRA";
                              }).length;
                              const reopenings = getFilteredReopeningPairs.filter(pair => 
                                pair.originalServiceCategory?.includes("Ponto Principal FIBRA")
                              ).length;
                              return services > 0 ? ((reopenings / services) * 100).toFixed(2) + "%" : "0.00%";
                            })()}
                          </TableCell>

                          {/* Assistência Técnica TV */}
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Assistência Técnica TV";
                            }).length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {getFilteredReopeningPairs.filter(pair => 
                              pair.originalServiceCategory?.includes("Assistência Técnica TV")
                            ).length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {(() => {
                              const services = filteredServiceOrders.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Assistência Técnica TV";
                              }).length;
                              const reopenings = getFilteredReopeningPairs.filter(pair => 
                                pair.originalServiceCategory?.includes("Assistência Técnica TV")
                              ).length;
                              return services > 0 ? ((reopenings / services) * 100).toFixed(2) + "%" : "0.00%";
                            })()}
                          </TableCell>

                          {/* Assistência Técnica FIBRA */}
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Assistência Técnica FIBRA";
                            }).length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {getFilteredReopeningPairs.filter(pair => 
                              pair.originalServiceCategory?.includes("Assistência Técnica FIBRA")
                            ).length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {(() => {
                              const services = filteredServiceOrders.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Assistência Técnica FIBRA";
                              }).length;
                              const reopenings = getFilteredReopeningPairs.filter(pair => 
                                pair.originalServiceCategory?.includes("Assistência Técnica FIBRA")
                              ).length;
                              return services > 0 ? ((reopenings / services) * 100).toFixed(2) + "%" : "0.00%";
                            })()}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              
              {/* Novo Card - Tempo de Atendimento por Técnico */}
              <Card className="col-span-1 md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Tempo de Atendimento por Técnico
                  </CardTitle>
                  <CardDescription>
                    Quantidade de OS finalizadas por técnico, por segmento (TV/Fibra), categorizadas por tempo de atendimento atingido ou perdido
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead rowSpan={2} className="align-middle">Técnico</TableHead>
                          <TableHead rowSpan={2} className="text-center align-middle">Total</TableHead>
                          <TableHead rowSpan={2} className="text-center align-middle">% Meta</TableHead>
                          
                          <TableHead className="text-center border-b border-muted" colSpan={3}>Assist. TV</TableHead>
                          <TableHead className="text-center border-b border-muted" colSpan={3}>Assist. FIBRA</TableHead>
                          <TableHead className="text-center border-b border-muted" colSpan={3}>Ponto TV</TableHead>
                          <TableHead className="text-center border-b border-muted" colSpan={3}>Ponto FIBRA</TableHead>
                        </TableRow>
                        <TableRow className="bg-muted">
                          {/* Assistência Técnica TV */}
                          <TableHead className="text-center py-1 bg-muted/40">Na Meta</TableHead>
                          <TableHead className="text-center py-1 bg-muted/40">Fora</TableHead>
                          <TableHead className="text-center py-1 bg-muted/40">%</TableHead>
                          
                          {/* Assistência Técnica Fibra */}
                          <TableHead className="text-center py-1">Na Meta</TableHead>
                          <TableHead className="text-center py-1">Fora</TableHead>
                          <TableHead className="text-center py-1">%</TableHead>
                          
                          {/* Ponto Principal TV */}
                          <TableHead className="text-center py-1 bg-muted/40">Na Meta</TableHead>
                          <TableHead className="text-center py-1 bg-muted/40">Fora</TableHead>
                          <TableHead className="text-center py-1 bg-muted/40">%</TableHead>
                          
                          {/* Ponto Principal Fibra */}
                          <TableHead className="text-center py-1">Na Meta</TableHead>
                          <TableHead className="text-center py-1">Fora</TableHead>
                          <TableHead className="text-center py-1">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {technicians
                          .filter(name => name) // Filtrar nomes vazios
                          .map(name => {
                            // Filtrar apenas ordens finalizadas por este técnico
                            const techOrders = filteredServiceOrdersByFinalization.filter(
                              o => o.nome_tecnico === name && o.data_finalizacao && o.include_in_metrics
                            );
                            
                            // Total de ordens finalizadas
                            const totalFinalized = techOrders.length;
                            
                            // Contadores por categoria e status de meta
                            const assistTvWithinGoal = techOrders.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Assistência Técnica TV" && o.atingiu_meta === true;
                            }).length;
                            
                            const assistTvOutsideGoal = techOrders.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Assistência Técnica TV" && o.atingiu_meta === false;
                            }).length;
                            
                            const assistFibraWithinGoal = techOrders.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Assistência Técnica FIBRA" && o.atingiu_meta === true;
                            }).length;
                            
                            const assistFibraOutsideGoal = techOrders.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Assistência Técnica FIBRA" && o.atingiu_meta === false;
                            }).length;
                            
                            const pontoTvWithinGoal = techOrders.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Ponto Principal TV" && o.atingiu_meta === true;
                            }).length;
                            
                            const pontoTvOutsideGoal = techOrders.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Ponto Principal TV" && o.atingiu_meta === false;
                            }).length;
                            
                            const pontoFibraWithinGoal = techOrders.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Ponto Principal FIBRA" && o.atingiu_meta === true;
                            }).length;
                            
                            const pontoFibraOutsideGoal = techOrders.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Ponto Principal FIBRA" && o.atingiu_meta === false;
                            }).length;
                            
                            // Total dentro da meta (todos os tipos)
                            const totalWithinGoal = assistTvWithinGoal + assistFibraWithinGoal + 
                                                  pontoTvWithinGoal + pontoFibraWithinGoal;
                            
                            // Calcular percentuais para cada tipo
                            const totalAssistTv = assistTvWithinGoal + assistTvOutsideGoal;
                            const percentAssistTv = totalAssistTv > 0 
                              ? (assistTvWithinGoal / totalAssistTv) * 100 
                              : 0;
                              
                            const totalAssistFibra = assistFibraWithinGoal + assistFibraOutsideGoal;
                            const percentAssistFibra = totalAssistFibra > 0 
                              ? (assistFibraWithinGoal / totalAssistFibra) * 100 
                              : 0;
                              
                            const totalPontoTv = pontoTvWithinGoal + pontoTvOutsideGoal;
                            const percentPontoTv = totalPontoTv > 0 
                              ? (pontoTvWithinGoal / totalPontoTv) * 100 
                              : 0;
                              
                            const totalPontoFibra = pontoFibraWithinGoal + pontoFibraOutsideGoal;
                            const percentPontoFibra = totalPontoFibra > 0 
                              ? (pontoFibraWithinGoal / totalPontoFibra) * 100 
                              : 0;
                            
                            // Percentual geral
                            const percentWithinGoal = totalFinalized > 0 
                              ? (totalWithinGoal / totalFinalized) * 100 
                              : 0;
                            
                            // Só exibir técnicos que têm dados no período filtrado
                            if (totalFinalized === 0) return null;
                            
                            return {
                              name,
                              totalFinalized,
                              totalWithinGoal,
                              percentWithinGoal,
                              assistTvWithinGoal,
                              assistTvOutsideGoal,
                              percentAssistTv,
                              assistFibraWithinGoal,
                              assistFibraOutsideGoal,
                              percentAssistFibra,
                              pontoTvWithinGoal,
                              pontoTvOutsideGoal,
                              percentPontoTv,
                              pontoFibraWithinGoal,
                              pontoFibraOutsideGoal,
                              percentPontoFibra
                            };
                          })
                          .filter(Boolean)
                          .sort((a, b) => {
                            // Ordenar pelo percentual dentro da meta (maior primeiro)
                            const percentComparison = b.percentWithinGoal - a.percentWithinGoal;
                            
                            // Em caso de empate, ordenar pelo volume total de OS (maior primeiro)
                            if (percentComparison === 0) {
                              return b.totalFinalized - a.totalFinalized;
                            }
                            
                            return percentComparison;
                          })
                          .map((tech, index) => {
                            // Funções para colorir percentuais
                            const getMetaColor = (rate: number) => 
                              rate >= 75 ? "text-green-600 font-medium" : rate >= 50 ? "text-yellow-600 font-medium" : "text-red-600 font-medium";
                            
                            return (
                              <TableRow key={tech.name}>
                                <TableCell className="font-medium py-2">{tech.name}</TableCell>
                                <TableCell className="text-center py-2">{tech.totalFinalized}</TableCell>
                                <TableCell className={`text-center py-2 ${getMetaColor(tech.percentWithinGoal)}`}>
                                  {tech.percentWithinGoal.toFixed(2)}%
                                </TableCell>
                                
                                <TableCell className="text-center py-2">{tech.assistTvWithinGoal}</TableCell>
                                <TableCell className="text-center py-2">{tech.assistTvOutsideGoal}</TableCell>
                                <TableCell className={`text-center py-2 ${getMetaColor(tech.percentAssistTv)}`}>
                                  {tech.percentAssistTv.toFixed(2)}%
                                </TableCell>
                                
                                <TableCell className="text-center py-2">{tech.assistFibraWithinGoal}</TableCell>
                                <TableCell className="text-center py-2">{tech.assistFibraOutsideGoal}</TableCell>
                                <TableCell className={`text-center py-2 ${getMetaColor(tech.percentAssistFibra)}`}>
                                  {tech.percentAssistFibra.toFixed(2)}%
                                </TableCell>
                                
                                <TableCell className="text-center py-2">{tech.pontoTvWithinGoal}</TableCell>
                                <TableCell className="text-center py-2">{tech.pontoTvOutsideGoal}</TableCell>
                                <TableCell className={`text-center py-2 ${getMetaColor(tech.percentPontoTv)}`}>
                                  {tech.percentPontoTv.toFixed(2)}%
                                </TableCell>
                                
                                <TableCell className="text-center py-2">{tech.pontoFibraWithinGoal}</TableCell>
                                <TableCell className="text-center py-2">{tech.pontoFibraOutsideGoal}</TableCell>
                                <TableCell className={`text-center py-2 ${getMetaColor(tech.percentPontoFibra)}`}>
                                  {tech.percentPontoFibra.toFixed(2)}%
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        
                        {technicians.filter(name => name && filteredServiceOrdersByFinalization.some(o => o.nome_tecnico === name)).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={15} className="text-center py-2 text-muted-foreground">
                              Nenhum técnico encontrado no período selecionado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell className="font-bold text-left border-r border-muted">Total Geral</TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrdersByFinalization.filter(o => o.include_in_metrics).length}
                          </TableCell>
                          <TableCell className={`text-center font-medium ${
                            (() => {
                              const percentWithinGoal = filteredServiceOrdersByFinalization.filter(o => o.include_in_metrics).length > 0 
                                ? (filteredServiceOrdersByFinalization.filter(o => o.include_in_metrics && o.atingiu_meta === true).length / 
                                   filteredServiceOrdersByFinalization.filter(o => o.include_in_metrics).length) * 100 
                                : 0;
                              return percentWithinGoal >= 75 
                                ? "text-green-600" 
                                : percentWithinGoal >= 50 
                                  ? "text-yellow-600" 
                                  : "text-red-600";
                            })()
                          }`}>
                            {(() => {
                              const percentWithinGoal = filteredServiceOrdersByFinalization.filter(o => o.include_in_metrics).length > 0 
                                ? (filteredServiceOrdersByFinalization.filter(o => o.include_in_metrics && o.atingiu_meta === true).length / 
                                   filteredServiceOrdersByFinalization.filter(o => o.include_in_metrics).length) * 100 
                                : 0;
                              return percentWithinGoal.toFixed(2) + "%";
                            })()}
                          </TableCell>

                          {/* Assistência Técnica TV */}
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrdersByFinalization.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Assistência Técnica TV" && o.atingiu_meta === true && o.include_in_metrics;
                            }).length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrdersByFinalization.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Assistência Técnica TV" && o.atingiu_meta === false && o.include_in_metrics;
                            }).length}
                          </TableCell>
                          <TableCell className={`text-center font-medium ${
                            (() => {
                              const total = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Assistência Técnica TV" && o.include_in_metrics;
                              }).length;
                              
                              const within = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Assistência Técnica TV" && o.atingiu_meta === true && o.include_in_metrics;
                              }).length;
                              
                              const percent = total > 0 ? (within / total) * 100 : 0;
                              return percent >= 75 
                                ? "text-green-600" 
                                : percent >= 50 
                                  ? "text-yellow-600" 
                                  : "text-red-600";
                            })()
                          }`}>
                            {(() => {
                              const total = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Assistência Técnica TV" && o.include_in_metrics;
                              }).length;
                              
                              const within = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Assistência Técnica TV" && o.atingiu_meta === true && o.include_in_metrics;
                              }).length;
                              
                              const percent = total > 0 ? (within / total) * 100 : 0;
                              return percent.toFixed(2) + "%";
                            })()}
                          </TableCell>
                          
                          {/* Assistência Técnica Fibra */}
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrdersByFinalization.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Assistência Técnica FIBRA" && o.atingiu_meta === true && o.include_in_metrics;
                            }).length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrdersByFinalization.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Assistência Técnica FIBRA" && o.atingiu_meta === false && o.include_in_metrics;
                            }).length}
                          </TableCell>
                          <TableCell className={`text-center font-medium ${
                            (() => {
                              const total = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Assistência Técnica FIBRA" && o.include_in_metrics;
                              }).length;
                              
                              const within = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Assistência Técnica FIBRA" && o.atingiu_meta === true && o.include_in_metrics;
                              }).length;
                              
                              const percent = total > 0 ? (within / total) * 100 : 0;
                              return percent >= 75 
                                ? "text-green-600" 
                                : percent >= 50 
                                  ? "text-yellow-600" 
                                  : "text-red-600";
                            })()
                          }`}>
                            {(() => {
                              const total = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Assistência Técnica FIBRA" && o.include_in_metrics;
                              }).length;
                              
                              const within = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Assistência Técnica FIBRA" && o.atingiu_meta === true && o.include_in_metrics;
                              }).length;
                              
                              const percent = total > 0 ? (within / total) * 100 : 0;
                              return percent.toFixed(2) + "%";
                            })()}
                          </TableCell>
                          
                          {/* Ponto Principal TV */}
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrdersByFinalization.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Ponto Principal TV" && o.atingiu_meta === true && o.include_in_metrics;
                            }).length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrdersByFinalization.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Ponto Principal TV" && o.atingiu_meta === false && o.include_in_metrics;
                            }).length}
                          </TableCell>
                          <TableCell className={`text-center font-medium ${
                            (() => {
                              const total = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Ponto Principal TV" && o.include_in_metrics;
                              }).length;
                              
                              const within = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Ponto Principal TV" && o.atingiu_meta === true && o.include_in_metrics;
                              }).length;
                              
                              const percent = total > 0 ? (within / total) * 100 : 0;
                              return percent >= 75 
                                ? "text-green-600" 
                                : percent >= 50 
                                  ? "text-yellow-600" 
                                  : "text-red-600";
                            })()
                          }`}>
                            {(() => {
                              const total = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Ponto Principal TV" && o.include_in_metrics;
                              }).length;
                              
                              const within = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Ponto Principal TV" && o.atingiu_meta === true && o.include_in_metrics;
                              }).length;
                              
                              const percent = total > 0 ? (within / total) * 100 : 0;
                              return percent.toFixed(2) + "%";
                            })()}
                          </TableCell>
                          
                          {/* Ponto Principal Fibra */}
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrdersByFinalization.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Ponto Principal FIBRA" && o.atingiu_meta === true && o.include_in_metrics;
                            }).length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrdersByFinalization.filter(o => {
                              const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                              return category === "Ponto Principal FIBRA" && o.atingiu_meta === false && o.include_in_metrics;
                            }).length}
                          </TableCell>
                          <TableCell className={`text-center font-medium ${
                            (() => {
                              const total = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Ponto Principal FIBRA" && o.include_in_metrics;
                              }).length;
                              
                              const within = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Ponto Principal FIBRA" && o.atingiu_meta === true && o.include_in_metrics;
                              }).length;
                              
                              const percent = total > 0 ? (within / total) * 100 : 0;
                              return percent >= 75 
                                ? "text-green-600" 
                                : percent >= 50 
                                  ? "text-yellow-600" 
                                  : "text-red-600";
                            })()
                          }`}>
                            {(() => {
                              const total = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Ponto Principal FIBRA" && o.include_in_metrics;
                              }).length;
                              
                              const within = filteredServiceOrdersByFinalization.filter(o => {
                                const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                return category === "Ponto Principal FIBRA" && o.atingiu_meta === true && o.include_in_metrics;
                              }).length;
                              
                              const percent = total > 0 ? (within / total) * 100 : 0;
                              return percent.toFixed(2) + "%";
                            })()}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              
              {/* Quantidade de Serviços por Técnico */}
              <Card className="col-span-1 md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Quantidade de Serviços por Técnico
                  </CardTitle>
                  <CardDescription>
                    Total de serviços realizados por cada técnico por tipo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead rowSpan={2} className="align-middle text-left border-r border-muted">Técnico</TableHead>
                          <TableHead className="text-center border-b border-muted" colSpan={12}>Tipo de Serviço</TableHead>
                          <TableHead rowSpan={2} className="align-middle text-center font-bold border-l border-muted">Total</TableHead>
                        </TableRow>
                        <TableRow>
                          <TableHead className="text-center py-1">Corretiva</TableHead>
                          <TableHead className="text-center py-1">Corr.<br/>BL</TableHead>
                          <TableHead className="text-center py-1">Ponto<br/>Princ.</TableHead>
                          <TableHead className="text-center py-1">Ponto<br/>Princ. BL</TableHead>
                          <TableHead className="text-center py-1">Prest.<br/>Serviço</TableHead>
                          <TableHead className="text-center py-1">Prest.<br/>Serviço BL</TableHead>
                          <TableHead className="text-center py-1">Prev.</TableHead>
                          <TableHead className="text-center py-1">Prev.<br/>BL</TableHead>
                          <TableHead className="text-center py-1">Sist.<br/>Opc.</TableHead>
                          <TableHead className="text-center py-1">Canc.<br/>Vol.</TableHead>
                          <TableHead className="text-center py-1">Kit<br/>TVRO</TableHead>
                          <TableHead className="text-center py-1">Substituição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {technicians
                          .filter(name => name) // Filtrar nomes vazios
                          .sort((a, b) => {
                            const aOrders = filteredServiceOrders.filter(o => o.nome_tecnico === a && o.status !== "Cancelada").length;
                            const bOrders = filteredServiceOrders.filter(o => o.nome_tecnico === b && o.status !== "Cancelada").length;
                            return bOrders - aOrders; // Ordenar por quantidade de serviços (decrescente)
                          })
                          .map(name => {
                            // Filtrar ordens canceladas
                            const techOrders = filteredServiceOrders.filter(o => o.nome_tecnico === name && o.status !== "Cancelada");
                            const totalOrders = techOrders.length;
                            
                            // Só exibir técnicos que têm dados no período filtrado
                            if (totalOrders === 0) return null;
                            
                            // Contar serviços por tipo
                            const servicesByType = {
                              'Corretiva': techOrders.filter(o => o.subtipo_servico?.includes('Corretiva') && !o.subtipo_servico?.includes('BL')).length,
                              'Corretiva BL': techOrders.filter(o => o.subtipo_servico?.includes('Corretiva BL')).length,
                              'Ponto Principal': techOrders.filter(o => o.subtipo_servico?.includes('Ponto Principal') && !o.subtipo_servico?.includes('BL')).length,
                              'Ponto Principal BL': techOrders.filter(o => o.subtipo_servico?.includes('Ponto Principal BL')).length,
                              'Prestação de Serviço': techOrders.filter(o => o.subtipo_servico?.includes('Prestação de Serviço') && !o.subtipo_servico?.includes('BL')).length,
                              'Prestação de Serviço BL': techOrders.filter(o => o.subtipo_servico?.includes('Prestação de Serviço BL')).length,
                              'Preventiva': techOrders.filter(o => o.subtipo_servico?.includes('Preventiva') && !o.subtipo_servico?.includes('BL')).length,
                              'Preventiva BL': techOrders.filter(o => o.subtipo_servico?.includes('Preventiva BL')).length,
                              'Sistema Opcional': techOrders.filter(o => o.subtipo_servico?.includes('Sistema Opcional')).length,
                              'Cancelamento Voluntário': techOrders.filter(o => o.subtipo_servico?.includes('Cancelamento Voluntário')).length,
                              'Kit TVRO': techOrders.filter(o => o.subtipo_servico?.includes('Kit TVRO')).length,
                              'Substituição': techOrders.filter(o => o.subtipo_servico?.includes('Substituição')).length,
                            };

                            return (
                              <TableRow key={name} className="hover:bg-muted/50">
                                <TableCell className="font-medium text-left border-r border-muted">{name}</TableCell>
                                <TableCell className="text-center">{servicesByType['Corretiva']}</TableCell>
                                <TableCell className="text-center">{servicesByType['Corretiva BL']}</TableCell>
                                <TableCell className="text-center">{servicesByType['Ponto Principal']}</TableCell>
                                <TableCell className="text-center">{servicesByType['Ponto Principal BL']}</TableCell>
                                <TableCell className="text-center">{servicesByType['Prestação de Serviço']}</TableCell>
                                <TableCell className="text-center">{servicesByType['Prestação de Serviço BL']}</TableCell>
                                <TableCell className="text-center">{servicesByType['Preventiva']}</TableCell>
                                <TableCell className="text-center">{servicesByType['Preventiva BL']}</TableCell>
                                <TableCell className="text-center">{servicesByType['Sistema Opcional']}</TableCell>
                                <TableCell className="text-center">{servicesByType['Cancelamento Voluntário']}</TableCell>
                                <TableCell className="text-center">{servicesByType['Kit TVRO']}</TableCell>
                                <TableCell className="text-center">{servicesByType['Substituição']}</TableCell>
                                <TableCell className="text-center font-bold border-l border-muted">{totalOrders}</TableCell>
                              </TableRow>
                            );
                        }).filter(Boolean)}
                        
                        {technicians.filter(name => name && filteredServiceOrders.some(o => o.nome_tecnico === name)).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={14} className="text-center py-4 text-muted-foreground">
                              Nenhum técnico encontrado no período selecionado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell className="font-bold text-left border-r border-muted">Total Geral</TableCell>
                          <TableCell className="text-center">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Corretiva') && !o.subtipo_servico?.includes('BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Corretiva BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Ponto Principal') && !o.subtipo_servico?.includes('BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Ponto Principal BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Prestação de Serviço') && !o.subtipo_servico?.includes('BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Prestação de Serviço BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Preventiva') && !o.subtipo_servico?.includes('BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Preventiva BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Sistema Opcional') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Cancelamento Voluntário') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Kit TVRO') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Substituição') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center font-bold border-l border-muted">
                            {filteredServiceOrders.filter(o => o.status !== "Cancelada").length}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <div className="text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Nenhum técnico encontrado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Importe dados para visualizar métricas por técnico
              </p>
            </div>
          </div>
        )}
      </TabsContent>
      
      {/* Users Management Tab */}
      <TabsContent value="users" className="space-y-4">
                    <UserManagement getSetting={getSetting} updateSetting={updateSetting} />
      </TabsContent>
      
      {/* Payments Management Tab */}
      <TabsContent value="payments" className="space-y-4">
        <PaymentsManagement />
      </TabsContent>
      
      {/* Import Data Tab */}
      <TabsContent value="import" className="space-y-4">
        <ImportData />
    </TabsContent>
  </Tabs>
    
    {/* Mostrar a tabela de ordens de serviço apenas para as guias principais quando um filtro está aplicado */}
    {activeTab !== "users" && activeTab !== "import" && activeTab !== "reopening" && activeTab !== "technicians" && activeTab !== "vendedor" && activeTab !== "permanencia" && activeTab !== "indicadores" && showData && (
      <div className="mt-6">
        <ServiceOrderTable filteredOrders={filteredServiceOrders} />
      </div>
    )}
  </>
);
}

// Helper functions
function getServiceGoal(serviceType: string): number {
  const goals: Record<string, number> = {
    'Ponto Principal TV': 62.983333, // 62h 59min
    'Ponto Principal Fibra': 62.983333, // 62h 59min
    'Ponto Principal FIBRA': 62.983333, // 62h 59min
    'Ponto Principal': 62.983333, // 62h 59min
    'Ponto Principal BL': 62.983333, // 62h 59min
    'Assistência Técnica Fibra': 38.983333, // 38h 59min
    'Assistência Técnica FIBRA': 38.983333, // 38h 59min
    'Assistência Técnica TV': 38.983333, // 38h 59min
    'Corretiva': 38.983333, // 38h 59min (Assistência Técnica TV)
    'Corretiva BL': 38.983333, // 38h 59min (Assistência Técnica FIBRA)
    'Preventiva BL': 48, // Mantendo valor original
    'Prestação de Serviço': 48, // Mantendo valor original
    'Prestação de Serviço BL': 48 // Mantendo valor original
  };
  
  const goal = goals[serviceType] || 48;
      // console.log(`[DEBUG] Meta para tipo "${serviceType}": ${goal} horas`);
  return goal;
}

function getMostCommonServiceType(orders: ServiceOrder[]): string {
  if (orders.length === 0) return "N/A";
  
  const typeCounts: Record<string, number> = {};
  
  orders.forEach(order => {
    const type = order.subtipo_servico || order.tipo_servico;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  
  return Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
}

// MessageConfiguration component
function MessageConfiguration({ 
  getSetting, 
  updateSetting 
}: { 
  getSetting: (key: string, defaultValue?: string) => string;
  updateSetting: (key: string, value: string) => Promise<boolean>;
}) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [tempMessage, setTempMessage] = useState("");
  const { toast } = useToast();

  const currentMessage = getSetting('header_message', '⚠️ Novas atualizações em breve');

  const handleEdit = () => {
    setTempMessage(currentMessage);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (tempMessage.trim()) {
      const success = await updateSetting('header_message', tempMessage.trim());
      if (success) {
        setIsEditing(false);
      }
    }
  };

  const handleCancel = () => {
    setTempMessage("");
    setIsEditing(false);
  };

  const handleReset = async () => {
    const defaultMessage = "⚠️ Novas atualizações em breve";
    await updateSetting('header_message', defaultMessage);
  };

  // Verificar se o usuário atual tem permissão de administrador
  if (!user || user.role !== 'admin') {
    return null; // Não mostrar para usuários não-admin
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="mr-2 h-5 w-5" />
          Configurar Mensagem de Atualização
        </CardTitle>
        <CardDescription>
          Personalize a mensagem que aparece na barra de alerta no topo da página
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview da mensagem atual */}
                    <div className="bg-yellow-400 text-sysgest-blue px-4 py-2 rounded-lg">
              <span className="text-sm font-medium">{currentMessage}</span>
        </div>

        {!isEditing ? (
          <div className="flex gap-2">
            <Button onClick={handleEdit} className="bg-sysgest-blue hover:bg-sysgest-teal">
              <Pencil className="mr-2 h-4 w-4" />
              Editar Mensagem
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Restaurar Padrão
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="message">Editar Mensagem</Label>
              <Input
                id="message"
                value={tempMessage}
                onChange={(e) => setTempMessage(e.target.value)}
                placeholder="Digite a nova mensagem..."
                maxLength={100}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Caracteres: {tempMessage.length}/100 (recomendado: até 100 caracteres)
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// UserManagement component
function UserManagement({ 
  getSetting, 
  updateSetting 
}: { 
  getSetting: (key: string, defaultValue?: string) => string;
  updateSetting: (key: string, value: string) => Promise<boolean>;
}) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const { toast } = useToast();
  
  // Definir a função loadUsers com useCallback para evitar recriação
  const loadUsers = useCallback(async () => {
    try {
      // Buscar usuários do Supabase
      const { data: supabaseUsers, error } = await supabase
        .from('users')
        .select('*');
      
      if (error) {
        console.error('Erro ao carregar usuários:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar usuários",
          description: "Não foi possível carregar a lista de usuários do servidor."
        });
        return;
      }
      
      // Mapear para o formato esperado pelo frontend
      const mappedUsers = supabaseUsers.map((u: Record<string, unknown>) => ({
        id: u.id as string,
        username: (u.username as string) || '',
        name: (u.name as string) || '',
        email: (u.email as string) || '',
        role: ((u.role as string) || 'user') as 'admin' | 'user',
        empresa: (u.empresa as string) || 'SysGest Insight',
        data_adesao: (u.data_adesao as string) || new Date().toISOString(),
        acesso_liberado: u.acesso_liberado === undefined ? true : Boolean(u.acesso_liberado)
      }));
      
      setUsers(mappedUsers);
    } catch (err) {
      console.error('Erro ao processar usuários:', err);
    }
  }, [toast]);
  
  // Carregar usuários do Supabase ao montar o componente
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  
  // Filtrar usuários pela empresa do usuário logado (apenas para usuários não-admin)
  const filteredUsers = useMemo(() => {
    if (user?.role === 'admin') {
      // Administradores podem ver todos os usuários
      return users;
    } else {
      // Usuários normais só podem ver da mesma empresa
      return users.filter(u => u.empresa === user?.empresa);
    }
  }, [users, user]);
  
  // Verificar se o usuário atual tem permissão de administrador
  if (!user || user.role !== 'admin') {
    return (
      <Card className="w-full h-64">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <UserCog className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Acesso Restrito</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Você precisa ter permissões de administrador para acessar esta área.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Funções para gerenciamento de usuários
  const handleSaveUser = async () => {
    if (editingUser) {
      try {
        // Atualizando usuário existente no Supabase
        const updateData: Omit<User, 'id' | 'sessionId' | 'password'> = {
          username: editingUser.username,
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
          empresa: editingUser.empresa,
          acesso_liberado: editingUser.acesso_liberado
        };
        
        // Atualizar na tabela public.users
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id);
          
        if (error) {
          console.error('Erro ao atualizar usuário:', error);
          toast({
            variant: "destructive",
            title: "Erro ao atualizar usuário",
            description: "Não foi possível salvar as alterações no servidor."
          });
          return;
        }
        
        // Atualizar a lista local
        const updatedUsers = users.map(u => {
          if (u.id === editingUser.id) {
            const updatedUser = {...editingUser};
            return updatedUser;
          }
          return u;
        });
        
        setUsers(updatedUsers);
        setEditingUser(null);
        
        toast({
          title: "Usuário atualizado",
          description: "As alterações do usuário foram salvas com sucesso."
        });
      } catch (err) {
        console.error('Erro ao processar atualização do usuário:', err);
        toast({
          variant: "destructive",
          title: "Erro inesperado",
          description: "Ocorreu um erro ao processar a atualização do usuário."
        });
      }
    }
  };
  
  // Resetar os estados quando um usuário for selecionado para edição
  const handleEditUser = (selectedUser: User) => {
    setEditingUser(selectedUser);
  };
  
  // Renderizar o componente com tabela de usuários e formulário
  return (
    <div className="space-y-6">
      {/* Configuração de Mensagem de Atualização */}
      <MessageConfiguration getSetting={getSetting} updateSetting={updateSetting} />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Gerenciamento de Usuários
          </CardTitle>
          <CardDescription>
            Gerencie os usuários que podem acessar o sistema.
          </CardDescription>
          {user?.empresa && (
            <div className="mt-2">
              <Badge variant="outline">
                Empresa: {user.empresa}
              </Badge>
            </div>
          )}
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsCreateUserOpen(true)}
              className="bg-sysgest-blue text-white hover:bg-sysgest-teal"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Criar Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Data de Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.empresa}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.data_adesao ? new Date(user.data_adesao).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={user.acesso_liberado ? 'default' : 'destructive'} className={user.acesso_liberado ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                        {user.acesso_liberado ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                  <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:bg-blue-100"
                        title="Editar usuário"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                  </TableCell>
                </TableRow>
              ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      
      {editingUser && (
        <Card>
          <CardHeader>
            <CardTitle>
              Editar Usuário: {editingUser.username}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Usuário
                </Label>
                <Input
                  id="username"
                  value={editingUser.username}
                  onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="name"
                  value={editingUser.name}
                  onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="empresa" className="text-right">
                  Empresa
                </Label>
                <Input
                  id="empresa"
                  value={editingUser.empresa}
                  onChange={e => setEditingUser({...editingUser, empresa: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Perfil
                </Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value: 'admin' | 'user') => setEditingUser({...editingUser, role: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="acesso" className="text-right">
                  Status de Acesso
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Switch 
                    id="acesso"
                    checked={editingUser.acesso_liberado}
                    onCheckedChange={(checked) => 
                      setEditingUser({...editingUser, acesso_liberado: checked})
                    }
                  />
                  <Label htmlFor="acesso" className="cursor-pointer">
                    {editingUser.acesso_liberado ? 'Ativo' : 'Inativo'}
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                setEditingUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} className="bg-green-600 hover:bg-green-700">
              Salvar Alterações
            </Button>
          </CardFooter>
        </Card>
      )}
      
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para criar um novo usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="px-1">
            <RegisterForm onRegisterSuccess={() => {
              // Atualizar a lista de usuários após o registro bem-sucedido
              setIsCreateUserOpen(false);
              loadUsers();
            }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// PaymentsManagement component
function PaymentsManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [userToUpdate, setUserToUpdate] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Definir a função loadUsers com useCallback para evitar recriação
  const loadUsers = useCallback(async () => {
    try {
      // Buscar usuários do Supabase
      const { data: supabaseUsers, error } = await supabase
        .from('users')
        .select('*');
      
      if (error) {
        console.error('Erro ao carregar usuários:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar usuários",
          description: "Não foi possível carregar a lista de usuários do servidor."
        });
        return;
      }
      
      // Mapear para o formato esperado pelo frontend
      const mappedUsers = supabaseUsers.map((u: Record<string, unknown>) => ({
        id: u.id as string,
        username: (u.username as string) || '',
        name: (u.name as string) || '',
        email: (u.email as string) || '',
        role: ((u.role as string) || 'user') as 'admin' | 'user',
        empresa: (u.empresa as string) || 'SysGest Insight',
        data_adesao: (u.data_adesao as string) || new Date().toISOString(),
        acesso_liberado: u.acesso_liberado === undefined ? true : Boolean(u.acesso_liberado)
      }));
      
      setUsers(mappedUsers);
    } catch (err) {
      console.error('Erro ao processar usuários:', err);
    }
  }, [toast]);
  
  // Carregar usuários do Supabase ao montar o componente
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  
  // Verificar se o usuário atual tem permissão de administrador
  if (!user || user.role !== 'admin') {
    return (
      <Card className="w-full h-64">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <CreditCard className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Acesso Restrito</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Você precisa ter permissões de administrador para acessar esta área.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const handleRenewSubscription = (userId: string) => {
    // Definir sempre uma data inicial (hoje) ao abrir o diálogo para melhorar UX
    const today = new Date();
    setSelectedDate(today);
    
    // Atraso pequeno para evitar conflito de eventos
    setTimeout(() => {
      setUserToUpdate(userId);
    }, 50);
  };
  
  const confirmDateSelection = async () => {
    if (!userToUpdate || !selectedDate) return;
    
    try {
      // Atualizar a data de pagamento no Supabase
      const { error } = await supabase
        .from('users')
        .update({ data_adesao: selectedDate.toISOString() })
        .eq('id', userToUpdate);
        
      if (error) {
        console.error('Erro ao atualizar data de pagamento:', error);
        toast({
          variant: "destructive",
          title: "Erro na atualização",
          description: "Não foi possível atualizar a data de pagamento do usuário."
        });
        return;
      }
      
      // Atualizar a lista local
      const updatedUsers = users.map(u => {
        if (u.id === userToUpdate) {
          return {
            ...u,
            data_adesao: selectedDate.toISOString()
          };
        }
        return u;
      });
      
      setUsers(updatedUsers);
      setUserToUpdate(null);
      
      toast({
        title: "Data atualizada",
        description: "A data de pagamento foi atualizada com sucesso."
      });
    } catch (err) {
      console.error('Erro ao processar atualização de data:', err);
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Ocorreu um erro ao tentar atualizar a data de pagamento."
      });
    }
  };
  
  const toggleAccess = async (userId: string) => {
    try {
      // Obter o usuário atual para inverter seu estado de acesso
      const userToToggle = users.find(u => u.id === userId);
      if (!userToToggle) return;
      
      const newAccessState = !userToToggle.acesso_liberado;
      
      // Atualizar no Supabase
      const { error } = await supabase
        .from('users')
        .update({ acesso_liberado: newAccessState })
        .eq('id', userId);
        
      if (error) {
        console.error('Erro ao alterar estado de acesso:', error);
        toast({
          variant: "destructive",
          title: "Erro ao atualizar acesso",
          description: "Não foi possível alterar o estado de acesso do usuário."
        });
        return;
      }
      
      // Atualizar a lista local
      const updatedUsers = users.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            acesso_liberado: newAccessState
          };
        }
        return u;
      });
      
      setUsers(updatedUsers);
      
      toast({
        title: newAccessState ? "Acesso liberado" : "Acesso pausado",
        description: `O acesso do usuário foi ${newAccessState ? 'liberado' : 'pausado'} com sucesso.`
      });
    } catch (err) {
      console.error('Erro ao processar alteração de acesso:', err);
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Ocorreu um erro ao tentar alterar o acesso do usuário."
      });
    }
  };
  
  const getNextDueDate = (paymentDate: string) => {
    const date = new Date(paymentDate);
    date.setDate(date.getDate() + 30);
    return date;
  };
  
  const getStatus = (paymentDate: string) => {
    if (!paymentDate) return "Vencido";
    
    const dueDate = getNextDueDate(paymentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate.getTime() > today.getTime()) {
      return "Em dia";
    } else if (
      dueDate.getDate() === today.getDate() &&
      dueDate.getMonth() === today.getMonth() &&
      dueDate.getFullYear() === today.getFullYear()
    ) {
      return "Aberto";
    } else {
      return "Vencido";
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Em dia":
        return "text-green-600";
      case "Aberto":
        return "text-yellow-600";
      case "Vencido":
        return "text-red-600";
      default:
        return "";
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Pagamentos</CardTitle>
          <CardDescription>
            Gerencie os pagamentos e o acesso dos usuários ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Cliente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Data de Pagamento</TableHead>
                <TableHead>Próximo Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => {
                const status = getStatus(user.data_adesao || '');
                const statusColor = getStatusColor(status);
                
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{formatDate(user.data_adesao || '')}</TableCell>
                    <TableCell>{formatDate(getNextDueDate(user.data_adesao || '').toISOString())}</TableCell>
                    <TableCell>
                      <span className={statusColor + " font-medium"}>
                        {status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.acesso_liberado ? (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                          Pausado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRenewSubscription(user.id)}
                          className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 whitespace-nowrap px-2 mr-1"
                        >
                          <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                          Data de Pagamento
                        </Button>
                        <Button 
                          variant={user.acesso_liberado ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleAccess(user.id)}
                        >
                          {user.acesso_liberado ? 'Pausar Acesso' : 'Reativar Acesso'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {userToUpdate && (
        <Dialog open={!!userToUpdate} onOpenChange={(open) => {
          if (!open) setUserToUpdate(null);
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Atualizar Data de Pagamento</DialogTitle>
              <DialogDescription>
                Selecione a nova data de pagamento para o usuário.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label>Nova Data de Pagamento</Label>
                <div className="border rounded-md p-2 bg-white">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date)}
                    initialFocus
                    className="mx-auto"
                  />
                </div>
                <div className="mt-2 text-center">
                  {selectedDate ? (
                    <p className="text-sm text-muted-foreground">
                      Data selecionada: <strong>{formatDate(selectedDate.toISOString())}</strong>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Selecione uma data no calendário acima
                    </p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setUserToUpdate(null)}
                type="button"
              >
                Cancelar
              </Button>
              <Button 
                onClick={confirmDateSelection} 
                disabled={!selectedDate}
                type="button"
                className="bg-green-600 hover:bg-green-700"
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ImportData component
function ImportData() {
  const { importServiceOrders, importVendas, importPrimeirosPagamentos, importMetas, importVendasMeta, importBaseData } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importType, setImportType] = useState<'pagamentos' | 'metas' | 'servicos-base'>('pagamentos');
  const { toast } = useToast();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
      if (!validTypes.includes(selectedFile.type)) {
        setError("Formato de arquivo inválido. Use .xlsx ou .csv");
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Nenhum arquivo selecionado");
      return;
    }

    setProcessing(true);
    setProgress(10);
    
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          setProgress(50);
          
          const binary = e.target?.result;
          const workbook = XLSX.read(binary, { type: 'binary', cellDates: true });
          
          // Para importação de metas, processar as 3 planilhas separadas
          if (importType === 'metas') {
            const sheetNames = workbook.SheetNames;
            // Log otimizado - só durante desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log("Planilhas encontradas:", sheetNames);
      }
            
            // Verificar se as 3 planilhas necessárias existem
            const requiredSheets = ['VENDAS PERMANENCIA', 'VENDAS META', 'METAS'];
            const missingSheets = requiredSheets.filter(sheet => !sheetNames.includes(sheet));
            
            if (missingSheets.length > 0) {
              throw new Error(`Planilhas obrigatórias não encontradas: ${missingSheets.join(', ')}. As planilhas devem se chamar: ${requiredSheets.join(', ')}`);
            }
            
            // Processar as 3 planilhas
            const vendasPermanenciaSheet = workbook.Sheets['VENDAS PERMANENCIA'];
            const vendasMetaSheet = workbook.Sheets['VENDAS META'];
            const metasSheet = workbook.Sheets['METAS'];
            
            const vendasPermanenciaData = XLSX.utils.sheet_to_json(vendasPermanenciaSheet);
            const vendasMetaData = XLSX.utils.sheet_to_json(vendasMetaSheet);
            const metasData = XLSX.utils.sheet_to_json(metasSheet);
            
            // Log otimizado
          if (process.env.NODE_ENV === 'development') {
            console.log(`Processando planilhas - Vendas Permanência: ${vendasPermanenciaData.length}, Vendas Meta: ${vendasMetaData.length}, Metas: ${metasData.length}`);
          }
            
            if (vendasPermanenciaData.length === 0 && vendasMetaData.length === 0 && metasData.length === 0) {
              setError("Todas as planilhas parecem estar vazias");
              setProcessing(false);
              setProgress(0);
              return;
            }
            
            // Processar e importar cada tipo de dado
            try {
              let novasVendasPermanencia = 0;
              let novasVendasMeta = 0;
              let novasMetas = 0;
              
              // Processar vendas de permanência (usando a função existente)
              if (vendasPermanenciaData.length > 0) {
                const processedVendasPermanencia = processVendas(vendasPermanenciaData as Record<string, unknown>[]);
                const result = importVendas(processedVendasPermanencia, true);
                novasVendasPermanencia = result.newRecords;
                if (process.env.NODE_ENV === 'development') {
              console.log(`Importadas ${result.newRecords} novas vendas de permanência`);
            }
              }
              
              // Processar vendas de meta
              if (vendasMetaData.length > 0) {
                const processedVendasMeta = processVendasMeta(vendasMetaData as Record<string, unknown>[]);
                const result = importVendasMeta(processedVendasMeta, true);
                novasVendasMeta = result.newRecords;
                if (process.env.NODE_ENV === 'development') {
              console.log(`Importadas ${result.newRecords} novas vendas de meta`);
            }
              }
              
              // Processar metas
              if (metasData.length > 0) {
                const processedMetas = processMetas(metasData as Record<string, unknown>[]);
                const result = importMetas(processedMetas, true);
                novasMetas = result.newRecords;
                if (process.env.NODE_ENV === 'development') {
              console.log(`Importadas ${result.newRecords} novas metas`);
            }
              }
              
              // Criar descrição detalhada
              const detalhes = [];
              if (novasVendasPermanencia > 0) {
                detalhes.push(`${novasVendasPermanencia} Novas vendas de permanência`);
              }
              if (novasVendasMeta > 0) {
                detalhes.push(`${novasVendasMeta} Novas vendas de meta`);
              }
              if (novasMetas > 0) {
                detalhes.push(`${novasMetas} Nova${novasMetas > 1 ? 's' : ''} meta${novasMetas > 1 ? 's' : ''}`);
              }
              
              const totalNovos = novasVendasPermanencia + novasVendasMeta + novasMetas;
              
              toast({
                title: "Importação de Metas concluída",
                description: totalNovos > 0 
                  ? `Foram adicionadas:\n${detalhes.join('\n')}`
                  : "Nenhum novo registro foi adicionado (todos já existiam)."
              });
              
              setProgress(100);
              setFile(null);
              setProcessing(false);
              return;
            } catch (processError) {
              console.error('Erro no processamento das planilhas de metas:', processError);
              setError(processError instanceof Error ? processError.message : "Erro ao processar as planilhas de metas");
              setProcessing(false);
              setProgress(0);
              return;
            }
          }
          
          // Para importação de serviços + BASE, processar as 2 planilhas separadas
          if (importType === 'servicos-base') {
            const sheetNames = workbook.SheetNames;
            console.log("[ImportData] Planilhas encontradas:", sheetNames);
            
            // Detectar abas automaticamente
            let servicosSheet: string | null = null;
            let baseSheet: string | null = null;
            
            // Detectar aba de serviços (primeira aba ou aba com nome relacionado)
            if (sheetNames.length > 0) {
              servicosSheet = sheetNames[0]; // Por padrão, primeira aba
              
              // Procurar por nomes mais específicos
              const servicosPatterns = ['serviço', 'servico', 'os', 'ordem', 'service'];
              for (const pattern of servicosPatterns) {
                const found = sheetNames.find(name => 
                  name.toLowerCase().includes(pattern.toLowerCase())
                );
                if (found) {
                  servicosSheet = found;
                  break;
                }
              }
            }
            
            // Detectar aba BASE
            const basePatterns = ['base', 'BASE'];
            for (const pattern of basePatterns) {
              const found = sheetNames.find(name => 
                name.toLowerCase().includes(pattern.toLowerCase())
              );
              if (found) {
                baseSheet = found;
                break;
              }
            }
            
            console.log("[ImportData] Abas detectadas:", { servicos: servicosSheet, base: baseSheet });
            
            if (!servicosSheet && !baseSheet) {
              throw new Error("Nenhuma aba de serviços ou BASE foi encontrada. Verifique se o arquivo contém as abas corretas.");
            }
            
            let processedServiceOrders = 0;
            let processedBaseData = 0;
            let totalProcessedServices = 0;
            let totalProcessedBase = 0;
            let hasValidData = false;
            
            // Processar aba de serviços
            if (servicosSheet) {
              const servicosWorksheet = workbook.Sheets[servicosSheet];
              const servicosJsonData = XLSX.utils.sheet_to_json(servicosWorksheet, { defval: null, raw: false });
              
              if (servicosJsonData && servicosJsonData.length > 0) {
                console.log("[ImportData] Processando", servicosJsonData.length, "registros de serviços");
                try {
                  const processedServices = processData(servicosJsonData as Record<string, unknown>[]);
                  const result = importServiceOrders(processedServices, true);
                  processedServiceOrders = result.newRecords;
                  totalProcessedServices = result.totalProcessed;
                  hasValidData = true;
                  console.log(`[ImportData] Serviços: ${result.totalProcessed} processados, ${result.newRecords} novos, ${result.duplicatesIgnored} duplicados`);
                } catch (serviceError) {
                  console.warn("[ImportData] Erro ao processar serviços:", serviceError);
                  // Continuar processamento mesmo se houver erro nos serviços
                }
              }
            }
            
            // Processar aba BASE
            if (baseSheet) {
              const baseWorksheet = workbook.Sheets[baseSheet];
              const baseJsonData = XLSX.utils.sheet_to_json(baseWorksheet, { defval: null, raw: false });
              
              if (baseJsonData && baseJsonData.length > 0) {
                console.log("[ImportData] Processando", baseJsonData.length, "registros BASE");
                try {
                  const processedBase = processBaseData(baseJsonData as Record<string, unknown>[]);
                  const result = importBaseData(processedBase, true);
                  processedBaseData = result.newRecords;
                  totalProcessedBase = result.totalProcessed;
                  hasValidData = true;
                  console.log(`[ImportData] BASE: ${result.totalProcessed} processados, ${result.newRecords} novos, ${result.duplicatesIgnored} duplicados`);
                } catch (baseError) {
                  console.warn("[ImportData] Erro ao processar BASE:", baseError);
                  // Continuar mesmo se houver erro no BASE
                }
              }
            }
            
            // Verificar se pelo menos algum dado foi encontrado e processado
            if (!hasValidData) {
              throw new Error("Nenhum dado válido encontrado nas abas processadas. Verifique se as abas contêm dados ou se os campos obrigatórios estão presentes.");
            }
            
            // Se dados foram processados mas nenhum é novo, mostrar mensagem informativa
            if (processedServiceOrders === 0 && processedBaseData === 0 && (totalProcessedServices > 0 || totalProcessedBase > 0)) {
              toast({
                title: "Importação de Serviços e Base concluída!",
                description: "Nenhum novo registro foi adicionado (todos já existiam).",
                variant: "default"
              });
              
              setProgress(100);
              setFile(null);
              setProcessing(false);
              return;
            }
            
            // Mensagem de sucesso baseada nos dados processados
            const detalhes = [];
            if (processedServiceOrders > 0) {
              detalhes.push(`${processedServiceOrders} Nova${processedServiceOrders > 1 ? 's' : ''} ordem${processedServiceOrders > 1 ? 's' : ''} de serviço`);
            }
            if (processedBaseData > 0) {
              detalhes.push(`${processedBaseData} Novo${processedBaseData > 1 ? 's' : ''} registro${processedBaseData > 1 ? 's' : ''} BASE`);
            }
            
            const totalNovos = processedServiceOrders + processedBaseData;
            
            toast({
              title: "Importação de Serviços + BASE concluída",
              description: totalNovos > 0 
                ? `Foram adicionados:\n${detalhes.join('\n')}`
                : "Nenhum novo registro foi adicionado (todos já existiam)."
            });
            
            setProgress(100);
            setFile(null);
            setProcessing(false);
            return;
          }
          
          // Para outros tipos de importação, usar o processamento padrão (uma planilha)
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          
          // Converte os dados da planilha para um formato amigável
          const data = XLSX.utils.sheet_to_json(sheet);
          
          setProgress(75);
          // Log otimizado
    if (process.env.NODE_ENV === 'development') {
      console.log(`Processando ${data.length} linhas da planilha`);
    }
          
          if (data.length === 0) {
            setError("A planilha parece estar vazia");
            setProcessing(false);
            setProgress(0);
            return;
          }
          
          try {
            // Processar dados conforme o tipo de importação selecionado
            if (importType === 'pagamentos') {
              // Processamento para pagamentos
              const processedPagamentos = processPagamentos(data as Record<string, unknown>[], toast);
              const result = importPrimeirosPagamentos(processedPagamentos, true);
              
              toast({
                title: "Importação concluída",
                description: result.newRecords > 0
                  ? `Foram adicionados ${result.newRecords} primeiros pagamentos novos.`
                  : "Nenhum novo primeiro pagamento foi adicionado (todos já existiam)."
              });
            }
            
            setProgress(100);
            setFile(null);
            setProcessing(false);
          } catch (processError) {
            console.error('Erro no processamento dos dados:', processError);
            setError(processError instanceof Error ? processError.message : "Erro ao processar os dados");
            setProcessing(false);
            setProgress(0);
          }
        } catch (parseError) {
          console.error('Erro na leitura da planilha:', parseError);
          setError(parseError instanceof Error ? parseError.message : "Erro na leitura da planilha");
          setProcessing(false);
          setProgress(0);
        }
      };
      
      reader.onerror = () => {
        setError("Erro ao ler o arquivo");
        setProcessing(false);
        setProgress(0);
      };
      
      reader.readAsBinaryString(file);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : "Erro na importação");
      setProcessing(false);
      setProgress(0);
    }
  };

  // Função original para processar ordens de serviço
  const processData = (data: Record<string, unknown>[]): ServiceOrder[] => {
    if (data.length === 0) {
      throw new Error("Nenhum dado encontrado para processamento");
    }
    
    const firstRow = data[0];
    const excelHeaders = Object.keys(firstRow);
    
    const REQUIRED_FIELDS = [
      "Código OS", 
      "ID Técnico", 
      "Técnico", 
      "SGL", 
      "Tipo de serviço", 
      "Sub-Tipo de serviço", 
      "Motivo", 
      "Código Cliente", 
      "Cliente", 
      "Status", 
      "Criação", 
      "Finalização"
    ];
    
                  // Log otimizado
              if (process.env.NODE_ENV === 'development') {
                console.log("Headers necessários:", REQUIRED_FIELDS);
              }
    console.log("Headers encontrados na planilha:", excelHeaders);
    
    const missingRequiredFields: string[] = [];
    
    for (const requiredField of REQUIRED_FIELDS) {
      if (!excelHeaders.includes(requiredField)) {
        if (requiredField === "Finalização" && excelHeaders.includes("FInalização")) {
          console.log(`Campo alternativo "FInalização" encontrado em vez de "Finalização". Utilizando-o.`);
          continue;
        }
        
        // Se o campo ausente for Finalização, verificar se todas as ordens são canceladas
        if (requiredField === "Finalização") {
          // Verificar se todas as ordens são canceladas
          const todasCanceladas = data.every(row => 
            String(row["Status"] || "").toUpperCase() === "CANCELADA"
          );
          
          if (todasCanceladas) {
            console.log(`[MetricsOverview] Todas as ordens são canceladas. Campo '${requiredField}' não será obrigatório.`);
            continue;
          }
        }
        
        missingRequiredFields.push(requiredField);
      }
    }
    
    if (missingRequiredFields.length > 0) {
      throw new Error(`Campos obrigatórios ausentes na planilha: ${missingRequiredFields.join(", ")}`);
    }
    
    // Verificar se o campo "Código Item" existe no arquivo
    if (!excelHeaders.includes("Código Item")) {
      throw new Error("O campo 'Código Item' não está presente no arquivo e é necessário para identificação de duplicatas");
    }
    
    // Verificar duplicações baseado no campo "Código Item"
    const itemCodesMap = new Map<string, number>();
    const duplicatedItemCodes: string[] = [];
    
    data.forEach((row) => {
      const itemCode = String(row["Código Item"]);
      if (itemCodesMap.has(itemCode)) {
        itemCodesMap.set(itemCode, itemCodesMap.get(itemCode)! + 1);
        if (!duplicatedItemCodes.includes(itemCode)) {
          duplicatedItemCodes.push(itemCode);
        }
      } else {
        itemCodesMap.set(itemCode, 1);
      }
    });
    
    if (duplicatedItemCodes.length > 0) {
      const duplicateCount = duplicatedItemCodes.length;
      toast({
        title: "Duplicações encontradas",
        description: `Foram encontradas ${duplicateCount} entradas com o mesmo Código Item. Apenas a primeira ocorrência de cada Código Item será importada.`
      });
      
      console.log("Códigos de Item duplicados:", duplicatedItemCodes.join(", "));
    }
    
    // Filtrar para manter apenas a primeira ocorrência de cada Código Item
    const processedRows: Record<string, unknown>[] = [];
    const processedItemCodes = new Set<string>();
    
    data.forEach((row) => {
      const itemCode = String(row["Código Item"]);
      if (!processedItemCodes.has(itemCode)) {
        processedRows.push(row);
        processedItemCodes.add(itemCode);
      }
    });
    
    const processedOrders = processedRows.map((row, index) => {
      const formatDate = (dateStr: string | null | undefined, isFinalizacao = false): string => {
        // Se for data de finalização e o status for cancelada, permitir data vazia
        const status = String(row["Status"] || "");
        if (isFinalizacao && status.toUpperCase() === "CANCELADA") {
          if (!dateStr || dateStr.trim() === "") {
            // Sempre usar a data de criação para ordens canceladas
            if (row["Criação"]) {
              console.log(`[MetricsOverview] OS ${row["Código OS"]}: Status Cancelada - Usando data de criação como finalização`);
              return formatDate(row["Criação"] as string, false);
            } else {
              // Se não tiver data de criação (caso extremamente raro), lançar erro
              throw new Error(`OS ${row["Código OS"]} cancelada não possui data de criação válida`);
            }
          }
        }
        
        if (!dateStr) {
          throw new Error(`Data inválida na linha ${index + 2}`);
        }
        
        let date: Date;
        
        try {
          date = new Date(dateStr);
          
          if (isNaN(date.getTime())) {
            const parts = dateStr.split(/[/\-\s]/);
            if (parts.length >= 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
              
              date = new Date(year, month, day);
              
              if (dateStr.includes(':')) {
                const timeParts = dateStr.split(' ')[1].split(':');
                date.setHours(parseInt(timeParts[0], 10));
                date.setMinutes(parseInt(timeParts[1], 10));
                if (timeParts.length > 2) {
                  date.setSeconds(parseInt(timeParts[2], 10));
                }
              }
            }
          }
        } catch (e) {
          throw new Error(`Data inválida: "${dateStr}" na linha ${index + 2}`);
        }
        
        if (isNaN(date.getTime())) {
          throw new Error(`Data inválida: "${dateStr}" na linha ${index + 2}`);
        }
        
        return date.toISOString();
      };
      
      // Verificar se é Corretiva e se o Pacote contém a palavra FIBRA
      let subtipo = String(row["Sub-Tipo de serviço"]);
      const pacote = String(row["Pacote"] || "");
      
      console.log(`Processando OS ${row["Código OS"]}: Subtipo="${subtipo}", Pacote="${pacote}"`);
      
      // Se for Corretiva e o pacote contiver a palavra FIBRA, alterar para Corretiva BL
      if (subtipo === "Corretiva" && pacote.toUpperCase().includes("FIBRA")) {
        console.log(`OS ${row["Código OS"]}: Alterando subtipo de "Corretiva" para "Corretiva BL" (Pacote: ${pacote})`);
        subtipo = "Corretiva BL";
      }
      
      // Padronizar a Ação Tomada conforme regras específicas
      let acaoTomada = row["Ação Tomada"] as string | null || null;
      const status = String(row["Status"] || "");
      
      // Regra 1: Se o status for "Cancelada" e a ação tomada tiver conteúdo, substituir por "Cancelada via CCS"
      if (status.toUpperCase() === "CANCELADA" && acaoTomada && acaoTomada.trim() !== "") {
        acaoTomada = "Cancelada via CCS";
      }
      // Regra 2: Se o status for "Cancelada" e a ação tomada estiver vazia, preencher com "Cliente Cancelou via SAC"
      else if (status.toUpperCase() === "CANCELADA" && (!acaoTomada || acaoTomada.trim() === "")) {
        acaoTomada = "Cliente Cancelou via SAC";
      }
      // Regra 3: Se o status for "Finalizada", a ação tomada pode permanecer como está (N/A se estiver vazia)
      
      // Tratar nome do técnico quando é "undefined" ou vazio em OS cancelada
      let nomeTecnico = String(row["Técnico"] || "");
      if (status.toUpperCase() === "CANCELADA" && (!nomeTecnico || nomeTecnico.trim() === "" || nomeTecnico.toLowerCase() === "undefined")) {
        nomeTecnico = "Sem técnico atribuído";
      }
      
      const order: ServiceOrder = {
        codigo_os: String(row["Código OS"]),
        id_tecnico: row["ID Técnico"] ? String(row["ID Técnico"]) : "",
        nome_tecnico: nomeTecnico,
        sigla_tecnico: String(row["SGL"]),
        tipo_servico: String(row["Tipo de serviço"]),
        subtipo_servico: subtipo,
        motivo: String(row["Motivo"]),
        codigo_cliente: String(row["Código Cliente"]),
        nome_cliente: String(row["Cliente"]),
        status: String(row["Status"]),
        data_criacao: formatDate(row["Criação"] as string | null),
        data_finalizacao: formatDate((row["Finalização"] || row["FInalização"]) as string | null, true),
        cidade: String(row["Cidade"] || ""),
        bairro: String(row["Bairro"] || ""),
        
        info_ponto_de_referencia: row["Info: ponto_de_ref"] as string | null || null,
        info_cto: row["Info: info_cto"] as string | null || null,
        info_porta: row["Info: info_porta"] as string | null || null,
        info_endereco_completo: row["Info: info_endereco_completo"] as string | null || null,
        info_empresa_parceira: row["Info: info_empresa_parceira"] as string | null || null,
        acao_tomada: acaoTomada,
        telefone_celular: row["Tel. Cel"] as string | null || null
      };
      
      return order;
    });
    
    return processedOrders;
  };
  
  // Nova função para processar dados de vendas
  const processVendas = (data: Record<string, unknown>[]): Venda[] => {
    if (data.length === 0) {
      throw new Error("Nenhum dado encontrado para processamento");
    }
    
    const firstRow = data[0];
    const excelHeaders = Object.keys(firstRow);
    
    const REQUIRED_FIELDS = [
      "Número da proposta",
      "ID/Código do vendedor",
      "Nome completo do proprietário",
      "Agrupamento do Produto",
      "Produto principal",
      "Valor",
      "Status da Proposta",
      "Data da Habilitação"
    ];
    
    // Verificar se os campos opcionais de CPF e Nome Fantasia existem na planilha
    const hasCpfField = excelHeaders.some(header => header.toLowerCase().includes("cpf"));
    const hasNomeFantasiaField = excelHeaders.some(header => header.toLowerCase().includes("nome fantasia"));
    
    console.log("Headers necessários para vendas:", REQUIRED_FIELDS);
    console.log("Headers encontrados na planilha:", excelHeaders);
    
    const missingRequiredFields: string[] = [];
    
    for (const requiredField of REQUIRED_FIELDS) {
      if (!excelHeaders.some(header => header.toLowerCase() === requiredField.toLowerCase())) {
        missingRequiredFields.push(requiredField);
      }
    }
    
    if (missingRequiredFields.length > 0) {
      throw new Error(`Campos obrigatórios ausentes na planilha de vendas: ${missingRequiredFields.join(", ")}`);
    }
    
    // Verificar duplicações baseado no número da proposta
    const propostasMap = new Map<string, number>();
    const duplicatedPropostas: string[] = [];
    
    data.forEach((row) => {
      const numeroProposta = String(row["Número da proposta"] || row["Numero da proposta"]);
      if (propostasMap.has(numeroProposta)) {
        propostasMap.set(numeroProposta, propostasMap.get(numeroProposta)! + 1);
        if (!duplicatedPropostas.includes(numeroProposta)) {
          duplicatedPropostas.push(numeroProposta);
        }
      } else {
        propostasMap.set(numeroProposta, 1);
      }
    });
    
    if (duplicatedPropostas.length > 0) {
      const duplicateCount = duplicatedPropostas.length;
      toast({
        title: "Duplicações encontradas",
        description: `Foram encontradas ${duplicateCount} entradas com o mesmo número de proposta. Apenas a primeira ocorrência de cada proposta será importada.`
      });
      
      console.log("Propostas duplicadas:", duplicatedPropostas.join(", "));
    }
    
    // Filtrar para manter apenas a primeira ocorrência de cada proposta
    const processedRows: Record<string, unknown>[] = [];
    const processedPropostas = new Set<string>();
    
    data.forEach((row) => {
      const numeroProposta = String(row["Número da proposta"] || row["Numero da proposta"]);
      if (!processedPropostas.has(numeroProposta)) {
        processedRows.push(row);
        processedPropostas.add(numeroProposta);
      }
    });
    
    // Formatar os dados para o formato de Venda
    return processedRows.map((row, index) => {
      const formatDate = (dateStr: string | null | undefined): string => {
        if (!dateStr) {
          throw new Error(`Data de habilitação inválida na linha ${index + 2}`);
        }
        
        let date: Date;
        
        try {
          date = new Date(dateStr);
          
          if (isNaN(date.getTime())) {
            const parts = dateStr.split(/[/\-\s]/);
            if (parts.length >= 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
              
              date = new Date(year, month, day);
            }
          }
        } catch (e) {
          throw new Error(`Data inválida: "${dateStr}" na linha ${index + 2}`);
        }
        
        if (isNaN(date.getTime())) {
          throw new Error(`Data inválida: "${dateStr}" na linha ${index + 2}`);
        }
        
        return date.toISOString();
      };
      
      // Obter o valor numérico, removendo formatações como R$ e .
      const parseValue = (valueStr: string | null | undefined): number => {
        if (!valueStr) return 0;
        
        // Remover símbolos monetários e outros caracteres não numéricos
        const cleanValue = valueStr.toString().replace(/[^\d.,]/g, '').replace(',', '.');
        return parseFloat(cleanValue) || 0;
      };
      
      // Encontrar as colunas correspondentes usando case-insensitive
      const findColumn = (name: string): string | undefined => {
        return excelHeaders.find(header => header.toLowerCase() === name.toLowerCase());
      };
      
      const findColumnContaining = (searchText: string): string | undefined => {
        return excelHeaders.find(header => header.toLowerCase().includes(searchText.toLowerCase()));
      };
      
      const numeroProposta = findColumn("Número da proposta") || findColumn("Numero da proposta");
      const idVendedor = findColumn("ID/Código do vendedor");
      const nomeProprietario = findColumn("Nome completo do proprietário");
      const agrupamentoProduto = findColumn("Agrupamento do Produto");
      const produtoPrincipal = findColumn("Produto principal");
      const valor = findColumn("Valor");
      const statusProposta = findColumn("Status da Proposta");
      const dataHabilitacao = findColumn("Data da Habilitação");
      
      // Buscar os novos campos opcionais
      const cpfColumn = findColumnContaining("cpf");
      const nomeFantasiaColumn = findColumnContaining("nome fantasia");
      const telefoneCelularColumn = findColumnContaining("telefone celular");
      const cidadeColumn = findColumnContaining("cidade");
      const bairroColumn = findColumnContaining("bairro");
      
      // Buscar campos para produtos diferenciais
      const produtosSecundariosColumn = findColumn("ProdutosSecundarios") || findColumn("produtos_secundarios");
      const formaPagamentoColumn = findColumn("FormaPagamento") || findColumn("forma_pagamento");
      
      // Verificar se é produto Nova Parabólica (NP) para flexibilizar validação
      const agrupamentoValue = String(row[agrupamentoProduto] || '').toUpperCase().trim();
      const isNP = agrupamentoValue === 'NP' || agrupamentoValue.includes('NP') || agrupamentoValue.includes('NOVA PARABÓLICA');
      
      // Para produtos NP, só exigir campos essenciais: ID/Código do vendedor e Nome completo do proprietário
      if (isNP) {
        if (!idVendedor || !nomeProprietario || !agrupamentoProduto) {
          throw new Error(`Para produtos Nova Parabólica (NP), são obrigatórios apenas: ID/Código do vendedor, Nome completo do proprietário e Agrupamento do Produto na linha ${index + 2}`);
        }
      } else {
        // Para outros produtos, manter validação original
        if (!numeroProposta || !idVendedor || !nomeProprietario || !agrupamentoProduto || 
            !produtoPrincipal || !valor || !statusProposta || !dataHabilitacao) {
          throw new Error(`Não foi possível encontrar todas as colunas necessárias na linha ${index + 2}`);
        }
      }
      
      // Para produtos NP, gerar valores padrão para campos não obrigatórios
      const generateNPDefaults = () => {
        const currentDate = new Date().toISOString();
        const vendedorId = String(row[idVendedor]);
        const timestamp = Date.now();
        
        return {
          numero_proposta: numeroProposta && row[numeroProposta] ? String(row[numeroProposta]) : `NP-${vendedorId}-${timestamp}`,
          produto_principal: produtoPrincipal && row[produtoPrincipal] ? String(row[produtoPrincipal]) : "Nova Parabólica",
          valor: valor && row[valor] ? parseValue(String(row[valor])) : 0,
          status_proposta: statusProposta && row[statusProposta] ? String(row[statusProposta]) : "HABILITADO",
          data_habilitacao: dataHabilitacao && row[dataHabilitacao] ? formatDate(String(row[dataHabilitacao])) : currentDate
        };
      };
      
      const npDefaults = isNP ? generateNPDefaults() : null;
      
      const venda: Venda = {
        numero_proposta: isNP ? npDefaults!.numero_proposta : String(row[numeroProposta]),
        id_vendedor: String(row[idVendedor]),
        nome_proprietario: String(row[nomeProprietario]),
        cpf: cpfColumn ? String(row[cpfColumn] || "") : "",
        nome_fantasia: nomeFantasiaColumn ? String(row[nomeFantasiaColumn] || "") : "",
        telefone_celular: telefoneCelularColumn ? String(row[telefoneCelularColumn] || "") : "",
        cidade: cidadeColumn ? String(row[cidadeColumn] || "") : "",
        bairro: bairroColumn ? String(row[bairroColumn] || "") : "",
        agrupamento_produto: String(row[agrupamentoProduto]),
        produto_principal: isNP ? npDefaults!.produto_principal : String(row[produtoPrincipal]),
        valor: isNP ? npDefaults!.valor : parseValue(String(row[valor])),
        status_proposta: isNP ? npDefaults!.status_proposta : String(row[statusProposta]),
        data_habilitacao: isNP ? npDefaults!.data_habilitacao : formatDate(String(row[dataHabilitacao])),
        // Campos para produtos diferenciais
        produtos_secundarios: produtosSecundariosColumn ? String(row[produtosSecundariosColumn] || "") : undefined,
        forma_pagamento: formaPagamentoColumn ? String(row[formaPagamentoColumn] || "") : undefined
      };
      
      return venda;
    });
  };
  
  // Nova função para processar dados de primeiro pagamento
  const processPagamentos = (data: Record<string, unknown>[], toast: (arg0: { title: string; description: string; status: "info" | "warning" | "success" | "error"; duration: number; isClosable: boolean; }) => void) => {
    if (!data || data.length === 0) {
      console.log("Nenhum dado para processar");
      return [];
    }

    // Função auxiliar para formatar datas do Excel
    const formatDateFromExcel = (dateValue: unknown): string | null => {
      if (!dateValue || dateValue === "undefined" || dateValue === "") {
        return null;
      }
      
      let date: Date;
      
      try {
        // Se o valor já for uma data do Excel, usa diretamente
        if (dateValue instanceof Date) {
          date = dateValue;
        } else {
          // Tenta converter diretamente para Date
          date = new Date(String(dateValue));
          
          // Se a data for inválida, tenta parsear manualmente
          if (isNaN(date.getTime())) {
            const parts = String(dateValue).split(/[/\-\s]/);
            if (parts.length >= 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
              
              date = new Date(year, month, day);
            }
          }
        }
      } catch (e) {
        console.error(`Erro ao processar data "${dateValue}":`, e);
        return null;
      }
      
      if (isNaN(date.getTime())) {
        console.error(`Data inválida: "${dateValue}"`);
        return null;
      }
      
      return date.toISOString();
    };

    // Verificar os cabeçalhos disponíveis no Excel
    const firstRow = data[0];
    const excelHeaders = Object.keys(firstRow);
    console.log("Cabeçalhos encontrados:", excelHeaders);

    // Função para encontrar a coluna correta, tentando várias possibilidades
    const findColumnName = (possibleNames: string[]): string | undefined => {
      for (const name of possibleNames) {
        if (excelHeaders.includes(name)) {
          return name;
        }
      }
      return undefined;
    };

    // Encontrar os nomes das colunas no arquivo Excel
    const propostaColumn = findColumnName(["Proposta", "Número da Proposta", "N. Proposta"]);
    const passoColumn = findColumnName(["Passo", "Passo Cobrança"]);
    const dataPassoCobrancaColumn = findColumnName(["Data Passo Cobrança", "Data Passo de Cobrança", "Data da Cobrança"]);
    const vencimentoFaturaColumn = findColumnName(["Vencimento Fatura", "Vencimento da Fatura", "Data Vencimento"]);
    const statusColumn = findColumnName(["Status", "Status Pacote", "Status do Pacote"]);
    const dataImportacaoColumn = findColumnName(["Data de Importação", "Data Importação"]);

    if (!propostaColumn) {
      toast({
        title: "Erro na importação",
        description: "Coluna 'Proposta' não encontrada no arquivo",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return [];
    }

    console.log(`Processando ${data.length} registros de pagamentos`);
    console.log(`Colunas identificadas: Proposta="${propostaColumn}", Passo="${passoColumn}", DataPassoCobrança="${dataPassoCobrancaColumn}", VencimentoFatura="${vencimentoFaturaColumn}", Status="${statusColumn}"`);
    
    // Usar um Map para rastrear as propostas mais recentes
    const processedMap = new Map<string, { row: Record<string, unknown>; dataImportacao: Date }>();
    
    // Processar cada linha, mantendo apenas a ocorrência mais recente de cada proposta
    data.forEach(row => {
      const proposta = String(row[propostaColumn!] || "");
      
      if (!proposta) {
        console.log("Ignorando linha sem proposta");
        return;
      }
      
      // Verificar a data de importação
      let dataImportacao: Date;
      if (dataImportacaoColumn && row[dataImportacaoColumn]) {
        try {
          const rawDate = row[dataImportacaoColumn];
          if (rawDate instanceof Date) {
            dataImportacao = rawDate;
          } else {
            dataImportacao = new Date(String(rawDate));
            if (isNaN(dataImportacao.getTime())) {
              // Tentar formato brasileiro (DD/MM/YYYY)
              const parts = String(rawDate).split(/[/\-\s]/);
            if (parts.length >= 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
                dataImportacao = new Date(year, month, day);
              }
            }
          }
        } catch (e) {
          console.error(`Erro ao processar data de importação para proposta ${proposta}:`, e);
          dataImportacao = new Date(); // Usar data atual em caso de erro
        }
      } else {
        // Se não tiver data de importação, usar a data atual
        dataImportacao = new Date();
      }
      
      // Se ainda for uma data inválida, usar a data atual
      if (isNaN(dataImportacao.getTime())) {
        dataImportacao = new Date();
      }
      
      // Verificar se já temos esta proposta e se esta é mais recente
      if (processedMap.has(proposta)) {
        const existing = processedMap.get(proposta);
        if (existing && dataImportacao > existing.dataImportacao) {
          // Atualizar para a proposta mais recente
          processedMap.set(proposta, { row, dataImportacao });
        }
      } else {
        // Adicionar nova proposta
        processedMap.set(proposta, { row, dataImportacao });
      }
    });
    
    if (processedMap.size < data.length) {
      toast({
        title: "Propostas duplicadas encontradas",
        description: `Foram encontradas ${data.length - processedMap.size} propostas duplicadas. Apenas a entrada mais recente de cada proposta será mantida.`,
        status: "info",
        duration: 5000,
        isClosable: true,
      });
    }
    
    // Converter o mapa para uma lista de linhas a serem processadas
    const processedRows = Array.from(processedMap.values()).map(item => item.row);
    
    console.log(`Processando ${processedRows.length} propostas únicas de um total de ${data.length} registros.`);
    
    // Formatar os dados para o formato de PrimeiroPagamento
    const formattedData = processedRows.map(row => {
      // Obter os valores das colunas necessárias
      const proposta = String(row[propostaColumn!] || "");
      const passo = passoColumn && row[passoColumn] ? String(row[passoColumn]) : "";
      
      // Converter datas
      let dataPassoCobr: string | null = null;
      if (dataPassoCobrancaColumn && row[dataPassoCobrancaColumn]) {
        if (row[dataPassoCobrancaColumn] instanceof Date) {
          dataPassoCobr = (row[dataPassoCobrancaColumn] as Date).toISOString();
        } else {
          dataPassoCobr = formatDateFromExcel(row[dataPassoCobrancaColumn]);
        }
      }
      
      let vencimentoFat: string | null = null;
      if (vencimentoFaturaColumn && row[vencimentoFaturaColumn]) {
        if (row[vencimentoFaturaColumn] instanceof Date) {
          vencimentoFat = (row[vencimentoFaturaColumn] as Date).toISOString();
        } else {
          vencimentoFat = formatDateFromExcel(row[vencimentoFaturaColumn]);
        }
      }
      
      let dataImport: string;
      if (dataImportacaoColumn && row[dataImportacaoColumn]) {
        if (row[dataImportacaoColumn] instanceof Date) {
          dataImport = (row[dataImportacaoColumn] as Date).toISOString();
        } else {
          const formattedDate = formatDateFromExcel(row[dataImportacaoColumn]);
          dataImport = formattedDate || new Date().toISOString();
        }
      } else {
        dataImport = processedMap.get(proposta)?.dataImportacao.toISOString() || new Date().toISOString();
      }
      
      // Determinar status
      const statusPacote = statusColumn && row[statusColumn] ? String(row[statusColumn]) : "";
      
      console.log(`Proposta ${proposta}: statusPacote=${statusPacote}, passo=${passo}, vencimentoFat=${vencimentoFat}, dataPassoCobr=${dataPassoCobr}`);
      
      return {
        proposta,
        passo,
        data_passo_cobranca: dataPassoCobr || "",
        vencimento_fatura: vencimentoFat || "",
        status_pacote: statusPacote,
        data_importacao: dataImport
      };
    });
    
    return formattedData;
  };

  // Função para processar vendas de meta
  const processVendasMeta = (data: Record<string, unknown>[]): VendaMeta[] => {
    if (data.length === 0) {
      throw new Error("Nenhum dado de vendas de meta encontrado para processamento");
    }
    
    const firstRow = data[0];
    const excelHeaders = Object.keys(firstRow);
    
    // Campos esperados na planilha VENDAS META (mesmos nomes da VENDAS PERMANENCIA)
    const REQUIRED_FIELDS = [
      "Número da proposta",
      "ID/Código do vendedor", 
      "Agrupamento do Produto",
      "Produto principal",
      "Valor",
      "Data da Habilitação"
    ];
    
    console.log("Headers encontrados na planilha VENDAS META:", excelHeaders);
    
    // Verificar se todos os campos obrigatórios estão presentes
    const missingFields = REQUIRED_FIELDS.filter(field => !excelHeaders.includes(field));
    if (missingFields.length > 0) {
      throw new Error(`Campos obrigatórios ausentes na planilha VENDAS META: ${missingFields.join(", ")}`);
    }
    
    const processedVendasMeta: VendaMeta[] = [];
    
    data.forEach((row, index) => {
      try {
        const numeroPropostaRaw = row["Número da proposta"];
        const valorRaw = row["Valor"];
        const dataHabilitacaoRaw = row["Data da Habilitação"];
        const idVendedorRaw = row["ID/Código do vendedor"];
        const agrupamentoProdutoRaw = row["Agrupamento do Produto"];
        const produtoPrincipalRaw = row["Produto principal"];
        const produtosSecundariosRaw = row["ProdutosSecundarios"];
        const cidadeRaw = row["Cidade"];
        const formaPagamentoRaw = row["FormaPagamento"];
        
        // Verificar se é produto Nova Parabólica (NP) para flexibilizar validação
        const agrupamentoValue = String(agrupamentoProdutoRaw || '').toUpperCase().trim();
        const isNP = agrupamentoValue === 'NP' || agrupamentoValue.includes('NP') || agrupamentoValue.includes('NOVA PARABÓLICA');
        
        // Para produtos NP, só exigir campos essenciais: ID/Código do vendedor
        if (isNP) {
          if (!idVendedorRaw || !agrupamentoProdutoRaw) {
            console.warn(`Linha ${index + 2}: Para produtos Nova Parabólica (NP), são obrigatórios apenas: ID/Código do vendedor e Agrupamento do Produto, pulando linha`);
            return;
          }
        } else {
          // Para outros produtos, manter validação original
          if (!numeroPropostaRaw || !valorRaw || !dataHabilitacaoRaw || !idVendedorRaw) {
            console.warn(`Linha ${index + 2}: Campos obrigatórios ausentes, pulando linha`);
            return;
          }
        }
        
        // Para produtos NP, gerar valores padrão para campos não obrigatórios
        const generateNPDefaultsMeta = () => {
          const currentDate = new Date();
          const vendedorId = String(idVendedorRaw);
          const timestamp = Date.now();
          
          return {
            numero_proposta: numeroPropostaRaw ? String(numeroPropostaRaw) : `NP-META-${vendedorId}-${timestamp}`,
            valor: valorRaw ? (typeof valorRaw === 'number' ? valorRaw : parseFloat(String(valorRaw).replace(/[R$\s.,]/g, '').replace(',', '.')) || 0) : 0,
            data_habilitacao: dataHabilitacaoRaw ? (dataHabilitacaoRaw instanceof Date ? dataHabilitacaoRaw.toISOString().split('T')[0] : String(dataHabilitacaoRaw)) : currentDate.toISOString().split('T')[0],
            produto_principal: produtoPrincipalRaw ? String(produtoPrincipalRaw) : "Nova Parabólica",
            mes: currentDate.getMonth() + 1,
            ano: currentDate.getFullYear()
          };
        };
        
        // Processar valores normais ou usar padrões para NP
        let valor = 0;
        let dataHabilitacao = '';
        let mes = 0;
        let ano = 0;
        
        if (isNP) {
          const npDefaults = generateNPDefaultsMeta();
          valor = npDefaults.valor;
          dataHabilitacao = npDefaults.data_habilitacao;
          mes = npDefaults.mes;
          ano = npDefaults.ano;
        } else {
          // Processar valor normalmente
          if (typeof valorRaw === 'number') {
            valor = valorRaw;
          } else if (typeof valorRaw === 'string') {
            valor = parseFloat(valorRaw.replace(/[R$\s.,]/g, '').replace(',', '.')) || 0;
          }
          
          // Processar data normalmente
          if (dataHabilitacaoRaw instanceof Date) {
            dataHabilitacao = dataHabilitacaoRaw.toISOString().split('T')[0];
          } else if (typeof dataHabilitacaoRaw === 'string') {
            dataHabilitacao = dataHabilitacaoRaw;
          }
          
          // Extrair mês e ano da data de habilitação
          const dataObj = new Date(dataHabilitacao);
          mes = dataObj.getMonth() + 1;
          ano = dataObj.getFullYear();
        }
        
        // Debug do campo ProdutosSecundarios
                  // console.log(`[DEBUG PRODUTOS_SEC] Linha ${index + 2}: ProdutosSecundarios = "${produtosSecundariosRaw}"`);
        
        const npDefaults = isNP ? generateNPDefaultsMeta() : null;
        
        const vendaMeta = {
          numero_proposta: isNP ? npDefaults!.numero_proposta : String(numeroPropostaRaw),
          valor: valor,
          data_venda: dataHabilitacao,
          vendedor: String(idVendedorRaw),
          categoria: String(agrupamentoProdutoRaw || ''),
          produto: isNP ? npDefaults!.produto_principal : String(produtoPrincipalRaw || ''),
          produtos_secundarios: String(produtosSecundariosRaw || ''),
          cidade: String(cidadeRaw || ''),
          forma_pagamento: String(formaPagamentoRaw || ''),
          mes: mes,
          ano: ano
        };
        
        processedVendasMeta.push(vendaMeta);
        
      } catch (error) {
        console.error(`Erro ao processar linha ${index + 2}:`, error);
      }
    });
    
    console.log(`Processadas ${processedVendasMeta.length} vendas de meta de ${data.length} linhas`);
    return processedVendasMeta;
  };

  // Função para processar dados BASE
  const processBaseData = (data: Record<string, unknown>[]): Array<{mes: string; base_tv: number; base_fibra: number; alianca: number}> => {
    if (data.length === 0) {
      throw new Error("Nenhum dado BASE encontrado para processamento");
    }
    
    const processedBaseData = data.map((row, index) => {
      const parseNumericValue = (value: unknown): number => {
        if (value === null || value === undefined || value === "") return 0;
        
        const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
        return isNaN(numValue) ? 0 : numValue;
      };
      
      // Mapear campos da planilha BASE
      const baseItem = {
        mes: String(row["MÊS"] || row["MES"] || row["Mês"] || `Mês ${index + 1}`),
        base_tv: parseNumericValue(row["BASE TV"] || row["BASE_TV"] || row["base_tv"]),
        base_fibra: parseNumericValue(row["BASE FIBRA"] || row["BASE_FIBRA"] || row["base_fibra"]),
        alianca: parseNumericValue(row["ALIANCA"] || row["ALIANÇA"] || row["alianca"])
      };
      
      console.log(`[BASE DATA] Linha ${index + 1}:`, baseItem);
      return baseItem;
    });
    
    console.log(`[BASE DATA] Processados ${processedBaseData.length} registros BASE`);
    return processedBaseData;
  };

  // Função para processar metas
  const processMetas = (data: Record<string, unknown>[]): Array<{
    mes: number;
    ano: number;
    pos_pago: number;
    flex_conforto: number;
    nova_parabolica: number;
    total: number;
    fibra: number;
    seguros_pos: number;
    seguros_fibra: number;
    sky_mais: number;
    data_criacao: string;
    data_atualizacao: string;
  }> => {
    if (data.length === 0) {
      throw new Error("Nenhum dado de metas encontrado para processamento");
    }
    
    const firstRow = data[0];
    const excelHeaders = Object.keys(firstRow);
    
    // Campos esperados na planilha METAS (conforme sua imagem)
    const REQUIRED_FIELDS = [
      "MÊS", "ANO", "PÓS-PAGO", "FLEX/CONFORTO", "NOVA PARABÓLICA", 
      "TOTAL", "FIBRA", "SEGUROS POS", "SEGUROS FIBRA", "SKY MAIS"
    ];
    
    console.log("Headers encontrados na planilha METAS:", excelHeaders);
    
    // Verificar se todos os campos obrigatórios estão presentes
    const missingFields = REQUIRED_FIELDS.filter(field => !excelHeaders.includes(field));
    if (missingFields.length > 0) {
      throw new Error(`Campos obrigatórios ausentes na planilha METAS: ${missingFields.join(", ")}`);
    }
    
    const processedMetas: Array<{
      mes: number;
      ano: number;
      pos_pago: number;
      flex_conforto: number;
      nova_parabolica: number;
      total: number;
      fibra: number;
      seguros_pos: number;
      seguros_fibra: number;
      sky_mais: number;
      data_criacao: string;
      data_atualizacao: string;
    }> = [];
    
    data.forEach((row, index) => {
      try {
        const mesRaw = row["MÊS"];
        const anoRaw = row["ANO"];
        const posPagoRaw = row["PÓS-PAGO"];
        const flexConfortoRaw = row["FLEX/CONFORTO"];
        const novaParabolicaRaw = row["NOVA PARABÓLICA"];
        const totalRaw = row["TOTAL"];
        const fibraRaw = row["FIBRA"];
        const segurosPosRaw = row["SEGUROS POS"];
        const segurosFibraRaw = row["SEGUROS FIBRA"];
        const skyMaisRaw = row["SKY MAIS"];
        
        // Validar campos obrigatórios
        if (!mesRaw || !anoRaw) {
          console.warn(`Linha ${index + 2}: Mês ou ano ausente, pulando linha`);
          return;
        }
        
        // Processar valores numéricos
        const parseNumber = (value: unknown): number => {
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            return parseFloat(value.replace(/[R$\s.,]/g, '').replace(',', '.')) || 0;
          }
          return 0;
        };
        
        // Função para converter nome do mês em número
        const convertMesParaNumero = (mesValue: unknown): number => {
          if (typeof mesValue === 'number') return mesValue;
          
          const mesString = String(mesValue).toLowerCase().trim();
          const mesesMap: Record<string, number> = {
            'janeiro': 1, 'jan': 1,
            'fevereiro': 2, 'fev': 2,
            'março': 3, 'mar': 3, 'marco': 3,
            'abril': 4, 'abr': 4,
            'maio': 5, 'mai': 5,
            'junho': 6, 'jun': 6,
            'julho': 7, 'jul': 7,
            'agosto': 8, 'ago': 8,
            'setembro': 9, 'set': 9,
            'outubro': 10, 'out': 10,
            'novembro': 11, 'nov': 11,
            'dezembro': 12, 'dez': 12
          };
          
          return mesesMap[mesString] || parseInt(mesString) || 0;
        };
        
        // console.log(`[DEBUG processMetas] Linha ${index + 2}: mesRaw =`, mesRaw, 'tipo:', typeof mesRaw);
        // console.log(`[DEBUG processMetas] Linha ${index + 2}: anoRaw =`, anoRaw, 'tipo:', typeof anoRaw);
        
        const mes = convertMesParaNumero(mesRaw);
        const ano = typeof anoRaw === 'number' ? anoRaw : parseInt(String(anoRaw));
        
        // console.log(`[DEBUG processMetas] Linha ${index + 2}: mes processado =`, mes);
        // console.log(`[DEBUG processMetas] Linha ${index + 2}: ano processado =`, ano);
        
        const meta = {
          mes: mes,
          ano: ano,
          pos_pago: parseNumber(posPagoRaw),
          flex_conforto: parseNumber(flexConfortoRaw),
          nova_parabolica: parseNumber(novaParabolicaRaw),
          total: parseNumber(totalRaw),
          fibra: parseNumber(fibraRaw),
          seguros_pos: parseNumber(segurosPosRaw),
          seguros_fibra: parseNumber(segurosFibraRaw),
          sky_mais: parseNumber(skyMaisRaw),
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString()
        };
        
        processedMetas.push(meta);
        
      } catch (error) {
        console.error(`Erro ao processar linha ${index + 2}:`, error);
      }
    });
    
    console.log(`Processadas ${processedMetas.length} metas de ${data.length} linhas`);
    return processedMetas;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Importar Dados</CardTitle>
          <CardDescription>Importe diferentes tipos de dados para análise</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="mb-4">
                <Label className="mb-2 block">Tipo de Importação</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <Button
                    onClick={() => setImportType('pagamentos')}
                    variant={importType === 'pagamentos' ? 'default' : 'outline'}
                    className="text-xs px-2 py-1.5 h-auto"
                    size="sm"
                  >
                    <FileIcon className="mr-1 h-3 w-3" />
                    Primeiro Pagamento (Icare)
                  </Button>
                  <Button
                    onClick={() => setImportType('metas')}
                    variant={importType === 'metas' ? 'default' : 'outline'}
                    className="text-xs px-2 py-1.5 h-auto"
                    size="sm"
                  >
                    <Target className="mr-1 h-3 w-3" />
                    Comercial (Vendas Permanencia, Vendas Atual e Metas)
                  </Button>
                  <Button
                    onClick={() => setImportType('servicos-base')}
                    variant={importType === 'servicos-base' ? 'default' : 'outline'}
                    className="text-xs px-2 py-1.5 h-auto"
                    size="sm"
                  >
                    <FileIcon className="mr-1 h-3 w-3" />
                    Operacional (Serviços e Base)
                  </Button>
                </div>
              </div>
              
              <Label htmlFor="file">Arquivo Excel ou CSV</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={processing}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {file.name} ({Math.round(file.size / 1024)} KB)
                </p>
              )}
              
              {importType === 'pagamentos' && (
                <div className="text-sm text-muted-foreground mt-2">
                  <p className="font-medium">Dica:</p>
                  <p>O arquivo deve conter as seguintes colunas obrigatórias:</p>
                  <ul className="list-disc ml-6 mb-2">
                    <li>Proposta</li>
                    <li>Passo</li>
                    <li>Vencimento da Fatura</li>
                    <li>Status do Pacote</li>
                  </ul>
                  <p>As seguintes colunas são opcionais:</p>
                  <ul className="list-disc ml-6 mb-2">
                    <li>Data Passo de Cobrança</li>
                    <li>Data de Importação (se não existir, a data atual será usada)</li>
                  </ul>
                  <p>Ao importar, os registros com a mesma proposta serão atualizados apenas se a nova data de importação for mais recente.</p>
                </div>
              )}
              
              {error && <p className="text-sm text-red-500">{error}</p>}
              
              {processing && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground">
                    Processando arquivo... {progress}%
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Button
                onClick={handleUpload}
                disabled={!file || processing}
                className="w-full"
              >
                {processing ? 
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                  <Upload className="mr-2 h-4 w-4" />
                }
                Importar Dados
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Instruções para Importação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Formato do Arquivo</h3>
              <p className="text-sm text-muted-foreground">
                Os arquivos devem estar no formato Excel (.xlsx) ou CSV, com as colunas apropriadas.
              </p>
            </div>
            

            {importType === 'pagamentos' && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Campos Obrigatórios - Primeiro Pagamento (Icare)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  <div>• Proposta</div>
                  <div>• Passo</div>
                  <div>• Vencimento da Fatura</div>
                  <div>• Status do Pacote</div>
                </div>
              </div>
            )}
            
            {importType === 'metas' && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Importação Comercial - 3 Planilhas</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  O arquivo Excel deve conter <strong>exatamente 3 planilhas</strong> com os nomes:
                </p>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Planilha: "VENDAS PERMANENCIA" (Vendas Permanência)</h4>
                    <p className="text-xs text-muted-foreground mb-2">Usar o mesmo formato da importação de vendas normais</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs">
                      <div>• Número da proposta</div>
                      <div>• ID/Código do vendedor</div>
                      <div>• Nome completo do proprietário</div>
                      <div>• Agrupamento do Produto</div>
                      <div>• Produto principal</div>
                      <div>• Valor</div>
                      <div>• Status da Proposta</div>
                      <div>• Data da Habilitação</div>
                    </div>
                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                      <p className="font-medium text-orange-800">⚡ Nova Parabólica (NP) - Inserção Simplificada:</p>
                      <p className="text-orange-700">Para produtos com agrupamento "NP", apenas <strong>ID/Código do vendedor</strong> e <strong>Nome completo do proprietário</strong> são obrigatórios. Os demais campos serão preenchidos automaticamente.</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Planilha: "VENDAS META" (Vendas Atual)</h4>
                    <p className="text-xs text-muted-foreground mb-2">Usar o mesmo formato da importação de vendas normais</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs">
                      <div>• Número da proposta</div>
                      <div>• ID/Código do vendedor</div>
                      <div>• Agrupamento do Produto</div>
                      <div>• Produto principal</div>
                      <div>• Valor</div>
                      <div>• Data da Habilitação</div>
                    </div>
                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                      <p className="font-medium text-orange-800">⚡ Nova Parabólica (NP) - Inserção Simplificada:</p>
                      <p className="text-orange-700">Para produtos com agrupamento "NP", apenas <strong>ID/Código do vendedor</strong> é obrigatório. Os demais campos serão preenchidos automaticamente.</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Planilha: "METAS" (Metas Comerciais)</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs">
                      <div>• MÊS</div>
                      <div>• ANO</div>
                      <div>• PÓS-PAGO</div>
                      <div>• FLEX/CONFORTO</div>
                      <div>• NOVA PARABÓLICA</div>
                      <div>• TOTAL</div>
                      <div>• FIBRA</div>
                      <div>• SEGUROS POS</div>
                      <div>• SEGUROS FIBRA</div>
                      <div>• SKY MAIS</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {importType === 'servicos-base' && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Importação Operacional - 2 Planilhas</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  O arquivo Excel deve conter <strong>2 planilhas</strong>:
                </p>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Primeira Planilha: Dados de Serviços (Operacional)</h4>
                    <p className="text-xs text-muted-foreground mb-2">Nome sugerido: "SERVICOS" ou similar</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs">
                      <div>• Código OS</div>
                      <div>• ID Técnico</div>
                      <div>• Técnico</div>
                      <div>• SGL</div>
                      <div>• Tipo de serviço</div>
                      <div>• Sub-Tipo de serviço</div>
                      <div>• Motivo</div>
                      <div>• Código Cliente</div>
                      <div>• Cliente</div>
                      <div>• Status</div>
                      <div>• Criação</div>
                      <div>• Finalização</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Segunda Planilha: "BASE" (Dados Base)</h4>
                    <p className="text-xs text-muted-foreground mb-2">Nome obrigatório: "BASE"</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs">
                      <div>• MÊS</div>
                      <div>• BASE TV</div>
                      <div>• BASE FIBRA</div>
                      <div>• ALIANCA</div>
                    </div>
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <p className="font-medium text-blue-800">Exemplo de dados BASE:</p>
                      <p>MÊS: Janeiro, Fevereiro, Março...</p>
                      <p>BASE TV: 1500, 1520, 1480...</p>
                      <p>BASE FIBRA: 2300, 2350, 2400...</p>
                      <p>ALIANCA: 800, 820, 850...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente separado para o conteúdo da tab Permanência
function PermanenciaTabContent({ setFiltroGlobal }: { setFiltroGlobal: React.Dispatch<React.SetStateAction<string[]>> }) {
  // UseData hook para obter dados do contexto
  const data = useData();
  const { vendas, primeirosPagamentos } = data;
  const permanenciaMetrics = data.calculatePermanenciaMetrics();
  
  // Estado para controlar a página atual na tabela de propostas
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;
  
  // Estado para controlar a busca
  const [termoBusca, setTermoBusca] = useState("");
  
  // Estados para filtros
  const [filtroSigla, setFiltroSigla] = useState<string[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string>("_all");
  const [filtroPasso, setFiltroPasso] = useState<string[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string[]>([]);
  const [filtroDataHabilitacao, setFiltroDataHabilitacao] = useState<string[]>([]);
  const [filtroDiasCorridos, setFiltroDiasCorridos] = useState<string[]>([]);
  const [filtroCidade, setFiltroCidade] = useState<string[]>([]);
  const [filtroBairro, setFiltroBairro] = useState<string[]>([]);
  
  // Novos filtros de Mês e Ano (baseados na lógica: vendas de fevereiro = permanência em junho +4 meses)
  const [filtroMesPermanencia, setFiltroMesPermanencia] = useState<string[]>([]);
  const [filtroAnoPermanencia, setFiltroAnoPermanencia] = useState<string[]>([]);
  
  // Função para calcular o mês de permanência (data de habilitação + 4 meses)
  const calcularMesPermanencia = useCallback((dataHabilitacao: string): string => {
    const data = new Date(dataHabilitacao);
    data.setMonth(data.getMonth() + 4); // Adiciona 4 meses
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[data.getMonth()];
  }, []);

  // Função para calcular o ano de permanência (mesmo ano da data de habilitação + 4 meses)
  const calcularAnoPermanencia = useCallback((dataHabilitacao: string): number => {
    const data = new Date(dataHabilitacao);
    data.setMonth(data.getMonth() + 4); // Adiciona 4 meses
    return data.getFullYear();
  }, []);

  // Função para gerar link do WhatsApp com a mensagem padrão
  const gerarLinkWhatsApp = useCallback((telefone: string, nomeFantasia: string, produto: string) => {
    // Limpar telefone para conter apenas números
    const telefoneLimpo = telefone.replace(/\D/g, '');
    
    // Verificar se o telefone tem pelo menos 10 dígitos (DDD + número)
    if (telefoneLimpo.length < 10) {
      return '';
    }
    
    // Montar a mensagem personalizada
    const mensagem = `Oi ${nomeFantasia}, tudo certo?\nPassando pra saber se você curtiu a programação do ${produto} e se recebeu o boleto direitinho.\nSe precisar de qualquer informação ou tiver alguma dúvida, é só me chamar por esse mesmo número. Estou por aqui! 😊`;
    
    // Codificar a mensagem para URL
    const mensagemCodificada = encodeURIComponent(mensagem);
    
    // Montar o link com o código do país (55)
    return `https://api.whatsapp.com/send?phone=55${telefoneLimpo}&text=${mensagemCodificada}`;
  }, []);
  
  // Sincronizar o estado local do filtro com o estado global
  useEffect(() => {
    setFiltroGlobal(filtroDataHabilitacao);
  }, [filtroDataHabilitacao, setFiltroGlobal]);
  
  // Função para calcular dias corridos
  const calcularDiasCorridos = useCallback((dataHabilitacao: string): number => {
    const dataInicio = new Date(dataHabilitacao);
    const dataAtual = new Date();
    
    // Calcular a diferença em milissegundos
    const diferencaMs = dataAtual.getTime() - dataInicio.getTime();
    
    // Converter para dias e arredondar para baixo
    return Math.floor(diferencaMs / (1000 * 60 * 60 * 24));
  }, []);
  
  // Função para obter faixas de dias corridos para filtragem
  const obterFaixasDiasCorridos = useCallback(() => {
    const faixas = [
      "0-30",
      "31-60",
      "61-90",
      "91-120",
      ">121"
    ];
    
    return faixas;
  }, []);
  
  // Verificar se um número de dias está dentro de uma faixa especificada
  const verificarDiasDentroFaixa = useCallback((dias: number, faixa: string): boolean => {
    if (faixa === ">121") return dias > 121;
    
    const [min, max] = faixa.split("-").map(Number);
    return dias >= min && dias <= max;
  }, []);
  
  // Função para obter inclusões (vendas BL-DGO sem registro de pagamento)
  const obterInclusoes = useCallback((): PrimeiroPagamento[] => {
    // Se não houver vendas, não há como processar inclusões
    if (vendas.length === 0) {
      return [];
    }
    
    // Criar um conjunto com as propostas que já têm pagamento registrado
    const propostasComPagamento = new Set(primeirosPagamentos.map(p => p.proposta));
    
    // Identificar vendas BL-DGO sem pagamento correspondente
    const vendasBLDGOSemPagamento = vendas.filter(venda => {
      // Verificar se é BL-DGO
      const ehBLDGO = venda.agrupamento_produto?.includes('BL-DGO') || venda.produto_principal?.includes('BL-DGO');
      
      // Verificar se não tem pagamento correspondente
      const naoTemPagamento = !propostasComPagamento.has(venda.numero_proposta);
      
      return ehBLDGO && naoTemPagamento;
    });
    
    // Gerar registros de pagamento para cada inclusão
    const inclusoes: PrimeiroPagamento[] = vendasBLDGOSemPagamento.map(venda => {
      // Corrigir a inversão da data (se a data estiver no formato mm/dd/yyyy)
      let dataHabilitacaoCorrigida = new Date(venda.data_habilitacao);
      
      // Verificar se a data parece estar invertida (mes maior que 12)
      try {
        const partes = venda.data_habilitacao.split('T')[0].split('-');
        if (partes.length === 3) {
          const ano = parseInt(partes[0]);
          const mes = parseInt(partes[1]);
          const dia = parseInt(partes[2]);
          
          // Se o mês for maior que 12, provavelmente está invertido
          if (mes > 12) {
            // Trocar mes e dia
            dataHabilitacaoCorrigida = new Date(ano, dia - 1, mes);
          }
        }
      } catch (e) {
        console.error(`Erro ao processar data para venda ${venda.numero_proposta}:`, e);
      }
      
      // Calcular vencimento (data de habilitação + 30 dias)
      const dataVencimento = new Date(dataHabilitacaoCorrigida);
      dataVencimento.setDate(dataVencimento.getDate() + 30);
      
      return {
        proposta: venda.numero_proposta,
        passo: "0", // Passo 0 para inclusões
        data_passo_cobranca: "", // Sem cobrança ainda
        vencimento_fatura: dataVencimento.toISOString(),
        status_pacote: "NC", // NC de Não Cobrança (anteriormente I de Inclusão)
        data_importacao: new Date().toISOString() // Data atual como data de importação
      };
    });
    
    return inclusoes;
  }, [vendas, primeirosPagamentos]);
  
  // Obter todos os pagamentos incluindo inclusões
  const todosPagamentos = useMemo(() => {
    const inclusoes = obterInclusoes();
    return [...primeirosPagamentos, ...inclusoes];
  }, [primeirosPagamentos, obterInclusoes]);

  // Filtrar vendas baseado nos filtros de mês e ano de permanência
  const vendasFiltradas = useMemo(() => {
    if (filtroMesPermanencia.length === 0 && filtroAnoPermanencia.length === 0) {
      return vendas; // Sem filtros, retorna todas as vendas
    }

    return vendas.filter(venda => {
      if (!venda.data_habilitacao) return false;

      // Calcular mês e ano de permanência para esta venda
      const mesPermanencia = calcularMesPermanencia(venda.data_habilitacao);
      const anoPermanencia = calcularAnoPermanencia(venda.data_habilitacao);

      // Verificar se está nos filtros selecionados
      const mesMatch = filtroMesPermanencia.length === 0 || filtroMesPermanencia.includes(mesPermanencia);
      const anoMatch = filtroAnoPermanencia.length === 0 || filtroAnoPermanencia.includes(anoPermanencia.toString());

      return mesMatch && anoMatch;
    });
  }, [vendas, filtroMesPermanencia, filtroAnoPermanencia, calcularMesPermanencia, calcularAnoPermanencia]);

  // Filtrar pagamentos baseado nas vendas filtradas
  const pagamentosFiltrados = useMemo(() => {
    const propostasValidas = new Set(vendasFiltradas.map(v => v.numero_proposta));
    return todosPagamentos.filter(p => propostasValidas.has(p.proposta));
  }, [todosPagamentos, vendasFiltradas]);

  // Calcular métricas de permanência baseadas nos dados filtrados
  const permanenciaMetricsFiltradas = useMemo(() => {
    if (filtroMesPermanencia.length === 0 && filtroAnoPermanencia.length === 0) {
      return permanenciaMetrics; // Sem filtros, usa métricas originais
    }

    let adimplentes = 0;
    let inadimplentes = 0;
    let cancelados = 0;

    pagamentosFiltrados.forEach(pagamento => {
      if (pagamento.status_pacote === 'C') {
        cancelados++;
      } else if (pagamento.status_pacote === 'S') {
        inadimplentes++;
      } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
        adimplentes++;
      } else if (pagamento.passo === '0' || pagamento.passo === '1') {
        adimplentes++;
      } else if (pagamento.status_pacote === 'NC') {
        adimplentes++;
      } else {
        inadimplentes++;
      }
    });

    const total = adimplentes + inadimplentes + cancelados;

    return {
      total_clientes: total,
      adimplentes,
      inadimplentes,
      cancelados,
      percentual_adimplentes: total > 0 ? (adimplentes / total) * 100 : 0,
      percentual_inadimplentes: total > 0 ? (inadimplentes / total) * 100 : 0,
      percentual_cancelados: total > 0 ? (cancelados / total) * 100 : 0,
    };
  }, [pagamentosFiltrados, permanenciaMetrics, filtroMesPermanencia, filtroAnoPermanencia]);
  
  // Obter valores únicos para os filtros
  const siglas = useMemo(() => {
    const valores = new Set<string>();
    // Usar vendas filtradas pelos filtros de permanência se houver filtros aplicados
    const vendasParaUsar = (filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) ? vendasFiltradas : vendas;
    
    vendasParaUsar.forEach(venda => {
      const agrupamento = venda.agrupamento_produto || '';
      const produto = venda.produto_principal || '';
      
      if (agrupamento.includes('POS')) valores.add('POS');
      if (agrupamento.includes('BL-DGO')) valores.add('BL-DGO');
      if (produto.includes('POS')) valores.add('POS');
      if (produto.includes('BL-DGO')) valores.add('BL-DGO');
    });
    return Array.from(valores);
  }, [vendas, vendasFiltradas, filtroMesPermanencia, filtroAnoPermanencia]);
  
  const vendedoresUnicos = useMemo(() => {
    const valores = new Set<string>();
    // Usar vendas filtradas pelos filtros de permanência se houver filtros aplicados
    const vendasParaUsar = (filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) ? vendasFiltradas : vendas;
    
    vendasParaUsar.forEach(venda => {
      if (venda.nome_proprietario) valores.add(venda.nome_proprietario);
    });
    return Array.from(valores).sort(); // Ordenar alfabeticamente
  }, [vendas, vendasFiltradas, filtroMesPermanencia, filtroAnoPermanencia]);
  
  const passosUnicos = useMemo(() => {
    const valores = new Set<string>();
    // Garantir que '0' esteja na lista
    valores.add('0');
    todosPagamentos.forEach(pagamento => {
      if (pagamento.passo) valores.add(pagamento.passo);
    });
    // Ordenar do maior para o menor (com tratamento para valores numéricos)
    return Array.from(valores).sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numB - numA; // Ordem decrescente
    });
  }, [todosPagamentos]);
  
  const statusUnicos = useMemo(() => {
    const valores = new Set<string>();
    // Adicionar status dos pagamentos regulares e inclusões
    todosPagamentos.forEach(pagamento => {
      if (pagamento.status_pacote) valores.add(pagamento.status_pacote);
    });
    return Array.from(valores);
  }, [todosPagamentos]);
  
  const datasHabilitacaoUnicas = useMemo(() => {
    const valores = new Set<string>();
    // Usar vendas filtradas pelos filtros de permanência se houver filtros aplicados
    const vendasParaUsar = (filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) ? vendasFiltradas : vendas;
    
    vendasParaUsar.forEach(venda => {
      if (venda.data_habilitacao) {
        // Normalizar a data para o formato YYYY-MM-DD
        const dataHabilitacao = new Date(venda.data_habilitacao);
        const dataFormatada = dataHabilitacao.toISOString().split('T')[0];
        valores.add(dataFormatada);
      }
    });
    // Ordenar do mais antigo para o mais recente
    return Array.from(valores).sort((a, b) => {
      const dataA = new Date(a);
      const dataB = new Date(b);
      return dataA.getTime() - dataB.getTime(); // Ordem crescente (mais antigo primeiro)
    });
  }, [vendas, vendasFiltradas, filtroMesPermanencia, filtroAnoPermanencia]);

  // Obter meses únicos de permanência (baseado nas datas de habilitação + 4 meses)
  const mesesPermanenciaUnicos = useMemo(() => {
    const valores = new Set<string>();
    vendas.forEach(venda => {
      if (venda.data_habilitacao) {
        const mesPermanencia = calcularMesPermanencia(venda.data_habilitacao);
        valores.add(mesPermanencia);
      }
    });
    // Ordenar por ordem natural dos meses
    const ordenMeses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return Array.from(valores).sort((a, b) => {
      return ordenMeses.indexOf(a) - ordenMeses.indexOf(b);
    });
  }, [vendas, calcularMesPermanencia]);

  // Obter anos únicos de permanência (baseado nas datas de habilitação + 4 meses)
  const anosPermanenciaUnicos = useMemo(() => {
    const valores = new Set<number>();
    vendas.forEach(venda => {
      if (venda.data_habilitacao) {
        const anoPermanencia = calcularAnoPermanencia(venda.data_habilitacao);
        valores.add(anoPermanencia);
      }
    });
    // Ordenar do mais antigo para o mais recente
    return Array.from(valores).sort((a, b) => a - b);
  }, [vendas, calcularAnoPermanencia]);
  
  // Gerar opções de faixas de dias corridos para o filtro
  const faixasDiasCorridos = useMemo(() => {
    return obterFaixasDiasCorridos();
  }, [obterFaixasDiasCorridos]);
  
  // Função para formatar data para exibição
  const formatarDataParaExibicao = useCallback((dataString: string): string => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  }, []);
  
  // Função para identificar a sigla de um produto
  const getSigla = useCallback((venda: Venda): string => {
    const agrupamento = venda.agrupamento_produto || '';
    const produto = venda.produto_principal || '';
    
    if (agrupamento.includes('POS') || produto.includes('POS')) return 'POS';
    if (agrupamento.includes('BL-DGO') || produto.includes('BL-DGO')) return 'BL-DGO';
    
    return '';
  }, []);
  
  // Mapear pagamentos por número de proposta para facilitar acesso
  const pagamentosPorProposta = useMemo(() => {
    // Criar mapa com todos os pagamentos (incluindo inclusões)
    const map = new Map<string, PrimeiroPagamento>();
    
    // Adicionar todos os pagamentos (regulares e inclusões)
    todosPagamentos.forEach(pagamento => {
      map.set(pagamento.proposta, pagamento);
    });
    
    return map;
  }, [todosPagamentos]);

  // Filtrar vendas baseado nos outros filtros (exceto cidade e bairro) para cascata
  const vendasParaCascata = useMemo(() => {
    // Primeiro, filtrar apenas propostas POS e BL-DGO
    const todasPropostas = vendas.filter(venda => {
      const agrupamento = venda.agrupamento_produto || '';
      const produto = venda.produto_principal || '';
      
      return (
        agrupamento.includes('POS') || 
        agrupamento.includes('BL-DGO') ||
        produto.includes('POS') || 
        produto.includes('BL-DGO')
      );
    });

    // Aplicar filtros (exceto cidade e bairro)
    return todasPropostas.filter(venda => {
      const sigla = getSigla(venda);
      const pagamento = pagamentosPorProposta.get(venda.numero_proposta);
      
      // Verificar cada filtro (exceto cidade e bairro)
      if (filtroSigla.length > 0 && !filtroSigla.includes(sigla)) return false;
      if (filtroVendedor && filtroVendedor !== '_all' && venda.nome_proprietario !== filtroVendedor) return false;
      
      // Lógica especial para o filtro de passo
      if (filtroPasso.length > 0) {
        if (!pagamento) return false;
        
        if (filtroPasso.includes('0') && (!pagamento.passo || pagamento.passo === '0' || pagamento.passo === '')) {
          // Permitir este item
        } 
        else if (!filtroPasso.includes(pagamento.passo)) {
          return false;
        }
      }
      
      if (filtroStatus.length > 0 && (!pagamento || !filtroStatus.includes(pagamento.status_pacote))) return false;
      
      // Verificar filtro de data de habilitação
      if (filtroDataHabilitacao.length > 0 && venda.data_habilitacao) {
        const dataHabilitacao = new Date(venda.data_habilitacao);
        const dataFormatada = dataHabilitacao.toISOString().split('T')[0];
        
        if (!filtroDataHabilitacao.includes(dataFormatada)) return false;
      }
      
      // Verificar filtro de dias corridos
      if (filtroDiasCorridos.length > 0 && venda.data_habilitacao) {
        const diasCorridos = calcularDiasCorridos(venda.data_habilitacao);
        const dentroDeAlgumaFaixa = filtroDiasCorridos.some(faixa => 
          verificarDiasDentroFaixa(diasCorridos, faixa)
        );
        
        if (!dentroDeAlgumaFaixa) return false;
      }

      // Aplicar filtro de busca
      if (termoBusca.trim() !== "") {
        const busca = termoBusca.toLowerCase();
        const numeroProposta = venda.numero_proposta?.toLowerCase() || "";
        const cpf = venda.cpf?.toLowerCase() || "";
        const nomeFantasia = venda.nome_fantasia?.toLowerCase() || "";
        const produtoPrincipal = venda.produto_principal?.toLowerCase() || "";
        const nomeProprietario = venda.nome_proprietario?.toLowerCase() || "";
        const telefoneCelular = venda.telefone_celular?.toLowerCase() || "";
        
        const contemTermoBusca = 
          numeroProposta.includes(busca) || 
          cpf.includes(busca) || 
          nomeFantasia.includes(busca) || 
          produtoPrincipal.includes(busca) || 
          nomeProprietario.includes(busca) ||
          telefoneCelular.includes(busca) ||
          sigla.toLowerCase().includes(busca);
        
        if (!contemTermoBusca) return false;
      }
      
      return true;
    });
  }, [
    vendas, 
    pagamentosPorProposta, 
    filtroSigla, 
    filtroVendedor, 
    filtroPasso, 
    filtroStatus, 
    filtroDataHabilitacao, 
    filtroDiasCorridos, 
    getSigla, 
    calcularDiasCorridos, 
    verificarDiasDentroFaixa,
    termoBusca
  ]);

  // Calcular cidades e bairros únicos baseados nos dados filtrados para cascata
  const cidadesUnicas = useMemo(() => {
    const valores = new Set<string>();
    vendasParaCascata.forEach(venda => {
      if (venda.cidade && venda.cidade.trim() !== '') {
        valores.add(venda.cidade.trim().toUpperCase());
      }
    });
    return Array.from(valores).sort();
  }, [vendasParaCascata]);

  const bairrosUnicos = useMemo(() => {
    const valores = new Set<string>();
    vendasParaCascata.forEach(venda => {
      if (venda.bairro && venda.bairro.trim() !== '') {
        valores.add(venda.bairro.trim().toUpperCase());
      }
    });
    return Array.from(valores).sort();
  }, [vendasParaCascata]);
  
  // Filtrar propostas com base nos critérios selecionados
  const propostasFiltradas = useMemo(() => {
    // Primeiro, filtrar apenas propostas POS e BL-DGO
    const todasPropostas = vendas.filter(venda => {
      const agrupamento = venda.agrupamento_produto || '';
      const produto = venda.produto_principal || '';
      
      return (
        agrupamento.includes('POS') || 
        agrupamento.includes('BL-DGO') ||
        produto.includes('POS') || 
        produto.includes('BL-DGO')
      );
    });
    
    // Aplicar filtros adicionais
    const filtradas = todasPropostas.filter(venda => {
      const sigla = getSigla(venda);
      const pagamento = pagamentosPorProposta.get(venda.numero_proposta);
      
      // Verificar cada filtro
      if (filtroSigla.length > 0 && !filtroSigla.includes(sigla)) return false;
      if (filtroVendedor && filtroVendedor !== '_all' && venda.nome_proprietario !== filtroVendedor) return false;
      
      // Lógica especial para o filtro de passo
      if (filtroPasso.length > 0) {
        if (!pagamento) return false;
        
        // Se o filtro contém '0' e o pagamento tem passo vazio ou '0', permitir
        if (filtroPasso.includes('0') && (!pagamento.passo || pagamento.passo === '0' || pagamento.passo === '')) {
          // Permitir este item
        } 
        // Caso contrário, verificar se o passo do pagamento está nos filtros selecionados
        else if (!filtroPasso.includes(pagamento.passo)) {
          return false;
        }
      }
      
      if (filtroStatus.length > 0 && (!pagamento || !filtroStatus.includes(pagamento.status_pacote))) return false;
      
      // Verificar filtro de data de habilitação
      if (filtroDataHabilitacao.length > 0 && venda.data_habilitacao) {
        // Normalizar a data para o formato YYYY-MM-DD
        const dataHabilitacao = new Date(venda.data_habilitacao);
        const dataFormatada = dataHabilitacao.toISOString().split('T')[0];
        
        if (!filtroDataHabilitacao.includes(dataFormatada)) return false;
      }
      
      // Verificar filtro de dias corridos
      if (filtroDiasCorridos.length > 0 && venda.data_habilitacao) {
        const diasCorridos = calcularDiasCorridos(venda.data_habilitacao);
        // Verificar se o número de dias corridos está em alguma das faixas selecionadas
        const dentroDeAlgumaFaixa = filtroDiasCorridos.some(faixa => 
          verificarDiasDentroFaixa(diasCorridos, faixa)
        );
        
        if (!dentroDeAlgumaFaixa) return false;
      }

      // Verificar filtro de cidade
      if (filtroCidade.length > 0 && venda.cidade) {
        const cidadeNormalizada = venda.cidade.trim().toUpperCase();
        if (!filtroCidade.includes(cidadeNormalizada)) return false;
      }

      // Verificar filtro de bairro
      if (filtroBairro.length > 0 && venda.bairro) {
        const bairroNormalizado = venda.bairro.trim().toUpperCase();
        if (!filtroBairro.includes(bairroNormalizado)) return false;
      }

      // Verificar filtro de mês de permanência
      if (filtroMesPermanencia.length > 0 && venda.data_habilitacao) {
        const mesPermanencia = calcularMesPermanencia(venda.data_habilitacao);
        if (!filtroMesPermanencia.includes(mesPermanencia)) return false;
      }

      // Verificar filtro de ano de permanência
      if (filtroAnoPermanencia.length > 0 && venda.data_habilitacao) {
        const anoPermanencia = calcularAnoPermanencia(venda.data_habilitacao);
        if (!filtroAnoPermanencia.includes(anoPermanencia.toString())) return false;
      }
      
      // Aplicar filtro de busca
      if (termoBusca.trim() !== "") {
        const busca = termoBusca.toLowerCase();
        const numeroProposta = venda.numero_proposta?.toLowerCase() || "";
        const cpf = venda.cpf?.toLowerCase() || "";
        const nomeFantasia = venda.nome_fantasia?.toLowerCase() || "";
        const produtoPrincipal = venda.produto_principal?.toLowerCase() || "";
        const nomeProprietario = venda.nome_proprietario?.toLowerCase() || "";
        const telefoneCelular = venda.telefone_celular?.toLowerCase() || "";
        
        // Verificar se algum dos campos contém o termo de busca
        const contemTermoBusca = 
          numeroProposta.includes(busca) || 
          cpf.includes(busca) || 
          nomeFantasia.includes(busca) || 
          produtoPrincipal.includes(busca) || 
          nomeProprietario.includes(busca) ||
          telefoneCelular.includes(busca) ||
          sigla.toLowerCase().includes(busca);
        
        if (!contemTermoBusca) return false;
      }
      
      return true;
    });

    // Ordenar por data de importação (mais recentes primeiro)
    return filtradas.sort((a, b) => {
      const pagamentoA = pagamentosPorProposta.get(a.numero_proposta);
      const pagamentoB = pagamentosPorProposta.get(b.numero_proposta);
      
      // Se não tiver pagamento, considerar como mais antigo
      if (!pagamentoA) return 1;
      if (!pagamentoB) return -1;
      
      // Se não tiver data de importação, considerar como mais antigo
      if (!pagamentoA.data_importacao) return 1;
      if (!pagamentoB.data_importacao) return -1;
      
      // Comparar datas de importação (mais recentes primeiro)
      return new Date(pagamentoB.data_importacao).getTime() - new Date(pagamentoA.data_importacao).getTime();
    });
  }, [
    vendas, 
    pagamentosPorProposta, 
    filtroSigla, 
    filtroVendedor, 
    filtroPasso, 
    filtroStatus, 
    filtroDataHabilitacao, 
    filtroDiasCorridos, 
    filtroCidade, 
    filtroBairro, 
    filtroMesPermanencia,
    filtroAnoPermanencia,
    getSigla, 
    calcularDiasCorridos, 
    verificarDiasDentroFaixa,
    calcularMesPermanencia,
    calcularAnoPermanencia,
    termoBusca
  ]);
  
  // Ordenar as propostas filtradas por data de importação (mais recentes primeiro)
  const propostasOrdenadasPorDataImportacao = useMemo(() => {
    return [...propostasFiltradas].sort((a, b) => {
      const pagamentoA = pagamentosPorProposta.get(a.numero_proposta);
      const pagamentoB = pagamentosPorProposta.get(b.numero_proposta);
      
      // Se não tiver pagamento, considerar como mais antigo
      if (!pagamentoA) return 1;
      if (!pagamentoB) return -1;
      
      // Se não tiver data de importação, considerar como mais antigo
      if (!pagamentoA.data_importacao) return 1;
      if (!pagamentoB.data_importacao) return -1;
      
      // Comparar datas de importação (mais recentes primeiro)
      return new Date(pagamentoB.data_importacao).getTime() - new Date(pagamentoA.data_importacao).getTime();
    });
  }, [propostasFiltradas, pagamentosPorProposta]);
  
  // Função para filtrar por sigla
  const filtrarPorSigla = useCallback((sigla: string) => {
    // Filtrar vendas pela sigla no agrupamento_produto ou produto_principal
    const vendasFiltradas = vendas.filter(venda => 
      (venda.agrupamento_produto?.includes(sigla) || 
      venda.produto_principal?.includes(sigla))
    );
    
    // Obter números de propostas das vendas filtradas
    const propostasFiltradas = new Set(vendasFiltradas.map(v => v.numero_proposta));
    
    // Filtrar pagamentos pelas propostas encontradas (incluindo inclusões)
    const pagamentosFiltrados = todosPagamentos.filter(p => 
      propostasFiltradas.has(p.proposta)
    );
    
    // Contar por status
    let adimplentes = 0;
    let inadimplentes = 0;
    let cancelados = 0;
    
    pagamentosFiltrados.forEach(pagamento => {
      // Aplicar a nova regra de classificação de clientes
      if (pagamento.status_pacote === 'C') {
        cancelados++;
      } else if (pagamento.status_pacote === 'S') {
        inadimplentes++;
      } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
        adimplentes++;
      } else if (pagamento.passo === '0' || pagamento.passo === '1') {
        adimplentes++;
      } else if (pagamento.status_pacote === 'NC') {
        // Considerar "Não Cobrança" de BL-DGO como clientes ativos (adimplentes)
        adimplentes++;
      } else {
        inadimplentes++;
      }
    });
    
    const total = adimplentes + inadimplentes + cancelados;
    
    return {
      sigla,
      total,
      adimplentes,
      inadimplentes,
      cancelados,
      percentual_adimplentes: total > 0 ? (adimplentes / total) * 100 : 0,
      percentual_inadimplentes: total > 0 ? (inadimplentes / total) * 100 : 0,
      percentual_cancelados: total > 0 ? (cancelados / total) * 100 : 0,
      vendasTotal: vendasFiltradas.length,
      pagamentosTotal: pagamentosFiltrados.length
    };
  }, [vendas, todosPagamentos]);
  
  // Dados para POS e BL-DGO
  const dadosPOS = useMemo(() => filtrarPorSigla("POS"), [filtrarPorSigla]);
  const dadosBLDGO = useMemo(() => filtrarPorSigla("BL-DGO"), [filtrarPorSigla]);
  
  // Total geral combinando ambas as siglas
  const totalGeral = useMemo(() => dadosPOS.total + dadosBLDGO.total, [dadosPOS, dadosBLDGO]);
  const adimplentesGeral = useMemo(() => dadosPOS.adimplentes + dadosBLDGO.adimplentes, [dadosPOS, dadosBLDGO]);
  const inadimplentesGeral = useMemo(() => dadosPOS.inadimplentes + dadosBLDGO.inadimplentes, [dadosPOS, dadosBLDGO]);
  const canceladosGeral = useMemo(() => dadosPOS.cancelados + dadosBLDGO.cancelados, [dadosPOS, dadosBLDGO]);
  
  // Porcentagens para o total geral
  const percentAdimplentesGeral = useMemo(() => totalGeral > 0 ? (adimplentesGeral / totalGeral) * 100 : 0, [adimplentesGeral, totalGeral]);
  const percentInadimplentesGeral = useMemo(() => totalGeral > 0 ? (inadimplentesGeral / totalGeral) * 100 : 0, [inadimplentesGeral, totalGeral]);
  const percentCanceladosGeral = useMemo(() => totalGeral > 0 ? (canceladosGeral / totalGeral) * 100 : 0, [canceladosGeral, totalGeral]);
  
  // Função para obter a cor do badge de status
  const getStatusBadgeVariant = useCallback((status: string, vencimentoFatura?: string): "default" | "outline" | "destructive" | "secondary" => {
    if (status === 'C') return 'destructive'; // Cancelado - Vermelho
    if (status === 'S') return 'outline'; // Amarelo (usando outline e vai ser modificado com classe)
    if (status === 'N') return 'default'; // Verde (usando default e vai ser modificado com classe)
    if (status === 'I') return 'secondary'; // Inclusão - Rosa
    
    return 'default';
  }, []);

  // Criar opções para os filtros no formato esperado pelo MultiSelect
  const siglasOptions = useMemo(() => siglas.map(sigla => ({
    label: sigla,
    value: sigla
  })), [siglas]);
  
  const vendedorOptions = useMemo(() => [
    { label: "Todos os Vendedores", value: "_all" },
    ...vendedoresUnicos.map(vendedor => ({
      label: vendedor,
      value: vendedor
    }))
  ], [vendedoresUnicos]);
  
  const passoOptions = useMemo(() => passosUnicos.map(passo => ({
    label: passo === "0" ? "0 (sem cobrança)" : passo,
    value: passo
  })), [passosUnicos]);
  
  const statusOptions = useMemo(() => statusUnicos.map(status => ({
    label: status,
    value: status
  })), [statusUnicos]);
  
  const diasCorridosOptions = useMemo(() => faixasDiasCorridos.map(faixa => ({
    label: faixa,
    value: faixa
  })), [faixasDiasCorridos]);
  
  const datasHabilitacaoOptions = useMemo(() => datasHabilitacaoUnicas.map(data => ({
    label: formatarDataParaExibicao(data),
    value: data
  })), [datasHabilitacaoUnicas, formatarDataParaExibicao]);

  const cidadeOptions = useMemo(() => cidadesUnicas.map(cidade => ({
    label: cidade,
    value: cidade
  })), [cidadesUnicas]);

  const bairroOptions = useMemo(() => bairrosUnicos.map(bairro => ({
    label: bairro,
    value: bairro
  })), [bairrosUnicos]);

  // Opções para os filtros de Mês e Ano de Permanência
  const mesOptions = useMemo(() => mesesPermanenciaUnicos.map(mes => ({
    label: mes,
    value: mes
  })), [mesesPermanenciaUnicos]);

  const anoOptions = useMemo(() => anosPermanenciaUnicos.map(ano => ({
    label: ano.toString(),
    value: ano.toString()
  })), [anosPermanenciaUnicos]);

  // Limpar filtros de cidade e bairro quando as opções não estão mais disponíveis
  useEffect(() => {
    // Filtrar cidades selecionadas que ainda estão disponíveis
    const cidadesDisponiveis = cidadesUnicas;
    const cidadesFiltradas = filtroCidade.filter(cidade => cidadesDisponiveis.includes(cidade));
    
    if (cidadesFiltradas.length !== filtroCidade.length) {
      setFiltroCidade(cidadesFiltradas);
    }
  }, [cidadesUnicas, filtroCidade]);

  useEffect(() => {
    // Filtrar bairros selecionados que ainda estão disponíveis
    const bairrosDisponiveis = bairrosUnicos;
    const bairrosFiltrados = filtroBairro.filter(bairro => bairrosDisponiveis.includes(bairro));
    
    if (bairrosFiltrados.length !== filtroBairro.length) {
      setFiltroBairro(bairrosFiltrados);
    }
  }, [bairrosUnicos, filtroBairro]);

  // Limpar filtro de data de habilitação quando filtros de permanência mudam
  useEffect(() => {
    // Filtrar datas de habilitação selecionadas que ainda estão disponíveis
    const datasDisponiveis = datasHabilitacaoUnicas;
    const datasFiltradas = filtroDataHabilitacao.filter(data => datasDisponiveis.includes(data));
    
    if (datasFiltradas.length !== filtroDataHabilitacao.length) {
      setFiltroDataHabilitacao(datasFiltradas);
    }
  }, [datasHabilitacaoUnicas, filtroDataHabilitacao]);
  
  return (
    <>
      {/* Filtros de Mês e Ano de Permanência */}
      <div className="mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filtros de Permanência</CardTitle>
            <CardDescription>
              Filtre por período de permanência (vendas + 4 meses)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label htmlFor="filtro-mes-permanencia" className="text-xs">Mês de Permanência</Label>
                <MultiSelect 
                  options={mesOptions} 
                  selected={filtroMesPermanencia}
                  onChange={(values) => setFiltroMesPermanencia(values)}
                  placeholder="Selecione meses"
                  className="w-full text-xs min-w-[200px]"
                />
              </div>
              
              <div>
                <Label htmlFor="filtro-ano-permanencia" className="text-xs">Ano de Permanência</Label>
                <MultiSelect 
                  options={anoOptions} 
                  selected={filtroAnoPermanencia}
                  onChange={(values) => setFiltroAnoPermanencia(values)}
                  placeholder="Selecione anos"
                  className="w-full text-xs min-w-[150px]"
                />
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiltroMesPermanencia([]);
                    setFiltroAnoPermanencia([]);
                  }}
                  disabled={filtroMesPermanencia.length === 0 && filtroAnoPermanencia.length === 0}
                  className="h-10 px-3"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
            
            {(filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) && (
              <div className="mt-3 p-2 bg-blue-50 rounded-md">
                <p className="text-xs text-blue-700">
                  <strong>Lógica dos filtros:</strong> Vendas de <em>Fevereiro</em> refletem permanência em <em>Junho</em> (data de habilitação + 4 meses)
                  <br />
                  <strong>Múltiplas seleções:</strong> Você pode selecionar vários meses e anos para comparar diferentes períodos
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verificar se AMBOS os filtros de permanência estão selecionados */}
      {(filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Primeira card com métrica geral */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Permanência de Clientes</CardTitle>
              <CardDescription>
                Visão geral da permanência de clientes ativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{permanenciaMetricsFiltradas.percentual_adimplentes.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Adimplentes</div>
                  <div className="text-sm font-medium mt-1">{permanenciaMetricsFiltradas.adimplentes}</div>
              </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{permanenciaMetricsFiltradas.percentual_inadimplentes.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Inadimplentes</div>
                  <div className="text-sm font-medium mt-1">{permanenciaMetricsFiltradas.inadimplentes}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{permanenciaMetricsFiltradas.percentual_cancelados.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Cancelados</div>
                  <div className="text-sm font-medium mt-1">{permanenciaMetricsFiltradas.cancelados}</div>
                </div>
              </div>
              
              <div className="mt-4">
                <Progress value={permanenciaMetricsFiltradas.percentual_adimplentes} className="h-2 mb-1" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total de Clientes: {permanenciaMetricsFiltradas.total_clientes}</span>
                  <span>Ativos: {permanenciaMetricsFiltradas.adimplentes + permanenciaMetricsFiltradas.inadimplentes}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Quadro de Permanência POS */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  Permanência POS
                </div>
              </CardTitle>
              <CardDescription>
                Informações de permanência para serviços POS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PermanenciaPorTipoServico sigla="POS" datasHabilitacaoFiltradas={filtroDataHabilitacao} vendasFiltradas={vendasFiltradas} />
            </CardContent>
          </Card>
          
          {/* Quadro de Permanência Fibra */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  Permanência Fibra
                </div>
              </CardTitle>
              <CardDescription>
                Informações de permanência para serviços FIBRA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PermanenciaPorTipoServico sigla="BL-DGO" datasHabilitacaoFiltradas={filtroDataHabilitacao} vendasFiltradas={vendasFiltradas} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mb-6">
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione os Filtros de Permanência</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Para visualizar os dados de permanência, selecione <strong>pelo menos um mês E um ano</strong> nos filtros acima.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Quadro de Vendas por Cidade - só exibir se ambos os filtros estiverem aplicados */}
      {(filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) && (
        <div className="mb-6">
          <VendasInstaladasPorCidade 
            vendasFiltradas={propostasFiltradas} 
            titulo="Vendas Instaladas por Cidade - Mês da Permanência" 
          />
        </div>
      )}
      
      {/* Tabela de detalhamento - só exibir se ambos os filtros estiverem aplicados */}
      {(filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento de Propostas</CardTitle>
            <CardDescription>
              Lista de propostas com detalhes de permanência e status de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
          {/* Filtros */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative">
                <Label htmlFor="busca" className="text-xs">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="busca"
                    placeholder="Buscar propostas..."
                    className="pl-8 w-[200px]"
                    value={termoBusca}
                    onChange={(e) => {
                      setTermoBusca(e.target.value);
                      setPaginaAtual(1);
                    }}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="filtro-sigla" className="text-xs">Sigla (múltipla)</Label>
                <MultiSelect 
                  options={siglasOptions} 
                  selected={filtroSigla}
                  onChange={(values) => setFiltroSigla(values)}
                  placeholder="Selecione siglas"
                  className="w-full text-xs"
                />
              </div>
              
              <div>
                <Label htmlFor="filtro-vendedor" className="text-xs">Vendedor</Label>
                <select
                  id="filtro-vendedor"
                  value={filtroVendedor}
                  onChange={(e) => setFiltroVendedor(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {vendedorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="filtro-passo" className="text-xs">Passo Cobrança (múltiplo)</Label>
                <MultiSelect 
                  options={passoOptions} 
                  selected={filtroPasso}
                  onChange={(values) => setFiltroPasso(values)}
                  placeholder="Selecione passos"
                  className="w-full text-xs"
                />
          </div>
          
              <div>
                <Label htmlFor="filtro-status" className="text-xs">Status Pagamento (múltiplo)</Label>
                <MultiSelect 
                  options={statusOptions} 
                  selected={filtroStatus}
                  onChange={(values) => setFiltroStatus(values)}
                  placeholder="Selecione status"
                  className="w-full text-xs"
                />
              </div>
              
              <div>
                <Label htmlFor="filtro-data-habilitacao" className="text-xs">Data Habilitação (múltipla)</Label>
                <MultiSelect 
                  options={datasHabilitacaoOptions} 
                  selected={filtroDataHabilitacao}
                  onChange={(values) => setFiltroDataHabilitacao(values)}
                  placeholder="Selecione datas"
                  className="w-full text-xs"
                />
              </div>
              
              <div>
                <Label htmlFor="filtro-dias-corridos" className="text-xs">Dias Corridos (múltiplo)</Label>
                <MultiSelect 
                  options={diasCorridosOptions} 
                  selected={filtroDiasCorridos}
                  onChange={(values) => setFiltroDiasCorridos(values)}
                  placeholder="Selecione faixas"
                  className="w-full text-xs"
                />
              </div>

              <div>
                <Label htmlFor="filtro-cidade" className="text-xs">Cidade (múltipla)</Label>
                <MultiSelect 
                  options={cidadeOptions} 
                  selected={filtroCidade}
                  onChange={(values) => setFiltroCidade(values)}
                  placeholder="Selecione cidades"
                  className="w-full text-xs"
                />
              </div>

              <div>
                <Label htmlFor="filtro-bairro" className="text-xs">Bairro (múltiplo)</Label>
                <MultiSelect 
                  options={bairroOptions} 
                  selected={filtroBairro}
                  onChange={(values) => setFiltroBairro(values)}
                  placeholder="Selecione bairros"
                  className="w-full text-xs"
                />
              </div>
              
              {/* Botões de aplicar/limpar filtros */}
              <div className="flex justify-end items-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTermoBusca("");
                    setFiltroSigla([]);
                    setFiltroVendedor("_all");
                    setFiltroPasso([]);
                    setFiltroStatus([]);
                    setFiltroDataHabilitacao([]);
                    setFiltroDiasCorridos([]);
                    setFiltroCidade([]);
                    setFiltroBairro([]);
                    setPaginaAtual(1);
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </div>
          
          {/* Contador de registros */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-medium">
              Total de registros: <span className="font-bold">{propostasFiltradas.length}</span>
            </div>
            {(filtroSigla.length > 0 || (filtroVendedor && filtroVendedor !== '_all') || 
              filtroPasso.length > 0 || filtroStatus.length > 0 || 
              filtroDataHabilitacao.length > 0 || filtroDiasCorridos.length > 0 ||
              filtroCidade.length > 0 || filtroBairro.length > 0) && (
              <div className="text-xs text-muted-foreground">
                * Filtros aplicados
            </div>
          )}
          </div>
          
          {/* Legenda dos status */}
          <div className="flex flex-wrap gap-3 mb-4 p-2 bg-muted/20 rounded-md">
            <div className="text-sm font-medium mr-2">Status de Pagamento:</div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-600 mr-1"></div>
              <span className="text-xs">N - Normal (Cliente Ativo)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
              <span className="text-xs">S - Suspenso (Inadimplente)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-600 mr-1"></div>
              <span className="text-xs">C - Cancelado</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-pink-500 mr-1"></div>
              <span className="text-xs">NC - Não Cobrança (Cliente FIBRA com informação no sirius mas sem cobrança no arquivo Primeiro Pagamento)</span>
            </div>
          </div>
          
          {/* Tabela de propostas */}
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs p-2 font-medium">Proposta</TableHead>
                  <TableHead className="text-xs p-2 font-medium">CPF</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Nome Fantasia</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Telefone</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Cidade</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Bairro</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Sigla</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Produto</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Vendedor</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Data Habilitação</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Dias Corridos</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Status</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Passo</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Vencimento da Fatura</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Data da Importação</TableHead>
                  <TableHead className="text-xs p-2 font-medium">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propostasFiltradas.length > 0 ? (
                  // Aplicar paginação para exibir apenas os itens da página atual
                  propostasFiltradas
                    .slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina)
                    .map((proposta, index) => {
                    const pagamento = pagamentosPorProposta.get(proposta.numero_proposta);
                    const sigla = getSigla(proposta);
                    const diasCorridos = proposta.data_habilitacao ? calcularDiasCorridos(proposta.data_habilitacao) : 0;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell className="text-xs p-2 font-medium">{proposta.numero_proposta}</TableCell>
                        <TableCell className="text-xs p-2">{proposta.cpf || "-"}</TableCell>
                        <TableCell className="text-xs p-2">{proposta.nome_fantasia || "-"}</TableCell>
                        <TableCell className="text-xs p-2">{proposta.telefone_celular || "-"}</TableCell>
                        <TableCell className="text-xs p-2">{proposta.cidade || "-"}</TableCell>
                        <TableCell className="text-xs p-2">{proposta.bairro || "-"}</TableCell>
                        <TableCell className="text-xs p-2">{sigla}</TableCell>
                        <TableCell className="text-xs p-2">{proposta.produto_principal}</TableCell>
                        <TableCell className="text-xs p-2">{proposta.nome_proprietario}</TableCell>
                        <TableCell className="text-xs p-2">
                          {proposta.data_habilitacao ? formatarDataParaExibicao(proposta.data_habilitacao) : '-'}
                        </TableCell>
                        <TableCell className="text-xs p-2">
                          {proposta.data_habilitacao ? diasCorridos : '-'}
                        </TableCell>
                        <TableCell className="text-xs p-2">
                          {pagamento ? (
                            <Badge 
                              variant={getStatusBadgeVariant(
                                pagamento.status_pacote, 
                                pagamento.vencimento_fatura
                              )}
                              className={
                                pagamento.status_pacote === 'C' ? 'bg-red-600 hover:bg-red-700' : 
                                pagamento.status_pacote === 'S' ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500' : 
                                pagamento.status_pacote === 'N' ? 'bg-green-600 hover:bg-green-700' : 
                                pagamento.status_pacote === 'NC' ? 'bg-pink-500 hover:bg-pink-600' : ''
                              }
                            >
                              {pagamento.status_pacote}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs p-2">
                          {pagamento ? (pagamento.passo === '0' ? '0' : pagamento.passo || '0') : '-'}
                        </TableCell>
                        <TableCell className="text-xs p-2">
                          {pagamento && pagamento.vencimento_fatura ? formatarDataParaExibicao(pagamento.vencimento_fatura) : '-'}
                        </TableCell>
                        <TableCell className="text-xs p-2">
                          {pagamento && pagamento.data_importacao ? formatarDataParaExibicao(pagamento.data_importacao) : '-'}
                        </TableCell>
                                                                            <TableCell className="text-xs p-2">                            {proposta.telefone_celular ? (                              <a                                 href={gerarLinkWhatsApp(proposta.telefone_celular || "", proposta.nome_fantasia || "", proposta.produto_principal || "")}                                target="_blank"                                rel="noreferrer"                              >                                <Button                                  variant="outline"                                  size="icon"                                  className="h-6 w-6 bg-green-500 hover:bg-green-600 border-green-500 hover:border-green-600"                                  title="Enviar mensagem WhatsApp"                                >                                  <MessageCircle className="h-3 w-3 text-white" />                                </Button>                              </a>                            ) : (                              <Button                                variant="outline"                                size="icon"                                className="h-6 w-6 opacity-50 cursor-not-allowed"                                disabled                                title="Telefone não disponível"                              >                                <MessageCircle className="h-3 w-3" />                              </Button>                            )}                          </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-4 text-muted-foreground">
                      Nenhuma proposta encontrada com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Paginação */}
            {propostasFiltradas.length > itensPorPagina && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {Math.min(propostasFiltradas.length, (paginaAtual - 1) * itensPorPagina + 1)}-
                  {Math.min(propostasFiltradas.length, paginaAtual * itensPorPagina)} de {propostasFiltradas.length}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                  >
                    Anterior
                  </Button>
                  
                  {Array.from({ length: Math.min(5, Math.ceil(propostasFiltradas.length / itensPorPagina)) }, (_, i) => {
                    const totalPaginas = Math.ceil(propostasFiltradas.length / itensPorPagina);
                    let numeroPagina;
                    
                    if (totalPaginas <= 5) {
                      // Se há 5 páginas ou menos, mostra todas
                      numeroPagina = i + 1;
                    } else if (paginaAtual <= 3) {
                      // Se está nas primeiras páginas, mostra 1-5
                      numeroPagina = i + 1;
                    } else if (paginaAtual >= totalPaginas - 2) {
                      // Se está nas últimas páginas, mostra as últimas 5
                      numeroPagina = totalPaginas - 4 + i;
                    } else {
                      // Se está no meio, mostra 2 antes e 2 depois da atual
                      numeroPagina = paginaAtual - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={numeroPagina}
                        variant={paginaAtual === numeroPagina ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPaginaAtual(numeroPagina)}
                      >
                        {numeroPagina}
                      </Button>
                    );
                  })}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual(p => Math.min(Math.ceil(propostasFiltradas.length / itensPorPagina), p + 1))}
                    disabled={paginaAtual === Math.ceil(propostasFiltradas.length / itensPorPagina)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}
    </>
  );
}

// Componente separado para o conteúdo da tab Vendedor
function VendedorTabContent() {
  // Estado para controlar a subguia ativa
  const [activeVendedorTab, setActiveVendedorTab] = useState("permanencia");

  return (
    <Tabs value={activeVendedorTab} onValueChange={setActiveVendedorTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="permanencia" className="flex items-center">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Permanência
        </TabsTrigger>
        <TabsTrigger value="desempenho" className="flex items-center">
          <Target className="mr-2 h-4 w-4" />
          Desempenho
        </TabsTrigger>
      </TabsList>

      {/* Subguia Permanência */}
      <TabsContent value="permanencia" className="space-y-4">
        <VendedorPermanenciaContent />
      </TabsContent>

      {/* Subguia Desempenho */}
      <TabsContent value="desempenho" className="space-y-4">
        <VendedorDesempenhoContent />
      </TabsContent>
    </Tabs>
  );
}

// Componente para o conteúdo da subguia Permanência
function VendedorPermanenciaContent() {
  // Obter as métricas e dados de vendedor
  const dataContext = useData();
  const vendedorMetricsData = dataContext.calculateVendedorMetrics();
  const { vendas, primeirosPagamentos } = dataContext;

  // Estados para filtros de Mês e Ano de Permanência
  const [filtroMesPermanencia, setFiltroMesPermanencia] = useState<string[]>([]);
  const [filtroAnoPermanencia, setFiltroAnoPermanencia] = useState<string[]>([]);

  // Função para calcular o mês de permanência (data de habilitação + 4 meses)
  const calcularMesPermanencia = useCallback((dataHabilitacao: string): string => {
    const data = new Date(dataHabilitacao);
    data.setMonth(data.getMonth() + 4); // Adiciona 4 meses
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[data.getMonth()];
  }, []);

  // Função para calcular o ano de permanência (mesmo ano da data de habilitação + 4 meses)
  const calcularAnoPermanencia = useCallback((dataHabilitacao: string): number => {
    const data = new Date(dataHabilitacao);
    data.setMonth(data.getMonth() + 4); // Adiciona 4 meses
    return data.getFullYear();
  }, []);
  
  // Função para identificar a sigla de um produto
  const getSigla = useCallback((venda: Venda): string => {
    const agrupamento = venda.agrupamento_produto || '';
    const produto = venda.produto_principal || '';
    
    if (agrupamento.includes('POS') || produto.includes('POS')) return 'POS';
    if (agrupamento.includes('BL-DGO') || produto.includes('BL-DGO')) return 'BL-DGO';
    
    return '';
  }, []);

  // Filtrar vendas baseado nos filtros de mês e ano de permanência
  const vendasFiltradas = useMemo(() => {
    if (filtroMesPermanencia.length === 0 && filtroAnoPermanencia.length === 0) {
      return vendas; // Sem filtros, retorna todas as vendas
    }

    return vendas.filter(venda => {
      if (!venda.data_habilitacao) return false;

      // Calcular mês e ano de permanência para esta venda
      const mesPermanencia = calcularMesPermanencia(venda.data_habilitacao);
      const anoPermanencia = calcularAnoPermanencia(venda.data_habilitacao);

      // Verificar se está nos filtros selecionados
      const mesMatch = filtroMesPermanencia.length === 0 || filtroMesPermanencia.includes(mesPermanencia);
      const anoMatch = filtroAnoPermanencia.length === 0 || filtroAnoPermanencia.includes(anoPermanencia.toString());

      return mesMatch && anoMatch;
    });
  }, [vendas, filtroMesPermanencia, filtroAnoPermanencia, calcularMesPermanencia, calcularAnoPermanencia]);

  // Gerar opções para os filtros de mês e ano
  const mesesPermanenciaUnicos = useMemo(() => {
    const valores = new Set<string>();
    vendas.forEach(venda => {
      if (venda.data_habilitacao) {
        const mesPermanencia = calcularMesPermanencia(venda.data_habilitacao);
        valores.add(mesPermanencia);
      }
    });
    const mesesOrdem = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return mesesOrdem.filter(mes => valores.has(mes));
  }, [vendas, calcularMesPermanencia]);

  const anosPermanenciaUnicos = useMemo(() => {
    const valores = new Set<number>();
    vendas.forEach(venda => {
      if (venda.data_habilitacao) {
        const anoPermanencia = calcularAnoPermanencia(venda.data_habilitacao);
        valores.add(anoPermanencia);
      }
    });
    return Array.from(valores).sort((a, b) => a - b);
  }, [vendas, calcularAnoPermanencia]);

  // Opções para os filtros de Mês e Ano de Permanência
  const mesOptions = useMemo(() => mesesPermanenciaUnicos.map(mes => ({
    label: mes,
    value: mes
  })), [mesesPermanenciaUnicos]);

  const anoOptions = useMemo(() => anosPermanenciaUnicos.map(ano => ({
    label: ano.toString(),
    value: ano.toString()
  })), [anosPermanenciaUnicos]);
  
  // Função para calcular as métricas por vendedor e sigla
  const calcularMetricasPorVendedorESigla = useCallback(() => {
    // Estrutura para armazenar informações por vendedor
    type MetricasPorSigla = {
      POS: {
        adimplentes: number;
        inadimplentes: number;
        cancelados: number;
        total: number;
        percentual_adimplencia: number;
      };
      "BL-DGO": {
        adimplentes: number;
        inadimplentes: number;
        cancelados: number;
        total: number;
        percentual_adimplencia: number;
      };
    };
    
    const vendedoresMap = new Map<string, {
      id_vendedor: string;
      nome_vendedor: string;
      siglas: MetricasPorSigla;
    }>();
    
    // Se não há vendas ou pagamentos, retorna array vazio
    if (vendasFiltradas.length === 0) {
      return [];
    }
    
    // Inicializar mapa de vendedores com estrutura vazia
    vendasFiltradas.forEach(venda => {
      const id = venda.id_vendedor;
      if (!vendedoresMap.has(id)) {
        vendedoresMap.set(id, {
          id_vendedor: id,
          nome_vendedor: id, // Será atualizado depois
          siglas: {
            POS: {
              adimplentes: 0,
              inadimplentes: 0,
              cancelados: 0,
              total: 0,
              percentual_adimplencia: 0
            },
            "BL-DGO": {
              adimplentes: 0,
              inadimplentes: 0,
              cancelados: 0,
              total: 0,
              percentual_adimplencia: 0
            }
          }
        });
      }
      
      // Atualizar nome se estiver disponível
      const vendedorData = vendedoresMap.get(id)!;
      vendedorData.nome_vendedor = venda.nome_proprietario || id;
    });
    
    // Criar mapa de pagamentos por proposta
    const pagamentosMap = new Map<string, PrimeiroPagamento>();
    primeirosPagamentos.forEach(pagamento => {
      pagamentosMap.set(pagamento.proposta, pagamento);
    });
    
    // Processar todas as vendas para classificar por sigla e status
    vendasFiltradas.forEach(venda => {
      const sigla = getSigla(venda);
      if (sigla === '') return; // Ignorar vendas sem sigla
      
      const vendedorData = vendedoresMap.get(venda.id_vendedor);
      if (!vendedorData) return; // Skip se não tiver vendedor
      
      const pagamento = pagamentosMap.get(venda.numero_proposta);
      
      // Determinar o status do cliente baseado no pagamento
      if (pagamento) {
        if (pagamento.status_pacote === 'C') {
          vendedorData.siglas[sigla].cancelados++;
        } else if (pagamento.status_pacote === 'S') {
          vendedorData.siglas[sigla].inadimplentes++;
        } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
          vendedorData.siglas[sigla].adimplentes++;
        } else if (pagamento.passo === '0' || pagamento.passo === '1') {
          vendedorData.siglas[sigla].adimplentes++;
        } else if (pagamento.status_pacote === 'I') {
          // Considerar inclusões como clientes ativos (adimplentes)
          vendedorData.siglas[sigla].adimplentes++;
        } else {
          vendedorData.siglas[sigla].inadimplentes++;
        }
      } else if (sigla === 'BL-DGO') {
        // BL-DGO sem pagamento é considerado inclusão (adimplente)
        vendedorData.siglas[sigla].adimplentes++;
      }
    });
    
    // Calcular totais e percentuais
    vendedoresMap.forEach(vendedor => {
      ['POS', 'BL-DGO'].forEach(sigla => {
        const dados = vendedor.siglas[sigla];
        dados.total = dados.adimplentes + dados.inadimplentes + dados.cancelados;
        dados.percentual_adimplencia = dados.total > 0 ? (dados.adimplentes / dados.total) * 100 : 0;
      });
    });
    
    // Converter para array
    return Array.from(vendedoresMap.values());
  }, [vendasFiltradas, primeirosPagamentos, getSigla]);
  
  // Calcular métricas
  const vendedoresPorSigla = useMemo(() => calcularMetricasPorVendedorESigla(), [calcularMetricasPorVendedorESigla]);
  
  // Calcular totais por sigla
  const totaisPorSigla = useMemo(() => {
    const totais = {
      POS: {
        total: 0,
        adimplentes: 0,
        inadimplentes: 0,
        cancelados: 0,
        percentual_adimplencia: 0
      },
      "BL-DGO": {
        total: 0,
        adimplentes: 0,
        inadimplentes: 0,
        cancelados: 0,
        percentual_adimplencia: 0
      }
    };

    vendedoresPorSigla.forEach(vendedor => {
      // Totais POS
      totais.POS.total += vendedor.siglas.POS.total;
      totais.POS.adimplentes += vendedor.siglas.POS.adimplentes;
      totais.POS.inadimplentes += vendedor.siglas.POS.inadimplentes;
      totais.POS.cancelados += vendedor.siglas.POS.cancelados;

      // Totais BL-DGO
      totais["BL-DGO"].total += vendedor.siglas["BL-DGO"].total;
      totais["BL-DGO"].adimplentes += vendedor.siglas["BL-DGO"].adimplentes;
      totais["BL-DGO"].inadimplentes += vendedor.siglas["BL-DGO"].inadimplentes;
      totais["BL-DGO"].cancelados += vendedor.siglas["BL-DGO"].cancelados;
    });

    // Calcular percentuais
    totais.POS.percentual_adimplencia = totais.POS.total > 0 ? (totais.POS.adimplentes / totais.POS.total) * 100 : 0;
    totais["BL-DGO"].percentual_adimplencia = totais["BL-DGO"].total > 0 ? (totais["BL-DGO"].adimplentes / totais["BL-DGO"].total) * 100 : 0;

    return totais;
  }, [vendedoresPorSigla]);
  
  // Função para obter a cor do percentual
  const getPercentualColor = useCallback((percentual: number) => {
    if (percentual <= 45.00) return "text-red-600";
    if (percentual < 50.00) return "text-amber-600";
    return "text-green-600";
  }, []);

  // Função para calcular os meses de referência das vendas baseado nos filtros de permanência
  const calcularMesesReferencia = useCallback(() => {
    if (filtroMesPermanencia.length === 0 || filtroAnoPermanencia.length === 0) {
      return '';
    }

    const mesesMap = {
      'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
      'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
    };

    const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const referenciaInfo = filtroMesPermanencia.map(mesPermanencia => {
      const mesIndex = mesesMap[mesPermanencia];
      // Subtrair 4 meses para encontrar o mês de referência das vendas
      let mesReferenciaIndex = mesIndex - 4;
      let anoReferencia = parseInt(filtroAnoPermanencia[0]); // Assumindo que o primeiro ano é a referência

      // Ajustar se o mês de referência for negativo (ano anterior)
      if (mesReferenciaIndex < 0) {
        mesReferenciaIndex += 12;
        anoReferencia -= 1;
      }

      const mesReferencia = mesesNomes[mesReferenciaIndex];
      return `${mesReferencia}/${anoReferencia}`;
    });

    if (referenciaInfo.length === 1) {
      return `(Ref. Vendas: ${referenciaInfo[0]})`;
    } else {
      return `(Ref. Vendas: ${referenciaInfo.join(', ')})`;
    }
  }, [filtroMesPermanencia, filtroAnoPermanencia]);
  
  return (
    <>
      {/* Filtros de Mês e Ano de Permanência */}
      <div className="mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filtros de Permanência</CardTitle>
            <CardDescription>
              Filtre por período de permanência (vendas + 4 meses)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label htmlFor="filtro-mes-permanencia-vendedor" className="text-xs">Mês de Permanência</Label>
                <MultiSelect 
                  options={mesOptions} 
                  selected={filtroMesPermanencia}
                  onChange={(values) => setFiltroMesPermanencia(values)}
                  placeholder="Selecione meses"
                  className="w-full text-xs min-w-[200px]"
                />
              </div>
              
              <div>
                <Label htmlFor="filtro-ano-permanencia-vendedor" className="text-xs">Ano de Permanência</Label>
                <MultiSelect 
                  options={anoOptions} 
                  selected={filtroAnoPermanencia}
                  onChange={(values) => setFiltroAnoPermanencia(values)}
                  placeholder="Selecione anos"
                  className="w-full text-xs min-w-[150px]"
                />
              </div>

              <Button
                variant="outline"
                size="sm" 
                onClick={() => {
                  setFiltroMesPermanencia([]);
                  setFiltroAnoPermanencia([]);
                }}
                disabled={filtroMesPermanencia.length === 0 && filtroAnoPermanencia.length === 0}
                className="h-10"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar Filtros
              </Button>
            </div>

            {(filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) && (
              <div className="mt-3 p-2 bg-blue-50 rounded-md">
                <p className="text-xs text-blue-700">
                  <strong>Lógica dos filtros:</strong> Vendas de <em>Fevereiro</em> refletem permanência em <em>Junho</em> (data de habilitação + 4 meses)
                  <br />
                  <strong>Múltiplas seleções:</strong> Você pode selecionar vários meses e anos para comparar diferentes períodos
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verificar se AMBOS os filtros de permanência estão selecionados */}
      {(filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) ? (
        <>
          {/* Container para os cartões lado a lado */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            {/* Cartão para POS */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  Permanencia Individual - POS {calcularMesesReferencia()}
                </CardTitle>
                <CardDescription className="text-xs">
                  Análise de status de clientes por vendedor para serviços POS
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                  {totaisPorSigla.POS.total > 0 && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg border-l-4 border-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Permanência Geral:</span>
                        <div className="flex items-center space-x-2">
                          <span className={`text-2xl font-bold ${getPercentualColor(totaisPorSigla.POS.percentual_adimplencia)}`}>
                            {totaisPorSigla.POS.percentual_adimplencia.toFixed(2)}%
                          </span>
                          <span className="text-sm text-slate-500 font-medium">
                            ({totaisPorSigla.POS.adimplentes}/{totaisPorSigla.POS.total})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-xs py-2 px-2">ID Vendedor</TableHead>
                        <TableHead className="font-semibold text-xs py-2 px-1 text-center">Total</TableHead>
                        <TableHead className="font-semibold text-xs py-2 px-1 text-center">Adimplentes</TableHead>
                        <TableHead className="font-semibold text-xs py-2 px-1 text-center">Inadimplentes</TableHead>
                        <TableHead className="font-semibold text-xs py-2 px-1 text-center">Cancelados</TableHead>
                        <TableHead className="font-semibold text-xs py-2 px-1 text-center">% Adimplência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendedoresPorSigla.length > 0 ? (
                        vendedoresPorSigla.map((vendedor, index) => (
                          <TableRow key={`pos-${index}`} className="hover:bg-gray-50">
                            <TableCell className="font-medium text-xs py-1 px-2 min-w-[160px]">
                              <div className="whitespace-nowrap">
                                {vendedor.id_vendedor} - {vendedor.nome_vendedor}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium text-xs py-1 px-1">
                              {vendedor.siglas.POS.total}
                            </TableCell>
                            <TableCell className="text-center text-green-600 font-medium text-xs py-1 px-1">
                              {vendedor.siglas.POS.adimplentes}
                            </TableCell>
                            <TableCell className="text-center text-amber-600 font-medium text-xs py-1 px-1">
                              {vendedor.siglas.POS.inadimplentes}
                            </TableCell>
                            <TableCell className="text-center text-red-600 font-medium text-xs py-1 px-1">
                              {vendedor.siglas.POS.cancelados}
                            </TableCell>
                            <TableCell className={`text-center font-bold text-xs py-1 px-1 ${getPercentualColor(vendedor.siglas.POS.percentual_adimplencia)}`}>
                              {vendedor.siglas.POS.percentual_adimplencia.toFixed(2)}%
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-muted-foreground text-xs">
                            Nenhum dado de vendedor disponível para POS
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Linha de total para POS */}
                      {vendedoresPorSigla.length > 0 && totaisPorSigla.POS.total > 0 && (
                        <TableRow className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                          <TableCell className="font-bold text-xs py-2 px-2">
                            TOTAL GERAL
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs py-2 px-1">
                            {totaisPorSigla.POS.total}
                          </TableCell>
                          <TableCell className="text-center text-green-600 font-bold text-xs py-2 px-1">
                            {totaisPorSigla.POS.adimplentes}
                          </TableCell>
                          <TableCell className="text-center text-amber-600 font-bold text-xs py-2 px-1">
                            {totaisPorSigla.POS.inadimplentes}
                          </TableCell>
                          <TableCell className="text-center text-red-600 font-bold text-xs py-2 px-1">
                            {totaisPorSigla.POS.cancelados}
                          </TableCell>
                          <TableCell className={`text-center font-bold text-xs py-2 px-1 ${getPercentualColor(totaisPorSigla.POS.percentual_adimplencia)}`}>
                            {totaisPorSigla.POS.percentual_adimplencia.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Cartão para BL-DGO */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  Permanencia Individual - FIBRA {calcularMesesReferencia()}
                </CardTitle>
                <CardDescription className="text-xs">
                  Análise de status de clientes por vendedor para serviços FIBRA
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                  {totaisPorSigla["BL-DGO"].total > 0 && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg border-l-4 border-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Permanência Geral:</span>
                        <div className="flex items-center space-x-2">
                          <span className={`text-2xl font-bold ${getPercentualColor(totaisPorSigla["BL-DGO"].percentual_adimplencia)}`}>
                            {totaisPorSigla["BL-DGO"].percentual_adimplencia.toFixed(2)}%
                          </span>
                          <span className="text-sm text-slate-500 font-medium">
                            ({totaisPorSigla["BL-DGO"].adimplentes}/{totaisPorSigla["BL-DGO"].total})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-xs py-2 px-2">ID Vendedor</TableHead>
                        <TableHead className="font-semibold text-xs py-2 px-1 text-center">Total</TableHead>
                        <TableHead className="font-semibold text-xs py-2 px-1 text-center">Adimplentes</TableHead>
                        <TableHead className="font-semibold text-xs py-2 px-1 text-center">Inadimplentes</TableHead>
                        <TableHead className="font-semibold text-xs py-2 px-1 text-center">Cancelados</TableHead>
                        <TableHead className="font-semibold text-xs py-2 px-1 text-center">% Adimplência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendedoresPorSigla.length > 0 ? (
                        vendedoresPorSigla.map((vendedor, index) => (
                          <TableRow key={`bldgo-${index}`} className="hover:bg-gray-50">
                            <TableCell className="font-medium text-xs py-1 px-2 min-w-[160px]">
                              <div className="whitespace-nowrap">
                                {vendedor.id_vendedor} - {vendedor.nome_vendedor}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium text-xs py-1 px-1">
                              {vendedor.siglas["BL-DGO"].total}
                            </TableCell>
                            <TableCell className="text-center text-green-600 font-medium text-xs py-1 px-1">
                              {vendedor.siglas["BL-DGO"].adimplentes}
                            </TableCell>
                            <TableCell className="text-center text-amber-600 font-medium text-xs py-1 px-1">
                              {vendedor.siglas["BL-DGO"].inadimplentes}
                            </TableCell>
                            <TableCell className="text-center text-red-600 font-medium text-xs py-1 px-1">
                              {vendedor.siglas["BL-DGO"].cancelados}
                            </TableCell>
                            <TableCell className={`text-center font-bold text-xs py-1 px-1 ${getPercentualColor(vendedor.siglas["BL-DGO"].percentual_adimplencia)}`}>
                              {vendedor.siglas["BL-DGO"].percentual_adimplencia.toFixed(2)}%
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-muted-foreground text-xs">
                            Nenhum dado de vendedor disponível para FIBRA
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Linha de total para FIBRA */}
                      {vendedoresPorSigla.length > 0 && totaisPorSigla["BL-DGO"].total > 0 && (
                        <TableRow className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                          <TableCell className="font-bold text-xs py-2 px-2">
                            TOTAL GERAL
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs py-2 px-1">
                            {totaisPorSigla["BL-DGO"].total}
                          </TableCell>
                          <TableCell className="text-center text-green-600 font-bold text-xs py-2 px-1">
                            {totaisPorSigla["BL-DGO"].adimplentes}
                          </TableCell>
                          <TableCell className="text-center text-amber-600 font-bold text-xs py-2 px-1">
                            {totaisPorSigla["BL-DGO"].inadimplentes}
                          </TableCell>
                          <TableCell className="text-center text-red-600 font-bold text-xs py-2 px-1">
                            {totaisPorSigla["BL-DGO"].cancelados}
                          </TableCell>
                          <TableCell className={`text-center font-bold text-xs py-2 px-1 ${getPercentualColor(totaisPorSigla["BL-DGO"].percentual_adimplencia)}`}>
                            {totaisPorSigla["BL-DGO"].percentual_adimplencia.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de Permanência - Layout Lado a Lado (1:1) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Evolução da Permanência */}
          <PermanenciaTrendChart
            filtroMesPermanencia={filtroMesPermanencia}
            filtroAnoPermanencia={filtroAnoPermanencia}
            vendasFiltradas={vendasFiltradas}
              chartHeight={400}
              containerMaxWidth="none"
            />

            {/* Gráfico de Evolução da Permanência por Vendedor */}
            <VendedorPermanenciaTrendChart
              filtroMesPermanencia={filtroMesPermanencia}
              filtroAnoPermanencia={filtroAnoPermanencia}
              vendasFiltradas={vendasFiltradas}
              chartHeight={400}
              containerMaxWidth="none"
          />
          </div>
      
        </>
      ) : (
        <div className="mb-6">
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione os Filtros de Permanência</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Para visualizar os dados de vendedor, selecione <strong>pelo menos um mês E um ano</strong> nos filtros acima.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {vendas.length === 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Importe arquivos de Vendas e Primeiro Pagamento para visualizar os dados por vendedor.
        </div>
      )}
    </>
  );
}

// Componente para o conteúdo da subguia Desempenho
function VendedorDesempenhoContent() {
  const dataContext = useData();
  const { vendas, vendasMeta, mapearCategoriaVenda } = dataContext;

  // Estados para filtros de Mês e Ano de Habilitação
  const [filtroMesHabilitacao, setFiltroMesHabilitacao] = useState<string[]>([]);
  const [filtroAnoHabilitacao, setFiltroAnoHabilitacao] = useState<string[]>([]);

  // Função para extrair mês da data de habilitação
  const extrairMesHabilitacao = useCallback((dataHabilitacao: string): string => {
    const data = new Date(dataHabilitacao);
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[data.getMonth()];
  }, []);

  // Função para extrair ano da data de habilitação
  const extrairAnoHabilitacao = useCallback((dataHabilitacao: string): number => {
    const data = new Date(dataHabilitacao);
    return data.getFullYear();
  }, []);

  // Função para extrair mês das vendas meta
  const extrairMesVendaMeta = useCallback((mes: number): string => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes - 1]; // mes é 1-12, array é 0-11
  }, []);

  // Filtrar vendas baseado nos filtros de mês e ano de habilitação
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(venda => {
      if (!venda.data_habilitacao) return false;

      // Extrair mês e ano de habilitação para esta venda
      const mesHabilitacao = extrairMesHabilitacao(venda.data_habilitacao);
      const anoHabilitacao = extrairAnoHabilitacao(venda.data_habilitacao);

      // Verificar se está nos filtros selecionados
      const mesMatch = filtroMesHabilitacao.length === 0 || filtroMesHabilitacao.includes(mesHabilitacao);
      const anoMatch = filtroAnoHabilitacao.length === 0 || filtroAnoHabilitacao.includes(anoHabilitacao.toString());

      return mesMatch && anoMatch;
    });
  }, [vendas, filtroMesHabilitacao, filtroAnoHabilitacao, extrairMesHabilitacao, extrairAnoHabilitacao]);

  // Filtrar vendas meta baseado nos filtros de mês e ano 
  const vendasMetaFiltradas = useMemo(() => {
    return vendasMeta.filter(vendaMeta => {
      // Extrair mês e ano da venda meta
      const mesVendaMeta = extrairMesVendaMeta(vendaMeta.mes);
      const anoVendaMeta = vendaMeta.ano;

      // Verificar se está nos filtros selecionados
      const mesMatch = filtroMesHabilitacao.length === 0 || filtroMesHabilitacao.includes(mesVendaMeta);
      const anoMatch = filtroAnoHabilitacao.length === 0 || filtroAnoHabilitacao.includes(anoVendaMeta.toString());

      return mesMatch && anoMatch;
    });
  }, [vendasMeta, filtroMesHabilitacao, filtroAnoHabilitacao, extrairMesVendaMeta]);

  // Obter meses únicos (vendas + vendas meta)
  const mesesHabilitacaoUnicos = useMemo(() => {
    const valores = new Set<string>();
    
    // Adicionar meses das vendas (data_habilitacao)
    vendas.forEach(venda => {
      if (venda.data_habilitacao) {
        const mesHabilitacao = extrairMesHabilitacao(venda.data_habilitacao);
        valores.add(mesHabilitacao);
      }
    });
    
    // Adicionar meses das vendas meta (campo mes)
    vendasMeta.forEach(vendaMeta => {
      const mesVendaMeta = extrairMesVendaMeta(vendaMeta.mes);
      valores.add(mesVendaMeta);
    });
    
    // Ordenar por ordem natural dos meses
    const ordenMeses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return ordenMeses.filter(mes => valores.has(mes));
  }, [vendas, vendasMeta, extrairMesHabilitacao, extrairMesVendaMeta]);

  // Obter anos únicos (vendas + vendas meta)
  const anosHabilitacaoUnicos = useMemo(() => {
    const valores = new Set<number>();
    
    // Adicionar anos das vendas (data_habilitacao)
    vendas.forEach(venda => {
      if (venda.data_habilitacao) {
        const anoHabilitacao = extrairAnoHabilitacao(venda.data_habilitacao);
        valores.add(anoHabilitacao);
      }
    });
    
    // Adicionar anos das vendas meta (campo ano)
    vendasMeta.forEach(vendaMeta => {
      valores.add(vendaMeta.ano);
    });
    
    return Array.from(valores).sort((a, b) => a - b);
  }, [vendas, vendasMeta, extrairAnoHabilitacao]);

  // Opções para os filtros de Mês e Ano de Habilitação
  const mesOptions = useMemo(() => mesesHabilitacaoUnicos.map(mes => ({
    label: mes,
    value: mes
  })), [mesesHabilitacaoUnicos]);

  const anoOptions = useMemo(() => anosHabilitacaoUnicos.map(ano => ({
    label: ano.toString(),
    value: ano.toString()
  })), [anosHabilitacaoUnicos]);

  // Função para calcular meses de referência baseado nos filtros
  const calcularMesesReferencia = useCallback(() => {
    if (filtroMesHabilitacao.length === 0 || filtroAnoHabilitacao.length === 0) {
      return '';
    }

    const referencias = [];
    for (const mes of filtroMesHabilitacao) {
      for (const ano of filtroAnoHabilitacao) {
        referencias.push(`${mes}/${ano}`);
      }
    }

    if (referencias.length === 1) {
      return `Ref. Habilitação: ${referencias[0]}`;
    } else if (referencias.length <= 3) {
      return `Ref. Habilitação: ${referencias.join(', ')}`;
    } else {
      return `Ref. Habilitação: ${referencias.slice(0, 2).join(', ')} e mais ${referencias.length - 2}`;
    }
  }, [filtroMesHabilitacao, filtroAnoHabilitacao]);

  // Função para mapear categoria para os tipos do quadro
  const mapearTipoParaQuadro = useCallback((categoria: string): string => {
    switch (categoria) {
      case 'pos_pago':
        return 'POS';
      case 'flex_conforto':
        return 'PRE';
      case 'nova_parabolica':
        return 'NP';
      case 'fibra':
        return 'FIBRA';
      case 'sky_mais':
        return 'SKY+';
      case 'seguros_pos':
        return 'POS'; // Seguros POS somam com POS
      case 'seguros_fibra':
        return 'FIBRA'; // Seguros FIBRA somam com FIBRA
      default:
        return 'OUTROS';
    }
  }, []);

  // Calcular ticket médio por vendedor (combinando vendas permanência + vendas meta)
  const calcularTicketMedioVendedor = useMemo(() => {
    if (vendasFiltradas.length === 0 && vendasMetaFiltradas.length === 0) return [];

    // Mapear vendas por vendedor
    const vendedoresMap = new Map<string, {
      id_vendedor: string;
      nome_vendedor: string;
      valores: {
        total: number;
        POS: number;
        PRE: number;
        NP: number;
        FIBRA: number;
        'SKY+': number;
      };
    }>();

    // Helper para adicionar vendedor ao map
    const adicionarVendedor = (id: string, nome?: string) => {
      if (!vendedoresMap.has(id)) {
        vendedoresMap.set(id, {
          id_vendedor: id,
          nome_vendedor: nome || id,
          valores: {
            total: 0,
            POS: 0,
            PRE: 0,
            NP: 0,
            FIBRA: 0,
            'SKY+': 0
          }
        });
      }
    };

    // Processar vendas de permanência (meses anteriores) - usar dados filtrados
    vendasFiltradas.forEach(venda => {
      const id = venda.id_vendedor;
      const valor = venda.valor || 0;
      const categoria = mapearCategoriaVenda(venda);
      const tipo = mapearTipoParaQuadro(categoria);

      // Usar o nome do proprietário como fallback ou apenas o ID
      const nomeVendedor = venda.nome_proprietario && venda.nome_proprietario !== id 
        ? venda.nome_proprietario 
        : id;

      adicionarVendedor(id, nomeVendedor);

      const vendedorData = vendedoresMap.get(id)!;
      vendedorData.valores.total += valor;
      
      // Adicionar ao tipo específico
      if (tipo === 'POS' || tipo === 'PRE' || tipo === 'NP' || tipo === 'FIBRA' || tipo === 'SKY+') {
        vendedorData.valores[tipo as keyof typeof vendedorData.valores] += valor;
      }
    });

    // Processar vendas meta (mês atual) - usar dados filtrados
    vendasMetaFiltradas.forEach(vendaMeta => {
      const id = vendaMeta.vendedor;
      const valor = vendaMeta.valor || 0;
      const categoria = mapearCategoriaVenda(vendaMeta);
      const tipo = mapearTipoParaQuadro(categoria);

      // Tentar buscar o nome nas vendas existentes ou usar o ID
      const vendaExistente = vendas.find(v => v.id_vendedor === id);
      const nomeVendedor = vendaExistente?.nome_proprietario && vendaExistente.nome_proprietario !== id 
        ? vendaExistente.nome_proprietario 
        : id;

      adicionarVendedor(id, nomeVendedor);

      const vendedorData = vendedoresMap.get(id)!;
      vendedorData.valores.total += valor;
      
      // Adicionar ao tipo específico
      if (tipo === 'POS' || tipo === 'PRE' || tipo === 'NP' || tipo === 'FIBRA' || tipo === 'SKY+') {
        vendedorData.valores[tipo as keyof typeof vendedorData.valores] += valor;
      }
    });

    // Retornar ordenado por valor total (maior para menor)
    return Array.from(vendedoresMap.values()).sort((a, b) => 
      b.valores.total - a.valores.total
    );
  }, [vendasFiltradas, vendasMetaFiltradas, vendas, mapearCategoriaVenda, mapearTipoParaQuadro]);

  // Calcular totais gerais
  const totaisGerais = useMemo(() => {
    return calcularTicketMedioVendedor.reduce((totais, vendedor) => ({
      total: totais.total + vendedor.valores.total,
      POS: totais.POS + vendedor.valores.POS,
      PRE: totais.PRE + vendedor.valores.PRE,
      NP: totais.NP + vendedor.valores.NP,
      FIBRA: totais.FIBRA + vendedor.valores.FIBRA,
      'SKY+': totais['SKY+'] + vendedor.valores['SKY+']
    }), {
      total: 0,
      POS: 0,
      PRE: 0,
      NP: 0,
      FIBRA: 0,
      'SKY+': 0
    });
  }, [calcularTicketMedioVendedor]);

  // Calcular quantidade de vendas por vendedor (combinando vendas permanência + vendas meta)
  const calcularQuantidadeVendasVendedor = useMemo(() => {
    if (vendasFiltradas.length === 0 && vendasMetaFiltradas.length === 0) return [];

    // Mapear vendas por vendedor (contagem)
    const vendedoresMap = new Map<string, {
      id_vendedor: string;
      nome_vendedor: string;
      quantidades: {
        total: number;
        POS: number;
        PRE: number;
        NP: number;
        FIBRA: number;
        'SKY+': number;
        // --- PRODUTOS DIFERENCIAIS ---
        'CARTAO_CREDITO': number;
        'DIGITAL_PEC_PIX': number;
        'S_COBRANCA': number;
        'SEGURO_POS': number;
        'SEGURO_FIBRA': number;
      };
    }>();

    // Helper para adicionar vendedor ao map
    const adicionarVendedor = (id: string, nome?: string) => {
      if (!vendedoresMap.has(id)) {
        vendedoresMap.set(id, {
          id_vendedor: id,
          nome_vendedor: nome || id,
          quantidades: {
            total: 0,
            POS: 0,
            PRE: 0,
            NP: 0,
            FIBRA: 0,
            'SKY+': 0,
            // --- PRODUTOS DIFERENCIAIS ---
            'CARTAO_CREDITO': 0,
            'DIGITAL_PEC_PIX': 0,
            'S_COBRANCA': 0,
            'SEGURO_POS': 0,
            'SEGURO_FIBRA': 0
          }
        });
      }
    };

    // Helper para verificar produtos secundários
    const verificarProdutosSecundarios = (produtosSecundarios: string | undefined, formaPagamento?: string) => {
      const produtosUpper = (produtosSecundarios || '').toUpperCase();
      const pagamentoUpper = (formaPagamento || '').toUpperCase();
      
      return {
        temCartaoCredito: pagamentoUpper.includes('CARTÃO DE CRÉDITO') || pagamentoUpper.includes('CARTAO DE CREDITO'),
        // Digital/PEC/PIX: verificar no campo forma_pagamento por "DIGITAL", "LINHA DIGITÁVEL", "PEC" ou "PIX"
        temDigitalPecPix: pagamentoUpper.includes('DIGITAL') || 
                         pagamentoUpper.includes('LINHA DIGITÁVEL') || 
                         pagamentoUpper.includes('LINHA DIGITAVEL') ||
                         pagamentoUpper.includes('PEC') || 
                         pagamentoUpper.includes('PIX'),
        // S Cobrança: verificar no campo forma_pagamento por "NÃO HÁ COBRANÇA"
        temSCobranca: pagamentoUpper.includes('NÃO HÁ COBRANÇA') || 
                     pagamentoUpper.includes('NAO HA COBRANCA') || 
                     pagamentoUpper.includes('SEM COBRANÇA') ||
                     pagamentoUpper.includes('SEM COBRANCA'),
        // Seguros: verificar no campo produtos_secundarios
        temSeguroPOS: produtosUpper.includes('FATURA PROTEGIDA') || produtosUpper.includes('SEGURO'),
        temSeguroFibra: produtosUpper.includes('FATURA PROTEGIDA') || produtosUpper.includes('SEGURO')
      };
    };

    // Processar vendas de permanência (meses anteriores) - contagem - usar dados filtrados
    vendasFiltradas.forEach(venda => {
      const id = venda.id_vendedor;
      const categoria = mapearCategoriaVenda(venda);
      const tipo = mapearTipoParaQuadro(categoria);

      // Usar o nome do proprietário como fallback ou apenas o ID
      const nomeVendedor = venda.nome_proprietario && venda.nome_proprietario !== id 
        ? venda.nome_proprietario 
        : id;

      adicionarVendedor(id, nomeVendedor);

      const vendedorData = vendedoresMap.get(id)!;
      vendedorData.quantidades.total += 1; // Contar +1 venda
      
      // Adicionar ao tipo específico
      if (tipo === 'POS' || tipo === 'PRE' || tipo === 'NP' || tipo === 'FIBRA' || tipo === 'SKY+') {
        vendedorData.quantidades[tipo as keyof typeof vendedorData.quantidades] += 1;
      }

      // Verificar produtos diferenciais nas vendas de permanência (agora também contém esses campos)
      if (venda.produtos_secundarios || venda.forma_pagamento) {
        const produtosDiferenciais = verificarProdutosSecundarios(venda.produtos_secundarios, venda.forma_pagamento);
        
        if (produtosDiferenciais.temCartaoCredito) {
          vendedorData.quantidades.CARTAO_CREDITO += 1;
        }
        
        if (produtosDiferenciais.temDigitalPecPix) {
          vendedorData.quantidades.DIGITAL_PEC_PIX += 1;
        }
        
        if (produtosDiferenciais.temSCobranca) {
          vendedorData.quantidades.S_COBRANCA += 1;
        }
        
        // Para seguros, verificar também a categoria base
        if (produtosDiferenciais.temSeguroPOS && categoria === 'pos_pago') {
          vendedorData.quantidades.SEGURO_POS += 1;
        }
        
        if (produtosDiferenciais.temSeguroFibra && categoria === 'fibra') {
          vendedorData.quantidades.SEGURO_FIBRA += 1;
        }
      }
    });

    // Processar vendas meta (mês atual) - contagem - usar dados filtrados
    vendasMetaFiltradas.forEach(vendaMeta => {
      const id = vendaMeta.vendedor;
      const categoria = mapearCategoriaVenda(vendaMeta);
      const tipo = mapearTipoParaQuadro(categoria);

      // Tentar buscar o nome nas vendas existentes ou usar o ID
      const vendaExistente = vendas.find(v => v.id_vendedor === id);
      const nomeVendedor = vendaExistente?.nome_proprietario && vendaExistente.nome_proprietario !== id 
        ? vendaExistente.nome_proprietario 
        : id;

      adicionarVendedor(id, nomeVendedor);

      const vendedorData = vendedoresMap.get(id)!;
      vendedorData.quantidades.total += 1; // Contar +1 venda
      
      // Adicionar ao tipo específico
      if (tipo === 'POS' || tipo === 'PRE' || tipo === 'NP' || tipo === 'FIBRA' || tipo === 'SKY+') {
        vendedorData.quantidades[tipo as keyof typeof vendedorData.quantidades] += 1;
      }

      // Verificar produtos diferenciais nas vendas meta usando produtos_secundarios e forma_pagamento
      const produtosDiferenciais = verificarProdutosSecundarios(vendaMeta.produtos_secundarios, vendaMeta.forma_pagamento);
      
      if (produtosDiferenciais.temCartaoCredito) {
        vendedorData.quantidades.CARTAO_CREDITO += 1;
      }
      
      if (produtosDiferenciais.temDigitalPecPix) {
        vendedorData.quantidades.DIGITAL_PEC_PIX += 1;
      }
      
      if (produtosDiferenciais.temSCobranca) {
        vendedorData.quantidades.S_COBRANCA += 1;
      }
      
      // Para seguros, verificar também a categoria base
      if (produtosDiferenciais.temSeguroPOS && categoria === 'pos_pago') {
        vendedorData.quantidades.SEGURO_POS += 1;
      }
      
      if (produtosDiferenciais.temSeguroFibra && categoria === 'fibra') {
        vendedorData.quantidades.SEGURO_FIBRA += 1;
      }
    });

    // Retornar ordenado por quantidade total (maior para menor)
    return Array.from(vendedoresMap.values()).sort((a, b) => 
      b.quantidades.total - a.quantidades.total
    );
  }, [vendasFiltradas, vendasMetaFiltradas, vendas, mapearCategoriaVenda, mapearTipoParaQuadro]);

  // Calcular totais gerais de quantidade
  const totaisGeraisQuantidade = useMemo(() => {
    return calcularQuantidadeVendasVendedor.reduce((totais, vendedor) => ({
      total: totais.total + vendedor.quantidades.total,
      POS: totais.POS + vendedor.quantidades.POS,
      PRE: totais.PRE + vendedor.quantidades.PRE,
      NP: totais.NP + vendedor.quantidades.NP,
      FIBRA: totais.FIBRA + vendedor.quantidades.FIBRA,
      'SKY+': totais['SKY+'] + vendedor.quantidades['SKY+'],
      // --- PRODUTOS DIFERENCIAIS ---
      'CARTAO_CREDITO': totais['CARTAO_CREDITO'] + vendedor.quantidades.CARTAO_CREDITO,
      'DIGITAL_PEC_PIX': totais['DIGITAL_PEC_PIX'] + vendedor.quantidades.DIGITAL_PEC_PIX,
      'S_COBRANCA': totais['S_COBRANCA'] + vendedor.quantidades.S_COBRANCA,
      'SEGURO_POS': totais['SEGURO_POS'] + vendedor.quantidades.SEGURO_POS,
      'SEGURO_FIBRA': totais['SEGURO_FIBRA'] + vendedor.quantidades.SEGURO_FIBRA
    }), {
      total: 0,
      POS: 0,
      PRE: 0,
      NP: 0,
      FIBRA: 0,
      'SKY+': 0,
      // --- PRODUTOS DIFERENCIAIS ---
      'CARTAO_CREDITO': 0,
      'DIGITAL_PEC_PIX': 0,
      'S_COBRANCA': 0,
      'SEGURO_POS': 0,
      'SEGURO_FIBRA': 0
    });
  }, [calcularQuantidadeVendasVendedor]);

  return (
    <>
      {/* Filtros de Mês e Ano de Habilitação */}
      <div className="mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filtros de Habilitação</CardTitle>
            <CardDescription>
              Filtre por período de habilitação das vendas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label htmlFor="filtro-mes-habilitacao" className="text-xs">Mês de Habilitação</Label>
                <MultiSelect 
                  options={mesOptions} 
                  selected={filtroMesHabilitacao}
                  onChange={(values) => setFiltroMesHabilitacao(values)}
                  placeholder="Selecione meses"
                  className="w-full text-xs min-w-[200px]"
                />
              </div>
              
              <div>
                <Label htmlFor="filtro-ano-habilitacao" className="text-xs">Ano de Habilitação</Label>
                <MultiSelect 
                  options={anoOptions} 
                  selected={filtroAnoHabilitacao}
                  onChange={(values) => setFiltroAnoHabilitacao(values)}
                  placeholder="Selecione anos"
                  className="w-full text-xs min-w-[150px]"
                />
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiltroMesHabilitacao([]);
                    setFiltroAnoHabilitacao([]);
                  }}
                  disabled={filtroMesHabilitacao.length === 0 && filtroAnoHabilitacao.length === 0}
                  className="h-10 px-3"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mostrar quadros apenas quando filtros estiverem selecionados */}
      {(filtroMesHabilitacao.length > 0 && filtroAnoHabilitacao.length > 0) ? (
        <div className="space-y-6">
          {/* Layout reorganizado: Quadros em colunas com gráficos abaixo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna 1: Ticket Médio + Evolução por Período */}
          <div className="space-y-6">
          {/* Quadro Ticket Médio por Vendedor */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-4 w-4 text-green-600" />
                Ticket Médio por Vendedor {calcularMesesReferencia() && `(${calcularMesesReferencia()})`}
              </CardTitle>
              <CardDescription className="text-xs">
                Valores combinados (permanência + meta atual)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              {vendas.length === 0 && vendasMeta.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Importe dados de vendas para visualizar.
                </div>
              ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-xs py-2 px-2">VENDEDOR</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right">Total</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right">POS</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right">PRE</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right">NP</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right">FIBRA</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right">SKY+</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calcularTicketMedioVendedor.map((vendedor) => (
                      <TableRow key={vendedor.id_vendedor} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-xs py-1 px-2 min-w-[160px]">
                          <div className="whitespace-nowrap">
                            {vendedor.id_vendedor}
                            {vendedor.nome_vendedor !== vendedor.id_vendedor && (
                              <span className="text-gray-500 ml-1">
                                - {vendedor.nome_vendedor}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-xs py-1 px-1">
                          {vendedor.valores.total.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          })}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1">
                          {vendedor.valores.POS > 0 ? vendedor.valores.POS.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }) : 'R$ 0'}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1">
                          {vendedor.valores.PRE > 0 ? vendedor.valores.PRE.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }) : 'R$ 0'}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1">
                          {vendedor.valores.NP > 0 ? vendedor.valores.NP.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }) : 'R$ 0'}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1">
                          {vendedor.valores.FIBRA > 0 ? vendedor.valores.FIBRA.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }) : 'R$ 0'}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1">
                          {vendedor.valores['SKY+'] > 0 ? vendedor.valores['SKY+'].toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }) : 'R$ 0'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-purple-50 border-t-2 border-purple-200">
                      <TableCell className="font-bold text-purple-800 text-xs py-1 px-2">
                        TOTAL GERAL
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-800 text-xs py-1 px-1">
                        {totaisGerais.total.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-800 text-xs py-1 px-1">
                        {totaisGerais.POS.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-800 text-xs py-1 px-1">
                        {totaisGerais.PRE.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-800 text-xs py-1 px-1">
                        {totaisGerais.NP.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-800 text-xs py-1 px-1">
                        {totaisGerais.FIBRA.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-800 text-xs py-1 px-1">
                        {totaisGerais['SKY+'].toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

          {/* Gráfico Evolução do Desempenho por Período */}
          <DesempenhoTrendChart
            filtroMesHabilitacao={filtroMesHabilitacao}
            filtroAnoHabilitacao={filtroAnoHabilitacao}
            vendasFiltradas={vendasFiltradas}
            vendasMetaFiltradas={vendasMetaFiltradas}
            chartHeight={400}
            containerMaxWidth="none"
          />

          {/* Gráfico Evolução do Desempenho por Período por Vendedor */}
          <VendedorDesempenhoPerPeriodoTrendChart
            filtroMesHabilitacao={filtroMesHabilitacao}
            filtroAnoHabilitacao={filtroAnoHabilitacao}
            vendasFiltradas={vendasFiltradas}
            vendasMetaFiltradas={vendasMetaFiltradas}
            chartHeight={400}
            containerMaxWidth="none"
          />
        </div>

        {/* Coluna 2: Quantidade de Vendas + Evolução por Categoria */}
        <div className="space-y-6">
        {/* Quadro Quantidade de Vendas por Vendedor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart2 className="h-4 w-4 text-blue-600" />
              Quantidade de Vendas por Vendedor {calcularMesesReferencia() && `(${calcularMesesReferencia()})`}
            </CardTitle>
            <CardDescription className="text-xs">
              Quantidades combinadas (permanência + meta atual)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            {vendas.length === 0 && vendasMeta.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Importe dados de vendas para visualizar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-xs py-2 px-2">VENDEDOR</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right">Total</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right">POS</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right">PRE</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right">NP</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right">FIBRA</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right">SKY+</TableHead>
                      {/* DIVISÓRIA - PRODUTOS DIFERENCIAIS */}
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right bg-orange-100 border-l-2 border-orange-300">Cartão</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right bg-orange-100">Digital</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right bg-orange-100">S/Cobr</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right bg-orange-100">Seg.POS</TableHead>
                      <TableHead className="font-semibold text-xs py-2 px-1 text-right bg-orange-100">Seg.FIB</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calcularQuantidadeVendasVendedor.map((vendedor) => (
                      <TableRow key={`qtd-${vendedor.id_vendedor}`} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-xs py-1 px-2 min-w-[160px]">
                          <div className="whitespace-nowrap">
                            {vendedor.id_vendedor}
                            {vendedor.nome_vendedor !== vendedor.id_vendedor && (
                              <span className="text-gray-500 ml-1">
                                - {vendedor.nome_vendedor}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-xs py-1 px-1">
                          {vendedor.quantidades.total}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1">
                          {vendedor.quantidades.POS || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1">
                          {vendedor.quantidades.PRE || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1">
                          {vendedor.quantidades.NP || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1">
                          {vendedor.quantidades.FIBRA || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1">
                          {vendedor.quantidades['SKY+'] || 0}
                        </TableCell>
                        {/* PRODUTOS DIFERENCIAIS */}
                        <TableCell className="text-right text-xs py-1 px-1 bg-orange-50 border-l-2 border-orange-300">
                          {vendedor.quantidades.CARTAO_CREDITO || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1 bg-orange-50">
                          {vendedor.quantidades.DIGITAL_PEC_PIX || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1 bg-orange-50">
                          {vendedor.quantidades.S_COBRANCA || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1 bg-orange-50">
                          {vendedor.quantidades.SEGURO_POS || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-1 px-1 bg-orange-50">
                          {vendedor.quantidades.SEGURO_FIBRA || 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-blue-50 border-t-2 border-blue-200">
                      <TableCell className="font-bold text-blue-800 text-xs py-1 px-2">
                        TOTAL GERAL
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-800 text-xs py-1 px-1">
                        {totaisGeraisQuantidade.total}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-800 text-xs py-1 px-1">
                        {totaisGeraisQuantidade.POS}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-800 text-xs py-1 px-1">
                        {totaisGeraisQuantidade.PRE}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-800 text-xs py-1 px-1">
                        {totaisGeraisQuantidade.NP}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-800 text-xs py-1 px-1">
                        {totaisGeraisQuantidade.FIBRA}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-800 text-xs py-1 px-1">
                        {totaisGeraisQuantidade['SKY+']}
                      </TableCell>
                      {/* TOTAIS PRODUTOS DIFERENCIAIS */}
                      <TableCell className="text-right font-bold text-orange-700 text-xs py-1 px-1 bg-orange-100 border-l-2 border-orange-300">
                        {totaisGeraisQuantidade.CARTAO_CREDITO}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-700 text-xs py-1 px-1 bg-orange-100">
                        {totaisGeraisQuantidade.DIGITAL_PEC_PIX}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-700 text-xs py-1 px-1 bg-orange-100">
                        {totaisGeraisQuantidade.S_COBRANCA}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-700 text-xs py-1 px-1 bg-orange-100">
                        {totaisGeraisQuantidade.SEGURO_POS}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-700 text-xs py-1 px-1 bg-orange-100">
                        {totaisGeraisQuantidade.SEGURO_FIBRA}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

          {/* Gráfico Evolução do Desempenho por Categoria */}
          <VendedorDesempenhoTrendChart
          filtroMesHabilitacao={filtroMesHabilitacao}
          filtroAnoHabilitacao={filtroAnoHabilitacao}
          vendasFiltradas={vendasFiltradas}
          vendasMetaFiltradas={vendasMetaFiltradas}
            chartHeight={400}
            containerMaxWidth="none"
          />

          {/* Gráfico Evolução do Desempenho por Categoria por Vendedor */}
          <VendedorDesempenhoCategoriaTrendChart
            filtroMesHabilitacao={filtroMesHabilitacao}
            filtroAnoHabilitacao={filtroAnoHabilitacao}
            vendasFiltradas={vendasFiltradas}
            vendasMetaFiltradas={vendasMetaFiltradas}
            chartHeight={400}
            containerMaxWidth="none"
          />
        </div>
      </div>
      </div>
      ) : (
        <div className="text-center py-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-muted-foreground">
                <Filter className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Selecione os Filtros</h3>
                <p className="text-sm">
                  Para visualizar os dados de desempenho, selecione pelo menos um mês e um ano de habilitação nos filtros acima.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
