-- Adiciona id_vendedor (código SKY ou outro) na tabela equipe
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS id_vendedor text;

-- Adiciona id_vendedor nas tabelas de vendas comerciais
ALTER TABLE vendas_fibra ADD COLUMN IF NOT EXISTS id_vendedor text;
ALTER TABLE vendas_movel ADD COLUMN IF NOT EXISTS id_vendedor text;
ALTER TABLE vendas_nova_parabolica ADD COLUMN IF NOT EXISTS id_vendedor text;
