/**
 * Exportações centralizadas dos hooks customizados
 * Facilita importação e reutilização em todo o sistema
 */

// Hooks de filtros e controles
export { useFilters } from './useFilters';
export { useDateFilters } from './useDateFilters';
export { useDataFiltering } from './useDataFiltering';

// Hooks de dados e cálculos
export { useProgressData } from './useProgressData';
export { useMetricsCalculations } from './useMetricsCalculations';

// Hooks de interface e navegação
export { useTabManager } from './useTabManager';

// Hook composto para dashboard de métricas
export { useMetricsDashboard } from './useMetricsDashboard'; 