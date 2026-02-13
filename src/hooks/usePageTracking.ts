import { useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth";

const STORAGE_KEY_PREFIX = "sysgest_page_usage_";

interface PageUsage {
  pageId: string;
  count: number;
  lastAccessed: string;
}

/**
 * Hook para rastrear o uso de páginas e obter as mais acessadas
 */
export function usePageTracking() {
  const { user } = useAuth();

  const getStorageKey = useCallback(() => {
    return `${STORAGE_KEY_PREFIX}${user?.id || "anonymous"}`;
  }, [user?.id]);

  /**
   * Registra o acesso a uma página
   */
  const trackPageAccess = useCallback((pageId: string) => {
    if (!pageId || pageId === "home") return; // Não rastrear a página home

    try {
      const storageKey = getStorageKey();
      const stored = localStorage.getItem(storageKey);
      const usage: PageUsage[] = stored ? JSON.parse(stored) : [];

      // Encontrar ou criar entrada para esta página
      const existingIndex = usage.findIndex((p) => p.pageId === pageId);
      
      if (existingIndex >= 0) {
        // Atualizar contagem e data
        usage[existingIndex].count += 1;
        usage[existingIndex].lastAccessed = new Date().toISOString();
      } else {
        // Adicionar nova página
        usage.push({
          pageId,
          count: 1,
          lastAccessed: new Date().toISOString(),
        });
      }

      // Salvar no localStorage
      localStorage.setItem(storageKey, JSON.stringify(usage));
    } catch (error) {
      console.error("Erro ao rastrear acesso à página:", error);
    }
  }, [getStorageKey]);

  /**
   * Obtém as páginas mais acessadas
   */
  const getMostUsedPages = useCallback((limit: number = 4): string[] => {
    try {
      const storageKey = getStorageKey();
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) return [];

      const usage: PageUsage[] = JSON.parse(stored);
      
      // Ordenar por contagem (maior primeiro) e depois por última data de acesso
      const sorted = usage.sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count; // Mais acessadas primeiro
        }
        // Se a contagem for igual, ordenar por última data de acesso
        return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
      });

      // Retornar apenas os IDs das páginas mais usadas
      return sorted.slice(0, limit).map((p) => p.pageId);
    } catch (error) {
      console.error("Erro ao obter páginas mais usadas:", error);
      return [];
    }
  }, [getStorageKey]);

  /**
   * Obtém estatísticas de uso de uma página específica
   */
  const getPageStats = useCallback((pageId: string): PageUsage | null => {
    try {
      const storageKey = getStorageKey();
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) return null;

      const usage: PageUsage[] = JSON.parse(stored);
      return usage.find((p) => p.pageId === pageId) || null;
    } catch (error) {
      console.error("Erro ao obter estatísticas da página:", error);
      return null;
    }
  }, [getStorageKey]);

  /**
   * Limpa o histórico de uso (útil para testes ou reset)
   */
  const clearUsageHistory = useCallback(() => {
    try {
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Erro ao limpar histórico:", error);
    }
  }, [getStorageKey]);

  return {
    trackPageAccess,
    getMostUsedPages,
    getPageStats,
    clearUsageHistory,
  };
}
