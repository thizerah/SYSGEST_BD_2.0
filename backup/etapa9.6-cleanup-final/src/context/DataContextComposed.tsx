/**
 * DataContextComposed - Provider temporário para testes incrementais
 * Etapa 8.2: Permite testar o novo contexto sem quebrar o sistema existente
 * Etapa 9.3: Otimizado para eliminar dependências críticas
 * Etapa 9.4: Otimizado com memoização para performance máxima
 */

import React, { useMemo } from 'react';
import { DataProvider } from './DataContext';
import { DataServiceOrdersProvider } from './DataServiceOrdersContext';
import { DataVendasProvider } from './DataVendasContext';
import { DataPagamentosProvider } from './DataPagamentosContext';
import { DataGlobalProvider } from './DataGlobalContext';
import useData from './useData';

interface DataVendasProviderWithDependencyProps {
  children: React.ReactNode;
}

// Provider wrapper otimizado para injetar dependências no DataVendasProvider
const DataVendasProviderWithDependency: React.FC<DataVendasProviderWithDependencyProps> = React.memo(({ children }) => {
  const { primeirosPagamentos } = useData();
  
  // Memoizar props para evitar re-renderizações desnecessárias
  const memoizedProps = useMemo(() => ({
    primeirosPagamentos
  }), [primeirosPagamentos]);
  
  return (
    <DataVendasProvider primeirosPagamentos={memoizedProps.primeirosPagamentos}>
      {children}
    </DataVendasProvider>
  );
});

DataVendasProviderWithDependency.displayName = 'DataVendasProviderWithDependency';

interface DataPagamentosProviderWithDependencyProps {
  children: React.ReactNode;
}

// Provider wrapper otimizado para injetar dependências no DataPagamentosProvider
const DataPagamentosProviderWithDependency: React.FC<DataPagamentosProviderWithDependencyProps> = React.memo(({ children }) => {
  const { 
    primeirosPagamentos, 
    vendas, 
    loading, 
    importPrimeirosPagamentos 
  } = useData();
  
  // Memoizar props para evitar re-renderizações desnecessárias
  const memoizedProps = useMemo(() => ({
    primeirosPagamentos,
    vendas,
    loading,
    importPrimeirosPagamentos
  }), [primeirosPagamentos, vendas, loading, importPrimeirosPagamentos]);
  
  return (
    <DataPagamentosProvider 
      primeirosPagamentos={memoizedProps.primeirosPagamentos}
      vendas={memoizedProps.vendas}
      loading={memoizedProps.loading}
      importPrimeirosPagamentos={memoizedProps.importPrimeirosPagamentos}
    >
      {children}
    </DataPagamentosProvider>
  );
});

DataPagamentosProviderWithDependency.displayName = 'DataPagamentosProviderWithDependency';

interface DataGlobalProviderWithDependencyProps {
  children: React.ReactNode;
}

// Provider wrapper otimizado para injetar dependências no DataGlobalProvider
const DataGlobalProviderWithDependency: React.FC<DataGlobalProviderWithDependencyProps> = React.memo(({ children }) => {
  const { 
    loading,
    clearData,
    importServiceOrders,
    importVendas,
    importPrimeirosPagamentos 
  } = useData();
  
  // Memoizar props para evitar re-renderizações desnecessárias
  const memoizedProps = useMemo(() => ({
    loading,
    clearData,
    importServiceOrders,
    importVendas,
    importPrimeirosPagamentos
  }), [loading, clearData, importServiceOrders, importVendas, importPrimeirosPagamentos]);
  
  return (
    <DataGlobalProvider 
      loading={memoizedProps.loading}
      clearData={memoizedProps.clearData}
      importServiceOrders={memoizedProps.importServiceOrders}
      importVendas={memoizedProps.importVendas}
      importPrimeirosPagamentos={memoizedProps.importPrimeirosPagamentos}
    >
      {children}
    </DataGlobalProvider>
  );
});

DataGlobalProviderWithDependency.displayName = 'DataGlobalProviderWithDependency';

interface DataContextComposedProps {
  children: React.ReactNode;
}

// Provider principal otimizado com memoização
export const DataContextComposed: React.FC<DataContextComposedProps> = React.memo(({ children }) => {
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
});

DataContextComposed.displayName = 'DataContextComposed'; 