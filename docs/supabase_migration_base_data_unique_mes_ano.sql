-- Aplicado no projeto Sysgest (Supabase): unicidade por usuário + mês + ano.
-- Antes: CONSTRAINT base_data_user_id_mes_key UNIQUE (user_id, mes) impedia o mesmo mês em anos diferentes.

ALTER TABLE public.base_data DROP CONSTRAINT IF EXISTS base_data_user_id_mes_key;

CREATE UNIQUE INDEX IF NOT EXISTS base_data_user_id_mes_ano_key
  ON public.base_data USING btree (user_id, mes, ano);
