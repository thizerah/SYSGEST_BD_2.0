import { supabase } from '@/lib/supabase';
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
} from '@/types/estoque';

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

export async function getOrCreateLocalTecnico(
  donoUserId: string,
  equipeId: string,
  nomeTecnico: string
): Promise<Local> {
  const { data: existing } = await supabase
    .from('locais')
    .select('*')
    .eq('dono_user_id', donoUserId)
    .eq('tipo', 'tecnico')
    .eq('equipe_id', equipeId)
    .maybeSingle();

  if (existing) return existing as Local;

  const { data, error } = await supabase
    .from('locais')
    .insert({ dono_user_id: donoUserId, nome: nomeTecnico, tipo: 'tecnico', equipe_id: equipeId })
    .select()
    .single();
  if (error) throw error;
  return data as Local;
}

// ─────────────────────────────────────────────
// Materiais
// ─────────────────────────────────────────────

export async function fetchMateriais(donoUserId: string): Promise<Material[]> {
  const { data, error } = await supabase
    .from('materiais')
    .select('*')
    .eq('dono_user_id', donoUserId)
    .order('descricao');
  if (error) throw error;
  return (data ?? []) as Material[];
}

export async function createMaterial(
  donoUserId: string,
  payload: MaterialForm
): Promise<Material> {
  const { data, error } = await supabase
    .from('materiais')
    .insert({ dono_user_id: donoUserId, ...payload })
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
      '*, material:materiais(codigo_material, descricao, unidade_medida, serializado), local:locais(nome, tipo)'
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
      '*, material:materiais(codigo_material, descricao, unidade_medida, serializado), local_origem:locais!local_origem_id(nome, tipo), local_destino:locais!local_destino_id(nome, tipo)'
    )
    .eq('dono_user_id', donoUserId);

  if (filtro?.material_id) query = query.eq('material_id', filtro.material_id);
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

// ─────────────────────────────────────────────
// Entrada de material
// Cria a movimentação e (para serializados) insere os seriais.
// O trigger do banco atualiza o estoque automaticamente.
// ─────────────────────────────────────────────

export async function registrarEntrada(
  donoUserId: string,
  usuarioId: string,
  form: EntradaMaterialForm
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
    })
    .select()
    .single();

  if (movError) throw movError;

  if (form.seriais && form.seriais.length > 0) {
    const serialRows = form.seriais.map((numero_serial) => ({
      dono_user_id: donoUserId,
      material_id: form.material_id,
      numero_serial,
      status: 'disponivel',
      local_id: form.local_destino_id,
      data_entrada: form.data_movimentacao,
      movimentacao_id: mov.id,
      movimentacao_entrada_id: mov.id,
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

  const { data, error } = await supabase
    .from('seriais')
    .select('*, material:materiais(id, codigo_material, descricao, unidade_medida, serializado, ativo)')
    .eq('dono_user_id', donoUserId)
    .eq('numero_serial', normalized)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  if (data.status !== 'disponivel') return null;

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

/** Retorna os números de serial que já existem no banco para o dono (para validação de duplicados). */
export async function checkSeriaisExistentes(
  donoUserId: string,
  numerosSerial: string[]
): Promise<string[]> {
  if (numerosSerial.length === 0) return [];
  const { data, error } = await supabase
    .from('seriais')
    .select('numero_serial')
    .eq('dono_user_id', donoUserId)
    .in('numero_serial', numerosSerial);
  if (error) throw error;
  return (data ?? []).map((s) => s.numero_serial as string);
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
      for (const serialId of item.serial_ids) {
        const { error } = await supabase
          .from('seriais')
          .update({ status: 'instalado', roteiro_os_id: roteiroOsId, updated_at: new Date().toISOString() })
          .eq('id', serialId);
        if (error) throw error;
      }
    }
  }

  // Marca a OS como sincronizada no estoque
  const { error: syncError } = await supabase
    .from('roteiro_os')
    .update({ estoque_sincronizado: true })
    .eq('id', roteiroOsId);
  if (syncError) throw syncError;
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

      // Atualizar seriais com dados do cliente
      for (const numeroSerial of item.seriais) {
        const { data: serial } = await supabase
          .from('seriais')
          .select('id')
          .eq('dono_user_id', donoUserId)
          .eq('numero_serial', numeroSerial)
          .maybeSingle();

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
