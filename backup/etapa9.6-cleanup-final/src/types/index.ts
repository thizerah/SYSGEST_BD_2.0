// Service Order data structure
export interface ServiceOrder {
  codigo_os: string;
  id_tecnico: string;
  nome_tecnico: string;
  sigla_tecnico: string;
  tipo_servico: string;
  subtipo_servico: string;
  motivo: string;
  codigo_cliente: string;
  nome_cliente: string;
  status: string;
  data_criacao: string;
  data_finalizacao: string;
  cidade: string;
  bairro: string;
  
  // Optional fields
  info_ponto_de_referencia?: string | null;
  info_cto?: string | null;
  info_porta?: string | null;
  info_endereco_completo?: string | null;
  info_empresa_parceira?: string | null;
  acao_tomada?: string | null;
  
  // Calculated fields
  tempo_atendimento?: number | null;
  atingiu_meta?: boolean;
  include_in_metrics?: boolean; // Indica se deve ser incluído nas métricas de tempo e reabertura
}

// User authentication model
export interface User {
  id: string;
  username: string;
  name: string;
  email: string; // Email do usuário
  phone?: string; // Telefone do usuário
  role: 'admin' | 'user';
  empresa: string; // Nome da empresa do usuário
  data_adesao?: string; // Data de pagamento no formato ISO
  acesso_liberado: boolean; // Status de acesso do usuário
  created_at?: string; // Data de criação do usuário
  updated_at?: string; // Data de atualização do usuário
  sessionId?: string;
  password?: string;
}

// Service time goals by service type
export const SERVICE_TIME_GOALS: Record<string, number> = {
  'Ponto Principal TV': 48,
  'Ponto Principal Fibra': 48,
  'Ponto Principal': 48,
  'Ponto Principal BL': 48,
  'Assistência Técnica Fibra': 24,
  'Assistência Técnica TV': 34,
  'Corretiva': 48,
  'Corretiva BL': 48,
  'Preventiva BL': 48,
  'Prestação de Serviço': 48,
  'Prestação de Serviço BL': 48,
  'default': 48 // Default goal for unknown service types
};

// Status aceitos
export const VALID_STATUS = ["Finalizada", "Finalizado", "Executada", "Executado"];

// Subtipos válidos
export const VALID_SUBTYPES = [
  "Ponto Principal", 
  "Ponto Principal BL", 
  "Corretiva", 
  "Corretiva BL",
  "Preventiva BL", 
  "Prestação de Serviço", 
  "Prestação de Serviço BL"
];

// Motivos excluídos
export const EXCLUDED_REASONS = [
  "Ant Governo", 
  "Nova Parabólica"
];

// Interface para métricas de reabertura por tipo original
export interface ReopeningByOriginalTypeMetric {
  tipo_original: string;
  total_reaberturas: number;
  tempo_medio_entre_os: number;
  taxa_reabertura: number;
}

// Interface para métricas de tempo por tipo de serviço
export interface ServiceTypeMetric {
  totalOrders: number;
  withinGoal: number;
  percentWithinGoal: number;
  averageTime: number;
}

// Interface para pares de reabertura (OS original e reabertura)
export interface ReopeningPair {
  originalOrder: ServiceOrder;
  reopeningOrder: ServiceOrder;
  timeBetween: number; // Tempo entre ordens em horas
  daysBetween: number; // Tempo entre ordens em dias
  originalServiceCategory?: string; // Categoria do serviço original (TV ou Fibra)
  reopeningServiceCategory?: string; // Categoria do serviço de reabertura (TV ou Fibra)
}

// Interface para dados de vendas
export interface Venda {
  numero_proposta: string;
  id_vendedor: string;
  nome_proprietario: string;
  cpf: string;               // CPF do cliente
  nome_fantasia: string;     // Nome Fantasia do cliente
  agrupamento_produto: string;
  produto_principal: string;
  valor: number;
  status_proposta: string;
  data_habilitacao: string;
  dias_corridos?: number; // Calculado: data_habilitacao - data_atual
  telefone_celular?: string; // Telefone celular do cliente
}

// Interface para dados de primeiro pagamento
export interface PrimeiroPagamento {
  proposta: string;
  passo: string;
  data_passo_cobranca: string;
  vencimento_fatura: string;
  status_pacote: string;
  data_importacao: string; // Data em que o registro foi importado
}

// Interface para métricas de permanência
export interface PermanenciaMetrics {
  total_clientes: number;
  adimplentes: number;
  inadimplentes: number;
  cancelados: number;
  percentual_adimplentes: number;
  percentual_inadimplentes: number;
  percentual_cancelados: number;
}

// Interface para métricas de vendedor
export interface VendedorMetrics {
  id_vendedor: string;
  nome_vendedor: string;
  total_vendas: number;
  total_propostas: number;
  taxa_conversao: number;
  clientes_adimplentes: number;
  clientes_inadimplentes: number;
  clientes_cancelados: number;
  percentual_adimplentes: number;
  percentual_inadimplentes: number;
  percentual_cancelados: number;
}
