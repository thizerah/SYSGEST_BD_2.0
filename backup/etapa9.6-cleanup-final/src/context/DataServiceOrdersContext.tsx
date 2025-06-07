/**
 * DataServiceOrdersContext - Contexto especializado para Ordens de Serviço
 * Etapa 8.2: Primeiro contexto extraído do DataContext monolítico
 */

import React, { createContext, useState, useMemo } from 'react';
import { ServiceOrder, ReopeningPair } from '@/types';
import { TimeMetrics, ReopeningMetrics } from '@/types/dataContextTypes';
import { 
  VALID_SUBTYPES, 
  ALL_VALID_SUBTYPES,
  EXCLUDED_REASONS,
  normalizeCityName,
  normalizeNeighborhoodName,
  getServiceGoalBySubtype,
  standardizeServiceCategory
} from "./DataUtils";
import { VALID_STATUS, ORIGINAL_SERVICE_TYPES } from '@/constants/serviceTypes';
import { ajustarTempoAtendimento } from '@/utils/holidays';

interface DataServiceOrdersContextType {
  // Estados
  serviceOrders: ServiceOrder[];
  loading: boolean;
  technicians: string[];
  
  // Métodos de dados
  importServiceOrders: (orders: ServiceOrder[], append?: boolean) => void;
  
  // Métodos de cálculo  
  calculateTimeMetrics: (filteredOrders?: ServiceOrder[]) => TimeMetrics;
  calculateReopeningMetrics: (filteredOrders?: ServiceOrder[]) => ReopeningMetrics;
  getReopeningPairs: (filteredOrders?: ServiceOrder[]) => ReopeningPair[];
}

const DataServiceOrdersContext = createContext<DataServiceOrdersContextType | undefined>(undefined);

