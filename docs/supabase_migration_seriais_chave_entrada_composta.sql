-- Mesmo IRD pode ser cadastrado mais de uma vez se mudar tipo_origem da entrada e/ou NF (número + data).
-- Colunas de deduplicação são texto normalizado (índice único btree, sem expressão IMMUTABLE).

ALTER TABLE public.seriais
  ADD COLUMN IF NOT EXISTS entrada_tipo_origem text,
  ADD COLUMN IF NOT EXISTS entrada_numero_nota_fiscal text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS entrada_data_nota_fiscal text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.seriais.entrada_tipo_origem IS 'compra | reuso | retorno_tecnico | ajuste — da movimentação de entrada.';
COMMENT ON COLUMN public.seriais.entrada_numero_nota_fiscal IS 'Número da NF da entrada (string normalizada; vazio se não houver).';
COMMENT ON COLUMN public.seriais.entrada_data_nota_fiscal IS 'Data da NF da entrada como YYYY-MM-DD ou string vazia.';

UPDATE public.seriais s
SET
  entrada_tipo_origem = COALESCE(m.tipo_origem::text, 'compra'),
  entrada_numero_nota_fiscal = COALESCE(NULLIF(trim(m.numero_nota_fiscal), ''), ''),
  entrada_data_nota_fiscal = CASE
    WHEN m.data_nota_fiscal IS NOT NULL THEN to_char(m.data_nota_fiscal::date, 'YYYY-MM-DD')
    ELSE ''
  END
FROM public.movimentacoes m
WHERE s.movimentacao_entrada_id IS NOT NULL
  AND s.movimentacao_entrada_id = m.id;

UPDATE public.seriais
SET
  entrada_tipo_origem = 'compra',
  entrada_numero_nota_fiscal = '',
  entrada_data_nota_fiscal = ''
WHERE entrada_tipo_origem IS NULL;

ALTER TABLE public.seriais
  ALTER COLUMN entrada_tipo_origem SET DEFAULT 'compra';

ALTER TABLE public.seriais
  ALTER COLUMN entrada_tipo_origem SET NOT NULL;

ALTER TABLE public.seriais
  DROP CONSTRAINT IF EXISTS seriais_dono_user_id_numero_serial_key;

DROP INDEX IF EXISTS public.seriais_dono_serial_entrada_key;

CREATE UNIQUE INDEX seriais_dono_serial_entrada_key
  ON public.seriais (
    dono_user_id,
    numero_serial,
    entrada_tipo_origem,
    entrada_numero_nota_fiscal,
    entrada_data_nota_fiscal
  );
