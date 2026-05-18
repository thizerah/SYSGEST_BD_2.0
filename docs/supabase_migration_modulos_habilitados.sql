-- Adiciona coluna de módulos habilitados por empresa na tabela de usuários.
-- NULL = sem restrição (empresa vê tudo).
-- Array preenchido = apenas os módulos listados ficam visíveis para o dono e seus subusuários.
ALTER TABLE users ADD COLUMN IF NOT EXISTS modulos_habilitados text[] DEFAULT NULL;
