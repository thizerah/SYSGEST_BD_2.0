import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  ServiceOrder, User, SERVICE_TIME_GOALS, VALID_STATUS, ReopeningPair,
  Venda, PrimeiroPagamento, PermanenciaMetrics, VendedorMetrics,
  Meta, VendaMeta, MetaMetrics, MetaCategoria, BaseData
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

// Sistema de logs otimizado
const isDevelopment = process.env.NODE_ENV === 'development';
const isVerboseDebug = isDevelopment && localStorage.getItem('sysgest_debug_verbose') === 'true';

const debugLog = (message: string, data?: unknown) => {
  if (isVerboseDebug) {
    console.log(message, data);
  }
};

const infoLog = (message: string, data?: unknown) => {
  if (isDevelopment) {
    console.log(message, data);
  }
};

interface ImportResult {
  totalProcessed: number;
  newRecords: number;
  duplicatesIgnored: number;
}

interface DataContextType {
  serviceOrders: ServiceOrder[];
  vendas: Venda[];
  primeirosPagamentos: PrimeiroPagamento[];
  metas: Meta[];
  vendasMeta: VendaMeta[];
  baseData: BaseData[];
  importServiceOrders: (orders: ServiceOrder[], append?: boolean) => ImportResult;
  importVendas: (vendas: Venda[], append?: boolean) => ImportResult;
  importPrimeirosPagamentos: (pagamentos: PrimeiroPagamento[], append?: boolean) => ImportResult;
  importMetas: (metas: Meta[], append?: boolean) => ImportResult;
  importVendasMeta: (vendasMeta: VendaMeta[], append?: boolean) => ImportResult;
  importBaseData: (baseData: BaseData[], append?: boolean) => ImportResult;
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
  calculateMetaMetrics: (mes?: number, ano?: number) => MetaMetrics | null;
  mapearCategoriaVenda: (venda: Venda | VendaMeta) => string;
  technicians: string[];
  vendedores: string[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Chaves para localStorage (fora do componente para evitar recriações)
const STORAGE_KEYS = {
  SERVICE_ORDERS: 'sysgest_service_orders',
  VENDAS: 'sysgest_vendas',
  PAGAMENTOS: 'sysgest_pagamentos',
  METAS: 'sysgest_metas',
  VENDAS_META: 'sysgest_vendas_meta',
  BASE_DATA: 'sysgest_base_data'
} as const;

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [primeirosPagamentos, setPrimeirosPagamentos] = useState<PrimeiroPagamento[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [vendasMeta, setVendasMeta] = useState<VendaMeta[]>([]);
  const [baseData, setBaseData] = useState<BaseData[]>([]);
  const [loading, setLoading] = useState(false);

  // Funções auxiliares para localStorage
  const saveToLocalStorage = (key: string, data: unknown[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      infoLog(`[PERSISTÊNCIA] Dados salvos no localStorage: ${key} (${data.length} registros)`);
    } catch (error) {
      console.error(`[PERSISTÊNCIA] Erro ao salvar ${key}:`, error);
    }
  };

  const loadFromLocalStorage = <T,>(key: string): T[] => {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        infoLog(`[PERSISTÊNCIA] Dados carregados do localStorage: ${key} (${parsed.length} registros)`);
        return parsed;
      }
    } catch (error) {
      console.error(`[PERSISTÊNCIA] Erro ao carregar ${key}:`, error);
    }
    return [];
  };

  // Carregar dados do localStorage ao inicializar
  useEffect(() => {
    infoLog('[PERSISTÊNCIA] Carregando dados do localStorage...');
    
    const loadedServiceOrders = loadFromLocalStorage<ServiceOrder>(STORAGE_KEYS.SERVICE_ORDERS);
    const loadedVendas = loadFromLocalStorage<Venda>(STORAGE_KEYS.VENDAS);
    const loadedPagamentos = loadFromLocalStorage<PrimeiroPagamento>(STORAGE_KEYS.PAGAMENTOS);
    const loadedMetas = loadFromLocalStorage<Meta>(STORAGE_KEYS.METAS);
    const loadedVendasMeta = loadFromLocalStorage<VendaMeta>(STORAGE_KEYS.VENDAS_META);
    const loadedBaseData = loadFromLocalStorage<BaseData>(STORAGE_KEYS.BASE_DATA);

    if (loadedServiceOrders.length > 0) setServiceOrders(loadedServiceOrders);
    if (loadedVendas.length > 0) setVendas(loadedVendas);
    if (loadedPagamentos.length > 0) setPrimeirosPagamentos(loadedPagamentos);
    if (loadedMetas.length > 0) setMetas(loadedMetas);
    if (loadedVendasMeta.length > 0) setVendasMeta(loadedVendasMeta);
    if (loadedBaseData.length > 0) setBaseData(loadedBaseData);

    infoLog('[PERSISTÊNCIA] Carregamento concluído');
  }, []); // Array vazio pois STORAGE_KEYS são constantes e loadFromLocalStorage não muda

