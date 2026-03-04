// Service Order data structure
export interface ServiceOrder {
  codigo_os: string;
  codigo_item?: string; // Código do item específico da OS (para OSs com múltiplos itens)
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
  telefone_celular?: string | null; // Telefone celular do cliente
  
  // Calculated fields
  tempo_atendimento?: number | null;
  atingiu_meta?: boolean;
  include_in_metrics?: boolean; // Indica se deve ser incluído nas métricas de tempo e reabertura
  
  // Materiais utilizados na ordem de serviço
  materiais?: MaterialUtilizado[];
}

// Interface para materiais utilizados
export interface MaterialUtilizado {
  nome: string;
  quantidade: number;
}

// Lista de materiais padrão que sempre devem aparecer
export const MATERIAIS_PADRAO = [
  "ANTENA 150 CM C/ KIT FIXACAO",
  "ANTENA 75 CM",
  "ANTENA 90CM C/ KIT FIXACAO",
  "ANTENA DE 60 CM C/ KIT FIXACAO",
  "CABO COAXIAL RGC06 BOBINA 100METROS", 
  "CONECTOR F série-59 COMPRESSÃO",
  "LNBF SIMPLES ANTENA 45/60/90 CM",
  "LNBF DUPLO ANTENA 45/60/90 CM"
] as const;

// Lista completa de todos os materiais possíveis
export const TODOS_MATERIAIS = [
  "AMPLIFICADOR INTERMEDIARIO FAIXA LARGA",
  "AMPLIFICADOR TRONCO FAIXA LARGA",
  "ANTENA 150 CM C/ KIT FIXACAO",
  "ANTENA 75 CM",
  "ANTENA 90CM C/ KIT FIXACAO",
  "ANTENA DE 60 CM C/ KIT FIXACAO",
  "CABO AV STEREO 1,8M VM/AM/BR RCA",
  "CABO COAXIAL RGC06 BOBINA 100METROS",
  "CABO DE REDE INTERNO",
  "CABO DROP PRE-CON OPTITAP 150M PRETO",
  "CABO HDMI 1,8M",
  "CABO mini-DIN",
  "CHAVE 2X4",
  "CHAVE COMUTADORA 20 DB",
  "CHAVE COMUTADORA 3 X 4",
  "CHAVE COMUTADORA FAIXA LARGA 00DB",
  "CHAVE COMUTADORA FAIXA LARGA 10DB",
  "CONECTOR F série-59 COMPRESSÃO",
  "CONTROLE REMOTO HD",
  "CONTROLE REMOTO HD ZAPPER UL1 C/ CAIXA",
  "CONTROLE REMOTO REUSO E RECICLAGEM DIGIT",
  "CONTROLE REMOTO REUSO E RECICLAGEM PLUS",
  "CONTROLE REMOTO REUSO E RECICLAGEM ZAPPER",
  "CONTROLE REMOTO ZAPPER",
  "Controle Remoto HD Plus URLR1 C/Caixa",
  "Controle Remoto Media Center",
  "KIT 20M ENGATE RAPIDO",
  "KIT CABO 20 METROS",
  "KIT CONTROLE REMOTO AT - HD",
  "KIT CONTROLE REMOTO HD ZAPPER",
  "KIT DE FIXACAO ANTENA",
  "KIT NOVO CLIENTE S14",
  "LNB DUPLO ANTENA 150CM",
  "LNB SIMPLES ANTENA 150CM",
  "LNBF DUPLO ANTENA 45/60/90 CM",
  "LNBF SIMPLES ANTENA 45/60/90 CM",
  "MISTURADOR MCA 16 B TELEVOX",
  "POWER INSERT SWM 21V",
  "ROLDANA PLASTICA RP-2"
] as const;

// Informações da última importação comercial
export interface LastImportInfo {
  data: string; // ISO date string
  tipo: 'comercial' | 'servicos' | 'servicos-base';
  novasVendasPermanencia: number;
  novasVendasMeta: number;
  vendasMetaAtualizadasSoData: number;
  vendasMetaComMudancaStatus: number;
  statusChangesDetails: { proposta: string; de: string; para: string }[];
  novasMetas: number;
  totalProcessado: number;
  // Agrupamento de vendas por produto
  vendasPermanenciaAgrupadas?: { produto: string; count: number }[];
  vendasMetaAgrupadas?: { produto: string; count: number }[];
}

// User authentication model
export interface User {
  id: string;
  username: string;
  name: string;
  email: string; // Email do usuário
  role: 'admin' | 'user';
  empresa: string; // Nome da empresa do usuário
  data_adesao?: string; // Data de pagamento no formato ISO
  acesso_liberado: boolean; // Status de acesso do usuário
  sessionId?: string;
  password?: string;
}