export const DataServiceOrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const importServiceOrders = (orders: ServiceOrder[], append: boolean = false) => {
    setLoading(true);
    
    // Pré-processamento para casos cancelados: usar data de criação como finalização se necessário
    const preparedOrders = orders.map(order => {
      // Verificar se é um caso cancelado sem data de finalização
      if (order.status === "Cancelada" && 
          (order.subtipo_servico === "Corretiva" || order.subtipo_servico === "Corretiva BL") && 
          (!order.data_finalizacao || order.data_finalizacao.trim() === "") && 
          order.data_criacao) {
        console.log(`[DEBUG] OS ${order.codigo_os} (cancelada ${order.subtipo_servico}): Usando data de criação como finalização`);
        // Usar a data de criação como data de finalização para ordens canceladas
        return {
          ...order,
          data_finalizacao: order.data_criacao
        };
      }
      return order;
    });
    
    const filteredOrders = preparedOrders.filter(order => {
      // Para ordens canceladas, verificar se é Corretiva ou Corretiva BL
      if (order.status === "Cancelada") {
        return (order.subtipo_servico === "Corretiva" || order.subtipo_servico === "Corretiva BL") && order.data_criacao;
      }
      
      // Para outros status, usar a lógica original
      if (!order.data_finalizacao) return false;
      
      const hasValidSubtype = ALL_VALID_SUBTYPES.some(
        subtype => order.subtipo_servico?.includes(subtype)
      );
      
      const hasValidStatus = VALID_STATUS.some(
        status => order.status?.includes(status)
      );
      
      const hasValidReason = !EXCLUDED_REASONS.some(
        reason => order.motivo?.includes(reason)
      );
      
      return hasValidSubtype && hasValidStatus && hasValidReason;
    });
    
    const processedOrders = filteredOrders.map(order => {
      // Se for uma ordem cancelada, não incluir nas métricas de tempo
      if (order.status === "Cancelada") {
        console.log(`[DEBUG] OS ${order.codigo_os} (cancelada) incluída apenas para análise de reabertura`);
        return {
          ...order,
          tempo_atendimento: null,
          atingiu_meta: false,
          include_in_metrics: false  // Não incluir nas métricas de tempo
        };
      }
      
      // Verificar se é um subtipo que deve ser analisado para métricas de tempo
      const isMetricsSubtype = VALID_SUBTYPES.some(
        subtype => order.subtipo_servico?.includes(subtype)
      );
      
      if (!order.data_criacao || !order.data_finalizacao || !isMetricsSubtype) {
        console.log(`[DEBUG] OS ${order.codigo_os} excluída das métricas: ${!order.data_criacao ? 'Sem data criação' : !order.data_finalizacao ? 'Sem data finalização' : 'Subtipo não válido'}`);
        return {
          ...order,
          tempo_atendimento: null,
          atingiu_meta: false,
          include_in_metrics: isMetricsSubtype
        };
      }
      
      const creationDate = new Date(order.data_criacao);
      const completionDate = new Date(order.data_finalizacao);
      
      // Calcular o tempo inicial (sem ajuste)
      const serviceTimeHoursRaw = 
        (completionDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60);
      
      // Padronizar o tipo de serviço para ajuste de tempo
      const standardType = standardizeServiceCategory(order.subtipo_servico, order.motivo);
      
      // Verificar se o tipo padronizado deve ser incluído nas métricas
      const includeInMetrics = isMetricsSubtype && 
                              standardType !== "Não classificado" && 
                              standardType !== "Categoria não identificada";
      
      if (!includeInMetrics) {
        console.log(`[DEBUG] OS ${order.codigo_os} excluída: Tipo "${order.subtipo_servico}", Motivo "${order.motivo}" padronizado como "${standardType}"`);
      } else {
        console.log(`[DEBUG] OS ${order.codigo_os} incluída: Tipo "${order.subtipo_servico}", Motivo "${order.motivo}" padronizado como "${standardType}"`);
      }
      
      // Ajustar o tempo de atendimento considerando feriados e domingos
      const serviceTimeHours = ajustarTempoAtendimento(
        serviceTimeHoursRaw,
        creationDate,
        completionDate,
        standardType
      );
      
      const serviceGoal = getServiceGoalBySubtype(order.subtipo_servico, order.motivo);
      const metGoal = serviceTimeHours <= serviceGoal;
      
      // Padronizar nomes de cidades e bairros
      const normalizedCity = normalizeCityName(order.cidade);
      const normalizedNeighborhood = normalizeNeighborhoodName(order.bairro);
      
      return {
        ...order,
        cidade: normalizedCity,
        bairro: normalizedNeighborhood,
        tempo_atendimento: parseFloat(serviceTimeHours.toFixed(2)),
        atingiu_meta: metGoal,
        include_in_metrics: includeInMetrics
      };
    });
    
    if (append) {
      // Se append for true, verificar duplicidades antes de adicionar
      const existingOrderIds = new Set(serviceOrders.map(order => order.codigo_os));
      const newOrdersFiltered = processedOrders.filter(order => !existingOrderIds.has(order.codigo_os));
      
      if (newOrdersFiltered.length > 0) {
        setServiceOrders(prevOrders => [...prevOrders, ...newOrdersFiltered]);
        console.log(`Adicionadas ${newOrdersFiltered.length} novas ordens de serviço (${processedOrders.length - newOrdersFiltered.length} duplicadas ignoradas)`);
      }
    } else {
      setServiceOrders(processedOrders);
      console.log(`Importadas ${processedOrders.length} ordens de serviço`);
    }
    
    setLoading(false);
  };

  const calculateTimeMetrics = (filteredOrders?: ServiceOrder[]): TimeMetrics => {
    // Filtrar apenas serviços que devem ser incluídos nas métricas de tempo
    const metricsOrders = (filteredOrders || serviceOrders).filter(order => order.include_in_metrics);
    
    console.log(`[DEBUG] calculateTimeMetrics: Total de ordens para análise: ${metricsOrders.length}`);
    
    if (metricsOrders.length === 0) {
      return {
        ordersWithinGoal: 0,
        ordersOutsideGoal: 0,
        percentWithinGoal: 0,
        averageTime: 0,
        servicesByType: {}
      };
    }

    const ordersWithinGoal = metricsOrders.filter(order => order.atingiu_meta).length;
    const totalOrders = metricsOrders.length;
    const percentWithinGoal = (ordersWithinGoal / totalOrders) * 100;
    
    const totalTime = metricsOrders.reduce((sum, order) => sum + (order.tempo_atendimento || 0), 0);
    const averageTime = totalTime / totalOrders;
    
    console.log(`[DEBUG] calculateTimeMetrics: Ordens dentro da meta: ${ordersWithinGoal}/${totalOrders} (${percentWithinGoal.toFixed(2)}%)`);

    const servicesByType: Record<string, {
      totalOrders: number;
      withinGoal: number;
      percentWithinGoal: number;
      averageTime: number;
    }> = {};
    
    // Contagem de categorias padronizadas para depuração
    const typeCounts: Record<string, number> = {};

    metricsOrders.forEach(order => {
      // Usar a função de padronização de categoria
      const standardType = standardizeServiceCategory(order.subtipo_servico, order.motivo);
      
      // Contar para depuração
      typeCounts[standardType] = (typeCounts[standardType] || 0) + 1;
      
      // Ignorar ordens que não se encaixam nas categorias especificadas
      if (standardType === "Não classificado" || standardType === "Categoria não identificada") {
        return;
      }
      
      if (!servicesByType[standardType]) {
        servicesByType[standardType] = {
          totalOrders: 0,
          withinGoal: 0,
          percentWithinGoal: 0,
          averageTime: 0
        };
      }
      
      servicesByType[standardType].totalOrders++;
      if (order.atingiu_meta) {
        servicesByType[standardType].withinGoal++;
      }
      
      servicesByType[standardType].averageTime = (
        (servicesByType[standardType].averageTime * (servicesByType[standardType].totalOrders - 1)) + 
        (order.tempo_atendimento || 0)
      ) / servicesByType[standardType].totalOrders;
    });

    // Log de contagem de categorias padronizadas
    console.log('[DEBUG] Distribuição de categorias:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`[DEBUG]   - ${type}: ${count} ordens`);
    });
    
    // Calcular percentuais
    Object.keys(servicesByType).forEach(type => {
      const { totalOrders, withinGoal } = servicesByType[type];
      servicesByType[type].percentWithinGoal = (withinGoal / totalOrders) * 100;
    });

    return {
      ordersWithinGoal,
      ordersOutsideGoal: totalOrders - ordersWithinGoal,
      percentWithinGoal: parseFloat(percentWithinGoal.toFixed(2)),
      averageTime: parseFloat(averageTime.toFixed(2)),
      servicesByType
    };
  };

  const calculateReopeningMetrics = (filteredOrders?: ServiceOrder[]): ReopeningMetrics => {
    const reopeningPairs = getReopeningPairs(filteredOrders);
    
    let reopenedOrders = 0;
    let totalTimeBetween = 0;
    
    // Objeto para armazenar quantidade de reaberturas por técnico
    const reopeningsByTechnician: Record<string, number> = {};
    
    // Objetos para armazenar reaberturas por técnico e por segmento
    const reopeningsByTechnicianTV: Record<string, number> = {};
    const reopeningsByTechnicianFibra: Record<string, number> = {};
    
    // Objeto para armazenar reaberturas por tipo
    const reopeningsByType: Record<string, number> = {};
    
    // Objeto para armazenar reaberturas por cidade
    const reopeningsByCity: Record<string, number> = {};
    
    // Objeto para armazenar reaberturas por bairro
    const reopeningsByNeighborhood: Record<string, number> = {};
    
    // Objeto para armazenar reaberturas por tipo original com taxas
    const reopeningsByOriginalType: Record<string, { 
      reopenings: number; 
      totalOriginals: number; 
      reopeningRate: number 
    }> = {};
    
    // Objeto para armazenar reaberturas por motivo
    const reopeningsByReason: Record<string, {
      byOriginalType: Record<string, number>;
      total: number;
    }> = {};
    
    // Contador para ordens originais por tipo
    const originalOrdersByType: Record<string, number> = {};
    
    // Ordens para análise (excluindo canceladas)
    const metricsOrders = (filteredOrders || serviceOrders).filter(order => 
      order.include_in_metrics && !order.status.includes("Cancelada")
    );
    
    // Contar ordens originais por tipo
    metricsOrders.forEach(order => {
      const originalType = standardizeServiceCategory(order.subtipo_servico, order.motivo);
      originalOrdersByType[originalType] = (originalOrdersByType[originalType] || 0) + 1;
    });
    
    // Calcular taxa geral baseada apenas em ordens válidas para taxa (não canceladas)
    const metricsOrdersForRate = metricsOrders;
    
    reopeningPairs.forEach(pair => {
      reopenedOrders++;
      totalTimeBetween += pair.timeBetween;
      
      const technicianName = pair.reopeningOrder.nome_tecnico || "Técnico não informado";
      const reopeningType = pair.reopeningServiceCategory;
      const originalType = pair.originalServiceCategory;
      
      // Contagem por técnico
      reopeningsByTechnician[technicianName] = (reopeningsByTechnician[technicianName] || 0) + 1;
      
      // Contagem por técnico e segmento (TV/Fibra)
      if (pair.reopeningOrder.subtipo_servico?.includes("TV")) {
        reopeningsByTechnicianTV[technicianName] = (reopeningsByTechnicianTV[technicianName] || 0) + 1;
      } else if (pair.reopeningOrder.subtipo_servico?.includes("Fibra")) {
        reopeningsByTechnicianFibra[technicianName] = (reopeningsByTechnicianFibra[technicianName] || 0) + 1;
      }
      
      // Contagem por tipo de reabertura
      reopeningsByType[reopeningType] = (reopeningsByType[reopeningType] || 0) + 1;
      
      // Contagem por cidade
      const city = pair.reopeningOrder.cidade || "Cidade não informada";
      reopeningsByCity[city] = (reopeningsByCity[city] || 0) + 1;
      
      // Contagem por bairro
      const neighborhood = pair.reopeningOrder.bairro || "Bairro não informado";
      reopeningsByNeighborhood[neighborhood] = (reopeningsByNeighborhood[neighborhood] || 0) + 1;
      
      if (!reopeningsByOriginalType[originalType]) {
        reopeningsByOriginalType[originalType] = {
          reopenings: 0,
          totalOriginals: originalOrdersByType[originalType] || 1,
          reopeningRate: 0
        };
      }
      
      reopeningsByOriginalType[originalType].reopenings++;
      
      const reason = pair.reopeningOrder.motivo || "Motivo não especificado";
      
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
    
    // Calcular taxas de reabertura por tipo
    Object.keys(reopeningsByOriginalType).forEach(type => {
      const { reopenings, totalOriginals } = reopeningsByOriginalType[type];
      reopeningsByOriginalType[type].reopeningRate = totalOriginals > 0 
        ? (reopenings / totalOriginals) * 100 
        : 0;
    });
    
    // Calcular taxa geral de reabertura
    const reopeningRate = metricsOrdersForRate.length > 0 
      ? parseFloat(((reopenedOrders / metricsOrdersForRate.length) * 100).toFixed(2)) 
      : 0;
    
    const averageTimeBetween = reopenedOrders > 0
      ? parseFloat((totalTimeBetween / reopenedOrders).toFixed(2))
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
  };

  const getReopeningPairs = (filteredOrders?: ServiceOrder[]): ReopeningPair[] => {
    // Incluir também ordens canceladas na análise (filtragem especial para reabertura)
    const ordersForReopeningAnalysis = (filteredOrders || serviceOrders).filter(order => 
      order.include_in_metrics || (order.status === "Cancelada" && 
                                 (order.subtipo_servico === "Corretiva" || 
                                  order.subtipo_servico === "Corretiva BL"))
    );
    
    const ordersByClient: Record<string, ServiceOrder[]> = {};
    const reopeningPairs: ReopeningPair[] = [];
    
    // Agrupar ordens por cliente
    ordersForReopeningAnalysis.forEach(order => {
      if (order.codigo_cliente && order.codigo_cliente.trim() !== '') {
        if (!ordersByClient[order.codigo_cliente]) {
          ordersByClient[order.codigo_cliente] = [];
        }
        ordersByClient[order.codigo_cliente].push(order);
      }
    });
    
    // Analisar cada cliente para encontrar pares de reabertura
    Object.entries(ordersByClient).forEach(([clientCode, orders]) => {
      if (orders.length <= 1) return;
      
      // Ordenar ordens por data de criação
      orders.sort((a, b) => 
        new Date(a.data_criacao).getTime() - new Date(b.data_criacao).getTime()
      );

      // Procurar por pares de reabertura
      for (let i = 0; i < orders.length; i++) {
        const currOrder = orders[i];
        
        if (currOrder.tipo_servico?.includes("Assistência Técnica")) {
          // Rastrear a ordem de reabertura mais recente para este cliente
          let lastReopeningIndex = -1;
          let lastReopeningTime = 0;
          
          // Verificar todas as ordens anteriores (possíveis ordens originais ou reaberturas anteriores)
          for (let j = 0; j < i; j++) {
            const prevOrder = orders[j];
            
            // Para ordens canceladas, usar uma lógica especial para verificar finalização
            const isPrevOrderFinalized = prevOrder.status === "Cancelada" || 
                                     VALID_STATUS.some(status => prevOrder.status?.includes(status));
            
            const isPrevOrderOriginal = ORIGINAL_SERVICE_TYPES.some(
              type => prevOrder.subtipo_servico?.includes(type)
            );
            
            // Verificar se a OS tem "Cliente Cancelou via SAC" como ação tomada
            const isClienteCancelou = prevOrder.acao_tomada?.includes("Cliente Cancelou via SAC");
            
            // Para ordens canceladas, garantir que a data de finalização exista
            const prevFinalizationDate = prevOrder.status === "Cancelada" && !prevOrder.data_finalizacao
                                       ? prevOrder.data_criacao  // Usar data_criacao para canceladas sem finalização
                                       : prevOrder.data_finalizacao;
            
            if (isPrevOrderFinalized && isPrevOrderOriginal && 
                !isClienteCancelou && // Não considerar como reabertura se o cliente cancelou via SAC
                prevFinalizationDate && currOrder.data_criacao &&
                new Date(currOrder.data_criacao) > new Date(prevFinalizationDate) &&
                currOrder.codigo_os !== prevOrder.codigo_os) {
              
              const prevFinalization = new Date(prevFinalizationDate);
              const currCreation = new Date(currOrder.data_criacao);
              
              // Verificar se estão no mesmo mês vigente
              const sameMonth = prevFinalization.getMonth() === currCreation.getMonth() && 
                               prevFinalization.getFullYear() === currCreation.getFullYear();
              
              // Verificar a exceção: último dia do mês anterior e primeiro dia do mês atual
              const isLastDayOfMonth = (date: Date): boolean => {
                // Cria uma data para o primeiro dia do próximo mês
                const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
                // Subtrai um dia para obter o último dia do mês atual
                const lastDay = new Date(nextMonth.getTime() - 86400000);
                return date.getDate() === lastDay.getDate();
              };
              
              const isFirstDayOfMonth = (date: Date): boolean => {
                return date.getDate() === 1;
              };
              
              // Verificar se é último dia do mês -> primeiro dia do mês seguinte
              const isConsecutiveDaysAcrossMonths = 
                // Verifica se prevFinalization é o último dia do mês
                isLastDayOfMonth(prevFinalization) && 
                // Verifica se currCreation é o primeiro dia do mês
                isFirstDayOfMonth(currCreation) && 
                // Verifica se a diferença de meses é 1 (mês seguinte)
                ((currCreation.getMonth() - prevFinalization.getMonth() + 12) % 12 === 1) &&
                // Se mudou de dezembro para janeiro, verifica se o ano é consecutivo
                ((currCreation.getMonth() === 0 && prevFinalization.getMonth() === 11) 
                  ? currCreation.getFullYear() - prevFinalization.getFullYear() === 1
                  : currCreation.getFullYear() === prevFinalization.getFullYear());
              
              // Só considerar reabertura se estiver no mesmo mês OU se for a exceção de data consecutiva entre meses
              if (sameMonth || isConsecutiveDaysAcrossMonths) {
                // Guardar o índice e o timestamp da finalização da ordem mais recente
                if (prevFinalization.getTime() > lastReopeningTime) {
                  lastReopeningTime = prevFinalization.getTime();
                  lastReopeningIndex = j;
                }
              }
            }
          }
          
          // Se encontramos uma ordem válida para fazer o pareamento
          if (lastReopeningIndex >= 0) {
            const mostRecentOrder = orders[lastReopeningIndex];
            const mostRecentFinalizationDate = mostRecentOrder.status === "Cancelada" && !mostRecentOrder.data_finalizacao
                                             ? mostRecentOrder.data_criacao
                                             : mostRecentOrder.data_finalizacao;
            
            const mostRecentFinalization = new Date(mostRecentFinalizationDate);
            const currCreation = new Date(currOrder.data_criacao);
            
            // Calcular tempos entre as ordens
            const timeBetween = (currCreation.getTime() - mostRecentFinalization.getTime()) / (1000 * 60 * 60);
            const diffDays = (currCreation.getTime() - mostRecentFinalization.getTime()) / (1000 * 60 * 60 * 24);
            
            // Identificar a categoria do serviço para ambas as ordens
            const originalServiceCategory = standardizeServiceCategory(
              mostRecentOrder.subtipo_servico || "",
              mostRecentOrder.motivo || ""
            );
            
            const reopeningServiceCategory = standardizeServiceCategory(
              currOrder.subtipo_servico || "",
              currOrder.motivo || ""
            );
            
            reopeningPairs.push({
              originalOrder: mostRecentOrder, // Aqui estamos usando a ordem mais recente como "original"
              reopeningOrder: currOrder,
              timeBetween: parseFloat(timeBetween.toFixed(2)),
              daysBetween: parseFloat(diffDays.toFixed(1)),
              originalServiceCategory,
              reopeningServiceCategory
            });
          }
        }
      }
    });
    
    // Ordenar pares por data de criação da reabertura (mais recente primeiro)
    return reopeningPairs.sort((a, b) => 
      new Date(b.reopeningOrder.data_criacao).getTime() - new Date(a.reopeningOrder.data_criacao).getTime()
    );
  };

  // Lista de técnicos únicos
  const technicians = useMemo(() => {
    return Array.from(
      new Set(serviceOrders.map(order => order.nome_tecnico))
    );
  }, [serviceOrders]);

  return (
    <DataServiceOrdersContext.Provider value={{ 
      serviceOrders,
      loading,
      technicians,
      importServiceOrders,
      calculateTimeMetrics,
      calculateReopeningMetrics,
      getReopeningPairs
    }}>
      {children}
    </DataServiceOrdersContext.Provider>
  );
};

export { DataServiceOrdersContext }; 