  const importServiceOrders = (orders: ServiceOrder[], append: boolean = false): ImportResult => {
    setLoading(true);
    
    // Pré-processamento para casos cancelados: usar data de criação como finalização se necessário
    const preparedOrders = orders.map(order => {
              // Verificar se é um caso cancelado sem data de finalização
        if (order.status === "Cancelada" && 
            (order.subtipo_servico === "Corretiva" || order.subtipo_servico === "Corretiva BL") && 
            (!order.data_finalizacao || order.data_finalizacao.trim() === "") && 
            order.data_criacao) {
          debugLog(`[OS CANCELADA] ${order.codigo_os} (${order.subtipo_servico}): Usando data de criação como finalização`);
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
        debugLog(`[OS CANCELADA] ${order.codigo_os} incluída apenas para análise de reabertura`);
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
        debugLog(`[OS EXCLUÍDA] ${order.codigo_os}: ${!order.data_criacao ? 'Sem data criação' : !order.data_finalizacao ? 'Sem data finalização' : 'Subtipo não válido'}`);
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
        debugLog(`[OS TIPO] ${order.codigo_os} excluída: "${order.subtipo_servico}" -> "${standardType}"`);
      } else {
        debugLog(`[OS TIPO] ${order.codigo_os} incluída: "${order.subtipo_servico}" -> "${standardType}"`);
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
    
    let newRecords = 0;
    let duplicatesIgnored = 0;
    
    if (append) {
      // Se append for true, verificar duplicidades antes de adicionar
      const existingOrderIds = new Set(serviceOrders.map(order => order.codigo_os));
      const newOrdersFiltered = processedOrders.filter(order => !existingOrderIds.has(order.codigo_os));
      
      if (newOrdersFiltered.length > 0) {
        const finalOrders = [...serviceOrders, ...newOrdersFiltered];
        setServiceOrders(finalOrders);
        newRecords = newOrdersFiltered.length;
        duplicatesIgnored = processedOrders.length - newOrdersFiltered.length;
        infoLog(`Adicionadas ${newOrdersFiltered.length} novas ordens de serviço (${duplicatesIgnored} duplicadas ignoradas)`);
        
        // Salvar no localStorage
        saveToLocalStorage(STORAGE_KEYS.SERVICE_ORDERS, finalOrders);
      } else {
        newRecords = 0;
        duplicatesIgnored = processedOrders.length;
        infoLog(`Nenhuma nova ordem de serviço para adicionar (${processedOrders.length} duplicadas ignoradas)`);
      }
    } else {
      // Substituir completamente
      setServiceOrders(processedOrders);
      newRecords = processedOrders.length;
      duplicatesIgnored = 0;
      infoLog(`Importadas ${processedOrders.length} ordens de serviço válidas de um total de ${orders.length}`);
      
      // Salvar no localStorage
      saveToLocalStorage(STORAGE_KEYS.SERVICE_ORDERS, processedOrders);
    }
    
    setLoading(false);

    return {
      totalProcessed: orders.length,
      newRecords,
      duplicatesIgnored
    };
  };

  const importVendas = (novasVendas: Venda[], append: boolean = false): ImportResult => {
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
    
    let newRecords = 0;
    let duplicatesIgnored = 0;
    
    if (append) {
      // Verificar duplicidades baseado no número da proposta
      const existingPropostas = new Set(vendas.map(v => v.numero_proposta));
      const novaVendasFiltradas = processedVendas.filter(v => !existingPropostas.has(v.numero_proposta));
      
      const finalVendas = [...vendas, ...novaVendasFiltradas];
      setVendas(finalVendas);
      newRecords = novaVendasFiltradas.length;
      duplicatesIgnored = processedVendas.length - novaVendasFiltradas.length;
              infoLog(`Adicionadas ${novaVendasFiltradas.length} novas vendas (${duplicatesIgnored} duplicadas ignoradas)`);
      
      // Salvar no localStorage
      saveToLocalStorage(STORAGE_KEYS.VENDAS, finalVendas);
    } else {
      setVendas(processedVendas);
      newRecords = processedVendas.length;
      duplicatesIgnored = 0;
      infoLog(`Importadas ${processedVendas.length} vendas`);
      
      // Salvar no localStorage
      saveToLocalStorage(STORAGE_KEYS.VENDAS, processedVendas);
    }
    
    setLoading(false);

    return {
      totalProcessed: novasVendas.length,
      newRecords,
      duplicatesIgnored
    };
  };
  
  const importPrimeirosPagamentos = (pagamentos: PrimeiroPagamento[], append: boolean = false): ImportResult => {
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
            debugLog(`[PAGAMENTO] Atualizado proposta ${propostaKey} (registro mais recente)`);
          } else {
                          debugLog(`[PAGAMENTO] Ignorado proposta ${propostaKey} (registro mais antigo)`);
          }
        } else {
          // Proposta não existia, adicionar ao map
          propostaMap.set(propostaKey, novoPagamento);
                      debugLog(`[PAGAMENTO] Adicionado novo pagamento para proposta ${propostaKey}`);
        }
      });
      
      // Converter o map de volta para um array
      const pagamentosAtualizados = Array.from(propostaMap.values());
      const novosRegistros = pagamentosAtualizados.length - primeirosPagamentos.length;
      const duplicatasIgnoradas = pagamentos.length - novosRegistros;
      
