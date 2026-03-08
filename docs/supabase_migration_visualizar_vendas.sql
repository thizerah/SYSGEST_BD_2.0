-- ============================================
-- Permissões para o módulo "Visualizar Vendas"
-- Execute no SQL Editor do Supabase
-- ============================================

-- Inserir novas permissões
INSERT INTO permissoes (codigo, nome) VALUES
  ('visualizar_vendas', 'Visualizar Vendas'),
  ('visualizar_vendas_todas', 'Visualizar Vendas (todas)')
ON CONFLICT (codigo) DO NOTHING;
