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
  Package,
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
  type LucideIcon,
  Boxes,
} from "lucide-react";
import { useAuth } from "@/context/auth";

/** Ícones neutros: cor vem do `SidebarMenuButton` (ativo = accent). */
function MenuIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="h-5 w-5 shrink-0 text-current" strokeWidth={2} />;
}

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
      id: "comercial",
      label: "COMERCIAL",
      items: [
        {
          id: "metas",
          label: "Vendas",
          icon: <MenuIcon icon={Target} />,
        },
        {
          id: "permanencia",
          label: "Permanência",
          icon: <MenuIcon icon={Shield} />,
        },
        {
          id: "cadastro_comercial",
          label: "Cadastro Comercial",
          icon: <MenuIcon icon={FileEdit} />,
        },
        {
          id: "visualizar_vendas",
          label: "Visualizar Vendas",
          icon: <MenuIcon icon={Eye} />,
        },
        {
          id: "vendedor",
          label: "Relatório de Vendedores",
          icon: <MenuIcon icon={Briefcase} />,
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
          icon: <MenuIcon icon={Map} />,
          badge: 0, // Será atualizado depois com OSs pendentes
        },
        {
          id: "estoque",
          label: "Estoque",
          icon: <MenuIcon icon={Package} />,
        },
        {
          id: "time",
          label: "Tempos e Otimização",
          icon: <MenuIcon icon={Clock} />,
        },
        {
          id: "reopening",
          label: "Reaberturas",
          icon: <MenuIcon icon={Repeat} />,
        },
        {
          id: "technicians",
          label: "Relatório de Técnicos",
          icon: <MenuIcon icon={Wrench} />,
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
          icon: <MenuIcon icon={UserPlus} />,
        },
        {
          id: "subusuarios",
          label: "Cadastro de Acesso",
          icon: <MenuIcon icon={Users} />,
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
          icon: <MenuIcon icon={DollarSign} />,
        },
        {
          id: "base",
          label: "Base",
          icon: <MenuIcon icon={Database} />,
        },
        {
          id: "metas_empresa",
          label: "Meta de Vendas Empresa",
          icon: <MenuIcon icon={Target} />,
        },
        {
          id: "metas_vendedor",
          label: "Meta de Vendas Vendedor",
          icon: <MenuIcon icon={Briefcase} />,
        },
        {
          id: "mailing",
          label: "Mailing",
          icon: <MenuIcon icon={Mail} />,
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
          icon: <MenuIcon icon={User} />,
        },
        {
          id: "payments",
          label: "Pagamentos",
          icon: <MenuIcon icon={CreditCard} />,
        },
        {
          id: "cadastro_material",
          label: "Cadastro de Material",
          icon: <MenuIcon icon={Boxes} />,
        },
        {
          id: "planos_comercial",
          label: "Planos Comercial",
          icon: <MenuIcon icon={Settings2} />,
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
          icon: <MenuIcon icon={Upload} />,
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
        <div className="flex items-center gap-2.5 px-2 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/40">
            <LayoutDashboard className="h-5 w-5 text-sidebar-foreground" strokeWidth={2} />
          </div>
          <span className="font-semibold tracking-tight text-lg text-sidebar-foreground whitespace-normal break-words">
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
                      className="cursor-pointer px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/90 flex items-center gap-1.5 h-8 rounded-md"
                    >
                      <div className="flex items-center gap-1.5 w-full">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-sidebar-foreground/60 transition-transform" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-sidebar-foreground/60 transition-transform" />
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
                                <SidebarMenuBadge className="ml-auto shrink-0 border border-border bg-primary text-[10px] font-medium text-primary-foreground">
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
