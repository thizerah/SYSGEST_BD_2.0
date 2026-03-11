import { useMemo, useState, useEffect, useRef } from "react";
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
import { Collapsible, CollapsibleContentAnimated, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ChevronDown,
  ChevronRight,
  FileEdit,
  Settings2,
  Eye,
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

  const menuStructure: MenuCategory[] = useMemo(() => [
    {
      id: "metricas",
      label: "INDICADORES",
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
        {
          id: "cadastro_comercial",
          label: "Cadastro Comercial",
          icon: <FileEdit className="h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2.5} />,
        },
        {
          id: "visualizar_vendas",
          label: "Visualizar Vendas",
          icon: <Eye className="h-5 w-5 shrink-0 text-green-600" strokeWidth={2.5} />,
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
      label: "ACESSOS",
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
      label: "GESTÃO",
      items: [
        {
          id: "indicadores",
          label: "Projeção Variável",
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
          id: "metas_vendedor",
          label: "Meta de Vendas Vendedor",
          icon: <Briefcase className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2.5} />,
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
        {
          id: "planos_comercial",
          label: "Planos Comercial",
          icon: <Settings2 className="h-5 w-5 shrink-0 text-blue-600" strokeWidth={2.5} />,
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
  ], []);

  const filteredCategories = useMemo(
    () =>
      menuStructure
        .filter((category) => category.items.some((item) => canAccessPage(item.id)))
        .map((category) => ({
          ...category,
          visibleItems: category.items.filter((item) => canAccessPage(item.id)),
        })),
    [menuStructure, canAccessPage]
  );

  const activeCategoryId = useMemo(
    () =>
      filteredCategories.find((cat) =>
        cat.visibleItems.some((item) => item.id === activePage)
      )?.id ?? null,
    [filteredCategories, activePage]
  );

  const [openCategories, setOpenCategories] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeCategoryId) initial.add(activeCategoryId);
    return initial;
  });

  const ignoreNextOpenRef = useRef(false);

  useEffect(() => {
    if (ignoreNextOpenRef.current) {
      ignoreNextOpenRef.current = false;
      return;
    }
    if (activeCategoryId && !openCategories.has(activeCategoryId)) {
      setOpenCategories((prev) => new Set([...prev, activeCategoryId]));
    }
  }, [activeCategoryId]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-4">
          <LayoutDashboard className="w-6 h-6 shrink-0 text-gray-700" />
          <span className="font-bold text-lg text-sidebar-foreground whitespace-normal break-words">
            Sysnex
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {filteredCategories.map((category, index) => {
          const isOpen = openCategories.has(category.id);
          return (
            <div key={category.id} className="contents">
              {index > 0 && <SidebarSeparator />}
              <Collapsible
                open={isOpen}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <SidebarGroup>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel
                      asChild
                      className="text-sidebar-foreground/70 uppercase text-xs font-semibold px-2 cursor-pointer hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors flex items-center gap-1.5 h-8"
                    >
                      <div className="flex items-center gap-1.5 w-full">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 transition-transform" />
                        )}
                        <span>{category.label}</span>
                      </div>
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContentAnimated>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {category.visibleItems.map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              isActive={activePage === item.id}
                              onClick={() => {
                                ignoreNextOpenRef.current = true;
                                onPageChange(item.id);
                                setOpenCategories((prev) => {
                                  const next = new Set(prev);
                                  next.delete(category.id);
                                  return next;
                                });
                              }}
                              tooltip={item.label}
                              size="lg"
                              className="w-full h-auto min-h-11 py-2 !items-start [&>svg]:!size-5 [&>svg]:!shrink-0 [&>span]:!whitespace-normal [&>span]:break-words"
                            >
                              {item.icon}
                              <span>{item.label}</span>
                              {item.badge !== undefined && item.badge > 0 && (
                                <SidebarMenuBadge className="ml-auto bg-gray-700 text-white shrink-0">
                                  {item.badge}
                                </SidebarMenuBadge>
                              )}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContentAnimated>
                </SidebarGroup>
              </Collapsible>
            </div>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
