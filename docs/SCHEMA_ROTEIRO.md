# Esquema: Roteiro (Supabase)

Tabelas do módulo de roteiro. Escopo por `dono_user_id` (aplicação). Ordem de criação: 1 → 2 → 3 → 4.

---

## 1. `roteiro_os`

OSs do roteiro. Base para Rota do Dia, Pendentes, Baixa de Pagamento, Controle de Saída.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| `id` | text | PK | ID único (ex.: `os_xxx`) |
| `dono_user_id` | uuid | NOT NULL, FK → auth.users | Dono da empresa |
| `codigo_os` | text | NOT NULL | Código da OS |
| `codigo_cliente` | text | | |
| `nome_cliente` | text | NOT NULL | |
| `endereco`, `complemento`, `bairro`, `cidade`, `cep`, `uf` | text | | Endereço |
| `telefone`, `telefone_comercial`, `telefone_residencial` | text | | |
| `tipo_servico`, `subtipo_servico`, `motivo`, `observacoes` | text | | |
| `servico_cobrado` | boolean | | |
| `valor`, `valor_pago` | numeric | | |
| `servico_pago` | boolean | | |
| `forma_pagamento` | text | | Ex.: Dinheiro, PIX, CC |
| `historico_tecnico`, `periodo`, `prioridade`, `pacote`, `codigo_item`, `acao_tomada`, `sigla_tecnico` | text | | |
| `reagendada` | boolean | | |
| `historico_status` | text | | Último status antes de pendentes |
| `ordem_sequencia` | integer | | Ordem na rota |
| `data_agendada` | date | NOT NULL | YYYY-MM-DD |
| `tecnico_id` | uuid | | equipe.id do técnico |
| `tecnico_nome` | text | | |
| `status` | text | NOT NULL | pendente, atribuida, em_andamento, … |
| `registro_tempo` | jsonb | | `{ chegada?, saida? }` |
| `materiais_utilizados` | jsonb | | `[{ nome, quantidade }]` |
| `fotos` | jsonb | | `[{ tipo, url, timestamp }]` |
| `assinatura_cliente`, `observacoes_tecnico` | text | | |
| `data_importacao` | timestamptz | NOT NULL | |
| `data_atribuicao`, `data_finalizacao` | timestamptz | | |
| `user_id` | uuid | NOT NULL, FK → auth.users | Quem importou |
| `created_at`, `updated_at` | timestamptz | default now() | |

Índices: `dono_user_id`, `tecnico_id`, `data_agendada`, `status`.

---

## 2. `rotas`

Agrupamento de OSs por técnico e data.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| `id` | text | PK | ID da rota |
| `dono_user_id` | uuid | NOT NULL, FK → auth.users | |
| `tecnico_id` | uuid | NOT NULL | equipe.id |
| `tecnico_nome` | text | NOT NULL | |
| `data` | date | NOT NULL | YYYY-MM-DD |
| `os_ids` | jsonb | NOT NULL, default '[]' | Array de `roteiro_os.id` |
| `criada_em` | timestamptz | NOT NULL | |
| `criada_por` | uuid | NOT NULL, FK → auth.users | |
| `created_at`, `updated_at` | timestamptz | default now() | |

Índices: `dono_user_id`, `tecnico_id`, `data`.

---

## 3. `medias_tempo_por_tipo`

Médias de tempo por tipo de serviço (para estimativas).

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| `id` | uuid | PK, default gen_random_uuid() | |
| `dono_user_id` | uuid | NOT NULL, FK → auth.users | |
| `tipo_servico` | text | NOT NULL | |
| `tempos` | jsonb | NOT NULL, default '[]' | Array de números (horas) |
| `ultima_atualizacao` | timestamptz | | |
| `created_at`, `updated_at` | timestamptz | default now() | |

UNIQUE (`dono_user_id`, `tipo_servico`).

---

## 4. `roteiro_historico_pagamento`

Histórico de alterações de baixa de pagamento por OS. Inclui `usuario_id` (quem fez a alteração).

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| `id` | uuid | PK, default gen_random_uuid() | |
| `roteiro_os_id` | text | NOT NULL, FK → roteiro_os(id) ON DELETE CASCADE | |
| `dono_user_id` | uuid | NOT NULL, FK → auth.users | |
| `usuario_id` | uuid | NOT NULL, FK → auth.users | Quem fez a alteração |
| `acao` | text | NOT NULL | Ex.: marcação recebido, alteração valor |
| `valor_anterior`, `valor_novo` | numeric | | |
| `forma_anterior`, `forma_nova` | text | | |
| `pago_anterior`, `pago_novo` | boolean | | |
| `observacao` | text | | |
| `created_at` | timestamptz | default now() | |

Índices: `roteiro_os_id`, `dono_user_id`.

---

## Migrations aplicadas

1. `create_roteiro_os`
2. `create_rotas`
3. `create_medias_tempo_por_tipo`
4. `create_roteiro_historico_pagamento`
