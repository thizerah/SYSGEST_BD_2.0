-- Adiciona campo data_venda para identificar o mês da venda
-- Aplicada via MCP Supabase - arquivo para referência

ALTER TABLE vendas_fibra ADD COLUMN IF NOT EXISTS data_venda date;
ALTER TABLE vendas_movel ADD COLUMN IF NOT EXISTS data_venda date;
