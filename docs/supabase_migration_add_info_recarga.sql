-- Adiciona coluna info_recarga à tabela vendas_nova_parabolica
-- Valores permitidos: RECARGA_ESTOQUE, RECARGA_APARELHO_NOVO, RECARGA_SEM_APARELHO
-- Aplicada via MCP Supabase - arquivo para referência

ALTER TABLE vendas_nova_parabolica
ADD COLUMN IF NOT EXISTS info_recarga text
CHECK (info_recarga IS NULL OR info_recarga IN ('RECARGA_ESTOQUE', 'RECARGA_APARELHO_NOVO', 'RECARGA_SEM_APARELHO'));
