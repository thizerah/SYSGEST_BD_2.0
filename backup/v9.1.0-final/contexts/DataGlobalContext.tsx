import React, { createContext, useContext, useCallback } from 'react';
import { ServiceOrder, Venda, PrimeiroPagamento } from '@/types';
import useData from './useData';

// Interface para o contexto global
interface DataGlobalContextType {
  // Estados globais
  loading: boolean;
  
  // Funcionalidades cross-cutting
  clearData: () => void;
  
  // Métodos de importação (delegados para os contextos especializados)
  importServiceOrders: (orders: ServiceOrder[], append?: boolean) => void;
  importVendas: (vendas: Venda[], append?: boolean) => void;
  importPrimeirosPagamentos: (pagamentos: PrimeiroPagamento[], append?: boolean) => void;
}

// Criar o contexto
const DataGlobalContext = createContext<DataGlobalContextType | undefined>(undefined);

// Provider que usa os dados do contexto principal
export const DataGlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    loading,
    clearData,
    importServiceOrders,
    importVendas,
    importPrimeirosPagamentos
  } = useData();

  // Função wrapper para clearData com feedback
  const handleClearData = useCallback(() => {
    console.log('[DataGlobalContext] Limpando todos os dados...');
    clearData();
    console.log('[DataGlobalContext] Dados limpos com sucesso');
  }, [clearData]);

  // Valor do contexto
  const contextValue: DataGlobalContextType = {
    // Estados globais
    loading,
    
    // Funcionalidades cross-cutting
    clearData: handleClearData,
    
    // Métodos de importação (delegados)
    importServiceOrders,
    importVendas,
    importPrimeirosPagamentos
  };

  return (
    <DataGlobalContext.Provider value={contextValue}>
      {children}
    </DataGlobalContext.Provider>
  );
};

// Hook para usar o contexto
const useDataGlobal = (): DataGlobalContextType => {
  const context = useContext(DataGlobalContext);
  if (!context) {
    throw new Error('useDataGlobal deve ser usado dentro de um DataGlobalProvider');
  }
  return context;
};

export default useDataGlobal; 