-- Vínculo permanente com a movimentação de entrada do serial + última movimentação em movimentacao_id.
-- Execute no SQL Editor do Supabase (projeto SYSGEST).

ALTER TABLE public.seriais
  ADD COLUMN IF NOT EXISTS movimentacao_entrada_id uuid REFERENCES public.movimentacoes (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.seriais.movimentacao_entrada_id IS 'Movimentação de entrada que criou o serial; não é sobrescrita em transferências.';
COMMENT ON COLUMN public.seriais.movimentacao_id IS 'Última movimentação associada ao serial (entrada, transferência, etc.).';

-- Dados já existentes: copia o vínculo atual como "entrada" quando ainda não preenchido.
UPDATE public.seriais
SET movimentacao_entrada_id = movimentacao_id
WHERE movimentacao_entrada_id IS NULL
  AND movimentacao_id IS NOT NULL;
