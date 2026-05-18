import { supabase } from '@/lib/supabase';
import type { MaterialRota } from '@/types';
import type {
  Material,
  MaterialForm,
  Local,
  LocalForm,
  EstoqueSaldo,
  Movimentacao,
  Serial,
  EntradaMaterialForm,
  TransferenciaForm,
  FiltroEstoque,
  FiltroMovimentacoes,
  FiltroSeriais,
  TipoMovimentacao,
  TipoOrigem,
  StatusSerial,
  LinhaHistoricoSerial,
  LinhaOtimizacaoMaterial,
  BreakdownReusoMaterial,
  StatusUnidadeReuso,
  ContextoHistoricoKey,
  HistoricoFiltroContexto,
} from '@/types/estoque';

export type { LinhaHistoricoSerial, HistoricoFiltroContexto, ContextoHistoricoKey } from '@/types/estoque';

export const CONTEXTO_HISTORICO_LABEL: Record<ContextoHistoricoKey, string> = {
  estorno_auditoria: 'Estorno / auditoria',
  entrada_pos_estorno: 'Entrada (pós-estorno)',
  baixa_reconferencia: 'Baixa (reconferência)',
  baixa_roteiro: 'Baixa no serviço',
  entrada: 'Entrada',
  transferencia: 'Transferência',
  ajuste_geral: 'Ajuste',
  saida_outros: 'Saída (outros)',
};

export const HISTORICO_CONTEXTO_FILTRO_OPTIONS: { value: HistoricoFiltroContexto; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'estorno_auditoria', label: 'Estorno / auditoria' },
  { value: 'baixa_roteiro', label: 'Baixa no serviço (1ª)' },
  { value: 'outros', label: 'Outros lançamentos' },
];

/** Coluna `seriais.movimentacao_entrada_id` ainda não criada (migration não aplicada no Supabase). */
function isMovimentacaoEntradaColumnMissing(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  if (error.code === '42703') return true;
  const m = (error.message ?? '').toLowerCase();
  return m.includes('movimentacao_entrada_id') && m.includes('does not exist');
}

// ─────────────────────────────────────────────
// Locais automáticos
// O Estoque Central e os locais de técnico são
// criados automaticamente; não há UI de cadastro.
// ─────────────────────────────────────────────

/** Primeiro local empresa do dono (estoque físico). Evita maybeSingle() com N>1 linhas, que gera novo local “fantasma”. */
export async function getOrCreateEstoqueCentral(donoUserId: string): Promise<Local> {
  const { data: rows, error: selErr } = await supabase
    .from('locais')
    .select('*')
    .eq('dono_user_id', donoUserId)
    .eq('tipo', 'empresa')
    .order('created_at', { ascending: true })
    .limit(1);

  if (selErr) throw selErr;
  if (rows && rows.length > 0) return rows[0] as Local;

  const { data, error } = await supabase
    .from('locais')
    .insert({ dono_user_id: donoUserId, nome: 'Estoque Central', tipo: 'empresa', equipe_id: null })
    .select()
    .single();
  if (error) throw error;
  return data as Local;
}

