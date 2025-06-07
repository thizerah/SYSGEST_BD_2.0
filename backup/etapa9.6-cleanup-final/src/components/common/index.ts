/**
 * Exportações centralizadas dos componentes comuns reutilizáveis
 */

// Componentes de Card e Métricas
export { MetricCard } from './MetricCard';

// Componentes de Status e Badges
export { 
  StatusBadge, 
  ActionTakenBadge, 
  getStatusVariant,
  type StatusVariant 
} from './StatusBadge';

// Componentes de Estado Vazio
export { 
  EmptyState, 
  LoadingState, 
  NoDataState, 
  AccessRestricted 
} from './EmptyState';

// Componentes de Filtro
export { FilterCard } from './FilterCard';

// Componentes de Progresso
export { 
  ProgressBar, 
  MultiProgressBar
} from './ProgressBar';

// Hooks reutilizáveis - Referência central
export { 
  useFilters,
  useDateFilters,
  useDataFiltering,
  useProgressData,
  useMetricsCalculations,
  useTabManager
} from '@/hooks'; 