import { supabase } from '@/lib/supabase';
import type { BaseData } from '@/types';

export interface BaseDataRow extends BaseData {
  id?: string;
  user_id?: string;
}

export const MESES_NOMES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril', 5: 'Maio', 6: 'Junho',
  7: 'Julho', 8: 'Agosto', 9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

export function getMesNome(mesNumero: number): string {
  return MESES_NOMES[mesNumero] ?? '';
}

/** Meses em ordem cronológica para ordenação */
export function ordenarPorMesAno(a: BaseData, b: BaseData): number {
  const anoA = typeof a.ano === 'number' ? a.ano : parseInt(String(a.ano), 10);
  const anoB = typeof b.ano === 'number' ? b.ano : parseInt(String(b.ano), 10);
  if (anoA !== anoB) return anoB - anoA;
  const mesA = typeof a.mes === 'number' ? a.mes : parseMesParaNumero(a.mes);
  const mesB = typeof b.mes === 'number' ? b.mes : parseMesParaNumero(b.mes);
  return mesB - mesA;
}

function parseMesParaNumero(mes: string | number): number {
  if (typeof mes === 'number') return mes;
  const lower = String(mes).toLowerCase();
  const idx = Object.entries(MESES_NOMES).find(
    ([_, n]) => n.toLowerCase() === lower
  );
  return idx ? parseInt(idx[0], 10) : 0;
}

export async function fetchBaseData(userId: string): Promise<BaseData[]> {
  const { data, error } = await supabase
    .from('base_data')
    .select('id, mes, ano, base_tv, base_fibra, alianca, alianca_fibra')
    .eq('user_id', userId)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as (BaseDataRow & { alianca_fibra?: number })[];
  return rows.map((r) => ({
    mes: r.mes,
    ano: r.ano,
    base_tv: r.base_tv ?? 0,
    base_fibra: r.base_fibra ?? 0,
    alianca: r.alianca ?? 0,
    alianca_fibra: r.alianca_fibra ?? undefined,
  }));
}

export async function upsertBaseRow(
  userId: string,
  item: { mes: string; ano: number; base_tv: number; base_fibra: number; alianca: number; alianca_fibra?: number }
): Promise<void> {
  const { data: existing } = await supabase
    .from('base_data')
    .select('id')
    .eq('user_id', userId)
    .eq('mes', item.mes)
    .eq('ano', item.ano)
    .maybeSingle();

  const payload = {
    base_tv: item.base_tv,
    base_fibra: item.base_fibra,
    alianca: item.alianca,
    alianca_fibra: item.alianca_fibra ?? null,
  };
  if (existing) {
    const { error } = await supabase
      .from('base_data')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('base_data').insert({
      user_id: userId,
      mes: item.mes,
      ano: item.ano,
      ...payload,
    });
    if (error) throw error;
  }
}

export async function deleteBaseRow(
  userId: string,
  mes: string,
  ano: number
): Promise<void> {
  const { error } = await supabase
    .from('base_data')
    .delete()
    .eq('user_id', userId)
    .eq('mes', mes)
    .eq('ano', ano);
  if (error) throw error;
}