/** Remove espaços invisíveis comuns ao colar JSON / Excel. */
export function normalizarNumeroSerial(numeroSerial: string): string {
  return numeroSerial
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

/** Valores gravados em `seriais` para unicidade (mesmo IRD + mesma origem + mesma NF = bloqueado). */
export type ChaveEntradaSerial = {
  entrada_tipo_origem: TipoOrigem;
  entrada_numero_nota_fiscal: string;
  entrada_data_nota_fiscal: string;
};

export function normalizarChaveEntradaParaSeriais(
  tipo_origem: TipoOrigem,
  numero_nota_fiscal: string | null | undefined,
  data_nota_fiscal: string | null | undefined
): ChaveEntradaSerial {
  return {
    entrada_tipo_origem: tipo_origem,
    entrada_numero_nota_fiscal: (numero_nota_fiscal ?? '').trim(),
    entrada_data_nota_fiscal: data_nota_fiscal ? data_nota_fiscal.split('T')[0] : '',
  };
}

export async function getOrCreateLocalTecnico(
  donoUserId: string,
  equipeId: string,
  nomeTecnico: string
): Promise<Local> {
  // Nunca usar maybeSingle() aqui: com N>1 linhas o PostgREST falha e o código insere outro local (explosão de duplicatas).
  const { data: rows, error: selErr } = await supabase
    .from('locais')
    .select('*')
    .eq('dono_user_id', donoUserId)
    .eq('tipo', 'tecnico')
    .eq('equipe_id', equipeId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (selErr) throw selErr;
  if (rows && rows.length > 0) {
    const existing = rows[0] as Local;
    // Atualiza o nome se estiver vazio e temos um nome válido agora
    if (!existing.nome?.trim() && nomeTecnico.trim()) {
      const { data: updated } = await supabase
        .from('locais')
        .update({ nome: nomeTecnico.trim() })
        .eq('id', existing.id)
        .select()
        .single();
      return (updated ?? existing) as Local;
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('locais')
    .insert({ dono_user_id: donoUserId, nome: nomeTecnico.trim() || equipeId, tipo: 'tecnico', equipe_id: equipeId })
    .select()
    .single();
  if (error) throw error;
  return data as Local;
}

// ─────────────────────────────────────────────
// Materiais
// ─────────────────────────────────────────────

/**
 * Dono dos registros na tabela `materiais` quando existe catálogo único (todas as empresas).
 * Defina `VITE_MATERIAIS_CATALOG_OWNER_ID` no `.env` com o UUID do usuário dono do catálogo global.
 * Sem env: usa o próprio ID do dono da empresa (comportamento por tenant).
 */
export function resolveMateriaisCatalogOwnerId(companyOwnerContextId: string): string {
  const raw = import.meta.env.VITE_MATERIAIS_CATALOG_OWNER_ID as string | undefined;
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s.length > 0 ? s : companyOwnerContextId;
}

export async function fetchMateriais(donoUserId: string): Promise<Material[]> {
  const ownerId = resolveMateriaisCatalogOwnerId(donoUserId);
  const { data, error } = await supabase
    .from('materiais')
    .select('*')
    .eq('dono_user_id', ownerId)
    .order('descricao');
  if (error) throw error;
  return (data ?? []) as Material[];
}

export async function createMaterial(
  donoUserId: string,
  payload: MaterialForm
): Promise<Material> {
  const ownerId = resolveMateriaisCatalogOwnerId(donoUserId);
  const { data, error } = await supabase
    .from('materiais')
    .insert({ dono_user_id: ownerId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data as Material;
}

export async function updateMaterial(
  id: string,
  payload: Partial<MaterialForm>
): Promise<Material> {
  const { data, error } = await supabase
    .from('materiais')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Material;
}

// ─────────────────────────────────────────────
// Locais
// ─────────────────────────────────────────────

export async function fetchLocais(donoUserId: string): Promise<Local[]> {
  const { data, error } = await supabase
    .from('locais')
    .select('*, equipe(nome_completo)')
    .eq('dono_user_id', donoUserId)
    .order('nome');
  if (error) throw error;
  return (data ?? []) as Local[];
}

export async function createLocal(
  donoUserId: string,
  payload: LocalForm
): Promise<Local> {
  const { data, error } = await supabase
    .from('locais')
    .insert({ dono_user_id: donoUserId, ...payload })
    .select('*, equipe(nome_completo)')
    .single();
  if (error) throw error;
  return data as Local;
}

export async function updateLocal(
  id: string,
  payload: Partial<LocalForm>
): Promise<Local> {
  const { data, error } = await supabase
    .from('locais')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, equipe(nome_completo)')
    .single();
  if (error) throw error;
  return data as Local;
}

// ─────────────────────────────────────────────
// Estoque (saldo)
// ─────────────────────────────────────────────

export async function fetchEstoque(
  donoUserId: string,
  filtro?: FiltroEstoque
): Promise<EstoqueSaldo[]> {
  let query = supabase
    .from('estoque')
    .select(
      '*, material:materiais(codigo_material, descricao, unidade_medida, serializado), local:locais(nome, tipo, equipe_id)'
    )
    .eq('dono_user_id', donoUserId);

  if (filtro?.material_id) query = query.eq('material_id', filtro.material_id);
  if (filtro?.local_id) query = query.eq('local_id', filtro.local_id);
  if (filtro?.apenasComSaldo) query = query.gt('quantidade', 0);

  const { data, error } = await query.order('data_atualizacao', { ascending: false });
  if (error) throw error;
  return (data ?? []) as EstoqueSaldo[];
}

// ─────────────────────────────────────────────
// Movimentações
// ─────────────────────────────────────────────

export async function fetchMovimentacoes(
  donoUserId: string,
  filtro?: FiltroMovimentacoes
): Promise<Movimentacao[]> {
  let query = supabase
    .from('movimentacoes')
    .select(
      '*, material:materiais(codigo_material, descricao, unidade_medida, serializado), local_origem:locais!local_origem_id(nome, tipo, equipe:equipe_id(nome_completo)), local_destino:locais!local_destino_id(nome, tipo, equipe:equipe_id(nome_completo))'
    )
    .eq('dono_user_id', donoUserId);

  if (filtro?.material_id) query = query.eq('material_id', filtro.material_id);
  if (filtro?.local_tecnico_id) {
    const lid = filtro.local_tecnico_id;
    query = query.or(`local_origem_id.eq.${lid},local_destino_id.eq.${lid}`);
  }
  if (filtro?.tipo_movimentacao) query = query.eq('tipo_movimentacao', filtro.tipo_movimentacao);
  if (filtro?.data_inicio) query = query.gte('data_movimentacao', filtro.data_inicio);
  if (filtro?.data_fim) query = query.lte('data_movimentacao', filtro.data_fim);

  const { data, error } = await query.order('data_movimentacao', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Movimentacao[];
}

/**
 * Números de serial por movimentação.
 * Considera `movimentacao_id` (última mov., ex. transferência) e `movimentacao_entrada_id` (entrada original).
 */
export async function fetchSeriaisNumerosPorMovimentacoes(
  donoUserId: string,
  movimentacaoIds: string[]
): Promise<Record<string, string[]>> {
  if (movimentacaoIds.length === 0) return {};
  const acc: Record<string, Set<string>> = {};
  const add = (mid: string | null | undefined, num: string) => {
    if (!mid) return;
    (acc[mid] ??= new Set()).add(num);
  };

  const [{ data: porUltima, error: e1 }, { data: porEntrada, error: e2 }] = await Promise.all([
    supabase
      .from('seriais')
      .select('movimentacao_id, numero_serial')
      .eq('dono_user_id', donoUserId)
      .in('movimentacao_id', movimentacaoIds),
    supabase
      .from('seriais')
      .select('movimentacao_entrada_id, numero_serial')
      .eq('dono_user_id', donoUserId)
      .in('movimentacao_entrada_id', movimentacaoIds),
  ]);
  if (e1) throw e1;
  if (e2 && !isMovimentacaoEntradaColumnMissing(e2)) throw e2;

  for (const r of porUltima ?? []) {
    add(r.movimentacao_id as string | null, r.numero_serial as string);
  }
  for (const r of porEntrada ?? []) {
    add(r.movimentacao_entrada_id as string | null, r.numero_serial as string);
  }

  const out: Record<string, string[]> = {};
  for (const mid of movimentacaoIds) {
    const set = acc[mid];
    if (set && set.size > 0) out[mid] = [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }
  return out;
}

export async function fetchMovimentacoesComSeriais(
  donoUserId: string,
  filtro?: FiltroMovimentacoes
): Promise<Movimentacao[]> {
  const base = await fetchMovimentacoes(donoUserId, filtro);
  const idsSerial = base.filter((m) => m.material?.serializado).map((m) => m.id);
  const porMov = await fetchSeriaisNumerosPorMovimentacoes(donoUserId, idsSerial);
  return base.map((m) => {
    if (!m.material?.serializado) return m;
    const nums = porMov[m.id] ?? [];
    return {
      ...m,
      seriais_vinculados: nums.map((numero_serial) => ({ numero_serial })),
    };
  });
}

const HISTORICO_PAGE_SIZE = 20;
const HISTORICO_SERIAL_BATCH_MOV = 80;

/** Materiais ativos com saldo > 0 em `estoque`, filtrados por tipo (UMB vs serial). */
export async function fetchMateriaisComSaldoParaHistorico(
  donoUserId: string,
  serializado: boolean
): Promise<Material[]> {
  // Usa movimentacoes para encontrar materiais com historico, independente do saldo atual.
  // Isso permite buscar o rastro de seriais instalados (quantidade = 0 em estoque_saldo).
  const { data: movRows, error: e1 } = await supabase
    .from('movimentacoes')
    .select('material_id')
    .eq('dono_user_id', donoUserId);
  if (e1) throw e1;
  const ids = [...new Set((movRows ?? []).map((r) => r.material_id).filter(Boolean))] as string[];
  if (ids.length === 0) return [];
  const catOwner = resolveMateriaisCatalogOwnerId(donoUserId);
  const { data: mats, error: e2 } = await supabase
    .from('materiais')
    .select('*')
    .eq('dono_user_id', catOwner)
    .eq('ativo', true)
    .eq('serializado', serializado)
    .in('id', ids)
    .order('descricao');
  if (e2) throw e2;
  return (mats ?? []) as Material[];
}

/**
 * Técnicos (locais tipo técnico) que têm saldo em estoque ou serial disponível no local,
 * um registro por equipe (evita duplicatas quando existem vários locais para o mesmo técnico).
 */
export async function fetchLocaisTecnicosParaHistorico(donoUserId: string): Promise<Local[]> {
  const { data: estRows, error: e1 } = await supabase
    .from('estoque')
    .select('local_id')
    .eq('dono_user_id', donoUserId)
    .gt('quantidade', 0);
  if (e1) throw e1;
  const locaisComItens = new Set<string>();
  for (const r of estRows ?? []) {
    if (r.local_id) locaisComItens.add(r.local_id as string);
  }

  const { data: serRows, error: e2 } = await supabase
    .from('seriais')
    .select('local_id')
    .eq('dono_user_id', donoUserId)
    .in('status', ['disponivel', 'instalado']);
  if (e2) throw e2;
  for (const r of serRows ?? []) {
    if (r.local_id) locaisComItens.add(r.local_id as string);
  }

  const { data: locs, error: e3 } = await supabase
    .from('locais')
    .select('*, equipe(nome_completo)')
    .eq('dono_user_id', donoUserId)
    .eq('tipo', 'tecnico')
    .not('equipe_id', 'is', null)
    .order('created_at', { ascending: true });
  if (e3) throw e3;

  const comEstoque = (locs ?? []).filter((l) => locaisComItens.has(l.id));

  const porEquipe = new Map<string, Local>();
  for (const loc of comEstoque as Local[]) {
    const eid = loc.equipe_id as string;
    const prev = porEquipe.get(eid);
    if (!prev || new Date(loc.created_at) < new Date(prev.created_at)) {
      porEquipe.set(eid, loc);
    }
  }

  return [...porEquipe.values()].sort((a, b) =>
    (a.equipe?.nome_completo ?? a.nome).localeCompare(b.equipe?.nome_completo ?? b.nome, 'pt-BR')
  );
}

type ResolveBuscaHistorico = { ids: string[]; serialExato: string | null };

/**
 * NF e material: contém (ilike). Serial: somente correspondência exata ao valor normalizado.
 * Se existir serial exato, devolve só as movimentações desse serial (ignora NF/material para não “abrir” o lote).
 */
async function resolveMovimentacaoIdsPorBuscaHistorico(
  donoUserId: string,
  term: string
): Promise<ResolveBuscaHistorico> {
  const t = term.trim();
  if (!t) return { ids: [], serialExato: null };

  const serialNorm = normalizarNumeroSerial(t);
  let serHit: {
    movimentacao_id: string | null;
    movimentacao_entrada_id: string | null;
    roteiro_os_id: string | null;
    material_id: string | null;
  }[] = [];

  const baseSel =
    'movimentacao_id, movimentacao_entrada_id, roteiro_os_id, material_id, numero_serial' as const;

  const { data: serEq1, error: serErr1 } = await supabase
    .from('seriais')
    .select(baseSel)
    .eq('dono_user_id', donoUserId)
    .eq('numero_serial', t)
    .limit(500);
  if (serErr1) throw serErr1;
  serHit = (serEq1 ?? []) as typeof serHit;

  if (serHit.length === 0 && serialNorm !== t) {
    const { data: serEq2, error: serErr2 } = await supabase
      .from('seriais')
      .select(baseSel)
      .eq('dono_user_id', donoUserId)
      .eq('numero_serial', serialNorm)
      .limit(500);
    if (serErr2) throw serErr2;
    serHit = (serEq2 ?? []) as typeof serHit;
  }

  if (serHit.length === 0) {
    const { data: serIlike, error: serErr3 } = await supabase
      .from('seriais')
      .select(baseSel)
      .eq('dono_user_id', donoUserId)
      .ilike('numero_serial', serialNorm)
      .limit(500);
    if (serErr3) throw serErr3;
    serHit = (serIlike ?? []) as typeof serHit;
  }

  if (serHit.length > 0) {
    const acc = new Set<string>();
    for (const s of serHit) {
      if (s.movimentacao_id) acc.add(s.movimentacao_id as string);
      if (s.movimentacao_entrada_id) acc.add(s.movimentacao_entrada_id as string);
    }
    const osIds = [...new Set(serHit.map((s) => s.roteiro_os_id).filter(Boolean))] as string[];
    const matIds = [...new Set(serHit.map((s) => s.material_id).filter(Boolean))] as string[];
    if (osIds.length > 0 && matIds.length > 0) {
      const { data: saidas, error: sErr } = await supabase
        .from('movimentacoes')
        .select('id, roteiro_os_id, material_id')
        .eq('dono_user_id', donoUserId)
        .eq('tipo_movimentacao', 'saida')
        .in('roteiro_os_id', osIds)
        .in('material_id', matIds);
      if (sErr) throw sErr;
      for (const m of saidas ?? []) {
        const row = m as { id: string; roteiro_os_id?: string | null; material_id?: string | null };
        if (
          serHit.some(
            (s) => s.roteiro_os_id === row.roteiro_os_id && s.material_id === row.material_id
          )
        ) {
          acc.add(row.id);
        }
      }
    }
    const exato =
      serHit.find((s) => normalizarNumeroSerial(String(s.numero_serial ?? '')) === serialNorm)
        ?.numero_serial ?? serialNorm;
    return { ids: [...acc], serialExato: normalizarNumeroSerial(String(exato)) };
  }

  const like = `%${t}%`;
  const acc = new Set<string>();

  const catOwner = resolveMateriaisCatalogOwnerId(donoUserId);
  const [{ data: nfRows }, { data: matCod }, { data: matDesc }] = await Promise.all([
    supabase.from('movimentacoes').select('id').eq('dono_user_id', donoUserId).ilike('numero_nota_fiscal', like).limit(3000),
    supabase.from('materiais').select('id').eq('dono_user_id', catOwner).ilike('codigo_material', like),
    supabase.from('materiais').select('id').eq('dono_user_id', catOwner).ilike('descricao', like),
  ]);

  for (const r of nfRows ?? []) acc.add(r.id as string);
  const matIds = [...new Set([...(matCod ?? []), ...(matDesc ?? [])].map((m) => m.id as string))];
  if (matIds.length > 0) {
    const { data: movMat } = await supabase
      .from('movimentacoes')
      .select('id')
      .eq('dono_user_id', donoUserId)
      .in('material_id', matIds)
      .limit(5000);
    for (const r of movMat ?? []) acc.add(r.id as string);
  }
  return { ids: [...acc], serialExato: null };
}

/** `instalado` = saída do técnico vinculada a OS (`roteiro_os_id`). */
export type HistoricoFiltroTipoMov = TipoMovimentacao | 'todos' | 'instalado';

type HistoricoMovBaseParams = {
  materialIds: string[];
  localTecnicoId?: string | null;
  tipo?: HistoricoFiltroTipoMov;
  dataInicio?: string;
  dataFim?: string;
  busca?: string;
  /** Filtro na coluna Contexto: `estorno_auditoria` aplica or() no Supabase; demais usam varredura. */
  contextoFiltro?: HistoricoFiltroContexto;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aplicarFiltrosHistoricoQuery(q: any, donoUserId: string, p: HistoricoMovBaseParams, movIdsBusca: string[] | null) {
  let query = q.eq('dono_user_id', donoUserId).in('material_id', p.materialIds);
  if (p.localTecnicoId) {
    const lid = p.localTecnicoId;
    query = query.or(`local_origem_id.eq.${lid},local_destino_id.eq.${lid}`);
  }
  if (p.tipo && p.tipo !== 'todos') {
    if (p.tipo === 'instalado') {
      query = query.eq('tipo_movimentacao', 'saida').not('roteiro_os_id', 'is', null);
    } else {
      query = query.eq('tipo_movimentacao', p.tipo);
    }
  }
  if (p.dataInicio) query = query.gte('data_movimentacao', p.dataInicio);
  if (p.dataFim) query = query.lte('data_movimentacao', p.dataFim);
  if (movIdsBusca !== null) {
    if (movIdsBusca.length === 0) return null;
    query = query.in('id', movIdsBusca);
  }
  if (p.contextoFiltro === 'estorno_auditoria') {
    query = query.or(
      'and(tipo_movimentacao.eq.ajuste,observacao.ilike.*Estorno*),and(tipo_movimentacao.eq.entrada,observacao.ilike.*Estorno*)'
    );
  }
  return query;
}

export interface HistoricoQuantidadePagina {
  movimentacoes: Movimentacao[];
  /** Em filtros por contexto (varredura) pode ser -1 = total não calculado. */
  total: number;
  totalDesconhecido?: boolean;
  haMaisAposFiltrar?: boolean;
}

type RoteiroOsResumo = { codigo_os: string; nome_cliente: string; codigo_cliente: string };

async function fetchRoteiroOsResumoPorIds(
  donoUserId: string,
  ids: string[]
): Promise<Record<string, RoteiroOsResumo>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return {};
  const { data, error } = await supabase
    .from('roteiro_os')
    .select('id, codigo_os, nome_cliente, codigo_cliente')
    .eq('dono_user_id', donoUserId)
    .in('id', uniq);
  if (error) throw error;
  const map: Record<string, RoteiroOsResumo> = {};
  for (const r of data ?? []) {
    const row = r as {
      id: string;
      codigo_os?: string | null;
      nome_cliente?: string | null;
      codigo_cliente?: string | null;
    };
    map[row.id] = {
      codigo_os: String(row.codigo_os ?? '').trim(),
      nome_cliente: String(row.nome_cliente ?? '').trim(),
      codigo_cliente: String(row.codigo_cliente ?? '').trim(),
    };
  }
  return map;
}

async function mergeCodigoOsRoteiroEmMovimentacoes(donoUserId: string, movs: Movimentacao[]): Promise<Movimentacao[]> {
  const ids = movs.map((m) => m.roteiro_os_id).filter(Boolean) as string[];
  const resumo = await fetchRoteiroOsResumoPorIds(donoUserId, ids);
  return movs.map((m) => {
    if (!m.roteiro_os_id?.trim()) {
      return { ...m, codigo_os_roteiro: null, nome_cliente_roteiro: null, codigo_cliente_roteiro: null };
    }
    const r = resumo[m.roteiro_os_id];
    return {
      ...m,
      codigo_os_roteiro: r?.codigo_os ? r.codigo_os : null,
      nome_cliente_roteiro: r?.nome_cliente ? r.nome_cliente : null,
      codigo_cliente_roteiro: r?.codigo_cliente ? r.codigo_cliente : null,
    };
  });
}

/** Datas de estorno de conferência por OS (para classificar baixa 1ª vs reconferência). */
async function fetchEstornosDatasPorRoteiroOsIds(
  donoUserId: string,
  roteiroOsIds: string[]
): Promise<Record<string, string[]>> {
  const uniq = [...new Set(roteiroOsIds.filter(Boolean))];
  if (uniq.length === 0) return {};
  const { data, error } = await supabase
    .from('estoque_estorno_conferencia')
    .select('roteiro_os_id, created_at')
    .eq('dono_user_id', donoUserId)
    .in('roteiro_os_id', uniq);
  if (error) {
    if ((error as { code?: string }).code === '42P01' || (error.message ?? '').includes('estoque_estorno_conferencia')) {
      return {};
    }
    throw error;
  }
  const map: Record<string, string[]> = {};
  for (const r of data ?? []) {
    const row = r as { roteiro_os_id?: string; created_at?: string };
    const ro = String(row.roteiro_os_id ?? '').trim();
    const c = String(row.created_at ?? '').trim();
    if (!ro || !c) continue;
    if (!map[ro]) map[ro] = [];
    map[ro].push(c);
  }
  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => a.localeCompare(b));
  }
  return map;
}

function inferirContextoHistorico(
  m: Movimentacao,
  estornosPorOs: Record<string, string[]>
): ContextoHistoricoKey {
  const obs = (m.observacao ?? '').toLowerCase();
  if (m.tipo_movimentacao === 'ajuste' && (obs.includes('estorno') || obs.includes('[estorno'))) {
    return 'estorno_auditoria';
  }
  if (m.tipo_movimentacao === 'entrada' && obs.includes('estorno')) {
    return 'entrada_pos_estorno';
  }
  if (m.tipo_movimentacao === 'saida' && m.roteiro_os_id?.trim()) {
    const times = estornosPorOs[m.roteiro_os_id] ?? [];
    const tMov = new Date(m.data_movimentacao).getTime();
    const had = times.some((iso) => new Date(iso).getTime() < tMov);
    return had ? 'baixa_reconferencia' : 'baixa_roteiro';
  }
  if (m.tipo_movimentacao === 'entrada') return 'entrada';
  if (m.tipo_movimentacao === 'transferencia') return 'transferencia';
  if (m.tipo_movimentacao === 'ajuste') return 'ajuste_geral';
  return 'saida_outros';
}

export async function enriquecerContextoEmMovimentacoes(
  donoUserId: string,
  movs: Movimentacao[]
): Promise<Movimentacao[]> {
  if (movs.length === 0) return movs;
  const osIds = movs.map((m) => m.roteiro_os_id).filter(Boolean) as string[];
  const estMap = await fetchEstornosDatasPorRoteiroOsIds(donoUserId, osIds);
  return movs.map((m) => ({
    ...m,
    contexto_historico: inferirContextoHistorico(m, estMap),
  }));
}

function matchFiltroContexto(c: ContextoHistoricoKey, f: HistoricoFiltroContexto): boolean {
  if (f === 'todos') return true;
  if (f === 'estorno_auditoria') {
    return c === 'estorno_auditoria' || c === 'entrada_pos_estorno';
  }
  if (f === 'baixa_roteiro') return c === 'baixa_roteiro';
  if (f === 'outros') {
    return c !== 'estorno_auditoria' && c !== 'entrada_pos_estorno' && c !== 'baixa_roteiro';
  }
  return true;
}

const BATCH_SEEK_HISTORICO = 200;
const MAX_RAW_SEEK_HISTORICO = 20000;

async function seekHistoricoQuantidadePorContexto(
  donoUserId: string,
  p: HistoricoMovBaseParams & {
    page: number;
    busca?: string;
    contextoFiltro: 'baixa_roteiro' | 'outros';
  }
): Promise<HistoricoQuantidadePagina> {
  const { page, busca, contextoFiltro, materialIds } = p;
  if (materialIds.length === 0) {
    return { movimentacoes: [], total: 0, totalDesconhecido: true, haMaisAposFiltrar: false };
  }
  let movIdsBusca: string[] | null = null;
  if (busca?.trim()) {
    const { ids } = await resolveMovimentacaoIdsPorBuscaHistorico(donoUserId, busca);
    if (ids.length === 0) {
      return { movimentacoes: [], total: 0, totalDesconhecido: true, haMaisAposFiltrar: false };
    }
    movIdsBusca = ids;
  }

  const pBase: HistoricoMovBaseParams = {
    materialIds: p.materialIds,
    localTecnicoId: p.localTecnicoId,
    tipo: p.tipo,
    dataInicio: p.dataInicio,
    dataFim: p.dataFim,
    busca: p.busca,
  };

  const sel =
    '*, material:materiais(codigo_material, descricao, unidade_medida, serializado), local_origem:locais!local_origem_id(nome, tipo, equipe:equipe_id(nome_completo)), local_destino:locais!local_destino_id(nome, tipo, equipe:equipe_id(nome_completo))';

  const startIdx = page * HISTORICO_PAGE_SIZE;
  const endIdx = (page + 1) * HISTORICO_PAGE_SIZE;
  let matchIndex = 0;
  const pageOut: Movimentacao[] = [];
  let rawOffset = 0;
  let lastBatchLen = 0;

  while (rawOffset < MAX_RAW_SEEK_HISTORICO && pageOut.length < HISTORICO_PAGE_SIZE) {
    const baseData = aplicarFiltrosHistoricoQuery(
      supabase
        .from('movimentacoes')
        .select(sel)
        .order('data_movimentacao', { ascending: false })
        .range(rawOffset, rawOffset + BATCH_SEEK_HISTORICO - 1),
      donoUserId,
      pBase,
      movIdsBusca
    );
    if (!baseData) {
      return { movimentacoes: [], total: 0, totalDesconhecido: true, haMaisAposFiltrar: false };
    }
    const { data, error } = await baseData;
    if (error) throw error;
    const batch = (data ?? []) as Movimentacao[];
    lastBatchLen = batch.length;
    if (batch.length === 0) break;

    let merged = await mergeCodigoOsRoteiroEmMovimentacoes(donoUserId, batch);
    merged = await enriquecerContextoEmMovimentacoes(donoUserId, merged);

    for (const m of merged) {
      const c = m.contexto_historico;
      if (c == null) continue;
      if (!matchFiltroContexto(c, contextoFiltro)) continue;
      if (matchIndex >= startIdx && matchIndex < endIdx) {
        pageOut.push(m);
      }
      matchIndex++;
    }

    rawOffset += batch.length;
    if (lastBatchLen < BATCH_SEEK_HISTORICO) break;
  }

  const haMaisAposFiltrar = matchIndex > endIdx;

  return {
    movimentacoes: pageOut,
    total: -1,
    totalDesconhecido: true,
    haMaisAposFiltrar,
  };
}

async function enriquecerLinhasHistoricoSerial(
  donoUserId: string,
  linhas: LinhaHistoricoSerial[]
): Promise<LinhaHistoricoSerial[]> {
  const materialIds = [...new Set(linhas.filter((l) => l.numero_serial).map((l) => l.mov.material_id))];
  type SerialRow = {
    material_id: string;
    numero_serial: string;
    status: string;
    nome_cliente: string | null;
    roteiro_os_id: string | null;
    entrada_numero_nota_fiscal: string | null;
  };
  let seriaisRows: SerialRow[] = [];
  if (materialIds.length > 0) {
    const { data, error } = await supabase
      .from('seriais')
      .select('material_id, numero_serial, status, nome_cliente, roteiro_os_id, entrada_numero_nota_fiscal')
      .eq('dono_user_id', donoUserId)
      .in('material_id', materialIds);
    if (error) throw error;
    seriaisRows = (data ?? []) as SerialRow[];
  }

  const findSerial = (mid: string, num: string) =>
    seriaisRows.find(
      (r) => r.material_id === mid && normalizarNumeroSerial(r.numero_serial) === normalizarNumeroSerial(num)
    );

  const osIds = new Set<string>();
  for (const l of linhas) {
    if (l.mov.roteiro_os_id) osIds.add(l.mov.roteiro_os_id);
    if (l.numero_serial) {
      const s = findSerial(l.mov.material_id, l.numero_serial);
      if (s?.roteiro_os_id && l.mov.tipo_movimentacao !== 'entrada') osIds.add(s.roteiro_os_id);
    }
  }
  const resumo = await fetchRoteiroOsResumoPorIds(donoUserId, [...osIds]);

  return linhas.map((l) => {
    if (!l.numero_serial) {
      const id = l.mov.roteiro_os_id ?? undefined;
      const r = id ? resumo[id] : null;
      return {
        ...l,
        codigo_os: r?.codigo_os || undefined,
        nome_cliente_roteiro: r?.nome_cliente || null,
        codigo_cliente_roteiro: r?.codigo_cliente || null,
      };
    }
    const s = findSerial(l.mov.material_id, l.numero_serial);
    if (l.mov.tipo_movimentacao === 'entrada') {
      return {
        ...l,
        nome_cliente_instalacao: s?.nome_cliente ?? undefined,
        nf_entrada_serial: s?.entrada_numero_nota_fiscal?.trim() || undefined,
        serial_status: (s?.status as StatusSerial) ?? undefined,
        codigo_os: undefined,
        nome_cliente_roteiro: null,
        codigo_cliente_roteiro: null,
      };
    }
    const idMov = l.mov.roteiro_os_id?.trim() || null;
    // O roteiro_os do serial (instalação) só é relevante para movimentações de saída.
    // Em transferências, o serial pode já ter OS vinculada de depois — não exibir.
    const idSerialOs = l.mov.tipo_movimentacao === 'saida' ? (s?.roteiro_os_id?.trim() || null) : null;
    const idEff = idMov || idSerialOs;
    const r = idEff ? resumo[idEff] : null;
    const codigo_os = r?.codigo_os?.length ? r.codigo_os : undefined;
    return {
      ...l,
      nome_cliente_instalacao: s?.nome_cliente ?? undefined,
      nf_entrada_serial: s?.entrada_numero_nota_fiscal?.trim() || undefined,
      serial_status: (s?.status as StatusSerial) ?? undefined,
      codigo_os,
      nome_cliente_roteiro: r?.nome_cliente?.length ? r.nome_cliente : null,
      codigo_cliente_roteiro: r?.codigo_cliente?.length ? r.codigo_cliente : null,
    };
  });
}

const SERVICE_ORDER_IRD_COLUMN_NAMES = Array.from({ length: 30 }, (_, i) => `ird_${i + 1}`);

/** Cruza OS + IRD com `service_orders` (mesmo `user_id` do dono). */
async function enriquecerConfirmacaoServiceOrders(
  donoUserId: string,
  linhas: LinhaHistoricoSerial[]
): Promise<LinhaHistoricoSerial[]> {
  const candidatas = linhas.filter(
    (l) =>
      l.numero_serial?.trim() &&
      l.mov.tipo_movimentacao === 'saida' &&
      l.mov.roteiro_os_id?.trim() &&
      (l.codigo_os ?? '').trim()
  );
  if (candidatas.length === 0) {
    return linhas.map((l) => ({ ...l, ird_confirmado_planilha: false }));
  }

  const codigos = [...new Set(candidatas.map((l) => (l.codigo_os ?? '').trim()).filter(Boolean))];
  const selectCols = ['codigo_os', ...SERVICE_ORDER_IRD_COLUMN_NAMES].join(', ');
  const { data, error } = await supabase
    .from('service_orders')
    .select(selectCols)
    .eq('user_id', donoUserId)
    .in('codigo_os', codigos);
  if (error) throw error;

  const irdsPorCodigoOs = new Map<string, Set<string>>();
  for (const r of data ?? []) {
    const row = r as Record<string, unknown>;
    const cos = String(row.codigo_os ?? '').trim();
    if (!cos) continue;
    let set = irdsPorCodigoOs.get(cos);
    if (!set) {
      set = new Set<string>();
      irdsPorCodigoOs.set(cos, set);
    }
    for (const col of SERVICE_ORDER_IRD_COLUMN_NAMES) {
      const v = row[col];
      if (v != null && String(v).trim()) set.add(normalizarNumeroSerial(String(v)));
    }
  }

  return linhas.map((l) => {
    const cos = (l.codigo_os ?? '').trim();
    const num = l.numero_serial?.trim();
    const elegivel =
      l.mov.tipo_movimentacao === 'saida' &&
      l.mov.roteiro_os_id?.trim() &&
      Boolean(num) &&
      Boolean(cos);
    const ok = elegivel && (irdsPorCodigoOs.get(cos)?.has(normalizarNumeroSerial(num!)) ?? false);
    return { ...l, ird_confirmado_planilha: ok };
  });
}

/** Histórico UMB: 20 movimentações por página (servidor). */
export async function fetchHistoricoMaterialQuantidadePaginado(
  donoUserId: string,
  p: HistoricoMovBaseParams & { page: number }
): Promise<HistoricoQuantidadePagina> {
  const { page, busca, materialIds, ...rest } = p;
  const ctx = p.contextoFiltro ?? 'todos';

  if (materialIds.length === 0) {
    return { movimentacoes: [], total: 0, totalDesconhecido: false };
  }

  if (ctx === 'baixa_roteiro' || ctx === 'outros') {
    return seekHistoricoQuantidadePorContexto(donoUserId, {
      materialIds,
      localTecnicoId: p.localTecnicoId,
      tipo: p.tipo,
      dataInicio: p.dataInicio,
      dataFim: p.dataFim,
      busca: p.busca,
      page,
      contextoFiltro: ctx,
    });
  }

  let movIdsBusca: string[] | null = null;
  if (busca?.trim()) {
    const { ids } = await resolveMovimentacaoIdsPorBuscaHistorico(donoUserId, busca);
    if (ids.length === 0) {
      return { movimentacoes: [], total: 0, totalDesconhecido: false };
    }
    movIdsBusca = ids;
  }

  const sel =
    '*, material:materiais(codigo_material, descricao, unidade_medida, serializado), local_origem:locais!local_origem_id(nome, tipo, equipe:equipe_id(nome_completo)), local_destino:locais!local_destino_id(nome, tipo, equipe:equipe_id(nome_completo))';

  const paramsComFiltro: HistoricoMovBaseParams = { materialIds, ...rest, busca, contextoFiltro: ctx };

  const baseHead = aplicarFiltrosHistoricoQuery(
    supabase.from('movimentacoes').select(sel, { count: 'exact', head: true }),
    donoUserId,
    paramsComFiltro,
    movIdsBusca
  );
  if (!baseHead) return { movimentacoes: [], total: 0, totalDesconhecido: false };

  const { count, error: cErr } = await baseHead;
  if (cErr) throw cErr;

  const from = page * HISTORICO_PAGE_SIZE;
  const to = from + HISTORICO_PAGE_SIZE - 1;
  const baseData = aplicarFiltrosHistoricoQuery(
    supabase.from('movimentacoes').select(sel).order('data_movimentacao', { ascending: false }).range(from, to),
    donoUserId,
    paramsComFiltro,
    movIdsBusca
  );
  if (!baseData) return { movimentacoes: [], total: 0, totalDesconhecido: false };

  const { data, error } = await baseData;
  if (error) throw error;
  const movs = (data ?? []) as Movimentacao[];
  const merged = await mergeCodigoOsRoteiroEmMovimentacoes(donoUserId, movs);
  const movimentacoes = await enriquecerContextoEmMovimentacoes(donoUserId, merged);
  return { movimentacoes, total: count ?? 0, totalDesconhecido: false };
}

export interface HistoricoSeriaisPagina {
  linhas: LinhaHistoricoSerial[];
  haMais: boolean;
}

/** Histórico serial: até 20 linhas (1 por serial); varre movimentações até preencher o recorte. */
export async function fetchHistoricoMaterialSeriaisPaginado(
  donoUserId: string,
  p: HistoricoMovBaseParams & { lineOffset: number }
): Promise<HistoricoSeriaisPagina> {
  if (p.materialIds.length === 0) return { linhas: [], haMais: false };

  let movIdsBusca: string[] | null = null;
  let serialExato: string | null = null;
  if (p.busca?.trim()) {
    const res = await resolveMovimentacaoIdsPorBuscaHistorico(donoUserId, p.busca);
    if (res.ids.length === 0) return { linhas: [], haMais: false };
    movIdsBusca = res.ids;
    serialExato = res.serialExato;
  }

  const targetEnd = p.lineOffset + HISTORICO_PAGE_SIZE;
  const flat: LinhaHistoricoSerial[] = [];
  let movSkip = 0;
  let lastBatchFull = false;

  const sel =
    '*, material:materiais(codigo_material, descricao, unidade_medida, serializado), local_origem:locais!local_origem_id(nome, tipo, equipe:equipe_id(nome_completo)), local_destino:locais!local_destino_id(nome, tipo, equipe:equipe_id(nome_completo))';

  while (flat.length < targetEnd + 1) {
    let q = aplicarFiltrosHistoricoQuery(
      supabase
        .from('movimentacoes')
        .select(sel)
        .order('data_movimentacao', { ascending: false })
        .range(movSkip, movSkip + HISTORICO_SERIAL_BATCH_MOV - 1),
      donoUserId,
      p,
      movIdsBusca
    );
    if (!q) return { linhas: [], haMais: false };

    const { data, error } = await q;
    if (error) throw error;
    const batch = (data ?? []) as Movimentacao[];
    if (batch.length === 0) break;
    lastBatchFull = batch.length === HISTORICO_SERIAL_BATCH_MOV;

    const idsSerial = batch.filter((m) => m.material?.serializado).map((m) => m.id);
    const porMov = await fetchSeriaisNumerosPorMovimentacoes(donoUserId, idsSerial);

    const fallbackMovs = batch.filter(
      (m) =>
        m.material?.serializado &&
        m.tipo_movimentacao === 'saida' &&
        m.roteiro_os_id?.trim() &&
        !(porMov[m.id]?.length)
    );
    const fallbackSerialsPorKey = new Map<string, string[]>();
    if (fallbackMovs.length > 0) {
      const osIds = [...new Set(fallbackMovs.map((m) => m.roteiro_os_id as string))];
      const { data: srows, error: sErr } = await supabase
        .from('seriais')
        .select('roteiro_os_id, material_id, numero_serial')
        .eq('dono_user_id', donoUserId)
        .in('roteiro_os_id', osIds);
      if (sErr) throw sErr;
      for (const r of srows ?? []) {
        const ro = String((r as { roteiro_os_id?: string }).roteiro_os_id ?? '').trim();
        const mid = String((r as { material_id?: string }).material_id ?? '').trim();
        const n = String((r as { numero_serial?: string }).numero_serial ?? '').trim();
        if (!ro || !mid || !n) continue;
        const k = `${ro}|${mid}`;
        const arr = fallbackSerialsPorKey.get(k) ?? [];
        arr.push(n);
        fallbackSerialsPorKey.set(k, arr);
      }
      for (const arr of fallbackSerialsPorKey.values()) {
        arr.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      }
    }
    // Fallback para transferências: após instalação o seriais.movimentacao_id aponta para a saida,
    // perdendo o link com a transferência. Recuperamos pelo local_destino_id + material_id.
    const fallbackTransfers = batch.filter(
      (m) =>
        m.material?.serializado &&
        m.tipo_movimentacao === 'transferencia' &&
        m.local_destino_id &&
        !(porMov[m.id]?.length)
    );
    if (fallbackTransfers.length > 0) {
      const localIds = [...new Set(fallbackTransfers.map((m) => m.local_destino_id).filter(Boolean))] as string[];
      const matIds = [...new Set(fallbackTransfers.map((m) => m.material_id).filter(Boolean))] as string[];
      const { data: seriaisTransf } = await supabase
        .from('seriais')
        .select('numero_serial, local_id, material_id')
        .eq('dono_user_id', donoUserId)
        .in('local_id', localIds)
        .in('material_id', matIds);
      const serialsByKey = new Map<string, string[]>();
      for (const s of seriaisTransf ?? []) {
        const r = s as { numero_serial: string; local_id: string; material_id: string };
        const k = `${r.local_id}|${r.material_id}`;
        (serialsByKey.get(k) ?? (serialsByKey.set(k, []) && serialsByKey.get(k)!)).push(r.numero_serial);
      }
      const transferConsumed = new Map<string, number>();
      for (const m of fallbackTransfers) {
        const k = `${m.local_destino_id}|${m.material_id}`;
        const all = serialsByKey.get(k) ?? [];
        const start = transferConsumed.get(k) ?? 0;
        const q = Math.max(1, Number(m.quantidade) || 1);
        const nums = all.slice(start, start + q);
        if (nums.length > 0) porMov[m.id] = nums;
        transferConsumed.set(k, start + nums.length);
      }
    }

    const fallbackConsumido = new Map<string, number>();

    for (const mov of batch) {
      if (!mov.material?.serializado) continue;
      let nums = porMov[mov.id] ?? [];
      if (
        nums.length === 0 &&
        mov.tipo_movimentacao === 'saida' &&
        mov.roteiro_os_id?.trim()
      ) {
        const k = `${mov.roteiro_os_id}|${mov.material_id}`;
        const arr = fallbackSerialsPorKey.get(k) ?? [];
        const q = Math.max(1, Number(mov.quantidade) || 1);
        const start = fallbackConsumido.get(k) ?? 0;
        nums = arr.slice(start, start + q);
        fallbackConsumido.set(k, start + nums.length);
      }
      if (serialExato) {
        nums = nums.filter((n) => normalizarNumeroSerial(n) === serialExato);
        if (nums.length === 0) continue;
      }
      if (nums.length === 0) flat.push({ mov, numero_serial: null });
      else for (const numero_serial of nums) flat.push({ mov, numero_serial });
    }

    movSkip += batch.length;
    if (!lastBatchFull) break;
  }

  const slice = flat.slice(p.lineOffset, targetEnd);
  const haMais = flat.length > targetEnd || (lastBatchFull && flat.length >= targetEnd);
  const enriquecidas = await enriquecerLinhasHistoricoSerial(
    donoUserId,
    slice.map((x) => ({ ...x }))
  );
  const linhas = await enriquecerConfirmacaoServiceOrders(donoUserId, enriquecidas);
  const movsCtx = await enriquecerContextoEmMovimentacoes(
    donoUserId,
    linhas.map((l) => l.mov)
  );
  const movById = new Map(movsCtx.map((m) => [m.id, m]));
  const linhasComCtx = linhas.map((l) => ({ ...l, mov: movById.get(l.mov.id) ?? l.mov }));
  return { linhas: linhasComCtx, haMais };
}

export { HISTORICO_PAGE_SIZE };

// ─────────────────────────────────────────────
// Entrada de material
// Cria a movimentação e (para serializados) insere os seriais.
// O trigger do banco atualiza o estoque automaticamente.
// ─────────────────────────────────────────────

export async function registrarEntrada(
  donoUserId: string,
  usuarioId: string,
  form: EntradaMaterialForm,
  extras?: { entregue_por_equipe_id?: string | null }
): Promise<Movimentacao> {
  const { data: mov, error: movError } = await supabase
    .from('movimentacoes')
    .insert({
      dono_user_id: donoUserId,
      material_id: form.material_id,
      tipo_movimentacao: 'entrada' as TipoMovimentacao,
      tipo_origem: form.tipo_origem,
      quantidade: form.seriais ? form.seriais.length : form.quantidade,
      local_origem_id: null,
      local_destino_id: form.local_destino_id,
      data_movimentacao: form.data_movimentacao,
      usuario_id: usuarioId,
      numero_nota_fiscal: form.numero_nota_fiscal,
      data_nota_fiscal: form.data_nota_fiscal,
      observacao: form.observacao,
      entregue_por_equipe_id: extras?.entregue_por_equipe_id ?? null,
    })
    .select()
    .single();

  if (movError) throw movError;

  if (form.seriais && form.seriais.length > 0) {
    const chave = normalizarChaveEntradaParaSeriais(
      form.tipo_origem,
      form.numero_nota_fiscal,
      form.data_nota_fiscal
    );
    const serialRows = form.seriais.map((numero_serial) => ({
      dono_user_id: donoUserId,
      material_id: form.material_id,
      numero_serial,
      status: 'disponivel',
      local_id: form.local_destino_id,
      data_entrada: form.data_movimentacao,
      movimentacao_id: mov.id,
      movimentacao_entrada_id: mov.id,
      entrada_tipo_origem: chave.entrada_tipo_origem,
      entrada_numero_nota_fiscal: chave.entrada_numero_nota_fiscal,
      entrada_data_nota_fiscal: chave.entrada_data_nota_fiscal,
    }));

    let { error: serialError } = await supabase.from('seriais').insert(serialRows);
    if (serialError && isMovimentacaoEntradaColumnMissing(serialError)) {
      const legacyRows = form.seriais.map((numero_serial) => ({
        dono_user_id: donoUserId,
        material_id: form.material_id,
        numero_serial,
        status: 'disponivel' as const,
        local_id: form.local_destino_id,
        data_entrada: form.data_movimentacao,
        movimentacao_id: mov.id,
        entrada_tipo_origem: chave.entrada_tipo_origem,
        entrada_numero_nota_fiscal: chave.entrada_numero_nota_fiscal,
        entrada_data_nota_fiscal: chave.entrada_data_nota_fiscal,
      }));
      const retry = await supabase.from('seriais').insert(legacyRows);
      serialError = retry.error;
    }
    if (serialError) throw serialError;
  }

  return mov as Movimentacao;
}

// ─────────────────────────────────────────────
// Transferência entre locais
// Cria a movimentação e (para serializados) atualiza o local dos seriais.
// O trigger do banco atualiza o estoque automaticamente.
// ─────────────────────────────────────────────

export async function registrarTransferencia(
  donoUserId: string,
  usuarioId: string,
  form: TransferenciaForm
): Promise<Movimentacao> {
  const { data: mov, error: movError } = await supabase
    .from('movimentacoes')
    .insert({
      dono_user_id: donoUserId,
      material_id: form.material_id,
      tipo_movimentacao: 'transferencia' as TipoMovimentacao,
      tipo_origem: null,
      quantidade: form.seriais ? form.seriais.length : form.quantidade,
      local_origem_id: form.local_origem_id,
      local_destino_id: form.local_destino_id,
      data_movimentacao: new Date().toISOString(),
      usuario_id: usuarioId,
      numero_nota_fiscal: null,
      data_nota_fiscal: null,
      observacao: form.observacao,
    })
    .select()
    .single();

  if (movError) throw movError;

  if (form.seriais && form.seriais.length > 0) {
    // Atualiza local e última movimentação; movimentacao_entrada_id permanece (entrada original).
    for (const serialId of form.seriais) {
      const { error: serialError } = await supabase
        .from('seriais')
        .update({
          local_id: form.local_destino_id,
          movimentacao_id: mov.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serialId);
      if (serialError) throw serialError;
    }
  }

  return mov as Movimentacao;
}

// ─────────────────────────────────────────────
// Seriais
// ─────────────────────────────────────────────

export async function fetchSeriais(
  donoUserId: string,
  filtro?: FiltroSeriais
): Promise<Serial[]> {
  let query = supabase
    .from('seriais')
    .select(
      '*, material:materiais(codigo_material, descricao), local:locais(nome, tipo)'
    )
    .eq('dono_user_id', donoUserId);

  if (filtro?.material_id) query = query.eq('material_id', filtro.material_id);
  if (filtro?.local_id) query = query.eq('local_id', filtro.local_id);
  if (filtro?.status) query = query.eq('status', filtro.status);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Serial[];
}

/** Retorna seriais disponíveis de um material em um local específico (uso na finalização da OS). */
export async function fetchSeriaisDisponiveisPorLocal(
  donoUserId: string,
  materialId: string,
  localId: string
): Promise<Serial[]> {
  const { data, error } = await supabase
    .from('seriais')
    .select('*')
    .eq('dono_user_id', donoUserId)
    .eq('material_id', materialId)
    .eq('local_id', localId)
    .eq('status', 'disponivel')
    .is('roteiro_os_id', null)
    .order('numero_serial');
  if (error) throw error;
  return (data ?? []) as Serial[];
}

/** Busca um IRD/serial pelo número no Estoque Central (status disponível). Usado no avanço por pistola. */
export async function buscarSerialDisponivelEstoqueCentral(
  donoUserId: string,
  numeroSerial: string
): Promise<{ serial: Serial; material: Material } | null> {
  const normalized = normalizarNumeroSerial(numeroSerial);
  if (!normalized) return null;

  const { data: rows, error } = await supabase
    .from('seriais')
    .select('*, material:materiais(id, codigo_material, descricao, unidade_medida, serializado, ativo)')
    .eq('dono_user_id', donoUserId)
    .eq('numero_serial', normalized)
    .eq('status', 'disponivel')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) throw error;
  const data = rows?.[0];
  if (!data) return null;

  // Valida pelo local tipo empresa (estoque central), não pelo UUID retornado por getOrCreate —
  // evita falso “não encontrado” quando há mais de um local empresa ou histórico de locais.
  const { data: localRow, error: locErr } = await supabase
    .from('locais')
    .select('id, tipo, dono_user_id')
    .eq('id', data.local_id)
    .maybeSingle();

  if (locErr) throw locErr;
  if (!localRow || localRow.dono_user_id !== donoUserId || localRow.tipo !== 'empresa') return null;

  const row = data as Serial & { material: Material };
  return { serial: data as Serial, material: row.material };
}

/**
 * Seriais que já têm entrada com a mesma chave (tipo_origem + NF número + NF data).
 * O mesmo número de IRD pode existir em outras linhas se origem ou NF forem diferentes.
 */
export async function checkSeriaisMesmaChaveEntrada(
  donoUserId: string,
  numerosSerial: string[],
  chave: ChaveEntradaSerial
): Promise<string[]> {
  if (numerosSerial.length === 0) return [];
  const nums = [...new Set(numerosSerial.map(normalizarNumeroSerial))].filter(Boolean);
  const { data, error } = await supabase
    .from('seriais')
    .select('numero_serial, entrada_tipo_origem, entrada_numero_nota_fiscal, entrada_data_nota_fiscal')
    .eq('dono_user_id', donoUserId)
    .in('numero_serial', nums);
  if (error) throw error;
  const dup = new Set<string>();
  for (const row of data ?? []) {
    if (
      row.entrada_tipo_origem === chave.entrada_tipo_origem &&
      (row.entrada_numero_nota_fiscal ?? '') === chave.entrada_numero_nota_fiscal &&
      (row.entrada_data_nota_fiscal ?? '') === chave.entrada_data_nota_fiscal
    ) {
      dup.add(row.numero_serial as string);
    }
  }
  return [...dup];
}

export async function updateStatusSerial(
  id: string,
  status: Serial['status'],
  extras?: {
    roteiro_os_id?: string;
    nome_cliente?: string;
    tipo_servico?: string;
    data_finalizacao_os?: string;
    local_id?: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from('seriais')
    .update({
      status,
      ...extras,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// Consultas por técnico (para a OS e para a tab Material do Técnico)
// ─────────────────────────────────────────────

/** Saldo de materiais não serializados disponíveis no local do técnico. */
export async function fetchEstoqueTecnico(
  donoUserId: string,
  equipeId: string
): Promise<EstoqueSaldo[]> {
  const local = await getOrCreateLocalTecnico(donoUserId, equipeId, '');
  const { data, error } = await supabase
    .from('estoque')
    .select('*, material:materiais(codigo_material, descricao, unidade_medida, serializado)')
    .eq('dono_user_id', donoUserId)
    .eq('local_id', local.id)
    .gt('quantidade', 0);
  if (error) throw error;
  return (data ?? []) as EstoqueSaldo[];
}

/** Seriais disponíveis no local do técnico para um material específico. */
export async function fetchSeriaisTecnicoPorMaterial(
  donoUserId: string,
  equipeId: string,
  materialId: string
): Promise<Serial[]> {
  const local = await getOrCreateLocalTecnico(donoUserId, equipeId, '');
  return fetchSeriaisDisponiveisPorLocal(donoUserId, materialId, local.id);
}

/** Material com capacidade (saldo a granel ou contagem de IRD disponíveis) no local do técnico — inclusão na conferência de OS. */
export interface MaterialDisponivelTecnicoConferencia {
  material: Material;
  /** Quantidade em estoque (lote) ou nº de IRDs disponíveis (serial) */
  capacidade: number;
}

/**
 * Lista mats ativos com saldo (não serializados) ou com IRD disponível (serializados) no local do técnico.
 * Ordenado por descrição.
 */
export async function fetchMateriaisDisponiveisTecnicoConferencia(
  donoUserId: string,
  equipeId: string
): Promise<MaterialDisponivelTecnicoConferencia[]> {
  const catOwner = resolveMateriaisCatalogOwnerId(donoUserId);
  const local = await getOrCreateLocalTecnico(donoUserId, equipeId, '');

  const { data: estData, error: e1 } = await supabase
    .from('estoque')
    .select('material_id, quantidade, material:materiais(*)')
    .eq('dono_user_id', donoUserId)
    .eq('local_id', local.id)
    .gt('quantidade', 0);
  if (e1) throw e1;

  const lotePorId = new Map<string, { mat: Material; qtd: number }>();
  for (const r of estData ?? []) {
    const mat = (r as { material: Material | Material[] | null }).material;
    const m = Array.isArray(mat) ? mat[0] : mat;
    if (!m?.id || m.serializado) continue;
    const q = Math.max(0, Number((r as { quantidade: number }).quantidade) || 0);
    if (q <= 0) continue;
    const ex = lotePorId.get(m.id);
    if (ex) ex.qtd += q;
    else lotePorId.set(m.id, { mat: m, qtd: q });
  }

  const { data: serData, error: e2 } = await supabase
    .from('seriais')
    .select('material_id')
    .eq('dono_user_id', donoUserId)
    .eq('local_id', local.id)
    .eq('status', 'disponivel');
  if (e2) throw e2;

  const serialCountRaw = new Map<string, number>();
  for (const r of serData ?? []) {
    const mid = (r as { material_id: string | null }).material_id;
    if (!mid) continue;
    serialCountRaw.set(mid, (serialCountRaw.get(mid) ?? 0) + 1);
  }
  const serialMids = [...serialCountRaw.keys()];
  const serialMats: Material[] = [];
  if (serialMids.length > 0) {
    const { data: mrows, error: em } = await supabase
      .from('materiais')
      .select('*')
      .eq('dono_user_id', catOwner)
      .in('id', serialMids);
    if (em) throw em;
    serialMats.push(...((mrows ?? []) as Material[]));
  }
  const matById = new Map(serialMats.map((m) => [m.id, m]));
  const serialCount = new Map<string, { mat: Material; n: number }>();
  for (const [mid, n] of serialCountRaw) {
    const m = matById.get(mid);
    if (!m?.id || !m.serializado) continue;
    serialCount.set(mid, { mat: m, n });
  }

  const out: MaterialDisponivelTecnicoConferencia[] = [];
  for (const { mat, qtd } of lotePorId.values()) {
    if (mat.ativo) out.push({ material: mat, capacidade: qtd });
  }
  for (const { mat, n } of serialCount.values()) {
    if (!mat.ativo) continue;
    if (lotePorId.has(mat.id)) continue;
    out.push({ material: mat, capacidade: n });
  }

  out.sort((a, b) => a.material.descricao.localeCompare(b.material.descricao, 'pt-BR'));
  return out;
}

// ─────────────────────────────────────────────
// Baixa de material na finalização da OS
// Cria movimentação de saída e atualiza seriais (se serializado).
// ─────────────────────────────────────────────

interface BaixaItem {
  material_id: string;
  local_origem_id: string;
  quantidade: number;
  // para serializados: ids dos seriais usados
  serial_ids?: string[];
}

interface BaixaOsPayload {
  roteiro_os_id: string;
  nome_cliente: string;
  tipo_servico: string;
  data_finalizacao_os: string;
  itens: BaixaItem[];
}

// ─────────────────────────────────────────────
// Ponto 1 – Abate automático na confirmação do estoquista
// ─────────────────────────────────────────────

export interface MaterialUtilizadoOS {
  material_id: string;
  quantidade: number;
  serial_ids?: string[]; // para serializados
  /** Quantidade explícita de unidades reuso consumidas. Quando definido, substitui o FIFO automático. */
  qtd_reuso?: number;
}

export async function abaterMateriaisOS(
  donoUserId: string,
  usuarioId: string,
  roteiroOsId: string,
  equipeId: string,
  nomeTecnico: string,
  itens: MaterialUtilizadoOS[]
): Promise<void> {
  const localTecnico = await getOrCreateLocalTecnico(donoUserId, equipeId, nomeTecnico);

  for (const item of itens) {
    const { data: mov, error: movError } = await supabase
      .from('movimentacoes')
      .insert({
        dono_user_id: donoUserId,
        material_id: item.material_id,
        tipo_movimentacao: 'saida',
        tipo_origem: null,
        quantidade: item.serial_ids ? item.serial_ids.length : item.quantidade,
        local_origem_id: localTecnico.id,
        local_destino_id: null,
        data_movimentacao: new Date().toISOString(),
        usuario_id: usuarioId,
        roteiro_os_id: roteiroOsId,
      })
      .select('id')
      .single();

    if (movError) throw movError;

    if (item.serial_ids && item.serial_ids.length > 0) {
      const movId = mov.id as string;
      for (const serialId of item.serial_ids) {
        const { error } = await supabase
          .from('seriais')
          .update({
            status: 'instalado',
            roteiro_os_id: roteiroOsId,
            movimentacao_id: movId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', serialId);
        if (error) throw error;
      }
    }
  }

  // Vincula unidades reuso para materiais RET consumidos na OS.
  // Se qtd_reuso for definido explicitamente (novo fluxo), usa esse valor.
  // Caso contrário (dados legados sem qtd_reuso), detecta pelo código e usa FIFO total.
  const itensLoteComReuso = itens.filter((i) => !i.serial_ids && i.quantidade && i.quantidade > 0 && i.qtd_reuso !== undefined && i.qtd_reuso > 0);
  const itensLoteLegado = itens.filter((i) => !i.serial_ids && i.quantidade && i.quantidade > 0 && i.qtd_reuso === undefined);

  for (const item of itensLoteComReuso) {
    await vincularUnidadesReusoOsFifo(donoUserId, equipeId, item.material_id, item.qtd_reuso!, roteiroOsId);
  }

  if (itensLoteLegado.length > 0) {
    const { data: matRows } = await supabase
      .from('materiais')
      .select('id, codigo_material')
      .in('id', itensLoteLegado.map((i) => i.material_id));

    const codigoPorId = new Map(
      ((matRows ?? []) as Array<{ id: string; codigo_material: string }>).map((m) => [m.id, m.codigo_material])
    );

    for (const item of itensLoteLegado) {
      const codigo = codigoPorId.get(item.material_id);
      if (!codigo || !isMaterialRetiradaRet(codigo)) continue;
      await vincularUnidadesReusoOsFifo(donoUserId, equipeId, item.material_id, item.quantidade, roteiroOsId);
    }
  }

  // Marca a OS como sincronizada no estoque
  const { error: syncError } = await supabase
    .from('roteiro_os')
    .update({ estoque_sincronizado: true })
    .eq('id', roteiroOsId);
  if (syncError) throw syncError;
}

export interface EstornarBaixaEstoqueParams {
  donoUserId: string;
  usuarioId: string;
  roteiroOsId: string;
  codigoOs: string;
  motivo: string;
}

/** Resumo de estornos de baixa por OS (tabela `estoque_estorno_conferencia`). */
export interface ResumoEstornoConferenciaPorOs {
  ocorrencias: number;
  ultimo_motivo: string;
  ultimo_em: string;
}

/**
 * Agrega ocorrências e último motivo por `roteiro_os_id` (para a fila de conferência).
 */
export async function fetchResumoEstornosConferenciaPorOs(
  donoUserId: string,
  roteiroOsIds: string[]
): Promise<Map<string, ResumoEstornoConferenciaPorOs>> {
  const out = new Map<string, ResumoEstornoConferenciaPorOs>();
  if (roteiroOsIds.length === 0) return out;

  const { data, error } = await supabase
    .from('estoque_estorno_conferencia')
    .select('roteiro_os_id, motivo, created_at')
    .eq('dono_user_id', donoUserId)
    .in('roteiro_os_id', roteiroOsIds);

  if (error) throw error;

  const rows = (data ?? []) as { roteiro_os_id: string; motivo: string; created_at: string }[];
  const groups = new Map<string, { motivo: string; created_at: string }[]>();
  for (const row of rows) {
    const g = groups.get(row.roteiro_os_id) ?? [];
    g.push({ motivo: row.motivo, created_at: row.created_at });
    groups.set(row.roteiro_os_id, g);
  }
  for (const [id, g] of groups) {
    const ocorrencias = g.length;
    const last = g.reduce((a, b) => (a.created_at > b.created_at ? a : b));
    out.set(id, { ocorrencias, ultimo_motivo: last.motivo, ultimo_em: last.created_at });
  }
  return out;
}

/**
 * Desfaz a baixa de estoque confirmada na OS: devolve materiais ao técnico (seriais → disponível;
 * lotes → entrada de ajuste compensatória), remove movimentações de saída de aparelhos serializados
 * e marca a OS como não sincronizada para nova conferência.
 */
export async function estornarBaixaEstoqueOS(params: EstornarBaixaEstoqueParams): Promise<void> {
  const { donoUserId, usuarioId, roteiroOsId, codigoOs, motivo } = params;
  const motivoTrim = motivo.trim();
  if (motivoTrim.length < 8) {
    throw new Error('Descreva o motivo do estorno (mínimo 8 caracteres).');
  }

  const obsBase = `Estorno baixa OS ${codigoOs}: ${motivoTrim}`;

  const { data: osRow, error: osErr } = await supabase
    .from('roteiro_os')
    .select('id, estoque_sincronizado, materiais_utilizados, observacoes')
    .eq('id', roteiroOsId)
    .eq('dono_user_id', donoUserId)
    .maybeSingle();

  if (osErr) throw osErr;
  if (!osRow) throw new Error('OS não encontrada.');
  if (!osRow.estoque_sincronizado) {
    throw new Error('Não há baixa de estoque confirmada para estornar.');
  }

  const { data: movs, error: mErr } = await supabase
    .from('movimentacoes')
    .select('id, material_id, quantidade, local_origem_id, material:materiais(serializado)')
    .eq('dono_user_id', donoUserId)
    .eq('roteiro_os_id', roteiroOsId)
    .eq('tipo_movimentacao', 'saida');

  if (mErr) throw mErr;

  const lista = movs ?? [];
  let houveEstornoComSerial = false;
  let materialIdAuditoriaSerial: string | null = null;

  for (const raw of lista) {
    const mov = raw as {
      id: string;
      material_id: string;
      quantidade: number;
      local_origem_id: string | null;
      material: { serializado: boolean } | { serializado: boolean }[] | null;
    };
    const matJoin = mov.material;
    const matObj = Array.isArray(matJoin) ? matJoin[0] : matJoin;
    const serializado = matObj?.serializado ?? false;

    if (serializado) {
      houveEstornoComSerial = true;
      materialIdAuditoriaSerial = mov.material_id;
      const { error: uErr } = await supabase
        .from('seriais')
        .update({
          status: 'disponivel',
          roteiro_os_id: null,
          movimentacao_id: null,
          nome_cliente: null,
          tipo_servico: null,
          data_finalizacao_os: null,
          updated_at: new Date().toISOString(),
        })
        .eq('dono_user_id', donoUserId)
        .eq('roteiro_os_id', roteiroOsId)
        .eq('material_id', mov.material_id)
        .eq('status', 'instalado');

      if (uErr) throw uErr;

      const { error: dErr } = await supabase.from('movimentacoes').delete().eq('id', mov.id).eq('dono_user_id', donoUserId);
      if (dErr) throw dErr;
    } else {
      if (!mov.local_origem_id) {
        throw new Error('Movimentação de material a granel sem local de origem. Contate o suporte.');
      }
      await registrarEntrada(donoUserId, usuarioId, {
        material_id: mov.material_id,
        local_destino_id: mov.local_origem_id,
        quantidade: mov.quantidade,
        tipo_origem: 'ajuste',
        numero_nota_fiscal: null,
        data_nota_fiscal: null,
        data_movimentacao: new Date().toISOString(),
        observacao: obsBase,
      });
    }
  }

  /** Apenas serial / sem saídas no banco: motivo do estorno. Em lote, o motivo fica na observação da entrada de ajuste. */
  const precisaAjusteAuditoria = houveEstornoComSerial || lista.length === 0;
  if (precisaAjusteAuditoria) {
    const mid = materialIdAuditoriaSerial ?? primeiroMaterialIdMateriaisOS(osRow.materiais_utilizados);
    if (mid) {
      const { error: insAud } = await supabase.from('movimentacoes').insert({
        dono_user_id: donoUserId,
        material_id: mid,
        tipo_movimentacao: 'ajuste' as TipoMovimentacao,
        tipo_origem: null,
        quantidade: 0,
        local_origem_id: null,
        local_destino_id: null,
        data_movimentacao: new Date().toISOString(),
        usuario_id: usuarioId,
        roteiro_os_id: roteiroOsId,
        observacao: obsBase,
      });
      if (insAud) {
        const blocoAnexo = anexarBlocoEstornoObservacoesOs(osRow.observacoes, obsBase);
        const { error: obsErr } = await supabase
          .from('roteiro_os')
          .update({ observacoes: blocoAnexo, updated_at: new Date().toISOString() })
          .eq('id', roteiroOsId)
          .eq('dono_user_id', donoUserId);
        if (obsErr) throw obsErr;
      }
    } else {
      const blocoAnexo = anexarBlocoEstornoObservacoesOs(osRow.observacoes, obsBase);
      const { error: obsErr } = await supabase
        .from('roteiro_os')
        .update({ observacoes: blocoAnexo, updated_at: new Date().toISOString() })
        .eq('id', roteiroOsId)
        .eq('dono_user_id', donoUserId);
      if (obsErr) throw obsErr;
    }
  }

  const { error: syncErr } = await supabase
    .from('roteiro_os')
    .update({ estoque_sincronizado: false, updated_at: new Date().toISOString() })
    .eq('id', roteiroOsId)
    .eq('dono_user_id', donoUserId);

  if (syncErr) throw syncErr;

  const { error: logErr } = await supabase.from('estoque_estorno_conferencia').insert({
    dono_user_id: donoUserId,
    roteiro_os_id: roteiroOsId,
    usuario_id: usuarioId,
    motivo: motivoTrim,
  });
  if (logErr) throw logErr;
}

function primeiroMaterialIdMateriaisOS(materiais: unknown): string | null {
  const list = (materiais as MaterialRota[] | null | undefined) ?? [];
  const id = list.find((m) => m.material_id?.trim())?.material_id;
  return id?.trim() ?? null;
}

function anexarBlocoEstornoObservacoesOs(observacoesAtual: string | null | undefined, obsBase: string): string {
  const bloco = `[Estorno estoque ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}] ${obsBase}`;
  const ant = observacoesAtual?.trim() ?? '';
  return ant ? `${ant}\n\n${bloco}` : bloco;
}

// ─────────────────────────────────────────────
// Ponto 2 – Sync de IRDs na importação do Excel
// Chamado após atualizar service_orders com o Excel.
// ─────────────────────────────────────────────

export interface ServiceOrderSyncItem {
  codigo_os: string;
  codigo_cliente: string;
  nome_cliente: string;
  data_finalizacao: string;
  seriais: string[]; // ird_1...ird_20 não nulos
  // materiais não serializados (coluna → quantidade)
  materiais?: { material_id: string; quantidade: number }[];
}

export async function sincronizarOsComEstoque(
  donoUserId: string,
  usuarioId: string,
  itens: ServiceOrderSyncItem[]
): Promise<{ sincronizados: number; erros: string[] }> {
  let sincronizados = 0;
  const erros: string[] = [];

  for (const item of itens) {
    try {
      // Buscar roteiro_os correspondente
      const { data: roteiroOs } = await supabase
        .from('roteiro_os')
        .select('id, estoque_sincronizado, tecnico_id, tecnico_nome')
        .eq('dono_user_id', donoUserId)
        .eq('codigo_os', item.codigo_os)
        .maybeSingle();

      // Atualizar seriais com dados do cliente (mais recente se houver homônimos)
      for (const numeroSerial of item.seriais) {
        const norm = normalizarNumeroSerial(numeroSerial);
        const { data: serRows } = await supabase
          .from('seriais')
          .select('id')
          .eq('dono_user_id', donoUserId)
          .eq('numero_serial', norm)
          .order('created_at', { ascending: false })
          .limit(1);
        const serial = serRows?.[0];

        if (serial) {
          await supabase
            .from('seriais')
            .update({
              status: 'instalado',
              nome_cliente: item.nome_cliente,
              roteiro_os_id: roteiroOs?.id ?? null,
              data_finalizacao_os: item.data_finalizacao,
              updated_at: new Date().toISOString(),
            })
            .eq('id', serial.id);
        }
      }

      // Se a OS não foi sincronizada pelo app (Ponto 1), abater materiais agora
      if (roteiroOs && !roteiroOs.estoque_sincronizado && item.materiais && item.materiais.length > 0) {
        const equipeId = roteiroOs.tecnico_id;
        const nomeTecnico = roteiroOs.tecnico_nome ?? '';
        if (equipeId) {
          const localTecnico = await getOrCreateLocalTecnico(donoUserId, equipeId, nomeTecnico);
          for (const mat of item.materiais) {
            await supabase.from('movimentacoes').insert({
              dono_user_id: donoUserId,
              material_id: mat.material_id,
              tipo_movimentacao: 'saida',
              tipo_origem: null,
              quantidade: mat.quantidade,
              local_origem_id: localTecnico.id,
              local_destino_id: null,
              data_movimentacao: item.data_finalizacao,
              usuario_id: usuarioId,
              roteiro_os_id: roteiroOs.id,
            });
          }
          await supabase
            .from('roteiro_os')
            .update({ estoque_sincronizado: true })
            .eq('id', roteiroOs.id);
        }
      }

      sincronizados++;
    } catch (e) {
      erros.push(`OS ${item.codigo_os}: ${e instanceof Error ? e.message : 'erro desconhecido'}`);
    }
  }

  return { sincronizados, erros };
}

// ─────────────────────────────────────────────
// Codigos de material sujeitos a retirada RET
// ─────────────────────────────────────────────

export const CODIGOS_MATERIAL_RETIRADA_RET = ['602246', '605766', '601699', '601743'] as const;

/** Verifica se um codigo de material e de retirada RET (antena / LNBF). */
export function isMaterialRetiradaRet(codigoMaterial: string): boolean {
  return (CODIGOS_MATERIAL_RETIRADA_RET as readonly string[]).includes(codigoMaterial);
}

/** Gera o valor padrao de NF para retirada: RET + data no formato DDMMAAAA. */
function gerarNfPrefixoData(prefixo: string, data?: Date): string {
  const d = data ?? new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const aaaa = String(d.getFullYear());
  return `${prefixo}${dd}${mm}${aaaa}`;
}

/** NF automatica para retirada de cliente: RET + DDMMAAAA. */
export function gerarNfRetirada(data?: Date): string {
  return gerarNfPrefixoData('RET', data);
}

/** NF automatica para qualquer entrada reuso generico: REU + DDMMAAAA. */
export function gerarNfReuso(data?: Date): string {
  return gerarNfPrefixoData('REU', data);
}

/** Retorna true se a NF foi gerada automaticamente (REU ou RET + data). */
export function isNfAutoGerada(nf: string): boolean {
  return /^(REU|RET)\d{8}$/.test(nf);
}

// ─────────────────────────────────────────────
// Otimizacao de Material (retiradas RET)
// ─────────────────────────────────────────────

type MovRawRow = {
  id: string;
  data_movimentacao: string;
  quantidade: number;
  numero_nota_fiscal: string | null;
  material: { codigo_material: string; descricao: string } | null;
  entregue_por_equipe: { nome_completo: string } | null;
};

/**
 * Lista entradas RET dos materiais de retirada, uma linha por unidade fisica.
 * Cria as linhas em otimizacao_material_unidades caso ainda nao existam (lazy).
 */
export async function fetchOtimizacaoMaterial(donoUserId: string): Promise<LinhaOtimizacaoMaterial[]> {
  // 1. Busca movimentacoes RET
  const { data: movs, error: movErr } = await supabase
    .from('movimentacoes')
    .select(
      'id, data_movimentacao, quantidade, numero_nota_fiscal, material:material_id(codigo_material, descricao), entregue_por_equipe:entregue_por_equipe_id(nome_completo)'
    )
    .eq('dono_user_id', donoUserId)
    .eq('tipo_movimentacao', 'entrada')
    .eq('tipo_origem', 'reuso')
    .ilike('numero_nota_fiscal', 'RET%')
    .order('data_movimentacao', { ascending: false });

  if (movErr) throw movErr;

  // Filtra apenas os materiais de retirada RET pelo codigo
  const movList = ((movs ?? []) as MovRawRow[]).filter(
    (r) => r.material !== null && isMaterialRetiradaRet(r.material.codigo_material)
  );

  if (movList.length === 0) return [];

  const movIds = movList.map((m) => m.id);

  // 2. Busca unidades ja existentes
  const { data: unidadesExistentes, error: unErr } = await supabase
    .from('otimizacao_material_unidades')
    .select('id, movimentacao_id, numero_unidade, apta_para_uso')
    .in('movimentacao_id', movIds);

  if (unErr) throw unErr;

  // 3. Garante que todas as unidades existam (lazy creation)
  const existentesPorMov = new Map<string, Set<number>>();
  for (const u of unidadesExistentes ?? []) {
    const s = existentesPorMov.get(u.movimentacao_id) ?? new Set<number>();
    s.add(u.numero_unidade);
    existentesPorMov.set(u.movimentacao_id, s);
  }

  const toInsert: Array<{ movimentacao_id: string; dono_user_id: string; numero_unidade: number }> = [];
  for (const mov of movList) {
    const existentes = existentesPorMov.get(mov.id) ?? new Set<number>();
    const qtd = mov.quantidade ?? 1;
    for (let i = 1; i <= qtd; i++) {
      if (!existentes.has(i)) {
        toInsert.push({ movimentacao_id: mov.id, dono_user_id: donoUserId, numero_unidade: i });
      }
    }
  }

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase
      .from('otimizacao_material_unidades')
      .upsert(toInsert, { onConflict: 'movimentacao_id,numero_unidade', ignoreDuplicates: true });
    if (insErr) throw insErr;
  }

  // 4. Re-busca todas as unidades atualizadas (com campos de rastreamento)
  const { data: todasUnidades, error: allErr } = await supabase
    .from('otimizacao_material_unidades')
    .select('id, movimentacao_id, numero_unidade, apta_para_uso, status, tecnico_equipe_id, roteiro_os_id, roteiro_os:roteiro_os_id(codigo_os), tecnico:tecnico_equipe_id(nome_completo)')
    .in('movimentacao_id', movIds)
    .order('numero_unidade', { ascending: true });

  if (allErr) throw allErr;

  // 5. Monta o map de movimentacoes para cruzamento
  const movMap = new Map(movList.map((m) => [m.id, m]));

  return ((todasUnidades ?? []) as Array<{
    id: string;
    movimentacao_id: string;
    numero_unidade: number;
    apta_para_uso: boolean | null;
    status: StatusUnidadeReuso;
    tecnico_equipe_id: string | null;
    roteiro_os_id: string | null;
    roteiro_os: { codigo_os: string } | null;
    tecnico: { nome_completo: string } | null;
  }>).flatMap((u) => {
    const mov = movMap.get(u.movimentacao_id);
    if (!mov) return [];
    return [{
      unidade_id: u.id,
      movimentacao_id: u.movimentacao_id,
      data_movimentacao: mov.data_movimentacao,
      numero_unidade: u.numero_unidade,
      quantidade_total: mov.quantidade,
      numero_nota_fiscal: mov.numero_nota_fiscal,
      apta_para_uso: u.apta_para_uso,
      entregue_por_nome: mov.entregue_por_equipe?.nome_completo ?? null,
      material_descricao: mov.material!.descricao,
      material_codigo: mov.material!.codigo_material,
      status: u.status,
      tecnico_nome: u.tecnico?.nome_completo ?? null,
      roteiro_os_id: u.roteiro_os_id,
      roteiro_os_codigo: u.roteiro_os?.codigo_os ?? null,
    }];
  });
}

/** Breakdown de unidades reuso ativas por material (para Saldo). */
export async function fetchBreakdownReusoMateriais(
  donoUserId: string
): Promise<Map<string, BreakdownReusoMaterial>> {
  const { data, error } = await supabase
    .from('otimizacao_material_unidades')
    .select('status, apta_para_uso, tecnico_equipe_id, movimentacao:movimentacao_id(material_id)')
    .eq('dono_user_id', donoUserId)
    .in('status', ['disponivel', 'com_tecnico']);

  if (error) throw error;

  const emptyAval = (): AvaliacaoReuso => ({ apto: 0, inapto: 0, nao_avaliado: 0 });

  const result = new Map<string, BreakdownReusoMaterial>();
  for (const row of (data ?? []) as Array<{
    status: string;
    apta_para_uso: boolean | null;
    tecnico_equipe_id: string | null;
    movimentacao: { material_id: string } | null;
  }>) {
    const materialId = row.movimentacao?.material_id;
    if (!materialId) continue;

    const cur = result.get(materialId) ?? {
      disponivel: 0, com_tecnico: 0,
      apto: 0, nao_avaliado: 0, inapto: 0,
      central: emptyAval(),
      por_tecnico: {},
    };

    // Totais globais
    if (row.apta_para_uso === true) cur.apto++;
    else if (row.apta_para_uso === false) cur.inapto++;
    else cur.nao_avaliado++;

    if (row.status === 'disponivel') {
      cur.disponivel++;
      if (row.apta_para_uso === true) cur.central.apto++;
      else if (row.apta_para_uso === false) cur.central.inapto++;
      else cur.central.nao_avaliado++;
    } else if (row.status === 'com_tecnico' && row.tecnico_equipe_id) {
      cur.com_tecnico++;
      const tid = row.tecnico_equipe_id;
      if (!cur.por_tecnico[tid]) cur.por_tecnico[tid] = emptyAval();
      if (row.apta_para_uso === true) cur.por_tecnico[tid].apto++;
      else if (row.apta_para_uso === false) cur.por_tecnico[tid].inapto++;
      else cur.por_tecnico[tid].nao_avaliado++;
    }

    result.set(materialId, cur);
  }
  return result;
}

/** Unidades reuso disponíveis (status=disponivel) para um material, ordenadas por created_at. */
export async function fetchUnidadesReusoDisponiveis(
  donoUserId: string,
  materialId: string
): Promise<Array<{ id: string; numero_unidade: number; apta_para_uso: boolean | null }>> {
  const { data, error } = await supabase
    .from('otimizacao_material_unidades')
    .select('id, numero_unidade, apta_para_uso, movimentacao:movimentacao_id(material_id)')
    .eq('dono_user_id', donoUserId)
    .eq('status', 'disponivel')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    numero_unidade: number;
    apta_para_uso: boolean | null;
    movimentacao: { material_id: string } | null;
  }>)
    .filter((r) => r.movimentacao?.material_id === materialId)
    .map((r) => ({ id: r.id, numero_unidade: r.numero_unidade, apta_para_uso: r.apta_para_uso }));
}

/**
 * Conta quantas unidades reuso estao com um tecnico, agrupadas por material_id.
 */
export async function fetchContagemReusoComTecnico(
  donoUserId: string,
  tecnicoEquipeId: string
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('otimizacao_material_unidades')
    .select('id, movimentacao:movimentacao_id(material_id)')
    .eq('dono_user_id', donoUserId)
    .eq('status', 'com_tecnico')
    .eq('tecnico_equipe_id', tecnicoEquipeId);

  if (error) throw error;

  const map = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ movimentacao: { material_id: string } | null }>) {
    const mid = row.movimentacao?.material_id;
    if (mid) map.set(mid, (map.get(mid) ?? 0) + 1);
  }
  return map;
}

/**
 * Move N unidades reuso (FIFO) de um tecnico para outro ou de volta ao central.
 * Deve ser chamado apos registrarTransferencia para manter consistencia.
 * tecnicoDestinoEquipeId = null => volta ao central (status = disponivel).
 */
export async function moverUnidadesReusoTecnico(
  donoUserId: string,
  materialId: string,
  quantidade: number,
  tecnicoOrigemEquipeId: string,
  tecnicoDestinoEquipeId: string | null
): Promise<void> {
  const { data, error } = await supabase
    .from('otimizacao_material_unidades')
    .select('id, movimentacao:movimentacao_id(material_id)')
    .eq('dono_user_id', donoUserId)
    .eq('status', 'com_tecnico')
    .eq('tecnico_equipe_id', tecnicoOrigemEquipeId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const ids = ((data ?? []) as Array<{ id: string; movimentacao: { material_id: string } | null }>)
    .filter((r) => r.movimentacao?.material_id === materialId)
    .slice(0, quantidade)
    .map((r) => r.id);

  if (ids.length === 0) return;

  const update = tecnicoDestinoEquipeId
    ? { status: 'com_tecnico' as const, tecnico_equipe_id: tecnicoDestinoEquipeId, updated_at: new Date().toISOString() }
    : { status: 'disponivel' as const, tecnico_equipe_id: null as string | null, updated_at: new Date().toISOString() };

  const { error: upErr } = await supabase
    .from('otimizacao_material_unidades')
    .update(update)
    .in('id', ids);

  if (upErr) throw upErr;
}

/**
 * Avanca as N unidades reuso mais antigas (FIFO) para um tecnico.
 * Chamado apos registrarTransferencia para materiais RET.
 */
export async function avancarUnidadesReusoFifo(
  donoUserId: string,
  materialId: string,
  quantidade: number,
  tecnicoEquipeId: string
): Promise<void> {
  const disponiveis = await fetchUnidadesReusoDisponiveis(donoUserId, materialId);
  const ids = disponiveis.slice(0, quantidade).map((u) => u.id);
  if (ids.length === 0) return;

  const { error } = await supabase
    .from('otimizacao_material_unidades')
    .update({ status: 'com_tecnico', tecnico_equipe_id: tecnicoEquipeId, updated_at: new Date().toISOString() })
    .in('id', ids)
    .eq('dono_user_id', donoUserId);
  if (error) throw error;
}

/**
 * Vincula as N unidades reuso mais antigas (FIFO) do tecnico a uma OS.
 * Chamado automaticamente em abaterMateriaisOS para materiais RET.
 */
async function vincularUnidadesReusoOsFifo(
  donoUserId: string,
  tecnicoEquipeId: string,
  materialId: string,
  quantidade: number,
  roteiroOsId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('otimizacao_material_unidades')
    .select('id, movimentacao:movimentacao_id(material_id)')
    .eq('dono_user_id', donoUserId)
    .eq('status', 'com_tecnico')
    .eq('tecnico_equipe_id', tecnicoEquipeId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const ids = ((data ?? []) as Array<{ id: string; movimentacao: { material_id: string } | null }>)
    .filter((r) => r.movimentacao?.material_id === materialId)
    .slice(0, quantidade)
    .map((r) => r.id);

  if (ids.length === 0) return;

  const { error: updErr } = await supabase
    .from('otimizacao_material_unidades')
    .update({ status: 'usado_os', roteiro_os_id: roteiroOsId, updated_at: new Date().toISOString() })
    .in('id', ids)
    .eq('dono_user_id', donoUserId);
  if (updErr) throw updErr;
}

/** Atualiza o campo apta_para_uso de uma unidade individual (otimizacao_material_unidades). */
export async function atualizarAptaParaUso(
  donoUserId: string,
  unidadeId: string,
  apta: boolean | null
): Promise<void> {
  const { error } = await supabase
    .from('otimizacao_material_unidades')
    .update({ apta_para_uso: apta, updated_at: new Date().toISOString() })
    .eq('id', unidadeId)
    .eq('dono_user_id', donoUserId);
  if (error) throw error;
}

export async function registrarBaixaOs(
  donoUserId: string,
  usuarioId: string,
  payload: BaixaOsPayload
): Promise<void> {
  for (const item of payload.itens) {
    const { data: mov, error: movError } = await supabase
      .from('movimentacoes')
      .insert({
        dono_user_id: donoUserId,
        material_id: item.material_id,
        tipo_movimentacao: 'saida' as TipoMovimentacao,
        tipo_origem: null,
        quantidade: item.serial_ids ? item.serial_ids.length : item.quantidade,
        local_origem_id: item.local_origem_id,
        local_destino_id: null,
        data_movimentacao: payload.data_finalizacao_os,
        usuario_id: usuarioId,
        numero_nota_fiscal: null,
        data_nota_fiscal: null,
        observacao: null,
        roteiro_os_id: payload.roteiro_os_id,
      })
      .select('id')
      .single();

    if (movError) throw movError;

    if (item.serial_ids && item.serial_ids.length > 0) {
      for (const serialId of item.serial_ids) {
        await updateStatusSerial(serialId, 'instalado', {
          roteiro_os_id: payload.roteiro_os_id,
          nome_cliente: payload.nome_cliente,
          tipo_servico: payload.tipo_servico,
          data_finalizacao_os: payload.data_finalizacao_os,
        });
      }
    }
  }
}
