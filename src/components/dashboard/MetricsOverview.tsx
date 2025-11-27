import useData from "@/context/useData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtectedCard } from "@/components/common/ProtectedCard";
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
  CalendarDays,
  Filter,
  Pencil,
  UserPlus,
  RefreshCcw,
  Search,
  MessageCircle,
  CheckCircle,
  CheckCircle2,
  Check,
  Target,
  Building2,
  Gauge,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Trophy,
  Medal,
  List,
  Download,
  User as UserIcon,
  Mail,
  Columns,
  Settings,
  Eye
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
import { ServiceOrder, User, VALID_STATUS, Venda, PrimeiroPagamento, Meta, VendaMeta, BaseData, TODOS_MATERIAIS } from "@/types";
import { useAuth } from "@/context/auth";

// Função para consolidar materiais de OSs duplicadas
function consolidateMaterials(orders: ServiceOrder[]): ServiceOrder[] {
  console.log(`[MaterialConsolidation] === INICIANDO CONSOLIDAÇÃO ===`);
  console.log(`[MaterialConsolidation] Total de OSs recebidas: ${orders.length}`);
  
  // Agrupar OSs por codigo_os
  const ordersByCode = orders.reduce((acc, order) => {
    if (!acc[order.codigo_os]) {
      acc[order.codigo_os] = [];
    }
    acc[order.codigo_os].push(order);
    return acc;
  }, {} as Record<string, ServiceOrder[]>);

  console.log(`[MaterialConsolidation] Grupos únicos de OS: ${Object.keys(ordersByCode).length}`);
  
  // Log de grupos com duplicatas
  Object.entries(ordersByCode).forEach(([codigo, group]) => {
    if (group.length > 1) {
      console.log(`[MaterialConsolidation] OS ${codigo} tem ${group.length} itens:`, 
        group.map(g => `${g.tipo_servico} - ${g.subtipo_servico} (${g.codigo_item})`)
      );
    }
  });

  const consolidatedOrders: ServiceOrder[] = [];

  // Processar cada grupo de OSs
  Object.values(ordersByCode).forEach(group => {
    if (group.length === 1) {
      // OS única, manter como está
      console.log(`[MaterialConsolidation] OS ${group[0].codigo_os} é única, mantendo como está`);
      consolidatedOrders.push(group[0]);
    } else {
      // Múltiplas OSs com mesmo código, consolidar
      console.log(`[MaterialConsolidation] === CONSOLIDANDO OS ${group[0].codigo_os} ===`);
      console.log(`[MaterialConsolidation] Encontradas ${group.length} OSs com mesmo código`);
      
      // Mostrar detalhes de cada OS no grupo
      group.forEach((order, index) => {
        console.log(`[MaterialConsolidation] OS ${index + 1}: ${order.tipo_servico} - ${order.subtipo_servico} - ${order.codigo_item} - Materiais: ${order.materiais?.length || 0}`);
        if (order.materiais && order.materiais.length > 0) {
          console.log(`[MaterialConsolidation]   Materiais:`, order.materiais.map(m => `${m.nome}=${m.quantidade}`));
        }
      });
      
      // Encontrar OS primária (Ponto Principal) e secundária (Sistema Opcional)
      const osPrimaria = group.find(order => order.subtipo_servico === "Ponto Principal");
      const osSecundaria = group.find(order => order.subtipo_servico === "Sistema Opcional");
      
      console.log(`[MaterialConsolidation] OS Primária encontrada: ${osPrimaria ? 'SIM' : 'NÃO'}`);
      console.log(`[MaterialConsolidation] OS Secundária encontrada: ${osSecundaria ? 'SIM' : 'NÃO'}`);
      
      if (osPrimaria && osSecundaria) {
        console.log(`[MaterialConsolidation] === CONSOLIDANDO MATERIAIS ===`);
        
        // Consolidar materiais na primária
        const materiaisPrimaria = osPrimaria.materiais || [];
        const materiaisSecundaria = osSecundaria.materiais || [];
        
        console.log(`[MaterialConsolidation] Materiais OS Primária (${osPrimaria.codigo_item}):`, 
          materiaisPrimaria.map(m => `${m.nome}=${m.quantidade}`)
        );
        console.log(`[MaterialConsolidation] Materiais OS Secundária (${osSecundaria.codigo_item}):`, 
          materiaisSecundaria.map(m => `${m.nome}=${m.quantidade}`)
        );
        
        // Combinar materiais (replicar da secundária para primária, sem somar)
        const materiaisConsolidados = [...materiaisPrimaria];
        
        materiaisSecundaria.forEach(materialSecundario => {
          const materialExistente = materiaisConsolidados.find(m => m.nome === materialSecundario.nome);
          
          if (materialExistente) {
            // Material já existe na primária, manter quantidade original (não somar)
            console.log(`[MaterialConsolidation] Material ${materialSecundario.nome} já existe na primária (${materialExistente.quantidade}), mantendo quantidade original`);
          } else {
            // Adicionar novo material da secundária
            materiaisConsolidados.push({ ...materialSecundario });
            console.log(`[MaterialConsolidation] Adicionando novo material ${materialSecundario.nome}: ${materialSecundario.quantidade}`);
          }
        });
        
        console.log(`[MaterialConsolidation] Materiais consolidados:`, 
          materiaisConsolidados.map(m => `${m.nome}=${m.quantidade}`)
        );
        
        // Atualizar OS primária com materiais consolidados
        const osPrimariaConsolidada = {
          ...osPrimaria,
          materiais: materiaisConsolidados
        };
        
        // Zerar materiais da OS secundária
        const osSecundariaZerada = {
          ...osSecundaria,
          materiais: []
        };
        
        console.log(`[MaterialConsolidation] RESULTADO FINAL:`);
        console.log(`[MaterialConsolidation] - OS ${osPrimaria.codigo_os} (${osPrimaria.codigo_item}): ${materiaisConsolidados.length} materiais`);
        console.log(`[MaterialConsolidation] - OS ${osSecundaria.codigo_os} (${osSecundaria.codigo_item}): 0 materiais`);
        
        consolidatedOrders.push(osPrimariaConsolidada);
        consolidatedOrders.push(osSecundariaZerada);
      } else {
        // Se não encontrar Ponto Principal e Sistema Opcional, manter todas como estão
        console.log(`[MaterialConsolidation] ⚠️ Não encontrou Ponto Principal/Sistema Opcional para OS ${group[0].codigo_os}`);
        console.log(`[MaterialConsolidation] Subtipos encontrados:`, group.map(g => g.subtipo_servico));
        console.log(`[MaterialConsolidation] Mantendo todas como estão`);
        consolidatedOrders.push(...group);
      }
    }
  });

  console.log(`[MaterialConsolidation] === CONSOLIDAÇÃO CONCLUÍDA ===`);
  console.log(`[MaterialConsolidation] Total: ${orders.length} → ${consolidatedOrders.length} OSs`);
  return consolidatedOrders;
}
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import * as XLSX from "xlsx";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ServiceOrderTable } from "@/components/dashboard/ServiceOrderTable";
import { OptimizationCountCard } from "@/components/dashboard/OptimizationCountCard";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { clearDefaultUsers } from "@/utils/clearDefaultUsers";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { PermanenciaPorTipoServico } from "./PermanenciaPorTipoServico";
import { BonificacoesVendas } from "@/components/dashboard/BonificacoesVendas";
import { VendasInstaladasPorCidade } from "@/components/dashboard/VendasInstaladasPorCidade";
import { PermanenciaTrendTable } from "@/components/dashboard/PermanenciaTrendTable";
import { TicketMedioTrendTable } from "@/components/dashboard/TicketMedioTrendTable";
import { DesempenhoCategoriaTrendTable } from "@/components/dashboard/DesempenhoCategoriaTrendTable";
import { VendedorPermanenciaTrendTable } from "@/components/dashboard/VendedorPermanenciaTrendTable";
import { standardizeServiceCategory, normalizeCityName, normalizeNeighborhoodName } from "@/context/DataUtils";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { getReopeningColorByServiceType, getTimeAttendanceColorByServiceType, getTimeAttendanceBackgroundColorByServiceType, getTimeAttendanceIndicatorColorByServiceType } from "@/utils/colorUtils";
import { BaseMetricsSection } from "@/components/dashboard/BaseMetricsSection";
import { useBaseMetrics } from "@/hooks/useBaseMetrics";
import { VendasMetaCleaner } from "@/components/dashboard/VendasMetaCleaner";

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

  // Função para calcular tendência de meta por categorias (comparar períodos equivalentes)
  const calcularTendenciaMeta = () => {
    if (!selectedMonth || !selectedYear) return null;
    
    const hoje = new Date();
    const isCurrentMonth = selectedYear === hoje.getFullYear() && selectedMonth === hoje.getMonth() + 1;
    
    // Para o mês atual, usar até ontem para evitar dados parciais do dia atual
    const dataLimiteAtual = isCurrentMonth ? new Date(hoje.getTime() - 24 * 60 * 60 * 1000) : undefined;
    const metaAtual = calculateMetaMetrics(selectedMonth, selectedYear, dataLimiteAtual);
    if (!metaAtual) return null;
    
    // Calcular mês anterior
    let mesAnterior = selectedMonth - 1;
    let anoAnterior = selectedYear;
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anoAnterior = selectedYear - 1;
    }
    
    // Para garantir comparação justa, usar a mesma data limite no mês anterior
    // Se é mês atual, limitar o mês anterior ao mesmo dia do mês
    let dataLimiteAnterior: Date | undefined;
    if (isCurrentMonth) {
      const diaAtual = dataLimiteAtual ? dataLimiteAtual.getDate() : hoje.getDate() - 1;
      dataLimiteAnterior = new Date(anoAnterior, mesAnterior - 1, diaAtual);
    }
    
    const metaAnterior = calculateMetaMetrics(mesAnterior, anoAnterior, dataLimiteAnterior);
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
      'OUT': {
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
        produtos: ['SKY MAIS']
      },
      'SEG': {
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
        produtos: ['SEGUROS POS']
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
      <Card className="w-full shadow-lg border-2">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <CardTitle className="text-lg text-gray-800 font-semibold">
              Acompanhamento de Metas
            </CardTitle>
            </div>
            <VendasMetaCleaner />
          </div>
          <CardDescription className="text-sm mt-2 text-gray-600">
            Acompanhe o desempenho das vendas em relação às metas mensais definidas
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="mes-select" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-orange-600" />
                  Mês
                </Label>
              <Select
                value={selectedMonth?.toString() || ""}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                  <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.length > 0 ? (
                    // Mostrar apenas os meses que têm dados
                    Array.from(new Set(availablePeriods.map(p => p.mes))).sort((a, b) => a - b).map(mes => (
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
            
              <div className="space-y-2">
                <Label htmlFor="ano-select" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-orange-600" />
                  Ano
                </Label>
              <Select
                value={selectedYear?.toString() || ""}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Selecione o ano" />
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
            
              <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                  disabled={!selectedMonth && !selectedYear}
                  className="w-full h-11 border-2 hover:bg-gray-50 font-semibold"
                  size="lg"
              >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </div>

            {/* Badges de seleção ativa */}
            {(selectedMonth || selectedYear) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                {selectedMonth && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 px-3 py-1.5 text-sm font-semibold">
                    <CalendarIcon className="h-3 w-3 mr-1.5" />
                    Mês: {new Date(0, selectedMonth - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                  </Badge>
                )}
                {selectedYear && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 px-3 py-1.5 text-sm font-semibold">
                    <CalendarIcon className="h-3 w-3 mr-1.5" />
                    Ano: {selectedYear}
                  </Badge>
                )}
              </div>
            )}
          
          {availablePeriods.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs font-semibold">
                    {availablePeriods.length} período(s) com dados disponíveis
                  </Badge>
                </div>
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
          {/* Grid com Tendência de Meta e Dias Totais do Mês lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card de Tendência de Meta - Modernizado com Tabela */}
          {(() => {
            const tendencia = calcularTendenciaMeta();
            if (!tendencia) return null;
            
              // Preparar dados para a tabela
              const tabelaData = Object.entries(tendencia.agrupamentos).flatMap(([categoria, dados]) => 
                dados.produtos.map(produto => {
                              const categoriaAtual = tendencia.metricasAtual.categorias.find(c => c.categoria === produto);
                              const categoriaAnterior = tendencia.metricasAnterior.categorias.find(c => c.categoria === produto);
                              
                              if (!categoriaAtual || !categoriaAnterior) return null;
                              
                              const diferenca = categoriaAtual.percentual_atingido - categoriaAnterior.percentual_atingido;
                              const crescimento = diferenca > 0;
                              const percentualCrescimento = categoriaAnterior.percentual_atingido > 0 ? 
                                (Math.abs(diferenca) / categoriaAnterior.percentual_atingido) * 100 : 0;
                  
                  return {
                    produto,
                    categoria,
                    mesAnterior: {
                      percentual: categoriaAnterior.percentual_atingido,
                      vendas: categoriaAnterior.vendas_realizadas,
                      meta: categoriaAnterior.meta_definida
                    },
                    mesAtual: {
                      percentual: categoriaAtual.percentual_atingido,
                      vendas: categoriaAtual.vendas_realizadas,
                      meta: categoriaAtual.meta_definida
                    },
                    diferenca,
                    crescimento,
                    percentualCrescimento
                  };
                }).filter(Boolean)
              );
                              
                              return (
                <Card className="lg:col-span-2 shadow-lg border-2 border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30">
                  <CardHeader className="pb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Tendência de Meta
                    </CardTitle>
                    <CardDescription className="text-blue-100 text-sm">
                      Comparação entre períodos equivalentes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Produto
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Categoria
                            </th>
                            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              {new Date(0, tendencia.mesAnterior.mes - 1).toLocaleDateString('pt-BR', { month: 'short' })}/{tendencia.mesAnterior.ano}
                            </th>
                            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Tendência
                            </th>
                            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              {new Date(0, tendencia.mesAtual.mes - 1).toLocaleDateString('pt-BR', { month: 'short' })}/{tendencia.mesAtual.ano}
                            </th>
                            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Meta
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {tabelaData.map((row, index) => (
                            <tr 
                              key={`${row.categoria}-${row.produto}`}
                              className="hover:bg-blue-50/50 transition-colors duration-150"
                            >
                              <td className="py-3 px-4">
                                <span className="font-semibold text-sm text-gray-900">{row.produto}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {row.categoria}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-bold text-gray-700">
                                    {row.mesAnterior.percentual.toFixed(1)}%
                                  </span>
                                  <span className="text-xs text-gray-500 mt-0.5">
                                    Meta {row.mesAnterior.meta} / Produzido {row.mesAnterior.vendas}
                                    </span>
                                  </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    row.crescimento 
                                          ? 'bg-green-100 text-green-800' 
                                      : row.diferenca === 0
                                            ? 'bg-gray-100 text-gray-800'
                                            : 'bg-red-100 text-red-800'
                                      }`}>
                                    {row.crescimento ? (
                                      <TrendingUp className="h-3.5 w-3.5" />
                                    ) : row.diferenca === 0 ? (
                                      <span className="h-3.5 w-3.5 text-center flex items-center justify-center">—</span>
                                        ) : (
                                      <TrendingDown className="h-3.5 w-3.5" />
                                        )}
                                    <span>
                                      {row.diferenca === 0 ? '0pp' : `${row.diferenca > 0 ? '+' : ''}${row.diferenca.toFixed(1)}pp`}
                                    </span>
                                      </div>
                                  <span className="text-[10px] text-gray-500">
                                    {row.diferenca === 0 ? 'estável' : `${row.percentualCrescimento.toFixed(1)}% ${row.crescimento ? 'crescimento' : 'queda'}`}
                                  </span>
                                      </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-bold text-blue-600">
                                    {row.mesAtual.percentual.toFixed(1)}%
                                  </span>
                                  <span className="text-xs text-gray-500 mt-0.5">
                                    Meta {row.mesAtual.meta} / Produzido {row.mesAtual.vendas}
                                  </span>
                                    </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-sm font-semibold text-gray-700">
                                  {row.mesAtual.meta}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

            {/* Card Dias Totais do Mês - Modernizado */}
                  {(() => {
                    const { diasDecorridos, diasRestantes, diasTotais } = calcularDiasUteisMes(selectedMonth || 0, selectedYear || 0);
              const percentualDecorrido = diasTotais > 0 ? (diasDecorridos / diasTotais) * 100 : 0;
                    
                    return (
                <Card className="shadow-lg border-2 border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30">
                  <CardHeader className="pb-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      Dias Totais do Mês
                    </CardTitle>
                    <CardDescription className="text-indigo-100 text-sm">
                      Progresso do mês atual
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-5">
                      {/* Dias Trabalhados */}
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Dias Trabalhados</span>
                          <span className="text-2xl font-bold text-blue-600">{diasDecorridos}</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(percentualDecorrido, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">{percentualDecorrido.toFixed(1)}% do mês</span>
                        </div>

                      {/* Dias Restantes */}
                      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Dias Restantes</span>
                          <span className="text-2xl font-bold text-orange-600">{diasRestantes}</span>
                            </div>
                        <div className="w-full bg-orange-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${diasTotais > 0 ? ((diasRestantes / diasTotais) * 100) : 0}%` }}
                          ></div>
                          </div>
                      </div>
                      
                      {/* Total */}
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Total de Dias</span>
                          <span className="text-2xl font-bold text-gray-700">{diasTotais}</span>
                          </div>
                        </div>
                    </div>
              </CardContent>
            </Card>
              );
            })()}
          </div>

          {/* Grid com Produtos Principais e Vendas por Cidade lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card Unificado - Produtos e Formas de Pagamento */}
            <ProtectedCard 
              title="Produtos Principais e Formas de Pagamento" 
              storageKey="metas_valor_produtos"
            >
              <Card className="shadow-lg border-2 border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    Produtos Principais e Formas de Pagamento
                  </CardTitle>
                  <CardDescription className="text-blue-100 text-xs">
                    Detalhamento de vendas por produto e forma de pagamento
                  </CardDescription>
                </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  // Filtrar vendas do período selecionado
                  const vendasDoPeriodo = buscarVendasDoPeriodo(selectedMonth || 0, selectedYear || 0);
                  
                // Função para normalizar forma de pagamento
                const normalizarFormaPagamento = (forma: string): string => {
                  const formaUpper = forma.toUpperCase();
                  
                  if (formaUpper.includes('CARTÃO DE CRÉDITO') || formaUpper.includes('CARTAO DE CREDITO') || formaUpper.includes('CREDITO')) {
                    return 'CARTÃO';
                  } else if (formaUpper.includes('DIGITAL') || formaUpper.includes('PIX') || formaUpper.includes('PEC') || formaUpper.includes('LINHA DIGITÁVEL')) {
                    return 'DIGITAL/PIX';
                  } else if (formaUpper.includes('DÉBITO') || formaUpper.includes('DEBITO')) {
                    return 'DÉBITO';
                  } else if (formaUpper.includes('BOLETO')) {
                    return 'BOLETO';
                  } else if (formaUpper.includes('NÃO HÁ COBRANÇA') || formaUpper.includes('NAO HA COBRANCA') || formaUpper.includes('SEM COBRANÇA')) {
                    return 'SEM COBRANÇA';
                  } else if (formaUpper.includes('DINHEIRO') || formaUpper.includes('ESPÉCIE')) {
                    return 'DINHEIRO';
                  } else if (!forma || formaUpper.includes('NÃO INFORMADO') || formaUpper.includes('NULL') || formaUpper.trim() === '') {
                    return 'NÃO INFORMADO';
                  }
                  return forma.toUpperCase();
                };

                // Mapear categorias para valor dos produtos
                  const mapearCategoria = (categoria: string): string => {
                    if (categoria.includes('PÓS-PAGO') || categoria.includes('POS')) return 'POS';
                    if (categoria.includes('PRÉ-PAGO') || categoria.includes('PRE')) return 'PRE';
                    if (categoria.includes('NOVA PARABÓLICA') || categoria.includes('NP')) return 'NP';
                    if (categoria.includes('FIBRA') || categoria.includes('BL-DGO')) return 'FIBRA';
                    if (categoria.includes('SKY MAIS') || categoria.includes('DGO')) return 'SKY+';
                    return 'OUTROS';
                  };
                  
                // Agrupar por produto, forma de pagamento e valor
                const dadosPorProduto = vendasDoPeriodo.reduce((acc, venda) => {
                  const produto = (('produto' in venda ? venda.produto : venda.produto_principal) || 'NÃO INFORMADO').toUpperCase();
                  const forma = normalizarFormaPagamento('forma_pagamento' in venda ? venda.forma_pagamento : '');
                     const categoria = ('categoria' in venda ? venda.categoria : venda.agrupamento_produto) || '';
                  const categoriaMapeada = mapearCategoria(categoria);
                     const valor = ('valor' in venda ? (venda as Venda).valor : 0) || 0;
                  
                  if (!acc[produto]) {
                    acc[produto] = {
                      total: 0,
                      formas: {} as Record<string, number>,
                      valorTotal: 0
                    };
                  }
                  
                  acc[produto].total += 1;
                  acc[produto].formas[forma] = (acc[produto].formas[forma] || 0) + 1;
                  acc[produto].valorTotal += valor;
                  
                  return acc;
                }, {} as Record<string, { total: number; formas: Record<string, number>; valorTotal: number }>);
                
                // Ordenar produtos por quantidade total (decrescente) e pegar top 10
                const produtosOrdenados = Object.entries(dadosPorProduto)
                  .sort(([,a], [,b]) => b.total - a.total)
                  .slice(0, 10);
                
                // Calcular totais por forma de pagamento
                const totaisPorForma = vendasDoPeriodo.reduce((acc, venda) => {
                  const forma = normalizarFormaPagamento('forma_pagamento' in venda ? venda.forma_pagamento : '');
                  acc[forma] = (acc[forma] || 0) + 1;
                     return acc;
                   }, {} as Record<string, number>);
                  
                const totalGeral = vendasDoPeriodo.length;
                
                // Ordenar formas por quantidade (descendente)
                const formasOrdenadas = Object.entries(totaisPorForma)
                  .sort(([,a], [,b]) => b - a);
                  
                // Calcular valor total geral (de TODAS as vendas, não apenas top 10)
                const valorTotalGeral = vendasDoPeriodo.reduce((sum, venda) => {
                  const valor = ('valor' in venda ? (venda as Venda).valor : 0) || 0;
                  return sum + valor;
                }, 0);
                  
                  return (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                          <th className="text-left py-2 px-3 text-[10px] font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                            Produto
                          </th>
                          <th className="text-center py-2 px-3 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                            Qtd Total
                          </th>
                          {/* Colunas dinâmicas para formas de pagamento */}
                          {formasOrdenadas.map(([forma, qtd]) => (
                            <th key={forma} className="text-center py-2 px-3 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                              {forma.replace('/', '/ ')}
                            </th>
                          ))}
                          <th className="text-center py-2 px-3 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                            Valor dos Produtos
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {produtosOrdenados.map(([produto, dados]) => {
                          const produtoExibicao = produto.length > 40 ? produto.substring(0, 37) + '...' : produto;
                          
                        return (
                            <tr 
                              key={produto}
                              className="hover:bg-blue-50/50 transition-colors duration-150"
                            >
                              <td className="py-2 px-3 sticky left-0 bg-white z-10">
                                <span className="font-semibold text-xs text-gray-900" title={produto}>
                                  {produtoExibicao}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-xs font-bold text-blue-600">
                                  {dados.total}
                                </span>
                              </td>
                              {/* Células para cada forma de pagamento */}
                              {formasOrdenadas.map(([forma]) => (
                                <td key={forma} className="py-2 px-3 text-center">
                                  <span className="text-xs font-semibold text-gray-700">
                                    {dados.formas[forma] || '-'}
                                  </span>
                                </td>
                              ))}
                              {/* Coluna de valor */}
                              <td className="py-2 px-3 text-center">
                                <span className="text-xs font-bold text-purple-600">
                                  {dados.valorTotal > 0 ? 
                                    dados.valorTotal.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                    }).replace(/\s/g, '') : 'R$0,00'
                              }
                            </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gradient-to-r from-purple-50 to-indigo-50 border-t-2 border-purple-200">
                        <tr>
                          <td className="py-2 px-3 sticky left-0 bg-purple-50 z-10">
                            <span className="text-sm font-bold text-gray-900">TOTAL</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-sm font-bold text-purple-600">{totalGeral}</span>
                          </td>
                          {/* Totais por forma de pagamento com percentuais */}
                          {formasOrdenadas.map(([forma, qtd]) => {
                            const percentual = totalGeral > 0 ? (qtd / totalGeral) * 100 : 0;
                            return (
                              <td key={forma} className="py-2 px-3 text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-sm font-bold text-purple-700">{qtd}</span>
                                  <span className="text-xs text-purple-600 font-medium">({percentual.toFixed(2)}%)</span>
                          </div>
                              </td>
                        );
                      })}
                          {/* Total de valor */}
                          <td className="py-2 px-3 text-center">
                            <span className="text-sm font-bold text-purple-700">
                              {valorTotalGeral.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                              }).replace(/\s/g, '')}
                          </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    </div>
                  );
                })()}
                </CardContent>
              </Card>
            </ProtectedCard>

            {/* Vendas por Cidade - Modernizado */}
            <Card className="shadow-lg border-2 border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30">
              <CardHeader className="pb-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Vendas por Cidade
                </CardTitle>
                <CardDescription className="text-indigo-100 text-xs">
                  Top cidades por volume de vendas
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                  {(() => {
                     // Filtrar vendas do período selecionado
                     const vendasDoPeriodo = buscarVendasDoPeriodo(selectedMonth || 0, selectedYear || 0);
                     
                     interface VendaPorCidade {
                       total: number;
                       pos_pago: number;
                       flex_conforto: number;
                       nova_parabolica: number;
                       sky_mais: number;
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
                           sky_mais: 0 
                         };
                       }
                       vendasPorCidade[cidade].total++;
                       
                       // Categorizar por tipo específico baseado no Agrupamento do Produto
                       const agrupamento = (('categoria' in venda ? venda.categoria : venda.agrupamento_produto) || '').toUpperCase().trim();
                       
                    // Usar a mesma lógica de mapeamento do quadro de valores (sem FIBRA)
                       if (agrupamento.includes('PÓS-PAGO') || agrupamento.includes('POS')) {
                         vendasPorCidade[cidade].pos_pago++;
                       } else if (agrupamento.includes('PRÉ-PAGO') || agrupamento.includes('PRE')) {
                         vendasPorCidade[cidade].flex_conforto++;
                       } else if (agrupamento.includes('NOVA PARABÓLICA') || agrupamento.includes('NP')) {
                         vendasPorCidade[cidade].nova_parabolica++;
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
                         sky_mais: dados.sky_mais,
                         percentual: (dados.total / (metaMetrics?.total_vendas || 1)) * 100
                       }))
                       .sort((a, b) => b.total - a.total)
                       .slice(0, 10); // Top 10

                     return cidadesArray.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                            <th className="text-left py-2 px-3 text-[10px] font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                              Cidade
                            </th>
                            <th className="text-center py-2 px-3 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                              Total
                            </th>
                            <th className="text-center py-2 px-3 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                              POS
                            </th>
                            <th className="text-center py-2 px-3 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                              PRE
                            </th>
                            <th className="text-center py-2 px-3 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                              NP
                            </th>
                            <th className="text-center py-2 px-3 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                              SKY+
                            </th>
                            <th className="text-center py-2 px-3 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                              %
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                         {cidadesArray.map((item, index) => (
                            <tr 
                              key={index}
                              className="hover:bg-indigo-50/50 transition-colors duration-150"
                            >
                              <td className="py-2 px-3 sticky left-0 bg-white z-10">
                                <span className="font-semibold text-xs text-gray-900" title={item.cidade}>
                               {item.cidade.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-xs font-bold text-indigo-600">
                               {item.total}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-xs font-semibold text-blue-600">
                               {item.pos_pago}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-xs font-semibold text-purple-600">
                               {item.flex_conforto}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-xs font-semibold text-orange-600">
                               {item.nova_parabolica}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-xs font-semibold text-cyan-600">
                               {item.sky_mais}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-xs font-bold text-indigo-700">
                                  {item.percentual.toFixed(2)}%
                                </span>
                              </td>
                            </tr>
                         ))}
                        </tbody>
                      </table>
                       </div>
                     ) : (
                    <div className="text-center text-sm text-muted-foreground py-8 bg-gray-50 rounded-md">
                         Nenhum dado de cidade disponível
                       </div>
                     );
                   })()}
              </CardContent>
            </Card>
          </div>

          {/* Desempenho por Categoria - Cards Individuais Modernizados */}
          <Card className="shadow-lg border-2 border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30">
            <CardHeader className="pb-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-t-lg">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Desempenho por Categoria
              </CardTitle>
              <CardDescription className="text-teal-100 text-xs">
                Análise detalhada de metas e desempenho por categoria de produto
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
                {(() => {
                // Função para calcular dias úteis (excluindo domingos)
                const calcularDiasUteis = (dataInicio: Date, dataFim: Date): number => {
                    let diasUteis = 0;
                    const dataAtual = new Date(dataInicio);
                    dataAtual.setHours(0, 0, 0, 0);
                    const dataFimNormalizada = new Date(dataFim);
                    dataFimNormalizada.setHours(23, 59, 59, 999);
                    
                    while (dataAtual <= dataFimNormalizada) {
                    if (dataAtual.getDay() !== 0) {
                        diasUteis++;
                      }
                      dataAtual.setDate(dataAtual.getDate() + 1);
                    }
                    return diasUteis;
                  };

                // Calcular dados para cada categoria
                    const hoje = new Date();
                    const primeiroDiaMes = new Date(metaMetrics.ano, metaMetrics.mes - 1, 1);
                    const ultimoDiaMes = new Date(metaMetrics.ano, metaMetrics.mes, 0);
                    const ontem = new Date(hoje);
                    ontem.setDate(hoje.getDate() - 1);
                    
                const diasUteisDecorridos = Math.max(1, calcularDiasUteis(primeiroDiaMes, ontem));
                    const diasUteisRestantes = Math.max(1, calcularDiasUteis(hoje, ultimoDiaMes));
                    const totalDiasUteisMes = calcularDiasUteis(primeiroDiaMes, ultimoDiaMes);
                    
                // Calcular resumo PAY TV (PÓS-PAGO + PRÉ-PAGO + NOVA PARABÓLICA)
                const categoriasPayTV = metaMetrics.categorias.filter(c => 
                  ['PÓS-PAGO', 'FLEX/CONFORTO', 'NOVA PARABÓLICA'].includes(c.categoria)
                );

                const totalMetaPayTV = categoriasPayTV.reduce((sum, c) => sum + c.meta_definida, 0);
                const totalRealizadoPayTV = categoriasPayTV.reduce((sum, c) => sum + c.vendas_realizadas, 0);
                const totalSaldoPayTV = totalRealizadoPayTV - totalMetaPayTV;
                const percentualPayTV = totalMetaPayTV > 0 ? (totalRealizadoPayTV / totalMetaPayTV) * 100 : 0;

                    return (
                  <>
                    {/* Barra de Resumo PAY TV */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border-2 border-blue-200 shadow-sm">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        {/* Título */}
                        <div className="flex items-center gap-2">
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                            <Target className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900">PAY TV</h3>
                            <p className="text-[10px] text-gray-600">Resumo: PÓS-PAGO + PRÉ-PAGO + NOVA PARABÓLICA</p>
                          </div>
                        </div>
                        
                        {/* Informações */}
                        <div className="flex items-center gap-6 flex-wrap">
                        <div className="text-center">
                            <span className="text-[10px] text-gray-600 block mb-1">Meta</span>
                            <span className="text-sm font-bold text-blue-600">
                              {totalMetaPayTV.toLocaleString('pt-BR')}
                            </span>
                        </div>
                        <div className="text-center">
                            <span className="text-[10px] text-gray-600 block mb-1">Realizado</span>
                            <span className="text-sm font-bold text-green-600">
                              {totalRealizadoPayTV.toLocaleString('pt-BR')}
                            </span>
                        </div>
                        <div className="text-center">
                            <span className="text-[10px] text-gray-600 block mb-1">Saldo</span>
                            <span className={`text-sm font-bold ${totalSaldoPayTV >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {totalSaldoPayTV >= 0 ? '+' : ''}{Math.abs(totalSaldoPayTV).toLocaleString('pt-BR')}
                            </span>
                        </div>
                        <div className="text-center">
                            <span className="text-[10px] text-gray-600 block mb-1">Percentual</span>
                            <span className={`text-lg font-bold px-3 py-1 rounded ${
                              percentualPayTV >= 100 
                              ? 'bg-green-100 text-green-800' 
                                : percentualPayTV >= 80 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                              {percentualPayTV.toFixed(1)}%
                          </span>
                        </div>
                        </div>
                        </div>
                        </div>
                        
                    {/* Cards Individuais */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {(() => {
                        // Organizar categorias (removido FIBRA e SEGUROS FIBRA)
                        const categoriasFiltradas = metaMetrics.categorias.filter(c => 
                          ['PÓS-PAGO', 'FLEX/CONFORTO', 'NOVA PARABÓLICA', 'SKY+', 'SKY MAIS', 'SEGUROS POS'].includes(c.categoria)
                        );

                        // Função para mapear nomes de categorias
                        const mapearNomeCategoria = (categoria: string): string => {
                          switch (categoria) {
                            case 'FLEX/CONFORTO':
                              return 'PRÉ-PAGO';
                            case 'SKY MAIS':
                              return 'SKY MAIS';
                            default:
                              return categoria;
                          }
                        };

                        return categoriasFiltradas.map((categoria) => {
                          const saldo = categoria.vendas_realizadas - categoria.meta_definida;
                          const mediaDiariaAtual = categoria.vendas_realizadas / diasUteisDecorridos;
                          const projecaoFinal = mediaDiariaAtual * totalDiasUteisMes;
                          const ideal = (categoria.meta_definida / totalDiasUteisMes) * diasUteisDecorridos;
                          const saldoRestante = Math.max(0, categoria.meta_definida - categoria.vendas_realizadas);
                          const metaDiariaParaMeta = saldoRestante / diasUteisRestantes;

                                          return (
                            <Card 
                              key={categoria.categoria}
                              className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <CardContent className="p-4">
                                {/* Título */}
                                <h3 className="font-bold text-base text-gray-900 mb-4">
                                  {mapearNomeCategoria(categoria.categoria)}
                                </h3>
                                
                                {/* Informações principais */}
                      <div className="space-y-3">
                                  {/* Meta vs Realizado */}
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-600">Meta</span>
                                      <span className="text-sm font-bold text-blue-600">
                                        {categoria.meta_definida.toLocaleString('pt-BR')}
                                      </span>
                            </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-600">Realizado</span>
                                      <span className="text-sm font-bold text-green-600">
                                        {categoria.vendas_realizadas.toLocaleString('pt-BR')}
                                      </span>
                            </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-600">Saldo</span>
                                      <span className={`text-sm font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {saldo >= 0 ? '+' : ''}{Math.abs(saldo).toLocaleString('pt-BR')}
                                      </span>
                            </div>
                            </div>

                                  {/* Percentual destacado */}
                                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-2 text-center">
                                    <span className={`text-base font-bold px-2 py-1 rounded ${
                                      categoria.percentual_atingido >= 100 
                                        ? 'bg-green-100 text-green-800' 
                                        : categoria.percentual_atingido >= 80 
                                        ? 'bg-yellow-100 text-yellow-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {categoria.percentual_atingido.toFixed(1)}%
                                    </span>
                            </div>

                                  {/* Informações secundárias */}
                                  <div className="space-y-1.5 pt-2 border-t border-gray-200">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-gray-500">Projeção</span>
                                      <span className="text-xs font-semibold text-purple-600">
                                        {projecaoFinal.toFixed(0)}
                                      </span>
                            </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-gray-500">Ideal</span>
                                      <span className="text-xs font-semibold text-gray-700">
                                        {ideal.toFixed(0)}
                                      </span>
                            </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-gray-500">Média/Dia</span>
                                      <span className="text-xs font-semibold text-blue-600">
                                        {mediaDiariaAtual.toFixed(1)}
                                      </span>
                            </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-gray-500">Meta/Dia</span>
                                      <span className={`text-xs font-semibold ${
                                        categoria.percentual_atingido >= 100 
                                          ? 'text-green-600' 
                                          : 'text-red-600'
                                      }`}>
                                        {metaDiariaParaMeta.toFixed(1)}
                                      </span>
                          </div>
                        </div>
                            </div>
                              </CardContent>
                            </Card>
                          );
                        });
                      })()}
                      </div>
                    </>
                  );
                })()}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export function MetricsOverview() {
  const data = useData();
  const { calculateTimeMetrics, calculateReopeningMetrics, serviceOrders, technicians, getReopeningPairs, vendas, vendasMeta, baseData, calculateThreeMonthAverage } = data;
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
  
  // Estado para controlar indicadores selecionados no ranking de excelência
  const [selectedExcellenceIndicators, setSelectedExcellenceIndicators] = useState({
    reaberturaAT: true,
    reaberturaPontoPrincipal: true,
    reaberturaATTV: true,        // Novo indicador - TA Ponto Principal TV
    reaberturaATFibra: true,     // Novo indicador - TA Assistência Técnica TV
    otimizacao: true
  });
  
  // Estados para controle de colunas visíveis nas tabelas de técnicos
  const [reopeningVisibleColumns, setReopeningVisibleColumns] = useState<{
    pontoTV: boolean;
    assistenciaTV: boolean;
    assistenciaFibra: boolean;
  }>(() => {
    const saved = localStorage.getItem('reopening-visible-columns');
    return saved ? JSON.parse(saved) : { pontoTV: true, assistenciaTV: true, assistenciaFibra: true };
  });

  // Estado para controlar o modal de detalhes do técnico
  const [selectedTechnicianDetails, setSelectedTechnicianDetails] = useState<string | null>(null);

  const [timeVisibleColumns, setTimeVisibleColumns] = useState<{
    pontoTV: boolean;
    assistenciaTV: boolean;
    assistenciaFibra: boolean;
  }>(() => {
    const saved = localStorage.getItem('time-visible-columns');
    return saved ? JSON.parse(saved) : { pontoTV: true, assistenciaTV: true, assistenciaFibra: true };
  });

  // Salvar preferências de colunas no localStorage
  useEffect(() => {
    localStorage.setItem('reopening-visible-columns', JSON.stringify(reopeningVisibleColumns));
  }, [reopeningVisibleColumns]);

  useEffect(() => {
    localStorage.setItem('time-visible-columns', JSON.stringify(timeVisibleColumns));
  }, [timeVisibleColumns]);
  
  // Estado para os filtros da tabela de ordens de serviço
  const [tableFilters, setTableFilters] = useState<{
    search: string;
    technician: string;
    status: string;
    city: string;
    neighborhood: string;
    serviceTypes: string[];
    motivos: string[];
    dates: string[];
    meta: string;
  }>({
    search: "",
    technician: "",
    status: "",
    city: "",
    neighborhood: "",
    serviceTypes: [],
    motivos: [],
    dates: [],
    meta: ""
  });

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
  
  // Função para buscar vendas do período selecionado por data_habilitacao (igual à guia Metas)
  // Usada para o cálculo de bonificações que deve considerar o mês de habilitação, não o mês de permanência
  const buscarVendasDoPeriodoBonificacoes = useMemo(() => {
    if (!selectedMonth || !selectedYear || activeTab !== "indicadores") {
      return [];
    }
    
    const hoje = new Date();
    const mes = parseInt(selectedMonth, 10);
    const ano = parseInt(selectedYear, 10);
    const isCurrentMonth = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;
    
    // Sempre retornar vendas da aba "vendas permanencia" pela data_habilitacao do mês selecionado
    // O componente BonificacoesVendas já trata a lógica de usar vendasMeta quando necessário
    return vendas.filter(venda => {
      if (!venda.data_habilitacao) return false;
      const dataVenda = new Date(venda.data_habilitacao);
      return dataVenda.getMonth() + 1 === mes && dataVenda.getFullYear() === ano;
    });
  }, [selectedMonth, selectedYear, activeTab, vendas]);
  
  // Verificar se o período selecionado é o mês atual
  const isPeriodoMesAtual = useMemo(() => {
    if (!selectedMonth || !selectedYear) return false;
    const hoje = new Date();
    const mes = parseInt(selectedMonth, 10);
    const ano = parseInt(selectedYear, 10);
    return ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;
  }, [selectedMonth, selectedYear]);
  
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
  
  // Aplicar filtros da tabela nas ordens de serviço
  const tableFilteredServiceOrders = useMemo(() => {
    if (!showData) return [];
    
    const filtered = filteredServiceOrdersByFinalization.filter(order => {
      // Aplicar os mesmos filtros da tabela
      const searchTerm = tableFilters.search.toLowerCase();
      const matchesSearch = 
        order.codigo_os.toLowerCase().includes(searchTerm) ||
        (order.nome_tecnico && order.nome_tecnico.toLowerCase().includes(searchTerm)) ||
        (order.tipo_servico && order.tipo_servico.toLowerCase().includes(searchTerm)) ||
        (order.subtipo_servico && order.subtipo_servico.toLowerCase().includes(searchTerm)) ||
        (order.nome_cliente && order.nome_cliente.toLowerCase().includes(searchTerm)) ||
        (order.motivo && order.motivo.toLowerCase().includes(searchTerm)) ||
        (order.acao_tomada && order.acao_tomada.toLowerCase().includes(searchTerm)) ||
        (order.info_endereco_completo && order.info_endereco_completo.toLowerCase().includes(searchTerm));
      
      const matchesTechnician = !tableFilters.technician || tableFilters.technician === "all" || order.nome_tecnico === tableFilters.technician;
      const matchesServiceType = tableFilters.serviceTypes.length === 0 || tableFilters.serviceTypes.includes(order.subtipo_servico);
      const matchesStatus = !tableFilters.status || tableFilters.status === "all" || order.status === tableFilters.status;
      const matchesCity = !tableFilters.city || tableFilters.city === "all" || normalizeCityName(order.cidade) === tableFilters.city;
      const matchesNeighborhood = !tableFilters.neighborhood || tableFilters.neighborhood === "all" || normalizeNeighborhoodName(order.bairro) === tableFilters.neighborhood;
      const matchesMotivo = tableFilters.motivos.length === 0 || tableFilters.motivos.includes(order.motivo);
      const matchesMeta = !tableFilters.meta || tableFilters.meta === "all" || 
        (tableFilters.meta === "atingiu" && order.atingiu_meta === true) ||
        (tableFilters.meta === "nao_atingiu" && order.atingiu_meta === false);
      
      // Função para formatar data de finalização para comparação
      const formatDateForFilter = (dateString: string) => {
        if (!dateString) return "";
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString('pt-BR');
        } catch {
          return "";
        }
      };
      
      const matchesFinalizationDate = tableFilters.dates.length === 0 ||
        tableFilters.dates.includes(formatDateForFilter(order.data_finalizacao));
      
      return matchesSearch && matchesTechnician && matchesServiceType && matchesStatus && 
             matchesCity && matchesNeighborhood && matchesMotivo && matchesMeta && matchesFinalizationDate;
    });
    
    // Log comparativo simples
    const applicableAfter = filtered.filter(order => {
      return (
        (order.tipo_servico === "Ponto Principal" && order.motivo === "Individual") ||
        (order.tipo_servico === "Instalação" && order.motivo === "Individual") ||
        order.motivo === "Reinstalacao Novo Endereco"
      );
    });
    const applicableWithoutMaterialsAfter = applicableAfter.filter(o => 
      !o.materiais || o.materiais.length === 0
    );
    
    console.log('🔍 [FILTROS]', {
      antes: filteredServiceOrdersByFinalization.length,
      depois: filtered.length,
      aplicaveis: applicableAfter.length,
      aplicaveisSemMateriais: applicableWithoutMaterialsAfter.length
    });
    
    return filtered;
  }, [filteredServiceOrdersByFinalization, tableFilters, showData]);
  
  // Helper: verifica se há filtros ativos
  const isAnyFilterActive = useMemo(() => {
    const f = tableFilters;
    return !!(
      (f.search && f.search.trim() !== "") ||
      (f.technician && f.technician !== "all" && f.technician !== "") ||
      (f.status && f.status !== "all" && f.status !== "") ||
      (f.city && f.city !== "all" && f.city !== "") ||
      (f.neighborhood && f.neighborhood !== "all" && f.neighborhood !== "") ||
      (f.meta && f.meta !== "all" && f.meta !== "") ||
      (f.serviceTypes && f.serviceTypes.length > 0) ||
      (f.motivos && f.motivos.length > 0)
      // NOTA: f.dates é intencionalmente ignorado aqui, pois é específico do mês atual
    );
  }, [tableFilters]);

  // Helper: aplica os mesmos filtros da tabela em um order (exceto data)
  const applyTableFiltersBase = useCallback((order: ServiceOrder) => {
    const f = tableFilters;
    const searchTerm = (f.search || "").toLowerCase();

    const matchesSearch =
      !searchTerm ||
      order.codigo_os.toLowerCase().includes(searchTerm) ||
      (order.nome_tecnico && order.nome_tecnico.toLowerCase().includes(searchTerm)) ||
      (order.tipo_servico && order.tipo_servico.toLowerCase().includes(searchTerm)) ||
      (order.subtipo_servico && order.subtipo_servico.toLowerCase().includes(searchTerm)) ||
      (order.nome_cliente && order.nome_cliente.toLowerCase().includes(searchTerm)) ||
      (order.motivo && order.motivo.toLowerCase().includes(searchTerm)) ||
      (order.acao_tomada && order.acao_tomada.toLowerCase().includes(searchTerm)) ||
      (order.info_endereco_completo && order.info_endereco_completo.toLowerCase().includes(searchTerm));

    const matchesTechnician = !f.technician || f.technician === "all" || order.nome_tecnico === f.technician;
    const matchesServiceType = !f.serviceTypes?.length || f.serviceTypes.includes(order.subtipo_servico);
    const matchesStatus = !f.status || f.status === "all" || order.status === f.status;
    const matchesCity = !f.city || f.city === "all" || normalizeCityName(order.cidade) === f.city;
    const matchesNeighborhood = !f.neighborhood || f.neighborhood === "all" || normalizeNeighborhoodName(order.bairro) === f.neighborhood;
    const matchesMotivo = !f.motivos?.length || f.motivos.includes(order.motivo);
    const matchesMeta =
      !f.meta || f.meta === "all" ||
      (f.meta === "atingiu" && order.atingiu_meta === true) ||
      (f.meta === "nao_atingiu" && order.atingiu_meta === false);

    return matchesSearch && matchesTechnician && matchesServiceType && matchesStatus &&
           matchesCity && matchesNeighborhood && matchesMotivo && matchesMeta;
  }, [tableFilters]);
  
  // Obter métricas apenas com as ordens filtradas (incluindo filtros da tabela)
  const timeMetrics = useMemo(() => {
    if (!showData || tableFilteredServiceOrders.length === 0) {
      return {
        ordersWithinGoal: 0,
        ordersOutsideGoal: 0,
        percentWithinGoal: 0,
        averageTime: 0,
        servicesByType: {}
      };
    }
    
    return calculateTimeMetrics(tableFilteredServiceOrders);
  }, [calculateTimeMetrics, tableFilteredServiceOrders, showData]);

  // Calcular dados para comparação de serviços finalizados (usando dados filtrados da tabela)
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
         // Se for mês atual → usar o já filtrado (tableFilteredServiceOrders)
         const isCurrent =
           targetYear === selectedYearNum && targetMonth === selectedMonthNum;

         const source = isCurrent
           ? tableFilteredServiceOrders
           // Se há filtros ativos, aplicamos os mesmos filtros base em serviceOrders
           : (isAnyFilterActive
               ? serviceOrders.filter(applyTableFiltersBase)
               : serviceOrders);

         return source.filter(order => {
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
  }, [tableFilteredServiceOrders, serviceOrders, selectedMonth, selectedYear, showData, isAnyFilterActive, applyTableFiltersBase]);
  
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
        
        // Reaberturas por bairro (incluindo cidade entre parênteses)
        const neighborhood = normalizeNeighborhoodName(pair.reopeningOrder.bairro) || "Desconhecido";
        const neighborhoodWithCity = `${neighborhood} (${city})`;
        reopeningsByNeighborhood[neighborhoodWithCity] = (reopeningsByNeighborhood[neighborhoodWithCity] || 0) + 1;
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
  
  // Calcular média dos últimos 3 meses para cada tipo de serviço
  const threeMonthAverages = useMemo(() => {
    if (!showData || !selectedMonth || !selectedYear) {
      return {};
    }
    
    const currentMonth = parseInt(selectedMonth);
    const currentYear = parseInt(selectedYear);
    
    return calculateThreeMonthAverage(currentMonth, currentYear);
  }, [calculateThreeMonthAverage, selectedMonth, selectedYear, showData]);

  // Mapa com estatísticas de otimização por técnico (replicando card Otimização de Consumo)
  const optimizationStatsByTechnician = useMemo(() => {
    const stats = new Map<string, {
      volumeOS: number;
      consumoAntena: number;
      consumoLnbs: number;
    }>();

    const uniqueOrders = tableFilteredServiceOrders.reduce((acc, order) => {
      if (!acc.has(order.codigo_os)) {
        acc.set(order.codigo_os, order);
      }
      return acc;
    }, new Map<string, ServiceOrder>());

    const deduplicatedOrders = Array.from(uniqueOrders.values());

    const applicableOrders = deduplicatedOrders.filter(order => {
      return (
        (order.tipo_servico === "Ponto Principal" && order.motivo === "Individual") ||
        (order.tipo_servico === "Instalação" && order.motivo === "Individual") ||
        order.motivo === "Reinstalacao Novo Endereco"
      );
    });

    applicableOrders.forEach(order => {
      const technician = order.nome_tecnico;
      if (!technician) return;

      if (!stats.has(technician)) {
        stats.set(technician, {
          volumeOS: 0,
          consumoAntena: 0,
          consumoLnbs: 0
        });
      }

      const technicianStats = stats.get(technician)!;
      technicianStats.volumeOS++;

      const materiais = order.materiais || [];
      const antena150 = materiais.find(m => m.nome === "ANTENA 150 CM C/ KIT FIXACAO");
      const antena75 = materiais.find(m => m.nome === "ANTENA 75 CM");
      const antena90 = materiais.find(m => m.nome === "ANTENA 90CM C/ KIT FIXACAO");
      const antena60 = materiais.find(m => m.nome === "ANTENA DE 60 CM C/ KIT FIXACAO");
      const somaAntenas =
        (antena150?.quantidade || 0) +
        (antena75?.quantidade || 0) +
        (antena90?.quantidade || 0) +
        (antena60?.quantidade || 0);
      if (somaAntenas > 0) {
        technicianStats.consumoAntena++;
      }

      const lnbfSimples = materiais.find(m => m.nome === "LNBF SIMPLES ANTENA 45/60/90 CM");
      const lnbfDuplo = materiais.find(m => m.nome === "LNBF DUPLO ANTENA 45/60/90 CM");
      const somaLnbfs = (lnbfSimples?.quantidade || 0) + (lnbfDuplo?.quantidade || 0);
      if (somaLnbfs > 0) {
        technicianStats.consumoLnbs++;
      }
    });

    return stats;
  }, [tableFilteredServiceOrders]);
  
  // Calcular ranking de excelência dos técnicos (Top 3)
  const technicianExcellenceRanking = useMemo(() => {
    if (!showData || !selectedMonth || !selectedYear || technicians.length === 0) {
      return [];
    }
    
    const techStats = technicians
      .filter(name => name)
      .map(name => {
        const techOrders = filteredServiceOrders.filter(o => o.nome_tecnico === name);
        
        // Contar serviços por tipo
        const pontoPrincipalTVServices = techOrders.filter(o => {
          const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
          return category === "Ponto Principal TV";
        }).length;
        
        const assistenciaTecnicaTVServices = techOrders.filter(o => {
          const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
          return category === "Assistência Técnica TV";
        }).length;
        
        const assistenciaTecnicaFibraServices = techOrders.filter(o => {
          const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
          return category === "Assistência Técnica FIBRA";
        }).length;
        
        // Contar reaberturas
        let pontoTVReopenings = 0;
        let assistenciaTVReopenings = 0;
        let assistenciaFibraReopenings = 0;
        
        const techReopeningPairs = getFilteredReopeningPairs.filter(
          pair => pair.originalOrder.nome_tecnico === name
        );
        
        techReopeningPairs.forEach(pair => {
          const originalCategory = pair.originalServiceCategory;
          if (originalCategory?.includes("Ponto Principal TV")) {
            pontoTVReopenings++;
          } else if (originalCategory?.includes("Assistência Técnica TV")) {
            assistenciaTVReopenings++;
          } else if (originalCategory?.includes("Assistência Técnica FIBRA")) {
            assistenciaFibraReopenings++;
          }
        });
        
        // Calcular percentuais de reabertura
        const pontoTVRate = pontoPrincipalTVServices > 0 ? (pontoTVReopenings / pontoPrincipalTVServices) * 100 : 0;
        const assistenciaTVRate = assistenciaTecnicaTVServices > 0 ? (assistenciaTVReopenings / assistenciaTecnicaTVServices) * 100 : 0;
        const assistenciaFibraRate = assistenciaTecnicaFibraServices > 0 ? (assistenciaFibraReopenings / assistenciaTecnicaFibraServices) * 100 : 0;
        
        // Contar OSs finalizadas por tempo de atendimento (meta atingida)
        const pontoTvWithinGoal = techOrders.filter(o => {
          const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
          return category === "Ponto Principal TV" && o.atingiu_meta === true && o.data_finalizacao && o.include_in_metrics;
        }).length;
        
        const pontoTvOutsideGoal = techOrders.filter(o => {
          const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
          return category === "Ponto Principal TV" && o.atingiu_meta === false && o.data_finalizacao && o.include_in_metrics;
        }).length;
        
        const assistTvWithinGoal = techOrders.filter(o => {
          const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
          return category === "Assistência Técnica TV" && o.atingiu_meta === true && o.data_finalizacao && o.include_in_metrics;
        }).length;
        
        const assistTvOutsideGoal = techOrders.filter(o => {
          const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
          return category === "Assistência Técnica TV" && o.atingiu_meta === false && o.data_finalizacao && o.include_in_metrics;
        }).length;
        
        // Calcular percentuais de tempo de atendimento (% na meta)
        const totalPontoTv = pontoTvWithinGoal + pontoTvOutsideGoal;
        const percentPontoTvTA = totalPontoTv > 0 ? (pontoTvWithinGoal / totalPontoTv) * 100 : 0;
        
        const totalAssistTv = assistTvWithinGoal + assistTvOutsideGoal;
        const percentAssistTvTA = totalAssistTv > 0 ? (assistTvWithinGoal / totalAssistTv) * 100 : 0;
        
        // Reabertura de AT (TV + FIBRA combinadas)
        const totalATServices = assistenciaTecnicaTVServices + assistenciaTecnicaFibraServices;
        const totalATReopenings = assistenciaTVReopenings + assistenciaFibraReopenings;
        const atRate = totalATServices > 0 ? (totalATReopenings / totalATServices) * 100 : 0;
        
        const optimizationStats = optimizationStatsByTechnician.get(name) || {
          volumeOS: 0,
          consumoAntena: 0,
          consumoLnbs: 0
        };
        const volumeOS = optimizationStats.volumeOS;
        const percentualConsumo = volumeOS > 0
          ? ((optimizationStats.consumoAntena / volumeOS) + (optimizationStats.consumoLnbs / volumeOS)) / 2 * 100
          : 0;
        const percentualOtimizacao = 100 - percentualConsumo;
        
        // Calcular score final baseado em pesos por categoria
        // REABERTURA: 50%, OTIMIZAÇÃO: 30%, TEMPO DE ATENDIMENTO: 20%
        
        // Categoria 1: REABERTURA (média dos indicadores de reabertura selecionados)
        const reaberturaIndicators = [];
        if (selectedExcellenceIndicators.reaberturaAT) {
          reaberturaIndicators.push(100 - atRate);
        }
        if (selectedExcellenceIndicators.reaberturaPontoPrincipal) {
          reaberturaIndicators.push(100 - pontoTVRate);
        }
        const avgReabertura = reaberturaIndicators.length > 0
          ? reaberturaIndicators.reduce((sum, val) => sum + val, 0) / reaberturaIndicators.length
          : null;
        
        // Categoria 2: TEMPO DE ATENDIMENTO (média dos indicadores de TA selecionados)
        const taIndicators = [];
        if (selectedExcellenceIndicators.reaberturaATTV) {
          taIndicators.push(percentPontoTvTA);
        }
        if (selectedExcellenceIndicators.reaberturaATFibra) {
          taIndicators.push(percentAssistTvTA);
        }
        const avgTA = taIndicators.length > 0
          ? taIndicators.reduce((sum, val) => sum + val, 0) / taIndicators.length
          : null;
        
        // Categoria 3: OTIMIZAÇÃO
        const avgOtimizacao = selectedExcellenceIndicators.otimizacao
          ? percentualOtimizacao
          : null;
        
        // Calcular pesos proporcionais baseado nas categorias ativas
        // Pesos base: Reabertura 50%, Otimização 30%, TA 20%
        let pesoReabertura = 0.50;
        let pesoOtimizacao = 0.30;
        let pesoTA = 0.20;
        
        // Se alguma categoria não estiver ativa, redistribuir proporcionalmente
        const categoriasAtivas = [];
        if (avgReabertura !== null) categoriasAtivas.push({ nome: 'reabertura', peso: 0.50 });
        if (avgOtimizacao !== null) categoriasAtivas.push({ nome: 'otimizacao', peso: 0.30 });
        if (avgTA !== null) categoriasAtivas.push({ nome: 'ta', peso: 0.20 });
        
        // Normalizar pesos para somar 100%
        const somaPesos = categoriasAtivas.reduce((sum, cat) => sum + cat.peso, 0);
        if (somaPesos > 0) {
          const fatorNormalizacao = 1.0 / somaPesos;
          pesoReabertura = avgReabertura !== null ? 0.50 * fatorNormalizacao : 0;
          pesoOtimizacao = avgOtimizacao !== null ? 0.30 * fatorNormalizacao : 0;
          pesoTA = avgTA !== null ? 0.20 * fatorNormalizacao : 0;
        }
        
        // Score final: soma ponderada das categorias ativas
        const scoreFinal = 
          (avgReabertura !== null ? avgReabertura * pesoReabertura : 0) +
          (avgOtimizacao !== null ? avgOtimizacao * pesoOtimizacao : 0) +
          (avgTA !== null ? avgTA * pesoTA : 0);
        
        // Total geral de serviços (excluindo canceladas e tipos específicos)
        // Excluir: Corretiva, Corretiva BL, Entrega emergencial Controle Remoto
        const totalServices = techOrders.filter(o => {
          if (o.status === "Cancelada") return false;
          const subtipo = o.subtipo_servico || "";
          const motivo = o.motivo || "";
          
          // Excluir Corretiva e Corretiva BL
          if (subtipo === "Corretiva" || subtipo === "Corretiva BL") return false;
          
          // Excluir Entrega emergencial Controle Remoto (pode estar em subtipo ou motivo)
          if (subtipo.includes("Entrega emergencial Controle Remoto") || 
              motivo.includes("Entrega emergencial Controle Remoto")) return false;
          
          return true;
        }).length;
        
        return {
          nome: name,
          scoreFinal,
          atRate,
          pontoTVRate,
          assistenciaTVRate,
          assistenciaFibraRate,
          percentualOtimizacao,
          percentualConsumo,
          percentPontoTvTA,       // % tempo de atendimento PP TV
          percentAssistTvTA,      // % tempo de atendimento AT TV
          pontoTvWithinGoal,      // Quantidade na meta PP TV
          pontoTvOutsideGoal,     // Quantidade fora da meta PP TV
          assistTvWithinGoal,     // Quantidade na meta AT TV
          assistTvOutsideGoal,    // Quantidade fora da meta AT TV
          totalPontoTv,           // Total de OSs PP TV
          totalAssistTv,          // Total de OSs AT TV
          totalServices,
          volumeOS,
          pontoPrincipalTVServices,
          assistenciaTecnicaTVServices,
          assistenciaTecnicaFibraServices
        };
      })
      .filter(tech => tech.totalServices > 0) // Apenas técnicos com serviços
      .sort((a, b) => {
        // Ordenar por score (maior = melhor)
        if (b.scoreFinal !== a.scoreFinal) {
          return b.scoreFinal - a.scoreFinal;
        }
        // Em caso de empate: maior volume de serviços
        return b.totalServices - a.totalServices;
      });
    
    return techStats.slice(0, 3); // Top 3
  }, [technicians, filteredServiceOrders, getFilteredReopeningPairs, showData, selectedMonth, selectedYear, optimizationStatsByTechnician, selectedExcellenceIndicators]);
  
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
    
    // Converter o Set para array, remover "Ponto Principal BL" e ordenar alfabeticamente
    return Array.from(uniqueTypes)
      .filter(type => type !== 'Ponto Principal BL')
      .sort();
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
  
  // Função para limpar filtros
  const handleClearFilters = () => {
    setSelectedMonth(null);
    setSelectedYear(null);
    setShowData(false);
    setIsFiltering(false);
  };
  
  // Componente de filtro reutilizável
  const FilterControls = () => (
    <Card className="mb-6 shadow-lg border-2">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b-2 pb-4">
        <CardTitle className="text-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Filter className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-gray-800 font-semibold">Filtrar por Período</span>
          </div>
        </CardTitle>
        <CardDescription className="text-sm mt-2 text-gray-600">
          {activeTab === "reopening" ? (
            "Selecione o mês e ano para visualizar reaberturas criadas no período"
          ) : (
            activeTab === "time" ? 
            "Selecione o mês e ano para visualizar os dados (Data de Finalização)" :
            "Selecione o mês e ano para visualizar os dados (Data de Criação ou Finalização)"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="month-select" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-indigo-600" />
                Mês
              </Label>
            <Select 
              value={selectedMonth || ""} 
              onValueChange={(value) => setSelectedMonth(value || null)}
              disabled={isFiltering}
            >
                <SelectTrigger id="month-select" className="h-11">
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
          
            <div className="space-y-2">
              <Label htmlFor="year-select" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-indigo-600" />
                Ano
              </Label>
            <Select 
              value={selectedYear || ""} 
              onValueChange={(value) => setSelectedYear(value || null)}
              disabled={isFiltering}
            >
                <SelectTrigger id="year-select" className="h-11">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
            <div className="flex items-end">
            <Button 
              onClick={handleClearFilters}
              variant="outline"
                disabled={!selectedMonth && !selectedYear}
                className="w-full h-11 border-2 hover:bg-gray-50 font-semibold"
                size="lg"
            >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Limpar Filtros
            </Button>
          </div>
        </div>

          {/* Badges de seleção ativa */}
          {(selectedMonth || selectedYear) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
              {selectedMonth && (
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 px-3 py-1.5 text-sm font-semibold">
                  <CalendarIcon className="h-3 w-3 mr-1.5" />
                  Mês: {getMonthName(selectedMonth)}
                </Badge>
              )}
              {selectedYear && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 px-3 py-1.5 text-sm font-semibold">
                  <CalendarIcon className="h-3 w-3 mr-1.5" />
                  Ano: {selectedYear}
                </Badge>
              )}
            </div>
          )}

          {/* Notas informativas */}
        {activeTab === "time" && (
            <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-semibold mb-1">Nota Importante</p>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Os dados mostrados são das ordens de serviço <strong className="font-semibold">finalizadas</strong> no mês e ano selecionados. O cálculo de tempo de atendimento considera apenas OSs que já foram concluídas.
                  </p>
                </div>
              </div>
          </div>
        )}
        {activeTab === "reopening" && (
            <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-900 font-semibold mb-1">Nota Importante</p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    As reaberturas mostradas são aquelas <strong className="font-semibold">criadas</strong> no mês e ano selecionados, mesmo que a OS original tenha sido finalizada em um mês anterior. A taxa de reabertura considera apenas os tipos de serviço que podem gerar reaberturas. O "Total de Ordens Abertas" considera as OSs <strong className="font-semibold">criadas ou finalizadas</strong> no mês selecionado.
                  </p>
                </div>
              </div>
          </div>
        )}
        </div>
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
              <span className="text-xs sm:text-sm">Tempos e Otimização</span>
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
        {/* Três quadros lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Service Type Time Performance */}
          <Card className="shadow-md">
            <CardHeader className="pb-3 border-b border-gray-200">
              <CardTitle className="text-lg">
                <div className="flex items-center space-x-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <span>Desempenho por Tempo de Atendimento</span>
                  </div>
                </CardTitle>
              <CardDescription className="mt-2 text-sm text-gray-600">
                Análise do tempo médio de atendimento por tipo de serviço
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto w-full">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-700 text-sm px-3 py-3">Tipo de Serviço</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 text-sm px-3 py-3">Dentro Meta</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 text-sm px-3 py-3">Total</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 text-sm px-3 py-3">% Meta</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 text-sm px-3 py-3">Serv. p/ Meta</TableHead>
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
                        .map((type, index) => {
                          const metrics = timeMetrics.servicesByType[type] as {
                            totalOrders: number;
                            withinGoal: number;
                            percentWithinGoal: number;
                            averageTime: number;
                          };
                          const goalPercent = metrics.percentWithinGoal;
                          const servicesNeeded = calculateServicesNeededForTimeTarget(type, metrics.withinGoal, metrics.totalOrders);
                          const colorClass = getTimeAttendanceColorByServiceType(type, goalPercent);
                          
                          return (
                            <TableRow 
                              key={type} 
                              className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-gray-100 transition-colors`}
                            >
                              <TableCell className="font-medium text-sm px-3 py-3">{type}</TableCell>
                              <TableCell className="text-center px-3 py-3">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-semibold">
                                  {metrics.withinGoal}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center px-3 py-3">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                                  {metrics.totalOrders}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center px-3 py-3">
                                <span className={`text-base font-bold ${colorClass}`}>
                                  {goalPercent.toFixed(2)}%
                                </span>
                              </TableCell>
                              <TableCell className="text-center px-3 py-3">
                                {formatTimeMetaDisplay(servicesNeeded)}
                              </TableCell>
                            </TableRow>
                          );
                        });
                    })()}
                    
                    {Object.keys(timeMetrics.servicesByType).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                          Nenhum dado disponível para análise no período selecionado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 font-semibold mb-2">📋 Legenda - Serv. p/ Meta:</p>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600 font-medium">+X acima</span>
                      <span>= dentro da meta com X serviços acima</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600 font-medium">limite</span>
                      <span>= exatamente no limite da meta</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-red-600 font-medium">+X serviços</span>
                      <span>= fora da meta, precisa de X serviços adicionais para voltar à faixa verde</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total de Serviços Finalizados */}
          <Card className="shadow-md">
            <CardHeader className="pb-3 border-b border-gray-200">
              <CardTitle className="text-lg">
                <div className="flex items-center space-x-2">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <span>Total de Serviços Finalizados</span>
                </div>
              </CardTitle>
              <CardDescription className="mt-2 text-sm text-gray-600">
                Comparação mensal de serviços finalizados por subtipo
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
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
                           <div className="flex items-center mb-2 pb-1.5 border-b-2 border-blue-200 bg-blue-50/30 -mx-2 px-2.5 py-1.5 rounded-t-lg">
                             <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                             <h4 className="font-semibold text-sm text-blue-700">Assistência Técnica</h4>
                             <Badge variant="outline" className="ml-2 text-[10px] text-blue-700 bg-blue-100 border-blue-300 font-medium px-1.5 py-0">
                               Redução = Melhoria
                             </Badge>
                           </div>
                           <div className="space-y-1.5 ml-5">
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
                                 <div key={item.subtipo} className="border-b border-gray-100 pb-1.5 last:border-b-0 hover:bg-gray-50/50 rounded px-2 py-1 transition-colors">
                                   <div className="mb-1">
                                     <span className="font-semibold text-xs text-gray-800">{mapServiceTypeName(item.subtipo)}</span>
                                   </div>
                                   
                                   <div className="grid grid-cols-12 gap-1.5 text-xs items-center">
                                     {/* Seção Mês Atual vs Anterior */}
                                     <div className="col-span-1">
                                       <div className="text-gray-500 text-[10px] font-medium uppercase mb-0.5">Atual</div>
                                       <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[11px] px-1.5 py-0">
                                         {item.currentMonth}
                                       </Badge>
                                     </div>
                                     <div className="col-span-1">
                                       <div className="text-gray-500 text-[10px] font-medium uppercase mb-0.5">M.A.</div>
                                       <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-semibold text-[11px] px-1.5 py-0">
                                         {item.previousMonth}
                                       </Badge>
                                     </div>
                                     <div className="col-span-3">
                                       <div className="text-gray-500 text-[10px] font-medium uppercase mb-0.5">Diferença</div>
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
                                       <div className="text-gray-500 text-[10px] font-medium uppercase mb-0.5">M3M</div>
                                       <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-[11px] px-1.5 py-0">
                                         {averageThreeMonths}
                                       </Badge>
                                     </div>
                                     <div className="col-span-4">
                                       <div className="text-gray-500 text-[10px] font-medium uppercase mb-0.5">Diferença</div>
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
                           <div className="flex items-center mb-2 pb-1.5 border-b-2 border-green-200 bg-green-50/30 -mx-2 px-2.5 py-1.5 rounded-t-lg">
                             <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                             <h4 className="font-semibold text-sm text-green-700">Outros Serviços</h4>
                             <Badge variant="outline" className="ml-2 text-[10px] text-green-700 bg-green-100 border-green-300 font-medium px-1.5 py-0">
                               Aumento = Melhoria
                             </Badge>
                           </div>
                           <div className="space-y-1.5 ml-5">
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
                                 <div key={item.subtipo} className="border-b border-gray-100 pb-1.5 last:border-b-0 hover:bg-gray-50/50 rounded px-2 py-1 transition-colors">
                                   <div className="mb-1">
                                     <span className="font-semibold text-xs text-gray-800">{mapServiceTypeName(item.subtipo)}</span>
                                   </div>
                                   
                                   <div className="grid grid-cols-12 gap-1.5 text-xs items-center">
                                     {/* Seção Mês Atual vs Anterior */}
                                     <div className="col-span-1">
                                       <div className="text-gray-500 text-[10px] font-medium uppercase mb-0.5">Atual</div>
                                       <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[11px] px-1.5 py-0">
                                         {item.currentMonth}
                                       </Badge>
                                     </div>
                                     <div className="col-span-1">
                                       <div className="text-gray-500 text-[10px] font-medium uppercase mb-0.5">M.A.</div>
                                       <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-semibold text-[11px] px-1.5 py-0">
                                         {item.previousMonth}
                                       </Badge>
                                     </div>
                                     <div className="col-span-3">
                                       <div className="text-gray-500 text-[10px] font-medium uppercase mb-0.5">Diferença</div>
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
                                       <div className="text-gray-500 text-[10px] font-medium uppercase mb-0.5">M3M</div>
                                       <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-[11px] px-1.5 py-0">
                                         {averageThreeMonths}
                                       </Badge>
                                     </div>
                                     <div className="col-span-4">
                                       <div className="text-gray-500 text-[10px] font-medium uppercase mb-0.5">Diferença</div>
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

          {/* Card de Contagem de Economia de Materiais */}
          <OptimizationCountCard serviceOrders={tableFilteredServiceOrders} />
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
            
        {/* Grid - Card Unificado de Métricas de Reabertura + Tabela */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Card Unificado de Métricas de Reabertura */}
          <Card className="md:col-span-2 shadow-md">
            <CardHeader className="pb-3 border-b border-gray-200">
              <CardTitle className="text-lg">
                <div className="flex items-center space-x-2">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <Repeat className="h-5 w-5 text-red-600" />
                  </div>
                  <span>Métricas de Reabertura</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {/* Total de Ordens Abertas - Destaque Principal */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-900">Total de Ordens Abertas</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mb-2">
                {originalServiceTypeFilter 
                  ? `Total de ${originalServiceTypeFilter}`
                  : "Soma de Corretiva, Corretiva BL, Ponto Principal e Ponto Principal BL"}
                  </p>
                  <Badge className="bg-blue-600 text-white text-2xl px-4 py-1.5 font-bold">
                {filteredServiceOrders.filter(order => {
                  if (originalServiceTypeFilter) {
                    return order.subtipo_servico === originalServiceTypeFilter;
                  } else {
                    return ["Ponto Principal", "Ponto Principal BL", "Corretiva", "Corretiva BL"].some(
                      type => order.subtipo_servico?.includes(type)
                    );
                  }
                }).length}
                  </Badge>
                </div>

                {/* Grid 2x1 para Ordens Reabertas e Chance */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Ordens Reabertas */}
                  <div className="p-2.5 bg-red-50 rounded-lg border border-red-200 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Repeat className="h-3.5 w-3.5 text-red-600" />
                      <span className="text-xs font-semibold text-red-900">Reabertas</span>
                    </div>
                    <p className="text-[10px] text-gray-600 mb-1.5">Total identificado</p>
                    <Badge className="bg-red-600 text-white text-xl px-3 py-1 font-bold">
                      {getReopeningMetrics.reopenedOrders}
                    </Badge>
                  </div>

                  {/* Chance de Reabertura */}
                  <div className="p-2.5 bg-orange-50 rounded-lg border border-orange-200 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <BarChart2 className="h-3.5 w-3.5 text-orange-600" />
                      <span className="text-xs font-semibold text-orange-900">Taxa</span>
                    </div>
                    <p className="text-[10px] text-gray-600 mb-1.5">% sobre total</p>
                    <div className="text-xl font-bold text-orange-600 mb-1">
                      {getReopeningMetrics.reopeningRate.toFixed(2).replace('.', ',')}%
                    </div>
                    <Progress 
                      value={getReopeningMetrics.reopeningRate} 
                      className="h-1.5"
                    />
                  </div>
                </div>

                {/* Tempo Médio Entre OS */}
                <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="h-3.5 w-3.5 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-900">Tempo Médio Entre OS</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mb-1.5">
                    Entre finalização original e reabertura
                  </p>
                  <div className="text-xl font-bold text-purple-600">
                    {getReopeningMetrics.averageTimeBetween} horas
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5">
                    ({(getReopeningMetrics.averageTimeBetween / 24).toFixed(1)} dias)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Reaberturas por Tipo da OS Original - Ocupa 3 colunas */}
          <Card className="md:col-span-3 shadow-md">
            <CardHeader className="pb-3 border-b border-gray-200">
              <CardTitle className="text-lg">
                <div className="flex items-center space-x-2">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <BarChart2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <span>Reaberturas por Tipo da OS Original</span>
                </div>
              </CardTitle>
              <CardDescription className="mt-2 text-sm text-gray-600">
                Análise de reaberturas por tipo de serviço
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 overflow-y-auto" style={{ maxHeight: "450px" }}>
              <div className="overflow-x-auto w-full">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-700 text-sm px-3 py-3">Tipo da OS Original</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 text-sm px-3 py-3">Serviços</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 text-sm px-3 py-3">Reab.</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 text-sm px-3 py-3">M3M</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 text-sm px-3 py-3">% Reabertura</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 text-sm px-3 py-3">Serv. p/ Meta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(getReopeningMetrics.reopeningsByOriginalType)
                      .filter(([type, data]) => {
                        // Remover "Ponto Principal BL" (Ponto Principal FIBRA)
                        if (type === 'Ponto Principal BL') {
                          return false;
                        }
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
                        const index = Object.entries(getReopeningMetrics.reopeningsByOriginalType)
                          .filter(([t, d]) => {
                            if (originalServiceTypeFilter) return t === originalServiceTypeFilter;
                            return true;
                          })
                          .sort((a, b) => {
                            const orderPriority = ["Corretiva", "Corretiva BL", "Ponto Principal", "Ponto Principal BL"];
                            if (orderPriority.includes(a[0]) && orderPriority.includes(b[0])) {
                              return orderPriority.indexOf(a[0]) - orderPriority.indexOf(b[0]);
                            }
                            if (orderPriority.includes(a[0])) return -1;
                            if (orderPriority.includes(b[0])) return 1;
                            return a[0].localeCompare(b[0]);
                          })
                          .findIndex(([t]) => t === type);
                        
                        return (
                          <TableRow 
                            key={type}
                            className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-gray-100 transition-colors`}
                          >
                            <TableCell className="font-semibold text-sm px-3 py-3">{displayName}</TableCell>
                            <TableCell className="text-center px-3 py-3">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs">
                                {data.totalOriginals}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center px-3 py-3">
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-semibold text-xs">
                                {data.reopenings}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center px-3 py-3">
                              {threeMonthAverages[type] !== undefined ? (
                                <span className={`font-bold text-sm ${
                                  data.reopenings < threeMonthAverages[type] ? 'text-green-600' :
                                  data.reopenings > threeMonthAverages[type] ? 'text-red-600' : 
                                  'text-yellow-600'
                                }`}>
                                  {threeMonthAverages[type]}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center px-3 py-3">
                              <span className={`text-base font-bold ${getReopeningColorByServiceType(type, (data.reopenings / data.totalOriginals * 100))}`}>
                                {data.totalOriginals > 0 ? (data.reopenings / data.totalOriginals * 100).toFixed(2) : '0.00'}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center px-3 py-3">
                              {servicesNeeded < 0 ? (
                                <span className="text-green-600 font-semibold text-sm">{Math.abs(servicesNeeded)} reab. disp.</span>
                              ) : servicesNeeded === 0 ? (
                                <span className="text-amber-600 font-semibold text-sm">0 reab. disp.</span>
                              ) : (
                                <span className="text-red-600 font-semibold text-sm">
                                  +{servicesNeeded} serviços
                                  <span className="text-muted-foreground ml-1 text-xs">({data.totalOriginals + servicesNeeded} total)</span>
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    }
                    
                    {Object.keys(getReopeningMetrics.reopeningsByOriginalType).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                          Nenhuma reabertura encontrada no período selecionado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 font-semibold mb-2">📋 Legenda:</p>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div>
                      <span className="font-medium text-gray-800">Nota:</span> Na coluna "Serviços" são contabilizadas todas as ordens que foram <strong>criadas OU finalizadas</strong> no mês selecionado.
                </div>
                    <div>
                      <span className="font-medium text-gray-800">M3M (Média 3 Meses):</span> Representa a <strong>média de reaberturas dos últimos 3 meses anteriores</strong> ao mês selecionado. Cores: <span className="text-green-600 font-medium">Verde</span> = mês atual abaixo da média, <span className="text-yellow-600 font-medium">Amarelo</span> = igual à média, <span className="text-red-600 font-medium">Vermelho</span> = acima da média.
              </div>
                    <div>
                      <span className="font-medium text-gray-800">Serv. p/ Meta:</span> <span className="text-green-600 font-medium">X reab. disp.</span> = dentro da meta com X reaberturas ainda disponíveis, <span className="text-amber-600 font-medium">0 reab. disp.</span> = no limite exato da meta (ponto de atenção), <span className="text-red-600 font-medium">+X serviços (Y total)</span> = fora da meta, precisa de X serviços adicionais (chegando a Y serviços no total) para voltar à faixa verde.
                    </div>
                  </div>
                </div>
                </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Reopening Pairs List */}
        <Card className="w-full shadow-md">
          <CardHeader className="pb-3 border-b border-gray-200">
            <CardTitle className="text-lg">
              <div className="flex items-center space-x-2">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Repeat className="h-5 w-5 text-orange-600" />
                </div>
                <span>Ordens de Serviço Reabertas</span>
              </div>
            </CardTitle>
            <CardDescription className="mt-2 text-sm text-gray-600">
              Pares de OS original e reabertura identificados por cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
            {/* O filtro que estava aqui foi movido para cima */}
            <div className="overflow-x-auto w-full">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-700 text-sm px-3 py-3">Cliente</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-sm px-3 py-3">Técnico Responsável</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-sm px-3 py-3">OS Original</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-sm px-3 py-3">Ação Tomada Original</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-sm px-3 py-3">Finalização Original</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-sm px-3 py-3">OS Reabertura</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-sm px-3 py-3">Ação Tomada Reabertura</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-sm px-3 py-3">Data Criação Reabertura</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700 text-sm px-3 py-3">Tempo entre OS</TableHead>
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
                      <TableRow 
                        key={index}
                        className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-gray-100 transition-colors`}
                      >
                        <TableCell className="font-semibold text-sm px-3 py-3">{pair.originalOrder.nome_cliente}</TableCell>
                        <TableCell className="font-medium text-sm px-3 py-3">
                          {pair.originalOrder.nome_tecnico ? pair.originalOrder.nome_tecnico : <span className="text-muted-foreground italic">Sem técnico atribuído</span>}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <span className="font-semibold text-sm">{pair.originalOrder.codigo_os}</span>
                          <br/>
                          <span className="text-xs text-muted-foreground">{pair.originalOrder.subtipo_servico}</span>
                        </TableCell>
                        <TableCell className="px-3 py-3">{getAcaoTomadaBadge(pair.originalOrder.acao_tomada, pair.originalOrder.status)}</TableCell>
                        <TableCell className="text-sm px-3 py-3">{formatDate(pair.originalOrder.data_finalizacao)}</TableCell>
                        <TableCell className="px-3 py-3">
                          <span className="font-semibold text-sm">{pair.reopeningOrder.codigo_os}</span>
                          <br/>
                          <span className="text-xs text-muted-foreground">{pair.reopeningOrder.subtipo_servico}</span>
                        </TableCell>
                        <TableCell className="px-3 py-3">{getAcaoTomadaBadge(pair.reopeningOrder.acao_tomada, pair.reopeningOrder.status)}</TableCell>
                        <TableCell className="text-sm px-3 py-3">{formatDate(pair.reopeningOrder.data_criacao)}</TableCell>
                        <TableCell className="text-right px-3 py-3">
                          <div className="font-semibold text-sm">
                          {pair.timeBetween.toFixed(1)} horas
                          </div>
                          <div className={`text-xs font-medium mt-0.5 ${getDaysColor(pair.daysBetween)}`}>
                                ({pair.daysBetween} dias)
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                      {getFilteredReopeningPairs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                            Nenhum par de reabertura encontrado no período selecionado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700 font-semibold mb-2">📋 Informações Importantes:</p>
                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div>
                        <span className="font-medium text-gray-800">Nota:</span> As reaberturas são identificadas quando uma nova OS é criada no mesmo mês que a OS original foi finalizada.
                      <strong> Exceção:</strong> Se a OS original foi finalizada no último dia do mês e a reabertura ocorreu no primeiro dia do mês seguinte, 
                        também é considerada uma reabertura válida.
                    </div>
                      <div>
                        <span className="font-medium text-gray-800">Importante:</span> O tempo entre OS é calculado da <strong>finalização da OS original</strong> até a <strong>criação da OS de reabertura</strong>.
                    </div>
                      <div>
                        <span className="font-medium text-gray-800">Importante:</span> O filtro de Mês/Ano considera a <strong>data de criação da OS de reabertura</strong> (não a data da OS original). 
                        Isso significa que você verá as reaberturas que foram <strong>criadas</strong> no mês selecionado, mesmo que a OS original tenha sido finalizada em um mês anterior.
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">Importante:</span> OSs com Ação Tomada Original contendo "Cliente Cancelou via SAC" não são consideradas como OSs primárias de reabertura.
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Indicadores de proximidade ao limite:</p>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 rounded-full bg-gray-400 mr-1.5"></span>
                          <span>Normal</span>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-1.5"></span>
                          <span>Próximo (20-24 dias)</span>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1.5"></span>
                          <span>Crítico (25-30 dias)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            

        
          {/* Organize all reopening cards in a 2x1 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Motivo da Reabertura por OS Primária */}
            <Card className="h-full w-full shadow-md">
              <CardHeader className="pb-3 border-b border-gray-200">
                <CardTitle className="text-lg">
                  <div className="flex items-center space-x-2">
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <span>Motivo da Reabertura por OS Primária</span>
                  </div>
                </CardTitle>
                <CardDescription className="mt-2 text-sm text-gray-600">
                  Motivos agrupados pela OS de origem (primária)
                </CardDescription>
          </CardHeader>
              <CardContent className="pt-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
                <div className="overflow-x-auto w-full">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="font-semibold text-gray-700 text-sm px-3 py-3">Motivo da Reabertura</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-sm px-3 py-3 text-center">Total</TableHead>
                        {Object.keys(getReopeningMetrics.reopeningsByOriginalType).length > 0 && 
                          Object.keys(getReopeningMetrics.reopeningsByOriginalType)
                            .sort((a, b) => getReopeningMetrics.reopeningsByOriginalType[b].reopenings - getReopeningMetrics.reopeningsByOriginalType[a].reopenings)
                            .map(type => (
                              <TableHead key={type} className="text-center font-semibold text-gray-700 text-sm px-3 py-3">
                                {type}
                              </TableHead>
                            ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getReopeningMetrics.reopeningsByReason && 
                        Object.entries(getReopeningMetrics.reopeningsByReason)
                          .sort((a, b) => b[1].total - a[1].total)
                          .map(([reason, data], index) => (
                            <TableRow 
                              key={reason}
                              className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-gray-100 transition-colors`}
                            >
                              <TableCell className="font-semibold text-sm px-3 py-3">{reason}</TableCell>
                              <TableCell className="text-center px-3 py-3">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs">
                                  {data.total}
                                </Badge>
                              </TableCell>
                              {Object.keys(getReopeningMetrics.reopeningsByOriginalType).length > 0 && 
                                Object.keys(getReopeningMetrics.reopeningsByOriginalType)
                                  .sort((a, b) => getReopeningMetrics.reopeningsByOriginalType[b].reopenings - getReopeningMetrics.reopeningsByOriginalType[a].reopenings)
                                  .map(type => (
                                    <TableCell key={type} className="text-center px-3 py-3 text-sm">
                                      {data.byOriginalType[type] ? (
                                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-semibold text-xs">
                                          {data.byOriginalType[type]}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                  ))}
                            </TableRow>
                          ))}
                      {(!getReopeningMetrics.reopeningsByReason || Object.keys(getReopeningMetrics.reopeningsByReason).length === 0) && (
                        <TableRow>
                          <TableCell colSpan={Object.keys(getReopeningMetrics.reopeningsByOriginalType).length + 2} className="text-center py-8 text-muted-foreground text-sm">
                            Nenhum motivo de reabertura encontrado no período selecionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
            {/* Card Unificado: Reaberturas por Técnico, Cidade e Bairro */}
            <Card className="h-full w-full shadow-md">
              <CardHeader className="pb-3 border-b border-gray-200">
                <CardTitle className="text-lg">
                  <div className="flex items-center space-x-2">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <Users className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span>Reaberturas por Localização</span>
                  </div>
                </CardTitle>
          </CardHeader>
              <CardContent className="pt-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
                <Tabs defaultValue="technician" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="technician">Técnico</TabsTrigger>
                    <TabsTrigger value="city">Cidade</TabsTrigger>
                    <TabsTrigger value="neighborhood">Bairro</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="technician" className="mt-3">
                    <div className="space-y-1.5 w-full">
                    {Object.entries(getReopeningMetrics.reopeningsByTechnician)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                        .map(([technician, count]: [string, number], index) => {
                        const percent = (count / getReopeningMetrics.reopenedOrders) * 100;
                      return (
                            <div 
                              key={technician} 
                              className={`p-1.5 rounded border transition-colors ${
                                index % 2 === 0 ? "bg-white border-gray-200" : "bg-gray-50/50 border-gray-200"
                              } hover:bg-gray-100`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-xs text-gray-800 truncate">{technician}</span>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-semibold text-[10px] px-1.5 py-0 flex-shrink-0">
                                    {count}
                                  </Badge>
                                  <button
                                    onClick={() => setSelectedTechnicianDetails(technician)}
                                    className="p-1 rounded hover:bg-blue-100 transition-colors"
                                    title="Ver detalhes por localização"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                                  </button>
                                </div>
                          </div>
                              <div className="bg-orange-100 rounded-full h-2 overflow-hidden w-full mb-0.5">
                            <div 
                                  className="bg-orange-500 h-full rounded-full transition-all duration-300" 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                              <div className="text-[10px] font-medium text-gray-600">
                                {percent.toFixed(2)}%
                          </div>
                        </div>
                      );
                    })
                  }
                    {Object.keys(getReopeningMetrics.reopeningsByTechnician).length === 0 && (
                        <div className="text-center text-muted-foreground py-6 text-xs">
                        Nenhuma reabertura por técnico encontrada no período selecionado
                    </div>
                  )}
                </div>
                  </TabsContent>
                  
                  <TabsContent value="city" className="mt-3">
                    <div className="space-y-1.5 w-full">
                    {Object.entries(getReopeningMetrics.reopeningsByCity)
                  .sort((a, b) => b[1] - a[1])
                        .map(([city, count]: [string, number], index) => {
                        const percent = (count / getReopeningMetrics.reopenedOrders) * 100;
                    return (
                            <div 
                              key={city} 
                              className={`p-1.5 rounded border transition-colors ${
                                index % 2 === 0 ? "bg-white border-gray-200" : "bg-gray-50/50 border-gray-200"
                              } hover:bg-gray-100`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-xs text-gray-800 truncate">{city.toUpperCase()}</span>
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-semibold text-[10px] px-1.5 py-0 ml-2 flex-shrink-0">
                                  {count}
                                </Badge>
                        </div>
                              <div className="bg-orange-100 rounded-full h-2 overflow-hidden w-full mb-0.5">
                          <div 
                                  className="bg-orange-500 h-full rounded-full transition-all duration-300" 
                              style={{ width: `${percent}%` }}
                          />
                        </div>
                              <div className="text-[10px] font-medium text-gray-600">
                                {percent.toFixed(2)}%
                        </div>
                      </div>
                    );
                  })
                }
                    {Object.keys(getReopeningMetrics.reopeningsByCity).length === 0 && (
                        <div className="text-center text-muted-foreground py-6 text-xs">
                        Nenhuma reabertura por cidade encontrada no período selecionado
                  </div>
                )}
              </div>
                  </TabsContent>
                  
                  <TabsContent value="neighborhood" className="mt-3">
                    <div className="space-y-1.5 w-full">
                    {Object.entries(getReopeningMetrics.reopeningsByNeighborhood)
                  .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                        .map(([neighborhood, count]: [string, number], index) => {
                        const percent = (count / getReopeningMetrics.reopenedOrders) * 100;
                    return (
                            <div 
                              key={neighborhood} 
                              className={`p-1.5 rounded border transition-colors ${
                                index % 2 === 0 ? "bg-white border-gray-200" : "bg-gray-50/50 border-gray-200"
                              } hover:bg-gray-100`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-xs text-gray-800 truncate">{neighborhood.toUpperCase()}</span>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-[10px] px-1.5 py-0 ml-2 flex-shrink-0">
                                  {count}
                                </Badge>
                        </div>
                              <div className="bg-blue-100 rounded-full h-2 overflow-hidden w-full mb-0.5">
                          <div 
                                  className="bg-blue-500 h-full rounded-full transition-all duration-300" 
                              style={{ width: `${percent}%` }}
                          />
                        </div>
                              <div className="text-[10px] font-medium text-gray-600">
                                {percent.toFixed(2)}%
                        </div>
                      </div>
                    );
                  })
                }
                    {Object.keys(getReopeningMetrics.reopeningsByNeighborhood).length === 0 && (
                        <div className="text-center text-muted-foreground py-6 text-xs">
                        Nenhuma reabertura por bairro encontrada no período selecionado
                  </div>
                )}
              </div>
                  </TabsContent>
                </Tabs>
            </CardContent>
          </Card>

          {/* Modal de detalhes do técnico por localização */}
          <Dialog open={!!selectedTechnicianDetails} onOpenChange={(open) => {
            if (!open) setSelectedTechnicianDetails(null);
          }}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Detalhes de Reaberturas - {selectedTechnicianDetails}
                </DialogTitle>
                <DialogDescription>
                  Reaberturas por cidade e bairro para este técnico
                </DialogDescription>
              </DialogHeader>
              
              {selectedTechnicianDetails && (
                <div className="space-y-4 mt-4">
                  {(() => {
                    // Filtrar reaberturas deste técnico
                    const technicianReopenings = getFilteredReopeningPairs.filter(
                      pair => pair.originalOrder.nome_tecnico === selectedTechnicianDetails
                    );
                    
                    // Agrupar por cidade e bairro com detalhes
                    const byCity: Record<string, Record<string, Array<{
                      os: string;
                      cliente: string;
                      tipoServico: string;
                      originalOs: string;
                    }>>> = {};
                    
                    technicianReopenings.forEach(pair => {
                      const city = normalizeCityName(pair.reopeningOrder.cidade) || "Desconhecido";
                      const bairro = normalizeNeighborhoodName(pair.reopeningOrder.bairro) || "Desconhecido";
                      
                      if (!byCity[city]) {
                        byCity[city] = {};
                      }
                      if (!byCity[city][bairro]) {
                        byCity[city][bairro] = [];
                      }
                      
                      byCity[city][bairro].push({
                        os: pair.reopeningOrder.codigo_os || "N/A",
                        cliente: pair.reopeningOrder.nome_cliente || "Desconhecido",
                        tipoServico: pair.reopeningOrder.subtipo_servico || "N/A",
                        originalOs: pair.originalOrder.codigo_os || "N/A"
                      });
                    });
                    
                    // Criar estrutura ordenada
                    const citySummary = Object.entries(byCity).map(([city, bairros]) => {
                      const bairroDetails = Object.entries(bairros).map(([bairro, orders]) => ({
                        bairro,
                        count: orders.length,
                        orders: orders
                      })).sort((a, b) => b.count - a.count);
                      
                      return {
                        city,
                        total: bairroDetails.reduce((acc, b) => acc + b.count, 0),
                        bairros: bairroDetails
                      };
                    }).sort((a, b) => b.total - a.total);
                    
                    return (
                      <div className="space-y-4">
                        {citySummary.map(({ city, total, bairros }) => (
                          <Card key={city} className="border-2">
                            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                              <CardTitle className="text-sm flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-blue-600" />
                                  {city.toUpperCase()}
                                </span>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {total} {total === 1 ? 'reabertura' : 'reaberturas'}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="space-y-3">
                                {bairros.map(({ bairro, count, orders }) => (
                                  <div key={bairro} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="flex justify-between items-center p-2 bg-gray-100">
                                      <span className="text-sm font-semibold text-gray-800">{bairro.toUpperCase()}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {count}
                                      </Badge>
                                    </div>
                                    <div className="divide-y divide-gray-200">
                                      {orders.map((order, idx) => (
                                        <div key={idx} className="p-2.5 bg-white hover:bg-gray-50 transition-colors">
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                              <span className="text-gray-500 font-medium">OS Reabertura:</span>
                                              <span className="ml-1 font-semibold text-orange-600">{order.os}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500 font-medium">OS Original:</span>
                                              <span className="ml-1 font-semibold text-blue-600">{order.originalOs}</span>
                                            </div>
                                            <div className="col-span-2">
                                              <span className="text-gray-500 font-medium">Cliente:</span>
                                              <span className="ml-1 text-gray-800">{order.cliente}</span>
                                            </div>
                                            <div className="col-span-2">
                                              <span className="text-gray-500 font-medium">Tipo:</span>
                                              <span className="ml-1 text-gray-800">{order.tipoServico}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {citySummary.length === 0 && (
                          <div className="text-center text-muted-foreground py-8">
                            Nenhuma reabertura encontrada para este técnico
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </DialogContent>
          </Dialog>
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
          <ProtectedCard 
            title="Desempenho e Bonificações - Serviços" 
            storageKey="indicadores_desempenho_bonificacoes_unificado"
            className="w-full"
          >
          <>
            {/* Card Unificado: Desempenho e Bonificações - Serviços */}
            <Card className="w-full shadow-lg border-2">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 pb-2">
                <CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-blue-500 rounded-lg shadow-md">
                        <BarChart2 className="h-4 w-4 text-white" />
                  </div>
                      <div>
                        <div className="text-base font-bold text-gray-800">Desempenho e Bonificações - Serviços</div>
                        <CardDescription className="text-xs mt-0.5 text-gray-600">
                          Métricas de desempenho, base de clientes e bonificações por tipo de serviço
                </CardDescription>
                              </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Coluna 1: Assistência Técnica TV */}
                  {(() => {
                    // Obter o percentual de TA para Assistência Técnica TV
                      const metricsATTV = Object.entries(timeMetrics.servicesByType)
                      .filter(([type]) => type === 'Assistência Técnica TV')
                        .map(([_, data]) => data)[0];
                      const taPercentage = metricsATTV?.percentWithinGoal || 0;
                    
                    // Obter o percentual de Reabertura para Corretiva
                    const reopeningRate = getReopeningMetrics.reopeningsByOriginalType["Corretiva"]?.reopeningRate || 0;
                      
                      // Cores para TA e Reaberturas (sem barras, apenas números)
                      const textColorTA = getTimeAttendanceColorByServiceType("Assistência Técnica TV", taPercentage);
                      const colorClassReab = getReopeningColorByServiceType("Corretiva", reopeningRate);
                    
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
                    
                      const cardClass = bonusPercentage > 0 
                        ? "border-2 border-green-300 bg-gradient-to-br from-white to-green-50/50 shadow-md hover:shadow-lg transition-all" 
                        : "border-2 border-red-300 bg-gradient-to-br from-white to-red-50/50 shadow-md hover:shadow-lg transition-all";
                    
                    return (
                        <div className="border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/50 rounded-lg shadow-sm hover:shadow-md transition-all">
                          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b-2 p-2 rounded-t-lg">
                            <h3 className="text-sm font-bold text-center text-gray-800">Assistência Técnica TV</h3>
                          </div>
                          <div className="p-2 space-y-2">
                            {/* Métricas: TA e Reaberturas */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-center">
                                <div className="text-[10px] font-semibold text-gray-700 mb-1">Tempo de Atendimento</div>
                                <div className={`text-xl font-bold ${textColorTA}`}>
                                  {taPercentage.toFixed(2)}%
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-[10px] font-semibold text-gray-700 mb-1">Reaberturas</div>
                                <div className={`text-xl font-bold ${colorClassReab}`}>
                                  {reopeningRate.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                            
                            {/* Base de Clientes TV */}
                          {baseMetrics && (
                              <div className="pt-1.5 border-t border-gray-200">
                                <BaseMetricsSection
                                  type="tv"
                                  metrics={baseMetrics}
                                  title="Base de Clientes TV"
                                />
                              </div>
                            )}
                            
                            {/* Bonificação */}
                            <div className="pt-1.5 border-t border-gray-200">
                              <div className={`text-center text-sm font-bold mb-1.5 ${bonusPercentage > 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {bonusPercentage > 0 ? `${bonusPercentage}% bonificação` : "Não Elegível"}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-center">
                                  <div className="text-[10px] text-gray-600 mb-0.5">Ganho Base</div>
                                  <div className="text-base font-semibold text-blue-700">
                                    {ganhoMonetario.toLocaleString('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL' 
                                    })}
                                  </div>
                                  <div className="text-[9px] text-gray-500">
                                    {baseTV.toLocaleString('pt-BR')} × R$ {alianca.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-[10px] text-gray-600 mb-0.5">Bônus Aliança</div>
                                  {bonusPercentage > 0 ? (
                                    <>
                                      <div className="text-base font-semibold text-green-700">
                                        {bonusAlianca.toLocaleString('pt-BR', { 
                                          style: 'currency', 
                                          currency: 'BRL' 
                                        })}
                                      </div>
                                      <div className="text-[9px] text-gray-500">
                                        {bonusPercentage}% do ganho base
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-base font-semibold text-red-600">
                                        Não Vigente
                                      </div>
                                      <div className="text-[9px] text-gray-500">
                                        Não elegível
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {/* Total */}
                              <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                                <div className="text-[10px] text-gray-600 mb-0.5 text-center">Total (Ganho Base + Bônus)</div>
                                <div className="text-lg font-bold text-purple-700 text-center">
                                  {totalAtual.toLocaleString('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL' 
                                  })}
                                </div>
                              </div>
                              
                              {/* Tendência */}
                              {totalAnterior > 0 && (
                                <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                                  <div className="text-xs text-gray-600 mb-0.5 text-center">Tendência vs Mês Anterior</div>
                                  <div className={`text-xs font-medium flex items-center justify-center gap-1 ${
                                    diferencaValor > 0 ? 'text-green-600' : diferencaValor < 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    <span className="text-sm">{diferencaValor > 0 ? '↗️' : diferencaValor < 0 ? '↘️' : '➡️'}</span>
                                    {diferencaValor > 0 ? '+' : ''}{diferencaPercentual.toFixed(1)}% 
                                    ({diferencaValor > 0 ? '+' : ''}{diferencaValor.toLocaleString('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL' 
                                    })})
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                    );
                  })()}
                  
                    {/* Coluna 2: Assistência Técnica FIBRA */}
                  {(() => {
                    // Obter o percentual de TA para Assistência Técnica FIBRA
                      const metricsATFIBRA = Object.entries(timeMetrics.servicesByType)
                      .filter(([type]) => type === 'Assistência Técnica FIBRA')
                        .map(([_, data]) => data)[0];
                      const taPercentage = metricsATFIBRA?.percentWithinGoal || 0;
                    
                    // Obter o percentual de Reabertura para Corretiva BL
                    const reopeningRate = getReopeningMetrics.reopeningsByOriginalType["Corretiva BL"]?.reopeningRate || 0;
                      
                      // Cores para TA e Reaberturas (sem barras, apenas números)
                      const textColorTA = getTimeAttendanceColorByServiceType("Assistência Técnica FIBRA", taPercentage);
                      const colorClassReab = getReopeningColorByServiceType("Corretiva BL", reopeningRate);
                    
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
                    
                    return (
                        <div className="border-2 border-cyan-200 bg-gradient-to-br from-white to-cyan-50/50 rounded-lg shadow-sm hover:shadow-md transition-all">
                          <div className="bg-gradient-to-r from-cyan-100 to-teal-100 border-b-2 p-2 rounded-t-lg">
                            <h3 className="text-sm font-bold text-center text-gray-800">Assistência Técnica FIBRA</h3>
                          </div>
                          <div className="p-2 space-y-2">
                            {/* Métricas: TA e Reaberturas */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-center">
                                <div className="text-[10px] font-semibold text-gray-700 mb-1">Tempo de Atendimento</div>
                                <div className={`text-xl font-bold ${textColorTA}`}>
                                  {taPercentage.toFixed(2)}%
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-[10px] font-semibold text-gray-700 mb-1">Reaberturas</div>
                                <div className={`text-xl font-bold ${colorClassReab}`}>
                                  {reopeningRate.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                            
                            {/* Base de Clientes FIBRA */}
                          {baseMetrics && (
                              <div className="pt-1.5 border-t border-gray-200">
                                <BaseMetricsSection
                                  type="fibra"
                                  metrics={baseMetrics}
                                  title="Base de Clientes FIBRA"
                                />
                              </div>
                            )}
                            
                            {/* Bonificação */}
                            <div className="pt-1.5 border-t border-gray-200">
                              <div className={`text-center text-sm font-bold mb-1.5 ${bonusPercentage > 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {bonusPercentage > 0 ? `${bonusPercentage}% bonificação` : "Não Elegível"}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-center">
                                  <div className="text-[10px] text-gray-600 mb-0.5">Ganho Base</div>
                                  <div className="text-base font-semibold text-blue-700">
                                    {ganhoMonetario.toLocaleString('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL' 
                                    })}
                                  </div>
                                  <div className="text-[9px] text-gray-500">
                                    {baseFIBRA.toLocaleString('pt-BR')} × R$ {alianca.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-[10px] text-gray-600 mb-0.5">Bônus Aliança</div>
                                  {bonusPercentage > 0 ? (
                                    <>
                                      <div className="text-base font-semibold text-green-700">
                                        {bonusAlianca.toLocaleString('pt-BR', { 
                                          style: 'currency', 
                                          currency: 'BRL' 
                                        })}
                                      </div>
                                      <div className="text-[9px] text-gray-500">
                                        {bonusPercentage}% do ganho base
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-base font-semibold text-red-600">
                                        Não Vigente
                                      </div>
                                      <div className="text-[9px] text-gray-500">
                                        Não elegível
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {/* Total */}
                              <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                                <div className="text-[10px] text-gray-600 mb-0.5 text-center">Total (Ganho Base + Bônus)</div>
                                <div className="text-lg font-bold text-purple-700 text-center">
                                  {totalAtual.toLocaleString('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL' 
                                  })}
                                </div>
                              </div>
                              
                              {/* Tendência */}
                              {totalAnterior > 0 && (
                                <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                                  <div className="text-xs text-gray-600 mb-0.5 text-center">Tendência vs Mês Anterior</div>
                                  <div className={`text-xs font-medium flex items-center justify-center gap-1 ${
                                    diferencaValor > 0 ? 'text-green-600' : diferencaValor < 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    <span className="text-sm">{diferencaValor > 0 ? '↗️' : diferencaValor < 0 ? '↘️' : '➡️'}</span>
                                    {diferencaValor > 0 ? '+' : ''}{diferencaPercentual.toFixed(1)}% 
                                    ({diferencaValor > 0 ? '+' : ''}{diferencaValor.toLocaleString('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL' 
                                    })})
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                    );
                  })()}
                  
                    {/* Coluna 3: Ponto Principal TV */}
                  {(() => {
                    // Obter o percentual de TA para Ponto Principal TV
                      const metricsPPTV = Object.entries(timeMetrics.servicesByType)
                      .filter(([type]) => type === 'Ponto Principal TV')
                        .map(([_, data]) => data)[0];
                      const taPercentage = metricsPPTV?.percentWithinGoal || 0;
                    
                    // Obter o percentual de Reabertura para Ponto Principal
                    const reopeningRate = getReopeningMetrics.reopeningsByOriginalType["Ponto Principal"]?.reopeningRate || 0;
                      
                      // Cores para TA e Reaberturas (sem barras, apenas números)
                      const textColorTA = getTimeAttendanceColorByServiceType("Ponto Principal TV", taPercentage);
                      const colorClassReab = getReopeningColorByServiceType("Ponto Principal", reopeningRate);
                    
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
                    
                    const textClass = isEligible ? "text-green-700" : "text-red-700";
                    
                    return (
                        <div className={`border-2 rounded-lg shadow-sm hover:shadow-md transition-all ${
                          isEligible 
                            ? "border-green-300 bg-gradient-to-br from-white to-green-50/50" 
                            : "border-red-300 bg-gradient-to-br from-white to-red-50/50"
                        }`}>
                          <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border-b-2 p-2 rounded-t-lg">
                            <h3 className="text-sm font-bold text-center text-gray-800">Ponto Principal TV</h3>
                          </div>
                          <div className="p-2 space-y-2">
                            {/* Métricas: TA e Reaberturas */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-center">
                                <div className="text-[10px] font-semibold text-gray-700 mb-1">Tempo de Atendimento</div>
                                <div className={`text-xl font-bold ${textColorTA}`}>
                                  {taPercentage.toFixed(2)}%
                              </div>
                              </div>
                              <div className="text-center">
                                <div className="text-[10px] font-semibold text-gray-700 mb-1">Reaberturas</div>
                                <div className={`text-xl font-bold ${colorClassReab}`}>
                                  {reopeningRate.toFixed(2)}%
                                  </div>
                                  </div>
                                </div>
                            
                            {/* Bonificação */}
                            <div className="pt-1.5 border-t border-gray-200">
                              <div className={`text-center text-sm font-bold mb-1.5 ${textClass}`}>
                            {result}
                          </div>
                          {servicosFinalizados > 0 && (
                                <>
                                  <div className="text-[10px] text-gray-600 mb-0.5 text-center">Ganho por Serviços</div>
                                  <div className="text-base font-semibold text-blue-700 text-center">
                                {ganhoTotal.toLocaleString('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                })}
                              </div>
                                  <div className="text-[9px] text-gray-500 text-center">
                                {servicosFinalizados} serviços × R$ {valorPorServico.toFixed(2)}
                              </div>
                              
                                  {/* Tendência */}
                              {ganhoAnterior > 0 && (
                                    <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                                      <div className="text-xs text-gray-600 mb-0.5 text-center">Tendência vs Mês Anterior</div>
                                      <div className={`text-xs font-medium flex items-center justify-center gap-1 ${
                                    diferencaValor > 0 ? 'text-green-600' : diferencaValor < 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                        <span className="text-sm">{diferencaValor > 0 ? '↗️' : diferencaValor < 0 ? '↘️' : '➡️'}</span>
                                    {diferencaValor > 0 ? '+' : ''}{diferencaPercentual.toFixed(1)}% 
                                    ({diferencaValor > 0 ? '+' : ''}{diferencaValor.toLocaleString('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL' 
                                    })})
                                  </div>
                                      <div className="text-[10px] text-gray-500 text-center">
                                    {servicosFinalizadosAnterior} serviços no mês anterior
                                  </div>
                                </div>
                              )}
                                </>
                          )}
                            </div>
                          </div>
                        </div>
                    );
                  })()}
                  
                    </div>
                </CardContent>
              </Card>
              
            {/* Novo quadro modernizado de Bonificações */}
            <div className="mb-6">
              <BonificacoesVendas 
                vendasFiltradas={buscarVendasDoPeriodoBonificacoes}
                vendasParaPermanencia={vendasFiltradasPermanenciaIndicadores}
                isMesAtual={isPeriodoMesAtual}
              />
            </div>
          </>
          </ProtectedCard>
        )}
      </TabsContent>
      
      {/* Technicians Metrics Tab */}
      <TabsContent value="technicians" className="space-y-4">
        <FilterControls />
        
        {!showData ? (
          <NoDataMessage />
        ) : technicians.length > 0 ? (
          <>
            {/* Ranking de Excelência - Top 3 Técnicos */}
            {technicianExcellenceRanking.length > 0 && (
              <Card className="shadow-xl border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
                  <CardHeader className="pb-3 bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 rounded-t-lg">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      {/* Título e Critérios */}
                      <div className="flex-shrink-0">
                        <CardTitle className="flex items-center text-base font-bold text-gray-900 drop-shadow-sm mb-2">
                          <Trophy className="mr-2 h-5 w-5 text-gray-900" />
                          Ranking de Excelência - Top 3 Técnicos
                        </CardTitle>
                        <CardDescription className="text-gray-800 text-[10px] font-medium space-y-0.5">
                          <div className="font-semibold text-gray-900">Critérios de Avaliação:</div>
                          <div>• Score Final: <strong>Reabertura 50%</strong> + <strong>Otimização 30%</strong> + <strong>Tempo de Atendimento 20%</strong></div>
                          <div>• Dentro de cada categoria, faz-se a média dos indicadores selecionados</div>
                          <div>• Se uma categoria não tiver indicadores, seu peso é redistribuído proporcionalmente</div>
                          <div>• Em caso de empate: maior volume de serviços</div>
                          <div>• Excluídos da contagem: Corretiva, Corretiva BL, Entrega emergencial Controle Remoto</div>
                        </CardDescription>
                      </div>
                      
                      {/* Checkboxes Compactos por Categoria */}
                      <div className="flex-1 lg:max-w-2xl">
                        <div className="text-[10px] font-bold text-gray-900 mb-2">Indicadores por Categoria (Reabertura: 50% | Otimização: 30% | TA: 20%):</div>
                        <div className="space-y-2">
                          {/* Categoria: REABERTURA */}
                          <div className="bg-red-50/60 px-3 py-1.5 rounded border border-red-200/60">
                            <div className="flex items-center gap-4">
                              <div className="text-[10px] font-bold text-red-700 whitespace-nowrap">🔴 REABERTURA (50%)</div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                <label className="flex items-center space-x-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedExcellenceIndicators.reaberturaAT}
                                    onChange={(e) => setSelectedExcellenceIndicators(prev => ({
                                      ...prev,
                                      reaberturaAT: e.target.checked
                                    }))}
                                    className="w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="text-[11px]">Reabertura AT</span>
                                </label>
                                
                                <label className="flex items-center space-x-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedExcellenceIndicators.reaberturaPontoPrincipal}
                                    onChange={(e) => setSelectedExcellenceIndicators(prev => ({
                                      ...prev,
                                      reaberturaPontoPrincipal: e.target.checked
                                    }))}
                                    className="w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="text-[11px]">Reabertura Ponto Principal</span>
                                </label>
                              </div>
                            </div>
                          </div>
                          
                          {/* Categoria: TEMPO DE ATENDIMENTO */}
                          <div className="bg-blue-50/60 px-3 py-1.5 rounded border border-blue-200/60">
                            <div className="flex items-center gap-4">
                              <div className="text-[10px] font-bold text-blue-700 whitespace-nowrap">⏱️ TEMPO DE ATENDIMENTO (20%)</div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                <label className="flex items-center space-x-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedExcellenceIndicators.reaberturaATTV}
                                    onChange={(e) => setSelectedExcellenceIndicators(prev => ({
                                      ...prev,
                                      reaberturaATTV: e.target.checked
                                    }))}
                                    className="w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="text-[11px]">TA Ponto Principal TV</span>
                                </label>
                                
                                <label className="flex items-center space-x-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedExcellenceIndicators.reaberturaATFibra}
                                    onChange={(e) => setSelectedExcellenceIndicators(prev => ({
                                      ...prev,
                                      reaberturaATFibra: e.target.checked
                                    }))}
                                    className="w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="text-[11px]">TA Assistência Técnica TV</span>
                                </label>
                              </div>
                            </div>
                          </div>
                          
                          {/* Categoria: OTIMIZAÇÃO */}
                          <div className="bg-green-50/60 px-3 py-1.5 rounded border border-green-200/60">
                            <div className="flex items-center gap-4">
                              <div className="text-[10px] font-bold text-green-700 whitespace-nowrap">🎯 OTIMIZAÇÃO (30%)</div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                <label className="flex items-center space-x-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedExcellenceIndicators.otimizacao}
                                    onChange={(e) => setSelectedExcellenceIndicators(prev => ({
                                      ...prev,
                                      otimizacao: e.target.checked
                                    }))}
                                    className="w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="text-[11px]">Otimização</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {technicianExcellenceRanking.map((tech, index) => {
                          const position = index + 1;
                          const medalColors = [
                            { bg: "from-yellow-400 to-yellow-600", border: "border-yellow-500", text: "text-yellow-700", icon: "🥇" },
                            { bg: "from-gray-300 to-gray-500", border: "border-gray-400", text: "text-gray-700", icon: "🥈" },
                            { bg: "from-orange-300 to-orange-500", border: "border-orange-400", text: "text-orange-700", icon: "🥉" }
                          ];
                          const colors = medalColors[index];
                          
                          return (
                            <div
                              key={tech.nome}
                              className={`relative bg-gradient-to-br ${colors.bg} rounded-xl p-4 shadow-lg border-2 ${colors.border} transform transition-all hover:scale-105`}
                            >
                              <div className="flex flex-col items-center text-center">
                                <div className="text-4xl mb-2">{colors.icon}</div>
                                <div className={`text-2xl font-bold ${colors.text} mb-1`}>
                                  {position}º Lugar
                                </div>
                                <div className="text-lg font-semibold text-gray-900 mb-3">
                                  {tech.nome}
                                </div>
                                
                                <div className="w-full space-y-2 mt-3">
                                  <div className="bg-white/80 rounded-lg p-2">
                                    <div className="text-xs font-semibold text-gray-600 mb-1">Score Final</div>
                                    <div className={`text-xl font-bold ${colors.text}`}>
                                      {tech.scoreFinal.toFixed(2)} pts
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {/* Mostrar apenas indicadores selecionados */}
                                    {selectedExcellenceIndicators.reaberturaAT && (
                                      <div className="bg-white/80 rounded p-2">
                                        <div className="text-gray-600 font-semibold">Reab. AT</div>
                                        <div className={`font-bold ${tech.atRate <= 5 ? 'text-green-600' : tech.atRate <= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                                          {tech.atRate.toFixed(2)}%
                                        </div>
                                      </div>
                                    )}
                                    
                                    {selectedExcellenceIndicators.reaberturaPontoPrincipal && (
                                      <div className="bg-white/80 rounded p-2">
                                        <div className="text-gray-600 font-semibold">Reab. Ponto</div>
                                        <div className={`font-bold ${tech.pontoTVRate <= 5 ? 'text-green-600' : tech.pontoTVRate <= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                                          {tech.pontoTVRate.toFixed(2)}%
                                        </div>
                                      </div>
                                    )}
                                    
                                    {selectedExcellenceIndicators.reaberturaATTV && (
                                      <div className="bg-white/80 rounded p-2">
                                        <div className="text-gray-600 font-semibold">TA PP TV</div>
                                        <div className={`font-bold ${tech.percentPontoTvTA >= 90 ? 'text-green-600' : tech.percentPontoTvTA >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                          {tech.percentPontoTvTA.toFixed(2)}%
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-0.5">
                                          {tech.pontoTvWithinGoal}/{tech.totalPontoTv} na meta
                                        </div>
                                      </div>
                                    )}
                                    
                                    {selectedExcellenceIndicators.reaberturaATFibra && (
                                      <div className="bg-white/80 rounded p-2">
                                        <div className="text-gray-600 font-semibold">TA AT TV</div>
                                        <div className={`font-bold ${tech.percentAssistTvTA >= 90 ? 'text-green-600' : tech.percentAssistTvTA >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                          {tech.percentAssistTvTA.toFixed(2)}%
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-0.5">
                                          {tech.assistTvWithinGoal}/{tech.totalAssistTv} na meta
                                        </div>
                                      </div>
                                    )}
                                    
                                    {selectedExcellenceIndicators.otimizacao && (
                                      <div className="bg-white/80 rounded p-2">
                                        <div className="text-gray-600 font-semibold">Consumo</div>
                                        <div className={`font-bold ${tech.percentualConsumo <= 50 ? 'text-green-600' : tech.percentualConsumo <= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                          {tech.percentualConsumo.toFixed(2)}%
                                        </div>
                                      </div>
                                    )}
                                    
                                    <div className="bg-white/80 rounded p-2">
                                      <div className="text-gray-600 font-semibold">Serviços</div>
                                      <div className="font-bold text-blue-600">
                                        {tech.totalServices}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Technicians Reopening Table - Modernizado */}
              <Card className="col-span-1 md:col-span-2 shadow-lg border-2 border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30">
                <CardHeader className="pb-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center text-base">
                        <AlertTriangle className="mr-2 h-5 w-5" />
                        Reabertura por Técnico
                      </CardTitle>
                      <CardDescription className="text-red-100 text-xs">
                        Análise de reaberturas por técnico, ordenados pelo menor % de reabertura total e maior volume de serviços
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-white/20 hover:bg-white/30 border-white/30 text-white">
                          <Columns className="h-4 w-4 mr-2" />
                          Colunas
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Exibir Colunas</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={reopeningVisibleColumns.pontoTV}
                          onCheckedChange={(checked) => 
                            setReopeningVisibleColumns(prev => ({ ...prev, pontoTV: checked as boolean }))
                          }
                        >
                          Ponto Principal TV
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={reopeningVisibleColumns.assistenciaTV}
                          onCheckedChange={(checked) => 
                            setReopeningVisibleColumns(prev => ({ ...prev, assistenciaTV: checked as boolean }))
                          }
                        >
                          Assistência Técnica TV
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={reopeningVisibleColumns.assistenciaFibra}
                          onCheckedChange={(checked) => 
                            setReopeningVisibleColumns(prev => ({ ...prev, assistenciaFibra: checked as boolean }))
                          }
                        >
                          Assistência Técnica FIBRA
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                          <TableHead className="text-center font-bold text-gray-900 w-16 sticky left-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50">Pos</TableHead>
                          <TableHead className="sticky left-16 z-10 bg-gradient-to-r from-gray-100 to-gray-50 min-w-[150px] font-bold text-gray-900 border-r-2 border-gray-300">
                            Técnico
                          </TableHead>
                          {reopeningVisibleColumns.pontoTV && (
                            <TableHead className="text-center font-bold text-blue-700 bg-blue-50 border-l-2 border-blue-200" colSpan={3}>
                              Ponto Principal TV
                            </TableHead>
                          )}
                          {reopeningVisibleColumns.assistenciaTV && (
                            <TableHead className="text-center font-bold text-green-700 bg-green-50 border-l-2 border-green-200" colSpan={3}>
                              Assistência Técnica TV
                            </TableHead>
                          )}
                          {reopeningVisibleColumns.assistenciaFibra && (
                            <TableHead className="text-center font-bold text-purple-700 bg-purple-50 border-l-2 border-purple-200" colSpan={3}>
                              Assistência Técnica FIBRA
                            </TableHead>
                          )}
                        </TableRow>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                          <TableHead className="sticky left-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100"></TableHead>
                          <TableHead className="sticky left-16 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-r-2 border-gray-300"></TableHead>
                          {reopeningVisibleColumns.pontoTV && (
                            <>
                              <TableHead className="text-center text-xs py-2 bg-blue-50 border-l-2 border-blue-200">Serv.</TableHead>
                              <TableHead className="text-center text-xs py-2 bg-blue-50">Reab.</TableHead>
                              <TableHead className="text-center text-xs py-2 bg-blue-50">%</TableHead>
                            </>
                          )}
                          {reopeningVisibleColumns.assistenciaTV && (
                            <>
                              <TableHead className="text-center text-xs py-2 bg-green-50 border-l-2 border-green-200">Serv.</TableHead>
                              <TableHead className="text-center text-xs py-2 bg-green-50">Reab.</TableHead>
                              <TableHead className="text-center text-xs py-2 bg-green-50">%</TableHead>
                            </>
                          )}
                          {reopeningVisibleColumns.assistenciaFibra && (
                            <>
                              <TableHead className="text-center text-xs py-2 bg-purple-50 border-l-2 border-purple-200">Serv.</TableHead>
                              <TableHead className="text-center text-xs py-2 bg-purple-50">Reab.</TableHead>
                              <TableHead className="text-center text-xs py-2 bg-purple-50">%</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {technicians
                          .filter(name => name) // Filtrar nomes vazios
                          .map(name => {
                            const techOrders = filteredServiceOrders.filter(o => o.nome_tecnico === name);
                            const totalOrders = techOrders.length;
                            const reopenings = getReopeningMetrics.reopeningsByTechnician[name] || 0;
                            
                            // Contadores específicos por tipo (removido Ponto Principal FIBRA)
                            let pontoTVReopenings = 0;
                            let assistenciaTVReopenings = 0;
                            let assistenciaFibraReopenings = 0;
                            
                            // Contadores de serviços por tipo (removido Ponto Principal FIBRA)
                            let pontoPrincipalTVServices = 0;
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
                              } else if (category.includes("Assistência Técnica TV")) {
                                assistenciaTecnicaTVServices++;
                              } else if (category.includes("Assistência Técnica FIBRA")) {
                                assistenciaTecnicaFibraServices++;
                              }
                            });
                            
                            // Contagem por tipo de reabertura usando os pares (removido Ponto Principal FIBRA)
                            const techReopeningPairs = getFilteredReopeningPairs.filter(
                              pair => pair.originalOrder.nome_tecnico === name
                            );
                            
                            techReopeningPairs.forEach(pair => {
                              const originalCategory = pair.originalServiceCategory;
                              if (originalCategory?.includes("Ponto Principal TV")) {
                                pontoTVReopenings++;
                              } else if (originalCategory?.includes("Assistência Técnica TV")) {
                                assistenciaTVReopenings++;
                              } else if (originalCategory?.includes("Assistência Técnica FIBRA")) {
                                assistenciaFibraReopenings++;
                              }
                            });
                            
                            // Calcular os percentuais para cada tipo de serviço
                            const pontoTVRate = pontoPrincipalTVServices > 0 ? (pontoTVReopenings / pontoPrincipalTVServices) * 100 : 0;
                            const assistenciaTVRate = assistenciaTecnicaTVServices > 0 ? (assistenciaTVReopenings / assistenciaTecnicaTVServices) * 100 : 0;
                            const assistenciaFibraRate = assistenciaTecnicaFibraServices > 0 ? (assistenciaFibraReopenings / assistenciaTecnicaFibraServices) * 100 : 0;
                            
                            // Calcular a taxa de reabertura total com base na soma dos serviços por tipo
                            const totalServices = pontoPrincipalTVServices + 
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
                            // Função para calcular percentual de reabertura considerando apenas colunas visíveis
                            const calcVisibleReopeningRate = (tech: {
                              pontoTVRate: number;
                              assistenciaTVRate: number;
                              assistenciaFibraRate: number;
                              pontoPrincipalTVServices: number;
                              assistenciaTecnicaTVServices: number;
                              assistenciaTecnicaFibraServices: number;
                            }) => {
                              const visibleColumns = [
                                reopeningVisibleColumns.pontoTV ? {
                                  rate: tech.pontoTVRate,
                                  services: tech.pontoPrincipalTVServices
                                } : null,
                                reopeningVisibleColumns.assistenciaTV ? {
                                  rate: tech.assistenciaTVRate,
                                  services: tech.assistenciaTecnicaTVServices
                                } : null,
                                reopeningVisibleColumns.assistenciaFibra ? {
                                  rate: tech.assistenciaFibraRate,
                                  services: tech.assistenciaTecnicaFibraServices
                                } : null
                              ].filter(Boolean) as Array<{ rate: number; services: number }>;

                              // Se nenhuma coluna visível, usar todas (fallback)
                              if (visibleColumns.length === 0) {
                                const totalServices = tech.pontoPrincipalTVServices + 
                                                     tech.assistenciaTecnicaTVServices + 
                                                     tech.assistenciaTecnicaFibraServices;
                                const totalReopenings = (tech.pontoTVRate * tech.pontoPrincipalTVServices / 100) +
                                                        (tech.assistenciaTVRate * tech.assistenciaTecnicaTVServices / 100) +
                                                        (tech.assistenciaFibraRate * tech.assistenciaTecnicaFibraServices / 100);
                                return totalServices > 0 ? (totalReopenings / totalServices) * 100 : 0;
                              }

                              // Se apenas 1 coluna visível, usar o percentual direto
                              if (visibleColumns.length === 1) {
                                return visibleColumns[0].rate;
                              }

                              // Se 2 ou 3 colunas visíveis, calcular média ponderada
                              const totalServices = visibleColumns.reduce((sum, col) => sum + col.services, 0);
                              if (totalServices === 0) return 0;
                              
                              const weightedSum = visibleColumns.reduce((sum, col) => {
                                return sum + (col.rate * col.services / 100);
                              }, 0);
                              
                              return (weightedSum / totalServices) * 100;
                            };

                            const rateA = calcVisibleReopeningRate(a);
                            const rateB = calcVisibleReopeningRate(b);

                            // Primeiro critério: menor % de reabertura (considerando apenas colunas visíveis)
                            if (rateA !== rateB) {
                              return rateA - rateB;
                            }

                            // Segundo critério: maior quantidade de serviços (considerando apenas colunas visíveis)
                            const getVisibleServices = (tech: {
                              pontoPrincipalTVServices: number;
                              assistenciaTecnicaTVServices: number;
                              assistenciaTecnicaFibraServices: number;
                            }) => {
                              let total = 0;
                              if (reopeningVisibleColumns.pontoTV) total += tech.pontoPrincipalTVServices;
                              if (reopeningVisibleColumns.assistenciaTV) total += tech.assistenciaTecnicaTVServices;
                              if (reopeningVisibleColumns.assistenciaFibra) total += tech.assistenciaTecnicaFibraServices;
                              
                              // Se nenhuma coluna visível, usar todas (fallback)
                              if (total === 0) {
                                return tech.pontoPrincipalTVServices + 
                                       tech.assistenciaTecnicaTVServices + 
                                       tech.assistenciaTecnicaFibraServices;
                              }
                              
                              return total;
                            };

                            const aTotal = getVisibleServices(a);
                            const bTotal = getVisibleServices(b);
                            return bTotal - aTotal;
                          })
                          .map((tech, index) => {
                            // Funções para obter cores e badges conforme as regras específicas por tipo
                            const getPontoPrincipalTVBadge = (rate: number) => {
                              if (rate < 2.00) {
                                return "bg-green-100 text-green-800 border-green-300";
                              }
                              return "bg-red-100 text-red-800 border-red-300";
                            };
                            
                            const getAssistenciaTVBadge = (rate: number) => {
                              if (rate < 3.50) {
                                return "bg-green-100 text-green-800 border-green-300";
                              }
                              if (rate < 10.50) {
                                return "bg-yellow-100 text-yellow-800 border-yellow-300";
                              }
                              return "bg-red-100 text-red-800 border-red-300";
                            };
                            
                            const getAssistenciaFibraBadge = (rate: number) => {
                              if (rate < 8.00) {
                                return "bg-green-100 text-green-800 border-green-300";
                              }
                              if (rate < 16.00) {
                                return "bg-yellow-100 text-yellow-800 border-yellow-300";
                              }
                              return "bg-red-100 text-red-800 border-red-300";
                            };
                            
                            // Função para badge da taxa total
                            const getTotalReopeningBadge = (rate: number) => {
                              if (rate < 5.00) {
                                return "bg-green-100 text-green-800 border-green-300";
                              }
                              if (rate < 10.00) {
                                return "bg-yellow-100 text-yellow-800 border-yellow-300";
                              }
                              return "bg-red-100 text-red-800 border-red-300";
                            };
                            
                            // Renderizar posição com medalhas ou número
                            const renderPosition = () => {
                              const position = index + 1;
                              if (position === 1) {
                                return (
                                  <div className="flex items-center justify-center">
                                    <Medal className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                  </div>
                                );
                              } else if (position === 2) {
                                return (
                                  <div className="flex items-center justify-center">
                                    <Medal className="h-5 w-5 text-gray-400 fill-gray-400" />
                                  </div>
                                );
                              } else if (position === 3) {
                                return (
                                  <div className="flex items-center justify-center">
                                    <Medal className="h-5 w-5 text-amber-600 fill-amber-600" />
                                  </div>
                                );
                              } else {
                                return (
                                  <span className="text-gray-700 font-semibold text-sm">
                                    {position}°
                                  </span>
                                );
                              }
                            };
                              
                            return (
                              <TableRow 
                                key={tech.name} 
                                className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                              >
                                <TableCell className={`text-center sticky left-0 z-10 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                  {renderPosition()}
                                </TableCell>
                                <TableCell className={`sticky left-16 z-10 font-semibold border-r-2 border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                  {tech.name}
                                </TableCell>
                                {/* Ponto Principal TV */}
                                {reopeningVisibleColumns.pontoTV && (
                                  <>
                                    <TableCell className="text-center bg-blue-50/30">{tech.pontoPrincipalTVServices}</TableCell>
                                    <TableCell className="text-center bg-blue-50/30">{tech.pontoTVReopenings}</TableCell>
                                    <TableCell className="text-center bg-blue-50/30">
                                      <span className={`inline-block px-2 py-1 rounded-md border text-xs font-bold ${getPontoPrincipalTVBadge(tech.pontoTVRate)}`}>
                                      {tech.pontoTVRate.toFixed(2)}%
                                      </span>
                                    </TableCell>
                                  </>
                                )}
                                {/* Assistência Técnica TV */}
                                {reopeningVisibleColumns.assistenciaTV && (
                                  <>
                                    <TableCell className="text-center bg-green-50/30 border-l-2 border-green-200">{tech.assistenciaTecnicaTVServices}</TableCell>
                                    <TableCell className="text-center bg-green-50/30">{tech.assistenciaTVReopenings}</TableCell>
                                    <TableCell className="text-center bg-green-50/30">
                                      <span className={`inline-block px-2 py-1 rounded-md border text-xs font-bold ${getAssistenciaTVBadge(tech.assistenciaTVRate)}`}>
                                      {tech.assistenciaTVRate.toFixed(2)}%
                                      </span>
                                    </TableCell>
                                  </>
                                )}
                                {/* Assistência Técnica FIBRA */}
                                {reopeningVisibleColumns.assistenciaFibra && (
                                  <>
                                    <TableCell className="text-center bg-purple-50/30 border-l-2 border-purple-200">{tech.assistenciaTecnicaFibraServices}</TableCell>
                                    <TableCell className="text-center bg-purple-50/30">{tech.assistenciaFibraReopenings}</TableCell>
                                    <TableCell className="text-center bg-purple-50/30">
                                      <span className={`inline-block px-2 py-1 rounded-md border text-xs font-bold ${getAssistenciaFibraBadge(tech.assistenciaFibraRate)}`}>
                                      {tech.assistenciaFibraRate.toFixed(2)}%
                                      </span>
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                          )})}
                        
                        {technicians.filter(name => name && filteredServiceOrders.some(o => o.nome_tecnico === name)).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2 + (reopeningVisibleColumns.pontoTV ? 3 : 0) + (reopeningVisibleColumns.assistenciaTV ? 3 : 0) + (reopeningVisibleColumns.assistenciaFibra ? 3 : 0)} className="text-center py-4 text-muted-foreground">
                              Nenhum técnico encontrado no período selecionado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-2 border-gray-300 font-bold">
                          <TableCell className="sticky left-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50"></TableCell>
                          <TableCell className="sticky left-16 z-10 font-bold bg-gradient-to-r from-gray-100 to-gray-50 border-r-2 border-gray-300">
                            Total Geral
                          </TableCell>
                          {/* Ponto Principal TV */}
                          {reopeningVisibleColumns.pontoTV && (
                            <>
                              <TableCell className="text-center font-medium bg-blue-50/30">
                                {filteredServiceOrders.filter(o => {
                                  const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                  return category === "Ponto Principal TV";
                                }).length}
                              </TableCell>
                              <TableCell className="text-center font-medium bg-blue-50/30">
                                {getFilteredReopeningPairs.filter(pair => 
                                  pair.originalServiceCategory?.includes("Ponto Principal TV")
                                ).length}
                              </TableCell>
                              <TableCell className="text-center bg-blue-50/30">
                                {(() => {
                                  const services = filteredServiceOrders.filter(o => {
                                    const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                    return category === "Ponto Principal TV";
                                  }).length;
                                  const reopenings = getFilteredReopeningPairs.filter(pair => 
                                    pair.originalServiceCategory?.includes("Ponto Principal TV")
                                  ).length;
                                  const rate = services > 0 ? ((reopenings / services) * 100) : 0;
                                  return (
                                    <span className={`inline-block px-2 py-1 rounded-md border text-xs font-bold ${
                                      rate < 2.00 
                                        ? "bg-green-100 text-green-800 border-green-300" 
                                        : "bg-red-100 text-red-800 border-red-300"
                                    }`}>
                                      {rate.toFixed(2)}%
                                    </span>
                                  );
                                })()}
                              </TableCell>
                            </>
                          )}

                          {/* Assistência Técnica TV */}
                          {reopeningVisibleColumns.assistenciaTV && (
                            <>
                              <TableCell className="text-center font-medium bg-green-50/30 border-l-2 border-green-200">
                                {filteredServiceOrders.filter(o => {
                                  const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                  return category === "Assistência Técnica TV";
                                }).length}
                              </TableCell>
                              <TableCell className="text-center font-medium bg-green-50/30">
                                {getFilteredReopeningPairs.filter(pair => 
                                  pair.originalServiceCategory?.includes("Assistência Técnica TV")
                                ).length}
                              </TableCell>
                              <TableCell className="text-center bg-green-50/30">
                                {(() => {
                                  const services = filteredServiceOrders.filter(o => {
                                    const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                    return category === "Assistência Técnica TV";
                                  }).length;
                                  const reopenings = getFilteredReopeningPairs.filter(pair => 
                                    pair.originalServiceCategory?.includes("Assistência Técnica TV")
                                  ).length;
                                  const rate = services > 0 ? ((reopenings / services) * 100) : 0;
                                  return (
                                    <span className={`inline-block px-2 py-1 rounded-md border text-xs font-bold ${
                                      rate < 3.50 
                                        ? "bg-green-100 text-green-800 border-green-300" 
                                        : rate < 10.50 
                                        ? "bg-yellow-100 text-yellow-800 border-yellow-300" 
                                        : "bg-red-100 text-red-800 border-red-300"
                                    }`}>
                                      {rate.toFixed(2)}%
                                    </span>
                                  );
                                })()}
                              </TableCell>
                            </>
                          )}

                          {/* Assistência Técnica FIBRA */}
                          {reopeningVisibleColumns.assistenciaFibra && (
                            <>
                              <TableCell className="text-center font-medium bg-purple-50/30 border-l-2 border-purple-200">
                                {filteredServiceOrders.filter(o => {
                                  const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                  return category === "Assistência Técnica FIBRA";
                                }).length}
                              </TableCell>
                              <TableCell className="text-center font-medium bg-purple-50/30">
                                {getFilteredReopeningPairs.filter(pair => 
                                  pair.originalServiceCategory?.includes("Assistência Técnica FIBRA")
                                ).length}
                              </TableCell>
                              <TableCell className="text-center bg-purple-50/30">
                                {(() => {
                                  const services = filteredServiceOrders.filter(o => {
                                    const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                    return category === "Assistência Técnica FIBRA";
                                  }).length;
                                  const reopenings = getFilteredReopeningPairs.filter(pair => 
                                    pair.originalServiceCategory?.includes("Assistência Técnica FIBRA")
                                  ).length;
                                  const rate = services > 0 ? ((reopenings / services) * 100) : 0;
                                  return (
                                    <span className={`inline-block px-2 py-1 rounded-md border text-xs font-bold ${
                                      rate < 8.00 
                                        ? "bg-green-100 text-green-800 border-green-300" 
                                        : rate < 16.00 
                                        ? "bg-yellow-100 text-yellow-800 border-yellow-300" 
                                        : "bg-red-100 text-red-800 border-red-300"
                                    }`}>
                                      {rate.toFixed(2)}%
                                    </span>
                                  );
                                })()}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              
              {/* Card - Tempo de Atendimento por Técnico - Modernizado */}
              <Card className="col-span-1 md:col-span-2 shadow-lg border-2 border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center text-base">
                        <Clock className="mr-2 h-5 w-5" />
                        Tempo de Atendimento por Técnico
                      </CardTitle>
                      <CardDescription className="text-blue-100 text-xs">
                        Quantidade de OS finalizadas por técnico, categorizadas por tempo de atendimento atingido ou perdido
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-white/20 hover:bg-white/30 border-white/30 text-white">
                          <Columns className="h-4 w-4 mr-2" />
                          Colunas
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Exibir Colunas</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={timeVisibleColumns.pontoTV}
                          onCheckedChange={(checked) => 
                            setTimeVisibleColumns(prev => ({ ...prev, pontoTV: checked as boolean }))
                          }
                        >
                          Ponto Principal TV
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={timeVisibleColumns.assistenciaTV}
                          onCheckedChange={(checked) => 
                            setTimeVisibleColumns(prev => ({ ...prev, assistenciaTV: checked as boolean }))
                          }
                        >
                          Assistência Técnica TV
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={timeVisibleColumns.assistenciaFibra}
                          onCheckedChange={(checked) => 
                            setTimeVisibleColumns(prev => ({ ...prev, assistenciaFibra: checked as boolean }))
                          }
                        >
                          Assistência Técnica FIBRA
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                          <TableHead className="text-center font-bold text-gray-900 w-16 sticky left-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50">Pos</TableHead>
                          <TableHead className="sticky left-16 z-10 bg-gradient-to-r from-gray-100 to-gray-50 min-w-[150px] font-bold text-gray-900 border-r-2 border-gray-300">
                            Técnico
                          </TableHead>
                          {timeVisibleColumns.pontoTV && (
                            <TableHead className="text-center font-bold text-blue-700 bg-blue-50 border-l-2 border-blue-200" colSpan={3}>
                              Ponto Principal TV
                            </TableHead>
                          )}
                          {timeVisibleColumns.assistenciaTV && (
                            <TableHead className="text-center font-bold text-green-700 bg-green-50 border-l-2 border-green-200" colSpan={3}>
                              Assistência Técnica TV
                            </TableHead>
                          )}
                          {timeVisibleColumns.assistenciaFibra && (
                            <TableHead className="text-center font-bold text-purple-700 bg-purple-50 border-l-2 border-purple-200" colSpan={3}>
                              Assistência Técnica FIBRA
                            </TableHead>
                          )}
                        </TableRow>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                          <TableHead className="sticky left-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100"></TableHead>
                          <TableHead className="sticky left-16 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-r-2 border-gray-300"></TableHead>
                          {timeVisibleColumns.pontoTV && (
                            <>
                              <TableHead className="text-center text-xs py-2 bg-blue-50 border-l-2 border-blue-200">Na Meta</TableHead>
                              <TableHead className="text-center text-xs py-2 bg-blue-50">Fora</TableHead>
                              <TableHead className="text-center text-xs py-2 bg-blue-50">%</TableHead>
                            </>
                          )}
                          {timeVisibleColumns.assistenciaTV && (
                            <>
                              <TableHead className="text-center text-xs py-2 bg-green-50 border-l-2 border-green-200">Na Meta</TableHead>
                              <TableHead className="text-center text-xs py-2 bg-green-50">Fora</TableHead>
                              <TableHead className="text-center text-xs py-2 bg-green-50">%</TableHead>
                            </>
                          )}
                          {timeVisibleColumns.assistenciaFibra && (
                            <>
                              <TableHead className="text-center text-xs py-2 bg-purple-50 border-l-2 border-purple-200">Na Meta</TableHead>
                              <TableHead className="text-center text-xs py-2 bg-purple-50">Fora</TableHead>
                              <TableHead className="text-center text-xs py-2 bg-purple-50">%</TableHead>
                            </>
                          )}
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
                            
                            // Contadores por categoria e status de meta (removido Ponto Principal FIBRA)
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
                            
                            // Só exibir técnicos que têm dados no período filtrado
                            if (totalFinalized === 0) return null;
                            
                            return {
                              name,
                              pontoTvWithinGoal,
                              pontoTvOutsideGoal,
                              percentPontoTv,
                              assistTvWithinGoal,
                              assistTvOutsideGoal,
                              percentAssistTv,
                              assistFibraWithinGoal,
                              assistFibraOutsideGoal,
                              percentAssistFibra
                            };
                          })
                          .filter(Boolean)
                          .sort((a, b) => {
                            // Calcular média ponderada dos percentuais para ordenação (considerando apenas colunas visíveis)
                            const calcAveragePercent = (tech: {
                              pontoTvWithinGoal: number;
                              pontoTvOutsideGoal: number;
                              assistTvWithinGoal: number;
                              assistTvOutsideGoal: number;
                              assistFibraWithinGoal: number;
                              assistFibraOutsideGoal: number;
                              percentPontoTv: number;
                              percentAssistTv: number;
                              percentAssistFibra: number;
                            }) => {
                              const visibleColumns = [
                                timeVisibleColumns.pontoTV ? {
                                  percent: tech.percentPontoTv,
                                  total: tech.pontoTvWithinGoal + tech.pontoTvOutsideGoal
                                } : null,
                                timeVisibleColumns.assistenciaTV ? {
                                  percent: tech.percentAssistTv,
                                  total: tech.assistTvWithinGoal + tech.assistTvOutsideGoal
                                } : null,
                                timeVisibleColumns.assistenciaFibra ? {
                                  percent: tech.percentAssistFibra,
                                  total: tech.assistFibraWithinGoal + tech.assistFibraOutsideGoal
                                } : null
                              ].filter(Boolean) as Array<{ percent: number; total: number }>;

                              // Se nenhuma coluna visível, usar todas (fallback)
                              if (visibleColumns.length === 0) {
                                const totalPontoTv = tech.pontoTvWithinGoal + tech.pontoTvOutsideGoal;
                                const totalAssistTv = tech.assistTvWithinGoal + tech.assistTvOutsideGoal;
                                const totalAssistFibra = tech.assistFibraWithinGoal + tech.assistFibraOutsideGoal;
                                const total = totalPontoTv + totalAssistTv + totalAssistFibra;
                                
                                if (total === 0) return 0;
                                const weightedSum = (tech.percentPontoTv * totalPontoTv) + 
                                                   (tech.percentAssistTv * totalAssistTv) + 
                                                   (tech.percentAssistFibra * totalAssistFibra);
                                return weightedSum / total;
                              }

                              // Se apenas 1 coluna visível, usar o percentual direto
                              if (visibleColumns.length === 1) {
                                return visibleColumns[0].percent;
                              }

                              // Se 2 ou 3 colunas visíveis, calcular média ponderada
                              const total = visibleColumns.reduce((sum, col) => sum + col.total, 0);
                              if (total === 0) return 0;
                              
                              const weightedSum = visibleColumns.reduce((sum, col) => {
                                return sum + (col.percent * col.total);
                              }, 0);
                              
                              return weightedSum / total;
                            };
                            
                            const avgA = calcAveragePercent(a);
                            const avgB = calcAveragePercent(b);
                            
                            // Ordenar pelo percentual médio (maior primeiro)
                            const percentComparison = avgB - avgA;
                            
                            // Em caso de empate, ordenar pelo volume total (considerando apenas colunas visíveis)
                            if (percentComparison === 0) {
                              const getVisibleTotal = (tech: {
                                pontoTvWithinGoal: number;
                                pontoTvOutsideGoal: number;
                                assistTvWithinGoal: number;
                                assistTvOutsideGoal: number;
                                assistFibraWithinGoal: number;
                                assistFibraOutsideGoal: number;
                              }) => {
                                let total = 0;
                                if (timeVisibleColumns.pontoTV) {
                                  total += tech.pontoTvWithinGoal + tech.pontoTvOutsideGoal;
                                }
                                if (timeVisibleColumns.assistenciaTV) {
                                  total += tech.assistTvWithinGoal + tech.assistTvOutsideGoal;
                                }
                                if (timeVisibleColumns.assistenciaFibra) {
                                  total += tech.assistFibraWithinGoal + tech.assistFibraOutsideGoal;
                                }
                                
                                // Se nenhuma coluna visível, usar todas (fallback)
                                if (total === 0) {
                                  return tech.pontoTvWithinGoal + tech.pontoTvOutsideGoal + 
                                         tech.assistTvWithinGoal + tech.assistTvOutsideGoal + 
                                         tech.assistFibraWithinGoal + tech.assistFibraOutsideGoal;
                                }
                                
                                return total;
                              };

                              const totalA = getVisibleTotal(a);
                              const totalB = getVisibleTotal(b);
                              return totalB - totalA;
                            }
                            
                            return percentComparison;
                          })
                          .map((tech, index) => {
                            // Funções para badges de percentuais
                            const getMetaBadge = (rate: number) => {
                              if (rate >= 75) {
                                return "bg-green-100 text-green-800 border-green-300";
                              } else if (rate >= 50) {
                                return "bg-yellow-100 text-yellow-800 border-yellow-300";
                              }
                              return "bg-red-100 text-red-800 border-red-300";
                            };

                            // Renderizar posição com medalhas ou número
                            const renderPosition = () => {
                              const position = index + 1;
                              if (position === 1) {
                            return (
                                  <div className="flex items-center justify-center">
                                    <Medal className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                  </div>
                                );
                              } else if (position === 2) {
                                return (
                                  <div className="flex items-center justify-center">
                                    <Medal className="h-5 w-5 text-gray-400 fill-gray-400" />
                                  </div>
                                );
                              } else if (position === 3) {
                                return (
                                  <div className="flex items-center justify-center">
                                    <Medal className="h-5 w-5 text-amber-600 fill-amber-600" />
                                  </div>
                                );
                              } else {
                                return (
                                  <span className="text-gray-700 font-semibold text-sm">
                                    {position}°
                                  </span>
                                );
                              }
                            };
                            
                            return (
                              <TableRow 
                                key={tech.name}
                                className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                              >
                                <TableCell className={`text-center sticky left-0 z-10 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                  {renderPosition()}
                                </TableCell>
                                <TableCell className={`sticky left-16 z-10 font-semibold border-r-2 border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                  {tech.name}
                                </TableCell>
                                
                                {/* Ponto Principal TV */}
                                {timeVisibleColumns.pontoTV && (
                                  <>
                                    <TableCell className="text-center bg-blue-50/30 border-l-2 border-blue-200">{tech.pontoTvWithinGoal}</TableCell>
                                    <TableCell className="text-center bg-blue-50/30">{tech.pontoTvOutsideGoal}</TableCell>
                                    <TableCell className="text-center bg-blue-50/30">
                                      <span className={`inline-block px-2 py-1 rounded-md border text-xs font-bold ${getMetaBadge(tech.percentPontoTv)}`}>
                                      {tech.percentPontoTv.toFixed(2)}%
                                      </span>
                                    </TableCell>
                                  </>
                                )}
                                
                                {/* Assistência Técnica TV */}
                                {timeVisibleColumns.assistenciaTV && (
                                  <>
                                    <TableCell className="text-center bg-green-50/30 border-l-2 border-green-200">{tech.assistTvWithinGoal}</TableCell>
                                    <TableCell className="text-center bg-green-50/30">{tech.assistTvOutsideGoal}</TableCell>
                                    <TableCell className="text-center bg-green-50/30">
                                      <span className={`inline-block px-2 py-1 rounded-md border text-xs font-bold ${getMetaBadge(tech.percentAssistTv)}`}>
                                        {tech.percentAssistTv.toFixed(2)}%
                                      </span>
                                    </TableCell>
                                  </>
                                )}
                                
                                {/* Assistência Técnica FIBRA */}
                                {timeVisibleColumns.assistenciaFibra && (
                                  <>
                                    <TableCell className="text-center bg-purple-50/30 border-l-2 border-purple-200">{tech.assistFibraWithinGoal}</TableCell>
                                    <TableCell className="text-center bg-purple-50/30">{tech.assistFibraOutsideGoal}</TableCell>
                                    <TableCell className="text-center bg-purple-50/30">
                                      <span className={`inline-block px-2 py-1 rounded-md border text-xs font-bold ${getMetaBadge(tech.percentAssistFibra)}`}>
                                        {tech.percentAssistFibra.toFixed(2)}%
                                      </span>
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            );
                          })}
                        
                        {technicians.filter(name => name && filteredServiceOrdersByFinalization.some(o => o.nome_tecnico === name)).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2 + (timeVisibleColumns.pontoTV ? 3 : 0) + (timeVisibleColumns.assistenciaTV ? 3 : 0) + (timeVisibleColumns.assistenciaFibra ? 3 : 0)} className="text-center py-4 text-muted-foreground">
                              Nenhum técnico encontrado no período selecionado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-2 border-gray-300 font-bold">
                          <TableCell className="sticky left-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50"></TableCell>
                          <TableCell className="sticky left-16 z-10 font-bold bg-gradient-to-r from-gray-100 to-gray-50 border-r-2 border-gray-300">
                            Total Geral
                          </TableCell>

                          {/* Ponto Principal TV */}
                          {timeVisibleColumns.pontoTV && (
                            <>
                              <TableCell className="text-center font-medium bg-blue-50/30 border-l-2 border-blue-200">
                                {filteredServiceOrdersByFinalization.filter(o => {
                                  const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                  return category === "Ponto Principal TV" && o.atingiu_meta === true && o.include_in_metrics;
                                }).length}
                              </TableCell>
                              <TableCell className="text-center font-medium bg-blue-50/30">
                                {filteredServiceOrdersByFinalization.filter(o => {
                                  const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                  return category === "Ponto Principal TV" && o.atingiu_meta === false && o.include_in_metrics;
                                }).length}
                              </TableCell>
                              <TableCell className="text-center bg-blue-50/30">
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
                                  return (
                                    <span className={`inline-block px-2 py-1 rounded-md border text-xs font-bold ${
                                      percent >= 75 
                                        ? "bg-green-100 text-green-800 border-green-300" 
                                      : percent >= 50 
                                        ? "bg-yellow-100 text-yellow-800 border-yellow-300" 
                                        : "bg-red-100 text-red-800 border-red-300"
                                    }`}>
                                      {percent.toFixed(2)}%
                                    </span>
                                  );
                                })()}
                              </TableCell>
                            </>
                          )}
                          
                          {/* Assistência Técnica TV */}
                          {timeVisibleColumns.assistenciaTV && (
                            <>
                              <TableCell className="text-center font-medium bg-green-50/30 border-l-2 border-green-200">
                                {filteredServiceOrdersByFinalization.filter(o => {
                                  const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                  return category === "Assistência Técnica TV" && o.atingiu_meta === true && o.include_in_metrics;
                                }).length}
                              </TableCell>
                              <TableCell className="text-center font-medium bg-green-50/30">
                                {filteredServiceOrdersByFinalization.filter(o => {
                                  const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                  return category === "Assistência Técnica TV" && o.atingiu_meta === false && o.include_in_metrics;
                                }).length}
                              </TableCell>
                              <TableCell className="text-center bg-green-50/30">
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
                                  return (
                                    <span className={`inline-block px-2 py-1 rounded-md border text-xs font-bold ${
                                      percent >= 75 
                                        ? "bg-green-100 text-green-800 border-green-300" 
                                      : percent >= 50 
                                        ? "bg-yellow-100 text-yellow-800 border-yellow-300" 
                                        : "bg-red-100 text-red-800 border-red-300"
                                    }`}>
                                      {percent.toFixed(2)}%
                                    </span>
                                  );
                                })()}
                              </TableCell>
                            </>
                          )}
                          
                          {/* Assistência Técnica FIBRA */}
                          {timeVisibleColumns.assistenciaFibra && (
                            <>
                              <TableCell className="text-center font-medium bg-purple-50/30 border-l-2 border-purple-200">
                                {filteredServiceOrdersByFinalization.filter(o => {
                                  const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                  return category === "Assistência Técnica FIBRA" && o.atingiu_meta === true && o.include_in_metrics;
                                }).length}
                              </TableCell>
                              <TableCell className="text-center font-medium bg-purple-50/30">
                                {filteredServiceOrdersByFinalization.filter(o => {
                                  const category = standardizeServiceCategory(o.subtipo_servico || "", o.motivo || "");
                                  return category === "Assistência Técnica FIBRA" && o.atingiu_meta === false && o.include_in_metrics;
                                }).length}
                              </TableCell>
                              <TableCell className="text-center bg-purple-50/30">
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
                                  return (
                                    <span className={`inline-block px-2 py-1 rounded-md border text-xs font-bold ${
                                      percent >= 75 
                                        ? "bg-green-100 text-green-800 border-green-300" 
                                      : percent >= 50 
                                        ? "bg-yellow-100 text-yellow-800 border-yellow-300" 
                                        : "bg-red-100 text-red-800 border-red-300"
                                    }`}>
                                      {percent.toFixed(2)}%
                                    </span>
                                  );
                                })()}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              
              {/* Quantidade de Serviços por Técnico - Modernizado */}
              <Card className="col-span-1 md:col-span-2 shadow-lg border-2 border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30">
                <CardHeader className="pb-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-base">
                    <Users className="mr-2 h-5 w-5" />
                    Quantidade de Serviços por Técnico
                  </CardTitle>
                  <CardDescription className="text-indigo-100 text-xs">
                    Total de serviços realizados por cada técnico por tipo
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                          <TableHead className="text-center font-bold text-gray-900 w-16 sticky left-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50">Pos</TableHead>
                          <TableHead className="sticky left-16 z-10 bg-gradient-to-r from-gray-100 to-gray-50 min-w-[150px] font-bold text-gray-900 border-r-2 border-gray-300">
                            Técnico
                          </TableHead>
                          <TableHead className="text-center font-bold text-gray-900 border-l-2 border-gray-300" colSpan={11}>Tipo de Serviço</TableHead>
                          <TableHead className="sticky right-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50 text-center font-bold text-gray-900 border-l-2 border-gray-300 min-w-[80px]">
                            Total
                          </TableHead>
                        </TableRow>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                          <TableHead className="sticky left-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100"></TableHead>
                          <TableHead className="sticky left-16 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-r-2 border-gray-300"></TableHead>
                          <TableHead className="text-center text-xs py-2 border-l-2 border-gray-300">Corretiva</TableHead>
                          <TableHead className="text-center text-xs py-2">Corr. BL</TableHead>
                          <TableHead className="text-center text-xs py-2">Ponto Princ.</TableHead>
                          <TableHead className="text-center text-xs py-2">Prest. Serviço</TableHead>
                          <TableHead className="text-center text-xs py-2">Prest. Serviço BL</TableHead>
                          <TableHead className="text-center text-xs py-2">Preventiva</TableHead>
                          <TableHead className="text-center text-xs py-2">Prev. BL</TableHead>
                          <TableHead className="text-center text-xs py-2">Sist. Opc.</TableHead>
                          <TableHead className="text-center text-xs py-2">Canc. Vol.</TableHead>
                          <TableHead className="text-center text-xs py-2">Kit TVRO</TableHead>
                          <TableHead className="text-center text-xs py-2">Substituição</TableHead>
                          <TableHead className="sticky right-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 text-center text-xs py-2 border-l-2 border-gray-300"></TableHead>
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
                            
                            // Contar serviços por tipo (removido Ponto Principal BL)
                            const servicesByType = {
                              'Corretiva': techOrders.filter(o => o.subtipo_servico?.includes('Corretiva') && !o.subtipo_servico?.includes('BL')).length,
                              'Corretiva BL': techOrders.filter(o => o.subtipo_servico?.includes('Corretiva BL')).length,
                              'Ponto Principal': techOrders.filter(o => o.subtipo_servico?.includes('Ponto Principal') && !o.subtipo_servico?.includes('BL')).length,
                              'Prestação de Serviço': techOrders.filter(o => o.subtipo_servico?.includes('Prestação de Serviço') && !o.subtipo_servico?.includes('BL')).length,
                              'Prestação de Serviço BL': techOrders.filter(o => o.subtipo_servico?.includes('Prestação de Serviço BL')).length,
                              'Preventiva': techOrders.filter(o => o.subtipo_servico?.includes('Preventiva') && !o.subtipo_servico?.includes('BL')).length,
                              'Preventiva BL': techOrders.filter(o => o.subtipo_servico?.includes('Preventiva BL')).length,
                              'Sistema Opcional': techOrders.filter(o => o.subtipo_servico?.includes('Sistema Opcional')).length,
                              'Cancelamento Voluntário': techOrders.filter(o => o.subtipo_servico?.includes('Cancelamento Voluntário')).length,
                              'Kit TVRO': techOrders.filter(o => o.subtipo_servico?.includes('Kit TVRO')).length,
                              'Substituição': techOrders.filter(o => o.subtipo_servico?.includes('Substituição')).length,
                            };

                            return {
                              name,
                              totalOrders,
                              servicesByType
                            };
                          })
                          .filter(Boolean)
                          .sort((a, b) => b.totalOrders - a.totalOrders) // Ordenar por total (decrescente)
                          .map((tech, index) => {
                            // Renderizar posição com medalhas ou número
                            const renderPosition = () => {
                              const position = index + 1;
                              if (position === 1) {
                            return (
                                  <div className="flex items-center justify-center">
                                    <Medal className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                  </div>
                                );
                              } else if (position === 2) {
                                return (
                                  <div className="flex items-center justify-center">
                                    <Medal className="h-5 w-5 text-gray-400 fill-gray-400" />
                                  </div>
                                );
                              } else if (position === 3) {
                                return (
                                  <div className="flex items-center justify-center">
                                    <Medal className="h-5 w-5 text-amber-600 fill-amber-600" />
                                  </div>
                                );
                              } else {
                                return (
                                  <span className="text-gray-700 font-semibold text-sm">
                                    {position}°
                                  </span>
                                );
                              }
                            };

                            return (
                              <TableRow 
                                key={tech.name} 
                                className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                              >
                                <TableCell className={`text-center sticky left-0 z-10 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                  {renderPosition()}
                                </TableCell>
                                <TableCell className={`sticky left-16 z-10 font-semibold border-r-2 border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                  {tech.name}
                                </TableCell>
                                <TableCell className="text-center border-l-2 border-gray-300">{tech.servicesByType['Corretiva']}</TableCell>
                                <TableCell className="text-center">{tech.servicesByType['Corretiva BL']}</TableCell>
                                <TableCell className="text-center">{tech.servicesByType['Ponto Principal']}</TableCell>
                                <TableCell className="text-center">{tech.servicesByType['Prestação de Serviço']}</TableCell>
                                <TableCell className="text-center">{tech.servicesByType['Prestação de Serviço BL']}</TableCell>
                                <TableCell className="text-center">{tech.servicesByType['Preventiva']}</TableCell>
                                <TableCell className="text-center">{tech.servicesByType['Preventiva BL']}</TableCell>
                                <TableCell className="text-center">{tech.servicesByType['Sistema Opcional']}</TableCell>
                                <TableCell className="text-center">{tech.servicesByType['Cancelamento Voluntário']}</TableCell>
                                <TableCell className="text-center">{tech.servicesByType['Kit TVRO']}</TableCell>
                                <TableCell className="text-center">{tech.servicesByType['Substituição']}</TableCell>
                                <TableCell className={`sticky right-0 z-10 text-center font-bold border-l-2 border-gray-300 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                  {tech.totalOrders}
                                </TableCell>
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
                        <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-2 border-gray-300 font-bold">
                          <TableCell className="sticky left-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50"></TableCell>
                          <TableCell className="sticky left-16 z-10 font-bold bg-gradient-to-r from-gray-100 to-gray-50 border-r-2 border-gray-300">
                            Total Geral
                          </TableCell>
                          <TableCell className="text-center font-medium border-l-2 border-gray-300">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Corretiva') && !o.subtipo_servico?.includes('BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Corretiva BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Ponto Principal') && !o.subtipo_servico?.includes('BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Prestação de Serviço') && !o.subtipo_servico?.includes('BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Prestação de Serviço BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Preventiva') && !o.subtipo_servico?.includes('BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Preventiva BL') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Sistema Opcional') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Cancelamento Voluntário') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Kit TVRO') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {filteredServiceOrders.filter(o => o.subtipo_servico?.includes('Substituição') && o.status !== "Cancelada").length}
                          </TableCell>
                          <TableCell className="sticky right-0 z-10 text-center font-bold bg-gradient-to-r from-gray-100 to-gray-50 border-l-2 border-gray-300">
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
        <ServiceOrderTable 
          filteredOrders={filteredServiceOrders} 
          onFiltersChange={setTableFilters}
        />
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
                    <div className="bg-[#fff3cd] text-[#856404] px-4 py-2 rounded-lg border-b border-[#ffeeba]">
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
        empresa: (u.empresa as string) || 'InsightPro',
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
      <Card className="w-full h-64 shadow-lg border-2 border-red-100 bg-gradient-to-br from-white via-red-50/30 to-orange-50/30">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center">
              <UserCog className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Acesso Restrito</h3>
            <p className="mt-2 text-sm text-gray-600 max-w-sm">
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
      
      <Card className="shadow-lg border-2 border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
            Gerenciamento de Usuários
          </CardTitle>
              <CardDescription className="text-blue-100 mt-2">
            Gerencie os usuários que podem acessar o sistema.
          </CardDescription>
          {user?.empresa && (
                <div className="mt-3">
                  <Badge variant="outline" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                    <Building2 className="mr-1 h-3 w-3" />
                Empresa: {user.empresa}
              </Badge>
            </div>
          )}
            </div>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => setIsCreateUserOpen(true)}
              className="bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 shadow-md hover:shadow-lg transition-all"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Criar Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                <TableHead className="font-bold text-gray-900">Usuário</TableHead>
                <TableHead className="font-bold text-gray-900">Nome</TableHead>
                <TableHead className="font-bold text-gray-900">Email</TableHead>
                <TableHead className="font-bold text-gray-900">Empresa</TableHead>
                <TableHead className="font-bold text-gray-900">Papel</TableHead>
                <TableHead className="font-bold text-gray-900">Data de Adesão</TableHead>
                <TableHead className="font-bold text-gray-900">Status</TableHead>
                <TableHead className="text-right font-bold text-gray-900">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {filteredUsers.map((user, index) => (
                <TableRow 
                  key={user.id}
                  className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <TableCell className="font-semibold text-gray-900">{user.username}</TableCell>
                  <TableCell className="text-gray-700">{user.name}</TableCell>
                  <TableCell className="text-gray-700">{user.email}</TableCell>
                  <TableCell className="text-gray-700">{user.empresa}</TableCell>
                    <TableCell>
                    <Badge 
                      variant={user.role === 'admin' ? 'default' : 'secondary'}
                      className={user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200' 
                        : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                      }
                    >
                      {user.role === 'admin' ? '👑 Administrador' : '👤 Usuário'}
                      </Badge>
                    </TableCell>
                  <TableCell className="text-gray-700">
                    {user.data_adesao ? new Date(user.data_adesao).toLocaleDateString('pt-BR') : 'N/A'}
                  </TableCell>
                    <TableCell>
                    <Badge 
                      variant={user.acesso_liberado ? 'default' : 'destructive'} 
                      className={user.acesso_liberado 
                        ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                      }
                    >
                      {user.acesso_liberado ? '✓ Ativo' : '✗ Inativo'}
                      </Badge>
                    </TableCell>
                  <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                        title="Editar usuário"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                  </TableCell>
                </TableRow>
              ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <Users className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">Nenhum usuário encontrado</p>
                        <p className="text-sm text-gray-400">Crie um novo usuário para começar</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={!!editingUser} onOpenChange={(open) => {
        if (!open) setEditingUser(null);
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 border-2 border-blue-100 shadow-2xl">
      {editingUser && (
            <>
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg p-6">
                <DialogHeader className="text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Pencil className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-white">Editar Usuário: {editingUser.username}</DialogTitle>
                  </div>
                  <DialogDescription className="text-blue-100 text-base">
                    Atualize as informações do usuário abaixo
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="p-6 bg-white">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="username" className="text-gray-700 font-semibold text-sm">Nome de Usuário</Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                        <UserCog className="text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                      </div>
                <Input
                  id="username"
                  value={editingUser.username}
                  onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                        className="pl-12 h-14 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl transition-all duration-200 bg-gray-50/50 hover:bg-white hover:border-gray-300"
                />
              </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-gray-700 font-semibold text-sm">Nome Completo</Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                        <UserIcon className="text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                      </div>
                <Input
                  id="name"
                  value={editingUser.name}
                  onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                        className="pl-12 h-14 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl transition-all duration-200 bg-gray-50/50 hover:bg-white hover:border-gray-300"
                />
              </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-gray-700 font-semibold text-sm">Email</Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                        <Mail className="text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        value={editingUser.email}
                        onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                        className="pl-12 h-14 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl transition-all duration-200 bg-gray-50/50 hover:bg-white hover:border-gray-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="empresa" className="text-gray-700 font-semibold text-sm">Empresa</Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                        <Building2 className="text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                      </div>
                <Input
                  id="empresa"
                  value={editingUser.empresa}
                  onChange={e => setEditingUser({...editingUser, empresa: e.target.value})}
                        className="pl-12 h-14 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl transition-all duration-200 bg-gray-50/50 hover:bg-white hover:border-gray-300"
                />
              </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="role" className="text-gray-700 font-semibold text-sm">Tipo de Usuário</Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                        <UserCog className="text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                      </div>
                <Select
                  value={editingUser.role}
                  onValueChange={(value: 'admin' | 'user') => setEditingUser({...editingUser, role: value})}
                >
                        <SelectTrigger 
                          className="pl-12 h-14 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl transition-all duration-200 bg-gray-50/50 hover:bg-white hover:border-gray-300"
                        >
                          <SelectValue placeholder="Selecione o tipo de usuário" />
                  </SelectTrigger>
                  <SelectContent>
                          <SelectItem value="user">👤 Usuário</SelectItem>
                          <SelectItem value="admin">👑 Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="acesso" className="text-gray-700 font-semibold text-sm">Status de Acesso</Label>
                    <div className="flex items-center space-x-3 p-4 bg-gray-50/50 rounded-xl border-2 border-gray-200">
                  <Switch 
                    id="acesso"
                    checked={editingUser.acesso_liberado}
                    onCheckedChange={(checked) => 
                      setEditingUser({...editingUser, acesso_liberado: checked})
                    }
                        className="data-[state=checked]:bg-green-600"
                  />
                      <Label htmlFor="acesso" className="cursor-pointer flex items-center gap-2">
                        <Badge 
                          variant="outline"
                          className={editingUser.acesso_liberado 
                            ? "bg-green-100 text-green-800 border-green-300" 
                            : "bg-red-100 text-red-800 border-red-300"
                          }
                        >
                          {editingUser.acesso_liberado ? '✓ Ativo' : '✗ Inativo'}
                        </Badge>
                  </Label>
                </div>
              </div>
            </div>
              </div>
              <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-200 gap-3">
            <Button 
              variant="outline"
              onClick={() => {
                setEditingUser(null);
              }}
                  className="border-gray-300 hover:bg-gray-100"
            >
                  <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
                <Button 
                  onClick={handleSaveUser} 
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Check className="mr-2 h-4 w-4" />
              Salvar Alterações
            </Button>
              </DialogFooter>
            </>
      )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 border-2 border-blue-100 shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg p-6">
            <DialogHeader className="text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <UserPlus className="h-6 w-6" />
                </div>
                <DialogTitle className="text-2xl font-bold text-white">Criar Novo Usuário</DialogTitle>
              </div>
              <DialogDescription className="text-blue-100 text-base">
                Preencha os campos abaixo para criar um novo usuário no sistema.
            </DialogDescription>
          </DialogHeader>
          </div>
          <div className="p-6 bg-white">
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
        empresa: (u.empresa as string) || 'InsightPro',
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
      <Card className="w-full h-64 shadow-lg border-2 border-red-100 bg-gradient-to-br from-white via-red-50/30 to-orange-50/30">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center">
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Acesso Restrito</h3>
            <p className="mt-2 text-sm text-gray-600 max-w-sm">
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
      <Card className="shadow-lg border-2 border-emerald-100 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/30">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg pb-4">
          <CardTitle className="flex items-center gap-2 text-white text-xl">
            <div className="p-2 bg-white/20 rounded-lg">
              <CreditCard className="h-6 w-6" />
            </div>
            Gerenciamento de Pagamentos
          </CardTitle>
          <CardDescription className="text-emerald-100 mt-2">
            Gerencie os pagamentos e o acesso dos usuários ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                <TableHead className="font-bold text-gray-900">Nome do Cliente</TableHead>
                <TableHead className="font-bold text-gray-900">Email</TableHead>
                <TableHead className="font-bold text-gray-900">Data de Pagamento</TableHead>
                <TableHead className="font-bold text-gray-900">Próximo Vencimento</TableHead>
                <TableHead className="font-bold text-gray-900">Status</TableHead>
                <TableHead className="font-bold text-gray-900">Acesso</TableHead>
                <TableHead className="text-right font-bold text-gray-900">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => {
                const status = getStatus(user.data_adesao || '');
                
                return (
                  <TableRow 
                    key={user.id}
                    className={`hover:bg-emerald-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <TableCell className="font-semibold text-gray-900">{user.name}</TableCell>
                    <TableCell className="text-gray-700">{user.email}</TableCell>
                    <TableCell className="text-gray-700">{formatDate(user.data_adesao || '')}</TableCell>
                    <TableCell className="text-gray-700">{formatDate(getNextDueDate(user.data_adesao || '').toISOString())}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={
                          status === "Em dia"
                            ? "bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                            : status === "Aberto"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                            : "bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
                        }
                      >
                        {status === "Em dia" && "✓ "}
                        {status === "Aberto" && "⚠ "}
                        {status === "Vencido" && "✗ "}
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.acesso_liberado ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200">
                          ✓ Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200">
                          ✗ Pausado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRenewSubscription(user.id)}
                          className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 hover:text-blue-900 whitespace-nowrap transition-colors"
                        >
                          <RefreshCcw className="h-4 w-4 mr-1.5" />
                          Renovar
                        </Button>
                        <Button 
                          variant={user.acesso_liberado ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleAccess(user.id)}
                          className={user.acesso_liberado 
                            ? "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all"
                            : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                          }
                        >
                          {user.acesso_liberado ? (
                            <>
                              <X className="h-4 w-4 mr-1.5" />
                              Pausar
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1.5" />
                              Reativar
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <CreditCard className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">Nenhum usuário encontrado</p>
                      <p className="text-sm text-gray-400">Nenhum registro de pagamento disponível</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      
      {userToUpdate && (
        <Dialog open={!!userToUpdate} onOpenChange={(open) => {
          if (!open) setUserToUpdate(null);
        }}>
          <DialogContent className="sm:max-w-[500px] p-0 border-2 border-emerald-100 shadow-2xl">
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg p-6">
              <DialogHeader className="text-left">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <DialogTitle className="text-2xl font-bold text-white">Atualizar Data de Pagamento</DialogTitle>
                </div>
                <DialogDescription className="text-emerald-100 text-base">
                Selecione a nova data de pagamento para o usuário.
              </DialogDescription>
            </DialogHeader>
            </div>
            <div className="p-6 bg-white">
              <div className="space-y-4">
                <Label className="text-gray-700 font-semibold text-sm">Nova Data de Pagamento</Label>
                <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50/50 hover:bg-white transition-colors">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date)}
                    initialFocus
                    className="mx-auto rounded-lg"
                  />
                </div>
                <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                  {selectedDate ? (
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Data selecionada:</p>
                      <p className="text-lg font-bold text-emerald-700">
                        {formatDate(selectedDate.toISOString())}
                    </p>
                    </div>
                  ) : (
                    <p className="text-sm text-center text-gray-500">
                      Selecione uma data no calendário acima
                    </p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-200 gap-3">
              <Button 
                variant="outline" 
                onClick={() => setUserToUpdate(null)}
                type="button"
                className="border-gray-300 hover:bg-gray-100"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button 
                onClick={confirmDateSelection} 
                disabled={!selectedDate}
                type="button"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="mr-2 h-4 w-4" />
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
      
      reader.onload = async (e) => {
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
                title: (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 rounded-lg">
                      <Target className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="font-semibold">Importação Comercial Concluída</span>
                  </div>
                ) as unknown as string,
                description: totalNovos > 0 ? (
                  <div className="space-y-2 mt-2">
                    {novasVendasPermanencia > 0 && (
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm text-green-800">Novas vendas de permanência</span>
                        <span className="font-bold text-green-700 text-base">{novasVendasPermanencia.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    {novasVendasMeta > 0 && (
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-sm text-blue-800">Novas vendas de meta</span>
                        <span className="font-bold text-blue-700 text-base">{novasVendasMeta.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    {novasMetas > 0 && (
                      <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-200">
                        <span className="text-sm text-purple-800">Novas metas</span>
                        <span className="font-bold text-purple-700 text-base">{novasMetas.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-200 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">Total processado</span>
                        <span className="font-bold text-gray-900 text-lg">{totalNovos.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">Nenhum novo registro foi adicionado (todos já existiam).</p>
                  </div>
                ),
                className: "border-2 border-green-200 bg-white"
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
            let processedBaseUpdated = 0;
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
                  processedBaseUpdated = result.updatedRecords || 0;
                  totalProcessedBase = result.totalProcessed;
                  hasValidData = true;
                  console.log(`[ImportData] BASE: ${result.totalProcessed} processados, ${result.newRecords} novos, ${result.updatedRecords || 0} atualizados, ${result.duplicatesIgnored} duplicados`);
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
            
            // Verificar se nenhum dado foi processado (novos ou atualizados)
            const totalProcessados = processedServiceOrders + processedBaseData + processedBaseUpdated;
            
            if (totalProcessados === 0 && (totalProcessedServices > 0 || totalProcessedBase > 0)) {
              toast({
                title: (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <FileIcon className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="font-semibold">Importação Operacional Concluída</span>
                  </div>
                ) as unknown as string,
                description: (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">Nenhum novo registro foi adicionado (todos já existiam).</p>
                  </div>
                ),
                className: "border-2 border-purple-200 bg-white"
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
              detalhes.push(`${processedBaseData} Nova${processedBaseData > 1 ? 's' : ''} base${processedBaseData > 1 ? 's' : ''}`);
            }
            if (processedBaseUpdated > 0) {
              detalhes.push(`${processedBaseUpdated} Base${processedBaseUpdated > 1 ? 's' : ''} atualizada${processedBaseUpdated > 1 ? 's' : ''}`);
            }
            
            toast({
              title: (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <FileIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="font-semibold">Importação Operacional Concluída</span>
                </div>
              ) as unknown as string,
              description: detalhes.length > 0 ? (
                <div className="space-y-2 mt-2">
                  {processedServiceOrders > 0 && (
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-sm text-blue-800">Novas ordens de serviço</span>
                      <span className="font-bold text-blue-700 text-base">{processedServiceOrders.toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                  {processedBaseData > 0 && (
                    <div className="flex items-center justify-between p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                      <span className="text-sm text-indigo-800">Novas bases</span>
                      <span className="font-bold text-indigo-700 text-base">{processedBaseData.toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                  {processedBaseUpdated > 0 && (
                    <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="text-sm text-amber-800">Bases atualizadas</span>
                      <span className="font-bold text-amber-700 text-base">{processedBaseUpdated.toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Total processado</span>
                      <span className="font-bold text-gray-900 text-lg">{totalProcessados.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">Nenhum novo registro foi adicionado (todos já existiam).</p>
                </div>
              ),
              className: "border-2 border-purple-200 bg-white"
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
              
              const hasNewRecords = result.newRecords > 0;
              const hasDateUpdates = (result.dateOnlyUpdates || 0) > 0;
              const hasStatusChanges = (result.statusChanges || 0) > 0;
              const hasStepChanges = (result.stepChanges || 0) > 0;
              const hasAnyUpdates = hasNewRecords || hasDateUpdates || hasStatusChanges || hasStepChanges;

              toast({
                title: (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-semibold">Importação de Pagamentos Concluída</span>
                  </div>
                ) as unknown as string,
                description: hasAnyUpdates ? (
                  <div className="space-y-2 mt-2">
                    {hasNewRecords && (
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm text-green-800 flex items-center gap-1.5">
                          <span>✅</span>
                          <span>Novas informações adicionadas</span>
                        </span>
                        <span className="font-bold text-green-700 text-base">{result.newRecords.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    {hasDateUpdates && (
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-sm text-blue-800 flex items-center gap-1.5">
                          <span>📅</span>
                          <span>Atualizações de data apenas</span>
                        </span>
                        <span className="font-bold text-blue-700 text-base">{result.dateOnlyUpdates?.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    {hasStatusChanges && (
                      <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-200">
                        <span className="text-sm text-orange-800 flex items-center gap-1.5">
                          <span>🔄</span>
                          <span>Alterações de status</span>
                        </span>
                        <span className="font-bold text-orange-700 text-base">{result.statusChanges?.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    {hasStepChanges && (
                      <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-200">
                        <span className="text-sm text-purple-800 flex items-center gap-1.5">
                          <span>🔢</span>
                          <span>Alterações de passo</span>
                        </span>
                        <span className="font-bold text-purple-700 text-base">{result.stepChanges?.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-200 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">Total processado</span>
                        <span className="font-bold text-gray-900 text-lg">{result.totalProcessed.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">Nenhum registro novo ou atualizado foi encontrado.</p>
                  </div>
                ),
                className: "border-2 border-blue-200 bg-white"
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

  // Função para processar materiais de uma linha
  const processarMateriais = (row: Record<string, unknown>) => {
    const materiais: { nome: string; quantidade: number }[] = [];
    
    TODOS_MATERIAIS.forEach(material => {
      const quantidade = row[material];
      if (quantidade !== undefined && quantidade !== null && quantidade !== '') {
        const qtd = parseInt(String(quantidade)) || 0;
        if (qtd > 0) {
          materiais.push({
            nome: material,
            quantidade: qtd
          });
        }
      }
    });
    
    return materiais.length > 0 ? materiais : undefined;
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
        codigo_item: String(row["Código Item"] || ""), // Código do item específico
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
        telefone_celular: row["Tel. Cel"] as string | null || null,
        
        // Processar materiais
        materiais: processarMateriais(row)
      };
      
      return order;
    });
    
    // Consolidar materiais de OSs duplicadas
    const consolidatedOrders = consolidateMaterials(processedOrders);
    
    return consolidatedOrders;
  };
  
  // Nova função para processar dados de vendas
  // MODIFICAÇÃO: Corrigido para permitir importação de vendas com valores R$ 0,00 
  // nos campos "Valor" e "Subtotal Adesão", seguindo a lógica do agrupamento do produto
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
    
    console.log("╔════════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                    INICIANDO IMPORTAÇÃO DE VENDAS PERMANÊNCIA                  ║");
    console.log("╚════════════════════════════════════════════════════════════════════════════════╝");
    console.log(`Total de linhas para processar: ${processedRows.length}`);
    
    // Formatar os dados para o formato de Venda
    const vendas = processedRows.map((row, index) => {
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
      
      // MODIFICAÇÃO: Adicionar suporte ao campo "Subtotal Adesão" mencionado no problema
      const subtotalAdesaoColumn = findColumn("Subtotal Adesão") || findColumn("Subtotal Adesao");
      
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
          // MODIFICAÇÃO: Considerar também o campo "Subtotal Adesão" se o valor principal for zero
          valor: valor && row[valor] ? parseValue(String(row[valor])) : 
                 (subtotalAdesaoColumn && row[subtotalAdesaoColumn] ? parseValue(String(row[subtotalAdesaoColumn])) : 0),
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
        // MODIFICAÇÃO: Considerar também o campo "Subtotal Adesão" se o valor principal for zero
        valor: isNP ? npDefaults!.valor : (() => {
          const valorPrincipal = parseValue(String(row[valor] || ''));
          if (valorPrincipal === 0 && subtotalAdesaoColumn && row[subtotalAdesaoColumn]) {
            return parseValue(String(row[subtotalAdesaoColumn]));
          }
          return valorPrincipal;
        })(),
        status_proposta: isNP ? npDefaults!.status_proposta : String(row[statusProposta]),
        data_habilitacao: isNP ? npDefaults!.data_habilitacao : formatDate(String(row[dataHabilitacao])),
        // Campos para produtos diferenciais
        produtos_secundarios: produtosSecundariosColumn ? String(row[produtosSecundariosColumn] || "") : undefined,
        forma_pagamento: formaPagamentoColumn ? String(row[formaPagamentoColumn] || "") : undefined
      };
      
      // Log de cada venda processada
      console.log(`[PERMANÊNCIA] Linha ${index + 2}: Proposta ${venda.numero_proposta} | Produto: ${venda.produto_principal} | Valor: R$ ${venda.valor.toFixed(2)} | Data: ${venda.data_habilitacao.split('T')[0]}`);
      
      return venda;
    });
    
    // Calcular totais
    const totalPacotes = vendas.length;
    const valorTotal = vendas.reduce((sum, venda) => sum + venda.valor, 0);
    
    console.log("╔════════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                      RESUMO DA IMPORTAÇÃO - VENDAS PERMANÊNCIA                 ║");
    console.log("╠════════════════════════════════════════════════════════════════════════════════╣");
    console.log(`║ Total de Pacotes: ${totalPacotes.toString().padEnd(60)} ║`);
    console.log(`║ Valor Total: R$ ${valorTotal.toFixed(2).padEnd(58)} ║`);
    console.log("╚════════════════════════════════════════════════════════════════════════════════╝");
    
    return vendas;
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
  // MODIFICAÇÃO: Corrigido para permitir importação de vendas com valores R$ 0,00 
  // nos campos "Valor" e "Subtotal Adesão", seguindo a lógica do agrupamento do produto
  const processVendasMeta = (data: Record<string, unknown>[]): VendaMeta[] => {
    if (data.length === 0) {
      throw new Error("Nenhum dado de vendas de meta encontrado para processamento");
    }
    
    console.log("╔════════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                        INICIANDO IMPORTAÇÃO DE VENDAS META                     ║");
    console.log("╚════════════════════════════════════════════════════════════════════════════════╝");
    console.log(`Total de linhas para processar: ${data.length}`);
    
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
        // MODIFICAÇÃO: Adicionar suporte ao campo "Subtotal Adesão" mencionado no problema
        const subtotalAdesaoRaw = row["Subtotal Adesão"] || row["Subtotal Adesao"];
        
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
          // MODIFICAÇÃO: Permitir valores R$ 0,00 nos campos "Valor" e "Subtotal Adesão"
          // Validar se os campos existem mas não se são zero
          if (!numeroPropostaRaw || (valorRaw === undefined && subtotalAdesaoRaw === undefined) || 
              !dataHabilitacaoRaw || !idVendedorRaw) {
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
            // MODIFICAÇÃO: Considerar também o campo "Subtotal Adesão" se o valor principal for zero
            valor: valorRaw ? (typeof valorRaw === 'number' ? valorRaw : parseFloat(String(valorRaw).replace(/[R$\s.,]/g, '').replace(',', '.')) || 0) : 
                   (subtotalAdesaoRaw ? (typeof subtotalAdesaoRaw === 'number' ? subtotalAdesaoRaw : parseFloat(String(subtotalAdesaoRaw).replace(/[R$\s.,]/g, '').replace(',', '.')) || 0) : 0),
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
          // MODIFICAÇÃO: Considerar também o campo "Subtotal Adesão" se o valor principal for zero
          if (typeof valorRaw === 'number') {
            valor = valorRaw;
          } else if (typeof valorRaw === 'string') {
            valor = parseFloat(valorRaw.replace(/[R$\s.,]/g, '').replace(',', '.')) || 0;
          }
          
          // Se o valor principal for zero, tentar usar o subtotal adesão
          if (valor === 0 && subtotalAdesaoRaw) {
            if (typeof subtotalAdesaoRaw === 'number') {
              valor = subtotalAdesaoRaw;
            } else if (typeof subtotalAdesaoRaw === 'string') {
              valor = parseFloat(subtotalAdesaoRaw.replace(/[R$\s.,]/g, '').replace(',', '.')) || 0;
            }
          }
          
          // Processar data normalmente
          if (dataHabilitacaoRaw instanceof Date) {
            dataHabilitacao = dataHabilitacaoRaw.toISOString().split('T')[0];
          } else if (typeof dataHabilitacaoRaw === 'string') {
            dataHabilitacao = dataHabilitacaoRaw;
          }
          
          // Extrair mês e ano da data de habilitação - MÉTODO CORRIGIDO
          // Não usar new Date(string) para evitar problemas de timezone
          const [anoStr, mesStr, diaStr] = dataHabilitacao.split('-');
          ano = parseInt(anoStr);
          mes = parseInt(mesStr); // Já vem correto (1-12)
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
        
        // Log de cada venda meta processada
        console.log(`[META] Linha ${index + 2}: Proposta ${vendaMeta.numero_proposta} | Produto: ${vendaMeta.produto} | Valor: R$ ${vendaMeta.valor.toFixed(2)} | Data: ${dataHabilitacao} | Mês/Ano: ${mes}/${ano}`);
        
        processedVendasMeta.push(vendaMeta);
        
      } catch (error) {
        console.error(`Erro ao processar linha ${index + 2}:`, error);
      }
    });
    
    // Calcular totais
    const totalPacotesMeta = processedVendasMeta.length;
    const valorTotalMeta = processedVendasMeta.reduce((sum, venda) => sum + venda.valor, 0);
    
    console.log("╔════════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                         RESUMO DA IMPORTAÇÃO - VENDAS META                     ║");
    console.log("╠════════════════════════════════════════════════════════════════════════════════╣");
    console.log(`║ Total de Pacotes: ${totalPacotesMeta.toString().padEnd(60)} ║`);
    console.log(`║ Valor Total: R$ ${valorTotalMeta.toFixed(2).padEnd(58)} ║`);
    console.log("╚════════════════════════════════════════════════════════════════════════════════╝");
    console.log(`Processadas ${processedVendasMeta.length} vendas de meta de ${data.length} linhas`);
    
    return processedVendasMeta;
  };

  // Função para processar dados BASE
  const processBaseData = (data: Record<string, unknown>[]): Array<{mes: string; ano: number; base_tv: number; base_fibra: number; alianca: number}> => {
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
        ano: parseInt(String(row["ANO"] || row["Ano"] || new Date().getFullYear()), 10),
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

  const importOptionBaseClasses =
    "group relative flex transform-gpu flex-col gap-3 rounded-2xl border border-blue-200 bg-white/60 px-5 py-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_28px_55px_-38px_rgba(37,99,235,0.55)]";
  const importOptionSelectedClasses =
    "border-transparent bg-gradient-to-br from-blue-200/80 via-white to-blue-100/70 shadow-[0_32px_60px_-36px_rgba(37,99,235,0.7)] ring-2 ring-blue-300/70";

  return (
    <div className="space-y-6">
      {/* Card Principal de Importação */}
      <Card className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-blue-50/30 via-white to-slate-50/50 shadow-[0_32px_70px_-40px_rgba(37,99,235,0.55)] backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 pb-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-blue-100 via-white to-blue-50 p-3 shadow-inner">
              <FileUp className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-3xl font-semibold text-slate-800">Importar Dados</CardTitle>
              <CardDescription className="mt-2 text-sm text-slate-500">Selecione o tipo de importação e faça upload do arquivo</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-0">
            {/* Etapa 1 - Seleção de Tipo de Importação */}
            <section className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 via-white to-blue-200 text-lg font-semibold text-blue-600 shadow-inner">
                  1
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-500">Etapa 1</span>
                  <h3 className="text-xl font-semibold text-slate-800">Escolha o tipo de importação</h3>
                  <p className="text-sm text-slate-500">Selecione o cenário que deseja atualizar antes de enviar o arquivo.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <button
                    type="button"
                    onClick={() => setImportType('pagamentos')}
                  className={`${importOptionBaseClasses} ${
                    importType === 'pagamentos' ? importOptionSelectedClasses : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 via-white to-blue-50 text-blue-600 shadow-inner transition-transform duration-200 group-hover:scale-105">
                        <CreditCard className="h-6 w-6" />
                    </div>
                      <div className="space-y-1">
                        <div className={`text-base font-semibold ${importType === 'pagamentos' ? 'text-blue-700' : 'text-slate-700'}`}>
                        Primeiro Pagamento
                      </div>
                        <div className="text-sm text-slate-500">Arquivo Icare</div>
                      </div>
                    </div>
                    {importType === 'pagamentos' && (
                      <CheckCircle className="h-5 w-5 text-blue-500 transition-all duration-200 group-hover:scale-110" />
                    )}
                  </div>
                </button>

                <button
                    type="button"
                    onClick={() => setImportType('metas')}
                  className={`${importOptionBaseClasses} ${
                    importType === 'metas' ? importOptionSelectedClasses : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 via-white to-blue-50 text-blue-600 shadow-inner transition-transform duration-200 group-hover:scale-105">
                        <Target className="h-6 w-6" />
                    </div>
                      <div className="space-y-1">
                        <div className={`text-base font-semibold ${importType === 'metas' ? 'text-blue-700' : 'text-slate-700'}`}>
                        Comercial
                      </div>
                        <div className="text-sm text-slate-500">Vendas e Metas</div>
                      </div>
                    </div>
                    {importType === 'metas' && (
                      <CheckCircle className="h-5 w-5 text-blue-500 transition-all duration-200 group-hover:scale-110" />
                    )}
                  </div>
                </button>

                <button
                    type="button"
                    onClick={() => setImportType('servicos-base')}
                  className={`${importOptionBaseClasses} ${
                    importType === 'servicos-base' ? importOptionSelectedClasses : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 via-white to-blue-50 text-blue-600 shadow-inner transition-transform duration-200 group-hover:scale-105">
                        <FileIcon className="h-6 w-6" />
                    </div>
                      <div className="space-y-1">
                        <div className={`text-base font-semibold ${importType === 'servicos-base' ? 'text-blue-700' : 'text-slate-700'}`}>
                        Operacional
                      </div>
                        <div className="text-sm text-slate-500">Serviços e Base</div>
                      </div>
                    </div>
                    {importType === 'servicos-base' && (
                      <CheckCircle className="h-5 w-5 text-blue-500 transition-all duration-200 group-hover:scale-110" />
                    )}
                  </div>
                </button>
                </div>
            </section>
              
            {/* Divisória entre Etapa 1 e 2 */}
            <div className="border-t border-gray-200 pt-8">
              {/* Etapa 2 - Upload de Arquivo */}
              <section className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 via-white to-blue-200 text-lg font-semibold text-blue-600 shadow-inner">
                  2
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-500">Etapa 2</span>
                  <h3 className="text-xl font-semibold text-slate-800">Faça o upload do arquivo</h3>
                  <p className="text-sm text-slate-500">Envie planilhas nos formatos .xlsx, .xls ou .csv com as colunas necessárias.</p>
                </div>
              </div>
              <div className="relative">
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={processing}
                  className="hidden"
                />
                <label
                  htmlFor="file"
                  className={`group relative flex w-full transform-gpu flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-8 text-center shadow-sm transition-all duration-200 before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:bg-gradient-to-br before:from-white/70 before:to-transparent before:opacity-0 before:transition-all before:duration-200 ${
                    file
                      ? 'border-blue-400 bg-gradient-to-br from-blue-100/70 via-white to-blue-50/80 shadow-[0_20px_50px_-30px_rgba(37,99,235,0.5)]'
                      : processing
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100/80 text-slate-400 opacity-80'
                      : 'border-blue-200 bg-white/60 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-[0_20px_50px_-30px_rgba(37,99,235,0.5)] group-hover:before:opacity-100'
                  }`}
                >
                  {file ? (
                    <>
                      <CheckCircle className="mb-2 h-8 w-8 text-blue-500" />
                      <p className="text-sm font-semibold text-blue-700">{file.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{Math.round(file.size / 1024)} KB</p>
                    </>
                  ) : (
                    <>
                      <Upload className="mb-2 h-8 w-8 text-blue-400 transition-transform duration-200 group-hover:scale-105" />
                      <p className="text-sm font-semibold text-blue-700">
                        Arraste ou <span className="text-blue-500 underline decoration-dotted underline-offset-2">clique para enviar</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Suporta arquivos .xlsx, .xls e .csv</p>
                    </>
              )}
                </label>
              </div>
              </section>
            </div>
            
            {/* Divisória entre Etapa 2 e 3 */}
            <div className="border-t border-gray-200 pt-8">
              {/* Etapa 3 - Importação */}
              <section className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 via-white to-blue-200 text-lg font-semibold text-blue-600 shadow-inner">
                  3
            </div>
                      <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-500">Etapa 3</p>
                  <h3 className="text-xl font-semibold text-slate-800">Importe e acompanhe o progresso</h3>
                  <p className="text-sm text-slate-500">Inicie o processo e acompanhe o andamento na barra de progresso.</p>
                        </div>
                      </div>
              
            {error && (
                <div className="rounded-2xl border border-red-200/70 bg-red-50/80 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <X className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            )}
              
              {processing && (
                <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-900">Processando arquivo...</span>
                    <span className="text-sm font-bold text-blue-600">{progress}%</span>
                </div>
                    <Progress
                      value={progress}
                      className="h-2 bg-blue-100/80"
                      indicatorClassName="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-500"
                    />
            </div>
              </div>
            )}
            
              <div className="flex flex-col items-center gap-4">
              <Button
                onClick={handleUpload}
                disabled={!file || processing}
                  className="group relative inline-flex h-12 w-full transform-gpu items-center justify-center rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-500 px-8 text-base font-semibold text-white shadow-lg shadow-blue-500/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-blue-500/50 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
              size="lg"
              >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                Importar Dados
                </>
              )}
              </Button>
          </div>
            </section>
            </div>
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
  
  // Hook para notificações
  const { toast } = useToast();
  
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
  
  // Estado para filtro de oportunidades OURO/BRONZE
  const [filtroOportunidade, setFiltroOportunidade] = useState<'ouro' | 'bronze' | null>(null);
  
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

  // Função para marcar cliente como pago
  const marcarComoPago = useCallback(async (numeroProposta: string, pagamentoAtual: PrimeiroPagamento) => {
    try {
      // Criar novo registro com status "N" (pago)
      const novoPagamento: PrimeiroPagamento = {
        ...pagamentoAtual,
        proposta: numeroProposta,
        status_pacote: 'N',
        passo: '0', // Resetar passo para 0 (adimplente)
        data_passo_cobranca: '', // Limpar data de cobrança
        data_importacao: new Date().toISOString() // Data atual da alteração
      };

      // Salvar no localStorage usando a função existente do sistema
      data.importPrimeirosPagamentos([novoPagamento], true);
      
      // Feedback visual
      toast({
        title: "Pagamento registrado!",
        description: `Proposta ${numeroProposta} marcada como paga.`,
      });
      
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast({
        title: "Erro ao registrar pagamento",
        description: "Tente novamente.",
        variant: "destructive"
      });
    }
  }, [data, toast]);

  // Função para calcular data limite (data_habilitacao + 120 dias)
  const calcularDataLimite = useCallback((dataHabilitacao: string): string => {
    const data = new Date(dataHabilitacao);
    data.setDate(data.getDate() + 120);
    return data.toISOString();
  }, []);

  // Função para calcular dias restantes até o limite
  const calcularDiasRestantes = useCallback((dataHabilitacao: string): number => {
    const dataLimite = new Date(dataHabilitacao);
    dataLimite.setDate(dataLimite.getDate() + 120);
    const hoje = new Date();
    const diffTime = dataLimite.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  // Função para formatar data para exibição
  const formatarDataParaExibicao = useCallback((dataString: string): string => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  }, []);

  // Função para renderizar a coluna DATA LIMITE
  const renderDataLimite = useCallback((dataHabilitacao: string) => {
    const dataLimite = calcularDataLimite(dataHabilitacao);
    const diasRestantes = calcularDiasRestantes(dataHabilitacao);
    
    let corBolinha = 'bg-gray-400';
    let corTexto = 'text-gray-500';
    let status = 'Vencido';
    
    if (diasRestantes > 30) {
      corBolinha = 'bg-green-500';
      corTexto = 'text-green-700';
      status = 'Longe';
    } else if (diasRestantes > 7) {
      corBolinha = 'bg-yellow-500';
      corTexto = 'text-yellow-700';
      status = 'Próximo';
    } else if (diasRestantes > 0) {
      corBolinha = 'bg-red-500';
      corTexto = 'text-red-700';
      status = 'Crítico';
    }
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${corBolinha}`} />
        <div className="flex flex-col">
          <span className={`text-xs ${corTexto}`}>
            {formatarDataParaExibicao(dataLimite)}
          </span>
          <span className="text-xs text-gray-500">
            ({diasRestantes > 0 ? `${diasRestantes} dias` : 'Vencido'})
          </span>
        </div>
      </div>
    );
  }, [calcularDataLimite, calcularDiasRestantes, formatarDataParaExibicao]);
  
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
      
      // Verificar filtro de oportunidades OURO/BRONZE
      if (filtroOportunidade && venda.data_habilitacao) {
        const diasCorridos = calcularDiasCorridos(venda.data_habilitacao);
        
        // Critérios das oportunidades: POS + Status "S" + 91-120 dias + Passo específico
        const ehPOS = sigla === 'POS';
        const statusS = pagamento?.status_pacote === 'S';
        const dentroFaixa91_120 = diasCorridos >= 91 && diasCorridos <= 120;
        
        // Se não atende os critérios básicos, não é oportunidade
        if (!ehPOS || !statusS || !dentroFaixa91_120 || !pagamento) return false;
        
        // Verificar o tipo de oportunidade
        if (filtroOportunidade === 'ouro') {
          // OURO: Passos 2 e 3
          if (!['2', '3'].includes(pagamento.passo)) return false;
        } else if (filtroOportunidade === 'bronze') {
          // BRONZE: Passo 4
          if (pagamento.passo !== '4') return false;
        }
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
    filtroOportunidade,
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

  // Função para exportar oportunidades para CSV
  const exportarOportunidadesCSV = useCallback(() => {
    if (!filtroOportunidade) return;
    
    // Filtrar apenas as propostas que são oportunidades do tipo selecionado
    const oportunidadesFiltradas = propostasFiltradas.filter(venda => {
      if (!venda.data_habilitacao) return false;
      
      const pagamento = pagamentosPorProposta.get(venda.numero_proposta);
      const sigla = getSigla(venda);
      const diasCorridos = calcularDiasCorridos(venda.data_habilitacao);
      
      // Critérios das oportunidades
      const ehPOS = sigla === 'POS';
      const statusS = pagamento?.status_pacote === 'S';
      const dentroFaixa91_120 = diasCorridos >= 91 && diasCorridos <= 120;
      
      if (!ehPOS || !statusS || !dentroFaixa91_120 || !pagamento) return false;
      
      // Verificar o tipo específico
      if (filtroOportunidade === 'ouro') {
        return ['2', '3'].includes(pagamento.passo);
      } else if (filtroOportunidade === 'bronze') {
        return pagamento.passo === '4';
      }
      
      return false;
    });
    
    if (oportunidadesFiltradas.length === 0) {
      alert('Nenhuma oportunidade encontrada para exportar.');
      return;
    }
    
    // Cabeçalhos do Excel
    const headers = [
      'Proposta',
      'CPF',
      'Nome Fantasia', 
      'Telefone',
      'Cidade',
      'Bairro',
      'Sigla',
      'Produto',
      'Vendedor',
      'Data Habilitação',
      'Dias Corridos',
      'Data Limite',
      'Dias Restantes',
      'Status Limite',
      'Status Pagamento',
      'Passo',
      'Vencimento Fatura',
      'Data Importação',
      'Tipo Oportunidade'
    ];
    
    // Converter dados para Excel
    const excelData = oportunidadesFiltradas.map(proposta => {
      const pagamento = pagamentosPorProposta.get(proposta.numero_proposta);
      const sigla = getSigla(proposta);
      const diasCorridos = proposta.data_habilitacao ? calcularDiasCorridos(proposta.data_habilitacao) : 0;
      const dataLimite = proposta.data_habilitacao ? calcularDataLimite(proposta.data_habilitacao) : '';
      const diasRestantes = proposta.data_habilitacao ? calcularDiasRestantes(proposta.data_habilitacao) : 0;
      
      // Determinar status da data limite
      let statusLimite = 'Vencido';
      if (diasRestantes > 30) statusLimite = 'Longe';
      else if (diasRestantes > 7) statusLimite = 'Próximo';
      else if (diasRestantes > 0) statusLimite = 'Crítico';
      
      // Determinar tipo de oportunidade
      let tipoOportunidade = '';
      if (pagamento && ['2', '3'].includes(pagamento.passo)) {
        tipoOportunidade = 'OURO';
      } else if (pagamento && pagamento.passo === '4') {
        tipoOportunidade = 'BRONZE';
      }
      
      return [
        proposta.numero_proposta || '',
        proposta.cpf || '',
        proposta.nome_fantasia || '',
        proposta.telefone_celular || '',
        proposta.cidade || '',
        proposta.bairro || '',
        sigla,
        proposta.produto_principal || '',
        proposta.nome_proprietario || '',
        proposta.data_habilitacao ? formatarDataParaExibicao(proposta.data_habilitacao) : '',
        diasCorridos.toString(),
        dataLimite ? formatarDataParaExibicao(dataLimite) : '',
        diasRestantes.toString(),
        statusLimite,
        pagamento?.status_pacote || '',
        pagamento?.passo || '',
        pagamento?.vencimento_fatura ? formatarDataParaExibicao(pagamento.vencimento_fatura) : '',
        pagamento?.data_importacao ? formatarDataParaExibicao(pagamento.data_importacao) : '',
        tipoOportunidade
      ];
    });
    
    // Criar workbook Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...excelData]);
    
    // Configurar larguras das colunas
    const columnWidths = [
      { wch: 12 }, // Proposta
      { wch: 15 }, // CPF
      { wch: 25 }, // Nome Fantasia
      { wch: 15 }, // Telefone
      { wch: 20 }, // Cidade
      { wch: 20 }, // Bairro
      { wch: 8 },  // Sigla
      { wch: 20 }, // Produto
      { wch: 20 }, // Vendedor
      { wch: 15 }, // Data Habilitação
      { wch: 12 }, // Dias Corridos
      { wch: 15 }, // Data Limite
      { wch: 12 }, // Dias Restantes
      { wch: 10 }, // Status Limite
      { wch: 10 }, // Status Pagamento
      { wch: 8 },  // Passo
      { wch: 15 }, // Vencimento Fatura
      { wch: 15 }, // Data Importação
      { wch: 15 }  // Tipo Oportunidade
    ];
    worksheet['!cols'] = columnWidths;
    
    // Adicionar planilha ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Oportunidades');
    
    // Baixar arquivo Excel
    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `oportunidades_${filtroOportunidade}_${dataAtual}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);
    
    // Feedback visual
    toast({
      title: "Exportação concluída!",
      description: `Arquivo ${nomeArquivo} baixado com sucesso.`,
    });
  }, [filtroOportunidade, propostasFiltradas, pagamentosPorProposta, getSigla, calcularDiasCorridos, calcularDataLimite, calcularDiasRestantes, formatarDataParaExibicao, toast]);


  // Função para calcular contadores de oportunidades em tempo real
  const contadoresOportunidades = useMemo(() => {
    // Filtrar apenas propostas POS que atendem aos critérios básicos das oportunidades
    const oportunidadesDisponiveis = vendas.filter(venda => {
      if (!venda.data_habilitacao) return false;
      
      const agrupamento = venda.agrupamento_produto || '';
      const produto = venda.produto_principal || '';
      const ehPOS = agrupamento.includes('POS') || produto.includes('POS');
      
      if (!ehPOS) return false;
      
      const pagamento = pagamentosPorProposta.get(venda.numero_proposta);
      if (!pagamento) return false;
      
      const diasCorridos = calcularDiasCorridos(venda.data_habilitacao);
      const statusS = pagamento.status_pacote === 'S';
      const dentroFaixa91_120 = diasCorridos >= 91 && diasCorridos <= 120;
      const passoValido = ['2', '3', '4'].includes(pagamento.passo);
      
      return statusS && dentroFaixa91_120 && passoValido;
    });
    
    // Contar por tipo de oportunidade
    let ouro = 0;
    let bronze = 0;
    
    oportunidadesDisponiveis.forEach(venda => {
      const pagamento = pagamentosPorProposta.get(venda.numero_proposta);
      if (pagamento) {
        if (['2', '3'].includes(pagamento.passo)) {
          ouro++;
        } else if (pagamento.passo === '4') {
          bronze++;
        }
      }
    });
    
    return { ouro, bronze, total: ouro + bronze };
  }, [vendas, pagamentosPorProposta, calcularDiasCorridos]);

  // Contador específico para propostas filtradas na tabela
  const contadorPropostasFiltradas = useMemo(() => {
    if (!filtroOportunidade) return 0;
    
    return propostasFiltradas.filter(venda => {
      if (!venda.data_habilitacao) return false;
      
      const pagamento = pagamentosPorProposta.get(venda.numero_proposta);
      const sigla = getSigla(venda);
      const diasCorridos = calcularDiasCorridos(venda.data_habilitacao);
      
      // Critérios das oportunidades
      const ehPOS = sigla === 'POS';
      const statusS = pagamento?.status_pacote === 'S';
      const dentroFaixa91_120 = diasCorridos >= 91 && diasCorridos <= 120;
      
      if (!ehPOS || !statusS || !dentroFaixa91_120 || !pagamento) return false;
      
      // Verificar o tipo específico
      if (filtroOportunidade === 'ouro') {
        return ['2', '3'].includes(pagamento.passo);
      } else if (filtroOportunidade === 'bronze') {
        return pagamento.passo === '4';
      }
      
      return false;
    }).length;
  }, [filtroOportunidade, propostasFiltradas, pagamentosPorProposta, getSigla, calcularDiasCorridos]);

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
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b-2 pb-4">
            <CardTitle className="text-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Filter className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="text-gray-800 font-semibold">Filtros de Permanência</span>
              </div>
            </CardTitle>
            <CardDescription className="text-sm mt-2 text-gray-600">
              Filtre por período de permanência (vendas + 4 meses)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="filtro-mes-permanencia" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-emerald-600" />
                    Mês de Permanência
                  </Label>
                <MultiSelect 
                  options={mesOptions} 
                  selected={filtroMesPermanencia}
                  onChange={(values) => setFiltroMesPermanencia(values)}
                  placeholder="Selecione meses"
                    className="w-full text-sm min-w-[200px]"
                />
              </div>
              
                <div className="space-y-2">
                  <Label htmlFor="filtro-ano-permanencia" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-emerald-600" />
                    Ano de Permanência
                  </Label>
                <MultiSelect 
                  options={anoOptions} 
                  selected={filtroAnoPermanencia}
                  onChange={(values) => setFiltroAnoPermanencia(values)}
                  placeholder="Selecione anos"
                    className="w-full text-sm min-w-[150px]"
                />
              </div>

                <div className="flex items-end">
                <Button
                  variant="outline"
                    size="lg"
                  onClick={() => {
                    setFiltroMesPermanencia([]);
                    setFiltroAnoPermanencia([]);
                  }}
                  disabled={filtroMesPermanencia.length === 0 && filtroAnoPermanencia.length === 0}
                    className="w-full h-11 border-2 hover:bg-gray-50 font-semibold"
                >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
            
              {/* Badges de seleção ativa */}
              {(filtroMesPermanencia.length > 0 || filtroAnoPermanencia.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                  {filtroMesPermanencia.map((mes) => (
                    <Badge key={mes} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 px-3 py-1.5 text-sm font-semibold">
                      <CalendarIcon className="h-3 w-3 mr-1.5" />
                      Mês: {mes}
                    </Badge>
                  ))}
                  {filtroAnoPermanencia.map((ano) => (
                    <Badge key={ano} variant="outline" className="bg-teal-50 text-teal-700 border-teal-300 px-3 py-1.5 text-sm font-semibold">
                      <CalendarIcon className="h-3 w-3 mr-1.5" />
                      Ano: {ano}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Informações sobre a lógica */}
            {(filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) && (
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-900 font-semibold mb-1">Como funciona?</p>
                      <p className="text-xs text-blue-800 leading-relaxed">
                  <strong>Lógica dos filtros:</strong> Vendas de <em>Fevereiro</em> refletem permanência em <em>Junho</em> (data de habilitação + 4 meses)
                  <br />
                  <strong>Múltiplas seleções:</strong> Você pode selecionar vários meses e anos para comparar diferentes períodos
                </p>
                    </div>
                  </div>
              </div>
            )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verificar se AMBOS os filtros de permanência estão selecionados */}
      {(filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) ? (
        <div className="mb-6">
          {/* Grid com Permanência POS e Vendas por Cidade lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quadro de Permanência POS */}
            <Card className="shadow-lg border-2">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 pb-4">
                <CardTitle className="text-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <MapPin className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-gray-800 font-semibold">Permanência POS</span>
                </div>
              </CardTitle>
                <CardDescription className="text-sm mt-2 text-gray-600">
                Informações de permanência para serviços POS
              </CardDescription>
            </CardHeader>
              <CardContent className="pt-6">
              <PermanenciaPorTipoServico sigla="POS" datasHabilitacaoFiltradas={filtroDataHabilitacao} vendasFiltradas={vendasFiltradas} />
            </CardContent>
          </Card>
          
            {/* Quadro de Vendas por Cidade */}
            <VendasInstaladasPorCidade 
              vendasFiltradas={propostasFiltradas} 
              titulo="Vendas Instaladas por Cidade - Mês da Permanência" 
            />
                </div>
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
      
      {/* Tabela de detalhamento - só exibir se ambos os filtros estiverem aplicados */}
      {(filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) && (
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b-2 pb-4">
            <CardTitle className="text-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <List className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-gray-800 font-semibold">Detalhamento de Propostas</span>
              </div>
            </CardTitle>
            <CardDescription className="text-sm mt-2 text-gray-600">
              Lista de propostas com detalhes de permanência e status de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
          {/* Filtros Rápidos de Oportunidades */}
          <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <TrendingUp className="mr-2 h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Filtros Rápidos de Oportunidades</span>
              </div>
              <span className="text-xs text-gray-500">POS • Status "S" • 91-120 dias</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filtroOportunidade === 'ouro' ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setFiltroOportunidade(filtroOportunidade === 'ouro' ? null : 'ouro');
                  setPaginaAtual(1);
                }}
                className={`${
                  filtroOportunidade === 'ouro' 
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600' 
                    : 'border-yellow-400 text-yellow-700 hover:bg-yellow-50'
                }`}
              >
                <Trophy className="mr-1 h-3 w-3" />
                OURO
              </Button>
              
              <Button
                variant={filtroOportunidade === 'bronze' ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setFiltroOportunidade(filtroOportunidade === 'bronze' ? null : 'bronze');
                  setPaginaAtual(1);
                }}
                className={`${
                  filtroOportunidade === 'bronze' 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600' 
                    : 'border-orange-400 text-orange-700 hover:bg-orange-50'
                }`}
              >
                <Medal className="mr-1 h-3 w-3" />
                BRONZE
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFiltroOportunidade(null);
                  setPaginaAtual(1);
                }}
                disabled={!filtroOportunidade}
                className="border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                <List className="mr-1 h-3 w-3" />
                TODOS
              </Button>
              
              {filtroOportunidade && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFiltroOportunidade(null);
                      setTermoBusca("");
                      setFiltroSigla([]);
                      setFiltroVendedor("_all");
                      setFiltroPasso([]);
                      setFiltroStatus([]);
                      setFiltroDiasCorridos([]);
                      setFiltroCidade([]);
                      setFiltroBairro([]);
                      setPaginaAtual(1);
                    }}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <X className="mr-1 h-3 w-3" />
                    LIMPAR TUDO
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportarOportunidadesCSV}
                    className="text-blue-600 border-blue-400 hover:bg-blue-50"
                    title={`Exportar oportunidades ${filtroOportunidade.toUpperCase()} para CSV`}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    EXPORTAR CSV
                  </Button>
                </>
              )}
            </div>
            
            {filtroOportunidade && (
              <div className="mt-2 text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                <span className="font-medium">
                  Mostrando {contadorPropostasFiltradas} oportunidades {filtroOportunidade.toUpperCase()}
                </span>
                {filtroOportunidade === 'ouro' && <span className="ml-2">• Passos 2 e 3</span>}
                {filtroOportunidade === 'bronze' && <span className="ml-2">• Passo 4</span>}
              </div>
            )}
          </div>
          
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
          <div className="flex justify-between items-center mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 font-semibold px-3 py-1">
                Total de registros: <span className="font-bold text-base ml-1">{propostasFiltradas.length}</span>
              </Badge>
            {(filtroSigla.length > 0 || (filtroVendedor && filtroVendedor !== '_all') || 
              filtroPasso.length > 0 || filtroStatus.length > 0 || 
              filtroDataHabilitacao.length > 0 || filtroDiasCorridos.length > 0 ||
              filtroCidade.length > 0 || filtroBairro.length > 0) && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                  Filtros ativos
                </Badge>
          )}
            </div>
          </div>
          
          {/* Legenda dos status */}
          <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Legenda de Status de Pagamento</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-200">
                <div className="w-4 h-4 rounded-full bg-green-600 flex-shrink-0"></div>
                <span className="text-xs font-medium text-green-700">N - Normal (Cliente Ativo)</span>
            </div>
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-md border border-amber-200">
                <div className="w-4 h-4 rounded-full bg-amber-500 flex-shrink-0"></div>
                <span className="text-xs font-medium text-amber-700">S - Suspenso (Inadimplente)</span>
            </div>
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md border border-red-200">
                <div className="w-4 h-4 rounded-full bg-red-600 flex-shrink-0"></div>
                <span className="text-xs font-medium text-red-700">C - Cancelado</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-pink-50 rounded-md border border-pink-200">
                <div className="w-4 h-4 rounded-full bg-pink-500 flex-shrink-0"></div>
                <span className="text-xs font-medium text-pink-700">NC - Não Cobrança</span>
              </div>
            </div>
          </div>
          
          {/* Tabela de propostas */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-gray-100 hover:bg-gray-100">
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Proposta</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">CPF</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Nome Fantasia</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Telefone</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Cidade</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Bairro</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Sigla</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Produto</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Vendedor</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Data Habilitação</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Dias Corridos</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Data Limite</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Passo</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Vencimento da Fatura</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Data da Importação</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Ação</TableHead>
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
                    
                    // Verificar se é oportunidade OURO ou BRONZE
                    const ehPOS = sigla === 'POS';
                    const statusS = pagamento?.status_pacote === 'S';
                    const dentroFaixa91_120 = diasCorridos >= 91 && diasCorridos <= 120;
                    const ehOportunidade = ehPOS && statusS && dentroFaixa91_120 && pagamento;
                    
                    let tipoOportunidade = null;
                    if (ehOportunidade) {
                      if (['2', '3'].includes(pagamento.passo)) {
                        tipoOportunidade = 'ouro';
                      } else if (pagamento.passo === '4') {
                        tipoOportunidade = 'bronze';
                      }
                    }
                    
                    const globalIndex = (paginaAtual - 1) * itensPorPagina + index;
                    return (
                      <TableRow 
                        key={index}
                        className={`transition-colors ${
                          tipoOportunidade === 'ouro' 
                            ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400 hover:from-yellow-100 hover:to-yellow-200' 
                            : tipoOportunidade === 'bronze'
                            ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400 hover:from-orange-100 hover:to-orange-200'
                            : globalIndex % 2 === 0 
                            ? 'bg-white hover:bg-gray-50' 
                            : 'bg-gray-50/50 hover:bg-gray-100'
                        }`}
                      >
                        <TableCell className="text-xs p-3 font-semibold text-gray-900">{proposta.numero_proposta}</TableCell>
                        <TableCell className="text-xs p-3 font-mono text-gray-700">{proposta.cpf || "-"}</TableCell>
                        <TableCell className="text-xs p-3 text-gray-700">{proposta.nome_fantasia || "-"}</TableCell>
                        <TableCell className="text-xs p-3 font-mono text-gray-700">{proposta.telefone_celular || "-"}</TableCell>
                        <TableCell className="text-xs p-3 text-gray-700">{proposta.cidade || "-"}</TableCell>
                        <TableCell className="text-xs p-3 text-gray-700">{proposta.bairro || "-"}</TableCell>
                        <TableCell className="text-xs p-3">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-semibold px-2 py-0.5">
                            {sigla}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs p-3 text-gray-700">{proposta.produto_principal}</TableCell>
                        <TableCell className="text-xs p-3 text-gray-700">{proposta.nome_proprietario}</TableCell>
                        <TableCell className="text-xs p-3 text-gray-600">
                          {proposta.data_habilitacao ? formatarDataParaExibicao(proposta.data_habilitacao) : '-'}
                        </TableCell>
                        <TableCell className="text-xs p-3">
                          {proposta.data_habilitacao ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 font-semibold px-2 py-0.5">
                              {diasCorridos}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs p-3 text-gray-600">
                          {proposta.data_habilitacao ? renderDataLimite(proposta.data_habilitacao) : '-'}
                        </TableCell>
                        <TableCell className="text-xs p-3">
                          {pagamento ? (
                            <Badge 
                              variant={getStatusBadgeVariant(
                                pagamento.status_pacote, 
                                pagamento.vencimento_fatura
                              )}
                              className={`font-semibold px-2 py-1 ${
                                pagamento.status_pacote === 'C' ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : 
                                pagamento.status_pacote === 'S' ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500' : 
                                pagamento.status_pacote === 'N' ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : 
                                pagamento.status_pacote === 'NC' ? 'bg-pink-500 hover:bg-pink-600 text-white border-pink-500' : ''
                              }`}
                            >
                              {pagamento.status_pacote}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs p-3">
                          {pagamento ? (
                            <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 font-semibold px-2 py-0.5">
                              {pagamento.passo === '0' ? '0' : pagamento.passo || '0'}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs p-3 text-gray-600">
                          {pagamento && pagamento.vencimento_fatura ? formatarDataParaExibicao(pagamento.vencimento_fatura) : '-'}
                        </TableCell>
                        <TableCell className="text-xs p-3 text-gray-600">
                          {pagamento && pagamento.data_importacao ? formatarDataParaExibicao(pagamento.data_importacao) : '-'}
                        </TableCell>
                        <TableCell className="text-xs p-3">
                          <div className="flex items-center gap-1">
                            {/* Botão WhatsApp */}
                            {proposta.telefone_celular ? (
                              <a
                                href={gerarLinkWhatsApp(proposta.telefone_celular || "", proposta.nome_fantasia || "", proposta.produto_principal || "")}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 bg-green-500 hover:bg-green-600 border-green-500 hover:border-green-600"
                                  title="Enviar mensagem WhatsApp"
                                >
                                  <MessageCircle className="h-3 w-3 text-white" />
                                </Button>
                              </a>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 opacity-50 cursor-not-allowed"
                                disabled
                                title="Telefone não disponível"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            )}

                            {/* Botão "Marcar como Pago" - só aparece para status "S" */}
                            {pagamento?.status_pacote === 'S' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6 bg-green-600 hover:bg-green-700 border-green-600"
                                    title="Marcar como pago"
                                  >
                                    <CheckCircle2 className="h-3 w-3 text-white" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Pagamento</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja marcar a proposta <strong>{proposta.numero_proposta}</strong> como paga?
                                      <br />
                                      <br />
                                      Esta ação criará um novo registro no sistema com status "N" (pago) e resetará o passo para "0".
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => marcarComoPago(proposta.numero_proposta, pagamento)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Confirmar Pagamento
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            
                            {/* Badge de Oportunidade */}
                            {tipoOportunidade && (
                              <Badge
                                variant="outline"
                                className={`ml-1 text-xs ${
                                  tipoOportunidade === 'ouro'
                                    ? 'bg-yellow-100 text-yellow-800 border-yellow-400'
                                    : 'bg-orange-100 text-orange-800 border-orange-400'
                                }`}
                                title={`Oportunidade ${tipoOportunidade.toUpperCase()}: ${tipoOportunidade === 'ouro' ? 'Passos 2-3' : 'Passo 4'}`}
                              >
                                {tipoOportunidade === 'ouro' ? (
                                  <Trophy className="h-2 w-2 mr-1" />
                                ) : (
                                  <Medal className="h-2 w-2 mr-1" />
                                )}
                                {tipoOportunidade.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={17} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <Search className="h-8 w-8 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">Nenhuma proposta encontrada</p>
                          <p className="text-xs text-gray-500">Tente ajustar os filtros para encontrar resultados</p>
                        </div>
                      </div>
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
      <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 rounded-lg p-1.5 shadow-sm border border-slate-200">
        <TabsList className="grid w-full grid-cols-2 bg-transparent gap-1.5 h-auto p-0">
          <TabsTrigger 
            value="permanencia" 
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-md data-[state=active]:shadow-orange-100 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:text-slate-800 data-[state=inactive]:hover:bg-white/50"
          >
            <AlertTriangle className="h-5 w-5" />
            <span>Permanência</span>
        </TabsTrigger>
          <TabsTrigger 
            value="desempenho" 
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md data-[state=active]:shadow-blue-100 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:text-slate-800 data-[state=inactive]:hover:bg-white/50"
          >
            <Target className="h-5 w-5" />
            <span>Desempenho</span>
        </TabsTrigger>
      </TabsList>
      </div>

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
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b-2 pb-4">
            <CardTitle className="text-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Filter className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="text-gray-800 font-semibold">Filtros de Permanência</span>
              </div>
            </CardTitle>
            <CardDescription className="text-sm mt-2 text-gray-600">
              Filtre por período de permanência (vendas + 4 meses)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="filtro-mes-permanencia-vendedor" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-emerald-600" />
                    Mês de Permanência
                  </Label>
                <MultiSelect 
                  options={mesOptions} 
                  selected={filtroMesPermanencia}
                  onChange={(values) => setFiltroMesPermanencia(values)}
                  placeholder="Selecione meses"
                    className="w-full text-sm min-w-[200px]"
                />
              </div>
              
                <div className="space-y-2">
                  <Label htmlFor="filtro-ano-permanencia-vendedor" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-emerald-600" />
                    Ano de Permanência
                  </Label>
                <MultiSelect 
                  options={anoOptions} 
                  selected={filtroAnoPermanencia}
                  onChange={(values) => setFiltroAnoPermanencia(values)}
                  placeholder="Selecione anos"
                    className="w-full text-sm min-w-[150px]"
                />
              </div>

                <div className="flex items-end">
              <Button
                variant="outline"
                    size="lg"
                onClick={() => {
                  setFiltroMesPermanencia([]);
                  setFiltroAnoPermanencia([]);
                }}
                disabled={filtroMesPermanencia.length === 0 && filtroAnoPermanencia.length === 0}
                    className="w-full h-11 border-2 hover:bg-gray-50 font-semibold"
              >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
                </div>
            </div>

              {/* Badges de seleção ativa */}
              {(filtroMesPermanencia.length > 0 || filtroAnoPermanencia.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                  {filtroMesPermanencia.map((mes) => (
                    <Badge key={mes} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 px-3 py-1.5 text-sm font-semibold">
                      <CalendarIcon className="h-3 w-3 mr-1.5" />
                      Mês: {mes}
                    </Badge>
                  ))}
                  {filtroAnoPermanencia.map((ano) => (
                    <Badge key={ano} variant="outline" className="bg-teal-50 text-teal-700 border-teal-300 px-3 py-1.5 text-sm font-semibold">
                      <CalendarIcon className="h-3 w-3 mr-1.5" />
                      Ano: {ano}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Informações sobre a lógica */}
            {(filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) && (
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-900 font-semibold mb-1">Como funciona?</p>
                      <p className="text-xs text-blue-800 leading-relaxed">
                  <strong>Lógica dos filtros:</strong> Vendas de <em>Fevereiro</em> refletem permanência em <em>Junho</em> (data de habilitação + 4 meses)
                  <br />
                  <strong>Múltiplas seleções:</strong> Você pode selecionar vários meses e anos para comparar diferentes períodos
                </p>
                    </div>
                  </div>
              </div>
            )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verificar se AMBOS os filtros de permanência estão selecionados */}
      {(filtroMesPermanencia.length > 0 && filtroAnoPermanencia.length > 0) ? (
        <>
          {/* Card Permanência Individual - POS e Evolução da Permanência - Layout Lado a Lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Card Permanência Individual - POS Modernizado */}
            <Card className="shadow-lg border-2 border-emerald-100 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/30">
              <CardHeader className="pb-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center text-base">
                  <Users className="mr-2 h-5 w-5" />
                  Permanência Individual - POS {calcularMesesReferencia()}
                </CardTitle>
                <CardDescription className="text-emerald-100 text-xs">
                  Análise de status de clientes por vendedor para serviços POS
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {/* Resumo de Permanência Geral */}
                  {totaisPorSigla.POS.total > 0 && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border-2 border-emerald-200 shadow-sm">
                      <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-emerald-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-800">Permanência Geral:</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-3xl font-bold ${getPercentualColor(totaisPorSigla.POS.percentual_adimplencia)}`}>
                            {totaisPorSigla.POS.percentual_adimplencia.toFixed(2)}%
                          </span>
                        <span className="text-base text-gray-600 font-semibold bg-white px-3 py-1 rounded-md border border-gray-200">
                          {totaisPorSigla.POS.adimplentes} / {totaisPorSigla.POS.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                        <TableHead className="font-bold text-sm text-gray-900 sticky left-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50 border-r-2 border-gray-300 min-w-[200px]">
                          Vendedor
                        </TableHead>
                        <TableHead className="font-bold text-sm text-gray-900 text-center">Total</TableHead>
                        <TableHead className="font-bold text-sm text-green-700 text-center bg-green-50/30">Adimplentes</TableHead>
                        <TableHead className="font-bold text-sm text-amber-700 text-center bg-amber-50/30">Inadimplentes</TableHead>
                        <TableHead className="font-bold text-sm text-red-700 text-center bg-red-50/30">Cancelados</TableHead>
                        <TableHead className="font-bold text-sm text-gray-900 text-center min-w-[120px]">% Adimplência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendedoresPorSigla.length > 0 ? (
                        vendedoresPorSigla.map((vendedor, index) => (
                          <TableRow 
                            key={`pos-${index}`} 
                            className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                          >
                            <TableCell className={`font-semibold text-sm py-2 sticky left-0 z-10 border-r-2 border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                              <div className="whitespace-nowrap">
                                {vendedor.id_vendedor}
                                {vendedor.nome_vendedor !== vendedor.id_vendedor && (
                                  <span className="text-gray-600 ml-2 font-normal">
                                    - {vendedor.nome_vendedor}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium text-sm py-2">
                              {vendedor.siglas.POS.total}
                            </TableCell>
                            <TableCell className="text-center text-green-600 font-semibold text-sm py-2 bg-green-50/20">
                              {vendedor.siglas.POS.adimplentes}
                            </TableCell>
                            <TableCell className="text-center text-amber-600 font-semibold text-sm py-2 bg-amber-50/20">
                              {vendedor.siglas.POS.inadimplentes}
                            </TableCell>
                            <TableCell className="text-center text-red-600 font-semibold text-sm py-2 bg-red-50/20">
                              {vendedor.siglas.POS.cancelados}
                            </TableCell>
                            <TableCell className="text-center py-2">
                              <span className={`inline-block px-3 py-1 rounded-md border text-sm font-bold ${
                                vendedor.siglas.POS.percentual_adimplencia <= 45.00 
                                  ? "bg-red-100 text-red-800 border-red-300" 
                                  : vendedor.siglas.POS.percentual_adimplencia < 50.00 
                                  ? "bg-amber-100 text-amber-800 border-amber-300" 
                                  : "bg-green-100 text-green-800 border-green-300"
                              }`}>
                              {vendedor.siglas.POS.percentual_adimplencia.toFixed(2)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                            Nenhum dado de vendedor disponível para POS
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Linha de total para POS */}
                      {vendedoresPorSigla.length > 0 && totaisPorSigla.POS.total > 0 && (
                        <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-2 border-gray-300 font-bold">
                          <TableCell className={`font-bold text-sm py-3 sticky left-0 z-10 border-r-2 border-gray-300 bg-gradient-to-r from-gray-100 to-gray-50`}>
                            TOTAL GERAL
                          </TableCell>
                          <TableCell className="text-center font-bold text-base py-3">
                            {totaisPorSigla.POS.total}
                          </TableCell>
                          <TableCell className="text-center text-green-600 font-bold text-base py-3 bg-green-50/20">
                            {totaisPorSigla.POS.adimplentes}
                          </TableCell>
                          <TableCell className="text-center text-amber-600 font-bold text-base py-3 bg-amber-50/20">
                            {totaisPorSigla.POS.inadimplentes}
                          </TableCell>
                          <TableCell className="text-center text-red-600 font-bold text-base py-3 bg-red-50/20">
                            {totaisPorSigla.POS.cancelados}
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <span className={`inline-block px-3 py-1.5 rounded-md border text-base font-bold ${
                              totaisPorSigla.POS.percentual_adimplencia <= 45.00 
                                ? "bg-red-100 text-red-800 border-red-300" 
                                : totaisPorSigla.POS.percentual_adimplencia < 50.00 
                                ? "bg-amber-100 text-amber-800 border-amber-300" 
                                : "bg-green-100 text-green-800 border-green-300"
                            }`}>
                            {totaisPorSigla.POS.percentual_adimplencia.toFixed(2)}%
                          </span>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Evolução da Permanência */}
            <PermanenciaTrendTable
            filtroMesPermanencia={filtroMesPermanencia}
            filtroAnoPermanencia={filtroAnoPermanencia}
            vendasFiltradas={vendasFiltradas}
            />
          </div>

          {/* Tabela de Evolução da Permanência por Vendedor */}
          <div className="mb-6">
            <VendedorPermanenciaTrendTable
              filtroMesPermanencia={filtroMesPermanencia}
              filtroAnoPermanencia={filtroAnoPermanencia}
              vendasFiltradas={vendasFiltradas}
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
      {/* Filtros de Mês e Ano de Habilitação - Modernizado */}
      <div className="mb-6">
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 pb-4">
            <CardTitle className="text-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Filter className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-gray-800 font-semibold">Filtros de Habilitação</span>
              </div>
            </CardTitle>
            <CardDescription className="text-sm mt-2 text-gray-600">
              Filtre por período de habilitação das vendas
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="filtro-mes-habilitacao" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-blue-600" />
                    Mês de Habilitação
                  </Label>
                <MultiSelect 
                  options={mesOptions} 
                  selected={filtroMesHabilitacao}
                  onChange={(values) => setFiltroMesHabilitacao(values)}
                  placeholder="Selecione meses"
                    className="w-full text-sm min-w-[200px]"
                />
              </div>
              
                <div className="space-y-2">
                  <Label htmlFor="filtro-ano-habilitacao" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-blue-600" />
                    Ano de Habilitação
                  </Label>
                <MultiSelect 
                  options={anoOptions} 
                  selected={filtroAnoHabilitacao}
                  onChange={(values) => setFiltroAnoHabilitacao(values)}
                  placeholder="Selecione anos"
                    className="w-full text-sm min-w-[150px]"
                />
              </div>

                <div className="flex items-end">
                <Button
                  variant="outline"
                    size="lg"
                  onClick={() => {
                    setFiltroMesHabilitacao([]);
                    setFiltroAnoHabilitacao([]);
                  }}
                  disabled={filtroMesHabilitacao.length === 0 && filtroAnoHabilitacao.length === 0}
                    className="w-full h-11 border-2 hover:bg-gray-50 font-semibold"
                >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
              </div>

              {/* Badges de seleção ativa */}
              {(filtroMesHabilitacao.length > 0 || filtroAnoHabilitacao.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                  {filtroMesHabilitacao.map((mes) => (
                    <Badge key={mes} variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 px-3 py-1.5 text-sm font-semibold">
                      <CalendarIcon className="h-3 w-3 mr-1.5" />
                      Mês: {mes}
                    </Badge>
                  ))}
                  {filtroAnoHabilitacao.map((ano) => (
                    <Badge key={ano} variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 px-3 py-1.5 text-sm font-semibold">
                      <CalendarIcon className="h-3 w-3 mr-1.5" />
                      Ano: {ano}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Informações sobre a lógica */}
              {(filtroMesHabilitacao.length > 0 && filtroAnoHabilitacao.length > 0) && (
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold mb-1">Período Selecionado:</p>
                      <p className="text-xs">{calcularMesesReferencia()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mostrar quadros apenas quando filtros estiverem selecionados */}
      {(filtroMesHabilitacao.length > 0 && filtroAnoHabilitacao.length > 0) ? (
        <div className="space-y-6">
          {/* Quadros de Ticket Médio e Quantidade de Vendas por Vendedor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna 1: Ticket Médio por Vendedor */}
          <div className="space-y-6">
          {/* Quadro Ticket Médio por Vendedor */}
          <ProtectedCard 
            title="Ticket Médio por Vendedor" 
            storageKey="vendedor_ticket_medio"
          >
            <Card className="shadow-lg border-2 border-emerald-100 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/30">
              <CardHeader className="pb-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-5 w-5" />
                  Ticket Médio por Vendedor {calcularMesesReferencia() && `(${calcularMesesReferencia()})`}
                </CardTitle>
                <CardDescription className="text-emerald-100 text-xs">
                  Valores combinados (permanência + meta atual)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
              {vendas.length === 0 && vendasMeta.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Importe dados de vendas para visualizar.
                </div>
              ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                      <TableHead className="font-bold text-xs py-2 px-3 sticky left-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50 border-r-2 border-gray-300 min-w-[160px]">VENDEDOR</TableHead>
                      <TableHead className="font-bold text-xs py-2 px-2 text-right">Total</TableHead>
                      <TableHead className="font-bold text-xs py-2 px-2 text-right text-green-700 bg-green-50/30">POS</TableHead>
                      <TableHead className="font-bold text-xs py-2 px-2 text-right text-blue-700 bg-blue-50/30">PRE</TableHead>
                      <TableHead className="font-bold text-xs py-2 px-2 text-right text-purple-700 bg-purple-50/30">NP</TableHead>
                      <TableHead className="font-bold text-xs py-2 px-2 text-right text-indigo-700 bg-indigo-50/30">SKY+</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calcularTicketMedioVendedor.map((vendedor, index) => (
                      <TableRow 
                        key={vendedor.id_vendedor} 
                        className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <TableCell className="font-semibold text-xs py-2 px-3 sticky left-0 z-10 bg-inherit border-r-2 border-gray-200 min-w-[160px]">
                          <div className="whitespace-nowrap">
                            {vendedor.id_vendedor}
                            {vendedor.nome_vendedor !== vendedor.id_vendedor && (
                              <span className="text-gray-600 ml-1 font-normal">
                                - {vendedor.nome_vendedor}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs py-2 px-2">
                          {vendedor.valores.total.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 px-2 text-green-700 font-medium">
                          {vendedor.valores.POS > 0 ? vendedor.valores.POS.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }) : 'R$ 0,00'}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 px-2 text-blue-700 font-medium">
                          {vendedor.valores.PRE > 0 ? vendedor.valores.PRE.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }) : 'R$ 0,00'}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 px-2 text-purple-700 font-medium">
                          {vendedor.valores.NP > 0 ? vendedor.valores.NP.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }) : 'R$ 0,00'}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 px-2 text-indigo-700 font-medium">
                          {vendedor.valores['SKY+'] > 0 ? vendedor.valores['SKY+'].toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }) : 'R$ 0,00'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-gradient-to-r from-emerald-100 to-green-100 border-t-2 border-emerald-300 font-bold">
                      <TableCell className="font-bold text-emerald-900 text-xs py-2 px-3 sticky left-0 z-10 bg-gradient-to-r from-emerald-100 to-green-100 border-r-2 border-emerald-300">
                        TOTAL GERAL
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-900 text-sm py-2 px-2">
                        {totaisGerais.total.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-800 text-sm py-2 px-2 bg-green-50/50">
                        {totaisGerais.POS.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-800 text-sm py-2 px-2 bg-blue-50/50">
                        {totaisGerais.PRE.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-800 text-sm py-2 px-2 bg-purple-50/50">
                        {totaisGerais.NP.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-indigo-800 text-sm py-2 px-2 bg-indigo-50/50">
                        {totaisGerais['SKY+'].toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </ProtectedCard>
        </div>

        {/* Quadro Quantidade de Vendas por Vendedor */}
        <Card className="shadow-lg border-2 border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30">
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="h-5 w-5" />
              Quantidade de Vendas por Vendedor {calcularMesesReferencia() && `(${calcularMesesReferencia()})`}
            </CardTitle>
            <CardDescription className="text-blue-100 text-xs">
              Quantidades combinadas (permanência + meta atual)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {vendas.length === 0 && vendasMeta.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Importe dados de vendas para visualizar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                      <TableHead className="font-bold text-xs py-2 px-3 sticky left-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50 border-r-2 border-gray-300 min-w-[160px]">VENDEDOR</TableHead>
                      <TableHead className="font-bold text-xs py-2 px-2 text-right">Total</TableHead>
                      <TableHead className="font-bold text-xs py-2 px-2 text-right text-green-700 bg-green-50/30">POS</TableHead>
                      <TableHead className="font-bold text-xs py-2 px-2 text-right text-blue-700 bg-blue-50/30">PRE</TableHead>
                      <TableHead className="font-bold text-xs py-2 px-2 text-right text-purple-700 bg-purple-50/30">NP</TableHead>
                      <TableHead className="font-bold text-xs py-2 px-2 text-right text-indigo-700 bg-indigo-50/30">SKY+</TableHead>
                      {/* DIVISÓRIA - PRODUTOS DIFERENCIAIS */}
                      <TableHead className="font-bold text-xs py-2 px-2 text-right bg-orange-100 border-l-2 border-orange-300 text-orange-800">Cartão</TableHead>
                      <TableHead className="font-bold text-xs py-2 px-2 text-right bg-orange-100 text-orange-800">Digital</TableHead>
                      <TableHead className="font-bold text-xs py-2 px-2 text-right bg-orange-100 text-orange-800">S/Cobr</TableHead>
                      <TableHead className="font-bold text-xs py-2 px-2 text-right bg-orange-100 text-orange-800">Seg.POS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calcularQuantidadeVendasVendedor.map((vendedor, index) => (
                      <TableRow 
                        key={`qtd-${vendedor.id_vendedor}`} 
                        className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <TableCell className="font-semibold text-xs py-2 px-3 sticky left-0 z-10 bg-inherit border-r-2 border-gray-200 min-w-[160px]">
                          <div className="whitespace-nowrap">
                            {vendedor.id_vendedor}
                            {vendedor.nome_vendedor !== vendedor.id_vendedor && (
                              <span className="text-gray-600 ml-1 font-normal">
                                - {vendedor.nome_vendedor}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs py-2 px-2">
                          {vendedor.quantidades.total}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 px-2 text-green-700 font-medium">
                          {vendedor.quantidades.POS || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 px-2 text-blue-700 font-medium">
                          {vendedor.quantidades.PRE || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 px-2 text-purple-700 font-medium">
                          {vendedor.quantidades.NP || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 px-2 text-indigo-700 font-medium">
                          {vendedor.quantidades['SKY+'] || 0}
                        </TableCell>
                        {/* PRODUTOS DIFERENCIAIS */}
                        <TableCell className="text-right text-xs py-2 px-2 bg-orange-50/50 border-l-2 border-orange-300 text-orange-700 font-medium">
                          {vendedor.quantidades.CARTAO_CREDITO || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 px-2 bg-orange-50/50 text-orange-700 font-medium">
                          {vendedor.quantidades.DIGITAL_PEC_PIX || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 px-2 bg-orange-50/50 text-orange-700 font-medium">
                          {vendedor.quantidades.S_COBRANCA || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 px-2 bg-orange-50/50 text-orange-700 font-medium">
                          {vendedor.quantidades.SEGURO_POS || 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-gradient-to-r from-blue-100 to-indigo-100 border-t-2 border-blue-300 font-bold">
                      <TableCell className="font-bold text-blue-900 text-xs py-2 px-3 sticky left-0 z-10 bg-gradient-to-r from-blue-100 to-indigo-100 border-r-2 border-blue-300">
                        TOTAL GERAL
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-900 text-sm py-2 px-2">
                        {totaisGeraisQuantidade.total}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-800 text-sm py-2 px-2 bg-green-50/50">
                        {totaisGeraisQuantidade.POS}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-800 text-sm py-2 px-2 bg-blue-50/50">
                        {totaisGeraisQuantidade.PRE}
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-800 text-sm py-2 px-2 bg-purple-50/50">
                        {totaisGeraisQuantidade.NP}
                      </TableCell>
                      <TableCell className="text-right font-bold text-indigo-800 text-sm py-2 px-2 bg-indigo-50/50">
                        {totaisGeraisQuantidade['SKY+']}
                      </TableCell>
                      {/* TOTAIS PRODUTOS DIFERENCIAIS */}
                      <TableCell className="text-right font-bold text-orange-800 text-sm py-2 px-2 bg-orange-100 border-l-2 border-orange-300">
                        {totaisGeraisQuantidade.CARTAO_CREDITO}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-800 text-sm py-2 px-2 bg-orange-100">
                        {totaisGeraisQuantidade.DIGITAL_PEC_PIX}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-800 text-sm py-2 px-2 bg-orange-100">
                        {totaisGeraisQuantidade.S_COBRANCA}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-800 text-sm py-2 px-2 bg-orange-100">
                        {totaisGeraisQuantidade.SEGURO_POS}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

          {/* Tabelas de Evolução - Ocupam toda a largura */}
          <div className="w-full space-y-6">
            {/* Tabela Ticket Médio no Período */}
            <ProtectedCard 
              title="Ticket Médio no Período" 
              storageKey="vendedor_ticket_medio_periodo"
            >
              <TicketMedioTrendTable
          filtroMesHabilitacao={filtroMesHabilitacao}
          filtroAnoHabilitacao={filtroAnoHabilitacao}
          vendasFiltradas={vendasFiltradas}
          vendasMetaFiltradas={vendasMetaFiltradas}
          />
            </ProtectedCard>

            {/* Tabela Evolução do Desempenho por Categoria */}
            <DesempenhoCategoriaTrendTable
            filtroMesHabilitacao={filtroMesHabilitacao}
            filtroAnoHabilitacao={filtroAnoHabilitacao}
            vendasFiltradas={vendasFiltradas}
            vendasMetaFiltradas={vendasMetaFiltradas}
          />
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
