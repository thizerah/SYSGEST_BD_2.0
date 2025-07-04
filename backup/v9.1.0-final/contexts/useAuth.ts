import { useContext } from 'react';
import { AuthContext } from './AuthContext';

// Hook personalizado para usar o contexto de autenticação
const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export { useAuth }; 