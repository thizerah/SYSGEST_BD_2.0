# Sistema de Abas Múltiplas

## 📋 Visão Geral

O sistema de abas múltiplas permite que o usuário tenha várias páginas do dashboard abertas simultaneamente, similar ao comportamento de navegadores modernos ou editores de código como VS Code.

## ⚡ Otimizações de Performance (v2.0)

### 1. **Desmontagem de Abas Inativas**
- Apenas a aba ativa é renderizada (montada)
- Abas inativas são completamente desmontadas do DOM
- Reduz significativamente o uso de memória
- Troca de abas muito mais rápida

### 2. **Cache de Estado por Aba**
- O estado de cada aba (filtros, configurações) é salvo no `localStorage`
- Ao voltar para uma aba, o estado é restaurado automaticamente
- Usa chave única por aba: `tab-state-{tabId}`

### 3. **Limite de Abas (Máximo: 5)**
- Previne sobrecarga de memória
- Exibe notificação quando limite é atingido
- Indicador visual de uso de abas (verde → laranja → vermelho)

## 🎯 Funcionalidades

### 1. **Múltiplas Abas Abertas**
- Abra quantas abas quiser (Indicadores, Tempos, Reaberturas, etc.)
- Cada aba mantém seu próprio estado (filtros, scroll, dados)
- Alterne entre abas sem perder o contexto

### 2. **Gerenciamento de Abas**
- **Abrir**: Clique em qualquer item do sidebar para abrir uma nova aba
- **Fechar**: Clique no ícone ✕ na aba (exceto a aba "Início")
- **Ativar**: Clique na aba para torná-la ativa
- **Persistência**: As abas abertas são salvas no localStorage e restauradas ao recarregar

### 3. **Aba Início**
- A aba "Início" está sempre aberta e não pode ser fechada
- Serve como página principal do dashboard

### 4. **Indicador Visual**
- Aba ativa tem fundo branco e borda azul na parte inferior
- Abas inativas têm fundo cinza claro
- Botão de fechar (✕) aparece ao passar o mouse sobre a aba

## 🏗️ Arquitetura

### Componentes Criados

#### 1. `TabsManager.tsx`
Componente visual que renderiza a barra de abas.

**Props:**
- `tabs`: Array de abas abertas
- `activeTabId`: ID da aba ativa
- `onTabClick`: Callback quando uma aba é clicada
- `onTabClose`: Callback quando o botão fechar é clicado

#### 2. `useTabs.ts`
Hook customizado que gerencia o estado das abas.

**Retorna:**
- `tabs`: Array de abas abertas
- `activeTabId`: ID da aba ativa
- `activePage`: Página da aba ativa
- `openTab(page, title, icon)`: Função para abrir nova aba
- `closeTab(tabId)`: Função para fechar aba
- `closeAllTabs()`: Função para fechar todas as abas (exceto Início)
- `closeOtherTabs(keepTabId)`: Função para fechar outras abas
- `setActiveTabId(tabId)`: Função para ativar uma aba

### Arquivos Modificados

#### 1. `Dashboard.tsx`
- Integra o hook `useTabs`
- Renderiza múltiplas instâncias do `MetricsOverview` (uma por aba)
- Usa `display: none` para esconder abas inativas (preserva estado)

#### 2. `AppLayout.tsx`
- Adiciona o componente `TabsManager` no layout
- Passa props de abas para o layout

## 💾 Persistência de Dados

O sistema salva automaticamente no `localStorage`:

1. **Abas abertas** (`dashboard-open-tabs`)
   - Lista de todas as abas abertas com ID, título, página e ícone

2. **Aba ativa** (`dashboard-active-tab`)
   - ID da aba atualmente ativa

Ao recarregar a página, o sistema restaura:
- Todas as abas que estavam abertas
- A aba que estava ativa
- O estado de cada aba (filtros, dados, etc.)

