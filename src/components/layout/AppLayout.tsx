import { ReactNode } from "react";
import { useAuth } from "@/context/useAuth";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { TabsManager, Tab, TabsInfo } from "./TabsManager";

interface AppLayoutProps {
  children: ReactNode;
  activePage: string;
  onPageChange: (page: string) => void;
  tabs?: Tab[];
  activeTabId?: string;
  onTabClick?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  showTabs?: boolean;
  tabsInfo?: TabsInfo;
  pageIcons?: Record<string, React.ReactNode>;
}

// Mapeamento de IDs para títulos legíveis
const PAGE_TITLES: Record<string, string> = {
  home: "Início",
  time: "Tempos e Otimização",
  reopening: "Reaberturas",
  permanencia: "Permanência",
  indicadores: "Projeção Variável",
  metas: "Vendas",
  technicians: "Relatório de Técnicos",
  vendedor: "Relatório de Vendedores",
  users: "Usuários",
  payments: "Pagamentos",
  import: "Importação",
  roteiro: "Roteiro",
  estoque: "Estoque",
  cadastro_tecnicos: "Cadastro de Usuários",
  subusuarios: "Cadastro de Acesso",
  base: "Base",
  metas_empresa: "Meta de Vendas Empresa",
  metas_vendedor: "Meta de Vendas Vendedor",
  mailing: "Mailing",
  cadastro_comercial: "Cadastro Comercial",
  visualizar_vendas: "Visualizar Vendas",
  planos_comercial: "Planos Comercial",
};

export function AppLayout({ 
  children, 
  activePage, 
  onPageChange,
  tabs = [],
  activeTabId = "",
  onTabClick = () => {},
  onTabClose = () => {},
  showTabs = false,
  tabsInfo,
  pageIcons,
}: AppLayoutProps) {
  const { user, authExtras, logout } = useAuth();

  const getFuncaoLabel = () => {
    if (authExtras?.isSubUser && authExtras.papelCodigo) {
      const mapaPapeis: Record<string, string> = {
        tecnico: "Técnico",
        vendedor: "Vendedor",
        controlador: "Controlador",
        estoquista: "Estoquista",
        backoffice: "Backoffice",
      };
      return mapaPapeis[authExtras.papelCodigo] ?? "Subusuário";
    }

    if (user?.role === "admin") {
      return "Administrador";
    }

    return "Usuário";
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar activePage={activePage} onPageChange={onPageChange} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:h-16 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-0.5 text-foreground" />
            <Separator orientation="vertical" className="h-4 bg-border" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  {activePage !== "home" ? (
                    <button
                      type="button"
                      onClick={() => onPageChange("home")}
                      className="group flex max-w-[min(100vw-10rem,20rem)] cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/70 sm:max-w-xs sm:px-3"
                      title="Voltar para o início"
                    >
                      <Home className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                      <span className="truncate">{PAGE_TITLES[activePage] || "Dashboard"}</span>
                    </button>
                  ) : (
                    <BreadcrumbPage className="font-semibold text-foreground">
                      {PAGE_TITLES[activePage] || "Dashboard"}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="hidden md:flex md:items-center">
            <div className="flex max-w-md items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 text-xs leading-tight text-foreground">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-muted-foreground">Usuário</span>
                  <span className="truncate font-medium">{user?.name ?? "—"}</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-muted-foreground">Empresa</span>
                  <span className="truncate">{user?.empresa ?? "—"}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/80">{getFuncaoLabel()}</span>
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                  <span>
                    {new Date().toLocaleDateString("pt-BR")}{" "}
                    {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                Sair
              </button>
            </div>
          </div>
        </header>
        
        {/* Barra de abas (se habilitada) */}
        {showTabs && tabs.length > 0 && (
          <TabsManager
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClick={onTabClick}
            onTabClose={onTabClose}
            tabsInfo={tabsInfo}
            pageIcons={pageIcons}
            pageTitles={PAGE_TITLES}
          />
        )}
        
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
