import { supabase } from '@/lib/supabase';

export interface MetaVendedor {
  id?: string;
  user_id?: string;
  vendedor_nome: string;
  mes: number;
  ano: number;
  pos_pago: number;
  flex_conforto: number;
  nova_parabolica: number;
  total: number;
  fibra: number;
  seguros_pos: number;
  seguros_fibra: number;
  sky_mais: number;
  movel: number;
}

export const MESES_NOMES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril', 5: 'Maio', 6: 'Junho',
  7: 'Julho', 8: 'Agosto', 9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

export function getMesNome(mes: number): string {
  return MESES_NOMES[mes] ?? '';
}

export async function fetchMetasVendedor(
  userId: string,
  filtro?: { mes?: number; ano?: number; vendedor?: string }
): Promise<MetaVendedor[]> {
  let query = supabase
    .from('metas_vendedor')
    .select('*')
    .eq('user_id', userId)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
    .order('vendedor_nome');

  if (filtro?.mes) query = query.eq('mes', filtro.mes);
  if (filtro?.ano) query = query.eq('ano', filtro.ano);
  if (filtro?.vendedor) query = query.eq('vendedor_nome', filtro.vendedor);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    user_id: r.user_id,
    vendedor_nome: r.vendedor_nome ?? '',
    mes: Number(r.mes),
    ano: Number(r.ano),
    pos_pago: Number(r.pos_pago ?? 0),
    flex_conforto: Number(r.flex_conforto ?? 0),
    nova_parabolica: Number(r.nova_parabolica ?? 0),
    total: Number(r.total ?? 0),
    fibra: Number(r.fibra ?? 0),
    seguros_pos: Number(r.seguros_pos ?? 0),
    seguros_fibra: Number(r.seguros_fibra ?? 0),
    sky_mais: Number(r.sky_mais ?? 0),
    movel: Number(r.movel ?? 0),
  }));
}

export async function upsertMetaVendedor(
  userId: string,
  item: Omit<MetaVendedor, 'id' | 'user_id'>
): Promise<void> {
  const { data: existing } = await supabase
    .from('metas_vendedor')
    .select('id')
    .eq('user_id', userId)
    .eq('vendedor_nome', item.vendedor_nome)
    .eq('mes', item.mes)
    .eq('ano', item.ano)
    .maybeSingle();

  const payload = {
    pos_pago: item.pos_pago,
    flex_conforto: item.flex_conforto,
    nova_parabolica: item.nova_parabolica,
    total: item.total,
    fibra: item.fibra,
    seguros_pos: item.seguros_pos,
    seguros_fibra: item.seguros_fibra,
    sky_mais: item.sky_mais,
    movel: item.movel ?? 0,
  };

  if (existing) {
    const { error } = await supabase
      .from('metas_vendedor')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('metas_vendedor').insert({
      user_id: userId,
      vendedor_nome: item.vendedor_nome,
      mes: item.mes,
      ano: item.ano,
      ...payload,
    });
    if (error) throw error;
  }
}

export async function deleteMetaVendedor(
  userId: string,
  vendedorNome: string,
  mes: number,
  ano: number
): Promise<void> {
  const { error } = await supabase
    .from('metas_vendedor')
    .delete()
    .eq('user_id', userId)
    .eq('vendedor_nome', vendedorNome)
    .eq('mes', mes)
    .eq('ano', ano);
  if (error) throw error;
}
