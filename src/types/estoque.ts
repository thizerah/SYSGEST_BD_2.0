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

/** Classificação do lançamento para o histórico (coluna Contexto). */
export type ContextoHistoricoKey =
  | 'estorno_auditoria'
  | 'entrada_pos_estorno'
  | 'baixa_reconferencia'
  | 'baixa_roteiro'
  | 'entrada'
  | 'transferencia'
  | 'ajuste_geral'
  | 'saida_outros';

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
  /** Histórico: código da OS quando `roteiro_os_id` está preenchido. */
  codigo_os_roteiro?: string | null;
  /** Histórico (modo quantidade / merge roteiro): cliente da OS. */
  nome_cliente_roteiro?: string | null;
  /** Histórico: código do cliente na OS (exibido na col. NF em “Instalado” semelhante ao modo seriais). */
  codigo_cliente_roteiro?: string | null;
  /**
   * Origem de negócio do lançamento (inferido: estorno, baixa 1ª vs pós-estorno, etc.).
   * Preenchido no histórico de material.
   */
  contexto_historico?: ContextoHistoricoKey;
}

/** Filtro do histórico por coluna “Contexto” (subset do que é inferido em `contexto_historico`). */
export type HistoricoFiltroContexto =
  | 'todos'
  | 'estorno_auditoria'
  | 'baixa_roteiro'
  | 'outros';

/** Uma linha do histórico em modo seriais (1 IRD por linha quando houver número). */
export interface LinhaHistoricoSerial {
  mov: Movimentacao;
  numero_serial: string | null;
  /** Cliente após instalação (campo do serial / OS). */
  nome_cliente_instalacao?: string | null;
  /** Código da ordem de serviço vinculada (movimento ou serial). */
  codigo_os?: string | null;
  /** NF registrada na entrada original do aparelho (tabela seriais). */
  nf_entrada_serial?: string | null;
  serial_status?: StatusSerial | null;
  /** IRD bate com `service_orders` (mesma OS + coluna ird_*), para indicador no histórico. */
  ird_confirmado_planilha?: boolean;
  /** Cliente na OS do roteiro (quando há vínculo com OS). */
  nome_cliente_roteiro?: string | null;
  /** Código do cliente na OS do roteiro. */
  codigo_cliente_roteiro?: string | null;
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
  /** Chave da entrada (com NF) para permitir mesmo IRD em entradas diferentes. */
  entrada_tipo_origem: TipoOrigem;
  entrada_numero_nota_fiscal: string;
  entrada_data_nota_fiscal: string;
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
  /** Local (tipo técnico): movimentação em que origem ou destino é esse local. */
  local_tecnico_id?: string;
}

/** Modo de exibição do histórico de material (UMB vs serial). */
export type ModoHistoricoMaterial = 'quantidade' | 'seriais';

export interface FiltroSeriais {
  material_id?: string;
  local_id?: string;
  status?: StatusSerial;
}
