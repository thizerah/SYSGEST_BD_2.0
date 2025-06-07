/**
 * Hook composto que combina todos os hooks de métricas
 * Simplifica o uso no MetricsOverview e outras partes do dashboard
 * Etapa 9.3: Otimizado para eliminar dependência de useData()
 */

import { useCallback } from 'react';
import { useDateFilters } from './useDateFilters';
import { useDataFiltering } from './useDataFiltering';
import { useMetricsCalculations } from './useMetricsCalculations';
import { useTabManager } from './useTabManager';
import useServiceOrdersData from '@/context/useServiceOrdersData';
import usePagamentosData from '@/context/usePagamentosData';
import useVendasData from '@/context/useVendasData';

interface MetricsDashboardOptions {
  defaultTab?: string;
  filterDelay?: number;
}

export function useMetricsDashboard(options: MetricsDashboardOptions = {}) {
  const { defaultTab = "time", filterDelay = 500 } = options;
  
  // Hook de dados do contexto especializado (deve vir primeiro)
  const { 
    serviceOrders, 
    calculateTimeMetrics, 
    calculateReopeningMetrics, 
    getReopeningPairs,
    technicians,
    importServiceOrders
  } = useServiceOrdersData();

  // Hook de dados de pagamentos especializado
  const {
    primeirosPagamentos,
    calculatePermanenciaMetrics,
    processarInclusoes,
    importPrimeirosPagamentos
  } = usePagamentosData();

  // Hook de dados de vendas especializado (substituindo useData)
  const {
    vendas,
    calculateVendedorMetrics,
    importVendas
  } = useVendasData();

  // Hook de gerenciamento de abas
  const tabManager = useTabManager({ 
    defaultTab,
    onTabChange: (newTab) => {
      // Ações adicionais quando trocar de aba podem ser adicionadas aqui
      console.log(`Trocou para aba: ${newTab}`);
    }
  });

  // Hook de filtros de data (agora serviceOrders já está declarado)
  const dateFilters = useDateFilters(serviceOrders, filterDelay);

  // Hook de filtragem de dados
  const filteredData = useDataFiltering(
    serviceOrders,
    getReopeningPairs,
    {
      selectedMonth: dateFilters.selectedMonth,
      selectedYear: dateFilters.selectedYear,
      originalServiceTypeFilter: tabManager.originalServiceTypeFilter,
      activeTab: tabManager.activeTab
    },
    dateFilters.showData
  );

  // Hook de cálculos de métricas
  const metrics = useMetricsCalculations({
    filteredServiceOrders: filteredData.filteredServiceOrders,
    filteredReopeningPairs: filteredData.filteredReopeningPairs,
    originalServiceTypeFilter: tabManager.originalServiceTypeFilter,
    showData: dateFilters.showData,
    calculateTimeMetrics,
    calculateReopeningMetrics
  });

  // Função para resetar tudo quando trocar de aba
  const handleTabChange = useCallback((newTab: string) => {
    tabManager.setActiveTab(newTab);
    dateFilters.resetOnTabChange();
  }, [tabManager, dateFilters]);

  return {
    // Estados de aba
    activeTab: tabManager.activeTab,
    setActiveTab: handleTabChange,
    originalServiceTypeFilter: tabManager.originalServiceTypeFilter,
    setOriginalServiceTypeFilter: tabManager.setOriginalServiceTypeFilter,

    // Estados de filtros de data
    selectedMonth: dateFilters.selectedMonth,
    selectedYear: dateFilters.selectedYear,
    showData: dateFilters.showData,
    isFiltering: dateFilters.isFiltering,
    availableYears: dateFilters.availableYears,
    availableMonths: dateFilters.availableMonths,
    setSelectedMonth: dateFilters.setSelectedMonth,
    setSelectedYear: dateFilters.setSelectedYear,
    handleApplyFilters: dateFilters.handleApplyFilters,
    handleClearFilters: dateFilters.handleClearFilters,

    // Dados filtrados
    filteredServiceOrdersByFinalization: filteredData.filteredServiceOrdersByFinalization,
    filteredServiceOrders: filteredData.filteredServiceOrders,
    filteredReopeningPairs: filteredData.filteredReopeningPairs,
    uniqueOriginalServiceTypes: filteredData.uniqueOriginalServiceTypes,

    // Métricas calculadas
    timeMetrics: metrics.timeMetrics,
    reopeningMetrics: metrics.reopeningMetrics,

    // Dados e métodos adicionais para compatibilidade
    serviceOrders,
    technicians,
    calculateTimeMetrics,
    calculateReopeningMetrics,
    getReopeningPairs,
    importServiceOrders,
    vendas,
    primeirosPagamentos,
    importVendas,
    importPrimeirosPagamentos,
    calculatePermanenciaMetrics,
    processarInclusoes,
    calculateVendedorMetrics
  };
} 