      setPrimeirosPagamentos(pagamentosAtualizados);
      
      // Salvar no localStorage
      saveToLocalStorage(STORAGE_KEYS.PAGAMENTOS, pagamentosAtualizados);
      
      infoLog(`Processados ${pagamentos.length} pagamentos. Resultado final: ${pagamentosAtualizados.length} registros.`);
      
      setLoading(false);
      
      return {
        totalProcessed: pagamentos.length,
        newRecords: Math.max(0, novosRegistros),
        duplicatesIgnored: Math.max(0, duplicatasIgnoradas)
      };
    } else {
      // Se não for append, apenas substitui todos os registros
      setPrimeirosPagamentos(pagamentos);
      
      // Salvar no localStorage
      saveToLocalStorage(STORAGE_KEYS.PAGAMENTOS, pagamentos);
      
      infoLog(`Importados ${pagamentos.length} pagamentos`);
      
      setLoading(false);
      
      return {
        totalProcessed: pagamentos.length,
        newRecords: pagamentos.length,
        duplicatesIgnored: 0
      };
    }
  };

  const importMetas = (novasMetas: Meta[], append: boolean = false): ImportResult => {
    setLoading(true);
    
    try {
      let finalMetas: Meta[];
      let newRecords = 0;
      let duplicatesIgnored = 0;
      
      if (append) {
        // Se append for true, verificar duplicidades antes de adicionar
        const existingMetasKeys = new Set(metas.map(m => `${m.mes}-${m.ano}`));
        const newMetasFiltered = novasMetas.filter(m => !existingMetasKeys.has(`${m.mes}-${m.ano}`));
        
        if (newMetasFiltered.length > 0) {
          finalMetas = [...metas, ...newMetasFiltered];
          setMetas(finalMetas);
          newRecords = newMetasFiltered.length;
          duplicatesIgnored = novasMetas.length - newMetasFiltered.length;
          infoLog(`Adicionadas ${newMetasFiltered.length} novas metas (${duplicatesIgnored} duplicadas ignoradas)`);
        } else {
          finalMetas = metas;
          newRecords = 0;
          duplicatesIgnored = novasMetas.length;
                      infoLog("Nenhuma nova meta para adicionar (todas já existem)");
        }
      } else {
        finalMetas = novasMetas;
        setMetas(finalMetas);
        newRecords = novasMetas.length;
        duplicatesIgnored = 0;
        infoLog(`Importadas ${novasMetas.length} metas`);
      }
      
      // Salvar no localStorage
      saveToLocalStorage(STORAGE_KEYS.METAS, finalMetas);
      
      return {
        totalProcessed: novasMetas.length,
        newRecords,
        duplicatesIgnored
      };
    } catch (error) {
      console.error('Erro ao importar metas:', error);
      return {
        totalProcessed: novasMetas.length,
        newRecords: 0,
        duplicatesIgnored: novasMetas.length
      };
    } finally {
      setLoading(false);
    }
  };

  const importVendasMeta = (novasVendasMeta: VendaMeta[], append: boolean = false): ImportResult => {
    setLoading(true);
    
    try {
      let finalVendasMeta: VendaMeta[];
      let newRecords = 0;
      let duplicatesIgnored = 0;
      
      if (append) {
        // Se append for true, verificar duplicidades antes de adicionar
        const existingVendasKeys = new Set(vendasMeta.map(v => v.numero_proposta));
        const newVendasFiltered = novasVendasMeta.filter(v => !existingVendasKeys.has(v.numero_proposta));
        
        if (newVendasFiltered.length > 0) {
          finalVendasMeta = [...vendasMeta, ...newVendasFiltered];
          setVendasMeta(finalVendasMeta);
          newRecords = newVendasFiltered.length;
          duplicatesIgnored = novasVendasMeta.length - newVendasFiltered.length;
          infoLog(`Adicionadas ${newVendasFiltered.length} novas vendas de meta (${duplicatesIgnored} duplicadas ignoradas)`);
        } else {
          finalVendasMeta = vendasMeta;
          newRecords = 0;
          duplicatesIgnored = novasVendasMeta.length;
                      infoLog("Nenhuma nova venda de meta para adicionar (todas já existem)");
        }
      } else {
        finalVendasMeta = novasVendasMeta;
        setVendasMeta(finalVendasMeta);
        newRecords = novasVendasMeta.length;
        duplicatesIgnored = 0;
        infoLog(`Importadas ${novasVendasMeta.length} vendas de meta`);
      }
      
      // Salvar no localStorage
      saveToLocalStorage(STORAGE_KEYS.VENDAS_META, finalVendasMeta);
      
      return {
        totalProcessed: novasVendasMeta.length,
        newRecords,
        duplicatesIgnored
      };
    } catch (error) {
      console.error('Erro ao importar vendas de meta:', error);
      return {
        totalProcessed: novasVendasMeta.length,
        newRecords: 0,
        duplicatesIgnored: novasVendasMeta.length
      };
    } finally {
      setLoading(false);
    }
  };

  const importBaseData = (novoBaseData: BaseData[], append: boolean = false): ImportResult => {
    setLoading(true);
    
    let newRecords = 0;
    let duplicatesIgnored = 0;
    
    if (append) {
      // Se append for true, verificar duplicidades antes de adicionar
      const existingBaseDataKeys = new Set(baseData.map(b => b.mes));
      const newBaseDataFiltered = novoBaseData.filter(b => !existingBaseDataKeys.has(b.mes));
      
      if (newBaseDataFiltered.length > 0) {
        const finalBaseData = [...baseData, ...newBaseDataFiltered];
        setBaseData(finalBaseData);
        saveToLocalStorage(STORAGE_KEYS.BASE_DATA, finalBaseData);
        newRecords = newBaseDataFiltered.length;
        duplicatesIgnored = novoBaseData.length - newBaseDataFiltered.length;
        infoLog(`Adicionadas ${newBaseDataFiltered.length} novas informações base (${duplicatesIgnored} duplicadas ignoradas)`);
      } else {
        newRecords = 0;
        duplicatesIgnored = novoBaseData.length;
        infoLog(`Nenhuma nova informação base para adicionar (${novoBaseData.length} duplicadas ignoradas)`);
      }
    } else {
      // Substituir completamente
      setBaseData(novoBaseData);
      newRecords = novoBaseData.length;
      duplicatesIgnored = 0;
      infoLog(`Importadas ${novoBaseData.length} informações base`);
      
      // Salvar no localStorage
      saveToLocalStorage(STORAGE_KEYS.BASE_DATA, novoBaseData);
    }
    
    setLoading(false);

    return {
      totalProcessed: novoBaseData.length,
      newRecords,
      duplicatesIgnored
    };
  };

  const clearData = () => {
    setServiceOrders([]);
    setVendas([]);
    setPrimeirosPagamentos([]);
    setMetas([]);
    setVendasMeta([]);
    setBaseData([]);
    
    // Limpar também do localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    infoLog('[PERSISTÊNCIA] Todos os dados foram limpos do localStorage');
  };

  const calculateTimeMetrics = (filteredOrders?: ServiceOrder[]) => {
    // Filtrar apenas serviços que devem ser incluídos nas métricas de tempo
    const metricsOrders = (filteredOrders || serviceOrders).filter(order => order.include_in_metrics);
    
    // Log otimizado - apenas em modo verbose
    debugLog(`[MÉTRICAS TEMPO] Analisando ${metricsOrders.length} ordens`);
    
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
    
    // Log resumido da performance
    debugLog(`[MÉTRICAS TEMPO] Resultado: ${ordersWithinGoal}/${totalOrders} (${percentWithinGoal.toFixed(1)}%) dentro da meta`);

    const servicesByType: Record<string, {
      totalOrders: number;
      withinGoal: number;
      percentWithinGoal: number;
      averageTime: number;
    }> = {};

    metricsOrders.forEach(order => {
      // Usar a função de padronização de categoria
      const standardType = standardizeServiceCategory(order.subtipo_servico, order.motivo);
      
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

    // Log detalhado apenas em modo super verboso
    if (isVerboseDebug && Object.keys(servicesByType).length > 0) {
      debugLog('[MÉTRICAS DETALHADAS]', servicesByType);
    }

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
      
      // 🆕 NOVA REGRA: Filtrar ordens duplicadas (mesmo cliente, mesmo motivo, data/hora próximas)
      // Mantém apenas a segunda O.S. quando há duplicatas próximas no tempo
      const filteredOrders: ServiceOrder[] = [];
      const processedOrders = new Set<string>();

      // Agrupar ordens por cliente + motivo para detectar sequências próximas
      const ordersByClientAndReason = new Map<string, ServiceOrder[]>();
      
      orders.forEach(order => {
        const key = `${order.codigo_cliente}_${order.motivo}`;
        if (!ordersByClientAndReason.has(key)) {
          ordersByClientAndReason.set(key, []);
        }
        ordersByClientAndReason.get(key)!.push(order);
      });

      // Processar cada grupo de cliente + motivo
      ordersByClientAndReason.forEach((groupOrders, key) => {
        if (groupOrders.length === 1) {
          // Se há apenas uma ordem, incluir diretamente
          filteredOrders.push(groupOrders[0]);
          return;
        }

        // Ordenar por data de criação
        groupOrders.sort((a, b) => new Date(a.data_criacao).getTime() - new Date(b.data_criacao).getTime());

        let i = 0;
        while (i < groupOrders.length) {
          const currentOrder = groupOrders[i];
          
          // Verificar se esta ordem está muito próxima da próxima (duplicata)
          if (i + 1 < groupOrders.length) {
            const nextOrder = groupOrders[i + 1];
            const currentTime = new Date(currentOrder.data_criacao).getTime();
            const nextTime = new Date(nextOrder.data_criacao).getTime();
            const diffMinutes = (nextTime - currentTime) / (1000 * 60); // Diferença em minutos

            // Se as ordens estão muito próximas (dentro de 2 minutos), considerar como duplicatas
            if (diffMinutes <= 2) {
              debugLog(`[REABERTURA] Duplicata detectada - Cliente: ${currentOrder.codigo_cliente}, Motivo: ${currentOrder.motivo}`);
              debugLog(`[REABERTURA] - Descartando primeira: ${currentOrder.codigo_os} (${currentOrder.data_criacao})`);
              debugLog(`[REABERTURA] - Mantendo segunda: ${nextOrder.codigo_os} (${nextOrder.data_criacao})`);
              
              // Pular a primeira ordem (descartá-la) e incluir a segunda
              filteredOrders.push(nextOrder);
              i += 2; // Avançar duas posições (pular primeira, processar segunda)
              continue;
            }
          }
          
          // Se não é duplicata, incluir a ordem normalmente
          filteredOrders.push(currentOrder);
          i++;
        }
      });

      debugLog(`[REABERTURA] Cliente ${clientCode}: ${orders.length} ordens originais → ${filteredOrders.length} ordens após filtro de duplicatas`);

      // Ordenar ordens por data de criação para garantir sequência cronológica correta
      filteredOrders.sort((a, b) => new Date(a.data_criacao).getTime() - new Date(b.data_criacao).getTime());

      // Procurar por pares de reabertura usando as ordens filtradas
      for (let i = 0; i < filteredOrders.length; i++) {
        const currOrder = filteredOrders[i];
        
        if (currOrder.tipo_servico?.includes("Assistência Técnica")) {
          // Rastrear a ordem de reabertura mais recente para este cliente
          let lastReopeningIndex = -1;
          let lastReopeningTime = 0;
          
          // Verificar todas as ordens anteriores (possíveis ordens originais ou reaberturas anteriores)
          for (let j = 0; j < i; j++) {
            const prevOrder = filteredOrders[j];
            
            // Para ordens canceladas, usar uma lógica especial para verificar finalização
            const isPrevOrderFinalized = prevOrder.status === "Cancelada" || 
                                     VALID_STATUS.some(status => prevOrder.status?.includes(status));
            
            const isPrevOrderOriginal = ["Ponto Principal", "Ponto Principal BL", "Corretiva", "Corretiva BL"].some(
              type => prevOrder.subtipo_servico?.includes(type)
            );
            
            // Usar data de finalização da ordem original (ou criação se ordem cancelada sem finalização)
            const prevFinalization = prevOrder.status === "Cancelada" && !prevOrder.data_finalizacao
              ? new Date(prevOrder.data_criacao)
              : new Date(prevOrder.data_finalizacao);
            
            const currCreation = new Date(currOrder.data_criacao);
            
            if (isPrevOrderFinalized && isPrevOrderOriginal && 
                prevOrder.data_criacao && currOrder.data_criacao &&
                currCreation > prevFinalization && // Reabertura deve ser criada APÓS a finalização da original
                currOrder.codigo_os !== prevOrder.codigo_os) {
              
              // Verificar se estão no mesmo mês vigente (baseado na finalização da original)
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
            const mostRecentOrder = filteredOrders[lastReopeningIndex];
            
            // Usar data de finalização da ordem original para cálculo do tempo
            const mostRecentFinalization = mostRecentOrder.status === "Cancelada" && !mostRecentOrder.data_finalizacao
              ? new Date(mostRecentOrder.data_criacao)
              : new Date(mostRecentOrder.data_finalizacao);
            
            const currCreation = new Date(currOrder.data_criacao);
            
            // Calcular tempos entre a finalização da ordem original e criação da reabertura
            const timeBetween = (currCreation.getTime() - mostRecentFinalization.getTime()) / (1000 * 60 * 60);
            const diffDays = (currCreation.getTime() - mostRecentFinalization.getTime()) / (1000 * 60 * 60 * 24);
            
            // Debug para detectar tempos negativos
            if (timeBetween < 0) {
              debugLog(`[REABERTURA] TEMPO NEGATIVO DETECTADO - Cliente: ${currOrder.codigo_cliente}`);
              debugLog(`[REABERTURA] - Original: ${mostRecentOrder.codigo_os}, Finalização: ${mostRecentOrder.data_finalizacao}`);
              debugLog(`[REABERTURA] - Reabertura: ${currOrder.codigo_os}, Criação: ${currOrder.data_criacao}`);
              debugLog(`[REABERTURA] - Tempo: ${timeBetween.toFixed(2)} horas (${diffDays.toFixed(1)} dias)`);
              continue; // Pular este par pois há erro na lógica
            }
            
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
    
    debugLog(`[PERMANÊNCIA] Processando ${vendasBLDGOSemPagamento.length} inclusões (vendas BL-DGO sem pagamento correspondente)`);
    
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
        } else if (pagamento.status_pacote === 'NC') {
          // Considerar "Não Cobrança" como clientes ativos (adimplentes)
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

  // Função para mapear categoria de venda baseada no "Agrupamento do Produto"
  const mapearCategoriaVenda = (venda: Venda | VendaMeta): string => {
    // Para VendaMeta, usar o campo 'categoria', para Venda usar 'agrupamento_produto'
    const agrupamento = ('agrupamento_produto' in venda 
      ? venda.agrupamento_produto 
      : 'categoria' in venda 
        ? venda.categoria 
        : ''
    )?.toUpperCase().trim() || '';
    
    // Verificar se tem produtos secundários (para identificar seguros)
    // Para VendaMeta, usar 'produtos_secundarios', para Venda normal não temos esse campo ainda
    const produtosSecundarios = ('produtos_secundarios' in venda 
      ? (venda as VendaMeta).produtos_secundarios
      : ''
    )?.toUpperCase() || '';
    
    // Debug do campo produtos_secundarios
    if (!produtosSecundarios && 'produtos_secundarios' in venda) {
              debugLog(`[METAS CAMPO] ⚠️ produtos_secundarios vazio:`, Object.keys(venda));
    }
    
    // Verificar diferentes variações de seguro/fatura protegida
    const temFaturaProtegida = produtosSecundarios.includes('FATURA PROTEGIDA') ||
                               produtosSecundarios.includes('SEGURO') ||
                               produtosSecundarios.includes('PROTEGIDA') ||
                               produtosSecundarios.includes('PROTEÇÃO');
    
    // Debug detalhado para seguros
    if (produtosSecundarios.includes('FATURA PROTEGIDA')) {
              debugLog(`[METAS SEGURO] ✅ FATURA PROTEGIDA detectada: ${agrupamento}`);
    } else if (temFaturaProtegida) {
              debugLog(`[METAS SEGURO] ✅ Variação de seguro detectada: ${agrupamento}`);
    }
    
    // Mapeamento com lógica de seguros:
    // SEGUROS POS = POS + FATURA PROTEGIDA
    // SEGUROS FIBRA = BL-DGO + FATURA PROTEGIDA
    // FIBRA = BL-DGO (sem FATURA PROTEGIDA)
    // SKY+ = DGO
    
    // Mapeamento principal por agrupamento (POS sempre vai para pos_pago, independente de seguro)
    switch (agrupamento) {
      case 'POS':
        return 'pos_pago';
      case 'PRE':
        return 'flex_conforto';
      case 'BL-DGO':
        // Para BL-DGO, verificar se tem seguro
        if (temFaturaProtegida) {
          debugLog(`[METAS SEGURO] BL-DGO com seguro -> SEGUROS FIBRA`);
          return 'seguros_fibra';
        }
        return 'fibra';
      case 'NP':
        return 'nova_parabolica';
      case 'DGO':
        return 'sky_mais';
      default:
        // Fallback para casos onde a sigla não está exata
        if (agrupamento.includes('POS')) return 'pos_pago';
        if (agrupamento.includes('PRE')) return 'flex_conforto';
        if (agrupamento.includes('BL-DGO')) {
          if (temFaturaProtegida) {
            debugLog(`[METAS SEGURO] BL-DGO (fallback) com seguro -> SEGUROS FIBRA`);
            return 'seguros_fibra';
          }
          return 'fibra';
        }
        if (agrupamento.includes('NP')) return 'nova_parabolica';
        if (agrupamento.includes('DGO')) return 'sky_mais';
        
        return 'outros';
    }
  };

  // Função para calcular métricas de metas
  const calculateMetaMetrics = (mes?: number, ano?: number): MetaMetrics | null => {
    const mesAtual = mes || new Date().getMonth() + 1;
    const anoAtual = ano || new Date().getFullYear();
    
    debugLog(`[METAS] Buscando dados para ${mesAtual}/${anoAtual}`);
    if (isVerboseDebug) {
      debugLog(`[METAS] Disponíveis:`, metas.map(m => `${m.mes}/${m.ano}`));
      debugLog(`[METAS] Vendas disponíveis:`, vendasMeta.map(v => `${v.mes}/${v.ano}`));
    }
    
    // Buscar meta do mês/ano especificado
    const metaDoMes = metas.find(m => m.mes === mesAtual && m.ano === anoAtual);
    if (!metaDoMes) {
      debugLog(`[METAS] ⚠️ Nenhuma meta encontrada para ${mesAtual}/${anoAtual}`);
      return null;
    }
    
    // Filtrar vendas do mês atual (combinar vendas normais e vendas de meta)
    const vendasNormaisDoMes = vendas.filter(venda => {
      if (!venda.data_habilitacao) return false;
      const dataVenda = new Date(venda.data_habilitacao);
      return dataVenda.getMonth() + 1 === mesAtual && dataVenda.getFullYear() === anoAtual;
    });
    
    const vendasMetaDoMes = vendasMeta.filter(venda => venda.mes === mesAtual && venda.ano === anoAtual);
    
    debugLog(`[METAS VENDAS] Normais: ${vendasNormaisDoMes.length}, Meta: ${vendasMetaDoMes.length}`);
    
    // Debug: mostrar amostra das vendas de meta apenas em modo super verboso
    if (isVerboseDebug && vendasMetaDoMes.length > 0) {
      debugLog(`[METAS AMOSTRA]`, { 
        primeira: vendasMetaDoMes[0],
        temSeguro: vendasMetaDoMes.some(v => v.produtos_secundarios?.includes('FATURA PROTEGIDA'))
      });
    }
    
    const vendasDoMes = [...vendasNormaisDoMes, ...vendasMetaDoMes];
    
    // Debug: contar vendas POS antes do processamento - apenas em modo verboso
    if (isVerboseDebug) {
      const vendasPOSTotal = vendasDoMes.filter(venda => {
        const agrupamento = ('agrupamento_produto' in venda 
          ? venda.agrupamento_produto 
          : 'categoria' in venda 
            ? venda.categoria 
            : ''
        )?.toUpperCase().trim() || '';
        return agrupamento === 'POS' || agrupamento.includes('POS');
      });
      debugLog(`[METAS POS] Vendas POS encontradas: ${vendasPOSTotal.length}`);
    }
    
    // Agrupar vendas por categoria (contagem de quantidade, não valor)
    const vendasPorCategoria: Record<string, number> = {
      pos_pago: 0,
      flex_conforto: 0,
      nova_parabolica: 0,
      fibra: 0,
      seguros_pos: 0,
      seguros_fibra: 0,
      sky_mais: 0,
      outros: 0
    };
    
    vendasDoMes.forEach(venda => {
      const categoria = mapearCategoriaVenda(venda);
      const agrupamento = ('agrupamento_produto' in venda 
        ? venda.agrupamento_produto 
        : 'categoria' in venda 
          ? venda.categoria 
          : ''
      ) || '';
      
      // Verificar produtos secundários para debug
      const produtosSecundarios = ('produtos_secundarios' in venda 
        ? (venda as VendaMeta).produtos_secundarios
        : ''
      )?.toUpperCase() || '';
      
      // Verificar diferentes variações de seguro/fatura protegida
      const temFaturaProtegida = produtosSecundarios.includes('FATURA PROTEGIDA') ||
                                 produtosSecundarios.includes('SEGURO') ||
                                 produtosSecundarios.includes('PROTEGIDA') ||
                                 produtosSecundarios.includes('PROTEÇÃO');
      
      // Log detalhado apenas em modo super verboso
      if (isVerboseDebug) {
        debugLog(`[METAS CATEGORIA] ${agrupamento} -> ${categoria}${temFaturaProtegida ? ' (com seguro)' : ''}`);
      }
      
      // Contar quantidade de vendas, não valor monetário
      vendasPorCategoria[categoria] += 1;
      
      // Contar seguros POS separadamente (vendas POS que têm fatura protegida)
      if (categoria === 'pos_pago' && temFaturaProtegida) {
        vendasPorCategoria['seguros_pos'] += 1;
      }
    });
    
    // Log resumido das vendas por categoria
    const totalVendasProcessadas = Object.values(vendasPorCategoria).reduce((sum, val) => sum + val, 0);
    debugLog(`[METAS RESULTADO] Processadas ${totalVendasProcessadas} vendas em ${Object.keys(vendasPorCategoria).length} categorias`);
    
    // Log detalhado apenas em modo super verboso
    if (isVerboseDebug) {
      debugLog(`[METAS CATEGORIAS]`, vendasPorCategoria);
    }
    
    // Calcular métricas por categoria
    const categorias: MetaCategoria[] = [
      {
        categoria: 'PÓS-PAGO',
        meta_definida: metaDoMes.pos_pago,
        vendas_realizadas: vendasPorCategoria.pos_pago,
        percentual_atingido: metaDoMes.pos_pago > 0 ? (vendasPorCategoria.pos_pago / metaDoMes.pos_pago) * 100 : 0
      },
      {
        categoria: 'FLEX/CONFORTO',
        meta_definida: metaDoMes.flex_conforto,
        vendas_realizadas: vendasPorCategoria.flex_conforto,
        percentual_atingido: metaDoMes.flex_conforto > 0 ? (vendasPorCategoria.flex_conforto / metaDoMes.flex_conforto) * 100 : 0
      },
      {
        categoria: 'NOVA PARABÓLICA',
        meta_definida: metaDoMes.nova_parabolica,
        vendas_realizadas: vendasPorCategoria.nova_parabolica,
        percentual_atingido: metaDoMes.nova_parabolica > 0 ? (vendasPorCategoria.nova_parabolica / metaDoMes.nova_parabolica) * 100 : 0
      },
      {
        categoria: 'FIBRA',
        meta_definida: metaDoMes.fibra,
        vendas_realizadas: vendasPorCategoria.fibra,
        percentual_atingido: metaDoMes.fibra > 0 ? (vendasPorCategoria.fibra / metaDoMes.fibra) * 100 : 0
      },
      {
        categoria: 'SEGUROS POS',
        meta_definida: metaDoMes.seguros_pos,
        vendas_realizadas: vendasPorCategoria.seguros_pos,
        percentual_atingido: metaDoMes.seguros_pos > 0 ? (vendasPorCategoria.seguros_pos / metaDoMes.seguros_pos) * 100 : 0
      },
      {
        categoria: 'SEGUROS FIBRA',
        meta_definida: metaDoMes.seguros_fibra,
        vendas_realizadas: vendasPorCategoria.seguros_fibra,
        percentual_atingido: metaDoMes.seguros_fibra > 0 ? (vendasPorCategoria.seguros_fibra / metaDoMes.seguros_fibra) * 100 : 0
      },
      {
        categoria: 'SKY MAIS',
        meta_definida: metaDoMes.sky_mais,
        vendas_realizadas: vendasPorCategoria.sky_mais,
        percentual_atingido: metaDoMes.sky_mais > 0 ? (vendasPorCategoria.sky_mais / metaDoMes.sky_mais) * 100 : 0
      }
    ];
    
    // Calcular totais (quantidade de vendas)
    const totalMeta = metaDoMes.total;
    const totalVendas = Object.values(vendasPorCategoria).reduce((sum, val) => sum + val, 0);
    const percentualGeral = totalMeta > 0 ? (totalVendas / totalMeta) * 100 : 0;
    
    // Calcular dias e projeções baseado no mês/ano selecionado
    const hoje = new Date();
    const ultimoDiaMes = new Date(anoAtual, mesAtual, 0).getDate();
    
    // Determinar se estamos analisando o mês atual ou um mês passado
    const isCurrentMonth = anoAtual === hoje.getFullYear() && mesAtual === hoje.getMonth() + 1;
    
    // Função para calcular dias úteis (excluindo domingos)
    const calcularDiasUteis = (dataInicio: Date, dataFim: Date): number => {
      let diasUteis = 0;
      const dataAtual = new Date(dataInicio);
      
      // Normalizar as datas para evitar problemas de timezone
      dataAtual.setHours(0, 0, 0, 0);
      const dataFimNormalizada = new Date(dataFim);
      dataFimNormalizada.setHours(23, 59, 59, 999);
      
      // Garantir que inclui tanto o primeiro quanto o último dia
      while (dataAtual <= dataFimNormalizada) {
        if (dataAtual.getDay() !== 0) { // Não é domingo
          diasUteis++;
        }
        dataAtual.setDate(dataAtual.getDate() + 1);
      }
      
      return diasUteis;
    };
    
    let diasDecorridos: number;
    let diasRestantes: number;
    
    if (isCurrentMonth) {
      // Mês atual: usar data atual
      const primeiroDiaMes = new Date(anoAtual, mesAtual - 1, 1);
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      const ultimoDiaDoMes = new Date(anoAtual, mesAtual, 0);
      
      diasDecorridos = Math.max(1, calcularDiasUteis(primeiroDiaMes, ontem));
      diasRestantes = Math.max(0, calcularDiasUteis(hoje, ultimoDiaDoMes));
      
      // Log resumido dos dias úteis
      debugLog(`[METAS DIAS] ${mesAtual}/${anoAtual}: ${diasDecorridos} decorridos, ${diasRestantes} restantes`);
    } else {
      // Mês passado: usar o mês completo
      const primeiroDiaMes = new Date(anoAtual, mesAtual - 1, 1);
      const ultimoDiaDoMes = new Date(anoAtual, mesAtual, 0);
      
      diasDecorridos = calcularDiasUteis(primeiroDiaMes, ultimoDiaDoMes);
      diasRestantes = 0; // Mês já passou
    }
    
    const mediaDiariaAtual = totalVendas / diasDecorridos;
    const totalDiasUteisMes = isCurrentMonth ? 
      diasDecorridos + diasRestantes : 
      diasDecorridos;
    const projecaoFinal = mediaDiariaAtual * totalDiasUteisMes;
    
    const valorRestante = Math.max(0, totalMeta - totalVendas);
    const mediaDiariaNecessaria = diasRestantes > 0 ? valorRestante / diasRestantes : 0;
    
    // Determinar status
    let status: MetaMetrics['status'] = 'em_dia';
    if (percentualGeral >= 100) {
      status = 'atingido';
    } else if (projecaoFinal > totalMeta * 1.1) {
      status = 'superado';
    } else if (percentualGeral < (diasDecorridos / ultimoDiaMes) * 100 * 0.8) {
      status = 'atrasado';
    }
    
    return {
      mes: mesAtual,
      ano: anoAtual,
      categorias,
      total_meta: totalMeta,
      total_vendas: totalVendas,
      percentual_geral: percentualGeral,
      dias_restantes: diasRestantes,
      projecao_final: projecaoFinal,
      media_diaria_atual: mediaDiariaAtual,
      media_diaria_necessaria: mediaDiariaNecessaria,
      status
    };
  };

  return (
    <DataContext.Provider value={{ 
      serviceOrders, 
      vendas,
      primeirosPagamentos,
      metas,
      vendasMeta,
      baseData,
      importServiceOrders, 
      importVendas,
      importPrimeirosPagamentos,
      importMetas,
      importVendasMeta,
      importBaseData,
      clearData, 
      loading, 
      calculateTimeMetrics,
      calculateReopeningMetrics,
      getReopeningPairs,
      calculatePermanenciaMetrics,
      calculateVendedorMetrics,
      calculateMetaMetrics,
      mapearCategoriaVenda,
      technicians,
      vendedores
    }}>
      {children}
    </DataContext.Provider>
  );
};

// Exportamos apenas o componente provider, o hook useData foi movido para um arquivo separado
export { DataContext };
