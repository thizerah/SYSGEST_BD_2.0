/**
 * Hook customizado para gerenciamento de abas e estados relacionados
 * Centraliza a lógica de navegação entre abas e resetar estados
 */

import { useState, useEffect, useCallback } from 'react';

interface TabManagerOptions {
  defaultTab?: string;
  onTabChange?: (newTab: string) => void;
}

interface TabManagerReturn {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  originalServiceTypeFilter: string;
  setOriginalServiceTypeFilter: (filter: string) => void;
  resetFiltersOnTabChange: () => void;
}

export function useTabManager(options: TabManagerOptions = {}): TabManagerReturn {
  const { defaultTab = "time", onTabChange } = options;
  
  // Estado para controlar qual aba está ativa
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Novo estado para filtro de tipo de serviço original
  const [originalServiceTypeFilter, setOriginalServiceTypeFilter] = useState<string>("");

  // Resetar o filtro de tipo de serviço original quando mudar de guia
  useEffect(() => {
    // Reset do filtro ao mudar de guia
    setOriginalServiceTypeFilter("");
    
    // Chamar callback se fornecido
    if (onTabChange) {
      onTabChange(activeTab);
    }
  }, [activeTab, onTabChange]);

  // Função para resetar filtros quando trocar de aba
  const resetFiltersOnTabChange = useCallback(() => {
    setOriginalServiceTypeFilter("");
  }, []);

  // Função personalizada para trocar de aba
  const handleSetActiveTab = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  return {
    activeTab,
    setActiveTab: handleSetActiveTab,
    originalServiceTypeFilter,
    setOriginalServiceTypeFilter,
    resetFiltersOnTabChange
  };
} 