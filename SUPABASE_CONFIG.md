# Configuração do Supabase

Este documento contém instruções sobre como configurar corretamente o Supabase para o SysGest Insight Metrics.

## Passos para configuração

### 1. Crie uma conta no Supabase

Se você ainda não tem uma conta no Supabase, crie uma em [https://supabase.com](https://supabase.com) e inicie um novo projeto.

### 2. Obtenha suas credenciais do Supabase

Após criar seu projeto, obtenha as seguintes informações no painel do Supabase:
- URL do projeto (Project URL)
- Chave anônima (Public API Key ou Anon Key)

Você pode encontrar estas informações na seção "Project Settings" > "API" no painel do Supabase.

### 3. Configure as variáveis de ambiente

#### 3.1. Crie um arquivo `.env` na raiz do projeto

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

Substitua `https://seu-projeto.supabase.co` pela URL do seu projeto Supabase e `sua-chave-anonima` pela chave anônima do seu projeto.

#### 3.2. Alternativa: Configure diretamente no arquivo `supabase.ts`

Se você estiver tendo problemas com o arquivo `.env`, você pode temporariamente configurar os valores diretamente no arquivo `src/lib/supabase.ts`:

```typescript
// Substitua estes valores pelos seus valores reais do Supabase
const supabaseUrl = 'https://seu-projeto.supabase.co';
const supabaseAnonKey = 'sua-chave-anonima';
```

⚠️ **Atenção**: Esta abordagem é recomendada apenas para desenvolvimento local. Não cometa estas informações no controle de versão.

### 4. Reinicie o servidor de desenvolvimento

Após configurar as variáveis de ambiente, reinicie o servidor de desenvolvimento para que as alterações sejam aplicadas:

```
npm run dev
```

ou

```
yarn dev
```

## Resolução de problemas

Se você estiver recebendo erros como:

```
supabase.ts:23 Variáveis de ambiente do Supabase não configuradas corretamente.
Uncaught Error: supabaseUrl is required.
```

Verifique as seguintes possíveis causas:

1. O arquivo `.env` não está na raiz do projeto.
2. As variáveis de ambiente no arquivo `.env` não estão nomeadas corretamente (devem ser `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`).
3. O servidor de desenvolvimento não foi reiniciado após a criação/modificação do arquivo `.env`.
4. As variáveis de ambiente estão vazias ou incorretas.

## Configuração para Produção

Para ambientes de produção, certifique-se de configurar as variáveis de ambiente no seu serviço de hospedagem (Vercel, Netlify, etc.) seguindo a documentação específica do serviço. 