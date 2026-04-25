-- Limpeza: movimentações + estoque + duplicatas em locais (mantém materiais).
-- Use no SQL Editor do Supabase após backup se necessário.
-- Ordem: primeiro tabelas que referenciam locais, depois apagar locais duplicados.
--
-- Se o DELETE dos locais duplicados falhar por FK (ex.: public.seriais.local_id),
-- esvazie ou realoque seriais antes: DELETE FROM public.seriais; ou UPDATE para o local canônico.

-- 0) Opcional: esvaziar seriais neste ambiente de teste
-- DELETE FROM public.seriais;

-- 1) Movimentações e estoque (referenciam locais / materiais)
DELETE FROM public.movimentacoes;
DELETE FROM public.estoque;

-- 2) Local técnico: manter só o registro mais antigo por (dono_user_id, equipe_id)
DELETE FROM public.locais a
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY dono_user_id, equipe_id
        ORDER BY created_at ASC NULLS LAST, id ASC
      ) AS rn
    FROM public.locais
    WHERE tipo = 'tecnico' AND equipe_id IS NOT NULL
  ) t
  WHERE t.rn > 1
) d
WHERE a.id = d.id;

-- 3) Local empresa: manter só o mais antigo por dono (evita vários “centrais”)
DELETE FROM public.locais a
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY dono_user_id
        ORDER BY created_at ASC NULLS LAST, id ASC
      ) AS rn
    FROM public.locais
    WHERE tipo = 'empresa'
  ) t
  WHERE t.rn > 1
) d
WHERE a.id = d.id;

-- 4) Índices únicos (impedem novas duplicatas; só rodam se não houver violação)
CREATE UNIQUE INDEX IF NOT EXISTS locais_dono_equipe_tecnico_unique
  ON public.locais (dono_user_id, equipe_id)
  WHERE tipo = 'tecnico' AND equipe_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS locais_dono_empresa_unique
  ON public.locais (dono_user_id)
  WHERE tipo = 'empresa';
