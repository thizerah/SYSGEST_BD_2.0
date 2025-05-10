// Arquivo de utilitários e constantes para o contexto de dados

// Mapa de normalização de nomes de cidades
export const CITY_NAME_MAP: Record<string, string> = {
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
};

// Mapa de normalização de nomes de bairros
export const NEIGHBORHOOD_NAME_MAP: Record<string, string> = {
  "centro": "Centro",
  "miguel couto": "Miguel Couto",
  "comendador soares": "Comendador Soares",
  "austin": "Austin",
  "cabucu": "Cabuçu",
  "cabuçu": "Cabuçu",
};

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
];

// Lista completa de subtipos válidos para contabilização (inclui todos os tipos de serviço)
export const ALL_VALID_SUBTYPES = [
  ...VALID_SUBTYPES,
  "Preventiva",
  "Sistema Opcional"
];

// Status aceitos
export const VALID_STATUS = [
  "Finalizada", 
  "Finalizado", 
  "Executada", 
  "Executado",
  "Cancelada"
];

// Motivos excluídos
export const EXCLUDED_REASONS = [
  "Ant Governo", 
  "Nova Parabólica"
];

// Função para normalizar nomes de cidades
export const normalizeCityName = (cityName: string = ""): string => {
  const normalizedName = cityName.toLowerCase().trim();
  return CITY_NAME_MAP[normalizedName] || cityName;
};

// Função para normalizar nomes de bairros
export const normalizeNeighborhoodName = (neighborhoodName: string = ""): string => {
  const normalizedName = neighborhoodName.toLowerCase().trim();
  return NEIGHBORHOOD_NAME_MAP[normalizedName] || neighborhoodName;
};

// Função para obter o tempo de meta de atendimento por subtipo de serviço
export const getServiceGoalBySubtype = (subtypeService: string = "", reason: string = ""): number => {
  const standardizedCategory = standardizeServiceCategory(subtypeService, reason);
  
  console.log(`[DEBUG] getServiceGoalBySubtype: Tipo "${subtypeService}", Categoria Padronizada: "${standardizedCategory}"`);
  
  switch (standardizedCategory) {
    case "Ponto Principal TV":
      return 48; // Meta de 48 horas
    case "Ponto Principal FIBRA":
      return 48; // Meta de 48 horas
    case "Assistência Técnica FIBRA":
      return 34; // Meta de 34 horas
    case "Assistência Técnica TV":
      return 34; // Meta de 34 horas
    default:
      return 48; // Meta padrão caso não se encaixe em nenhuma categoria
  }
};

// Função para padronizar a categoria de serviço
export const standardizeServiceCategory = (typeService: string = "", reason: string = ""): string => {
  const lowerType = typeService.toLowerCase().trim();
  const lowerReason = reason.toLowerCase().trim();
  
  let result = "";
  let ruleApplied = "";
  
  // Regras específicas baseadas no Tipo de Serviço e Motivo
  
  // Tipo de Serviço: Corretiva (Assistência Técnica TV)
  if (lowerType === "corretiva") {
    result = "Assistência Técnica TV";
    ruleApplied = "Regra 1: Corretiva (Assistência Técnica TV)";
  }
  
  // Tipo de Serviço: Corretiva BL (Assistência Técnica FIBRA)
  else if (lowerType === "corretiva bl") {
    result = "Assistência Técnica FIBRA";
    ruleApplied = "Regra 2: Corretiva BL (Assistência Técnica FIBRA)";
  }
  
  // Tipo de Serviço: Substituição com Motivo: Upgrade SKY 4K Plus
  else if (lowerType === "substituição" && lowerReason.includes("upgrade sky 4k plus")) {
    result = "Não classificado";
    ruleApplied = "Regra 2.1: Substituição para Upgrade SKY 4K Plus (não incluído nas métricas)";
  }
  
  // Tipo de Serviço: Ponto Principal → Motivo: Individual (caso específico)
  else if (lowerType === "ponto principal" && lowerReason === "individual") {
    result = "Ponto Principal TV";
    ruleApplied = "Regra 3: PP + Individual";
  }
  
  // Tipo de Serviço: Ponto Principal (todos os motivos)
  else if (lowerType === "ponto principal") {
    result = "Ponto Principal TV";
    ruleApplied = "Regra 3.1: PP (qualquer motivo)";
  }
  
  // Tipo de Serviço: Ponto Principal BL → Motivo: Instalacao Banda Larga Fibra (caso específico)
  else if (lowerType === "ponto principal bl" && lowerReason.includes("instalacao banda larga fibra")) {
    result = "Ponto Principal FIBRA";
    ruleApplied = "Regra 4: PP BL + Instalacao BL Fibra";
  }
  
  // Tipo de Serviço: Ponto Principal BL (todos os motivos)
  else if (lowerType === "ponto principal bl") {
    result = "Ponto Principal FIBRA";
    ruleApplied = "Regra 4.1: PP BL (qualquer motivo)";
  }
  
  // Condições de fallback para casos mais genéricos
  
  // Se Tipo de Servico inclui "ponto principal" mas não é exatamente "ponto principal" ou "ponto principal bl"
  // Com componente BL ou Fibra
  else if (lowerType.includes("ponto principal") && (lowerType.includes("bl") || lowerType.includes("fibra")) 
          && lowerType !== "ponto principal" && lowerType !== "ponto principal bl") {
    result = "Ponto Principal FIBRA";
    ruleApplied = "Regra 5: PP + (BL ou Fibra) - Outros casos";
  }
  
  // Sem componente BL ou Fibra
  else if (lowerType.includes("ponto principal") && !lowerType.includes("bl") && !lowerType.includes("fibra") 
          && lowerType !== "ponto principal") {
    result = "Ponto Principal TV";
    ruleApplied = "Regra 6: PP (sem BL/Fibra) - Outros casos";
  }
  
  // Outras regras para cobrir tipos não especificados diretamente
  else if (lowerType.includes("corretiva") && !lowerType.includes("bl") && lowerType !== "corretiva") {
    result = "Assistência Técnica TV";
    ruleApplied = "Regra 7: Corretiva genérica - Outros casos";
  }
  
  else if ((lowerType.includes("corretiva") && lowerType.includes("bl") && lowerType !== "corretiva bl") || lowerType.includes("fibra")) {
    result = "Assistência Técnica FIBRA";
    ruleApplied = "Regra 8: Corretiva BL/Fibra genérica - Outros casos";
  }
  
  // Regra para qualquer tipo de "Substituição" não coberto por regras anteriores
  else if (lowerType.includes("substituição")) {
    result = "Não classificado";
    ruleApplied = "Regra 9: Substituição (não incluído nas métricas)";
  }
  
  // Caso contrário → Categoria não identificada
  else {
    result = "Não classificado";
    ruleApplied = "Regra 10: Não atende aos critérios específicos";
  }
  
  console.log(`[DEBUG] Tipo: "${typeService}", Motivo: "${reason}" => ${result} (${ruleApplied})`);
  return result;
}; 