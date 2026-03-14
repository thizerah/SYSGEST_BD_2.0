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
    nome_cliente: v.nome_proprietario,
    cpf: v.cpf,
    telefone: v.telefone_celular,
    cidade: v.cidade,
    bairro: v.bairro,
    status_proposta: v.status_proposta,
    categoria: v.categoria?.toLowerCase(),
    produto: v.produto,
    valor: v.valor ?? 0,
    forma_pagamento: v.forma_pagamento,
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
