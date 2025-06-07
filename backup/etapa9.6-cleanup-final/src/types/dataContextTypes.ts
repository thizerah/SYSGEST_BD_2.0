/**
 * Tipos para os contextos de dados especializados
 * Extraídos do DataContext monolítico durante a refatoração
 */

// Para métricas de tempo
export interface TimeMetrics {
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
}

// Para métricas de reabertura  
export interface ReopeningMetrics {
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
} 