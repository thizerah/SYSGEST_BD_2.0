-- Tabela vendas_nova_parabolica (Cadastro Comercial Nova Parabólica)
-- Já aplicada via MCP Supabase - arquivo para referência

CREATE TABLE IF NOT EXISTS vendas_nova_parabolica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  nome_proprietario text,
  cpf text,
  telefone_celular text,
  numero_proposta text NOT NULL,
  valor numeric(10,2) NOT NULL,
  valor_recarga numeric(10,2),
  forma_pagamento text,
  cartao_condicao text,
  parcelas integer,
  data_venda date NOT NULL,
  cidade text,
  bairro text,
  vendedor text,
  status_proposta text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
