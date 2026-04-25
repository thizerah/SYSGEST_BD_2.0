-- Auditar estorno de baixa de estoque (reabre a OS na conferência).
-- Execute no SQL Editor do Supabase (projeto SYSGEST) quando for implantar a funcionalidade.

CREATE TABLE IF NOT EXISTS public.estoque_estorno_conferencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dono_user_id uuid NOT NULL,
  -- `roteiro_os.id` no Supabase (Sysgest) é text, não uuid
  roteiro_os_id text NOT NULL REFERENCES public.roteiro_os (id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL,
  motivo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT estoque_estorno_conferencia_motivo_len CHECK (char_length(btrim(motivo)) >= 8)
);

CREATE INDEX IF NOT EXISTS idx_estoque_estorno_conferencia_dono_os
  ON public.estoque_estorno_conferencia (dono_user_id, roteiro_os_id);

CREATE INDEX IF NOT EXISTS idx_estoque_estorno_conferencia_created
  ON public.estoque_estorno_conferencia (dono_user_id, created_at DESC);

COMMENT ON TABLE public.estoque_estorno_conferencia IS
  'Cada estorno de baixa confirmada que recoloca a OS na fila de conferência; o motivo é obrigatório (mín. 8 caracteres).';

-- RLS: alinhe às políticas de `roteiro_os` / `movimentacoes` do seu projeto (ex.: por dono_user_id e auth).
-- Exemplo (ajuste o nome da tabela de perfis se for diferente):
-- ALTER TABLE public.estoque_estorno_conferencia ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "estoque_estorno_conferencia_rw_tenant" ON public.estoque_estorno_conferencia
--   FOR ALL TO authenticated
--   USING (dono_user_id = (SELECT up.dono_user_id FROM public.user_profiles up WHERE up.id = auth.uid()))
--   WITH CHECK (dono_user_id = (SELECT up.dono_user_id FROM public.user_profiles up WHERE up.id = auth.uid()));
