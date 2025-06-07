import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { AuthService, AuthErrorType } from '@/utils/AuthService';
import { SupabaseUser } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; errorType?: AuthErrorType }>;
  loginWithMagicLink: (email: string) => Promise<{ success: boolean }>;
  register: (
    email: string, 
    password: string, 
    userData: Omit<SupabaseUser, 'id' | 'data_adesao' | 'acesso_liberado'>
  ) => Promise<{ success: boolean; errorType?: AuthErrorType }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar se existe um usuário na sessão ao carregar a aplicação
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; errorType?: AuthErrorType }> => {
    setLoading(true);
    
    try {
      const result = await AuthService.login(email, password);
      
      if (result.success && result.user) {
        setUser(result.user);
        return { success: true };
      }
      
      return { 
        success: false, 
        errorType: result.errorType 
      };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return { success: false, errorType: 'invalid_credentials' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Login com Magic Link
  const loginWithMagicLink = useCallback(async (email: string): Promise<{ success: boolean }> => {
    setLoading(true);
    
    try {
      const result = await AuthService.loginWithMagicLink(email);
      return result;
    } catch (error) {
      console.error('Erro ao enviar magic link:', error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (
    email: string, 
    password: string, 
    userData: Omit<SupabaseUser, 'id' | 'data_adesao' | 'acesso_liberado'>
  ): Promise<{ success: boolean; errorType?: AuthErrorType }> => {
    setLoading(true);
    
    try {
      const result = await AuthService.register(email, password, userData);
      
      if (result.success && result.user) {
        setUser(result.user);
        return { success: true };
      }
      
      return { 
        success: false, 
        errorType: result.errorType 
      };
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, loginWithMagicLink, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
