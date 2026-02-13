import { supabase, mapSupabaseUser, type SupabaseUser } from '@/lib/supabase';
import { User } from '@/types';
import { defaultAuthExtras, type AuthExtras } from '@/types/auth';
import type { PapelCodigo } from '@/types/auth';

export type AuthErrorType = 'invalid_credentials' | 'access_suspended' | 'user_not_found' | 'session_expired';

export interface AuthResult {
  success: boolean;
  user?: User;
  authExtras?: AuthExtras;
  errorType?: AuthErrorType;
}

type Resolved =
  | { kind: 'ok'; user: User; authExtras: AuthExtras }
  | { kind: 'suspended' }
  | { kind: 'not_found' };

async function resolveUserWithExtras(authUser: {
  id: string;
  email?: string;
  user_metadata?: { name?: string };
}): Promise<Resolved> {
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (userData) {
    if (!userData.acesso_liberado) return { kind: 'suspended' };
    const user = mapSupabaseUser(
      { id: authUser.id, email: authUser.email ?? '', user_metadata: authUser.user_metadata } as { id: string; email?: string; user_metadata?: Record<string, unknown> },
      userData as SupabaseUser
    );
    return { kind: 'ok', user, authExtras: defaultAuthExtras() };
  }

  const { data: ue, error: ueError } = await supabase
    .from('usuarios_empresa')
    .select('id, user_id, dono_user_id, papel_id, equipe_id, papeis(codigo)')
    .eq('user_id', authUser.id)
    .eq('ativo', true)
    .single();

  if (ueError || !ue) return { kind: 'not_found' };

  const papelCodigo = (ue.papeis as { codigo?: string } | null)?.codigo as PapelCodigo | undefined;
  const donoUserId = ue.dono_user_id as string;

  const { data: dono } = await supabase
    .from('users')
    .select('empresa')
    .eq('id', donoUserId)
    .single();

  const { data: perms } = await supabase
    .from('usuario_permissoes')
    .select('permissoes(codigo)')
    .eq('usuario_empresa_id', ue.id);

  const permissoes = (perms ?? [])
    .map((r) => (r.permissoes as { codigo?: string } | null)?.codigo)
    .filter((c): c is string => !!c);

  const user: User = {
    id: authUser.id,
    username: authUser.email?.split('@')[0] ?? '',
    name: authUser.user_metadata?.name ?? authUser.email ?? 'Subusuário',
    email: authUser.email ?? '',
    role: 'user',
    empresa: (dono as { empresa?: string } | null)?.empresa ?? 'Empresa',
    data_adesao: new Date().toISOString(),
    acesso_liberado: true,
  };

  const authExtras: AuthExtras = {
    isSubUser: true,
    papelCodigo: papelCodigo ?? null,
    permissoes,
    equipeId: (ue.equipe_id as string) || null,
    donoUserId,
  };

  return { kind: 'ok', user, authExtras };
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

      const resolved = await resolveUserWithExtras({
        id: data.user.id,
        email: data.user.email ?? undefined,
        user_metadata: data.user.user_metadata as { name?: string } | undefined,
      });

      if (resolved.kind === 'suspended') {
        await supabase.auth.signOut();
        return { success: false, errorType: 'access_suspended' };
      }
      if (resolved.kind === 'not_found') {
        await supabase.auth.signOut();
        return { success: false, errorType: 'user_not_found' };
      }

      return {
        success: true,
        user: resolved.user,
        authExtras: resolved.authExtras,
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
        }),
        authExtras: defaultAuthExtras(),
      };
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      return { success: false };
    }
  },

  /**
   * Buscar usuário atual da sessão (users ou usuarios_empresa) + extras
   */
  async getCurrentUser(): Promise<{ user: User; authExtras: AuthExtras } | null> {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;

      const resolved = await resolveUserWithExtras({
        id: data.user.id,
        email: data.user.email ?? undefined,
        user_metadata: data.user.user_metadata as { name?: string } | undefined,
      });

      if (resolved.kind !== 'ok') return null;
      return { user: resolved.user, authExtras: resolved.authExtras };
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