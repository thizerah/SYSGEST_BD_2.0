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
  CheckCircle
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
import { ServiceOrder, User, VALID_STATUS, Venda, PrimeiroPagamento } from "@/types";
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
import { standardizeServiceCategory, normalizeCityName, normalizeNeighborhoodName } from "@/context/DataUtils";

export function MetricsOverview() {
  const { calculateTimeMetrics, calculateReopeningMetrics, serviceOrders, technicians, getReopeningPairs } = useData();
  const { user } = useAuth();
  
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
  
  // Resetar o filtro de tipo de serviço original quando mudar de guia
  useEffect(() => {
    // Reset do filtro ao mudar de guia
    setOriginalServiceTypeFilter("");
  }, [activeTab]);
  
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
            
            if (includeByFinalization) {
              console.log(`✅ OS incluída por FINALIZAÇÃO: ${order.codigo_os}, Data finalizacao: ${order.data_finalizacao}, 
                Mês/Ano: ${orderMonth}/${orderYear}, Filtro: ${selectedMonth}/${selectedYear}`);
            }
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
            
            if (includeByCreation) {
              console.log(`✅ OS incluída por CRIAÇÃO: ${order.codigo_os}, Data criação: ${order.data_criacao}, 
                Mês/Ano: ${orderMonth}/${orderYear}, Filtro: ${selectedMonth}/${selectedYear}`);
            }
          }
        } catch (error) {
          console.error(`Erro ao processar data de criação: ${order.data_criacao}`, error);
        }
      }
      
      // Incluir a OS se ela satisfizer qualquer um dos critérios (criação OU finalização no mês)
      const shouldInclude = includeByFinalization || includeByCreation;
      
      if (!shouldInclude) {
        console.log(`❌ OS excluída: ${order.codigo_os}`);
      }
      
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
        
        // Para depuração
        if (reopeningMonth === selectedMonth && reopeningYear === selectedYear) {
          console.log(`✅ Reabertura incluída: ${pair.reopeningOrder.codigo_os}, 
            Data criação: ${reopeningDateStr}, 
            Mês/Ano identificado: ${reopeningMonth}/${reopeningYear}, 
            Filtro selecionado: ${selectedMonth}/${selectedYear}`);
        } else {
          console.log(`❌ Reabertura excluída: ${pair.reopeningOrder.codigo_os}, 
            Data criação: ${reopeningDateStr}, 
            Mês/Ano identificado: ${reopeningMonth}/${reopeningYear}, 
            Filtro selecionado: ${selectedMonth}/${selectedYear}`);
        }
        
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
  
  // Obter métricas de reabertura apenas com base nos pares filtrados
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
    
    // Com um pequeno delay, limpar os filtros para garantir uma experiência consistente
    setTimeout(() => {
      setSelectedMonth(null);
      setSelectedYear(null);
    }, 150);
  }, [activeTab]);
  
  // Verificar se podemos exibir os dados quando os filtros são alterados
  useEffect(() => {
    // Quando o mês ou ano mudam, devemos limpar e reaplicar os filtros
    // Isso evita que ordens de diferentes meses apareçam juntas
    if (selectedMonth && selectedYear) {
      // Forçamos uma limpeza temporária dos resultados antes de mostrar os novos
      setShowData(false);
      setIsFiltering(true);
      
      // Aplicamos o filtro após um pequeno delay para garantir que a UI mostre a transição
      setTimeout(() => {
        setShowData(true);
        setIsFiltering(false);
      }, 500); // Aumentado para dar tempo do efeito de carregamento ser visível
    } else {
      setShowData(false);
      setIsFiltering(false);
    }
  }, [selectedMonth, selectedYear]);
  
  // Função para aplicar filtros
  const handleApplyFilters = () => {
    if (selectedMonth && selectedYear) {
      // Limpar temporariamente antes de mostrar novos resultados
      setShowData(false);
      setIsFiltering(true);
      
      // Aplicar filtros com um pequeno delay para garantir que a UI atualize corretamente
      setTimeout(() => {
        setShowData(true);
        setIsFiltering(false);
      }, 500);
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Indicadores de Desempenho</h2>
        <TabsList>
          <TabsTrigger value="time" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Tempos
          </TabsTrigger>
          <TabsTrigger value="reopening" className="flex items-center">
            <Repeat className="mr-2 h-4 w-4" />
            Reaberturas
          </TabsTrigger>
          <TabsTrigger value="permanencia" className="flex items-center">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Permanência
          </TabsTrigger>
          <TabsTrigger value="technicians" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Técnicos
          </TabsTrigger>
          <TabsTrigger value="vendedor" className="flex items-center">
            <BarChart2 className="mr-2 h-4 w-4" />
            Vendedor
          </TabsTrigger>
          <TabsTrigger value="indicadores" className="flex items-center">
            <BarChart2 className="mr-2 h-4 w-4" />
            Indicadores
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center">
            <UserCog className="mr-2 h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center">
            <FileUp className="mr-2 h-4 w-4" />
            Importação
        </TabsTrigger>
        </TabsList>
      </div>
      
      {/* Time Metrics Tab */}
      <TabsContent value="time" className="space-y-4">
        <FilterControls />
        
        {!showData ? (
          <NoDataMessage />
        ) : (
          <>
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
            <div className="space-y-4">
              {Object.entries(timeMetrics.servicesByType).map(([type, metrics]) => {
                const goalPercent = metrics.percentWithinGoal;
                
                // Determine progress bar color based on goal achievement
                const progressClass = goalPercent > 80 
                  ? "bg-green-600/20" 
                  : goalPercent > 50 
                    ? "bg-yellow-500/20" 
                    : "bg-red-600/20";
                
                const indicatorClass = goalPercent > 80 
                  ? "!bg-green-600" 
                  : goalPercent > 50 
                    ? "!bg-yellow-500" 
                    : "!bg-red-600";
                
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{type}</span>
                      <span className="text-sm">
                        {metrics.averageTime.toFixed(2)} horas (meta: {getServiceGoal(type)} horas)
                      </span>
                    </div>
                    <div className={progressClass + " rounded-full h-1.5 overflow-hidden"}>
                      <div 
                        className={indicatorClass + " h-full rounded-full"} 
                        style={{ width: `${goalPercent}%` }}
                      />
                    </div>
                    <div className="text-xl font-bold">
                      {metrics.withinGoal} de {metrics.totalOrders} dentro da meta ({goalPercent.toFixed(2)}%)
                    </div>
                  </div>
                );
              })}
              
              {Object.keys(timeMetrics.servicesByType).length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                      Nenhum dado disponível para análise no período selecionado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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
                    {uniqueOriginalServiceTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
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
                <span className="text-primary font-medium">{getFilteredReopeningPairs.length}</span> reaberturas encontradas com o tipo de serviço original: <span className="font-medium">{originalServiceTypeFilter}</span>
              </div>
            )}
          </CardContent>
        </Card>
            
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Reopened Orders Count */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Ordens Reabertas
              </CardTitle>
              <CardDescription>
                Total de ordens identificadas como reabertas
              </CardDescription>
            </CardHeader>
            <CardContent>
                  <div className="text-2xl font-bold">{getReopeningMetrics.reopenedOrders}</div>
            </CardContent>
          </Card>
          
          {/* Total Original Services */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Ordens Abertas
              </CardTitle>
              <CardDescription>
                {originalServiceTypeFilter 
                  ? `Total de ${originalServiceTypeFilter}`
                  : "Soma de Corretiva, Corretiva BL, Ponto Principal e Ponto Principal BL"}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
          
          {/* Reopening Rate */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Chance de reabertura (Taxa de Reabertura)
              </CardTitle>
              <CardDescription>
                Percentual de reaberturas sobre o total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getReopeningMetrics.reopeningRate.toFixed(2).replace('.', ',')}%</div>
              <Progress 
                value={getReopeningMetrics.reopeningRate} 
                className="h-2 mt-2"
              />
            </CardContent>
          </Card>
          
          {/* Average Time Between */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Tempo Médio Entre OS
              </CardTitle>
              <CardDescription>
                Média entre finalização original e reabertura
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                    <TableHead>OS Original</TableHead>
                    <TableHead>Ação Tomada Original</TableHead>
                    <TableHead>Data Criação Original</TableHead>
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
                        <TableCell>{pair.originalOrder.codigo_os}<br/><span className="text-xs text-muted-foreground">{pair.originalOrder.subtipo_servico}</span></TableCell>
                        <TableCell>{getAcaoTomadaBadge(pair.originalOrder.acao_tomada, pair.originalOrder.status)}</TableCell>
                        <TableCell>{formatDate(pair.originalOrder.data_criacao)}</TableCell>
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
                      <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
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
            
            {/* Motivo da Reabertura por OS Primária */}
            <Card className="w-full">
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
        
          {/* Organize all reopening cards in a 2x2 grid that fills the screen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full w-full">
        {/* Reopening by Original Type Table */}
            <Card className="h-full w-full">
              <CardHeader className="py-3">
                <CardTitle>
                  <div className="flex items-center">
                    <BarChart2 className="mr-2 h-5 w-5" />
                    Reaberturas por Tipo da OS Original
                  </div>
                </CardTitle>
          </CardHeader>
              <CardContent className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
                <div className="overflow-x-auto w-full">
                  <Table className="w-full">
                <TableHeader>
                  <TableRow>
                        <TableHead className="w-3/5">Tipo da OS Original</TableHead>
                        <TableHead className="text-right">Serviços</TableHead>
                    <TableHead className="text-right">Reaberturas</TableHead>
                    <TableHead className="text-right">% Reabertura</TableHead>
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
                        .map(([type, data]) => (
                    <TableRow key={type}>
                      <TableCell className="font-medium">{type}</TableCell>
                      <TableCell className="text-right">{data.totalOriginals}</TableCell>
                      <TableCell className="text-right">{data.reopenings}</TableCell>
                      <TableCell className="text-right">
                        {(data.reopenings / data.totalOriginals * 100).toFixed(2)}%
                      </TableCell>
                    </TableRow>
                        ))
                      }
                  
                        {Object.keys(getReopeningMetrics.reopeningsByOriginalType).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                              Nenhuma reabertura encontrada no período selecionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-2 text-xs text-muted-foreground italic">
                <p><strong>Nota:</strong> Na coluna "Serviços" são contabilizadas todas as ordens que foram <strong>criadas OU finalizadas</strong> no mês selecionado.</p>
              </div>
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
                          // Critério específico para Assistência Técnica TV
                          const progressClass = goalPercent >= 85 
                            ? "bg-green-600/20" 
                            : goalPercent >= 40
                              ? "bg-yellow-500/20" 
                              : "bg-red-600/20";
                          const indicatorClass = goalPercent >= 85 
                            ? "!bg-green-600" 
                            : goalPercent >= 40
                              ? "!bg-yellow-500" 
                              : "!bg-red-600";
                          
                          return (
                            <>
                              <div className="text-center text-2xl font-bold">{goalPercent.toFixed(2)}%</div>
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
                          
                          // Critérios para Reaberturas de Assistência Técnica TV
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
                              <div className="text-center text-2xl font-bold">{data.reopeningRate.toFixed(2)}%</div>
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
                          // Critério específico para Ponto Principal TV
                          const progressClass = goalPercent >= 75
                            ? "bg-green-600/20" 
                            : "bg-red-600/20";
                          const indicatorClass = goalPercent >= 75
                            ? "!bg-green-600" 
                            : "!bg-red-600";
                          
                          return (
                            <>
                              <div className="text-center text-2xl font-bold">{goalPercent.toFixed(2)}%</div>
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
                          
                          // Critérios para Reaberturas de Ponto Principal TV
                          const reopeningClass = data.reopeningRate < 2
                            ? "bg-green-100" 
                            : "bg-red-100";
                          const reopeningIndicatorClass = data.reopeningRate < 2
                            ? "bg-green-400" 
                            : "bg-red-400";
                          
                          return (
                            <>
                              <div className="text-center text-2xl font-bold">{data.reopeningRate.toFixed(2)}%</div>
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
                          // Critério específico para Assistência Técnica FIBRA
                          const progressClass = goalPercent >= 75
                            ? "bg-green-600/20" 
                            : goalPercent >= 30
                              ? "bg-yellow-500/20" 
                              : "bg-red-600/20";
                          const indicatorClass = goalPercent >= 75
                            ? "!bg-green-600" 
                            : goalPercent >= 30
                              ? "!bg-yellow-500" 
                              : "!bg-red-600";
                          
                          return (
                            <>
                              <div className="text-center text-2xl font-bold">{goalPercent.toFixed(2)}%</div>
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
                          
                          // Critérios para Reaberturas de Assistência Técnica FIBRA
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
                              <div className="text-center text-2xl font-bold">{data.reopeningRate.toFixed(2)}%</div>
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
                          // Critério específico para Ponto Principal FIBRA
                          const progressClass = goalPercent >= 75
                            ? "bg-green-600/20" 
                            : "bg-red-600/20";
                          const indicatorClass = goalPercent >= 75
                            ? "!bg-green-600" 
                            : "!bg-red-600";
                          
                          return (
                            <>
                              <div className="text-center text-2xl font-bold">{goalPercent.toFixed(2)}%</div>
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
                          
                          // Critérios para Reaberturas de Ponto Principal FIBRA
                          const reopeningClass = data.reopeningRate <= 5
                            ? "bg-green-100" 
                            : "bg-red-100";
                          const reopeningIndicatorClass = data.reopeningRate <= 5
                            ? "bg-green-400" 
                            : "bg-red-400";
                          
                          return (
                            <>
                              <div className="text-center text-2xl font-bold">{data.reopeningRate.toFixed(2)}%</div>
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
                  <PermanenciaPorTipoServico sigla="POS" datasHabilitacaoFiltradas={filtroDataHabilitacao} />
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
                  <PermanenciaPorTipoServico sigla="BL-DGO" datasHabilitacaoFiltradas={filtroDataHabilitacao} />
                </CardContent>
              </Card>
            </div>
            
            {/* Novo quadro de Faixas de Desempenho e Bonificações - Vendas */}
            <div className="mb-6">
              <ValorDeFaceVendas />
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
                          <TableHead className="text-center py-1">Subst.</TableHead>
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
        <UserManagement />
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
    'Ponto Principal TV': 48,
    'Ponto Principal Fibra': 48,
    'Ponto Principal FIBRA': 48,
    'Ponto Principal': 48,
    'Ponto Principal BL': 48,
    'Assistência Técnica Fibra': 34,
    'Assistência Técnica FIBRA': 34,
    'Assistência Técnica TV': 34,
    'Corretiva': 48,
    'Corretiva BL': 48,
    'Preventiva BL': 48,
    'Prestação de Serviço': 48,
    'Prestação de Serviço BL': 48
  };
  
  const goal = goals[serviceType] || 48;
  console.log(`[DEBUG] Meta para tipo "${serviceType}": ${goal} horas`);
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
function MessageConfiguration() {
  const { user } = useAuth();
  const [message, setMessage] = useState("⚠️ Novas atualizações em breve");
  const [isEditing, setIsEditing] = useState(false);
  const [tempMessage, setTempMessage] = useState("");
  const { toast } = useToast();

  // Carregar mensagem salva do localStorage
  useEffect(() => {
    const savedMessage = localStorage.getItem('headerMessage');
    if (savedMessage) {
      setMessage(savedMessage);
    }
  }, []);

  const handleEdit = () => {
    setTempMessage(message);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (tempMessage.trim()) {
      setMessage(tempMessage.trim());
      localStorage.setItem('headerMessage', tempMessage.trim());
      
      // Disparar evento customizado para atualizar o header
      window.dispatchEvent(new CustomEvent('headerMessageUpdated', {
        detail: { message: tempMessage.trim() }
      }));
      
      toast({
        title: "Mensagem atualizada",
        description: "A mensagem de atualização foi salva com sucesso."
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempMessage("");
    setIsEditing(false);
  };

  const handleReset = () => {
    const defaultMessage = "⚠️ Novas atualizações em breve";
    setMessage(defaultMessage);
    localStorage.setItem('headerMessage', defaultMessage);
    
    // Disparar evento customizado para atualizar o header
    window.dispatchEvent(new CustomEvent('headerMessageUpdated', {
      detail: { message: defaultMessage }
    }));
    
    toast({
      title: "Mensagem restaurada",
      description: "A mensagem foi restaurada para o padrão."
    });
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
          <span className="text-sm font-medium">{message}</span>
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
function UserManagement() {
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
      <MessageConfiguration />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Gerenciamento de Usuários
          </CardTitle>
          <CardDescription>
            Gerencie os usuários que podem acessar o sistema.
            {user?.empresa && (
              <Badge variant="outline" className="ml-2 mt-1">
                Empresa: {user.empresa}
              </Badge>
            )}
          </CardDescription>
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
  const { importServiceOrders, importVendas, importPrimeirosPagamentos } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importType, setImportType] = useState<'os' | 'vendas' | 'pagamentos'>('os');
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
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          
          // Converte os dados da planilha para um formato amigável
          const data = XLSX.utils.sheet_to_json(sheet);
          
          setProgress(75);
          console.log(`Processando ${data.length} linhas da planilha`);
          
          if (data.length === 0) {
            setError("A planilha parece estar vazia");
            setProcessing(false);
            setProgress(0);
            return;
          }
          
          try {
            // Processar dados conforme o tipo de importação selecionado
            if (importType === 'os') {
              // Processamento existente para ordens de serviço
              const processedOrders = processData(data as Record<string, unknown>[]);
              importServiceOrders(processedOrders, true);
              
              toast({
                title: "Importação concluída",
                description: `${processedOrders.length} ordens de serviço foram adicionadas com sucesso.`
              });
            } 
            else if (importType === 'vendas') {
              // Processamento para vendas
              const processedVendas = processVendas(data as Record<string, unknown>[]);
              importVendas(processedVendas, true);
              
              toast({
                title: "Importação concluída",
                description: `${processedVendas.length} vendas foram adicionadas com sucesso.`
              });
            }
            else if (importType === 'pagamentos') {
              // Processamento para pagamentos
              const processedPagamentos = processPagamentos(data as Record<string, unknown>[], toast);
              importPrimeirosPagamentos(processedPagamentos, true);
              
              toast({
                title: "Importação concluída",
                description: `${processedPagamentos.length} registros de primeiro pagamento foram adicionados com sucesso.`
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
    
    console.log("Headers necessários:", REQUIRED_FIELDS);
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
        acao_tomada: acaoTomada
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
      
      if (!numeroProposta || !idVendedor || !nomeProprietario || !agrupamentoProduto || 
          !produtoPrincipal || !valor || !statusProposta || !dataHabilitacao) {
        throw new Error(`Não foi possível encontrar todas as colunas necessárias na linha ${index + 2}`);
      }
      
      const venda: Venda = {
        numero_proposta: String(row[numeroProposta]),
        id_vendedor: String(row[idVendedor]),
        nome_proprietario: String(row[nomeProprietario]),
        cpf: cpfColumn ? String(row[cpfColumn] || "") : "",
        nome_fantasia: nomeFantasiaColumn ? String(row[nomeFantasiaColumn] || "") : "",
        telefone_celular: telefoneCelularColumn ? String(row[telefoneCelularColumn] || "") : "",
        agrupamento_produto: String(row[agrupamentoProduto]),
        produto_principal: String(row[produtoPrincipal]),
        valor: parseValue(String(row[valor])),
        status_proposta: String(row[statusProposta]),
        data_habilitacao: formatDate(String(row[dataHabilitacao]))
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setImportType('os')}
                    variant={importType === 'os' ? 'default' : 'outline'}
                    className="flex-1"
                  >
                    <FileIcon className="mr-2 h-4 w-4" />
                    Ordens de Serviço
                  </Button>
                  <Button
                    onClick={() => setImportType('vendas')}
                    variant={importType === 'vendas' ? 'default' : 'outline'}
                    className="flex-1"
                  >
                    <FileIcon className="mr-2 h-4 w-4" />
                    Vendas
                  </Button>
                  <Button
                    onClick={() => setImportType('pagamentos')}
                    variant={importType === 'pagamentos' ? 'default' : 'outline'}
                    className="flex-1"
                  >
                    <FileIcon className="mr-2 h-4 w-4" />
                    Primeiro Pagamento
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
            
            {importType === 'os' && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Campos Obrigatórios - Ordens de Serviço</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
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
                <h3 className="text-sm font-semibold mb-2 mt-4">Campos Opcionais - Ordens de Serviço</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div>• Cidade</div>
                  <div>• Bairro</div>
                  <div>• Info: ponto_de_ref</div>
                  <div>• Info: info_cto</div>
                  <div>• Info: info_porta</div>
                  <div>• Info: info_endereco_completo</div>
                  <div>• Info: info_empresa_parceira</div>
                  <div>• Ação Tomada</div>
                </div>
              </div>
            )}
            
            {importType === 'vendas' && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Campos Obrigatórios - Vendas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div>• Número da proposta</div>
                  <div>• ID/Código do vendedor</div>
                  <div>• Nome completo do proprietário</div>
                  <div>• Agrupamento do Produto</div>
                  <div>• Produto principal</div>
                  <div>• Valor</div>
                  <div>• Status da Proposta</div>
                  <div>• Data da Habilitação</div>
                </div>
                <h3 className="text-sm font-semibold mb-2 mt-4">Campos Opcionais - Vendas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div>• CPF</div>
                  <div>• Nome Fantasia</div>
                </div>
              </div>
            )}
            
            {importType === 'pagamentos' && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Campos Obrigatórios - Primeiro Pagamento</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  <div>• Proposta</div>
                  <div>• Passo</div>
                  <div>• Vencimento da Fatura</div>
                  <div>• Status do Pacote</div>
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
  
  // Obter valores únicos para os filtros
  const siglas = useMemo(() => {
    const valores = new Set<string>();
    vendas.forEach(venda => {
      const agrupamento = venda.agrupamento_produto || '';
      const produto = venda.produto_principal || '';
      
      if (agrupamento.includes('POS')) valores.add('POS');
      if (agrupamento.includes('BL-DGO')) valores.add('BL-DGO');
      if (produto.includes('POS')) valores.add('POS');
      if (produto.includes('BL-DGO')) valores.add('BL-DGO');
    });
    return Array.from(valores);
  }, [vendas]);
  
  const vendedoresUnicos = useMemo(() => {
    const valores = new Set<string>();
    vendas.forEach(venda => {
      if (venda.nome_proprietario) valores.add(venda.nome_proprietario);
    });
    return Array.from(valores);
  }, [vendas]);
  
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
    vendas.forEach(venda => {
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
  }, [vendas]);
  
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
    getSigla, 
    calcularDiasCorridos, 
    verificarDiasDentroFaixa,
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
  
  return (
    <>
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
                <div className="text-2xl font-bold text-green-600">{permanenciaMetrics.percentual_adimplentes.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground mt-1">Adimplentes</div>
                <div className="text-sm font-medium mt-1">{permanenciaMetrics.adimplentes}</div>
            </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{permanenciaMetrics.percentual_inadimplentes.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground mt-1">Inadimplentes</div>
                <div className="text-sm font-medium mt-1">{permanenciaMetrics.inadimplentes}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{permanenciaMetrics.percentual_cancelados.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground mt-1">Cancelados</div>
                <div className="text-sm font-medium mt-1">{permanenciaMetrics.cancelados}</div>
              </div>
            </div>
            
            <div className="mt-4">
              <Progress value={permanenciaMetrics.percentual_adimplentes} className="h-2 mb-1" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total de Clientes: {permanenciaMetrics.total_clientes}</span>
                <span>Ativos: {permanenciaMetrics.adimplentes + permanenciaMetrics.inadimplentes}</span>
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
            <PermanenciaPorTipoServico sigla="POS" datasHabilitacaoFiltradas={filtroDataHabilitacao} />
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
            <PermanenciaPorTipoServico sigla="BL-DGO" datasHabilitacaoFiltradas={filtroDataHabilitacao} />
          </CardContent>
        </Card>
      </div>
      
      {/* Novo quadro de Faixas de Desempenho e Bonificações - Vendas */}
      <div className="mb-6">
        <ValorDeFaceVendas />
      </div>
      
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
                  className="w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="filtro-vendedor" className="text-xs">Vendedor</Label>
                <select
                  id="filtro-vendedor"
                  value={filtroVendedor}
                  onChange={(e) => setFiltroVendedor(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="w-full"
                />
          </div>
          
              <div>
                <Label htmlFor="filtro-status" className="text-xs">Status Pagamento (múltiplo)</Label>
                <MultiSelect 
                  options={statusOptions} 
                  selected={filtroStatus}
                  onChange={(values) => setFiltroStatus(values)}
                  placeholder="Selecione status"
                  className="w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="filtro-data-habilitacao" className="text-xs">Data Habilitação (múltipla)</Label>
                <MultiSelect 
                  options={datasHabilitacaoOptions} 
                  selected={filtroDataHabilitacao}
                  onChange={(values) => setFiltroDataHabilitacao(values)}
                  placeholder="Selecione datas"
                  className="w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="filtro-dias-corridos" className="text-xs">Dias Corridos (múltiplo)</Label>
                <MultiSelect 
                  options={diasCorridosOptions} 
                  selected={filtroDiasCorridos}
                  onChange={(values) => setFiltroDiasCorridos(values)}
                  placeholder="Selecione faixas"
                  className="w-full"
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
              filtroDataHabilitacao.length > 0 || filtroDiasCorridos.length > 0) && (
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
                    <div className="overflow-x-auto">            <Table className="text-xs">              <TableHeader>                <TableRow>                  <TableHead className="text-xs p-2 font-medium">Proposta</TableHead>                  <TableHead className="text-xs p-2 font-medium">CPF</TableHead>                  <TableHead className="text-xs p-2 font-medium">Nome Fantasia</TableHead>                  <TableHead className="text-xs p-2 font-medium">Telefone</TableHead>                  <TableHead className="text-xs p-2 font-medium">Sigla</TableHead>                  <TableHead className="text-xs p-2 font-medium">Produto</TableHead>                  <TableHead className="text-xs p-2 font-medium">Vendedor</TableHead>                  <TableHead className="text-xs p-2 font-medium">Data Habilitação</TableHead>                  <TableHead className="text-xs p-2 font-medium">Dias Corridos</TableHead>                  <TableHead className="text-xs p-2 font-medium">Status</TableHead>                  <TableHead className="text-xs p-2 font-medium">Passo</TableHead>                  <TableHead className="text-xs p-2 font-medium">Vencimento da Fatura</TableHead>                  <TableHead className="text-xs p-2 font-medium">Data da Importação</TableHead>                  <TableHead className="text-xs p-2 font-medium">Ação</TableHead>                </TableRow>              </TableHeader>
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
                                                      <TableRow>                    <TableCell colSpan={14} className="text-center py-4 text-muted-foreground">                      Nenhuma proposta encontrada com os filtros aplicados.                    </TableCell>                  </TableRow>
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
    </>
  );
}

// Componente separado para o conteúdo da tab Vendedor
function VendedorTabContent() {
  // Obter as métricas e dados de vendedor
  const dataContext = useData();
  const vendedorMetricsData = dataContext.calculateVendedorMetrics();
  const { vendas, primeirosPagamentos } = dataContext;
  
  // Função para identificar a sigla de um produto
  const getSigla = useCallback((venda: Venda): string => {
    const agrupamento = venda.agrupamento_produto || '';
    const produto = venda.produto_principal || '';
    
    if (agrupamento.includes('POS') || produto.includes('POS')) return 'POS';
    if (agrupamento.includes('BL-DGO') || produto.includes('BL-DGO')) return 'BL-DGO';
    
    return '';
  }, []);
  
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
    if (vendas.length === 0) {
      return [];
    }
    
    // Inicializar mapa de vendedores com estrutura vazia
    vendas.forEach(venda => {
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
    vendas.forEach(venda => {
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
  }, [vendas, primeirosPagamentos, getSigla]);
  
  // Calcular métricas
  const vendedoresPorSigla = useMemo(() => calcularMetricasPorVendedorESigla(), [calcularMetricasPorVendedorESigla]);
  
  // Função para obter a cor do percentual
  const getPercentualColor = useCallback((percentual: number) => {
    if (percentual <= 45.00) return "text-red-600";
    if (percentual <= 60.00) return "text-amber-600";
    return "text-green-600";
  }, []);
  
  return (
    <>
      {/* Cartão para POS */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            Desempenho POS
          </CardTitle>
          <CardDescription>
            Análise de status de clientes por vendedor para serviços POS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Vendedor</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Adimplentes</TableHead>
                  <TableHead className="text-center">Inadimplentes</TableHead>
                  <TableHead className="text-center">Cancelados</TableHead>
                  <TableHead className="text-center">% Adimplência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedoresPorSigla.length > 0 ? (
                  vendedoresPorSigla.map((vendedor, index) => (
                    <TableRow key={`pos-${index}`}>
                      <TableCell className="font-medium">{vendedor.id_vendedor} - {vendedor.nome_vendedor}</TableCell>
                      <TableCell className="text-center font-medium">
                        {vendedor.siglas.POS.total}
                      </TableCell>
                      <TableCell className="text-center text-green-600 font-medium">
                        {vendedor.siglas.POS.adimplentes}
                      </TableCell>
                      <TableCell className="text-center text-amber-600 font-medium">
                        {vendedor.siglas.POS.inadimplentes}
                      </TableCell>
                      <TableCell className="text-center text-red-600 font-medium">
                        {vendedor.siglas.POS.cancelados}
                      </TableCell>
                      <TableCell className={`text-center font-bold ${getPercentualColor(vendedor.siglas.POS.percentual_adimplencia)}`}>
                        {vendedor.siglas.POS.percentual_adimplencia.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      Nenhum dado de vendedor disponível para POS
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
        <CardHeader>
          <CardTitle>
            Desempenho FIBRA
          </CardTitle>
          <CardDescription>
            Análise de status de clientes por vendedor para serviços FIBRA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Vendedor</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Adimplentes</TableHead>
                  <TableHead className="text-center">Inadimplentes</TableHead>
                  <TableHead className="text-center">Cancelados</TableHead>
                  <TableHead className="text-center">% Adimplência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedoresPorSigla.length > 0 ? (
                  vendedoresPorSigla.map((vendedor, index) => (
                    <TableRow key={`bldgo-${index}`}>
                      <TableCell className="font-medium">{vendedor.id_vendedor} - {vendedor.nome_vendedor}</TableCell>
                      <TableCell className="text-center font-medium">
                        {vendedor.siglas["BL-DGO"].total}
                      </TableCell>
                      <TableCell className="text-center text-green-600 font-medium">
                        {vendedor.siglas["BL-DGO"].adimplentes}
                      </TableCell>
                      <TableCell className="text-center text-amber-600 font-medium">
                        {vendedor.siglas["BL-DGO"].inadimplentes}
                      </TableCell>
                      <TableCell className="text-center text-red-600 font-medium">
                        {vendedor.siglas["BL-DGO"].cancelados}
                      </TableCell>
                      <TableCell className={`text-center font-bold ${getPercentualColor(vendedor.siglas["BL-DGO"].percentual_adimplencia)}`}>
                        {vendedor.siglas["BL-DGO"].percentual_adimplencia.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      Nenhum dado de vendedor disponível para FIBRA
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {vendas.length === 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Importe arquivos de Vendas e Primeiro Pagamento para visualizar os dados por vendedor.
        </div>
      )}
    </>
  );
}
