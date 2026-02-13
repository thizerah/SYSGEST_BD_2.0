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
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  {activePage !== "home" ? (
                    <button
                      onClick={() => onPageChange("home")}
                      className="group flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                      title="Voltar para o início"
                    >
                      <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span className="truncate max-w-[180px] sm:max-w-xs">
                        {PAGE_TITLES[activePage] || "Dashboard"}
                      </span>
                    </button>
                  ) : (
                    <BreadcrumbPage className="font-semibold">
                      {PAGE_TITLES[activePage] || "Dashboard"}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Card de usuário no header principal */}
          <div className="hidden md:flex items-center">
            <div className="flex items-center gap-3 rounded-xl bg-white/80 border border-gray-200 px-4 py-2 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                {(user?.name || "T").charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-xs leading-tight text-gray-800">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                  <span>
                    <span className="font-semibold">Usuário:</span>{" "}
                    <span>{user?.name || "Thiago Nascimento"}</span>
                  </span>
                  <span>
                    <span className="font-semibold">Empresa:</span>{" "}
                    <span>{user?.empresa || "SYSTEC"}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                  <span>
                    <span className="font-semibold">Função:</span>{" "}
                    <span>{getFuncaoLabel()}</span>
                  </span>
                  <span className="text-[11px] text-gray-600">
                    <span className="font-semibold">Último acesso:</span>{" "}
                    {new Date().toLocaleDateString("pt-BR")}{" "}
                    {new Date().toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="ml-2 text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
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
          />
        )}
        
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
