/**
 * Utilitários para formatação e manipulação de datas
 * Consolidação de todas as funções de data espalhadas pelo projeto
 */

/**
 * Formata uma string de data para o formato brasileiro DD/MM/YYYY
 * @param dateString - String da data a ser formatada
 * @returns Data formatada ou "Data inválida" se não puder ser processada
 */
export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString || dateString.trim() === "") {
    return "Data inválida";
  }

  try {
    // Tentar diferentes formatos de data
    let date: Date;
    
    // Se já está no formato DD/MM/YYYY, retornar como está
    if (/^\d{2}\/\d{2}\/\d{4}/.test(dateString.trim())) {
      return dateString.trim().split(' ')[0]; // Remove horário se houver
    }
    
    // Se está no formato ISO (YYYY-MM-DD), converter
    if (dateString.includes('T') || dateString.includes('-')) {
      date = new Date(dateString);
    } else {
      // Tentar parsing direto
      date = new Date(dateString);
    }
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      return "Data inválida";
    }
    
    // Formatear para DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.warn(`Erro ao formatar data: ${dateString}`, error);
    return "Data inválida";
  }
};

/**
 * Formata data para processamento de Excel com validação de formato
 * @param dateStr - String da data do Excel
 * @param isFinalizacao - Se é data de finalização (permite valores vazios)
 * @returns Data formatada ou string vazia se inválida
 */
export const formatExcelDate = (dateStr: string | null | undefined, isFinalizacao = false): string => {
  // Se não houver data e for finalização, permitir vazio
  if (!dateStr || dateStr.toString().trim() === "") {
    if (isFinalizacao) {
      return ""; // Permitir vazio para data de finalização
    }
    throw new Error("Data de criação é obrigatória");
  }

  const dateString = dateStr.toString().trim();
  
  // Se já está no formato correto DD/MM/YYYY, validar e retornar
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateString)) {
    const parts = dateString.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
      return dateString.split(' ')[0]; // Remove horário se houver
    }
  }
  
  try {
    // Tentar converter usando Date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Data inválida: ${dateString}`);
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    throw new Error(`Erro ao processar data: ${dateString}`);
  }
};

/**
 * Converte valor do Excel (número serial ou string) para data formatada
 * @param dateValue - Valor da data vinda do Excel
 * @returns Data formatada ou null se inválida
 */
export const formatDateFromExcel = (dateValue: unknown): string | null => {
  if (!dateValue) return null;
  
  try {
    // Se for um número (data serial do Excel)
    if (typeof dateValue === 'number') {
      // Converter número serial do Excel para data
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    }
    
    // Se for string, usar formatação normal
    if (typeof dateValue === 'string') {
      return formatExcelDate(dateValue);
    }
    
    return null;
  } catch (error) {
    console.warn(`Erro ao converter data do Excel: ${dateValue}`, error);
    return null;
  }
};

/**
 * Verifica se uma data é válida
 * @param date - Objeto Date a ser verificado
 * @returns true se a data é válida
 */
export const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Converte string de data para objeto Date com validação
 * @param dateString - String da data
 * @returns Objeto Date válido ou throws error
 */
export const parseDate = (dateString: string): Date => {
  if (!dateString || dateString.trim() === "") {
    throw new Error("Data não pode estar vazia");
  }
  
  const date = new Date(dateString);
  if (!isValidDate(date)) {
    throw new Error(`Data inválida: ${dateString}`);
  }
  
  return date;
};

/**
 * Calcula a diferença em dias entre duas datas
 * @param startDate - Data inicial
 * @param endDate - Data final
 * @returns Número de dias de diferença
 */
export const daysBetween = (startDate: Date, endDate: Date): number => {
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

/**
 * Formata data para exibição com horário
 * @param dateString - String da data
 * @returns Data formatada com horário
 */
export const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (!isValidDate(date)) {
      return "Data inválida";
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.warn(`Erro ao formatar data e hora: ${dateString}`, error);
    return "Data inválida";
  }
}; 