/**
 * Hook customizado para calcular dados de progresso a partir de arrays
 * Extraído do ProgressBar para seguir as melhores práticas do React
 */

import React from 'react';

/**
 * Hook para calcular dados de progresso a partir de arrays
 */
export function useProgressData<T>(
  data: T[],
  getKey: (item: T) => string,
  getValue: (item: T) => number = () => 1
): Array<{ label: string; value: number }> {
  return React.useMemo(() => {
    const grouped = data.reduce((acc, item) => {
      const key = getKey(item);
      const value = getValue(item);
      acc[key] = (acc[key] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [data, getKey, getValue]);
} 