import { useState, useCallback, useEffect, useRef } from "react";
import { Tab } from "@/components/layout/TabsManager";

// Limite máximo de abas abertas
const MAX_TABS = 5;

// Tipo para o resultado da abertura de aba
export type OpenTabResult = {
  success: boolean;
  reason?: "limit_reached" | "already_open";
  tabId?: string;
};

// Tipo para callback de fechamento de aba
export type OnTabCloseCallback = (tabId: string, page: string) => void;

export function useTabs(initialPage: string = "home", onTabClose?: OnTabCloseCallback) {
  // Ref para armazenar o callback de fechamento
  const onTabCloseRef = useRef<OnTabCloseCallback | undefined>(onTabClose);
  
  // Atualizar ref quando callback mudar
  useEffect(() => {
    onTabCloseRef.current = onTabClose;
  }, [onTabClose]);

  // Estado para indicar se limite foi atingido (para notificação externa)
  const [limitReached, setLimitReached] = useState(false);

  // Abas não são mais persistidas no localStorage - sempre iniciar apenas com Início.
  // Evita abrir a página com guias antigas e conteúdo em branco.
  const [tabs, setTabs] = useState<Tab[]>(() => [
    { id: "home", title: "Início", page: "home" },
  ]);

  const [activeTabId, setActiveTabId] = useState<string>("home");

  // Resetar flag de limite quando abas mudarem
  useEffect(() => {
    if (tabs.length < MAX_TABS) {
      setLimitReached(false);
    }
  }, [tabs.length]);

  // Abrir nova aba ou ativar se já existir
  const openTab = useCallback((page: string, title: string, icon?: React.ReactNode): OpenTabResult => {
    let result: OpenTabResult = { success: false };
    
    setTabs((currentTabs) => {
      // Verificar se a aba já existe
      const existingTab = currentTabs.find((t) => t.page === page);
      
      if (existingTab) {
        // Se já existe, apenas ativar
        setActiveTabId(existingTab.id);
        result = { success: true, reason: "already_open", tabId: existingTab.id };
        return currentTabs;
      }

      // Verificar limite de abas
      if (currentTabs.length >= MAX_TABS) {
        setLimitReached(true);
        result = { success: false, reason: "limit_reached" };
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
      result = { success: true, tabId: newTab.id };
      return [...currentTabs, newTab];
    });
    
    return result;
  }, []);

  // Fechar aba
  const closeTab = useCallback((tabId: string) => {
    setTabs((currentTabs) => {
      // Não permitir fechar a aba Home
      const tabToClose = currentTabs.find((t) => t.id === tabId);
      if (tabToClose?.page === "home") {
        return currentTabs;
      }

      // Chamar callback de fechamento (para limpar estado)
      if (tabToClose && onTabCloseRef.current) {
        onTabCloseRef.current(tabId, tabToClose.page);
      }

      const newTabs = currentTabs.filter((t) => t.id !== tabId);

      // Se fechou a aba ativa, ativar a última aba
      if (activeTabId === tabId && newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }

      return newTabs;
    });
  }, [activeTabId]);

  // Fechar todas as abas exceto Home
  const closeAllTabs = useCallback(() => {
    // Chamar callback para cada aba que será fechada
    tabs.forEach((tab) => {
      if (tab.page !== "home" && onTabCloseRef.current) {
        onTabCloseRef.current(tab.id, tab.page);
      }
    });
    
    setTabs([{ id: "home", title: "Início", page: "home" }]);
    setActiveTabId("home");
  }, [tabs]);

  // Fechar outras abas (manter apenas a ativa)
  const closeOtherTabs = useCallback((keepTabId: string) => {
    setTabs((currentTabs) => {
      const homeTab = currentTabs.find((t) => t.page === "home");
      const keepTab = currentTabs.find((t) => t.id === keepTabId);
      
      if (!keepTab) return currentTabs;
      
      // Chamar callback para cada aba que será fechada
      currentTabs.forEach((tab) => {
        if (tab.id !== keepTabId && tab.page !== "home" && onTabCloseRef.current) {
          onTabCloseRef.current(tab.id, tab.page);
        }
      });
      
      if (keepTab.page === "home") {
        return [keepTab];
      }
      
      return homeTab ? [homeTab, keepTab] : [keepTab];
    });
  }, []);

  // Obter página ativa
  const activePage = tabs.find((t) => t.id === activeTabId)?.page || "home";

  // Informações sobre limites
  const tabsInfo = {
    current: tabs.length,
    max: MAX_TABS,
    remaining: MAX_TABS - tabs.length,
    isAtLimit: tabs.length >= MAX_TABS,
  };

  return {
    tabs,
    activeTabId,
    activePage,
    openTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    setActiveTabId,
    limitReached,
    tabsInfo,
  };
}
