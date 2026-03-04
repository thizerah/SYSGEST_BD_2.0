-- ============================================
-- Etapa 1: Cadastro Comercial (FIBRA, MÓVEL, Nova Parabólica)
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Inserir 3 novas permissões
INSERT INTO permissoes (codigo, nome) VALUES 
  ('cadastro_fibra', 'Cadastro FIBRA'),
  ('cadastro_movel', 'Cadastro MÓVEL'),
  ('cadastro_nova_parabolica', 'Cadastro Nova Parabólica')
ON CONFLICT (codigo) DO NOTHING;

-- 2. Tabela planos_fibra (admin gerencia)
CREATE TABLE IF NOT EXISTS planos_fibra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  nome text NOT NULL,
  velocidade integer,
  preco_mensal numeric(10,2),
  descricao text,
  beneficios text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Tabela planos_movel (admin gerencia)
CREATE TABLE IF NOT EXISTS planos_movel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  nome text NOT NULL,
  descricao text,
  dados_gb integer,
  minutos integer,
  sms text,
  preco_mensal numeric(10,2),
  beneficios text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Tabela vendas_fibra
CREATE TABLE IF NOT EXISTS vendas_fibra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  nome_completo text NOT NULL,
  cpf_cnpj text NOT NULL,
  data_nascimento date,
  telefone text NOT NULL,
  whatsapp text,
  email text NOT NULL,
  cep text NOT NULL,
  endereco text,
  numero text NOT NULL,
  bairro text,
  cidade text,
  vendedor text,
  data_cadastro timestamptz DEFAULT now(),
  status_proposta text,
  plano_fibra_id uuid REFERENCES planos_fibra(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Tabela vendas_movel
CREATE TABLE IF NOT EXISTS vendas_movel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  nome_completo text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL,
  cep text NOT NULL,
  endereco text,
  numero text NOT NULL,
  bairro text,
  cidade text,
  estado text,
  complemento text,
  referencia text,
  vendedor text,
  data_cadastro timestamptz DEFAULT now(),
  status_proposta text,
  plano_movel_id uuid REFERENCES planos_movel(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
