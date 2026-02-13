# Exemplos de Uso - Sistema de Abas

## 🎯 Exemplos Práticos

### 1. Abrir Aba Programaticamente

```typescript
import { useTabs } from "@/hooks/useTabs";
import { BarChart3 } from "lucide-react";

function MeuComponente() {
  const { openTab } = useTabs();

  const abrirIndicadores = () => {
    openTab(
      "indicadores",           // ID da página
      "Indicadores",           // Título da aba
      <BarChart3 className="w-4 h-4" />  // Ícone (opcional)
    );
  };

  return (
    <button onClick={abrirIndicadores}>
      Abrir Indicadores
    </button>
  );
}
```

### 2. Verificar se uma Aba Está Aberta

```typescript
function MeuComponente() {
  const { tabs } = useTabs();

  const indicadoresEstaAberto = tabs.some(tab => tab.page === "indicadores");

  return (
    <div>
      {indicadoresEstaAberto ? (
        <span>✅ Indicadores está aberto</span>
      ) : (
        <span>❌ Indicadores não está aberto</span>
      )}
    </div>
  );
}
```

### 3. Fechar Todas as Abas Exceto Início

```typescript
function MeuComponente() {
  const { closeAllTabs } = useTabs();

  return (
    <button onClick={closeAllTabs}>
      Fechar Todas as Abas
    </button>
  );
}
```

### 4. Fechar Outras Abas (Manter Apenas a Ativa)

```typescript
function MeuComponente() {
  const { closeOtherTabs, activeTabId } = useTabs();

  const fecharOutras = () => {
    closeOtherTabs(activeTabId);
  };

  return (
    <button onClick={fecharOutras}>
      Fechar Outras Abas
    </button>
  );
}
```

### 5. Navegar Entre Abas com Atalhos de Teclado

```typescript
import { useEffect } from "react";
import { useTabs } from "@/hooks/useTabs";

function AtalhosDeAbas() {
  const { tabs, activeTabId, setActiveTabId, closeTab } = useTabs();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+W: Fechar aba ativa
      if (e.ctrlKey && e.key === "w") {
        e.preventDefault();
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (activeTab?.page !== "home") {
          closeTab(activeTabId);
        }
      }

      // Ctrl+Tab: Próxima aba
      if (e.ctrlKey && e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTabId(tabs[nextIndex].id);
      }

      // Ctrl+Shift+Tab: Aba anterior
      if (e.ctrlKey && e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        setActiveTabId(tabs[prevIndex].id);
      }

      // Ctrl+1-9: Ir para aba específica
      if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (index < tabs.length) {
          setActiveTabId(tabs[index].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tabs, activeTabId, setActiveTabId, closeTab]);

  return null; // Componente invisível que apenas escuta eventos
}

// Usar no Dashboard.tsx:
// <AtalhosDeAbas />
```

### 6. Menu de Contexto (Botão Direito na Aba)

```typescript
import { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface TabContextMenuProps {
  tab: Tab;
  onClose: () => void;
  onCloseOthers: () => void;
  onCloseRight: () => void;
  onReload: () => void;
}

function TabContextMenu({
  tab,
  onClose,
  onCloseOthers,
  onCloseRight,
  onReload,
}: TabContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        {/* Conteúdo da aba aqui */}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {tab.page !== "home" && (
          <>
            <ContextMenuItem onClick={onClose}>
              Fechar Aba
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onClick={onCloseOthers}>
          Fechar Outras Abas
        </ContextMenuItem>
        <ContextMenuItem onClick={onCloseRight}>
          Fechar Abas à Direita
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onReload}>
          Recarregar Aba
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

### 7. Indicador de Notificações na Aba

```typescript
interface TabWithBadge extends Tab {
  badge?: number; // Número de notificações
}

function TabWithNotification({ tab }: { tab: TabWithBadge }) {
  return (
    <div className="flex items-center gap-2">
      <span>{tab.title}</span>
      {tab.badge && tab.badge > 0 && (
        <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
          {tab.badge > 99 ? "99+" : tab.badge}
        </span>
      )}
    </div>
  );
}
```

### 8. Drag & Drop para Reordenar Abas

```typescript
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableTab({ tab }: { tab: Tab }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="tab-item"
    >
      {tab.title}
    </div>
  );
}

