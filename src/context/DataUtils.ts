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
  "Prestação de Serviço BL"
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
  "Executado"
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
export const getServiceGoalBySubtype = (subtypeService: string = ""): number => {
  const standardizedCategory = standardizeServiceCategory(subtypeService);
  
  switch (standardizedCategory) {
    case "Ponto Principal TV":
      return 48; // Meta de 48 horas
    case "Ponto Principal FIBRA":
      return 48; // Meta de 48 horas
    case "Assistência Técnica FIBRA":
      return 24; // Meta de 24 horas
    case "Assistência Técnica TV":
      return 34; // Meta de 34 horas
    default:
      return 48; // Meta padrão caso não se encaixe em nenhuma categoria
  }
};

// Função para padronizar a categoria de serviço
export const standardizeServiceCategory = (typeService: string = ""): string => {
  const lowerType = typeService.toLowerCase();
  
  // Se Tipo de Servico inclui "ponto principal" E (inclui "bl" ou "fibra") → Ponto Principal FIBRA
  if (lowerType.includes("ponto principal") && (lowerType.includes("bl") || lowerType.includes("fibra"))) {
    return "Ponto Principal FIBRA";
  }
  
  // Se Tipo de Servico inclui "ponto principal" SEM "bl" ou "fibra" → Ponto Principal TV
  if (lowerType.includes("ponto principal") && !lowerType.includes("bl") && !lowerType.includes("fibra")) {
    return "Ponto Principal TV";
  }
  
  // Se Tipo de Servico inclui "corretiva bl", "prestação de serviço bl", "preventiva bl" ou "fibra" → Assistência Técnica FIBRA
  if (
    lowerType.includes("corretiva bl") || 
    lowerType.includes("prestação de serviço bl") || 
    lowerType.includes("preventiva bl") || 
    lowerType.includes("fibra")
  ) {
    return "Assistência Técnica FIBRA";
  }
  
  // Se Tipo de Servico inclui "corretiva" ou "prestação de serviço" (sem "bl" ou "fibra") → Assistência Técnica TV
  if (
    (lowerType.includes("corretiva") && !lowerType.includes("bl")) || 
    (lowerType.includes("prestação de serviço") && !lowerType.includes("bl"))
  ) {
    return "Assistência Técnica TV";
  }
  
  // Caso contrário → Categoria não identificada
  return "Categoria não identificada";
}; 