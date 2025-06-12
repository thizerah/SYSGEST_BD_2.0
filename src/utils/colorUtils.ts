/**
 * Utilitários para coloração baseada em valores e status
 * Consolidação de todas as funções de cores espalhadas pelo projeto
 */

// Tipo para definir thresholds de cor
export interface ColorThreshold {
  readonly min: number;
  readonly max: number;
  readonly color: string;
}

/**
 * Obtém cor baseada em valor e configuração de thresholds
 * @param value - Valor numérico para avaliar
 * @param thresholds - Array de configurações de threshold
 * @param defaultColor - Cor padrão se não encontrar match
 * @returns Classe CSS de cor
 */
export const getColorByValue = (
  value: number, 
  thresholds: readonly ColorThreshold[], 
  defaultColor = "text-gray-500"
): string => {
  for (const threshold of thresholds) {
    if (value >= threshold.min && value < threshold.max) {
      return threshold.color;
    }
  }
  return defaultColor;
};

/**
 * Obtém cor específica para Ponto Principal FIBRA
 * @param rate - Taxa de reabertura em percentual
 * @returns Classe CSS de cor
 */
export const getPontoPrincipalFibraColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 5, color: "text-green-600" },
    { min: 5, max: 10, color: "text-yellow-600" },
    { min: 10, max: 100, color: "text-red-600" }
  ]);
};

/**
 * Obtém cor específica para Ponto Principal TV
 * @param rate - Taxa de reabertura em percentual
 * @returns Classe CSS de cor
 */
export const getPontoPrincipalTVColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 2, color: "text-green-600" },
    { min: 2, max: 5, color: "text-yellow-600" },
    { min: 5, max: 100, color: "text-red-600" }
  ]);
};

/**
 * Obtém cor específica para Corretiva (Assistência Técnica TV)
 * @param rate - Taxa de reabertura em percentual
 * @returns Classe CSS de cor
 */
export const getCorretivaColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 3.5, color: "text-green-600" },
    { min: 3.5, max: 10.5, color: "text-yellow-600" },
    { min: 10.5, max: 100, color: "text-red-600" }
  ]);
};

/**
 * Obtém cor específica para Corretiva BL (Assistência Técnica FIBRA)
 * @param rate - Taxa de reabertura em percentual
 * @returns Classe CSS de cor
 */
export const getCorretivaBLColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 8, color: "text-green-600" },
    { min: 8, max: 16, color: "text-yellow-600" },
    { min: 16, max: 100, color: "text-red-600" }
  ]);
};

/**
 * Obtém cor para taxa de reabertura baseada no tipo de serviço
 * @param serviceType - Tipo de serviço
 * @param rate - Taxa de reabertura em percentual
 * @returns Classe CSS de cor
 */
export const getReopeningColorByServiceType = (serviceType: string, rate: number): string => {
  // Normalizar o tipo de serviço
  const normalizedType = serviceType.toLowerCase().trim();
  
  // Mapeamento dos tipos de serviço para suas funções de coloração
  if (normalizedType.includes('ponto principal') && normalizedType.includes('fibra')) {
    return getPontoPrincipalFibraColor(rate);
  }
  
  if (normalizedType.includes('ponto principal') && normalizedType.includes('bl')) {
    return getPontoPrincipalFibraColor(rate);
  }
  
  if (normalizedType.includes('ponto principal')) {
    return getPontoPrincipalTVColor(rate);
  }
  
  if (normalizedType.includes('corretiva') && normalizedType.includes('bl')) {
    return getCorretivaBLColor(rate);
  }
  
  if (normalizedType.includes('corretiva')) {
    return getCorretivaColor(rate);
  }
  
  // Para tipos não mapeados, usar coloração padrão de reabertura
  return getColorByValue(rate, [
    { min: 0, max: 5, color: "text-green-600" },
    { min: 5, max: 10, color: "text-yellow-600" },
    { min: 10, max: 100, color: "text-red-600" }
  ]);
};

/**
 * Obtém cor para taxa geral de reabertura
 * @param rate - Taxa de reabertura em percentual
 * @returns Classe CSS de cor
 */
export const getReopeningAlertColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 5, color: "text-green-500" },
    { min: 5, max: 10, color: "text-yellow-500" },
    { min: 10, max: 100, color: "text-red-500" }
  ]);
};

/**
 * Obtém emoji de alerta baseado na taxa de reabertura
 * @param rate - Taxa de reabertura em percentual
 * @returns Emoji representando o nível de alerta
 */
