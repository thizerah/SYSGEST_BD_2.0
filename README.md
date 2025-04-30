# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/6b2d88a0-6b9b-4756-bd50-821fd9985174

## Configuração do Supabase

Esta aplicação usa o Supabase para autenticação. Siga estas etapas para configurar:

1. Crie uma conta no [Supabase](https://supabase.com) e inicie um novo projeto
2. No Dashboard do seu projeto Supabase, vá para Configurações > API para obter:
   - URL do projeto
   - Chave anônima (pública)
3. No Dashboard do seu projeto Supabase, vá para SQL Editor e execute o seguinte SQL para criar a tabela de usuários:

```sql
-- Criar tabela personalizada para armazenar dados adicionais dos usuários
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  empresa TEXT NOT NULL DEFAULT 'SysGest Insight',
  data_adesao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acesso_liberado BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Segurança com Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política para permitir usuários verem seus próprios dados
CREATE POLICY "Usuários podem ver seus próprios dados" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Política para permitir admins verem todos os dados
CREATE POLICY "Admins podem ver todos os dados" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para permitir inserção ao registrar
CREATE POLICY "Permitir inserção durante registro" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Política para permitir usuários atualizarem seus próprios dados
CREATE POLICY "Usuários podem atualizar seus próprios dados" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Política para permitir admins atualizarem todos os dados
CREATE POLICY "Admins podem atualizar todos os dados" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

4. Crie um arquivo `.env` na raiz do projeto com as informações do Supabase:
```
VITE_SUPABASE_URL=https://sua-url-do-supabase.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-do-supabase
```

5. No Dashboard do Supabase, vá para Authentication > Settings para configurar:
   - Desabilite "Email confirmation" se desejar login sem confirmação
   - Personalize os templates de email para o Magic Link

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/6b2d88a0-6b9b-4756-bd50-821fd9985174) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Autenticação, PostgreSQL)

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/6b2d88a0-6b9b-4756-bd50-821fd9985174) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
