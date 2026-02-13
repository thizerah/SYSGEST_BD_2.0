import { supabase } from '@/lib/supabase';

export interface PapelRow {
  id: string;
  codigo: string;
  nome: string;
}

export interface PermissaoRow {
  id: string;
  codigo: string;
  nome: string;
}

export async function fetchPapeis(): Promise<PapelRow[]> {
  const { data, error } = await supabase.from('papeis').select('id, codigo, nome').order('nome');
  if (error) throw error;
  return (data ?? []) as PapelRow[];
}

export async function fetchPermissoes(): Promise<PermissaoRow[]> {
  const { data, error } = await supabase.from('permissoes').select('id, codigo, nome').order('nome');
  if (error) throw error;
  return (data ?? []) as PermissaoRow[];
}

export async function fetchPapelIdByCodigo(codigo: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('papeis')
    .select('id')
    .eq('codigo', codigo)
    .single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

export async function fetchPermissaoIdsByCodigos(codigos: string[]): Promise<Map<string, string>> {
  if (codigos.length === 0) return new Map();
  const { data, error } = await supabase
    .from('permissoes')
    .select('id, codigo')
    .in('codigo', codigos);
  if (error) return new Map();
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const r = row as { id: string; codigo: string };
    map.set(r.codigo, r.id);
  }
  return map;
}
