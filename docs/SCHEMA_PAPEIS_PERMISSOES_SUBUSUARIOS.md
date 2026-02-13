# Esquema: Papéis, Permissões e Subusuários

Documento para **revisão**. Nada será criado no Supabase até seu **ok**.

---

## 1. Visão geral

- **Dono = usuário (já existente):** quem está em `users` com `role` = `'user'` (ou admin que acessa a própria empresa) é o dono. Não criamos um “dono” à parte.
- **Um login por empresa:** cada usuário (dono) = uma empresa; subusuários vinculados a ele.
- **users** (existente): mantido como está. Admin e usuários (donos) continuam lá; `role` (admin | user), `empresa`, etc.
- **Subusuários:** criados pelo usuário/dono (email + senha no Supabase Auth). **Não** entram em `users`; ficam em `usuarios_empresa` + Auth.
- **Equipe:** uma tabela `equipe` (pessoas da empresa). Campos: Nome completo, ID do Usuário (quem cadastra preenche), Função.

---

## 2. Novas tabelas

### 2.1 `papeis` (catálogo de papéis)

| Coluna     | Tipo         | Restrições | Descrição                    |
|------------|--------------|------------|------------------------------|
| `id`       | uuid         | PK, default `gen_random_uuid()` | Identificador |
| `codigo`   | text         | NOT NULL, UNIQUE | Código interno               |
| `nome`     | text         | NOT NULL   | Nome exibido                 |
| `created_at` | timestamptz | default `now()` | |

**Seed:** apenas papéis de **subusuários**. Dono/usuário já existe em `users`; não há papel “dono” em `papeis`.

| codigo       | nome        |
|--------------|-------------|
| `tecnico`    | Técnico     |
| `vendedor`   | Vendedor    |
| `controlador`| Controlador |
| `estoquista` | Estoquista  |
| `backoffice` | Backoffice  |

---

### 2.2 `permissoes` (catálogo de permissões)

| Coluna     | Tipo         | Restrições | Descrição                    |
|------------|--------------|------------|------------------------------|
| `id`       | uuid         | PK, default `gen_random_uuid()` | Identificador |
| `codigo`   | text         | NOT NULL, UNIQUE | Código interno               |
| `nome`     | text         | NOT NULL   | Nome exibido                 |
| `created_at` | timestamptz | default `now()` | |

**Seed:**

| codigo             | nome                   |
|--------------------|------------------------|
| `tempos_otimizacao` | Tempos e otimização    |
| `reaberturas`      | Reaberturas            |
| `tecnicos`         | Técnicos               |
| `vendedores`       | Vendedores             |
| `vendas`           | Vendas                 |
| `indicadores`      | Indicadores            |
| `rotas`            | Rotas                  |

---

### 2.3 `equipe` (pessoas da empresa)

Escopo por **usuário/dono** (`dono_user_id`). Quem cadastra preenche o **ID do Usuário** ao vincular pessoa a um login.

| Coluna         | Tipo   | Restrições | Descrição |
|----------------|--------|------------|-----------|
| `id`           | uuid   | PK, default `gen_random_uuid()` | |
| `dono_user_id` | uuid   | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | Usuário/dono da empresa |
| `nome_completo`| text   | NOT NULL   | Nome completo |
| `user_id`      | uuid   | NULL, FK → `auth.users(id)` ON DELETE SET NULL | "ID do Usuário" – preenchido por quem cadastra |
| `funcao`       | text   | NOT NULL   | Ex.: Técnico, Vendedor, Backoffice, Controlador, Estoquista |
| `created_at`   | timestamptz | default `now()` | |
| `updated_at`   | timestamptz | default `now()` | |

---

### 2.4 `usuarios_empresa` (vínculo login ↔ usuário/dono + papel)

Apenas **subusuários**. O usuário/dono (em `users`) **não** tem linha aqui; ele já é o dono e acessa tudo da empresa.

- **Subusuário:** `user_id` = login do sub (Auth), `dono_user_id` = id do usuário/dono (em `users`), `papel_id` = papel, opcionalmente `equipe_id` quando for Técnico/Vendedor.

