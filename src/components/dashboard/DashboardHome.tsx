import { useAuth } from "@/context/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Clock,
  Target,
  ArrowRight,
  Zap,
  Shield,
  Repeat,
  Wrench,
  Briefcase,
  Map,
  UserPlus,
  User,
  CreditCard,
  Upload,
  TrendingUp,
  Package,
} from "lucide-react";
import { usePageTracking } from "@/hooks/usePageTracking";
import { useMemo } from "react";
import { useRotas } from "@/context/RotasContext";
import { format } from "date-fns";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  bgColor: string;
}

interface DashboardHomeProps {
  onPageChange?: (page: string) => void;
}

// Mapeamento completo de todas as páginas disponíveis
const ALL_PAGES: Record<string, Omit<QuickAction, "id">> = {
  time: {
    label: "Tempos e Otimização",
    icon: <Clock className="w-5 h-5" />,
    description: "Acompanhe métricas de tempo",
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100",
  },
  reopening: {
    label: "Reaberturas",
    icon: <Repeat className="w-5 h-5" />,
    description: "Análise de reaberturas",
    color: "text-red-600",
    bgColor: "bg-red-50 hover:bg-red-100",
  },
  technicians: {
    label: "Técnicos",
    icon: <Wrench className="w-5 h-5" />,
    description: "Gerencie sua equipe",
    color: "text-purple-600",
    bgColor: "bg-purple-50 hover:bg-purple-100",
  },
  vendedor: {
    label: "Vendedores",
    icon: <Briefcase className="w-5 h-5" />,
    description: "Performance de vendedores",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 hover:bg-indigo-100",
  },
  metas: {
    label: "Vendas",
    icon: <Target className="w-5 h-5" />,
    description: "Visualize suas metas",
    color: "text-green-600",
    bgColor: "bg-green-50 hover:bg-green-100",
  },
  permanencia: {
    label: "Permanência",
    icon: <Shield className="w-5 h-5" />,
    description: "Indicadores de permanência",
    color: "text-orange-600",
    bgColor: "bg-orange-50 hover:bg-orange-100",
  },
  indicadores: {
    label: "Projeção Variável",
    icon: <TrendingUp className="w-5 h-5" />,
    description: "Desempenho, bonificações e ranking",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 hover:bg-emerald-100",
  },
  roteiro: {
    label: "Roteiro",
    icon: <Map className="w-5 h-5" />,
    description: "Planejamento de rotas",
    color: "text-teal-600",
    bgColor: "bg-teal-50 hover:bg-teal-100",
  },
  cadastro_tecnicos: {
    label: "Cadastro de Usuários",
    icon: <UserPlus className="w-5 h-5" />,
    description: "Gerencie técnicos",
    color: "text-pink-600",
    bgColor: "bg-pink-50 hover:bg-pink-100",
  },
  users: {
    label: "Usuários",
    icon: <User className="w-5 h-5" />,
    description: "Gestão de usuários",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 hover:bg-cyan-100",
  },
  payments: {
    label: "Pagamentos",
    icon: <CreditCard className="w-5 h-5" />,
    description: "Controle de pagamentos",
    color: "text-amber-600",
    bgColor: "bg-amber-50 hover:bg-amber-100",
  },
  import: {
    label: "Importação",
    icon: <Upload className="w-5 h-5" />,
    description: "Importe dados",
    color: "text-violet-600",
    bgColor: "bg-violet-50 hover:bg-violet-100",
  },
};

// Páginas padrão caso não haja histórico de uso
const DEFAULT_PAGES = ["time", "metas", "technicians", "permanencia"];

