import { createClient } from '@supabase/supabase-js';
import { type User as SysGestUser } from '@/types';
import { User } from '@supabase/supabase-js';

// Tipos para o usuário do Supabase
export type SupabaseUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  empresa: string;
  data_adesao: string;
  acesso_liberado: boolean;
};

// Variáveis de configuração do Supabase
const supabaseUrl = 'https://uhxivfkbugowffqszhgw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoeGl2ZmtidWdvd2ZmcXN6aGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MzI0OTIsImV4cCI6MjA2MTUwODQ5Mn0.r8TXl1IyiaiQG4Ws0TBs2IsJO05jQpSWuKnrSvaEwDI';

// Verifica se as variáveis de ambiente foram configuradas corretamente
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variáveis de ambiente do Supabase não configuradas corretamente.');
  throw new Error('supabaseUrl is required.');
}

// Cria o cliente do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para mapear um usuário do Supabase para nosso modelo de usuário
export const mapSupabaseUser = (supabaseUser: User, userData?: SupabaseUser): SysGestUser => {
  return {
    id: supabaseUser.id,
    username: userData?.username || supabaseUser.email?.split('@')[0] || '',
    name: userData?.name || supabaseUser.user_metadata?.name || '',
    email: supabaseUser.email || '',
    role: userData?.role || 'user',
    empresa: userData?.empresa || 'InsightPro',
    data_adesao: userData?.data_adesao || new Date().toISOString(),
    acesso_liberado: userData?.acesso_liberado ?? true,
  };
}; 