// Service time goals by service type
export const SERVICE_TIME_GOALS: Record<string, number> = {
  'Ponto Principal TV': 62.983333, // 62h 59min
  'Ponto Principal Fibra': 62.983333, // 62h 59min
  'Ponto Principal': 62.983333, // 62h 59min
  'Ponto Principal BL': 62.983333, // 62h 59min
  'Assistência Técnica Fibra': 38.983333, // 38h 59min
  'Assistência Técnica TV': 38.983333, // 38h 59min
  'Corretiva': 38.983333, // 38h 59min (Assistência Técnica TV)
  'Corretiva BL': 38.983333, // 38h 59min (Assistência Técnica FIBRA)
  'Preventiva BL': 48, // Mantendo valor original
  'Prestação de Serviço': 48, // Mantendo valor original
  'Prestação de Serviço BL': 48, // Mantendo valor original
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
  cidade?: string;           // Cidade do cliente
  bairro?: string;           // Bairro do cliente
  // Campos opcionais para produtos diferenciais (compatibilidade)
  produtos_secundarios?: string;
  forma_pagamento?: string;
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

// Interface para dados de metas mensais por categoria (metas da empresa)
export interface Meta {
  id?: string;
  mes: number; // 1-12
  ano: number; // YYYY
  pos_pago: number;
  flex_conforto: number;
  nova_parabolica: number;
  total: number;
  fibra: number;
  seguros_pos: number;
  seguros_fibra: number;
  sky_mais: number;
  /** Meta de vendas de plano de celular */
  movel?: number;
  data_criacao?: string;
  data_atualizacao?: string;
}

// Interface para acompanhamento por categoria de meta
export interface MetaCategoria {
  categoria: string;
  meta_definida: number;
  vendas_realizadas: number;
  percentual_atingido: number;
}

// Interface para métricas consolidadas de metas
export interface MetaMetrics {
  mes: number;
  ano: number;
  categorias: MetaCategoria[];
  total_meta: number;
  total_vendas: number;
  percentual_geral: number;
  dias_restantes: number;
  projecao_final: number;
  media_diaria_atual: number;
  media_diaria_necessaria: number;
  status: 'em_dia' | 'atrasado' | 'atingido' | 'superado';
  cartao_credito_pos_pago: number;
}

// Interface para vendas do mês atual (específica para metas)
export interface VendaMeta {
  numero_proposta: string;
  valor: number;
  data_venda: string;
  vendedor: string;
  nome_proprietario: string; // Nome do vendedor (igual Venda)
  categoria: string;
  produto: string;
  produtos_secundarios?: string;
  cidade?: string;
  forma_pagamento?: string;
  cpf?: string;
  nome_fantasia?: string;
  telefone_celular?: string;
  bairro?: string;
  mes: number;
  ano: number;
  /** Status da Proposta (qualquer texto: Aguardando, Habilitado, etc.) */
  status_proposta?: string;
}

/** Plano FIBRA (catálogo admin) */
export interface PlanoFibra {
  id: string;
  user_id: string;
  nome: string;
  velocidade?: number;
  preco_mensal?: number;
  descricao?: string;
  beneficios?: string;
  ativo: boolean;
}

/** Plano MÓVEL (catálogo admin) */
export interface PlanoMovel {
  id: string;
  user_id: string;
  nome: string;
  descricao?: string;
  dados_gb?: number;
  minutos?: number;
  sms?: string;
  preco_mensal?: number;
  beneficios?: string;
  ativo: boolean;
}

/** Venda FIBRA (cadastro vendedor) */
export interface VendaFibra {
  id?: string;
  user_id: string;
  nome_completo: string;
  cpf_cnpj: string;
  data_nascimento?: string;
  telefone: string;
  whatsapp?: string;
  email: string;
  cep: string;
  endereco?: string;
  numero: string;
  bairro?: string;
  cidade?: string;
  vendedor?: string;
  data_cadastro?: string;
  status_proposta?: string;
  plano_fibra_id?: string;
}

/** Venda MÓVEL (cadastro vendedor) */
export interface VendaMovel {
  id?: string;
  user_id: string;
  nome_completo: string;
  cpf?: string;
  rg?: string;
  data_nascimento?: string;
  email: string;
  telefone: string;
  whatsapp?: string;
  cep: string;
  endereco?: string;
  numero: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
  referencia?: string;
  dia_vencimento?: number;
  esim?: boolean;
  portabilidade?: boolean;
  vendedor?: string;
  data_cadastro?: string;
  status_proposta?: string;
  plano_movel_id?: string;
}

/** Venda Nova Parabólica (tabela vendas_nova_parabolica) */
export interface VendaNovaParabolica {
  id?: string;
  user_id: string;
  nome_proprietario?: string;
  cpf?: string;
  telefone_celular?: string;
  numero_proposta: string;
  valor: number;
  valor_recarga?: number;
  forma_pagamento?: string;
  cartao_condicao?: string;
  parcelas?: number;
  data_venda: string;
  cidade?: string;
  bairro?: string;
  vendedor?: string;
  status_proposta?: string;
}

export interface BaseData {
  mes: string;
  ano: number;
  base_tv: number;
  base_fibra: number;
  /** Aliança para Base TV (R$) */
  alianca: number;
  /** Aliança para Base Fibra (R$) - opcional, quando diferente da TV */
  alianca_fibra?: number;
}

export interface BaseMetrics {
  tv: {
    atual: number;
    tendencia: 'positiva' | 'negativa' | 'estavel';
    media3m: number;
    percentualTendencia: number;
    diferencaQuantidade: number;
  };
  fibra: {
    atual: number;
    tendencia: 'positiva' | 'negativa' | 'estavel';
    media3m: number;
    percentualTendencia: number;
    diferencaQuantidade: number;
  };
  alianca: {
    atual: number;
    tendencia: 'positiva' | 'negativa' | 'estavel';
    media3m: number;
    percentualTendencia: number;
    diferencaQuantidade: number;
  };
  // Informações sobre o período dos dados
  mesUtilizado: number;
  mesOriginal: number;
  usandoMesAnterior: boolean;
}

// ========================================
// CONTROLE DE ROTAS E ROTEIROS
// ========================================

// Status possíveis de uma OS na rota
export type StatusRotaOS = 
  | 'pendente'           // Importada, aguardando atribuição
  | 'atribuida'          // Atribuída a um técnico
  | 'em_andamento'       // Técnico chegou no local
  | 'pre_finalizada'     // Técnico pré-finalizou, aguardando confirmação
  | 'finalizada'         // Confirmada pela torre de controle
  | 'cancelada'          // Cancelada (cliente desistiu)
  | 'reagendada';        // Reagendada para outra data

// Dados do técnico
export interface TecnicoRota {
  id: string;
  nome: string;
  sigla?: string;
  telefone?: string;
  areasAtuacao?: string[]; // Bairros/cidades onde atua
}

// Registro de tempo (chegada/saída)
export interface RegistroTempo {
  chegada?: string; // ISO timestamp
  saida?: string;   // ISO timestamp
}

// Material utilizado na OS
export interface MaterialRota {
  nome: string;
  quantidade: number;
}

// Foto antes/depois
export interface FotoOS {
  tipo: 'antes' | 'depois';
  url: string;
  timestamp: string;
}

// Ordem de Serviço para Rota
export interface RotaOS {
  id: string;                        // ID único da OS na rota
  codigo_os: string;                 // Código da OS original
  codigo_cliente: string;
  nome_cliente: string;
  telefone?: string;
  telefone_comercial?: string;        // Telefone comercial
  telefone_residencial?: string;      // Telefone residencial
  endereco: string;
  complemento?: string;               // Complemento do endereço
  bairro: string;
  cidade: string;
  cep?: string;                      // CEP
  uf?: string;                       // Estado (UF)
  tipo_servico: string;
  subtipo_servico?: string;          // Sub-tipo de serviço
  motivo?: string;
  observacoes?: string;
  servico_cobrado?: boolean;         // Se o serviço é cobrado
  valor?: number;                   // Valor do serviço (se cobrado)
  servico_pago?: boolean;           // Se o serviço foi pago
  valor_pago?: number;               // Valor efetivamente pago (pode ser diferente do valor cobrado)
  forma_pagamento?: string;         // Forma de pagamento: "Dinheiro", "PIX", "CC"
  historico_tecnico?: string;       // Nome do técnico anterior (quando volta para pendentes)
  periodo?: string;                  // Período: "Manhã" ou "Tarde"
  prioridade?: string;              // Prioridade: "Alta" ou "Média"
  pacote?: string;                   // Pacote
  codigo_item?: string;              // Código do item
  acao_tomada?: string;              // Ação tomada
  sigla_tecnico?: string;            // Sigla do técnico
  reagendada?: boolean;              // Se foi reagendada
  historico_status?: StatusRotaOS;  // Último status antes de voltar para pendentes (finalizada, cancelada, reagendada)
  ordem_sequencia?: number;          // Ordem de execução da OS na rota (1, 2, 3...)
  
  // Dados da rota
  data_agendada: string;             // Data agendada (YYYY-MM-DD)
  tecnico_id?: string;               // ID do técnico atribuído
  tecnico_nome?: string;             // Nome do técnico
  status: StatusRotaOS;
  
  // Execução do serviço
  registro_tempo?: RegistroTempo;
  materiais_utilizados?: MaterialRota[];
  fotos?: FotoOS[];
  assinatura_cliente?: string;       // Base64 ou URL da assinatura
  observacoes_tecnico?: string;
  
  // Metadados
  data_importacao: string;           // Timestamp de quando foi importada
  data_atribuicao?: string;          // Timestamp de quando foi atribuída
  data_finalizacao?: string;         // Timestamp de quando foi finalizada
  user_id: string;                   // ID do usuário que importou
}

// Rota completa (agrupamento de OSs por técnico e data)
export interface Rota {
  id: string;
  tecnico_id: string;
  tecnico_nome: string;
  data: string;                      // YYYY-MM-DD
  os_ids: string[];                  // IDs das OSs nesta rota
  criada_em: string;                 // Timestamp
  criada_por: string;                // User ID
}

// Sugestão de técnico baseada em histórico
export interface SugestaoTecnico {
  tecnico_id: string;
  tecnico_nome: string;
  confianca: number;                 // 0-100 (baseado em quantas OSs na região)
  motivo: string;                    // Ex: "Atendeu 15 OSs no bairro Centro"
}
