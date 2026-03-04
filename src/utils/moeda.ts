/**
 * Sanitiza o valor digitado: mantém apenas dígitos e opcionalmente , ou . com até 2 decimais.
 * Não formata - permite digitar "250" ou "250,5" livremente.
 * Ex.: "250" → "250" | "R$ 250,0" → "250,0"
 */
export function sanitizarPrecoInput(valor: string): string {
  if (!valor || valor.trim() === '') return '';
  const limpo = valor.replace(/[^\d,.]/g, '');
  const sep = limpo.includes(',') ? ',' : limpo.includes('.') ? '.' : null;
  let inteiros = '';
  let decimais = '';
  if (sep) {
    const partes = limpo.split(sep);
    inteiros = (partes[0] || '').replace(/\D/g, '');
    decimais = (partes[1] || '').replace(/\D/g, '').slice(0, 2);
    return decimais ? `${inteiros || '0'},${decimais}` : inteiros ? `${inteiros},` : '';
  }
  inteiros = limpo.replace(/\D/g, '');
  return inteiros;
}

/**
 * Formata para exibição (R$ X.XXX,XX). Usar no onBlur.
 * Ex.: "250" → "R$ 250,00" | "250,5" → "R$ 250,50"
 */
export function formatarPrecoParaExibicao(valor: string): string {
  if (!valor || valor.trim() === '') return '';
  const num = parsePrecoFormatado(valor);
  if (num === undefined) return valor; // mantém se não conseguir parsear
  return `R$ ${num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Converte valor formatado ou raw para número.
 * Ex.: "R$ 150,00" → 150 | "150" → 150 | "150,5" → 150.5
 */
export function parsePrecoFormatado(valorFormatado: string): number | undefined {
  if (!valorFormatado || valorFormatado.trim() === '') return undefined;
  const limpo = valorFormatado.replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? undefined : num;
}

/**
 * Extrai o valor editável do formato exibido (para onFocus).
 * Ex.: "R$ 250,00" → "250,00"
 */
export function precoFormatadoParaEdicao(valorFormatado: string): string {
  if (!valorFormatado || valorFormatado.trim() === '') return '';
  const num = parsePrecoFormatado(valorFormatado);
  if (num === undefined) return '';
  const str = num.toFixed(2);
  const [int, dec] = str.split('.');
  return `${int},${dec}`;
}
