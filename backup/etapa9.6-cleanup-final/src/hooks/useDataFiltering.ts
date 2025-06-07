/**
 * Hook customizado para filtragem de dados de ordens de serviço
 * Centraliza a lógica de filtragem que é reutilizada em várias partes do sistema
 * 
 * Nota: filteredReopeningPairs é mantido para compatibilidade, mas o cálculo 
 * de métricas de reabertura agora é feito internamente pelo DataContext
 */

import { useMemo } from 'react';
import { ServiceOrder, ReopeningPair } from '@/types';

interface FilteringOptions {
  selectedMonth: string | null;
  selectedYear: string | null;
  originalServiceTypeFilter?: string;
  activeTab?: string;
}

interface FilteredData {
  filteredServiceOrdersByFinalization: ServiceOrder[];
  filteredServiceOrders: ServiceOrder[];
  filteredReopeningPairs: ReopeningPair[];
  uniqueOriginalServiceTypes: string[];
}

export function useDataFiltering(
  serviceOrders: ServiceOrder[],
  getReopeningPairs: () => ReopeningPair[],
  options: FilteringOptions,
  showData: boolean
): FilteredData {
  const { selectedMonth, selectedYear, originalServiceTypeFilter, activeTab } = options;

  // Filtrar ordens de serviço por data de finalização
  const filteredServiceOrdersByFinalization = useMemo(() => {
    if (!selectedMonth || !selectedYear) {
      return [];
    }

    return serviceOrders.filter(order => {
      if (!order.data_finalizacao) return false;
      
      const finalizationDate = new Date(order.data_finalizacao);
      const month = (finalizationDate.getMonth() + 1).toString().padStart(2, '0');
      const year = finalizationDate.getFullYear().toString();
      
      return month === selectedMonth && year === selectedYear;
    });
  }, [serviceOrders, selectedMonth, selectedYear]);

  // Filtrar ordens de serviço baseado na aba ativa
  const filteredServiceOrders = useMemo(() => {
    if (!selectedMonth || !selectedYear) {
      return [];
    }

    return serviceOrders.filter(order => {
      let targetDate: string | null = null;
      
      // Determinar qual data usar baseado na aba ativa
      switch (activeTab) {
        case "reopening":
          targetDate = order.data_criacao;
          break;
        case "time":
          targetDate = order.data_finalizacao;
          break;
        default:
          // Para outras abas, usar data de criação ou finalização
          targetDate = order.data_finalizacao || order.data_criacao;
          break;
      }
      
      if (!targetDate) return false;
      
      const date = new Date(targetDate);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString();
      
      return month === selectedMonth && year === selectedYear;
    });
  }, [serviceOrders, selectedMonth, selectedYear, activeTab]);

  // Filtrar pares de reabertura
  const filteredReopeningPairs = useMemo(() => {
    if (!selectedMonth || !selectedYear) {
      return [];
    }

    const allPairs = getReopeningPairs();
    
    return allPairs.filter(pair => {
      // Filtrar baseado na data de criação da ordem reaberta
      if (!pair.reopeningOrder.data_criacao) return false;
      
      const reopenedDate = new Date(pair.reopeningOrder.data_criacao);
      const month = (reopenedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = reopenedDate.getFullYear().toString();
      
      return month === selectedMonth && year === selectedYear;
    });
  }, [getReopeningPairs, selectedMonth, selectedYear]);

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

  return {
    filteredServiceOrdersByFinalization,
    filteredServiceOrders,
    filteredReopeningPairs,
    uniqueOriginalServiceTypes
  };
} 