export const getReopeningAlertEmoji = (rate: number): string => {
  if (rate < 5) return "🟢";
  if (rate < 10) return "🟡";
  return "🔴";
};

/**
 * Obtém cor específica para Assistência Técnica TV (Tempo de Atendimento)
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor
 */
export const getAssistenciaTVTimeColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 30, color: "text-red-600" },
    { min: 30, max: 75, color: "text-yellow-600" },
    { min: 75, max: 100, color: "text-green-600" }
  ]);
};

/**
 * Obtém cor específica para Assistência Técnica FIBRA (Tempo de Atendimento)
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor
 */
export const getAssistenciaFibraTimeColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 40, color: "text-red-600" },
    { min: 40, max: 85, color: "text-yellow-600" },
    { min: 85, max: 100, color: "text-green-600" }
  ]);
};

/**
 * Obtém cor específica para Ponto Principal TV (Tempo de Atendimento)
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor
 */
export const getPontoPrincipalTVTimeColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 75, color: "text-red-600" },
    { min: 75, max: 100, color: "text-green-600" }
  ]);
};

/**
 * Obtém cor específica para Ponto Principal FIBRA (Tempo de Atendimento)
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor
 */
export const getPontoPrincipalFibraTimeColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 75, color: "text-red-600" },
    { min: 75, max: 100, color: "text-green-600" }
  ]);
};

/**
 * Obtém cor de fundo da barra para Assistência Técnica TV (Tempo de Atendimento)
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor de fundo
 */
export const getAssistenciaTVTimeBackgroundColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 30, color: "bg-red-600/20" },
    { min: 30, max: 75, color: "bg-yellow-500/20" },
    { min: 75, max: 100, color: "bg-green-600/20" }
  ]);
};

/**
 * Obtém cor do indicador da barra para Assistência Técnica TV (Tempo de Atendimento)
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor do indicador
 */
export const getAssistenciaTVTimeIndicatorColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 30, color: "!bg-red-600" },
    { min: 30, max: 75, color: "!bg-yellow-500" },
    { min: 75, max: 100, color: "!bg-green-600" }
  ]);
};

/**
 * Obtém cor de fundo da barra para Assistência Técnica FIBRA (Tempo de Atendimento)
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor de fundo
 */
export const getAssistenciaFibraTimeBackgroundColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 40, color: "bg-red-600/20" },
    { min: 40, max: 85, color: "bg-yellow-500/20" },
    { min: 85, max: 100, color: "bg-green-600/20" }
  ]);
};

/**
 * Obtém cor do indicador da barra para Assistência Técnica FIBRA (Tempo de Atendimento)
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor do indicador
 */
export const getAssistenciaFibraTimeIndicatorColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 40, color: "!bg-red-600" },
    { min: 40, max: 85, color: "!bg-yellow-500" },
    { min: 85, max: 100, color: "!bg-green-600" }
  ]);
};

/**
 * Obtém cor de fundo da barra para Ponto Principal TV (Tempo de Atendimento)
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor de fundo
 */
export const getPontoPrincipalTVTimeBackgroundColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 75, color: "bg-red-600/20" },
    { min: 75, max: 100, color: "bg-green-600/20" }
  ]);
};

/**
 * Obtém cor do indicador da barra para Ponto Principal TV (Tempo de Atendimento)
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor do indicador
 */
export const getPontoPrincipalTVTimeIndicatorColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 75, color: "!bg-red-600" },
    { min: 75, max: 100, color: "!bg-green-600" }
  ]);
};

/**
 * Obtém cor de fundo da barra para Ponto Principal FIBRA (Tempo de Atendimento)
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor de fundo
 */
export const getPontoPrincipalFibraTimeBackgroundColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 75, color: "bg-red-600/20" },
    { min: 75, max: 100, color: "bg-green-600/20" }
  ]);
};

/**
 * Obtém cor do indicador da barra para Ponto Principal FIBRA (Tempo de Atendimento)
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor do indicador
 */
export const getPontoPrincipalFibraTimeIndicatorColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 75, color: "!bg-red-600" },
    { min: 75, max: 100, color: "!bg-green-600" }
  ]);
};

/**
 * Obtém cor para tempo de atendimento baseada no tipo de serviço
 * @param serviceType - Tipo de serviço
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor
 */
