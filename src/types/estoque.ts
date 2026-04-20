// ─────────────────────────────────────────────
// Tipos base (unions)
// ─────────────────────────────────────────────

export type TipoLocal = 'empresa' | 'tecnico' | 'cliente';

export type TipoMovimentacao = 'entrada' | 'saida' | 'transferencia' | 'ajuste';

export type TipoOrigem = 'compra' | 'reuso' | 'retorno_tecnico' | 'ajuste';

export type StatusSerial = 'disponivel' | 'instalado' | 'defeito' | 'perdido' | 'pago';

// ─────────────────────────────────────────────
// Entidades principais
// ─────────────────────────────────────────────

export interface Material {
  id: string;
  dono_user_id: string;
  codigo_material: string;
  descricao: string;
  unidade_medida: string;
  serializado: boolean;
  ativo: boolean;
  categoria: string | null;
  created_at: string;
  updated_at: string;
}

export interface Local {
  id: string;
  dono_user_id: string;
  nome: string;
  tipo: TipoLocal;
  equipe_id: string | null;
  created_at: string;
  updated_at: string;
  // join opcional
  equipe?: { nome_completo: string } | null;
}

export interface EstoqueSaldo {
  id: string;
  dono_user_id: string;
  material_id: string;
  local_id: string;
  quantidade: number;
  data_atualizacao: string;
  created_at: string;
  updated_at: string;
  // joins opcionais
  material?: Pick<Material, 'codigo_material' | 'descricao' | 'unidade_medida' | 'serializado'>;
  local?: Pick<Local, 'nome' | 'tipo'>;
}

export interface Movimentacao {
  id: string;
  dono_user_id: string;
  material_id: string;
  tipo_movimentacao: TipoMovimentacao;
  tipo_origem: TipoOrigem | null;
  quantidade: number;
  local_origem_id: string | null;
  local_destino_id: string | null;
  data_movimentacao: string;
  usuario_id: string;
  numero_nota_fiscal: string | null;
  data_nota_fiscal: string | null;
  observacao: string | null;
  roteiro_os_id: string | null;
  created_at: string;
  // joins opcionais
  material?: Pick<Material, 'codigo_material' | 'descricao' | 'unidade_medida' | 'serializado'>;
  local_origem?: Pick<Local, 'nome' | 'tipo'> | null;
  local_destino?: Pick<Local, 'nome' | 'tipo'> | null;
  /** Seriais vinculados a esta movimentação (preenchido no histórico para materiais serializados). */
  seriais_vinculados?: { numero_serial: string }[];
}

export interface Serial {
  id: string;
  dono_user_id: string;
  material_id: string;
  numero_serial: string;
  status: StatusSerial;
  local_id: string;
  data_entrada: string;
  movimentacao_id: string | null;
  /** Movimentação de entrada que criou o registro; preservada após transferências. */
  movimentacao_entrada_id: string | null;
  roteiro_os_id: string | null;
  nome_cliente: string | null;
  tipo_servico: string | null;
  data_finalizacao_os: string | null;
  created_at: string;
  updated_at: string;
  // joins opcionais
  material?: Pick<Material, 'codigo_material' | 'descricao'>;
  local?: Pick<Local, 'nome' | 'tipo'>;
}

// ─────────────────────────────────────────────
// Tipos de formulário (inputs)
// ─────────────────────────────────────────────

export interface MaterialForm {
  codigo_material: string;
  descricao: string;
  unidade_medida: string;
  serializado: boolean;
  ativo: boolean;
  categoria: string | null;
}

export interface LocalForm {
  nome: string;
  tipo: TipoLocal;
  equipe_id: string | null;
}

export interface EntradaMaterialForm {
  material_id: string;
  local_destino_id: string;
  quantidade: number;
  tipo_origem: TipoOrigem;
  numero_nota_fiscal: string | null;
  data_nota_fiscal: string | null;
  data_movimentacao: string;
  observacao: string | null;
  // somente para materiais serializados
  seriais?: string[];
}

export interface TransferenciaForm {
  material_id: string;
  local_origem_id: string;
  local_destino_id: string;
  quantidade: number;
  observacao: string | null;
  // somente para materiais serializados
  seriais?: string[];
}

export interface AjusteEstoqueForm {
  material_id: string;
  local_id: string;
  quantidade: number;
  observacao: string | null;
}

// ─────────────────────────────────────────────
// Tipos de filtro para consultas
// ─────────────────────────────────────────────

export interface FiltroEstoque {
  material_id?: string;
  local_id?: string;
  categoria?: string;
  /** Se true, só retorna linhas com quantidade > 0 (ex.: material do técnico). */
  apenasComSaldo?: boolean;
}

export interface FiltroMovimentacoes {
  material_id?: string;
  local_id?: string;
  tipo_movimentacao?: TipoMovimentacao;
  data_inicio?: string;
  data_fim?: string;
}

export interface FiltroSeriais {
  material_id?: string;
  local_id?: string;
  status?: StatusSerial;
}
