-- Adiciona campos de endereço à vendas_nova_parabolica (CEP, ViaCEP)
-- Aplicada via MCP Supabase - arquivo para referência

ALTER TABLE vendas_nova_parabolica ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE vendas_nova_parabolica ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE vendas_nova_parabolica ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE vendas_nova_parabolica ADD COLUMN IF NOT EXISTS estado text;
ALTER TABLE vendas_nova_parabolica ADD COLUMN IF NOT EXISTS complemento text;
ALTER TABLE vendas_nova_parabolica ADD COLUMN IF NOT EXISTS referencia text;
