# 📊 SysGest BD Projeto 2.0

Sistema de Gestão de Métricas e Insights - Progressive Web App (PWA) para análise de desempenho de ordens de serviço.

## 🚀 Funcionalidades

### 📈 Dashboard Principal
- **Métricas de Tempo**: Análise de tempo de atendimento por tipo de serviço
- **Reaberturas**: Monitoramento de taxas de reabertura e análise por técnico
- **Permanência**: Acompanhamento de permanência de clientes por período
- **Metas**: Gestão e acompanhamento de metas de vendas
- **Indicadores**: Visão geral de performance e KPIs

### 🎯 Funcionalidades Avançadas
- **PWA (Progressive Web App)**: Instalável em dispositivos móveis e desktop
- **Design Responsivo**: Interface adaptada para todos os tamanhos de tela
- **Importação de Dados**: Suporte a arquivos Excel/CSV
- **Gráficos Interativos**: Visualizações dinâmicas com Recharts
- **Gestão de Usuários**: Sistema de autenticação e níveis de acesso
- **Monitoramento de Storage**: Controle de uso de armazenamento local

### 📱 Compatibilidade Mobile
- Menu hamburguer para navegação em dispositivos móveis
- Tabelas responsivas com scroll horizontal
- Componentes otimizados para toque
- Suporte a gestos nativos

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** - Biblioteca principal
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework de CSS utilitário
- **Shadcn/ui** - Componentes de interface

### PWA & Performance
- **Vite PWA Plugin** - Service Worker e manifest
- **Workbox** - Estratégias de cache
- **React Query** - Gerenciamento de estado servidor

### Gráficos & Visualização
- **Recharts** - Biblioteca de gráficos
- **Lucide React** - Ícones
- **Date-fns** - Manipulação de datas

### Backend & Dados
- **Supabase** - Backend as a Service
- **XLSX** - Processamento de planilhas
- **Zod** - Validação de schemas

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Instalação
```bash
# Clone o repositório
git clone https://github.com/thizerah/SYSGEST_BD_2.0.git

# Entre no diretório
cd SYSGEST_BD_2.0

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm run dev
```

### Build para Produção
```bash
# Gerar build de produção
npm run build

# Visualizar build localmente
npm run preview
```

## 📱 Instalação como PWA

### Desktop (Chrome/Edge)
1. Acesse o site no navegador
2. Clique no ícone de instalação na barra de endereços
3. Confirme a instalação

### Mobile (Android/iOS)
1. Abra o site no navegador móvel
2. Toque em "Adicionar à tela inicial" (Android) ou "Adicionar à Tela de Início" (iOS)
3. Confirme a instalação

## 🏗️ Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── auth/           # Componentes de autenticação
│   ├── dashboard/      # Componentes do dashboard
│   └── ui/             # Componentes base (shadcn/ui)
├── context/            # Contextos React
├── hooks/              # Hooks customizados
├── lib/                # Utilitários e configurações
├── pages/              # Páginas principais
├── types/              # Definições TypeScript
└── utils/              # Funções utilitárias
```

## 🎨 Design System

### Cores Principais (Neutral Gray)
- **Primary**: `#1f2937` (gray-800)
- **Secondary**: `#6b7280` (gray-500)
- **Muted**: `#9ca3af` (gray-400)

### Breakpoints Responsivos
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 📊 Funcionalidades por Aba

### ⏱️ Tempos
- Análise de tempo de atendimento por tipo de serviço
- Metas de performance por categoria
- Indicadores de serviços dentro/fora da meta

### 🔄 Reaberturas
- Taxa de reabertura por técnico
- Análise por tipo de serviço original
- Motivos de reabertura mais frequentes

### 📈 Permanência
- Acompanhamento de permanência por vendedor
- Análise por tipo de produto (TV/Fibra)
- Tendências mensais

### 🎯 Metas
- Definição e acompanhamento de metas
- Comparação com performance real
- Projeções baseadas em tendências

### 👥 Técnicos
- Performance individual por técnico
- Distribuição de chamados
- Análise de produtividade

### 💰 Vendedor
- Performance de vendas por vendedor
- Análise por produto e região
- Ranking de desempenho

### 📋 Indicadores
- Visão geral de KPIs
- Dashboards executivos
- Alertas de performance

## 🔧 Configuração

### Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

### PWA Icons
Para funcionar como PWA, adicione os ícones na pasta `public/`:
- `pwa-192x192.png`
- `pwa-512x512.png`
- `apple-touch-icon.png`
- `favicon.ico`

Consulte o arquivo `PWA_ICONS_GUIDE.md` para instruções detalhadas.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Autor

**Thiago Nascimento**
- GitHub: [@thizerah](https://github.com/thizerah)
- Email: [seu-email@exemplo.com]

## 🙏 Agradecimentos

- [Shadcn/ui](https://ui.shadcn.com/) pelos componentes de interface
- [Tailwind CSS](https://tailwindcss.com/) pelo framework CSS
- [Recharts](https://recharts.org/) pelas visualizações de dados
- [Supabase](https://supabase.com/) pelo backend

---

⭐ Se este projeto te ajudou, considere dar uma estrela!

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Abra uma [issue](https://github.com/thizerah/SYSGEST_BD_2.0/issues)
- Entre em contato via email

---

*Desenvolvido com ❤️ para otimizar a gestão de ordens de serviço*
