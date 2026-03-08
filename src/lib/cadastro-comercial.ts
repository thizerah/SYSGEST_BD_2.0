import { supabase } from '@/lib/supabase';
import type { PlanoFibra, PlanoMovel, VendaFibra, VendaMovel, VendaNovaParabolica } from '@/types';

/** Busca planos FIBRA ativos do dono (ordenados por preço, menor primeiro) */
export async function fetchPlanosFibra(userId: string): Promise<PlanoFibra[]> {
  const { data, error } = await supabase
    .from('planos_fibra')
    .select('*')
    .eq('user_id', userId)
    .eq('ativo', true)
    .order('preco_mensal', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as PlanoFibra[];
}

/** Busca todos os planos FIBRA do dono (inclui inativos, ordenados por preço) */
export async function fetchPlanosFibraAll(userId: string): Promise<PlanoFibra[]> {
  const { data, error } = await supabase
    .from('planos_fibra')
    .select('*')
    .eq('user_id', userId)
    .order('preco_mensal', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as PlanoFibra[];
}

/** Busca planos MÓVEL ativos do dono (ordenados por preço, menor primeiro) */
export async function fetchPlanosMovel(userId: string): Promise<PlanoMovel[]> {
  const { data, error } = await supabase
    .from('planos_movel')
    .select('*')
    .eq('user_id', userId)
    .eq('ativo', true)
    .order('preco_mensal', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as PlanoMovel[];
}

/** Busca todos os planos MÓVEL do dono (inclui inativos, ordenados por preço) */
export async function fetchPlanosMovelAll(userId: string): Promise<PlanoMovel[]> {
  const { data, error } = await supabase
    .from('planos_movel')
    .select('*')
    .eq('user_id', userId)
    .order('preco_mensal', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as PlanoMovel[];
}

/** Insere plano FIBRA */
export async function insertPlanoFibra(userId: string, plano: Omit<PlanoFibra, 'id' | 'user_id'>): Promise<PlanoFibra> {
  const { data, error } = await supabase
    .from('planos_fibra')
    .insert({ ...plano, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as PlanoFibra;
}

/** Atualiza plano FIBRA */
export async function updatePlanoFibra(id: string, plano: Partial<Omit<PlanoFibra, 'id' | 'user_id'>>): Promise<void> {
  const { error } = await supabase
    .from('planos_fibra')
    .update({ ...plano, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Insere plano MÓVEL */
export async function insertPlanoMovel(userId: string, plano: Omit<PlanoMovel, 'id' | 'user_id'>): Promise<PlanoMovel> {
  const { data, error } = await supabase
    .from('planos_movel')
    .insert({ ...plano, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as PlanoMovel;
}

/** Atualiza plano MÓVEL */
export async function updatePlanoMovel(id: string, plano: Partial<Omit<PlanoMovel, 'id' | 'user_id'>>): Promise<void> {
  const { error } = await supabase
    .from('planos_movel')
    .update({ ...plano, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Insere venda FIBRA */
export async function insertVendaFibra(venda: Omit<VendaFibra, 'id'>): Promise<void> {
  const { error } = await supabase.from('vendas_fibra').insert(venda);
  if (error) throw error;
}

/** Insere venda MÓVEL */
export async function insertVendaMovel(venda: Omit<VendaMovel, 'id'>): Promise<void> {
  const { error } = await supabase.from('vendas_movel').insert(venda);
  if (error) throw error;
}

/** Insere venda Nova Parabólica em vendas_nova_parabolica */
export async function insertVendaNovaParabolica(
  userId: string,
  venda: Omit<VendaNovaParabolica, 'id'>
): Promise<void> {
  const { error } = await supabase.from('vendas_nova_parabolica').insert({
    ...venda,
    user_id: userId,
  });
  if (error) throw error;
}

/** Busca vendas FIBRA do dono */
export async function fetchVendasFibra(userId: string): Promise<VendaFibra[]> {
  const { data, error } = await supabase
    .from('vendas_fibra')
    .select('*')
    .eq('user_id', userId)
    .order('data_cadastro', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VendaFibra[];
}

/** Busca vendas MÓVEL do dono */
export async function fetchVendasMovel(userId: string): Promise<VendaMovel[]> {
  const { data, error } = await supabase
    .from('vendas_movel')
    .select('*')
    .eq('user_id', userId)
    .order('data_cadastro', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VendaMovel[];
}

/** Busca vendas Nova Parabólica do dono */
export async function fetchVendasNovaParabolica(userId: string): Promise<VendaNovaParabolica[]> {
  const { data, error } = await supabase
    .from('vendas_nova_parabolica')
    .select('*')
    .eq('user_id', userId)
    .order('data_venda', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VendaNovaParabolica[];
}

/** Atualiza status da venda FIBRA */
export async function updateStatusVendaFibra(id: string, statusProposta: string): Promise<void> {
  const { error } = await supabase
    .from('vendas_fibra')
    .update({ status_proposta: statusProposta, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Atualiza status da venda MÓVEL */
export async function updateStatusVendaMovel(id: string, statusProposta: string): Promise<void> {
  const { error } = await supabase
    .from('vendas_movel')
    .update({ status_proposta: statusProposta, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Atualiza status da venda Nova Parabólica */
export async function updateStatusVendaNovaParabolica(id: string, statusProposta: string): Promise<void> {
  const { error } = await supabase
    .from('vendas_nova_parabolica')
    .update({ status_proposta: statusProposta, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