## 🎨 Estilização

### Cores e Estados

- **Aba Ativa**: 
  - Fundo: Branco (`bg-white`)
  - Texto: Azul escuro (`text-blue-700`)
  - Borda inferior: Azul (`bg-blue-600`)
  - Sombra: Leve (`shadow-sm`)

- **Aba Inativa**:
  - Fundo: Cinza claro (`bg-gray-50`)
  - Texto: Cinza escuro (`text-gray-700`)
  - Hover: Cinza mais escuro (`hover:bg-gray-100`)

- **Botão Fechar**:
  - Sempre visível na aba ativa
  - Aparece ao hover nas abas inativas
  - Hover: Fundo cinza (`hover:bg-gray-200`)

### Scrollbar Customizada

O arquivo `TabsManager.css` define estilos para a scrollbar horizontal:
- Altura: 6px
- Cor do thumb: Cinza claro
- Cor ao hover: Cinza médio
- Fundo transparente

## 🔧 Como Usar

### Abrir uma Nova Aba

```typescript
// No componente que tem acesso ao hook useTabs
const { openTab } = useTabs();

// Abrir aba de Indicadores
openTab("indicadores", "Indicadores", <BarChart3 className="w-4 h-4" />);
```

### Fechar uma Aba

```typescript
const { closeTab } = useTabs();

// Fechar aba por ID
closeTab("indicadores-1234567890");
```

### Verificar Aba Ativa

```typescript
const { activePage, activeTabId } = useTabs();

console.log("Página ativa:", activePage); // "indicadores"
console.log("ID da aba ativa:", activeTabId); // "indicadores-1234567890"
```

## 🚀 Melhorias Futuras

### Possíveis Extensões

1. **Drag & Drop**
   - Reordenar abas arrastando
   - Usar biblioteca como `dnd-kit`

2. **Menu de Contexto**
   - Botão direito na aba para:
     - Fechar outras abas
     - Fechar abas à direita
     - Recarregar aba
     - Duplicar aba

3. **Atalhos de Teclado**
   - `Ctrl+W`: Fechar aba ativa
   - `Ctrl+Tab`: Próxima aba
   - `Ctrl+Shift+Tab`: Aba anterior
   - `Ctrl+1-9`: Ir para aba específica

4. **Limite de Abas**
   - Definir máximo de abas abertas (ex: 8)
   - Mostrar aviso ao tentar abrir mais

5. **Indicadores de Estado**
   - Badge com número de notificações
   - Ícone de loading quando carregando dados
   - Indicador de mudanças não salvas

6. **Abas Fixadas**
   - Permitir fixar abas importantes
   - Abas fixadas não podem ser fechadas acidentalmente

## 📝 Notas Técnicas

### Performance

- Cada aba mantém sua própria instância do `MetricsOverview`
- Abas inativas usam `display: none` (não são desmontadas)
- Isso preserva o estado mas consome memória
- Para otimizar, considere desmontar abas após X minutos de inatividade

### Compatibilidade

- Funciona em todos os navegadores modernos
- Requer suporte a `localStorage`
- CSS Grid e Flexbox para layout responsivo

### Acessibilidade

- Botões de aba têm `title` para tooltip
- Navegação por teclado (Tab, Enter, Escape)
- Cores com contraste adequado (WCAG AA)

## 🐛 Troubleshooting

### Problema: Abas não são restauradas ao recarregar

**Solução:** Verifique se o `localStorage` está habilitado no navegador.

### Problema: Estado da aba é perdido ao trocar

**Solução:** Certifique-se de que as abas inativas usam `display: none` e não são desmontadas.

### Problema: Muitas abas abertas deixam o sistema lento

**Solução:** Implemente um limite de abas ou desmonte abas inativas após certo tempo.

## 📚 Referências

- [React Hooks](https://react.dev/reference/react)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [VS Code Tabs UX](https://code.visualstudio.com/)