export function DashboardHome({ onPageChange }: DashboardHomeProps) {
  const { user, authExtras } = useAuth();
  const { getMostUsedPages } = usePageTracking();
  const { osRotas } = useRotas();

  const isTecnico = authExtras?.papelCodigo === "tecnico" && !!authExtras?.equipeId;
  const equipeId = authExtras?.equipeId ?? null;

  // Dados da rota do dia (só para técnico): OSs atribuídas hoje, excl. pendente
  const rotaDoDiaStats = useMemo(() => {
    if (!isTecnico || !equipeId) return null;
    const hoje = format(new Date(), "yyyy-MM-dd");
    const oss = osRotas.filter(
      (os) =>
        os.tecnico_id === equipeId &&
        (os.data_agendada?.slice(0, 10) ?? "") === hoje &&
        os.status !== "pendente"
    );
    const tipos = [...new Set(oss.map((o) => o.tipo_servico).filter(Boolean))] as string[];
    const prioridades = [...new Set(oss.map((o) => o.prioridade).filter(Boolean))] as string[];
    const statusCount: Record<string, number> = {};
    oss.forEach((o) => {
      statusCount[o.status] = (statusCount[o.status] ?? 0) + 1;
    });
    const siglaTipo = (t: string) =>
      t === "Instalação" ? "INS" : t.includes("Assistência Técnica") ? "AT" : t;
    const siglaPrioridade = (p: string) =>
      p === "Alta" ? "A" : p === "Média" ? "M" : p === "Baixa" ? "B" : p;
    return {
      quantidade: oss.length,
      tipos: tipos.map(siglaTipo),
      prioridades: prioridades.map(siglaPrioridade),
      statusCount,
    };
  }, [isTecnico, equipeId, osRotas]);

  // Obter saudação baseada na hora do dia
  const getSaudacao = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Obter páginas mais usadas ou usar padrão (só quando não é técnico)
  const quickActions = useMemo(() => {
    const mostUsed = getMostUsedPages(4);
    const pageIds = mostUsed.length >= 2 ? mostUsed : DEFAULT_PAGES;
    return pageIds
      .filter((id) => ALL_PAGES[id])
      .slice(0, 4)
      .map((id) => ({ id, ...ALL_PAGES[id] })) as QuickAction[];
  }, [getMostUsedPages]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-700 via-gray-600 to-gray-800 p-8 md:p-12 shadow-xl">
        <div className="relative z-10">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Sysnex
              </h1>
              <p className="text-gray-200 text-sm md:text-base mt-1">
                Sistema inteligente de gestão operacional, comercial e indicadores
              </p>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-semibold text-white">
                {getSaudacao()}, {user?.name?.split(" ")[0] || "Usuário"}! 👋
              </h2>
              <p className="text-gray-200 text-lg">
                Bem-vindo ao seu painel de controle
              </p>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      </div>

      {/* Técnico: apenas card "Rota do Dia" */}
      {isTecnico ? (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Map className="w-5 h-5 text-teal-600" />
            Rota do Dia
          </h3>
          <Card
            className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-2 hover:border-teal-300"
            onClick={() => onPageChange?.("roteiro")}
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-xl bg-teal-50 hover:bg-teal-100 flex items-center justify-center mb-4 transition-colors">
                <Map className="w-5 h-5 text-teal-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-3 group-hover:text-teal-600 transition-colors">
                Minha rota hoje
              </h4>
              {rotaDoDiaStats && rotaDoDiaStats.quantidade > 0 ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{rotaDoDiaStats.quantidade} OS</span>
                  </div>
                  {rotaDoDiaStats.tipos.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-500">Tipos:</span>
                      {rotaDoDiaStats.tipos.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {rotaDoDiaStats.prioridades.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-500">Prioridades:</span>
                      {rotaDoDiaStats.prioridades.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-500">Status:</span>
                    {Object.entries(rotaDoDiaStats.statusCount).map(([s, n]) => (
                      <Badge key={s} variant="outline" className="text-xs capitalize">
                        {s.replace("_", " ")}: {n}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">Nenhuma OS agendada para hoje.</p>
              )}
              <div className="flex items-center text-sm font-medium text-teal-600 mt-4 group-hover:gap-2 transition-all">
                Ir para Rota do Dia
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Quick Actions Grid — não técnico */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Acesso Rápido
              </h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                Baseado no seu uso
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Card
                  key={action.id}
                  className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-2 hover:border-gray-300"
                  onClick={() => onPageChange?.(action.id)}
                >
                  <CardContent className="p-6">
                    <div
                      className={`w-12 h-12 rounded-xl ${action.bgColor} flex items-center justify-center mb-4 transition-colors`}
                    >
                      <div className={action.color}>{action.icon}</div>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-gray-700 transition-colors">
                      {action.label}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                    <div className="flex items-center text-sm font-medium text-gray-700 group-hover:gap-2 transition-all">
                      Acessar
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Welcome Message */}
          <Card className="bg-gradient-to-r from-gray-50 to-neutral-50 border-2 border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-200 rounded-xl">
                  <LayoutDashboard className="w-6 h-6 text-gray-700" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">Comece a explorar</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Use o menu lateral para navegar entre as diferentes seções do sistema. Você pode
                    acessar métricas, relatórios, configurações e muito mais.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
