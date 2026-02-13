import { supabase } from '@/lib/supabase';
import type { RotaOS, Rota, RegistroTempo, MaterialRota, FotoOS } from '@/types';

/** Formato DB de roteiro_os (snake_case) */
interface RoteiroOsRow {
  id: string;
  dono_user_id: string;
  codigo_os: string;
  codigo_cliente: string | null;
  nome_cliente: string;
  endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  cep: string | null;
  uf: string | null;
  telefone: string | null;
  telefone_comercial: string | null;
  telefone_residencial: string | null;
  tipo_servico: string | null;
  subtipo_servico: string | null;
  motivo: string | null;
  observacoes: string | null;
  servico_cobrado: boolean | null;
  valor: number | null;
  servico_pago: boolean | null;
  valor_pago: number | null;
  forma_pagamento: string | null;
  historico_tecnico: string | null;
  periodo: string | null;
  prioridade: string | null;
  pacote: string | null;
  codigo_item: string | null;
  acao_tomada: string | null;
  sigla_tecnico: string | null;
  reagendada: boolean | null;
  historico_status: string | null;
  ordem_sequencia: number | null;
  data_agendada: string;
  tecnico_id: string | null;
  tecnico_nome: string | null;
  status: string;
  registro_tempo: unknown;
  materiais_utilizados: unknown;
  fotos: unknown;
  assinatura_cliente: string | null;
  observacoes_tecnico: string | null;
  data_importacao: string;
  data_atribuicao: string | null;
  data_finalizacao: string | null;
  user_id: string;
}

