/**
 * DataContextComposed - Provider temporário para testes incrementais
 * Etapa 8.2: Permite testar o novo contexto sem quebrar o sistema existente
 * Etapa 9.3: Otimizado para eliminar dependências críticas
 */

import React from 'react';
import { DataProvider } from './DataContext';
import { DataServiceOrdersProvider } from './DataServiceOrdersContext';
import { DataVendasProvider } from './DataVendasContext';
import { DataPagamentosProvider } from './DataPagamentosContext';
import { DataGlobalProvider } from './DataGlobalContext';
import useData from './useData';

interface DataVendasProviderWithDependencyProps {
  children: React.ReactNode;
}

// Provider wrapper para injetar dependências no DataVendasProvider
const DataVendasProviderWithDependency: React.FC<DataVendasProviderWithDependencyProps> = ({ children }) => {
  const { primeirosPagamentos } = useData();
  
  return (
    <DataVendasProvider primeirosPagamentos={primeirosPagamentos}>
      {children}
    </DataVendasProvider>
  );
};

interface DataPagamentosProviderWithDependencyProps {
  children: React.ReactNode;
}

// Provider wrapper para injetar dependências no DataPagamentosProvider
const DataPagamentosProviderWithDependency: React.FC<DataPagamentosProviderWithDependencyProps> = ({ children }) => {
  const { 
    primeirosPagamentos, 
    vendas, 
    loading, 
    importPrimeirosPagamentos 
  } = useData();
  
  return (
    <DataPagamentosProvider 
      primeirosPagamentos={primeirosPagamentos}
      vendas={vendas}
      loading={loading}
      importPrimeirosPagamentos={importPrimeirosPagamentos}
    >
      {children}
    </DataPagamentosProvider>
  );
};

interface DataGlobalProviderWithDependencyProps {
  children: React.ReactNode;
}

// Provider wrapper para injetar dependências no DataGlobalProvider
const DataGlobalProviderWithDependency: React.FC<DataGlobalProviderWithDependencyProps> = ({ children }) => {
  const { 
    loading,
    clearData,
    importServiceOrders,
    importVendas,
    importPrimeirosPagamentos 
  } = useData();
  
  return (
    <DataGlobalProvider 
      loading={loading}
      clearData={clearData}
      importServiceOrders={importServiceOrders}
      importVendas={importVendas}
      importPrimeirosPagamentos={importPrimeirosPagamentos}
    >
      {children}
    </DataGlobalProvider>
  );
};

interface DataContextComposedProps {
  children: React.ReactNode;
}

export const DataContextComposed: React.FC<DataContextComposedProps> = ({ children }) => {
  return (
    <DataProvider>
      <DataServiceOrdersProvider>
        <DataVendasProviderWithDependency>
          <DataPagamentosProviderWithDependency>
            <DataGlobalProviderWithDependency>
              {children}
            </DataGlobalProviderWithDependency>
          </DataPagamentosProviderWithDependency>
        </DataVendasProviderWithDependency>
      </DataServiceOrdersProvider>
    </DataProvider>
  );
}; 