/**
 * Hook customizado para usar o DataVendasContext
 * Etapa 8.3: Hook especializado para vendas
 */

import { useContext } from 'react';
import { DataVendasContext } from './DataVendasContext';

const useVendasData = () => {
  const context = useContext(DataVendasContext);
  
  if (context === undefined) {
    throw new Error('useVendasData must be used within a DataVendasProvider');
  }
  
  return context;
};

export default useVendasData; 