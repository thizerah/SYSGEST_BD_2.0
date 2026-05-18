-- Remove a permissão legada estoque_cadastros e vínculos (cadastro de material passou ao menu só-admin).
-- Idempotente: pode rodar várias vezes.

DELETE FROM usuario_permissoes
WHERE permissao_id IN (SELECT id FROM permissoes WHERE codigo = 'estoque_cadastros');

DELETE FROM permissoes WHERE codigo = 'estoque_cadastros';
