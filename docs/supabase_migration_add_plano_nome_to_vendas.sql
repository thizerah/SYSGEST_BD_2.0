-- Adiciona colunas para exibir o nome dos planos nas vendas (denormalizado)
-- Aplicada via MCP Supabase - arquivo para referência

ALTER TABLE vendas_fibra
ADD COLUMN IF NOT EXISTS plano_fibra_nome text;

ALTER TABLE vendas_movel
ADD COLUMN IF NOT EXISTS plano_movel_nome text;
