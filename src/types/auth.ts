/**
 * Tipos para papéis, permissões e contexto de auth estendido.
 */

import type { User } from './index';

export type PapelCodigo = 'tecnico' | 'vendedor' | 'controlador' | 'estoquista' | 'backoffice';

export interface AuthExtras {
  isSubUser: boolean;
  papelCodigo: PapelCodigo | null;
  permissoes: string[];
  equipeId: string | null;
  donoUserId: string | null;
}

export interface AuthUser extends User {
  /** Preenchido quando é subusuário (usuarios_empresa). */
  authExtras?: AuthExtras;
}

export function defaultAuthExtras(): AuthExtras {
  return {
    isSubUser: false,
    papelCodigo: null,
    permissoes: [],
    equipeId: null,
    donoUserId: null,
  };
}
