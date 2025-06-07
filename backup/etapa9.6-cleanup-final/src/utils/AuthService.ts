import { supabase, mapSupabaseUser, type SupabaseUser } from '@/lib/supabase';
import { User } from '@/types';

export type AuthErrorType = 'invalid_credentials' | 'access_suspended' | 'user_not_found' | 'session_expired';

export interface AuthResult {
  success: boolean;
  user?: User;
  errorType?: AuthErrorType;
}

export const AuthService = {
  /**
   * Fazer login com email e senha
   */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, errorType: 'invalid_credentials' };
        }
        throw error;
      }

      if (!data.user) {
        return { success: false, errorType: 'user_not_found' };
      }

      // Buscar dados adicionais do usuário na tabela personalizada
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar dados do usuário:', userError);
      }

      // Verificar se o usuário tem acesso liberado
      if (userData && !userData.acesso_liberado) {
        return { success: false, errorType: 'access_suspended' };
      }

      // Mapear o usuário do Supabase para o formato da aplicação
      const mappedUser = mapSupabaseUser(data.user, userData as SupabaseUser);

      return { 
        success: true, 
        user: mappedUser
      };
    } catch (error) {
      console.error('Erro de autenticação:', error);
      return { success: false, errorType: 'invalid_credentials' };
    }
  },

  /**
   * Fazer login com magic link
   */
  async loginWithMagicLink(email: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (error) {
        console.error('Erro ao enviar magic link:', error);
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao enviar magic link:', error);
      return { success: false };
    }
  },

  /**
   * Registrar novo usuário
   */
  async register(
    email: string, 
    password: string, 
    userData: Omit<SupabaseUser, 'id' | 'data_adesao' | 'acesso_liberado'>
  ): Promise<AuthResult> {
    try {
      // Registrar usuário na autenticação do Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
          }
        }
      });

      if (error) throw error;
      if (!data.user) {
        return { success: false, errorType: 'user_not_found' };
      }

      // Adicionar dados do usuário na tabela personalizada
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: email,
          username: userData.username,
          name: userData.name,
          role: userData.role,
          empresa: userData.empresa,
          data_adesao: new Date().toISOString(),
          acesso_liberado: true
        });

      if (insertError) {
        console.error('Erro ao inserir dados do usuário:', insertError);
        // Mesmo com erro, retornamos sucesso pois o usuário foi criado na autenticação
      }

      return { 
        success: true, 
        user: mapSupabaseUser(data.user, {
          ...userData,
          id: data.user.id,
          data_adesao: new Date().toISOString(),
          acesso_liberado: true
        })
      };
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      return { success: false };
    }
  },

  /**
   * Buscar usuário atual da sessão
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data } = await supabase.auth.getUser();
      
      if (!data.user) return null;

      // Buscar dados adicionais do usuário
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return mapSupabaseUser(data.user, userData as SupabaseUser);
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return null;
    }
  },

  /**
   * Fazer logout
   */
  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }
}; 