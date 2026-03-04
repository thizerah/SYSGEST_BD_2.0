/**
 * Máscaras para campos de formulário.
 */

/** CPF: XXX.XXX.XXX-XX (11 dígitos) */
export function formatarCPF(valor: string): string {
  const nums = valor.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
  if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
  return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
}

/** RG: XX.XXX.XXX-X (9 dígitos, formato comum) */
export function formatarRG(valor: string): string {
  const nums = valor.replace(/\D/g, '').slice(0, 9);
  if (nums.length <= 2) return nums;
  if (nums.length <= 5) return `${nums.slice(0, 2)}.${nums.slice(2)}`;
  if (nums.length <= 8) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5)}`;
  return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}-${nums.slice(8)}`;
}

/** Telefone/WhatsApp: (XX) XXXXX-XXXX (11 dígitos) ou (XX) XXXX-XXXX (10 dígitos) */
export function formatarTelefone(valor: string): string {
  const nums = valor.replace(/\D/g, '').slice(0, 11);
  if (!nums) return '';
  if (nums.length <= 2) return `(${nums}`;
  if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  if (nums.length === 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
}
