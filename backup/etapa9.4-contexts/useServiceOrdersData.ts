/**
 * Hook customizado para usar o DataServiceOrdersContext
 * Etapa 8.2: Hook especializado para ordens de serviço
 */

import { useContext } from 'react';
import { DataServiceOrdersContext } from './DataServiceOrdersContext';

const useServiceOrdersData = () => {
  const context = useContext(DataServiceOrdersContext);
  
  if (context === undefined) {
    throw new Error('useServiceOrdersData must be used within a DataServiceOrdersProvider');
  }
  
  return context;
};

export default useServiceOrdersData; 