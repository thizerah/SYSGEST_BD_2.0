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

// Configurações de cores padrão para diferentes tipos de métricas
export const COLOR_CONFIGS = {
  // Para métricas de reabertura (quanto menor, melhor)
  reopening: [
    { min: 0, max: 5, color: "text-green-500" },
    { min: 5, max: 10, color: "text-yellow-500" },
    { min: 10, max: 100, color: "text-red-500" }
  ],
  
  // Para métricas de meta/percentual (quanto maior, melhor)
  percentage: [
    { min: 0, max: 50, color: "text-red-600 font-medium" },
    { min: 50, max: 75, color: "text-yellow-600 font-medium" },
    { min: 75, max: 100, color: "text-green-600 font-medium" }
  ],
  
  // Para status de pagamento
  paymentStatus: {
    "Em dia": "text-green-600",
    "Vencendo": "text-yellow-600", 
    "Vencido": "text-red-600",
    "Suspenso": "text-gray-500"
  },
  
  // Para diferença de dias
  daysDifference: [
    { min: 0, max: 1, color: "text-green-600" },
    { min: 1, max: 3, color: "text-yellow-600" },
    { min: 3, max: 999, color: "text-red-600" }
  ]
} as const;

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
 * Obtém cor para taxa de reabertura (quanto menor, melhor)
 * @param rate - Taxa de reabertura em percentual
 * @returns Classe CSS de cor
 */
export const getReopeningAlertColor = (rate: number): string => {
  return getColorByValue(rate, COLOR_CONFIGS.reopening);
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
 * Obtém cor para métricas de meta/percentual (quanto maior, melhor)
 * @param rate - Taxa em percentual
 * @returns Classe CSS de cor
 */
export const getMetaColor = (rate: number): string => {
  return getColorByValue(rate, COLOR_CONFIGS.percentage);
};

/**
 * Obtém cor específica para Ponto Principal FIBRA
 * @param rate - Taxa em percentual
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
 * @param rate - Taxa em percentual
 * @returns Classe CSS de cor
 */
export const getPontoPrincipalTVColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 5, color: "text-green-600" },
    { min: 5, max: 10, color: "text-yellow-600" },
    { min: 10, max: 100, color: "text-red-600" }
  ]);
};

/**
 * Obtém cor específica para Assistência Técnica TV
 * @param rate - Taxa em percentual
 * @returns Classe CSS de cor
 */
export const getAssistenciaTVColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 8, color: "text-green-600" },
    { min: 8, max: 15, color: "text-yellow-600" },
    { min: 15, max: 100, color: "text-red-600" }
  ]);
};

/**
 * Obtém cor específica para Assistência Técnica FIBRA
 * @param rate - Taxa em percentual
 * @returns Classe CSS de cor
 */
export const getAssistenciaFibraColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 10, color: "text-green-600" },
    { min: 10, max: 20, color: "text-yellow-600" },
    { min: 20, max: 100, color: "text-red-600" }
  ]);
};

/**
 * Obtém cor para taxa total de reabertura
 * @param rate - Taxa em percentual
 * @returns Classe CSS de cor
 */
export const getTotalReopeningColor = (rate: number): string => {
  return getColorByValue(rate, [
    { min: 0, max: 7, color: "text-green-600" },
    { min: 7, max: 12, color: "text-yellow-600" },
    { min: 12, max: 100, color: "text-red-600" }
  ]);
};

/**
 * Obtém cor baseada em dias de diferença
 * @param days - Número de dias
 * @returns Classe CSS de cor
 */
export const getDaysColor = (days: number): string => {
  return getColorByValue(days, COLOR_CONFIGS.daysDifference);
};

/**
 * Obtém cor para status de pagamento
 * @param status - Status do pagamento
 * @returns Classe CSS de cor
 */
export const getStatusColor = (status: string): string => {
  return COLOR_CONFIGS.paymentStatus[status as keyof typeof COLOR_CONFIGS.paymentStatus] || "text-gray-500";
};

/**
 * Obtém cor para percentual de adimplência
 * @param percentual - Percentual de adimplência
 * @returns Classe CSS de cor
 */
export const getPercentualColor = (percentual: number): string => {
  if (percentual >= 80) return "text-green-600";
  if (percentual >= 60) return "text-yellow-600";
  return "text-red-600";
};

/**
 * Obtém cor para valor de face de vendas
 * @param valor - Valor das vendas
 * @param meta - Meta estabelecida
 * @returns Classe CSS de cor
 */
export const getValorDeFaceColor = (valor: number, meta: number): string => {
  const percentual = (valor / meta) * 100;
  if (percentual >= 100) return "text-green-500";
  if (percentual >= 80) return "text-yellow-500";
  return "text-red-500";
};

/**
 * Obtém cor para bônus baseado no valor
 * @param bonus - Valor do bônus
 * @returns Classe CSS de cor
 */
export const getBonusColor = (bonus: number): string => {
  if (bonus > 0) return "text-green-500";
  if (bonus === 0) return "text-gray-500";
  return "text-red-500";
};

/**
 * Cria configuração de cor customizada
 * @param ranges - Array de ranges com cores
 * @returns Função que retorna cor baseada no valor
 */
export const createColorFunction = (ranges: readonly ColorThreshold[]) => {
  return (value: number) => getColorByValue(value, ranges);
}; 