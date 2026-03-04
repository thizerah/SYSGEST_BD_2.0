/** Formata CEP (XXXXX-XXX) */
export function formatarCEP(cep: string): string {
  const apenasNumeros = cep.replace(/\D/g, '').slice(0, 8);
  if (apenasNumeros.length <= 5) return apenasNumeros;
  return `${apenasNumeros.slice(0, 5)}-${apenasNumeros.slice(5)}`;
}

export interface ViaCepResult {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

/** Busca endereço pelo CEP na API ViaCEP */
export async function buscarCEP(cep: string): Promise<ViaCepResult | null> {
  const apenasNumeros = cep.replace(/\D/g, '');
  if (apenasNumeros.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${apenasNumeros}/json/`);
  const data = (await response.json()) as ViaCepResult;
  if (data.erro) return null;
  return data;
}
