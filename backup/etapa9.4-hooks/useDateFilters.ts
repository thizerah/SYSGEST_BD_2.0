/**
 * Hook customizado para gerenciar filtros de data e período
 * Extraído do MetricsOverview para reutilização em outras partes do sistema
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ServiceOrder } from '@/types';

interface DateFiltersState {
  selectedMonth: string | null;
  selectedYear: string | null;
  showData: boolean;
  isFiltering: boolean;
}

interface DateFiltersReturn extends DateFiltersState {
  availableYears: string[];
  availableMonths: string[];
  setSelectedMonth: (month: string | null) => void;
  setSelectedYear: (year: string | null) => void;
  handleApplyFilters: () => void;
  handleClearFilters: () => void;
  resetOnTabChange: () => void;
}

export function useDateFilters(
  serviceOrders: ServiceOrder[],
  filterDelay: number = 500
): DateFiltersReturn {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [showData, setShowData] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  // Obter anos e meses únicos a partir das datas de finalização das ordens de serviço
  const { availableYears, availableMonths } = useMemo(() => {
    const years = new Set<string>();
    const months = new Set<string>();
    
    serviceOrders.forEach(order => {
      if (order.data_finalizacao) {
        const date = new Date(order.data_finalizacao);
        const year = date.getFullYear().toString();
        // Os meses em JavaScript são baseados em 0, então +1 para obter o mês correto
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        
        years.add(year);
        months.add(month);
      }
    });
    
    return {
      availableYears: Array.from(years).sort((a, b) => b.localeCompare(a)), // Ordenar decrescente
      availableMonths: Array.from(months).sort()
    };
  }, [serviceOrders]);

  // Verificar se podemos exibir os dados quando os filtros são alterados
  useEffect(() => {
    if (selectedMonth && selectedYear) {
      // Forçamos uma limpeza temporária dos resultados antes de mostrar os novos
      setShowData(false);
      setIsFiltering(true);
      
      // Aplicamos o filtro após um pequeno delay para garantir que a UI mostre a transição
      const timeout = setTimeout(() => {
        setShowData(true);
        setIsFiltering(false);
      }, filterDelay);

      return () => clearTimeout(timeout);
    } else {
      setShowData(false);
      setIsFiltering(false);
    }
  }, [selectedMonth, selectedYear, filterDelay]);

  // Função para aplicar filtros
  const handleApplyFilters = useCallback(() => {
    if (selectedMonth && selectedYear) {
      // Limpar temporariamente antes de mostrar novos resultados
      setShowData(false);
      setIsFiltering(true);
      
      // Aplicar filtros com um pequeno delay para garantir que a UI atualize corretamente
      setTimeout(() => {
        setShowData(true);
        setIsFiltering(false);
      }, filterDelay);
    }
  }, [selectedMonth, selectedYear, filterDelay]);

  // Função para limpar filtros
  const handleClearFilters = useCallback(() => {
    setSelectedMonth(null);
    setSelectedYear(null);
    setShowData(false);
    setIsFiltering(false);
  }, []);

  // Função para resetar quando trocar de aba
  const resetOnTabChange = useCallback(() => {
    // Limpar o estado e os filtros quando o usuário muda de aba
    setShowData(false);
    setIsFiltering(false);
    
    // Com um pequeno delay, limpar os filtros para garantir uma experiência consistente
    setTimeout(() => {
      setSelectedMonth(null);
      setSelectedYear(null);
    }, 150);
  }, []);

  return {
    selectedMonth,
    selectedYear,
    showData,
    isFiltering,
    availableYears,
    availableMonths,
    setSelectedMonth,
    setSelectedYear,
    handleApplyFilters,
    handleClearFilters,
    resetOnTabChange
  };
} 