| Coluna         | Tipo   | Restrições | Descrição |
|----------------|--------|------------|-----------|
| `id`           | uuid   | PK, default `gen_random_uuid()` | |
| `user_id`      | uuid   | NOT NULL, UNIQUE, FK → `auth.users(id)` ON DELETE CASCADE | Quem faz login |
| `dono_user_id` | uuid   | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | Usuário/dono (escopo); mesmo `id` que em `users` |
| `papel_id`     | uuid   | NOT NULL, FK → `papeis(id)` | Papel do usuário |
| `equipe_id`    | uuid   | NULL, FK → `equipe(id)` ON DELETE SET NULL | Vínculo à pessoa da equipe (Técnico/Vendedor) |
| `ativo`        | boolean| NOT NULL, default `true` | Desativar no app; Auth disable é à parte |
| `created_at`   | timestamptz | default `now()` | |
| `updated_at`   | timestamptz | default `now()` | |

**Índices sugeridos:** `dono_user_id`, `user_id` (já único).

---

### 2.5 `usuario_permissoes` (permissões por usuário)

Para papéis com permissões configuráveis (Estoquista, Backoffice, Controlador). Técnico e Vendedor têm regras fixas; não usam esta tabela para isso.

| Coluna               | Tipo   | Restrições | Descrição |
|----------------------|--------|------------|-----------|
| `usuario_empresa_id` | uuid   | PK, FK → `usuarios_empresa(id)` ON DELETE CASCADE | |
| `permissao_id`       | uuid   | PK, FK → `permissoes(id)` ON DELETE CASCADE | |
| `created_at`         | timestamptz | default `now()` | |

**PK composta:** `(usuario_empresa_id, permissao_id)`.

---

## 3. Tabela `users` (existente)

**Não alteramos.** Segue com `id` → `auth.users`, `role` (admin | user), `empresa`, `acesso_liberado`, etc.

- **Admin** e **usuário (dono)** continuam em `users`. Dono = usuário; é a mesma coisa.
- **Subusuários** só em `auth.users` + `usuarios_empresa` (e `usuario_permissoes` quando fizer sentido). Nunca em `users`.

---

## 4. Ordem de criação

1. `papeis`  
2. `permissoes`  
3. `equipe`  
4. `usuarios_empresa`  
5. `usuario_permissoes`  
6. **Seed:** `papeis` e `permissoes`  

*(`equipe` antes de `usuarios_empresa` pois `usuarios_empresa.equipe_id` referencia `equipe`.)*

---

## 5. Resumo de relacionamentos

```
auth.users
    ├── users (existente; admin e usuário/dono – dono = usuário)
    ├── equipe.dono_user_id  (usuário/dono)
    ├── equipe.user_id (opcional, "ID do Usuário")
    ├── usuarios_empresa.user_id (só subusuários)
    └── usuarios_empresa.dono_user_id (usuário/dono)

papeis ── usuarios_empresa.papel_id (só subusuários)
equipe ── usuarios_empresa.equipe_id (opcional)
usuarios_empresa ── usuario_permissoes.usuario_empresa_id
permissoes ── usuario_permissoes.permissao_id
```

---

## 6. Observações para a fase App (depois)

- **Login:** se houver linha em `users` → usuário (dono) ou admin; contexto vem de `users`. Se não houver, buscar em `usuarios_empresa` (por `user_id` = auth user) e montar contexto (dono_user_id, papel, permissões, `equipe_id`).
- **Admin que é dono:** está em `users` (role admin). Enxerga dados da empresa por ser o dono (mesmo `user_id`); não precisa de `usuarios_empresa`.
- **Desativar sub:** desabilitar em Auth; opcionalmente `usuarios_empresa.ativo = false`.
- **Equipe:** tela de cadastro com Nome, ID do Usuário (preenchido por quem cadastra), Função.

---

## 7. Checklist para seu ok

- [ ] Estrutura das tabelas (`papeis`, `permissoes`, `equipe`, `usuarios_empresa`, `usuario_permissoes`)  
- [ ] Seeds de `papeis` e `permissoes`  
- [ ] Manter `users` como está  
- [ ] Ordem de criação e FKs  

Quando aprovar, o próximo passo é **aplicar as migrations** no Supabase (projeto Sysgest).
