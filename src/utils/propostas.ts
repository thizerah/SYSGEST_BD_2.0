import type {
  Venda,
  VendaMeta,
  VendaFibra,
  VendaMovel,
  VendaNovaParabolica,
  PlanoFibra,
  PlanoMovel,
  PropostaUnificada,
} from '@/types';

/** Igual à guia Vendas (`VisualizarVendasPage`): usado nas métricas para o selo “Pós” / “Flex”. */
export type TipoVendaComercial = 'POS' | 'PRE' | 'SKY+' | 'FIBRA' | 'MÓVEL' | 'NOVA PARABÓLICA';

export function mapearTipoDeCategoriaVenda(valor: string): TipoVendaComercial {
  const v = (valor || '').toUpperCase().trim();
  if (!v) return 'POS';
  if (v === 'PRE' || v.includes('PRÉ-PAGO') || v.includes('FLEX') || v.includes('CONFORTO')) return 'PRE';
  if (v === 'POS' || v.includes('PÓS-PAGO')) return 'POS';
  if (v.includes('SKY MAIS') || v.includes('SKY+') || v.includes('DGO')) return 'SKY+';
  if (v.includes('FIBRA') || v.includes('BL-DGO')) return 'FIBRA';
  if (v.includes('MÓVEL') || v.includes('MOVEL') || v.includes('CELULAR')) return 'MÓVEL';
  if (v.includes('NOVA PARABÓLICA') || v === 'NP') return 'NOVA PARABÓLICA';
  return 'POS';
}

/** Mesma regra que `buscarTodasVendasDoPeriodo` na aba Metas (`MetricsOverview`): mês/ano pedidos +, se for o mês calendário atual, inclui registros «Aguardando» do mês anterior. */
export function filtrarPropostasPorPeriodoComAguardandoMesAnterior<
  T extends { mes: number; ano: number; status_proposta?: string },
>(lista: T[], mes: number, ano: number): T[] {
  const hoje = new Date();
  const ehMesCorrente = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;
  if (ehMesCorrente) {
    const mesAnt = mes === 1 ? 12 : mes - 1;
    const anoAnt = mes === 1 ? ano - 1 : ano;
    const aguardando = (s: string | undefined) => (s ?? '').toUpperCase().includes('AGUARDANDO');
    return lista.filter(
      (p) =>
        (p.mes === mes && p.ano === ano) ||
        (p.mes === mesAnt && p.ano === anoAnt && aguardando(p.status_proposta)),
    );
  }
  return lista.filter((p) => p.mes === mes && p.ano === ano);
}

function extrairMesAno(dataStr: string | undefined | null): { mes: number; ano: number } {
  if (!dataStr) return { mes: new Date().getMonth() + 1, ano: new Date().getFullYear() };
  const d = new Date(dataStr);
  if (isNaN(d.getTime())) return { mes: new Date().getMonth() + 1, ano: new Date().getFullYear() };
  return { mes: d.getMonth() + 1, ano: d.getFullYear() };
}

export function normalizarVenda(v: Venda): PropostaUnificada {
  const { mes, ano } = extrairMesAno(v.data_habilitacao);
  return {
    id: v.numero_proposta,
    origem: 'venda',
    numero_proposta: v.numero_proposta,
    data_venda: v.data_habilitacao,
    mes,
    ano,
    vendedor: v.id_vendedor,
    nome_cliente: v.nome_proprietario,
    cpf: v.cpf,
    telefone: v.telefone_celular,
    cidade: v.cidade,
    bairro: v.bairro,
    status_proposta: v.status_proposta,
    categoria: v.agrupamento_produto?.toLowerCase(),
    produto: v.produto_principal,
    valor: v.valor ?? 0,
    forma_pagamento: v.forma_pagamento,
    data_criacao: v.data_criacao,
    updated_at: v.updated_at,
  };
}

export function normalizarVendaMeta(v: VendaMeta): PropostaUnificada {
  const { mes, ano } = extrairMesAno(v.data_venda);
  return {
    id: v.numero_proposta,
    origem: 'venda_meta',
    numero_proposta: v.numero_proposta,
    data_venda: v.data_venda,
    mes,
    ano,
    vendedor: v.vendedor,
    nome_cliente: v.nome_fantasia ?? '',
    cpf: v.cpf,
    telefone: v.telefone_celular,
    cidade: v.cidade,
    bairro: v.bairro,
    status_proposta: v.status_proposta,
    categoria: v.categoria?.toLowerCase(),
    produto: v.produto,
    valor: v.valor ?? 0,
    forma_pagamento: v.forma_pagamento,
    data_criacao: v.data_criacao,
    updated_at: v.updated_at,
  };
}

export function normalizarVendaFibra(
  v: VendaFibra,
  planosFibra: PlanoFibra[]
): PropostaUnificada {
  const plano = planosFibra.find(p => p.id === v.plano_fibra_id);
  const dataRef = v.data_venda || v.data_cadastro;
  const { mes, ano } = extrairMesAno(dataRef);
  return {
    id: v.id ?? `fibra-${v.cpf_cnpj}-${dataRef}`,
    origem: 'fibra',
    data_venda: dataRef ?? '',
    mes,
    ano,
    vendedor: v.vendedor,
    nome_cliente: v.nome_completo,
    cpf: v.cpf_cnpj,
    telefone: v.telefone,
    cidade: v.cidade,
    bairro: v.bairro,
    status_proposta: v.status_proposta,
    categoria: 'fibra',
    produto: plano?.nome ?? v.plano_fibra_nome,
    valor: plano?.preco_mensal ?? 0,
    plano_fibra_id: v.plano_fibra_id,
  };
}

export function normalizarVendaMovel(
  v: VendaMovel,
  planosMovel: PlanoMovel[]
): PropostaUnificada {
  const plano = planosMovel.find(p => p.id === v.plano_movel_id);
  const dataRef = v.data_venda || v.data_cadastro;
  const { mes, ano } = extrairMesAno(dataRef);
  return {
    id: v.id ?? `movel-${v.cpf}-${dataRef}`,
    origem: 'movel',
    data_venda: dataRef ?? '',
    mes,
    ano,
    vendedor: v.vendedor,
    nome_cliente: v.nome_completo,
    cpf: v.cpf,
    telefone: v.telefone,
    cidade: v.cidade,
    bairro: v.bairro,
    status_proposta: v.status_proposta,
    categoria: 'movel',
    produto: plano?.nome ?? v.plano_movel_nome,
    valor: plano?.preco_mensal ?? 0,
    plano_movel_id: v.plano_movel_id,
  };
}

export function normalizarVendaNovaParabolica(v: VendaNovaParabolica): PropostaUnificada {
  const { mes, ano } = extrairMesAno(v.data_venda);
  return {
    id: v.id ?? `np-${v.numero_proposta}`,
    origem: 'nova_parabolica',
    numero_proposta: v.numero_proposta,
    data_venda: v.data_venda,
    mes,
    ano,
    vendedor: v.vendedor,
    nome_cliente: v.nome_proprietario,
    cpf: v.cpf,
    telefone: v.telefone_celular,
    cidade: v.cidade,
    bairro: v.bairro,
    status_proposta: v.status_proposta,
    categoria: 'nova_parabolica',
    produto: 'Nova Parabólica',
    valor: v.valor ?? 0,
    forma_pagamento: v.forma_pagamento,
    info_recarga: v.info_recarga,
  };
}
