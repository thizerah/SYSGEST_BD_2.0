-- Novos campos para vendas_movel (Cadastro Comercial MÓVEL)
-- Execute no SQL Editor do Supabase

ALTER TABLE vendas_movel
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS dia_vencimento integer,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS esim boolean,
  ADD COLUMN IF NOT EXISTS portabilidade boolean;
