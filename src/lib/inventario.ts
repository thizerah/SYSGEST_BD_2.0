import { supabase } from '@/lib/supabase';
import type {
  SessaoInventario,
  InventarioItem,
  LinhaDivergencia,
  DivergenciaTipo,
  AcaoInventario,
  Serial,
  EstoqueSaldo,
  Material,
} from '@/types/estoque';

// ─────────────────────────────────────────────
// Sessões
// ─────────────────────────────────────────────

export async function criarSessaoInventario(
  donoUserId: string,
  localId: string,
  operadorEquipeId: string | null
): Promise<SessaoInventario> {
  const { data, error } = await supabase
    .from('sessoes_inventario')
    .insert({ dono_user_id: donoUserId, local_id: localId, operador_equipe_id: operadorEquipeId })
    .select('*, local:locais(nome, tipo), operador_equipe:equipe(nome_completo)')
    .single();
  if (error) throw error;
  return data as SessaoInventario;
}

export async function fetchSessoesInventario(donoUserId: string): Promise<SessaoInventario[]> {
  const { data, error } = await supabase
    .from('sessoes_inventario')
    .select('*, local:locais(nome, tipo), operador_equipe:equipe(nome_completo)')
    .eq('dono_user_id', donoUserId)
    .order('iniciado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SessaoInventario[];
}

export async function finalizarSessaoInventario(sessaoId: string): Promise<void> {
  const { error } = await supabase
    .from('sessoes_inventario')
    .update({ status: 'finalizado', finalizado_em: new Date().toISOString() })
    .eq('id', sessaoId);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// Estoque esperado por local
// ─────────────────────────────────────────────

export interface EstoqueEsperado {
  seriais: (Serial & { material: Pick<Material, 'codigo_material' | 'descricao' | 'serializado' | 'valor_reais'> })[];
  naoSeriais: (EstoqueSaldo & { material: Pick<Material, 'codigo_material' | 'descricao' | 'serializado' | 'unidade_medida'> })[];
}

export async function fetchEstoqueEsperadoPorLocal(
  donoUserId: string,
  localId: string
): Promise<EstoqueEsperado> {
  const [{ data: serialData, error: e1 }, { data: naoSerialData, error: e2 }] = await Promise.all([
    supabase
      .from('seriais')
      .select('*, material:materiais(codigo_material, descricao, serializado, valor_reais)')
      .eq('dono_user_id', donoUserId)
      .eq('local_id', localId)
      .eq('status', 'disponivel'),
    supabase
      .from('estoque')
      .select('*, material:materiais(codigo_material, descricao, serializado, unidade_medida)')
      .eq('dono_user_id', donoUserId)
      .eq('local_id', localId)
      .gt('quantidade', 0),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const naoSeriais = ((naoSerialData ?? []) as any[]).filter(
    (s) => s.material?.serializado === false
  );

  return {
    seriais: (serialData ?? []) as any[],
    naoSeriais: naoSeriais as any[],
  };
}

// ─────────────────────────────────────────────
// Cálculo de divergências (client-side)
// ─────────────────────────────────────────────

export interface DadosContagem {
  seriais_bipados: string[];
  contagem_nao_serial: Record<string, number>;
}

export function calcularDivergencias(
  esperado: EstoqueEsperado,
  contagem: DadosContagem
): LinhaDivergencia[] {
  const divergencias: LinhaDivergencia[] = [];
  const bipados = new Set(contagem.seriais_bipados.map((s) => s.toUpperCase().trim()));
  const esperadosMap = new Map(
    esperado.seriais.map((s) => [(s.numero_serial ?? '').toUpperCase().trim(), s])
  );

  // Seriais esperados mas não encontrados (falta)
  for (const [num, serial] of esperadosMap) {
    if (!bipados.has(num)) {
      divergencias.push({
        tipo: 'falta',
        material_id: serial.material_id,
        material_descricao: (serial.material as any)?.descricao ?? '',
        material_codigo: (serial.material as any)?.codigo_material ?? '',
        material_valor: (serial.material as any)?.valor_reais ?? null,
        serial_id: serial.id,
        numero_serial: serial.numero_serial,
      });
    }
  }

  // Seriais bipados mas não esperados neste local (extra)
  for (const num of contagem.seriais_bipados) {
    const numUp = num.toUpperCase().trim();
    if (!esperadosMap.has(numUp)) {
      divergencias.push({
        tipo: 'extra',
        material_id: '',
        material_descricao: 'Serial não identificado no local',
        material_codigo: '',
        material_valor: null,
        numero_serial: num,
      });
    }
  }

  // Não serializados: quantidade divergente
  for (const saldo of esperado.naoSeriais) {
    const contado = contagem.contagem_nao_serial[saldo.material_id];
    if (contado === undefined || contado === saldo.quantidade) continue;
    divergencias.push({
      tipo: 'qtd_diff',
      material_id: saldo.material_id,
      material_descricao: (saldo.material as any)?.descricao ?? '',
      material_codigo: (saldo.material as any)?.codigo_material ?? '',
      material_valor: null,
      qtd_sistema: saldo.quantidade,
      qtd_contada: contado,
    });
  }

  return divergencias;
}

// ─────────────────────────────────────────────
// Itens da sessão
// ─────────────────────────────────────────────

export async function persistirItensInventario(
  sessaoId: string,
  itens: Array<{
    material_id: string;
    serial_id: string | null;
    qtd_sistema: number;
    qtd_contada: number;
    divergencia: DivergenciaTipo;
    acao_tomada: AcaoInventario;
    tecnico_resp_equipe_id: string | null;
    vale_gerado: boolean;
    observacao: string | null;
  }>
): Promise<void> {
  if (itens.length === 0) return;
  const { error } = await supabase
    .from('inventario_itens')
    .insert(itens.map((i) => ({ ...i, sessao_id: sessaoId })));
  if (error) throw error;
}

// ─────────────────────────────────────────────
// Técnico responsável pelo serial
// ─────────────────────────────────────────────

export async function fetchUltimoTecnicoDoSerial(
  donoUserId: string,
  serialId: string
): Promise<{ equipe_id: string | null; nome_completo: string | null } | null> {
  const { data } = await supabase
    .from('seriais')
    .select('local_id, local:locais(tipo, equipe_id, equipe:equipe_id(nome_completo))')
    .eq('dono_user_id', donoUserId)
    .eq('id', serialId)
    .single();

  if (!data) return null;
  const local = (data as any).local;
  if (!local || local.tipo !== 'tecnico' || !local.equipe_id) return null;

  return {
    equipe_id: local.equipe_id,
    nome_completo: local.equipe?.nome_completo ?? null,
  };
}

// ─────────────────────────────────────────────
// Ações sobre divergências
// ─────────────────────────────────────────────

export async function marcarSerialComoPerdido(
  donoUserId: string,
  usuarioId: string,
  serialId: string,
  localId: string,
  observacao: string,
  sessaoId: string
): Promise<void> {
  const now = new Date().toISOString();

  const { data: serialRow, error: errFetch } = await supabase
    .from('seriais')
    .select('material_id')
    .eq('id', serialId)
    .single();
  if (errFetch) throw errFetch;

  const { error: errSerial } = await supabase
    .from('seriais')
    .update({ status: 'perdido', updated_at: now })
    .eq('id', serialId);
  if (errSerial) throw errSerial;

  const obs = `[Inventário - ${sessaoId.slice(0, 8)}] ${observacao || 'Material não encontrado no inventário físico.'}`;
  const { error: errMov } = await supabase.from('movimentacoes').insert({
    dono_user_id: donoUserId,
    material_id: serialRow.material_id,
    tipo_movimentacao: 'ajuste',
    tipo_origem: 'ajuste',
    quantidade: 1,
    local_origem_id: localId,
    local_destino_id: null,
    data_movimentacao: now,
    usuario_id: usuarioId,
    observacao: obs,
  });
  if (errMov) throw errMov;
}

export async function registrarEntradaAjusteSerial(
  donoUserId: string,
  usuarioId: string,
  localId: string,
  numeroSerial: string,
  sessaoId: string
): Promise<{ encontrado: boolean }> {
  const now = new Date().toISOString();
  const obs = `[Inventário - ${sessaoId.slice(0, 8)}] Serial encontrado fisicamente — regularização de local.`;

  const { data: existente } = await supabase
    .from('seriais')
    .select('id, material_id, status, local_id')
    .eq('dono_user_id', donoUserId)
    .ilike('numero_serial', numeroSerial.trim())
    .maybeSingle();

  if (!existente) return { encontrado: false };

  const { error: errUpd } = await supabase
    .from('seriais')
    .update({ local_id: localId, status: 'disponivel', updated_at: now })
    .eq('id', existente.id);
  if (errUpd) throw errUpd;

  const { error: errMov } = await supabase.from('movimentacoes').insert({
    dono_user_id: donoUserId,
    material_id: existente.material_id,
    tipo_movimentacao: 'ajuste',
    tipo_origem: 'ajuste',
    quantidade: 1,
    local_origem_id: existente.local_id !== localId ? existente.local_id : null,
    local_destino_id: localId,
    data_movimentacao: now,
    usuario_id: usuarioId,
    observacao: obs,
  });
  if (errMov) throw errMov;
  return { encontrado: true };
}

export async function ajustarQuantidadeInventario(
  donoUserId: string,
  usuarioId: string,
  materialId: string,
  localId: string,
  qtdSistema: number,
  qtdContada: number,
  sessaoId: string
): Promise<void> {
  const diferenca = qtdContada - qtdSistema;
  if (diferenca === 0) return;

  const now = new Date().toISOString();
  const obs = `[Inventário - ${sessaoId.slice(0, 8)}] Ajuste de quantidade: sistema=${qtdSistema}, contado=${qtdContada}, diferença=${diferenca > 0 ? '+' : ''}${diferenca}.`;

  const { error } = await supabase.from('movimentacoes').insert({
    dono_user_id: donoUserId,
    material_id: materialId,
    tipo_movimentacao: 'ajuste',
    tipo_origem: 'ajuste',
    quantidade: Math.abs(diferenca),
    local_origem_id: diferenca < 0 ? localId : null,
    local_destino_id: diferenca > 0 ? localId : null,
    data_movimentacao: now,
    usuario_id: usuarioId,
    observacao: obs,
  });
  if (error) throw error;
}

// ─────────────────────────────────────────────
// Vale PDF (geração via janela de impressão)
// ─────────────────────────────────────────────

export interface DadosVale {
  materialDescricao: string;
  materialCodigo: string;
  numeroSerial: string;
  valorReais: number | null;
  dataInventario: string;
  tecnicoNome: string;
  observacao: string;
}

export function gerarValePDF(dados: DadosVale): void {
  const valor = dados.valorReais != null
    ? `R$ ${dados.valorReais.toFixed(2).replace('.', ',')}`
    : 'Não informado';

  const dataInv = new Date(dados.dataInventario).toLocaleDateString('pt-BR');
  const dataGeracao = new Date().toLocaleDateString('pt-BR');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Vale de Perda - ${dados.numeroSerial}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:40px;color:#000;font-size:13px}
    h1{font-size:17px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px}
    .subtitle{color:#555;font-size:11px;margin-bottom:24px}
    .meta{display:flex;justify-content:space-between;margin-bottom:20px;font-size:11px;color:#444}
    .field{margin-bottom:14px}
    .label{font-weight:bold;font-size:10px;text-transform:uppercase;color:#666;letter-spacing:.5px}
    .value{font-size:13px;margin-top:3px;border-bottom:1px solid #ddd;padding-bottom:4px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:0 24px}
    .assinaturas{margin-top:56px;display:flex;gap:80px}
    .assinatura{text-align:center;width:200px}
    .assinatura div{border-top:1px solid #000;padding-top:6px;font-size:11px}
    @media print{body{padding:20px}}
  </style>
</head>
<body>
  <h1>Vale de Perda de Material</h1>
  <div class="subtitle">Documento para desconto junto ao departamento financeiro</div>
  <div class="meta">
    <span>Data do Inventário: <strong>${dataInv}</strong></span>
    <span>Gerado em: ${dataGeracao}</span>
  </div>
  <div class="grid">
    <div class="field"><div class="label">Modelo do Aparelho</div><div class="value">${dados.materialDescricao}</div></div>
    <div class="field"><div class="label">Código do Material</div><div class="value">${dados.materialCodigo}</div></div>
    <div class="field"><div class="label">Número do Serial</div><div class="value">${dados.numeroSerial}</div></div>
    <div class="field"><div class="label">Valor do Aparelho</div><div class="value">${valor}</div></div>
  </div>
  <div class="field"><div class="label">Técnico Responsável</div><div class="value">${dados.tecnicoNome || 'Não identificado'}</div></div>
  <div class="field"><div class="label">Informações da Perda / Motivo</div><div class="value" style="min-height:40px">${dados.observacao || '—'}</div></div>
  <div class="assinaturas">
    <div class="assinatura"><div>Assinatura do Técnico</div></div>
    <div class="assinatura"><div>Assinatura do Responsável</div></div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=820,height=640');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}
