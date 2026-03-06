import type { InfoRecargaTipo } from '@/types';

/** Opções do campo Info recarga (Nova Parabólica) - para metas SKY: RECARGA_APARELHO_NOVO e RECARGA_SEM_APARELHO contam */
export const INFO_RECARGA_OPCOES: { value: InfoRecargaTipo; label: string }[] = [
  { value: 'RECARGA_ESTOQUE', label: 'Recarga de estoque (já feita – não conta meta)' },
  { value: 'RECARGA_APARELHO_NOVO', label: 'Recarga nova + aparelho novo' },
  { value: 'RECARGA_SEM_APARELHO', label: 'Somente recarga (sem venda de aparelho)' },
];
