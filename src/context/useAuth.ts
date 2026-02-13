import { useContext } from 'react';
import { AuthContext } from './AuthContext';

const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/** Verifica se o usuário tem a permissão (por código). */
const usePermissao = (codigo: string) => {
  const { hasPermissao } = useAuth();
  return hasPermissao(codigo);
};

/** Retorna o código do papel do subusuário, ou null. */
const usePapel = () => {
  const { papelCodigo } = useAuth();
  return papelCodigo;
};

export { useAuth, usePermissao, usePapel }; 