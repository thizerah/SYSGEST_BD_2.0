/**
 * Constantes relacionadas a tipos de serviço, status e categorias
 * Centralização de todas as definições espalhadas pelo projeto
 */

// Lista de subtipos válidos para análise de tempo e reaberturas
export const VALID_SUBTYPES = [
  "Ponto Principal", 
  "Ponto Principal BL", 
  "Corretiva", 
  "Corretiva BL",
  "Preventiva BL", 
  "Prestação de Serviço", 
  "Prestação de Serviço BL",
  "Substituição"
] as const;

// Lista completa de subtipos válidos para contabilização (inclui todos os tipos de serviço)
export const ALL_VALID_SUBTYPES = [
  ...VALID_SUBTYPES,
  "Preventiva",
  "Sistema Opcional"
] as const;

// Status aceitos para ordens de serviço
export const VALID_STATUS = [
  "Finalizada", 
  "Finalizado", 
  "Executada", 
  "Executado",
  "Cancelada"
] as const;

// Motivos excluídos das análises
export const EXCLUDED_REASONS = [
  "Ant Governo", 
  "Nova Parabólica"
] as const;

// Tipos de serviço considerados como originais (para análise de reabertura)
export const ORIGINAL_SERVICE_TYPES = [
  "Ponto Principal", 
  "Ponto Principal BL", 
  "Corretiva", 
  "Corretiva BL"
] as const;

// Tipos de serviço requeridos para análise completa
export const REQUIRED_SERVICE_TYPES = [
  "Corretiva", 
  "Corretiva BL", 
  "Ponto Principal", 
  "Ponto Principal BL"
] as const;

// Metas de tempo por categoria de serviço (em horas)
export const SERVICE_TIME_GOALS = {
  'Ponto Principal TV': 48,
  'Ponto Principal FIBRA': 48,
  'Assistência Técnica FIBRA': 34,
  'Assistência Técnica TV': 34,
  'Ponto Principal': 48,
  'Ponto Principal BL': 48,
  'Corretiva': 34,
  'Corretiva BL': 34,
  'Preventiva BL': 48,
  'Prestação de Serviço': 48,
  'Prestação de Serviço BL': 48,
  'Substituição': 48,
  'default': 48 // Meta padrão para tipos desconhecidos
} as const;

// Categorias padronizadas de serviço
export const SERVICE_CATEGORIES = {
  PONTO_PRINCIPAL_TV: "Ponto Principal TV",
  PONTO_PRINCIPAL_FIBRA: "Ponto Principal FIBRA",
  ASSISTENCIA_TV: "Assistência Técnica TV",
  ASSISTENCIA_FIBRA: "Assistência Técnica FIBRA",
  NAO_CLASSIFICADO: "Não classificado"
} as const;

// Nomes dos meses em português
export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
] as const;

// Mapa de normalização de nomes de cidades
export const CITY_NAME_MAP = {
  "nova iguacu": "Nova Iguaçu",
  "nova iguaçu": "Nova Iguaçu",
  "sao joao de meriti": "São João de Meriti",
  "são joao de meriti": "São João de Meriti",
  "sao joão de meriti": "São João de Meriti",
  "são joão de meriti": "São João de Meriti",
  "rio de janeiro": "Rio de Janeiro",
  "nilopolis": "Nilópolis",
  "nilópolis": "Nilópolis",
  "belford roxo": "Belford Roxo",
  "duque de caxias": "Duque de Caxias",
  "mesquita": "Mesquita",
  "queimados": "Queimados",
  "itaguai": "Itaguaí",
  "itaguaí": "Itaguaí",
  "seropedica": "Seropédica",
  "seropédica": "Seropédica"
} as const;

// Mapa de normalização de nomes de bairros
export const NEIGHBORHOOD_NAME_MAP = {
  "centro": "Centro",
  "miguel couto": "Miguel Couto",
  "comendador soares": "Comendador Soares",
  "austin": "Austin",
  "cabucu": "Cabuçu",
  "cabuçu": "Cabuçu"
} as const;

// Tipos para garantir type safety
export type ValidSubtype = typeof VALID_SUBTYPES[number];
export type ValidStatus = typeof VALID_STATUS[number];
export type ServiceCategory = typeof SERVICE_CATEGORIES[keyof typeof SERVICE_CATEGORIES];
export type MonthName = typeof MONTH_NAMES[number]; 