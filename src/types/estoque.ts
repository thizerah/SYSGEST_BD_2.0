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
  valor_reais: number | null;
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
  local?: Pick<Local, 'nome' | 'tipo' | 'equipe_id'>;
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
  /** Membro da equipe que entregou o material ao estoque (retiradas RET). */
  entregue_por_equipe_id: string | null;
  /** Indica se o material retirado esta apto para uso (null = nao avaliado). */
  apta_para_uso: boolean | null;
  created_at: string;
  // joins opcionais
  material?: Pick<Material, 'codigo_material' | 'descricao' | 'unidade_medida' | 'serializado'>;
  local_origem?: Pick<Local, 'nome' | 'tipo' | 'equipe'> | null;
  local_destino?: Pick<Local, 'nome' | 'tipo' | 'equipe'> | null;
  /** Join opcional: dados do membro da equipe que entregou (retiradas RET). */
  entregue_por_equipe?: { nome_completo: string; funcao: string } | null;
  /** Seriais vinculados a esta movimentacao (preenchido no historico para materiais serializados). */
  seriais_vinculados?: { numero_serial: string }[];
  /** Historico: codigo da OS quando `roteiro_os_id` esta preenchido. */
  codigo_os_roteiro?: string | null;
  /** Historico (modo quantidade / merge roteiro): cliente da OS. */
  nome_cliente_roteiro?: string | null;
  /** Historico: codigo do cliente na OS (exibido na col. NF em "Instalado" semelhante ao modo seriais). */
  codigo_cliente_roteiro?: string | null;
  /**
   * Origem de negocio do lancamento (inferido: estorno, baixa 1a vs pos-estorno, etc.).
   * Preenchido no historico de material.
   */
  contexto_historico?: ContextoHistoricoKey;
}

/** Status de rastreamento de uma unidade reuso. */
export type StatusUnidadeReuso = 'disponivel' | 'com_tecnico' | 'usado_os';

/** Linha exibida na guia Otimizacao de Material (uma por unidade fisica). */
export interface LinhaOtimizacaoMaterial {
  /** ID da linha em otimizacao_material_unidades. */
  unidade_id: string;
  /** ID da movimentacao de entrada. */
  movimentacao_id: string;
  data_movimentacao: string;
  /** Numero desta unidade (1, 2, 3...). */
  numero_unidade: number;
  /** Total de unidades na mesma entrada. */
  quantidade_total: number;
  numero_nota_fiscal: string | null;
  apta_para_uso: boolean | null;
  entregue_por_nome: string | null;
  material_descricao: string;
  material_codigo: string;
  /** Onde a unidade esta no fluxo. */
  status: StatusUnidadeReuso;
  /** Nome do tecnico que recebeu no avanco. */
  tecnico_nome: string | null;
  /** OS em que foi consumida (UUID interno). */
  roteiro_os_id: string | null;
  /** Código legível da OS (ex: "OS-1234"). */
  roteiro_os_codigo: string | null;
}

/** Contagem de avaliacoes em um subconjunto de unidades reuso. */
export interface AvaliacaoReuso {
  apto: number;
  inapto: number;
  nao_avaliado: number;
}

/** Contagem de unidades reuso ativas por material (para exibicao no Saldo). */
export interface BreakdownReusoMaterial {
  /** Unidades no Estoque Central (status=disponivel). */
  disponivel: number;
  /** Unidades com algum tecnico (status=com_tecnico). */
  com_tecnico: number;
  /** Totais globais de avaliacao (disponivel + com_tecnico). */
  apto: number;
  nao_avaliado: number;
  inapto: number;
  /** Detalhes das unidades no Estoque Central. */
  central: AvaliacaoReuso;
  /** Detalhes por tecnico_equipe_id das unidades com_tecnico. */
  por_tecnico: Record<string, AvaliacaoReuso>;
}

/** Filtro do historico por coluna "Contexto" (subset do que e inferido em `contexto_historico`). */
export type HistoricoFiltroContexto =
  | 'todos'
  | 'estorno_auditoria'
  | 'baixa_roteiro'
  | 'outros';

