/**
 * Mapeamento página (sidebar) → permissão e regras de acesso.
 * Admin: users, payments (só role).
 * Dono (user): todos os módulos de empresa; import.
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
] as const;

export type PermissaoCodigo = (typeof PERMISSOES_CODIGOS)[number];

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
  estoque: 'estoque',
};

/** Páginas que exigem QUALQUER uma das permissões listadas. */
export const PAGE_TO_PERMISSION_ANY: Record<string, PermissaoCodigo[]> = {
  cadastro_comercial: ['cadastro_fibra', 'cadastro_movel', 'cadastro_nova_parabolica'],
  visualizar_vendas: ['visualizar_vendas', 'visualizar_vendas_todas'],
  metas_vendedor: ['editar_metas_vendedor', 'visualizar_metas_vendedor'],
};

/** Páginas só para admin (users, payments). */
export const ADMIN_ONLY_PAGES = ['users', 'payments'] as const;

/** Páginas só para dono/admin (não sub). Ex.: import, planos comercial. */
export const DONO_OR_ADMIN_PAGES = ['import', 'planos_comercial'] as const;

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

/** Categorias e módulos controlados por empresa. Páginas não listadas aqui são sempre visíveis. */
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
] as const;

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