export const getTimeAttendanceColorByServiceType = (serviceType: string, rate: number): string => {
  // Normalizar o tipo de serviço
  const normalizedType = serviceType.toLowerCase().trim();
  
  // Mapeamento dos tipos de serviço para suas funções de coloração de tempo
  if (normalizedType.includes('assistência técnica') && normalizedType.includes('tv')) {
    return getAssistenciaTVTimeColor(rate);
  }
  
  if (normalizedType.includes('assistência técnica') && normalizedType.includes('fibra')) {
    return getAssistenciaFibraTimeColor(rate);
  }
  
  if (normalizedType.includes('ponto principal') && normalizedType.includes('tv')) {
    return getPontoPrincipalTVTimeColor(rate);
  }
  
  if (normalizedType.includes('ponto principal') && normalizedType.includes('fibra')) {
    return getPontoPrincipalFibraTimeColor(rate);
  }
  
  // Para tipos não mapeados, usar coloração padrão
  return getColorByValue(rate, [
    { min: 0, max: 50, color: "text-red-600" },
    { min: 50, max: 80, color: "text-yellow-600" },
    { min: 80, max: 100, color: "text-green-600" }
  ]);
};

/**
 * Obtém cor de fundo da barra para tempo de atendimento baseada no tipo de serviço
 * @param serviceType - Tipo de serviço
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor de fundo
 */
export const getTimeAttendanceBackgroundColorByServiceType = (serviceType: string, rate: number): string => {
  // Normalizar o tipo de serviço
  const normalizedType = serviceType.toLowerCase().trim();
  
  // Mapeamento dos tipos de serviço para suas funções de coloração de fundo
  if (normalizedType.includes('assistência técnica') && normalizedType.includes('tv')) {
    return getAssistenciaTVTimeBackgroundColor(rate);
  }
  
  if (normalizedType.includes('assistência técnica') && normalizedType.includes('fibra')) {
    return getAssistenciaFibraTimeBackgroundColor(rate);
  }
  
  if (normalizedType.includes('ponto principal') && normalizedType.includes('tv')) {
    return getPontoPrincipalTVTimeBackgroundColor(rate);
  }
  
  if (normalizedType.includes('ponto principal') && normalizedType.includes('fibra')) {
    return getPontoPrincipalFibraTimeBackgroundColor(rate);
  }
  
  // Para tipos não mapeados, usar coloração padrão
  return getColorByValue(rate, [
    { min: 0, max: 50, color: "bg-red-600/20" },
    { min: 50, max: 80, color: "bg-yellow-500/20" },
    { min: 80, max: 100, color: "bg-green-600/20" }
  ]);
};

/**
 * Obtém cor do indicador da barra para tempo de atendimento baseada no tipo de serviço
 * @param serviceType - Tipo de serviço
 * @param rate - Taxa de atendimento dentro da meta em percentual
 * @returns Classe CSS de cor do indicador
 */
export const getTimeAttendanceIndicatorColorByServiceType = (serviceType: string, rate: number): string => {
  // Normalizar o tipo de serviço
  const normalizedType = serviceType.toLowerCase().trim();
  
  // Mapeamento dos tipos de serviço para suas funções de coloração do indicador
  if (normalizedType.includes('assistência técnica') && normalizedType.includes('tv')) {
    return getAssistenciaTVTimeIndicatorColor(rate);
  }
  
  if (normalizedType.includes('assistência técnica') && normalizedType.includes('fibra')) {
    return getAssistenciaFibraTimeIndicatorColor(rate);
  }
  
  if (normalizedType.includes('ponto principal') && normalizedType.includes('tv')) {
    return getPontoPrincipalTVTimeIndicatorColor(rate);
  }
  
  if (normalizedType.includes('ponto principal') && normalizedType.includes('fibra')) {
    return getPontoPrincipalFibraTimeIndicatorColor(rate);
  }
  
  // Para tipos não mapeados, usar coloração padrão
  return getColorByValue(rate, [
    { min: 0, max: 50, color: "!bg-red-600" },
    { min: 50, max: 80, color: "!bg-yellow-500" },
    { min: 80, max: 100, color: "!bg-green-600" }
  ]);
};

/**
 * Cria configuração de cor customizada
 * @param ranges - Array de ranges com cores
 * @returns Função que retorna cor baseada no valor
 */
export const createColorFunction = (ranges: readonly ColorThreshold[]) => {
  return (value: number) => getColorByValue(value, ranges);
}; 