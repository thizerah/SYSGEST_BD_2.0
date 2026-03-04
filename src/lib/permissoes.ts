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
  mailing: 'visualizar_mailing',
  roteiro: 'rotas',
  cadastro_tecnicos: 'cadastro_usuarios',
  subusuarios: 'cadastro_acesso',
  cadastro_comercial: null, // Usa PAGE_TO_PERMISSION_ANY
};

/** Páginas que exigem QUALQUER uma das permissões listadas. */
export const PAGE_TO_PERMISSION_ANY: Record<string, PermissaoCodigo[]> = {
  cadastro_comercial: ['cadastro_fibra', 'cadastro_movel', 'cadastro_nova_parabolica'],
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
