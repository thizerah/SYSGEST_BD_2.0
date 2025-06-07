import { useContext } from 'react';
import { DataContext } from './DataContext';

// Hook personalizado para usar o contexto de dados
const useData = () => {
  const context = useContext(DataContext);
  
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  
  return context;
};

export default useData; 