import { supabase } from '@/lib/supabase';
import type { Meta } from '@/types';

export const MESES_NOMES_METAS: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril', 5: 'Maio', 6: 'Junho',
  7: 'Julho', 8: 'Agosto', 9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

export function getMesNomeMetas(mesNumero: number): string {
  return MESES_NOMES_METAS[mesNumero] ?? '';
}

/** Ordenar metas: ano desc, mes desc (mais recente primeiro) */
export function ordenarMetasPorMesAno(a: Meta, b: Meta): number {
  if (a.ano !== b.ano) return b.ano - a.ano;
  return b.mes - a.mes;
}

export interface MetaRow extends Meta {
  id?: string;
  user_id?: string;
}

export async function fetchMetas(userId: string): Promise<Meta[]> {
  const { data, error } = await supabase
    .from('metas')
    .select('id, mes, ano, pos_pago, flex_conforto, nova_parabolica, total, fibra, seguros_pos, seguros_fibra, sky_mais, movel')
    .eq('user_id', userId)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as MetaRow[];
  return rows.map((r) => ({
    mes: r.mes,
    ano: r.ano,
    pos_pago: r.pos_pago ?? 0,
    flex_conforto: r.flex_conforto ?? 0,
    nova_parabolica: r.nova_parabolica ?? 0,
    total: r.total ?? 0,
    fibra: r.fibra ?? 0,
    seguros_pos: r.seguros_pos ?? 0,
    seguros_fibra: r.seguros_fibra ?? 0,
    sky_mais: r.sky_mais ?? 0,
    movel: r.movel ?? 0,
  }));
}

export type MetaUpsertItem = {
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
  movel?: number;
};

export async function upsertMetaRow(userId: string, item: MetaUpsertItem): Promise<void> {
  const { data: existing } = await supabase
    .from('metas')
    .select('id')
    .eq('user_id', userId)
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
      .from('metas')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('metas').insert({
      user_id: userId,
      mes: item.mes,
      ano: item.ano,
      ...payload,
    });
    if (error) throw error;
  }
}

export async function deleteMetaRow(
  userId: string,
  mes: number,
  ano: number
): Promise<void> {
  const { error } = await supabase
    .from('metas')
    .delete()
    .eq('user_id', userId)
    .eq('mes', mes)
    .eq('ano', ano);
  if (error) throw error;
}