/** Uma linha do historico em modo seriais (1 IRD por linha quando houver numero). */
export interface LinhaHistoricoSerial {
  mov: Movimentacao;
  numero_serial: string | null;
  /** Cliente apos instalacao (campo do serial / OS). */
  nome_cliente_instalacao?: string | null;
  /** Codigo da ordem de servico vinculada (movimento ou serial). */
  codigo_os?: string | null;
  /** NF registrada na entrada original do aparelho (tabela seriais). */
  nf_entrada_serial?: string | null;
  serial_status?: StatusSerial | null;
  /** IRD bate com `service_orders` (mesma OS + coluna ird_*), para indicador no historico. */
  ird_confirmado_planilha?: boolean;
  /** Cliente na OS do roteiro (quando ha vinculo com OS). */
  nome_cliente_roteiro?: string | null;
  /** Codigo do cliente na OS do roteiro. */
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
  /** Movimentacao de entrada que criou o registro; preservada apos transferencias. */
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
// Tipos de formulario (inputs)
// ─────────────────────────────────────────────

export interface MaterialForm {
  codigo_material: string;
  descricao: string;
  unidade_medida: string;
  serializado: boolean;
  ativo: boolean;
  categoria: string | null;
  valor_reais: number | null;
}

// ─────────────────────────────────────────────
// Inventário
// ─────────────────────────────────────────────

export type StatusSessaoInventario = 'em_andamento' | 'finalizado';
export type DivergenciaTipo = 'ok' | 'falta' | 'extra' | 'qtd_diff';
export type AcaoInventario = 'pendente' | 'perdido' | 'entrada' | 'ajuste_qtd' | 'sem_acao';

export interface SessaoInventario {
  id: string;
  dono_user_id: string;
  local_id: string;
  operador_equipe_id: string | null;
  iniciado_em: string;
  finalizado_em: string | null;
  status: StatusSessaoInventario;
  created_at: string;
  // joins opcionais
  local?: Pick<Local, 'nome' | 'tipo'>;
  operador_equipe?: { nome_completo: string } | null;
}

export interface InventarioItem {
  id: string;
  sessao_id: string;
  material_id: string;
  serial_id: string | null;
  qtd_sistema: number;
  qtd_contada: number;
  divergencia: DivergenciaTipo;
  acao_tomada: AcaoInventario;
  tecnico_resp_equipe_id: string | null;
  vale_gerado: boolean;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  // joins opcionais
  material?: Pick<Material, 'codigo_material' | 'descricao' | 'serializado' | 'valor_reais'>;
  serial?: Pick<Serial, 'numero_serial' | 'status'> | null;
  tecnico_resp_equipe?: { nome_completo: string } | null;
}

/** Item na tela de contagem (ainda não persistido como inventario_item). */
export interface ItemContagem {
  serial_id?: string;
  numero_serial?: string;
  material_id: string;
  /** Somente não-serializados. */
  qtd_contada?: number;
}

/** Linha de divergência calculada pelo sistema para exibição. */
export interface LinhaDivergencia {
  tipo: DivergenciaTipo;
  material_id: string;
  material_descricao: string;
  material_codigo: string;
  material_valor: number | null;
  /** Preenchido para serializados. */
  serial_id?: string;
  numero_serial?: string;
  /** Preenchido quando não-serializado. */
  qtd_sistema?: number;
  qtd_contada?: number;
  /** Técnico com a última movimentação (para "falta" de serial). */
  ultimo_tecnico_equipe_id?: string | null;
  ultimo_tecnico_nome?: string | null;
  /** Data da última movimentação para o vale. */
  data_ultimo_avanco?: string | null;
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
  /** Se true, so retorna linhas com quantidade > 0 (ex.: material do tecnico). */
  apenasComSaldo?: boolean;
}

export interface FiltroMovimentacoes {
  material_id?: string;
  local_id?: string;
  tipo_movimentacao?: TipoMovimentacao;
  data_inicio?: string;
  data_fim?: string;
  /** Local (tipo tecnico): movimentacao em que origem ou destino e esse local. */
  local_tecnico_id?: string;
}

/** Modo de exibicao do historico de material (UMB vs serial). */
export type ModoHistoricoMaterial = 'quantidade' | 'seriais';

export interface FiltroSeriais {
  material_id?: string;
  local_id?: string;
  status?: StatusSerial;
}