function formatDateYMD(d: Date | string): string {
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : d;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mapOsRowToRotaOS(r: RoteiroOsRow): RotaOS {
  return {
    id: r.id,
    codigo_os: r.codigo_os,
    codigo_cliente: r.codigo_cliente ?? '',
    nome_cliente: r.nome_cliente,
    endereco: r.endereco ?? '',
    bairro: r.bairro ?? '',
    cidade: r.cidade ?? '',
    complemento: r.complemento ?? undefined,
    cep: r.cep ?? undefined,
    uf: r.uf ?? undefined,
    telefone: r.telefone ?? undefined,
    telefone_comercial: r.telefone_comercial ?? undefined,
    telefone_residencial: r.telefone_residencial ?? undefined,
    tipo_servico: r.tipo_servico ?? '',
    subtipo_servico: r.subtipo_servico ?? undefined,
    motivo: r.motivo ?? undefined,
    observacoes: r.observacoes ?? undefined,
    servico_cobrado: r.servico_cobrado ?? undefined,
    valor: r.valor != null ? Number(r.valor) : undefined,
    servico_pago: r.servico_pago ?? undefined,
    valor_pago: r.valor_pago != null ? Number(r.valor_pago) : undefined,
    forma_pagamento: r.forma_pagamento ?? undefined,
    historico_tecnico: r.historico_tecnico ?? undefined,
    periodo: r.periodo ?? undefined,
    prioridade: r.prioridade ?? undefined,
    pacote: r.pacote ?? undefined,
    codigo_item: r.codigo_item ?? undefined,
    acao_tomada: r.acao_tomada ?? undefined,
    sigla_tecnico: r.sigla_tecnico ?? undefined,
    reagendada: r.reagendada ?? undefined,
    historico_status: (r.historico_status as RotaOS['historico_status']) ?? undefined,
    ordem_sequencia: r.ordem_sequencia ?? undefined,
    data_agendada: formatDateYMD(r.data_agendada),
    tecnico_id: r.tecnico_id ?? undefined,
    tecnico_nome: r.tecnico_nome ?? undefined,
    status: r.status as RotaOS['status'],
    registro_tempo: (r.registro_tempo as RegistroTempo) ?? undefined,
    materiais_utilizados: (r.materiais_utilizados as MaterialRota[]) ?? undefined,
    fotos: (r.fotos as FotoOS[]) ?? undefined,
    assinatura_cliente: r.assinatura_cliente ?? undefined,
    observacoes_tecnico: r.observacoes_tecnico ?? undefined,
    data_importacao: r.data_importacao,
    data_atribuicao: r.data_atribuicao ?? undefined,
    data_finalizacao: r.data_finalizacao ?? undefined,
    user_id: r.user_id,
  };
}

function mapRotaOSToRow(os: Partial<RotaOS>, donoUserId: string, userId: string): Record<string, unknown> {
  const data_agendada = os.data_agendada ? formatDateYMD(os.data_agendada) : null;
  return {
    codigo_os: os.codigo_os ?? null,
    codigo_cliente: os.codigo_cliente ?? null,
    nome_cliente: os.nome_cliente ?? null,
    endereco: os.endereco ?? null,
    complemento: os.complemento ?? null,
    bairro: os.bairro ?? null,
    cidade: os.cidade ?? null,
    cep: os.cep ?? null,
    uf: os.uf ?? null,
    telefone: os.telefone ?? null,
    telefone_comercial: os.telefone_comercial ?? null,
    telefone_residencial: os.telefone_residencial ?? null,
    tipo_servico: os.tipo_servico ?? null,
    subtipo_servico: os.subtipo_servico ?? null,
    motivo: os.motivo ?? null,
    observacoes: os.observacoes ?? null,
    servico_cobrado: os.servico_cobrado ?? null,
    valor: os.valor ?? null,
    servico_pago: os.servico_pago ?? null,
    valor_pago: os.valor_pago ?? null,
    forma_pagamento: os.forma_pagamento ?? null,
    historico_tecnico: os.historico_tecnico ?? null,
    periodo: os.periodo ?? null,
    prioridade: os.prioridade ?? null,
    pacote: os.pacote ?? null,
    codigo_item: os.codigo_item ?? null,
    acao_tomada: os.acao_tomada ?? null,
    sigla_tecnico: os.sigla_tecnico ?? null,
    reagendada: os.reagendada ?? null,
    historico_status: os.historico_status ?? null,
    ordem_sequencia: os.ordem_sequencia ?? null,
    data_agendada: data_agendada ?? null,
    tecnico_id: (os.tecnico_id as string) || null,
    tecnico_nome: os.tecnico_nome ?? null,
    status: os.status ?? null,
    registro_tempo: os.registro_tempo ?? null,
    materiais_utilizados: os.materiais_utilizados ?? null,
    fotos: os.fotos ?? null,
    assinatura_cliente: os.assinatura_cliente ?? null,
    observacoes_tecnico: os.observacoes_tecnico ?? null,
    data_importacao: os.data_importacao ?? null,
    data_atribuicao: os.data_atribuicao ?? null,
    data_finalizacao: os.data_finalizacao ?? null,
    user_id: userId,
    dono_user_id: donoUserId,
  };
}

export async function fetchRoteiroOs(donoUserId: string): Promise<RotaOS[]> {
  const { data, error } = await supabase
    .from('roteiro_os')
    .select('*')
    .eq('dono_user_id', donoUserId)
    .order('data_agendada', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as RoteiroOsRow[]).map(mapOsRowToRotaOS);
}

export async function insertRoteiroOs(
  donoUserId: string,
  userId: string,
  os: Omit<RotaOS, 'id' | 'status' | 'data_importacao' | 'user_id'> & { id?: string; status?: RotaOS['status']; data_importacao?: string; user_id?: string }
): Promise<RotaOS> {
  const id = os.id ?? `os_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const status = (os.status ?? 'pendente') as RotaOS['status'];
  const data_importacao = os.data_importacao ?? new Date().toISOString();
  const uid = os.user_id ?? userId;
  const dataAgendada = os.data_agendada ? formatDateYMD(os.data_agendada) : formatDateYMD(new Date());
  const full: Partial<RotaOS> = { ...os, id, status, data_importacao, user_id: uid, data_agendada: dataAgendada };
  const row = mapRotaOSToRow(full, donoUserId, uid) as Record<string, unknown>;
  const { data, error } = await supabase
    .from('roteiro_os')
    .insert({ ...row, id, status, data_importacao, user_id: uid, data_agendada: dataAgendada })
    .select()
    .single();
  if (error) throw error;
  return mapOsRowToRotaOS(data as RoteiroOsRow);
}

export async function updateRoteiroOs(id: string, patch: Partial<RotaOS>): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.data_agendada != null) row.data_agendada = formatDateYMD(patch.data_agendada);
  if ('tecnico_id' in patch) row.tecnico_id = patch.tecnico_id ?? null;
  if (patch.tecnico_nome !== undefined) row.tecnico_nome = patch.tecnico_nome ?? null;
  if (patch.status !== undefined) row.status = patch.status;
  if ('data_atribuicao' in patch) row.data_atribuicao = patch.data_atribuicao ?? null;
  if (patch.data_finalizacao !== undefined) row.data_finalizacao = patch.data_finalizacao ?? null;
  if (patch.registro_tempo !== undefined) row.registro_tempo = patch.registro_tempo ?? null;
  if (patch.materiais_utilizados !== undefined) row.materiais_utilizados = patch.materiais_utilizados ?? null;
  if (patch.fotos !== undefined) row.fotos = patch.fotos ?? null;
  if (patch.observacoes !== undefined) row.observacoes = patch.observacoes ?? null;
  if (patch.observacoes_tecnico !== undefined) row.observacoes_tecnico = patch.observacoes_tecnico ?? null;
  if (patch.assinatura_cliente !== undefined) row.assinatura_cliente = patch.assinatura_cliente ?? null;
  if (patch.servico_cobrado !== undefined) row.servico_cobrado = patch.servico_cobrado ?? null;
  if (patch.valor !== undefined) row.valor = patch.valor ?? null;
  if (patch.servico_pago !== undefined) row.servico_pago = patch.servico_pago ?? null;
  if (patch.valor_pago !== undefined) row.valor_pago = patch.valor_pago ?? null;
  if (patch.forma_pagamento !== undefined) row.forma_pagamento = patch.forma_pagamento ?? null;
  if (patch.reagendada !== undefined) row.reagendada = patch.reagendada ?? null;
  if (patch.historico_status !== undefined) row.historico_status = patch.historico_status ?? null;
  if (patch.ordem_sequencia !== undefined) row.ordem_sequencia = patch.ordem_sequencia ?? null;
  const { error } = await supabase.from('roteiro_os').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteRoteiroOs(id: string): Promise<void> {
  const { error } = await supabase.from('roteiro_os').delete().eq('id', id);
  if (error) throw error;
}

/** Rotas */
interface RotasRow {
  id: string;
  dono_user_id: string;
  tecnico_id: string;
  tecnico_nome: string;
  data: string;
  os_ids: unknown;
  criada_em: string;
  criada_por: string;
}

function mapRotasRowToRota(r: RotasRow): Rota {
  return {
    id: r.id,
    tecnico_id: r.tecnico_id,
    tecnico_nome: r.tecnico_nome,
    data: formatDateYMD(r.data),
    os_ids: Array.isArray(r.os_ids) ? (r.os_ids as string[]) : [],
    criada_em: r.criada_em,
    criada_por: r.criada_por,
  };
}

export async function fetchRotas(donoUserId: string): Promise<Rota[]> {
  const { data, error } = await supabase
    .from('rotas')
    .select('*')
    .eq('dono_user_id', donoUserId)
    .order('data', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RotasRow[]).map(mapRotasRowToRota);
}

export async function insertRota(
  donoUserId: string,
  userId: string,
  r: Omit<Rota, 'id'> & { id?: string }
): Promise<Rota> {
  const id = r.id ?? `rota_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const data = formatDateYMD(r.data);
  const { data: row, error } = await supabase
    .from('rotas')
    .insert({
      id,
      dono_user_id: donoUserId,
      tecnico_id: r.tecnico_id,
      tecnico_nome: r.tecnico_nome,
      data,
      os_ids: r.os_ids,
      criada_em: r.criada_em,
      criada_por: r.criada_por,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRotasRowToRota(row as RotasRow);
}

export async function updateRota(id: string, patch: { os_ids?: string[] }): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.os_ids !== undefined) row.os_ids = patch.os_ids;
  const { error } = await supabase.from('rotas').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteRota(id: string): Promise<void> {
  const { error } = await supabase.from('rotas').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteAllRoteiroOs(donoUserId: string): Promise<void> {
  const { error } = await supabase.from('roteiro_os').delete().eq('dono_user_id', donoUserId);
  if (error) throw error;
}

export async function deleteAllRotas(donoUserId: string): Promise<void> {
  const { error } = await supabase.from('rotas').delete().eq('dono_user_id', donoUserId);
  if (error) throw error;
}

export async function deleteAllMediasTempo(donoUserId: string): Promise<void> {
  const { error } = await supabase.from('medias_tempo_por_tipo').delete().eq('dono_user_id', donoUserId);
  if (error) throw error;
}

/** Médias de tempo */
export interface MediaTempoRow {
  id: string;
  dono_user_id: string;
  tipo_servico: string;
  tempos: unknown;
  ultima_atualizacao: string | null;
}

export async function fetchMediasTempo(donoUserId: string): Promise<MediaTempoRow[]> {
  const { data, error } = await supabase
    .from('medias_tempo_por_tipo')
    .select('*')
    .eq('dono_user_id', donoUserId);
  if (error) throw error;
  return (data ?? []) as MediaTempoRow[];
}

export async function upsertMediasTempo(
  donoUserId: string,
  tipoServico: string,
  tempos: number[],
  ultimaAtualizacao: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('medias_tempo_por_tipo')
    .select('id')
    .eq('dono_user_id', donoUserId)
    .eq('tipo_servico', tipoServico)
    .single();
  if (existing) {
    const { error } = await supabase
      .from('medias_tempo_por_tipo')
      .update({
        tempos,
        ultima_atualizacao: ultimaAtualizacao,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existing as { id: string }).id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('medias_tempo_por_tipo').insert({
      dono_user_id: donoUserId,
      tipo_servico: tipoServico,
      tempos,
      ultima_atualizacao: ultimaAtualizacao,
    });
    if (error) throw error;
  }
}

/** Histórico de pagamento */
export interface HistoricoPagamentoRow {
  id: string;
  roteiro_os_id: string;
  dono_user_id: string;
  usuario_id: string;
  acao: string;
  valor_anterior: number | null;
  valor_novo: number | null;
  forma_anterior: string | null;
  forma_nova: string | null;
  pago_anterior: boolean | null;
  pago_novo: boolean | null;
  observacao: string | null;
  created_at: string;
}

export interface HistoricoPagamento {
  timestamp: string;
  acao: string;
  valor_anterior?: number;
  valor_novo?: number;
  forma_anterior?: string;
  forma_nova?: string;
  pago_anterior?: boolean;
  pago_novo?: boolean;
  observacao?: string;
}

export async function fetchHistoricoPagamento(roteiroOsId: string): Promise<HistoricoPagamento[]> {
  const { data, error } = await supabase
    .from('roteiro_historico_pagamento')
    .select('*')
    .eq('roteiro_os_id', roteiroOsId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as HistoricoPagamentoRow[]).map((r) => ({
    timestamp: r.created_at,
    acao: r.acao,
    valor_anterior: r.valor_anterior != null ? Number(r.valor_anterior) : undefined,
    valor_novo: r.valor_novo != null ? Number(r.valor_novo) : undefined,
    forma_anterior: r.forma_anterior ?? undefined,
    forma_nova: r.forma_nova ?? undefined,
    pago_anterior: r.pago_anterior ?? undefined,
    pago_novo: r.pago_novo ?? undefined,
    observacao: r.observacao ?? undefined,
  }));
}

export async function insertHistoricoPagamento(
  donoUserId: string,
  usuarioId: string,
  params: {
    roteiro_os_id: string;
    acao: string;
    valor_anterior?: number;
    valor_novo?: number;
    forma_anterior?: string;
    forma_nova?: string;
    pago_anterior?: boolean;
    pago_novo?: boolean;
    observacao?: string;
  }
): Promise<void> {
  const { error } = await supabase.from('roteiro_historico_pagamento').insert({
    dono_user_id: donoUserId,
    usuario_id: usuarioId,
    roteiro_os_id: params.roteiro_os_id,
    acao: params.acao,
    valor_anterior: params.valor_anterior ?? null,
    valor_novo: params.valor_novo ?? null,
    forma_anterior: params.forma_anterior ?? null,
    forma_nova: params.forma_nova ?? null,
    pago_anterior: params.pago_anterior ?? null,
    pago_novo: params.pago_novo ?? null,
    observacao: params.observacao ?? null,
  });
  if (error) throw error;
}
