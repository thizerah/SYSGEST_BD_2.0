/**
 * Mapeamento página (sidebar) → permissão e regras de acesso.
 * Admin: users, payments (só role).
 * Dono (user): módulos da empresa via modulos_habilitados quando definido.
 * Importação: módulo negociável por empresa + subusuário só com permissão importacao_dados.
 * Subusuário: conforme permissoes[] e papel.
 */

export const PERMISSOES_CODIGOS = [
  'tempos_otimizacao',
  'reaberturas',
  'tecnicos',
  'vendedores',
  'vendas',
  'indicadores',
  'permanencia',
  'cadastro_usuarios',
  'cadastro_acesso',
  'rotas',
  'rota_do_dia',
  'os_pendentes',
  'baixa_pagamento',
  'controle_saida',
  'importar_os',
  'editar_base',
  'editar_metas_empresa',
  'visualizar_mailing',
  'cadastro_fibra',
  'cadastro_movel',
  'cadastro_nova_parabolica',
  'visualizar_vendas',
  'visualizar_vendas_todas',
  'editar_metas_vendedor',
  'visualizar_metas_vendedor',
  'estoque',
  'importacao_dados',
  'estoque_saldo',
  'estoque_entrada',
  'estoque_avanco',
  'estoque_material_tecnico',
  'estoque_historico',
  'estoque_conferencia_os',
  'estoque_inventario',
  'estoque_otimizacao',
] as const;

export type PermissaoCodigo = (typeof PERMISSOES_CODIGOS)[number];

/** Permissões que liberam entrada na página Estoque (legado ou qualquer granular). */
export const ESTOQUE_PAGE_ANY_PERMISSIONS = [
  'estoque',
  'estoque_saldo',
  'estoque_entrada',
  'estoque_avanco',
  'estoque_material_tecnico',
  'estoque_historico',
  'estoque_conferencia_os',
  'estoque_inventario',
  'estoque_otimizacao',
] as const satisfies readonly PermissaoCodigo[];

/** Páginas que exigem permissão (subusuário). Dono vê todas. */
export const PAGE_TO_PERMISSION: Record<string, PermissaoCodigo | null> = {
  time: 'tempos_otimizacao',
  reopening: 'reaberturas',
  technicians: 'tecnicos',
  vendedor: 'vendedores',
  metas: 'vendas',
  permanencia: 'permanencia',
  indicadores: 'indicadores',
  base: 'editar_base',
  metas_empresa: 'editar_metas_empresa',
  metas_vendedor: null, // Usa PAGE_TO_PERMISSION_ANY
  mailing: 'visualizar_mailing',
  roteiro: 'rotas',
  cadastro_tecnicos: 'cadastro_usuarios',
  subusuarios: 'cadastro_acesso',
  cadastro_comercial: null, // Usa PAGE_TO_PERMISSION_ANY
  estoque: null, // Usa PAGE_TO_PERMISSION_ANY
};

/** Páginas que exigem QUALQUER uma das permissões listadas. */
export const PAGE_TO_PERMISSION_ANY: Record<string, PermissaoCodigo[]> = {
  cadastro_comercial: ['cadastro_fibra', 'cadastro_movel', 'cadastro_nova_parabolica'],
  visualizar_vendas: ['visualizar_vendas', 'visualizar_vendas_todas'],
  metas_vendedor: ['editar_metas_vendedor', 'visualizar_metas_vendedor'],
  estoque: [...ESTOQUE_PAGE_ANY_PERMISSIONS],
};

/** Páginas só para admin (role === 'admin'). */
export const ADMIN_ONLY_PAGES = [
  'users',
  'payments',
  'planos_comercial',
  'cadastro_material',
] as const;

/** Páginas só para dono/admin (não sub). Importação tratada aparte em AuthContext. */
export const DONO_OR_ADMIN_PAGES = [] as const;

export function getPermissionForPage(pageId: string): PermissaoCodigo | null {
  return PAGE_TO_PERMISSION[pageId] ?? null;
}

/** Retorna as permissões para páginas que aceitam QUALQUER uma delas. */
export function getPermissionsAnyForPage(pageId: string): PermissaoCodigo[] | null {
  return PAGE_TO_PERMISSION_ANY[pageId] ?? null;
}

export function isAdminOnlyPage(pageId: string): boolean {
  return (ADMIN_ONLY_PAGES as readonly string[]).includes(pageId);
}

export function isDonoOrAdminOnlyPage(pageId: string): boolean {
  return (DONO_OR_ADMIN_PAGES as readonly string[]).includes(pageId);
}

/** Abas do Roteiro → permissão. Quem tem "rotas" vê a guia; cada aba exige sua permissão. */
export const ROTEIRO_TAB_TO_PERMISSION: Record<string, PermissaoCodigo> = {
  calendario: 'rota_do_dia',
  pendentes: 'os_pendentes',
  baixa: 'baixa_pagamento',
  controle: 'controle_saida',
  importacao: 'importar_os',
};

/** Abas do Estoque → permissão granular. permissão legacy "estoque" libera todas (tratamento em EstoqueMain). */
export const ESTOQUE_TAB_TO_PERMISSION: Record<string, PermissaoCodigo> = {
  saldo: 'estoque_saldo',
  entrada: 'estoque_entrada',
  avanco: 'estoque_avanco',
  tecnico: 'estoque_material_tecnico',
  movimentacoes: 'estoque_historico',
  'conferencia-os': 'estoque_conferencia_os',
  inventario: 'estoque_inventario',
  'otimizacao-material': 'estoque_otimizacao',
};

