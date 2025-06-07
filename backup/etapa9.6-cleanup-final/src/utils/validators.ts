/**
 * Utilitários para validação de dados
 * Consolidação de todas as funções de validação espalhadas pelo projeto
 */

import { ServiceOrder } from '@/types';
import { 
  REQUIRED_SERVICE_ORDER_FIELDS, 
  VALID_FILE_TYPES,
  EMAIL_REGEX,
  PASSWORD_VALIDATION_RULES,
  ERROR_MESSAGES
} from '@/constants/validationRules';

// Re-exportar constantes para compatibilidade
export const REQUIRED_FIELDS = REQUIRED_SERVICE_ORDER_FIELDS;
export { VALID_FILE_TYPES };

/**
 * Valida se todos os campos obrigatórios estão presentes nos dados
 * @param data - Array de dados a serem validados
 * @param requiredFields - Lista de campos obrigatórios
 * @returns Objeto com resultado da validação e campos ausentes
 */
export const validateRequiredFields = (
  data: Record<string, unknown>[], 
  requiredFields: readonly string[]
): { isValid: boolean; missingFields: string[] } => {
  if (!data || data.length === 0) {
    return { isValid: false, missingFields: ['Nenhum dado encontrado'] };
  }

  const firstRow = data[0];
  const excelHeaders = Object.keys(firstRow);
  const missingFields: string[] = [];

  for (const requiredField of requiredFields) {
    if (!excelHeaders.includes(requiredField)) {
      // Tratamento especial para o campo "Finalização" com typo comum
      if (requiredField === "Finalização" && excelHeaders.includes("FInalização")) {
        continue;
      }
      
      // Se o campo ausente for Finalização, verificar se todas as ordens são canceladas
      if (requiredField === "Finalização") {
        const todasCanceladas = data.every(row => 
          String(row["Status"] || "").toUpperCase() === "CANCELADA"
        );
        
        if (todasCanceladas) {
          console.log("[Validator] Todas as ordens são canceladas. Campo 'Finalização' não será obrigatório.");
          continue;
        }
      }
      
      missingFields.push(requiredField);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Valida o tipo de arquivo para upload
 * @param file - Arquivo a ser validado
 * @returns true se o tipo é válido
 */
export const validateFileType = (file: File): boolean => {
  return VALID_FILE_TYPES.includes(file.type as typeof VALID_FILE_TYPES[number]);
};

/**
 * Valida uma ordem de serviço completa
 * @param order - Ordem de serviço a ser validada
 * @returns Objeto com resultado da validação e erros encontrados
 */
export const validateServiceOrder = (order: Partial<ServiceOrder>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validar campos obrigatórios básicos
  if (!order.codigo_os) {
    errors.push("Código OS é obrigatório");
  }

  if (!order.nome_tecnico) {
    errors.push("Nome do técnico é obrigatório");
  }

  if (!order.subtipo_servico) {
    errors.push("Subtipo de serviço é obrigatório");
  }

  if (!order.status) {
    errors.push("Status é obrigatório");
  }

  if (!order.data_criacao) {
    errors.push("Data de criação é obrigatória");
  }

  // Para ordens não canceladas, validar data de finalização
  if (order.status !== "Cancelada" && !order.data_finalizacao) {
    errors.push("Data de finalização é obrigatória para ordens não canceladas");
  }

  // Validar se datas são válidas quando presentes
  if (order.data_criacao) {
    try {
      const dataCriacao = new Date(order.data_criacao);
      if (isNaN(dataCriacao.getTime())) {
        errors.push("Data de criação inválida");
      }
    } catch {
      errors.push("Formato de data de criação inválido");
    }
  }

  if (order.data_finalizacao) {
    try {
      const dataFinalizacao = new Date(order.data_finalizacao);
      if (isNaN(dataFinalizacao.getTime())) {
        errors.push("Data de finalização inválida");
      }
      
      // Verificar se data de finalização é posterior à criação
      if (order.data_criacao) {
        const dataCriacao = new Date(order.data_criacao);
        if (dataFinalizacao < dataCriacao) {
          errors.push("Data de finalização deve ser posterior à data de criação");
        }
      }
    } catch {
      errors.push("Formato de data de finalização inválido");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Valida formato de email
 * @param email - Email a ser validado
 * @returns true se o email é válido
 */
export const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Valida senha com critérios mínimos
 * @param password - Senha a ser validada
 * @returns Objeto com resultado da validação e critérios não atendidos
 */
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < PASSWORD_VALIDATION_RULES.minLength) {
    errors.push(ERROR_MESSAGES.PASSWORD_TOO_SHORT);
  }

  if (PASSWORD_VALIDATION_RULES.requireLowercase && !/(?=.*[a-z])/.test(password)) {
    errors.push(ERROR_MESSAGES.PASSWORD_MISSING_LOWER);
  }

  if (PASSWORD_VALIDATION_RULES.requireUppercase && !/(?=.*[A-Z])/.test(password)) {
    errors.push(ERROR_MESSAGES.PASSWORD_MISSING_UPPER);
  }

  if (PASSWORD_VALIDATION_RULES.requireNumbers && !/(?=.*\d)/.test(password)) {
    errors.push(ERROR_MESSAGES.PASSWORD_MISSING_NUMBER);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Valida se um valor é um número válido
 * @param value - Valor a ser validado
 * @returns true se é um número válido
 */
export const validateNumber = (value: unknown): boolean => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

/**
 * Valida se uma string não está vazia
 * @param value - String a ser validada
 * @param fieldName - Nome do campo (para mensagem de erro)
 * @returns Objeto com resultado da validação
 */
export const validateNotEmpty = (value: string | null | undefined, fieldName: string): { isValid: boolean; error?: string } => {
  if (!value || value.trim() === "") {
    return {
      isValid: false,
      error: `${fieldName} não pode estar vazio`
    };
  }

  return { isValid: true };
};

/**
 * Valida se um array não está vazio
 * @param array - Array a ser validado
 * @param fieldName - Nome do campo (para mensagem de erro)
 * @returns Objeto com resultado da validação
 */
export const validateArrayNotEmpty = <T>(array: T[] | null | undefined, fieldName: string): { isValid: boolean; error?: string } => {
  if (!array || array.length === 0) {
    return {
      isValid: false,
      error: `${fieldName} não pode estar vazio`
    };
  }

  return { isValid: true };
};

/**
 * Valida múltiplos campos de uma só vez
 * @param validations - Array de funções de validação
 * @returns Objeto consolidado com todos os resultados
 */
export const validateMultiple = (validations: Array<() => { isValid: boolean; error?: string }>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  for (const validation of validations) {
    const result = validation();
    if (!result.isValid && result.error) {
      errors.push(result.error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Cria função de validação customizada
 * @param predicate - Função que retorna true se válido
 * @param errorMessage - Mensagem de erro se inválido
 * @returns Função de validação
 */
export const createValidator = <T>(predicate: (value: T) => boolean, errorMessage: string) => {
  return (value: T): { isValid: boolean; error?: string } => {
    if (predicate(value)) {
      return { isValid: true };
    }
    return { isValid: false, error: errorMessage };
  };
}; 