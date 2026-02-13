import { useEffect, useCallback } from "react";
import { MetricsOverview } from "@/components/dashboard/MetricsOverview";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { DataProvider } from "@/context/DataContext";
import { TabStateProvider, useTabState } from "@/context/TabStateContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePageTracking } from "@/hooks/usePageTracking";
import { useAuth } from "@/context/useAuth";
import { useTabs } from "@/hooks/useTabs";
import { 
  Home, 
  Clock, 
  RefreshCcw, 
  TrendingUp, 
  BarChart3, 
  Users, 
  UserCircle, 
  CreditCard, 
  Upload, 
  MapPin,
  UserPlus,
  Shield,
  Database,
  Target,
  Mail
} from "lucide-react";

// Mapeamento de ícones por página
const PAGE_ICONS: Record<string, React.ReactNode> = {
  home: <Home className="w-4 h-4" />,
  time: <Clock className="w-4 h-4" />,
  reopening: <RefreshCcw className="w-4 h-4" />,
  permanencia: <TrendingUp className="w-4 h-4" />,
  indicadores: <BarChart3 className="w-4 h-4" />,
  metas: <BarChart3 className="w-4 h-4" />,
  technicians: <Users className="w-4 h-4" />,
  vendedor: <UserCircle className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  payments: <CreditCard className="w-4 h-4" />,
  import: <Upload className="w-4 h-4" />,
  roteiro: <MapPin className="w-4 h-4" />,
  cadastro_tecnicos: <UserPlus className="w-4 h-4" />,
  subusuarios: <Shield className="w-4 h-4" />,
  base: <Database className="w-4 h-4" />,
  metas_empresa: <Target className="w-4 h-4" />,
  mailing: <Mail className="w-4 h-4" />,
};

// Mapeamento de títulos por página
const PAGE_TITLES: Record<string, string> = {
  home: "Início",
  time: "Tempos e Otimização",
  reopening: "Reaberturas",
  permanencia: "Permanência",
  indicadores: "Indicadores",
  metas: "Vendas",
  technicians: "Técnicos",
  vendedor: "Vendedores",
  users: "Usuários",
  payments: "Pagamentos",
  import: "Importação",
  roteiro: "Roteiro",
  cadastro_tecnicos: "Cadastro de Usuários",
  subusuarios: "Cadastro de Acesso",
  base: "Base",
  metas_empresa: "Meta de Vendas Empresa",
  mailing: "Mailing",
};

// Componente interno que usa o contexto de estado das abas
function DashboardContent() {
  const { trackPageAccess } = usePageTracking();
  const { canAccessPage } = useAuth();
  const { toast } = useToast();
  const { clearTabState } = useTabState();
  
  // Callback para limpar estado quando aba for fechada
  const handleTabClosed = useCallback((tabId: string, _page: string) => {
    clearTabState(tabId);
  }, [clearTabState]);
  
  const { 
    tabs, 
    activeTabId, 
    activePage, 
    openTab, 
    closeTab, 
    setActiveTabId,
    limitReached,
    tabsInfo 
  } = useTabs("home", handleTabClosed);

  // Mostrar toast quando limite de abas for atingido
  useEffect(() => {
    if (limitReached) {
      toast({
        title: "Limite de abas atingido",
        description: `Você pode ter no máximo ${tabsInfo.max} abas abertas. Feche algumas para abrir novas.`,
        variant: "destructive",
        duration: 4000,
      });
    }
  }, [limitReached, tabsInfo.max, toast]);

  useEffect(() => {
    if (activePage && activePage !== "home") {
      trackPageAccess(activePage);
    }
  }, [activePage, trackPageAccess]);

  const handlePageChange = useCallback(
    (page: string) => {
      if (!canAccessPage(page)) return;
      
      // Abrir nova aba ou ativar existente
      const title = PAGE_TITLES[page] || page;
      const icon = PAGE_ICONS[page];
      const result = openTab(page, title, icon);
      
      // Se não conseguiu abrir por limite, o toast já foi mostrado pelo useEffect
      if (!result.success && result.reason === "limit_reached") {
        console.log(`Limite de abas atingido: ${tabsInfo.current}/${tabsInfo.max}`);
      }
    },
    [canAccessPage, openTab, tabsInfo]
  );

  const handleTabClick = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, [setActiveTabId]);

  const handleTabClose = useCallback((tabId: string) => {
    closeTab(tabId);
  }, [closeTab]);

  useEffect(() => {
    if (activePage && !canAccessPage(activePage)) {
      openTab("home", "Início", PAGE_ICONS.home);
    }
  }, [activePage, canAccessPage, openTab]);

  return (
    <AppLayout 
      activePage={activePage} 
      onPageChange={handlePageChange}
      tabs={tabs}
      activeTabId={activeTabId}
      onTabClick={handleTabClick}
      onTabClose={handleTabClose}
      showTabs={true}
      tabsInfo={tabsInfo}
      pageIcons={PAGE_ICONS}
    >
      <div className="space-y-4">
        {/* 
          OTIMIZAÇÃO: Manter abas montadas com display:none (evita remontagem lenta)
          - Máximo de 5 abas para controlar uso de memória
          - Troca instantânea entre abas
          - Estado preservado nativamente pelo React
          - localStorage usado apenas como backup
        */}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{ display: activeTabId === tab.id ? "block" : "none" }}
          >
            <MetricsOverview 
              activePage={tab.page} 
              onPageChange={handlePageChange}
              tabId={tab.id}
            />
          </div>
        ))}
      </div>
      <Toaster />
    </AppLayout>
  );
}

export default function Dashboard() {
  return (
    <DataProvider>
      <TabStateProvider>
        <DashboardContent />
      </TabStateProvider>
    </DataProvider>
  );
}
