import React, { createContext, useContext, useState } from 'react';
import { 
  ServiceOrder, User, SERVICE_TIME_GOALS, VALID_STATUS, ReopeningPair,
  Venda, PrimeiroPagamento, PermanenciaMetrics, VendedorMetrics
} from '../types';
import { 
  VALID_SUBTYPES, 
  ALL_VALID_SUBTYPES,
  EXCLUDED_REASONS,
  CITY_NAME_MAP,
  NEIGHBORHOOD_NAME_MAP,
  normalizeCityName,
  normalizeNeighborhoodName,
  getServiceGoalBySubtype,
  standardizeServiceCategory
} from "./DataUtils";
import { ajustarTempoAtendimento } from '../utils/holidays';

interface DataContextType {
  serviceOrders: ServiceOrder[];
  vendas: Venda[];
  primeirosPagamentos: PrimeiroPagamento[];
  importServiceOrders: (orders: ServiceOrder[], append?: boolean) => void;
  importVendas: (vendas: Venda[], append?: boolean) => void;
  importPrimeirosPagamentos: (pagamentos: PrimeiroPagamento[], append?: boolean) => void;
  clearData: () => void;
  loading: boolean;
  calculateTimeMetrics: (filteredOrders?: ServiceOrder[]) => {
    ordersWithinGoal: number;
    ordersOutsideGoal: number;
    percentWithinGoal: number;
    averageTime: number;
    servicesByType: Record<string, {
      totalOrders: number;
      withinGoal: number;
      percentWithinGoal: number;
      averageTime: number;
    }>;
  };
  calculateReopeningMetrics: (filteredOrders?: ServiceOrder[]) => {
    reopenedOrders: number;
    reopeningRate: number;
    averageTimeBetween: number;
    reopeningsByTechnician: Record<string, number>;
    reopeningsByTechnicianTV: Record<string, number>;
    reopeningsByTechnicianFibra: Record<string, number>;
    reopeningsByType: Record<string, number>;
    reopeningsByCity: Record<string, number>;
    reopeningsByNeighborhood: Record<string, number>;
    reopeningsByOriginalType: Record<string, { 
      reopenings: number; 
      totalOriginals: number; 
      reopeningRate: number 
    }>;
    reopeningsByReason: Record<string, {
      byOriginalType: Record<string, number>;
      total: number;
    }>;
  };
  getReopeningPairs: (filteredOrders?: ServiceOrder[]) => ReopeningPair[];
  calculatePermanenciaMetrics: () => PermanenciaMetrics;
  calculateVendedorMetrics: () => VendedorMetrics[];
  technicians: string[];
  vendedores: string[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [primeirosPagamentos, setPrimeirosPagamentos] = useState<PrimeiroPagamento[]>([]);
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
      } else {
        console.log(`Nenhuma nova ordem de serviço para adicionar (${processedOrders.length} duplicadas ignoradas)`);
      }
    } else {
      // Substituir completamente
      setServiceOrders(processedOrders);
      console.log(`Importadas ${processedOrders.length} ordens de serviço válidas de um total de ${orders.length}`);
    }
    
    setLoading(false);
  };

  const importVendas = (novasVendas: Venda[], append: boolean = false) => {
    setLoading(true);
    
    // Processar as vendas
    const processedVendas = novasVendas.map(venda => {
      // Calcular dias corridos desde a habilitação
      const dataHabilitacao = new Date(venda.data_habilitacao);
      const hoje = new Date();
      const diffTime = Math.abs(hoje.getTime() - dataHabilitacao.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...venda,
        dias_corridos: diffDays
      };
    });
    
    if (append) {
      // Verificar duplicidades baseado no número da proposta
      const existingPropostas = new Set(vendas.map(v => v.numero_proposta));
      const novaVendasFiltradas = processedVendas.filter(v => !existingPropostas.has(v.numero_proposta));
      
      setVendas(prevVendas => [...prevVendas, ...novaVendasFiltradas]);
      console.log(`Adicionadas ${novaVendasFiltradas.length} novas vendas (${processedVendas.length - novaVendasFiltradas.length} duplicadas ignoradas)`);
    } else {
      setVendas(processedVendas);
      console.log(`Importadas ${processedVendas.length} vendas`);
    }
    
    setLoading(false);
  };
  
  const importPrimeirosPagamentos = (pagamentos: PrimeiroPagamento[], append: boolean = false) => {
    setLoading(true);
    
    if (append) {
      // Novo map para armazenar o registro mais recente para cada proposta
      const propostaMap = new Map<string, PrimeiroPagamento>();
      
      // Primeiro, adicionar todos os registros existentes ao map
      primeirosPagamentos.forEach(pagamento => {
        const propostaKey = pagamento.proposta;
        
        // Se já existe um registro com essa proposta, comparar as datas
        if (propostaMap.has(propostaKey)) {
          const existingPagamento = propostaMap.get(propostaKey)!;
          
          // Manter apenas o registro mais recente
          if (new Date(pagamento.data_importacao) > new Date(existingPagamento.data_importacao)) {
            propostaMap.set(propostaKey, pagamento);
          }
        } else {
          propostaMap.set(propostaKey, pagamento);
        }
      });
      
      // Agora processar os novos pagamentos
      pagamentos.forEach(novoPagamento => {
        const propostaKey = novoPagamento.proposta;
        
        // Se já existe um registro com essa proposta, comparar as datas
        if (propostaMap.has(propostaKey)) {
          const existingPagamento = propostaMap.get(propostaKey)!;
          
          // Substituir apenas se o novo registro for mais recente
          if (new Date(novoPagamento.data_importacao) > new Date(existingPagamento.data_importacao)) {
            propostaMap.set(propostaKey, novoPagamento);
            console.log(`Atualizado pagamento para proposta ${propostaKey} (registro mais recente)`);
          } else {
            console.log(`Ignorado pagamento para proposta ${propostaKey} (registro mais antigo)`);
          }
        } else {
          // Proposta não existia, adicionar ao map
          propostaMap.set(propostaKey, novoPagamento);
          console.log(`Adicionado novo pagamento para proposta ${propostaKey}`);
        }
      });
      
      // Converter o map de volta para um array
      const pagamentosAtualizados = Array.from(propostaMap.values());
      setPrimeirosPagamentos(pagamentosAtualizados);
      
      console.log(`Processados ${pagamentos.length} pagamentos. Resultado final: ${pagamentosAtualizados.length} registros.`);
    } else {
      // Se não for append, apenas substitui todos os registros
      setPrimeirosPagamentos(pagamentos);
      console.log(`Importados ${pagamentos.length} pagamentos`);
    }
    
    setLoading(false);
  };

  const clearData = () => {
    setServiceOrders([]);
    setVendas([]);
    setPrimeirosPagamentos([]);
  };

  const calculateTimeMetrics = (filteredOrders?: ServiceOrder[]) => {
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
    
    // Log de métricas por tipo de serviço
    console.log('[DEBUG] Métricas por tipo de serviço:');
    Object.entries(servicesByType).forEach(([type, metrics]) => {
      console.log(`[DEBUG]   - ${type}: ${metrics.withinGoal}/${metrics.totalOrders} dentro da meta (${metrics.percentWithinGoal.toFixed(2)}%), tempo médio: ${metrics.averageTime.toFixed(2)}h`);
    });

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

  const calculateReopeningMetrics = (filteredOrders?: ServiceOrder[]) => {
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
    
    // Adicionalmente, para o cálculo da taxa, consideramos apenas os tipos de serviço que podem gerar reaberturas
    const metricsOrdersForRate = metricsOrders.filter(order => 
      VALID_SUBTYPES.some(type => order.subtipo_servico?.includes(type))
    );
    
    // Contar ordens originais por tipo para análise de taxa
    metricsOrdersForRate.forEach(order => {
      const type = order.subtipo_servico || "Desconhecido";
      originalOrdersByType[type] = (originalOrdersByType[type] || 0) + 1;
    });
    
    // Processar pares de reabertura
    reopeningPairs.forEach(pair => {
      reopenedOrders++;
      totalTimeBetween += pair.timeBetween;
      
      // Alteração: Usar o técnico da OS original em vez do técnico da reabertura
      const techName = pair.originalOrder.nome_tecnico || "Desconhecido";
      reopeningsByTechnician[techName] = (reopeningsByTechnician[techName] || 0) + 1;
      
      // Processar por segmento
      const originalCategory = pair.originalServiceCategory || "Não classificado";
      
      if (originalCategory.includes("TV")) {
        reopeningsByTechnicianTV[techName] = (reopeningsByTechnicianTV[techName] || 0) + 1;
      } else if (originalCategory.includes("FIBRA")) {
        reopeningsByTechnicianFibra[techName] = (reopeningsByTechnicianFibra[techName] || 0) + 1;
      }
      
      const serviceType = pair.reopeningOrder.subtipo_servico || "Desconhecido";
      reopeningsByType[serviceType] = (reopeningsByType[serviceType] || 0) + 1;
      
      const city = normalizeCityName(pair.reopeningOrder.cidade) || "Desconhecido";
      reopeningsByCity[city] = (reopeningsByCity[city] || 0) + 1;
      
      const neighborhood = normalizeNeighborhoodName(pair.reopeningOrder.bairro) || "Desconhecido";
      reopeningsByNeighborhood[neighborhood] = (reopeningsByNeighborhood[neighborhood] || 0) + 1;
      
      const originalType = pair.originalOrder.subtipo_servico || "Desconhecido";
      
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
          for (let j = 0; j < i; j++) {
            const prevOrder = orders[j];
            
            // Para ordens canceladas, usar uma lógica especial para verificar finalização
            const isPrevOrderFinalized = prevOrder.status === "Cancelada" || 
                                     VALID_STATUS.some(status => prevOrder.status?.includes(status));
            
            const isPrevOrderOriginal = ["Ponto Principal", "Ponto Principal BL", "Corretiva", "Corretiva BL"].some(
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
              
              // Calcular a diferença em dias entre a finalização da OS primária e criação da secundária
              const diffTime = currCreation.getTime() - prevFinalization.getTime();
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              
              // Verificar se a diferença é de até 30 dias corridos
              if (diffDays <= 30) {
                const timeBetween = (currCreation.getTime() - prevFinalization.getTime()) / (1000 * 60 * 60);
                
                // Identificar a categoria do serviço (TV ou Fibra) para ambas as ordens
                const originalServiceCategory = standardizeServiceCategory(
                  prevOrder.subtipo_servico || "",
                  prevOrder.motivo || ""
                );
                
                const reopeningServiceCategory = standardizeServiceCategory(
                  currOrder.subtipo_servico || "",
                  currOrder.motivo || ""
                );
                
                reopeningPairs.push({
                  originalOrder: prevOrder,
                  reopeningOrder: currOrder,
                  timeBetween: parseFloat(timeBetween.toFixed(2)),
                  daysBetween: parseFloat(diffDays.toFixed(1)),
                  originalServiceCategory,
                  reopeningServiceCategory
                });
                
                break;
              }
            }
          }
        }
      }
    });
    
    // Ordenar pares por data de criação da reabertura (mais recente primeiro)
    return reopeningPairs.sort((a, b) => 
      new Date(b.reopeningOrder.data_criacao).getTime() - new Date(a.reopeningOrder.data_criacao).getTime()
    );
  };

  // Processar inclusões (vendas BL-DGO sem pagamento correspondente)
  const processarInclusoes = (): PrimeiroPagamento[] => {
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
    
    console.log(`Processando ${vendasBLDGOSemPagamento.length} inclusões (vendas BL-DGO sem pagamento correspondente)`);
    
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
        status_pacote: "I", // I de Inclusão
        data_importacao: new Date().toISOString() // Data atual como data de importação
      };
    });
    
    return inclusoes;
  };

  const calculatePermanenciaMetrics = (): PermanenciaMetrics => {
    // Se não houver dados, retornar métricas vazias
    if (vendas.length === 0) {
      return {
        total_clientes: 0,
        adimplentes: 0,
        inadimplentes: 0,
        cancelados: 0,
        percentual_adimplentes: 0,
        percentual_inadimplentes: 0,
        percentual_cancelados: 0
      };
    }
    
    // Mapear vendas por número de proposta
    const vendasMap = new Map<string, Venda>();
    vendas.forEach(venda => {
      vendasMap.set(venda.numero_proposta, venda);
    });
    
    // Contar clientes por categoria
    let adimplentes = 0;
    let inadimplentes = 0;
    let cancelados = 0;
    
    // Processar pagamentos e classificar clientes
    primeirosPagamentos.forEach(pagamento => {
      const venda = vendasMap.get(pagamento.proposta);
      
      if (venda) {
        // Nova lógica de classificação conforme regras definidas
        if (pagamento.status_pacote === 'C') {
          cancelados++;
        } else if (pagamento.status_pacote === 'S') {
          inadimplentes++;
        } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
          adimplentes++;
        } else if (pagamento.passo === '0' || pagamento.passo === '1') {
          adimplentes++;
        } else if (pagamento.status_pacote === 'I') {
          // Considerar inclusões como clientes ativos (adimplentes)
          adimplentes++;
        } else {
          inadimplentes++;
        }
      }
    });
    
    // Processar inclusões (vendas BL-DGO sem pagamento correspondente)
    const propostasComPagamento = new Set(primeirosPagamentos.map(p => p.proposta));
    const vendasBLDGOSemPagamento = vendas.filter(venda => {
      // Verificar se é BL-DGO
      const ehBLDGO = venda.agrupamento_produto?.includes('BL-DGO') || venda.produto_principal?.includes('BL-DGO');
      
      // Verificar se não tem pagamento correspondente
      const naoTemPagamento = !propostasComPagamento.has(venda.numero_proposta);
      
      return ehBLDGO && naoTemPagamento;
    });
    
    // Adicionar inclusões como adimplentes
    adimplentes += vendasBLDGOSemPagamento.length;
    
    const total_clientes = adimplentes + inadimplentes + cancelados;
    
    return {
      total_clientes,
      adimplentes,
      inadimplentes,
      cancelados,
      percentual_adimplentes: total_clientes > 0 ? (adimplentes / total_clientes) * 100 : 0,
      percentual_inadimplentes: total_clientes > 0 ? (inadimplentes / total_clientes) * 100 : 0,
      percentual_cancelados: total_clientes > 0 ? (cancelados / total_clientes) * 100 : 0
    };
  };
  
  const calculateVendedorMetrics = (): VendedorMetrics[] => {
    // Se não houver dados, retornar array vazio
    if (vendas.length === 0) {
      return [];
    }
    
    // Mapear vendas por vendedor
    const vendedoresMap = new Map<string, {
      id_vendedor: string;
      nome_vendedor: string;
      total_vendas: number;
      total_propostas: number;
      clientes_por_status: {
        adimplentes: number;
        inadimplentes: number;
        cancelados: number;
      };
      propostas: Set<string>;
    }>();
    
    // Agrupar vendas por vendedor
    vendas.forEach(venda => {
      const id = venda.id_vendedor;
      
      if (!vendedoresMap.has(id)) {
        vendedoresMap.set(id, {
          id_vendedor: id,
          nome_vendedor: '',  // Será atualizado ao processar as vendas
          total_vendas: 0,
          total_propostas: 0,
          clientes_por_status: {
            adimplentes: 0,
            inadimplentes: 0,
            cancelados: 0
          },
          propostas: new Set<string>()
        });
      }
      
      const vendedorData = vendedoresMap.get(id)!;
      vendedorData.nome_vendedor = vendedorData.nome_vendedor || id; // Usar ID como nome se não houver nome
      vendedorData.total_propostas++;
      vendedorData.propostas.add(venda.numero_proposta);
      
      // Contar como venda se o status for de venda concluída
      if (venda.status_proposta.toLowerCase().includes('habilitada') || 
          venda.status_proposta.toLowerCase().includes('finalizada')) {
        vendedorData.total_vendas++;
      }
    });
    
    // Mapear primeiro pagamento por proposta
    const pagamentosMap = new Map<string, PrimeiroPagamento>();
    primeirosPagamentos.forEach(pagamento => {
      pagamentosMap.set(pagamento.proposta, pagamento);
    });
    
    // Processar status dos clientes para cada vendedor
    vendedoresMap.forEach((vendedorData, id) => {
      vendedorData.propostas.forEach(proposta => {
        const pagamento = pagamentosMap.get(proposta);
        
        if (pagamento) {
          // Nova lógica de classificação conforme regras definidas
          if (pagamento.status_pacote === 'C') {
            vendedorData.clientes_por_status.cancelados++;
          } else if (pagamento.status_pacote === 'S') {
            vendedorData.clientes_por_status.inadimplentes++;
          } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
            vendedorData.clientes_por_status.adimplentes++;
          } else if (pagamento.passo === '0' || pagamento.passo === '1') {
            vendedorData.clientes_por_status.adimplentes++;
          } else {
            vendedorData.clientes_por_status.inadimplentes++;
          }
        }
      });
    });
    
    // Converter o Map para array de métricas de vendedor
    return Array.from(vendedoresMap.values()).map(data => {
      const total_clientes = data.clientes_por_status.adimplentes +
                            data.clientes_por_status.inadimplentes +
                            data.clientes_por_status.cancelados;
                            
      return {
        id_vendedor: data.id_vendedor,
        nome_vendedor: data.nome_vendedor,
        total_vendas: data.total_vendas,
        total_propostas: data.total_propostas,
        taxa_conversao: data.total_propostas > 0 ? (data.total_vendas / data.total_propostas) * 100 : 0,
        clientes_adimplentes: data.clientes_por_status.adimplentes,
        clientes_inadimplentes: data.clientes_por_status.inadimplentes,
        clientes_cancelados: data.clientes_por_status.cancelados,
        percentual_adimplentes: total_clientes > 0 ? (data.clientes_por_status.adimplentes / total_clientes) * 100 : 0,
        percentual_inadimplentes: total_clientes > 0 ? (data.clientes_por_status.inadimplentes / total_clientes) * 100 : 0,
        percentual_cancelados: total_clientes > 0 ? (data.clientes_por_status.cancelados / total_clientes) * 100 : 0
      };
    });
  };

  // Este método retorna todos os técnicos, incluindo aqueles que têm apenas serviços
  // dos tipos que não são incluídos nas métricas de tempo e reabertura
  const technicians = Array.from(
    new Set(serviceOrders.map(order => order.nome_tecnico))
  );
  
  // Lista de vendedores com base nos dados de vendas
  const vendedores = Array.from(
    new Set(vendas.map(venda => venda.id_vendedor))
  );

  return (
    <DataContext.Provider value={{ 
      serviceOrders, 
      vendas,
      primeirosPagamentos,
      importServiceOrders, 
      importVendas,
      importPrimeirosPagamentos,
      clearData, 
      loading, 
      calculateTimeMetrics,
      calculateReopeningMetrics,
      getReopeningPairs,
      calculatePermanenciaMetrics,
      calculateVendedorMetrics,
      technicians,
      vendedores
    }}>
      {children}
    </DataContext.Provider>
  );
};

// Exportamos apenas o componente provider, o hook useData foi movido para um arquivo separado
export { DataContext };
