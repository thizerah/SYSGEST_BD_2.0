import { supabase } from '@/lib/supabase';

export interface EquipeRow {
  id: string;
  dono_user_id: string;
  nome_completo: string;
  user_id: string | null;
  funcao: string;
  id_vendedor?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function fetchEquipeById(id: string): Promise<EquipeRow | null> {
  const { data, error } = await supabase.from('equipe').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data as EquipeRow;
}

export async function fetchEquipe(donoUserId: string): Promise<EquipeRow[]> {
  const { data, error } = await supabase
    .from('equipe')
    .select('*')
    .eq('dono_user_id', donoUserId)
    .order('nome_completo');
  if (error) throw error;
  return (data ?? []) as EquipeRow[];
}

export async function createEquipe(
  donoUserId: string,
  payload: { nome_completo: string; user_id?: string | null; funcao: string; id_vendedor?: string | null }
): Promise<EquipeRow> {
  const { data, error } = await supabase
    .from('equipe')
    .insert({
      dono_user_id: donoUserId,
      nome_completo: payload.nome_completo,
      user_id: payload.user_id ?? null,
      funcao: payload.funcao,
      id_vendedor: payload.id_vendedor ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as EquipeRow;
}

export async function updateEquipe(
  id: string,
  payload: Partial<{ nome_completo: string; user_id: string | null; funcao: string; id_vendedor: string | null }>
): Promise<EquipeRow> {
  const { data, error } = await supabase
    .from('equipe')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as EquipeRow;
}

export async function deleteEquipe(id: string): Promise<void> {
  const { error } = await supabase.from('equipe').delete().eq('id', id);
  if (error) throw error;
}
