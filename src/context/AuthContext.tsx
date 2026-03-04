import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@/types';
import { AuthService, AuthErrorType } from '@/utils/AuthService';
import { SupabaseUser } from '@/lib/supabase';
import type { AuthExtras } from '@/types/auth';
import { defaultAuthExtras } from '@/types/auth';
import {
  getPermissionForPage,
  getPermissionsAnyForPage,
  isAdminOnlyPage,
  isDonoOrAdminOnlyPage,
} from '@/lib/permissoes';

interface AuthContextType {
  user: User | null;
  authExtras: AuthExtras;
  login: (email: string, password: string) => Promise<{ success: boolean; errorType?: AuthErrorType }>;
  loginWithMagicLink: (email: string) => Promise<{ success: boolean }>;
  register: (
    email: string,
    password: string,
    userData: Omit<SupabaseUser, 'id' | 'data_adesao' | 'acesso_liberado'>
  ) => Promise<{ success: boolean; errorType?: AuthErrorType }>;
  logout: () => Promise<void>;
  loading: boolean;
  /** Verifica se o usuário pode acessar a página (sidebar / conteúdo). */
  canAccessPage: (pageId: string) => boolean;
  /** Verifica se tem a permissão (por código). */
  hasPermissao: (codigo: string) => boolean;
  /** Código do papel quando subusuário. */
  papelCodigo: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authExtras, setAuthExtras] = useState<AuthExtras>(() => defaultAuthExtras());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const resolved = await AuthService.getCurrentUser();
        if (resolved) {
          setUser(resolved.user);
          setAuthExtras(resolved.authExtras);
        } else {
          setUser(null);
          setAuthExtras(defaultAuthExtras());
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setUser(null);
        setAuthExtras(defaultAuthExtras());
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await AuthService.login(email, password);
      if (result.success && result.user) {
        setUser(result.user);
        setAuthExtras(result.authExtras ?? defaultAuthExtras());
        return { success: true };
      }
      return { success: false, errorType: result.errorType };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return { success: false, errorType: 'invalid_credentials' as AuthErrorType };
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithMagicLink = useCallback(async (email: string) => {
    setLoading(true);
    try {
      return await AuthService.loginWithMagicLink(email);
    } catch (error) {
      console.error('Erro ao enviar magic link:', error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
      userData: Omit<SupabaseUser, 'id' | 'data_adesao' | 'acesso_liberado'>
    ) => {
      setLoading(true);
      try {
        const result = await AuthService.register(email, password, userData);
        if (result.success && result.user) {
          setUser(result.user);
          setAuthExtras(result.authExtras ?? defaultAuthExtras());
          return { success: true };
        }
        return { success: false, errorType: result.errorType };
      } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return { success: false };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
      setUser(null);
      setAuthExtras(defaultAuthExtras());
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }, []);

  const hasPermissao = useCallback(
    (codigo: string) => {
      if (!user) return false;
      if (!authExtras.isSubUser) return true;
      return authExtras.permissoes.includes(codigo);
    },
    [user, authExtras]
  );

  const canAccessPage = useCallback(
    (pageId: string) => {
      if (!user) return false;
      if (isAdminOnlyPage(pageId)) return user.role === 'admin';
      if (isDonoOrAdminOnlyPage(pageId)) return !authExtras.isSubUser;
      const permsAny = getPermissionsAnyForPage(pageId);
      if (permsAny && permsAny.length > 0) {
        return permsAny.some((p) => hasPermissao(p));
      }
      const perm = getPermissionForPage(pageId);
      if (!perm) return true;
      return hasPermissao(perm);
    },
    [user, authExtras.isSubUser, hasPermissao]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      authExtras,
      login,
      loginWithMagicLink,
      register,
      logout,
      loading,
      canAccessPage,
      hasPermissao,
      papelCodigo: authExtras.papelCodigo,
    }),
    [
      user,
      authExtras,
      login,
      loginWithMagicLink,
      register,
      logout,
      loading,
      canAccessPage,
      hasPermissao,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
