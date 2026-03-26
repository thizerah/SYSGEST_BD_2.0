/** Status e regras de merge na importação de vendas_meta (planilha / Supabase). */

export const VENDAS_META_STATUS_CANCELADA = 'Cancelada';
export const VENDAS_META_STATUS_AGUARDANDO_HABILITACAO = 'Aguardando Habilitação';

export function normalizeStatusProposta(s: string | null | undefined): string {
  return (s ?? '').trim();
}

/** Se já estava cancelada manualmente, não permitir que a importação volte para Aguardando Habilitação no mesmo número de proposta. */
export function shouldPreserveCanceladaOnImport(
  existingStatus: string | null | undefined,
  incomingStatus: string | null | undefined
): boolean {
  return (
    normalizeStatusProposta(existingStatus) === VENDAS_META_STATUS_CANCELADA &&
    normalizeStatusProposta(incomingStatus) === VENDAS_META_STATUS_AGUARDANDO_HABILITACAO
  );
}

/** Status efetivo após importar por cima de um registro existente. */
export function resolveStatusPropostaOnMetaImport(
  existingStatus: string | null | undefined,
  incomingStatus: string | null | undefined
): string | null | undefined {
  if (shouldPreserveCanceladaOnImport(existingStatus, incomingStatus)) {
    return VENDAS_META_STATUS_CANCELADA;
  }
  return incomingStatus;
}
