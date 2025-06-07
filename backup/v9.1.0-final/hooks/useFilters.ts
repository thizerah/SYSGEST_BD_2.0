/**
 * Hook customizado para gerenciar estado de filtros de forma reusável
 * Extraído do FilterCard para seguir as melhores práticas do React
 */

import React from 'react';

/**
 * Hook para gerenciar estado de filtros de forma reusável
 */
export function useFilters<T extends Record<string, string | number>>(initialFilters: T) {
  const [filters, setFilters] = React.useState<T>(initialFilters);
  const [isApplied, setIsApplied] = React.useState(false);

  const updateFilter = React.useCallback((key: keyof T, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = React.useCallback(() => {
    setIsApplied(true);
  }, []);

  const clearFilters = React.useCallback(() => {
    setFilters(initialFilters);
    setIsApplied(false);
  }, [initialFilters]);

  const resetFilters = React.useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return {
    filters,
    isApplied,
    updateFilter,
    applyFilters,
    clearFilters,
    resetFilters,
    setFilters
  };
} 