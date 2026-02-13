import React from "react";
import { X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import "./TabsManager.css";

export interface Tab {
  id: string;
  title: string;
  page: string;
  icon?: React.ReactNode;
}

// Informações sobre limites de abas
export interface TabsInfo {
  current: number;
  max: number;
  remaining: number;
  isAtLimit: boolean;
}

interface TabsManagerProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab?: () => void;
  tabsInfo?: TabsInfo;
  /** Mapeamento de ícones por página (usado para tabs vindos do localStorage sem icon) */
  pageIcons?: Record<string, React.ReactNode>;
}

export function TabsManager({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  tabsInfo,
  pageIcons,
}: TabsManagerProps) {
  // Obter ícone válido para renderização (evita erro com objetos vindos do localStorage)
  const getValidIcon = (tab: Tab): React.ReactNode | null => {
    const icon = tab.icon ?? pageIcons?.[tab.page];
    return icon && React.isValidElement(icon) ? icon : null;
  };

  // Determinar cor do indicador baseado no uso
  const getIndicatorColor = () => {
    if (!tabsInfo) return "text-gray-500";
    const usage = tabsInfo.current / tabsInfo.max;
    if (usage >= 1) return "text-red-600";
    if (usage >= 0.8) return "text-orange-500";
    return "text-gray-500";
  };

  return (
    <div className="flex items-center bg-gray-50 border-b border-gray-200 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
      <div className="flex items-center min-w-0 flex-1">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          const isHome = tab.page === "home";
          const tabIcon = getValidIcon(tab);

          return (
            <div
              key={tab.id}
              className={cn(
                "group relative flex items-center gap-2 px-4 py-2.5 border-r border-gray-200 cursor-pointer transition-all min-w-[140px] max-w-[220px]",
                isActive
                  ? "bg-white text-blue-700 font-semibold shadow-sm"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              )}
              onClick={() => onTabClick(tab.id)}
            >
              {/* Indicador visual da aba ativa */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}

              {/* Ícone (se houver) - usa getValidIcon para evitar objetos inválidos do localStorage */}
              {tabIcon && (
                <span className="flex-shrink-0 w-4 h-4">{tabIcon}</span>
              )}

              {/* Título */}
              <span className="flex-1 truncate text-sm">{tab.title}</span>

              {/* Botão fechar (não mostrar para Home) */}
              {!isHome && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className={cn(
                    "flex-shrink-0 p-0.5 rounded hover:bg-gray-200 transition-colors",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  title="Fechar aba"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Indicador de quantidade de abas com informações de limite */}
      <div className={cn(
        "flex-shrink-0 flex items-center gap-1.5 px-3 py-1 text-xs font-medium",
        getIndicatorColor()
      )}>
        {tabsInfo?.isAtLimit && (
          <AlertCircle className="w-3.5 h-3.5" />
        )}
        <span>
          {tabsInfo 
            ? `${tabsInfo.current}/${tabsInfo.max}` 
            : tabs.length > 1 
              ? `${tabs.length} abas`
              : ""
          }
        </span>
      </div>
    </div>
  );
}
