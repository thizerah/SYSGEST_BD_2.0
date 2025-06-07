/**
 * Hook customizado para cálculos de métricas de tempo e reabertura
 * Extraído do MetricsOverview para facilitar reutilização e testes
 */

import { useMemo } from 'react';
import { ServiceOrder, ReopeningPair } from '@/types';

interface TimeMetrics {
  ordersWithinGoal: number;
  ordersOutsideGoal: number;
  percentWithinGoal: number;
  averageTime: number;
  servicesByType: Record<string, {
    withinGoal: number;
    totalOrders: number;
    percentWithinGoal: number;
    averageTime: number;
  }>;
}

interface ReopeningMetrics {
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
    reopeningRate: number;
  }>;
  reopeningsByReason: Record<string, {
    byOriginalType: Record<string, number>;
    total: number;
  }>;
}

interface MetricsCalculationsProps {
  filteredServiceOrders: ServiceOrder[];
  filteredReopeningPairs: ReopeningPair[];
  originalServiceTypeFilter: string;
  showData: boolean;
  calculateTimeMetrics: (orders: ServiceOrder[]) => TimeMetrics;
  calculateReopeningMetrics: (filteredOrders?: ServiceOrder[]) => ReopeningMetrics;
}

const ORIGINAL_SERVICE_TYPES = [
  "Corretiva",
  "Corretiva BL", 
  "Ponto Principal",
  "Ponto Principal BL"
];

export function useMetricsCalculations({
  filteredServiceOrders,
  filteredReopeningPairs,
  originalServiceTypeFilter,
  showData,
  calculateTimeMetrics,
  calculateReopeningMetrics
}: MetricsCalculationsProps) {
  // Obter métricas de tempo apenas com as ordens filtradas
  const timeMetrics = useMemo(() => {
    if (!showData || filteredServiceOrders.length === 0) {
      return {
        ordersWithinGoal: 0,
        ordersOutsideGoal: 0,
        percentWithinGoal: 0,
        averageTime: 0,
        servicesByType: {}
      };
    }
    
    return calculateTimeMetrics(filteredServiceOrders);
  }, [calculateTimeMetrics, filteredServiceOrders, showData]);

  // Obter métricas de reabertura baseadas nas ordens filtradas
  const reopeningMetrics = useMemo(() => {
    if (!showData) {
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

    // Se não há ordens filtradas, retornar métricas vazias
    if (filteredServiceOrders.length === 0) {
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

    // Calcular métricas baseadas nas ordens filtradas
    // A função calculateReopeningMetrics fará a análise de reabertura internamente
    const metrics = calculateReopeningMetrics(filteredServiceOrders);
    
    // Se há filtro de tipo de serviço original, ajustar as métricas
    if (originalServiceTypeFilter) {
      // Filtrar apenas dados relacionados ao tipo específico
      const filteredByType = metrics.reopeningsByOriginalType[originalServiceTypeFilter];
      
      if (filteredByType) {
        return {
          ...metrics,
          reopenedOrders: filteredByType.reopenings,
          reopeningRate: filteredByType.reopeningRate
        };
      }
    }

    return metrics;
  }, [
    filteredServiceOrders, 
    showData, 
    originalServiceTypeFilter,
    calculateReopeningMetrics
  ]);

  return {
    timeMetrics,
    reopeningMetrics
  };
} 