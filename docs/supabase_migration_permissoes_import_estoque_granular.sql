-- Novas permissões: importação (subusuário) e estoque granular.
-- Compatible com idempotência (skip se codigo já existir).
INSERT INTO permissoes (codigo, nome)
SELECT x.c::text, x.n::text
FROM (
  VALUES
    ('importacao_dados', 'Importação de dados'),
    ('estoque_saldo', 'Estoque — Saldo'),
    ('estoque_entrada', 'Estoque — Entrada'),
    ('estoque_avanco', 'Estoque — Avanço de material'),
    ('estoque_material_tecnico', 'Estoque — Material do técnico'),
    ('estoque_historico', 'Estoque — Histórico de movimentações'),
    ('estoque_conferencia_os', 'Estoque — Conferência OS'),
    ('estoque_inventario', 'Estoque — Inventário'),
    ('estoque_otimizacao', 'Estoque — Otimização de material'),
    ('estoque_cadastros', 'Estoque — Cadastros')
) AS x(c, n)
WHERE NOT EXISTS (SELECT 1 FROM permissoes p WHERE p.codigo = x.c);