/** Agrupamento do modal de permissões (Cadastro de Acesso), alinhado ao fluxo dos módulos. */
export const PERMISSOES_UI_GRUPOS: { id: string; label: string; codigos: readonly string[] }[] = [
  {
    id: 'comercial',
    label: 'Comercial',
    codigos: [
      'vendas',
      'permanencia',
      'cadastro_fibra',
      'cadastro_movel',
      'cadastro_nova_parabolica',
      'visualizar_vendas',
      'visualizar_vendas_todas',
      'vendedores',
    ],
  },
  {
    id: 'roteiro',
    label: 'Operacional — Roteiro',
    codigos: ['rotas', 'rota_do_dia', 'os_pendentes', 'baixa_pagamento', 'controle_saida', 'importar_os'],
  },
  {
    id: 'estoque',
    label: 'Operacional — Estoque',
    codigos: [
      'estoque_saldo',
      'estoque_entrada',
      'estoque_avanco',
      'estoque_material_tecnico',
      'estoque_historico',
      'estoque_conferencia_os',
      'estoque_inventario',
      'estoque_otimizacao',
    ],
  },
  {
    id: 'tempos_opts',
    label: 'Operacional — Tempos, reaberturas e relatórios',
    codigos: ['tempos_otimizacao', 'reaberturas', 'tecnicos'],
  },
  {
    id: 'gestao',
    label: 'Gestão',
    codigos: [
      'indicadores',
      'editar_base',
      'editar_metas_empresa',
      'visualizar_mailing',
      'editar_metas_vendedor',
      'visualizar_metas_vendedor',
    ],
  },
  {
    id: 'acessos',
    label: 'Acessos',
    codigos: ['cadastro_usuarios', 'cadastro_acesso'],
  },
  {
    id: 'importacao',
    label: 'Importação e dados',
    codigos: ['importacao_dados'],
  },
];

/** Categorias e módulos controlados por empresa (admin cadastro). */
export const MODULOS_CATEGORIAS = [
  {
    id: 'comercial',
    label: 'Comercial',
    modulos: [
      { id: 'metas', label: 'Vendas' },
      { id: 'permanencia', label: 'Permanência' },
      { id: 'cadastro_comercial', label: 'Cadastro Comercial' },
      { id: 'visualizar_vendas', label: 'Visualizar Vendas' },
      { id: 'vendedor', label: 'Rel. de Vendedores' },
    ],
  },
  {
    id: 'operacional',
    label: 'Operacional',
    modulos: [
      { id: 'roteiro', label: 'Roteiro' },
      { id: 'estoque', label: 'Estoque' },
      { id: 'time', label: 'Tempos e Otimização' },
      { id: 'reopening', label: 'Reaberturas' },
      { id: 'technicians', label: 'Rel. de Técnicos' },
    ],
  },
  {
    id: 'gestao',
    label: 'Gestão',
    modulos: [
      { id: 'indicadores', label: 'Projeção Variável' },
      { id: 'base', label: 'Base' },
      { id: 'metas_empresa', label: 'Meta Vendas Empresa' },
      { id: 'metas_vendedor', label: 'Meta Vendas Vendedor' },
      { id: 'mailing', label: 'Mailing' },
    ],
  },
  {
    id: 'configuracao',
    label: 'Configurações',
    modulos: [{ id: 'import', label: 'Importação' }],
  },
] as const;

/**
 * Códigos que existem em `permissoes` mas não entram no picker agrupado.
 * Ex.: `estoque` (libera tudo) substituído pelas permissões por aba; mantido no app para compatibilidade.
 */
export const PERMISSOES_OCULTAS_NO_PICKER = ['estoque'] as const;

/** IDs de todas as páginas sujeitas ao controle de módulos por empresa. */
export const MODULE_PAGES: string[] = MODULOS_CATEGORIAS.flatMap((c) =>
  c.modulos.map((m) => m.id)
);

/** Códigos das permissões que exibem dica para técnico (Rota do Dia e Rotas). */
const PERMISSOES_ROTEIRO_TECNICO = ['rota_do_dia', 'rotas'] as const;

/** Código do papel Técnico (para dica contextual nos modais de permissão). */
export const PAPEL_TECNICO = 'tecnico';

/**
 * Retorna o rótulo da permissão com dica quando for Rota do Dia ou Rotas:
 * - Se papel for técnico: "(marque estas duas se for técnico)"
 * - Caso contrário: "(para técnico marcar)"
 */
export function getLabelPermissaoRoteiro(
  nome: string,
  codigo: string,
  papelCodigo: string
): string {
  if (!(PERMISSOES_ROTEIRO_TECNICO as readonly string[]).includes(codigo)) {
    return nome;
  }
  if (papelCodigo === PAPEL_TECNICO) {
    return `${nome} (marque estas duas se for técnico)`;
  }
  return `${nome} (para técnico marcar)`;
}

/** Remove prefixo redundante "Estoque —" do nome vindo do banco (grupo já indica Estoque). */
function stripEstoquePrefixFromNome(nome: string): string {
  const s = nome.replace(/^\s*Estoque\s*[—–-]\s*/i, '').trim();
  return s.length > 0 ? s : nome;
}

/**
 * Rótulo exibido no `PermissoesGroupedPicker`: no bloco Estoque, nomes curtos sem prefixo "Estoque —".
 */
export function getLabelPermissaoGroupedPicker(
  nomeDb: string,
  codigo: string,
  grupoId: string,
  papelCodigo: string
): string {
  const nome = grupoId === 'estoque' ? stripEstoquePrefixFromNome(nomeDb) : nomeDb;
  return getLabelPermissaoRoteiro(nome, codigo, papelCodigo);
}
