/**
 * Regras de validação e configurações
 * Centralização de todas as regras espalhadas pelo projeto
 */

// Campos obrigatórios para ordens de serviço
export const REQUIRED_SERVICE_ORDER_FIELDS = [
  "Código OS", 
  "ID Técnico", 
  "Técnico", 
  "SGL", 
  "Tipo de serviço", 
  "Sub-Tipo de serviço", 
  "Motivo", 
  "Código Cliente", 
  "Cliente", 
  "Status", 
  "Criação", 
  "Finalização"
] as const;

// Tipos de arquivos válidos para upload
export const VALID_FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
  'application/vnd.ms-excel', 
  'text/csv'
] as const;

// Extensões de arquivo válidas (para verificação visual)
export const VALID_FILE_EXTENSIONS = [
  '.xlsx',
  '.xls', 
  '.csv'
] as const;

// Regras de validação de senha
export const PASSWORD_VALIDATION_RULES = {
  minLength: 6,
  requireLowercase: true,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: false
} as const;

// Regex para validação de email
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Regex para validação de CPF (formato: XXX.XXX.XXX-XX)
export const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

// Regex para validação de telefone brasileiro
export const PHONE_REGEX = /^(\(\d{2}\)\s?|\d{2}\s?)?\d{4,5}-?\d{4}$/;

// Limites de valores
export const VALIDATION_LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxRecords: 10000, // Máximo de registros por importação
  minServiceTime: 0, // Tempo mínimo de serviço em horas
  maxServiceTime: 720, // Tempo máximo de serviço em horas (30 dias)
  maxTextLength: 500, // Tamanho máximo para campos de texto
  minYear: 2020, // Ano mínimo para datas
  maxYear: new Date().getFullYear() + 1 // Ano máximo para datas
} as const;

// Configurações de paginação
export const PAGINATION_CONFIG = {
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 25, 50, 100],
  maxVisiblePages: 5
} as const;

// Configurações de toast/notificação
export const TOAST_CONFIG = {
  defaultDuration: 5000,
  errorDuration: 8000,
  successDuration: 3000,
  maxToasts: 5
} as const;

// Configurações de timeout
export const TIMEOUT_CONFIG = {
  fileUpload: 30000, // 30 segundos
  apiRequest: 10000, // 10 segundos
  sessionTimeout: 1800000 // 30 minutos
} as const;

// Status de validação possíveis
export const VALIDATION_STATUS = {
  VALID: 'valid',
  INVALID: 'invalid',
  WARNING: 'warning',
  PENDING: 'pending'
} as const;

// Tipos de erro de validação
export const VALIDATION_ERROR_TYPES = {
  REQUIRED_FIELD: 'required_field',
  INVALID_FORMAT: 'invalid_format',
  OUT_OF_RANGE: 'out_of_range',
  DUPLICATE_VALUE: 'duplicate_value',
  INVALID_DATE: 'invalid_date',
  FILE_TOO_LARGE: 'file_too_large',
  UNSUPPORTED_FILE: 'unsupported_file'
} as const;

// Mensagens de erro padrão
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Este campo é obrigatório',
  INVALID_EMAIL: 'Email inválido',
  INVALID_CPF: 'CPF inválido',
  INVALID_PHONE: 'Telefone inválido',
  INVALID_DATE: 'Data inválida',
  PASSWORD_TOO_SHORT: 'Senha deve ter pelo menos 6 caracteres',
  PASSWORD_MISSING_LOWER: 'Senha deve conter pelo menos uma letra minúscula',
  PASSWORD_MISSING_UPPER: 'Senha deve conter pelo menos uma letra maiúscula',
  PASSWORD_MISSING_NUMBER: 'Senha deve conter pelo menos um número',
  FILE_TOO_LARGE: 'Arquivo muito grande (máximo 10MB)',
  UNSUPPORTED_FILE_TYPE: 'Tipo de arquivo não suportado',
  DUPLICATE_RECORD: 'Registro duplicado encontrado',
  INVALID_TIME_RANGE: 'Tempo de atendimento fora do intervalo válido',
  FUTURE_DATE: 'Data não pode ser no futuro',
  PAST_DATE_LIMIT: 'Data muito antiga (anterior a 2020)'
} as const;

// Tipos para garantir type safety
export type RequiredField = typeof REQUIRED_SERVICE_ORDER_FIELDS[number];
export type ValidFileType = typeof VALID_FILE_TYPES[number];
export type ValidationStatus = typeof VALIDATION_STATUS[keyof typeof VALIDATION_STATUS];
export type ValidationErrorType = typeof VALIDATION_ERROR_TYPES[keyof typeof VALIDATION_ERROR_TYPES];
export type ErrorMessage = typeof ERROR_MESSAGES[keyof typeof ERROR_MESSAGES]; 