function DraggableTabsManager() {
  const [tabs, setTabs] = useState<Tab[]>([]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTabs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tabs}>
        {tabs.map((tab) => (
          <SortableTab key={tab.id} tab={tab} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

### 9. Limitar Número Máximo de Abas

```typescript
// No hook useTabs.ts, modificar a função openTab:

const MAX_TABS = 8;

const openTab = useCallback((page: string, title: string, icon?: React.ReactNode) => {
  setTabs((currentTabs) => {
    // Verificar se já existe
    const existingTab = currentTabs.find((t) => t.page === page);
    
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return currentTabs;
    }

    // Verificar limite
    if (currentTabs.length >= MAX_TABS) {
      alert(`Você já tem ${MAX_TABS} abas abertas. Feche algumas para abrir novas.`);
      return currentTabs;
    }

    // Criar nova aba
    const newTab: Tab = {
      id: `${page}-${Date.now()}`,
      title,
      page,
      icon,
    };

    setActiveTabId(newTab.id);
    return [...currentTabs, newTab];
  });
}, []);
```

### 10. Salvar Estado Específico de Cada Aba

```typescript
// Criar um contexto para estado das abas
interface TabState {
  [tabId: string]: {
    scrollPosition?: number;
    filters?: Record<string, any>;
    selectedItems?: string[];
  };
}

const TabStateContext = createContext<{
  state: TabState;
  updateTabState: (tabId: string, data: any) => void;
}>({
  state: {},
  updateTabState: () => {},
});

// Provider
function TabStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TabState>(() => {
    const saved = localStorage.getItem("tab-states");
    return saved ? JSON.parse(saved) : {};
  });

  const updateTabState = useCallback((tabId: string, data: any) => {
    setState((prev) => {
      const newState = {
        ...prev,
        [tabId]: { ...prev[tabId], ...data },
      };
      localStorage.setItem("tab-states", JSON.stringify(newState));
      return newState;
    });
  }, []);

  return (
    <TabStateContext.Provider value={{ state, updateTabState }}>
      {children}
    </TabStateContext.Provider>
  );
}

// Hook para usar em componentes
function useTabState(tabId: string) {
  const { state, updateTabState } = useContext(TabStateContext);
  
  return {
    tabState: state[tabId] || {},
    setTabState: (data: any) => updateTabState(tabId, data),
  };
}
```

## 🎨 Exemplos de Estilização

### Tema Escuro para Abas

```css
/* TabsManager.css */
.dark .tab-item {
  background-color: #1f2937;
  color: #e5e7eb;
  border-color: #374151;
}

.dark .tab-item.active {
  background-color: #111827;
  color: #60a5fa;
  border-bottom-color: #3b82f6;
}

.dark .tab-item:hover {
  background-color: #374151;
}
```

### Animação de Transição Entre Abas

```css
.tab-content {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Aba com Indicador de Loading

```typescript
interface TabWithLoading extends Tab {
  isLoading?: boolean;
}

function TabItem({ tab }: { tab: TabWithLoading }) {
  return (
    <div className="flex items-center gap-2">
      {tab.isLoading && (
        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      )}
      <span>{tab.title}</span>
    </div>
  );
}
```

## 📱 Responsividade

### Abas em Mobile (Dropdown)

```typescript
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function MobileTabsSelector({ tabs, activeTabId, onTabClick }: TabsManagerProps) {
  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg">
          {activeTab?.icon}
          <span>{activeTab?.title}</span>
          <ChevronDown className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {tabs.map(tab => (
            <DropdownMenuItem
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              className={tab.id === activeTabId ? "bg-blue-50" : ""}
            >
              <div className="flex items-center gap-2">
                {tab.icon}
                <span>{tab.title}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

## 🔍 Debugging

### Log de Eventos de Abas

```typescript
// Adicionar no useTabs.ts para debug
useEffect(() => {
  console.log("📊 Abas abertas:", tabs.map(t => t.title));
  console.log("✅ Aba ativa:", tabs.find(t => t.id === activeTabId)?.title);
}, [tabs, activeTabId]);
```

### Inspecionar Estado das Abas

```typescript
// Adicionar botão de debug no Dashboard
function DebugTabsButton() {
  const { tabs, activeTabId } = useTabs();

  const logState = () => {
    console.table(tabs);
    console.log("Active Tab ID:", activeTabId);
    console.log("LocalStorage:", {
      tabs: localStorage.getItem(STORAGE_KEY),
      activeTab: localStorage.getItem(ACTIVE_TAB_KEY),
    });
  };

  return (
    <button onClick={logState} className="fixed bottom-4 right-4 p-2 bg-blue-500 text-white rounded">
      Debug Abas
    </button>
  );
}
```
