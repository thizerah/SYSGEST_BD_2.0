import { useState, useCallback, useEffect, useRef } from "react";
import { Tab } from "@/components/layout/TabsManager";

const STORAGE_KEY = "dashboard-open-tabs";
const ACTIVE_TAB_KEY = "dashboard-active-tab";

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

  // Carregar abas do localStorage ou usar padrão
  const [tabs, setTabs] = useState<Tab[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Limitar abas carregadas ao máximo permitido e remover icon (não serializável, pode vir corrompido)
        const limitedTabs = parsed.slice(0, MAX_TABS).map((tab: Tab) => {
          const { icon, ...rest } = tab;
          return rest;
        });
        return limitedTabs.length > 0 ? limitedTabs : [{ id: "home", title: "Início", page: "home" }];
      }
    } catch (error) {
      console.error("Erro ao carregar abas do localStorage:", error);
    }
    return [{ id: "home", title: "Início", page: "home" }];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_TAB_KEY);
      if (saved && tabs.find(t => t.id === saved)) {
        return saved;
      }
    } catch (error) {
      console.error("Erro ao carregar aba ativa do localStorage:", error);
    }
    return "home";
  });

  // Salvar abas no localStorage quando mudarem (excluir icon - React elements não podem ser serializados)
  useEffect(() => {
    try {
      const tabsToSave = tabs.map(({ icon, ...rest }) => rest);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabsToSave));
    } catch (error) {
      console.error("Erro ao salvar abas no localStorage:", error);
    }
  }, [tabs]);

  // Salvar aba ativa no localStorage quando mudar
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, activeTabId);
    } catch (error) {
      console.error("Erro ao salvar aba ativa no localStorage:", error);
    }
  }, [activeTabId]);

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
