/**
 * DataContextComposed - Provider temporário para testes incrementais
 * Etapa 8.2: Permite testar o novo contexto sem quebrar o sistema existente
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

interface DataContextComposedProps {
  children: React.ReactNode;
}

export const DataContextComposed: React.FC<DataContextComposedProps> = ({ children }) => {
  return (
    <DataProvider>
      <DataServiceOrdersProvider>
        <DataVendasProviderWithDependency>
          <DataPagamentosProvider>
            <DataGlobalProvider>
              {children}
            </DataGlobalProvider>
          </DataPagamentosProvider>
        </DataVendasProviderWithDependency>
      </DataServiceOrdersProvider>
    </DataProvider>
  );
}; 