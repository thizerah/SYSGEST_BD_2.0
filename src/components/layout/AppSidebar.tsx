import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Clock,
  Repeat,
  DollarSign,
  Target,
  Users,
  Wrench,
  Briefcase,
  User,
  UserPlus,
  Map,
  Shield,
  CreditCard,
  Upload,
  Database,
  Mail,
} from "lucide-react";
import { useAuth } from "@/context/auth";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface MenuCategory {
  id: string;
  label: string;
  items: MenuItem[];
}

interface AppSidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

export function AppSidebar({ activePage, onPageChange }: AppSidebarProps) {
  const { canAccessPage } = useAuth();

  const menuStructure: MenuCategory[] = [
    {
      id: "metricas",
      label: "MÉTRICAS & INDICADORES",
      items: [
        {
          id: "time",
          label: "Tempos e Otimização",
          icon: <Clock className="h-5 w-5 shrink-0 text-blue-600" strokeWidth={2.5} />,
        },
        {
          id: "reopening",
          label: "Reaberturas",
          icon: <Repeat className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2.5} />,
        },
        {
          id: "technicians",
          label: "Técnicos",
          icon: <Wrench className="h-5 w-5 shrink-0 text-violet-600" strokeWidth={2.5} />,
        },
        {
          id: "vendedor",
          label: "Vendedores",
          icon: <Briefcase className="h-5 w-5 shrink-0 text-indigo-600" strokeWidth={2.5} />,
        },
      ],
    },
    {
      id: "comercial",
      label: "COMERCIAL",
      items: [
        {
          id: "metas",
          label: "Vendas",
          icon: <Target className="h-5 w-5 shrink-0 text-green-600" strokeWidth={2.5} />,
        },
        {
          id: "permanencia",
          label: "Permanência",
          icon: <Shield className="h-5 w-5 shrink-0 text-orange-600" strokeWidth={2.5} />,
        },
      ],
    },
    {
      id: "operacional",
      label: "OPERACIONAL",
      items: [
        {
          id: "roteiro",
          label: "Roteiro",
          icon: <Map className="h-5 w-5 shrink-0 text-teal-600" strokeWidth={2.5} />,
          badge: 0, // Será atualizado depois com OSs pendentes
        },
      ],
    },
    {
      id: "equipe",
      label: "EQUIPE",
      items: [
        {
          id: "cadastro_tecnicos",
          label: "Cadastro de Usuários",
          icon: <UserPlus className="h-5 w-5 shrink-0 text-pink-600" strokeWidth={2.5} />,
        },
        {
          id: "subusuarios",
          label: "Cadastro de Acesso",
          icon: <Users className="h-5 w-5 shrink-0 text-cyan-600" strokeWidth={2.5} />,
        },
      ],
    },
    {
      id: "variaveis",
      label: "VARIÁVEIS",
      items: [
        {
          id: "indicadores",
          label: "Indicadores",
          icon: <DollarSign className="h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2.5} />,
        },
        {
          id: "base",
          label: "Base",
          icon: <Database className="h-5 w-5 shrink-0 text-slate-600" strokeWidth={2.5} />,
        },
        {
          id: "metas_empresa",
          label: "Meta de Vendas Empresa",
          icon: <Target className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2.5} />,
        },
        {
          id: "mailing",
          label: "Mailing",
          icon: <Mail className="h-5 w-5 shrink-0 text-rose-600" strokeWidth={2.5} />,
        },
      ],
    },
    {
      id: "administrador",
      label: "ADMINISTRADOR",
      items: [
        {
          id: "users",
          label: "Usuários",
          icon: <User className="h-5 w-5 shrink-0 text-sky-600" strokeWidth={2.5} />,
        },
        {
          id: "payments",
          label: "Pagamentos",
          icon: <CreditCard className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2.5} />,
        },
      ],
    },
    {
      id: "configuracoes",
      label: "CONFIGURAÇÕES",
      items: [
        {
          id: "import",
          label: "Importação",
          icon: <Upload className="h-5 w-5 shrink-0 text-violet-600" strokeWidth={2.5} />,
        },
      ],
    },
  ];

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-4">
          <LayoutDashboard className="w-6 h-6 shrink-0 text-blue-600" />
          <span className="font-bold text-lg text-sidebar-foreground whitespace-normal break-words">
            InsightPro
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuStructure
          .filter((category) => category.items.some((item) => canAccessPage(item.id)))
          .map((category, index) => {
            const visibleItems = category.items.filter((item) => canAccessPage(item.id));
            return (
              <div key={category.id} className="contents">
                {index > 0 && <SidebarSeparator />}
                <SidebarGroup>
                  <SidebarGroupLabel className="text-sidebar-foreground/70 uppercase text-xs font-semibold px-2">
                    {category.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleItems.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            isActive={activePage === item.id}
                            onClick={() => onPageChange(item.id)}
                            tooltip={item.label}
                            size="lg"
                            className="w-full h-auto min-h-11 py-2 !items-start [&>svg]:!size-5 [&>svg]:!shrink-0 [&>span]:!whitespace-normal [&>span]:break-words"
                          >
                            {item.icon}
                            <span>{item.label}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <SidebarMenuBadge className="ml-auto bg-blue-600 text-white shrink-0">
                                {item.badge}
                              </SidebarMenuBadge>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </div>
            );
          })}
      </SidebarContent>
    </Sidebar>
  );
}
