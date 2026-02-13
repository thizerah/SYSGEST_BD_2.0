import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

// Interface para o estado de cada aba
export interface TabStateData {
  // Filtros de período
  selectedMonth?: string | null;
  selectedYear?: string | null;
  showData?: boolean;
  
  // Filtros específicos de cada página
  filters?: Record<string, any>;
  
  // Posição de scroll
  scrollPosition?: number;
  
  // Timestamp da última atualização
  lastUpdated?: number;
}

// Interface do contexto
interface TabStateContextType {
  // Obter estado de uma aba específica
  getTabState: (tabId: string) => TabStateData;
  
  // Atualizar estado de uma aba
  setTabState: (tabId: string, state: Partial<TabStateData>) => void;
  
  // Limpar estado de uma aba
  clearTabState: (tabId: string) => void;
  
  // Limpar todos os estados
  clearAllTabStates: () => void;
  
  // Verificar se uma aba tem estado salvo
  hasTabState: (tabId: string) => boolean;
}

const STORAGE_KEY = "dashboard-tab-states";

// Valor padrão do contexto
const defaultContextValue: TabStateContextType = {
  getTabState: () => ({}),
  setTabState: () => {},
  clearTabState: () => {},
  clearAllTabStates: () => {},
  hasTabState: () => false,
};

const TabStateContext = createContext<TabStateContextType>(defaultContextValue);

interface TabStateProviderProps {
  children: ReactNode;
}

export function TabStateProvider({ children }: TabStateProviderProps) {
  // Estado para armazenar todos os estados das abas
  const [tabStates, setTabStates] = useState<Record<string, TabStateData>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Erro ao carregar estados das abas do localStorage:", error);
    }
    return {};
  });

  // Salvar estados no localStorage quando mudarem
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabStates));
    } catch (error) {
      console.error("Erro ao salvar estados das abas no localStorage:", error);
    }
  }, [tabStates]);

  // Obter estado de uma aba
  const getTabState = useCallback((tabId: string): TabStateData => {
    return tabStates[tabId] || {};
  }, [tabStates]);

  // Atualizar estado de uma aba
  const setTabState = useCallback((tabId: string, state: Partial<TabStateData>) => {
    setTabStates((prev) => ({
      ...prev,
      [tabId]: {
        ...prev[tabId],
        ...state,
        lastUpdated: Date.now(),
      },
    }));
  }, []);

  // Limpar estado de uma aba
  const clearTabState = useCallback((tabId: string) => {
    setTabStates((prev) => {
      const newStates = { ...prev };
      delete newStates[tabId];
      return newStates;
    });
  }, []);

  // Limpar todos os estados
  const clearAllTabStates = useCallback(() => {
    setTabStates({});
  }, []);

  // Verificar se uma aba tem estado salvo
  const hasTabState = useCallback((tabId: string): boolean => {
    return tabId in tabStates;
  }, [tabStates]);

  return (
    <TabStateContext.Provider
      value={{
        getTabState,
        setTabState,
        clearTabState,
        clearAllTabStates,
        hasTabState,
      }}
    >
      {children}
    </TabStateContext.Provider>
  );
}

// Hook para usar o contexto
export function useTabState() {
  const context = useContext(TabStateContext);
  if (!context) {
    throw new Error("useTabState deve ser usado dentro de um TabStateProvider");
  }
  return context;
}

// Hook auxiliar para uma aba específica
export function useCurrentTabState(tabId: string) {
  const { getTabState, setTabState, clearTabState, hasTabState } = useTabState();
  
  const state = getTabState(tabId);
  
  const updateState = useCallback((newState: Partial<TabStateData>) => {
    setTabState(tabId, newState);
  }, [tabId, setTabState]);
  
  const clearState = useCallback(() => {
    clearTabState(tabId);
  }, [tabId, clearTabState]);
  
  return {
    state,
    updateState,
    clearState,
    hasState: hasTabState(tabId),
  };
}
