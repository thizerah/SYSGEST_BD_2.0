import { useMemo, useState, useCallback } from "react";
import {
  filtrarPropostasPorPeriodoComAguardandoMesAnterior,
  mapearTipoDeCategoriaVenda,
} from "@/utils/propostas";
import useData from "@/context/useData";
import { useOptimizationCounts } from "@/hooks/useOptimizationCounts";
import { useReopeningMetricsByMonth } from "@/hooks/useReopeningMetricsByMonth";
import { addMonthsForPermanencia, ehStatusFinalizadoPermanencia, isBacklogStatus } from "@/context/DataUtils";
import { getTimeAttendanceColorByServiceType } from "@/utils/colorUtils";
import { useRotas } from "@/context/RotasContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { cn } from "@/lib/utils";
import { VALID_STATUS } from "@/types";
import {
  Clock,
  Repeat,
  Shield,
  Target,
  Zap,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  MapPin,
  CheckCircle2,
  CircleDot,
  XCircle,
  CalendarClock,
  CreditCard,
} from "lucide-react";

interface DashboardMetricsSummaryProps {
  onPageChange?: (page: string) => void;
}

// Extrai mês e ano de uma string de data no formato DD/MM/YYYY ou ISO
function parseDateMesAno(dateStr: string): { mes: number; ano: number } | null {
  try {
    if (dateStr.includes("/")) {
      const parts = dateStr.split(" ")[0].split("/");
      return { mes: parseInt(parts[1], 10), ano: parseInt(parts[2], 10) };
    }
    if (dateStr.includes("-")) {
      const parts = dateStr.split("T")[0].split("-");
      return { mes: parseInt(parts[1], 10), ano: parseInt(parts[0], 10) };
    }
    const d = new Date(dateStr);
    return { mes: d.getMonth() + 1, ano: d.getFullYear() };
  } catch {
    return null;
  }
}

// Badge onde valor alto = bom (tempo de atendimento, permanência)
function StatusBadgeHigh({ value, good, warn }: { value: number; good: number; warn: number }) {
  if (value >= good)
    return (
      <Badge variant="outline" className="border-emerald-200/80 bg-emerald-50 text-[10px] font-medium text-emerald-800">
        Ótimo
      </Badge>
    );
  if (value >= warn)
    return (
      <Badge variant="outline" className="border-amber-200/80 bg-amber-50 text-[10px] font-medium text-amber-900">
        Atenção
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-rose-200/80 bg-rose-50 text-[10px] font-medium text-rose-900">
      Crítico
    </Badge>
  );
}

// Badge onde valor baixo = bom (consumo, reaberturas)
function StatusBadgeLow({ value, good, warn }: { value: number; good: number; warn: number }) {
  if (value <= good)
    return (
      <Badge variant="outline" className="border-emerald-200/80 bg-emerald-50 text-[10px] font-medium text-emerald-800">
        Ótimo
      </Badge>
    );
  if (value <= warn)
    return (
      <Badge variant="outline" className="border-amber-200/80 bg-amber-50 text-[10px] font-medium text-amber-900">
        Atenção
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-rose-200/80 bg-rose-50 text-[10px] font-medium text-rose-900">
      Crítico
    </Badge>
  );
}

function MetricRow({
  label,
  value,
  colorClass,
  backlogCount,
  secondaryLine,
}: {
  label: string;
  value: string;
  colorClass: string;
  backlogCount?: number;
  secondaryLine?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2 last:border-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-xs text-muted-foreground">{label}</span>
        {(backlogCount ?? 0) > 0 && (
          <Badge
            variant="outline"
            className="shrink-0 border-amber-300 bg-amber-50 px-1.5 py-0 text-[10px] font-medium text-amber-700"
          >
            📦 {backlogCount}
          </Badge>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className={cn("text-sm font-semibold tabular-nums", colorClass)}>{value}</span>
        {secondaryLine && (
          <span className="text-[10px] tabular-nums text-muted-foreground">{secondaryLine}</span>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="h-1 w-10 rounded-full bg-gradient-to-r from-primary/50 to-primary/10" aria-hidden />
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{children}</h2>
    </div>
  );
}

interface DashCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  featured?: boolean;
}

function DashCard({ icon, title, subtitle, badge, children, onClick, className, featured }: DashCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      onClick={onClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card text-left shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg",
        onClick && "cursor-pointer",
        featured && "ring-1 ring-primary/10",
        className
      )}
    >
      {featured && (
        <span
          className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/[0.06] blur-2xl transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      )}
      <div className="relative flex items-start justify-between gap-2 border-b border-border/60 bg-muted/25 px-4 py-3 backdrop-blur-[2px]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-primary shadow-sm ring-1 ring-border/40">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</p>
            {subtitle ? <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {badge ? <div className="shrink-0 pt-0.5">{badge}</div> : null}
      </div>
      <div className="relative flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function DetailLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mt-3 flex items-center gap-1 text-xs font-medium text-primary transition-colors group-hover:text-primary/90",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Mesmos critérios de `OptimizationCountCard` → quadro «Percentuais de Consumo». */
const GATILHO_CONSUMO_ANTENA_PCT = 86.13;
const GATILHO_CONSUMO_LNBF_PCT = 88.63;
const CONSUMO_PCT_LIMITE_VERDE = 50;

function consumoOtimizacaoTextClass(pct: number, gatilhoCritico: number) {
  if (pct > gatilhoCritico) return "text-red-600";
  if (pct > CONSUMO_PCT_LIMITE_VERDE) return "text-yellow-600";
  return "text-green-600";
}

function consumoOtimizacaoProgressClass(pct: number, gatilhoCritico: number) {
  if (pct > gatilhoCritico) return "h-2 rounded-full bg-muted [&>div]:bg-red-500";
  if (pct > CONSUMO_PCT_LIMITE_VERDE) return "h-2 rounded-full bg-muted [&>div]:bg-yellow-500";
  return "h-2 rounded-full bg-muted [&>div]:bg-green-500";
}

/** Mesmas regras do quadro «Consumo Excessivo» em OptimizationCountCard.tsx */
function computeLinhaConsumoExcessivo(
  volumeOS: number,
  volumeConsumo: number,
  pdv: number,
  gatilho: number
) {
  const limitePermitido = Math.floor((volumeOS * gatilho) / 100);
  const quantidadeExcedida = Math.max(0, volumeConsumo - limitePermitido);
  const qtdPerm = Math.max(0, limitePermitido - volumeConsumo);
  const taxaConsumo = volumeOS > 0 ? volumeConsumo / volumeOS : 0;
  let proxVolOS = 0;
  if (pdv <= gatilho) {
    proxVolOS = taxaConsumo > 0 ? Math.floor(qtdPerm / taxaConsumo) : 0;
  } else {
    const osNecessarias = gatilho > 0 ? Math.ceil(volumeConsumo / (gatilho / 100) - volumeOS) : 0;
    proxVolOS = Math.max(0, osNecessarias);
  }
  return { quantidadeExcedida, qtdPerm, proxVolOS };
}

// Cabeçalho da tabela de consumo (flex: colunas numéricas com largura fixa para não “espichar” %PDV)
function ConsumoHeader() {
  return (
    <div className="mb-1 flex items-end gap-x-1 border-b border-border/70 pb-1.5 pt-0.5 text-[9px] font-semibold leading-tight text-muted-foreground sm:gap-x-1.5 sm:text-[10px]">
      <span className="min-w-0 flex-1 uppercase tracking-wide">Material</span>
      <span className="w-9 shrink-0 text-center uppercase sm:w-10">Vol OS</span>
      <span className="w-[3rem] shrink-0 text-center uppercase sm:w-[3.25rem]">Vol Cons.</span>
      <span className="w-9 shrink-0 text-center uppercase sm:w-10">%PDV</span>
      <span className="w-[2.35rem] shrink-0 text-center normal-case">Qtd Exc</span>
      <span className="w-[2.35rem] shrink-0 text-center normal-case">Qtd Perm</span>
      <span className="w-[2.85rem] shrink-0 text-center normal-case leading-none">
        Prox Vol OS
      </span>
    </div>
  );
}

// Linha de consumo: Material | Vol OS | Vol Consumo | %PDV | Qtd Exc | Qtd Perm | Prox Vol OS
function ConsumoRow({
  label,
  volume,
  consumo,
  pdv,
  gatilho,
  unidade = "",
}: {
  label: string;
  volume: number;
  consumo: number;
  pdv: number;
  gatilho: number;
  unidade?: string;
}) {
  const badgeClass =
    pdv > gatilho
      ? "bg-red-500 text-white"
      : pdv > gatilho * 0.8
      ? "bg-yellow-500 text-white"
      : "bg-green-500 text-white";

  const { quantidadeExcedida, qtdPerm, proxVolOS } = computeLinhaConsumoExcessivo(volume, consumo, pdv, gatilho);

  const proxClass =
    pdv > gatilho ? "text-red-600 font-semibold" : "text-green-600 font-semibold";

  return (
    <div className="flex items-center gap-x-1 py-1 text-[11px] leading-snug sm:gap-x-1.5">
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
      <span className="flex w-9 shrink-0 justify-center sm:w-10">
        <span className="rounded border border-border/80 bg-muted/60 px-1 py-0.5 text-[10px] font-medium tabular-nums text-foreground/80">
          {volume}
        </span>
      </span>
      <span className="w-[3rem] shrink-0 text-center font-medium tabular-nums text-foreground/85 sm:w-[3.25rem]">
        {consumo}
        {unidade}
      </span>
      <span className={`flex w-9 shrink-0 justify-center rounded px-1 py-0.5 text-center text-[10px] font-bold tabular-nums sm:w-10 ${badgeClass}`}>
        {Math.round(pdv)}%
      </span>
      <span
        className={`w-[2.35rem] shrink-0 text-center text-[10px] font-semibold tabular-nums sm:text-[11px] ${
          quantidadeExcedida > 0 ? "text-red-600" : "text-muted-foreground"
        }`}
      >
        {quantidadeExcedida}
      </span>
      <span className="w-[2.35rem] shrink-0 text-center text-[10px] tabular-nums text-foreground/85 sm:text-[11px]">{qtdPerm}</span>
      <span className={`w-[2.85rem] shrink-0 text-center text-[10px] tabular-nums sm:text-[11px] ${proxClass}`}>{proxVolOS}</span>
    </div>
  );
}

const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function DashboardMetricsSummary({ onPageChange }: DashboardMetricsSummaryProps) {
  const {
    serviceOrders,
    vendas,
    primeirosPagamentos,
    propostasUnificadas,
    calculateTimeMetrics,
    calculateMetaMetrics,
    loadFromSupabaseIfEmpty,
    isLoadingFromSupabase,
  } = useData();

  /** Incrementado após cada atualização bem-sucedida para remontar os NumberTicker e repetir a animação. */
  const [tickerReplay, setTickerReplay] = useState(0);

  const handleRefreshPanel = useCallback(async () => {
    await loadFromSupabaseIfEmpty();
    setTickerReplay((n) => n + 1);
  }, [loadFromSupabaseIfEmpty]);

  const mesAtual = new Date().getMonth() + 1;   // 1-indexed
  const anoAtual = new Date().getFullYear();
  const mesLabel = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });

  // Mês e ano em formato string para os hooks
  const mesAtualStr = mesAtual.toString().padStart(2, "0");
  const anoAtualStr = anoAtual.toString();

  // OSs do mês atual — mesma lógica do MetricsOverview: backlog por data_criacao, finalizadas por data_finalizacao
  const osDoMes = useMemo(() => {
    return serviceOrders.filter((o) => {
      const isBacklog = isBacklogStatus(o.status || "");
      const dateStr = isBacklog ? o.data_criacao : o.data_finalizacao;
      if (!dateStr?.trim()) return false;
      const parsed = parseDateMesAno(dateStr);
      if (!parsed) return false;
      return parsed.mes === mesAtual && parsed.ano === anoAtual;
    });
  }, [serviceOrders, mesAtual, anoAtual]);

  // Tempo de atendimento (mês atual)
  const timeMetrics = useMemo(
    () => calculateTimeMetrics(osDoMes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [osDoMes]
  );

  // Reaberturas — usa o hook que replica exatamente a lógica do MetricsOverview
  const reopeningMetrics = useReopeningMetricsByMonth(mesAtualStr, anoAtualStr);

  // Permanência: vendas que entram em permanência NESTE mês (habilitadas ~4 meses atrás)
  const permanenciaMesAtual = useMemo(() => {
    const mesTarget = mesAtual - 1; // addMonthsForPermanencia retorna mês 0-indexed
    const vazios = { total: 0, adimplentes: 0, inadimplentes: 0, cancelados: 0, percentual_adimplentes: 0, percentual_inadimplentes: 0, percentual_cancelados: 0 };

    if (vendas.length === 0) return vazios;

    const vendasMesPerm = vendas.filter((v) => {
      if (!v.data_habilitacao) return false;
      if (!ehStatusFinalizadoPermanencia(v.status_proposta)) return false;
      // Replicar a mesma lógica do PermanenciaPorTipoServico: apenas POS e BL-DGO
      const agrupamento = v.agrupamento_produto || "";
      const produto = v.produto_principal || "";
      const ehPOSouBLDGO =
        agrupamento.includes("POS") ||
        agrupamento.includes("BL-DGO") ||
        produto.includes("POS") ||
        produto.includes("BL-DGO");
      if (!ehPOSouBLDGO) return false;
      try {
        const { month, year } = addMonthsForPermanencia(v.data_habilitacao, 4);
        return month === mesTarget && year === anoAtual;
      } catch {
        return false;
      }
    });

    if (vendasMesPerm.length === 0) return vazios;

    const propostasSet = new Set(vendasMesPerm.map((v) => v.numero_proposta));
    const propostasComPagamento = new Set(primeirosPagamentos.map((p) => p.proposta));

    let adimplentes = 0;
    let inadimplentes = 0;
    let cancelados = 0;

    primeirosPagamentos.forEach((pg) => {
      if (!propostasSet.has(pg.proposta)) return;
      if (pg.status_pacote === "C") cancelados++;
      else if (pg.status_pacote === "S") inadimplentes++;
      else if (pg.status_pacote === "N" && (!pg.data_passo_cobranca || pg.data_passo_cobranca === "")) adimplentes++;
      else if (pg.passo === "0" || pg.passo === "1") adimplentes++;
      else if (pg.status_pacote === "NC") adimplentes++;
      else inadimplentes++;
    });

    // BL-DGO sem pagamento = adimplente
    vendasMesPerm.forEach((v) => {
      const ehBLDGO = v.agrupamento_produto?.includes("BL-DGO") || v.produto_principal?.includes("BL-DGO");
      if (ehBLDGO && !propostasComPagamento.has(v.numero_proposta)) adimplentes++;
    });

    const total = adimplentes + inadimplentes + cancelados;
    return {
      total,
      adimplentes,
      inadimplentes,
      cancelados,
      percentual_adimplentes: total > 0 ? (adimplentes / total) * 100 : 0,
      percentual_inadimplentes: total > 0 ? (inadimplentes / total) * 100 : 0,
      percentual_cancelados: total > 0 ? (cancelados / total) * 100 : 0,
    };
  }, [vendas, primeirosPagamentos, mesAtual, anoAtual]);

  // Gap de permanência para meta de 55%
  const permanenciaGap = useMemo(() => {
    const { percentual_adimplentes, total, adimplentes } = permanenciaMesAtual;
    if (total === 0) return null;
    if (percentual_adimplentes >= 55) {
      return { acima: true, quantidade: adimplentes - Math.floor(total * 0.55) };
    }
    return { acima: false, quantidade: Math.ceil(total * 0.55) - adimplentes };
  }, [permanenciaMesAtual]);

  // Meta da empresa (mês atual) — inclui categorias detalhadas
  const metaEmpresa = useMemo(
    () => calculateMetaMetrics(mesAtual, anoAtual),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [propostasUnificadas, mesAtual, anoAtual]
  );

  // Breakdown de status das propostas do mês atual
  // Mesmo recorte temporal da aba Metas («Vendas por status»): mês atual + aguardando do mês anterior
  const propostasPeriodoStatusMetas = useMemo(
    () => filtrarPropostasPorPeriodoComAguardandoMesAnterior(propostasUnificadas, mesAtual, anoAtual),
    [propostasUnificadas, mesAtual, anoAtual],
  );

  const metaFunilEhMesCalendarioAtual =
    anoAtual === new Date().getFullYear() && mesAtual === new Date().getMonth() + 1;

  const empresaBreakdown = useMemo(() => {
    const props = propostasPeriodoStatusMetas;
    type P = (typeof props)[number];
    const statusU = (v?: string) => (v ?? "").trim().toUpperCase();
    /** Mesmo critério da guia Vendas — evita contar "Aguardando Habilitação" como finalizado (substring "HABILIT"). */
    const isFinalizado = (u: string) =>
      u === "FINALIZADA" || u === "FINALIZADO" || u === "HABILITADO";
    const isAgPgto = (u: string) => u.includes("AGUARDANDO") && u.includes("PAGAMENTO");
    const isAgHab = (u: string) =>
      u.includes("AGUARDANDO") && u.includes("HABILIT") && !u.includes("PAGAMENTO");

    const bucket = (status?: string) => {
      const u = statusU(status);
      if (isFinalizado(u)) return "fin" as const;
      if (isAgPgto(u)) return "pg" as const;
      if (isAgHab(u)) return "hab" as const;
      return null;
    };

    const tipo = (p: P) => mapearTipoDeCategoriaVenda(p.categoria ?? "");
    const isPos = (p: P) => tipo(p) === "POS";
    const isFlex = (p: P) => tipo(p) === "PRE";

    return {
      finalizado: props.filter((p) => bucket(p.status_proposta) === "fin").length,
      agPagamento: props.filter((p) => bucket(p.status_proposta) === "pg").length,
      agPagamentoPos: props.filter((p) => bucket(p.status_proposta) === "pg" && isPos(p)).length,
      agPagamentoFlex: props.filter((p) => bucket(p.status_proposta) === "pg" && isFlex(p)).length,
      agHabilitacao: props.filter((p) => bucket(p.status_proposta) === "hab").length,
      agHabilitacaoPos: props.filter((p) => bucket(p.status_proposta) === "hab" && isPos(p)).length,
      agHabilitacaoFlex: props.filter((p) => bucket(p.status_proposta) === "hab" && isFlex(p)).length,
    };
  }, [propostasPeriodoStatusMetas]);

  // Otimização — consumo percentual (AT = antenas, PP = LNBF)
  const { volumeOS, volumeConsumoAntena, volumeConsumoLnbs } = useOptimizationCounts(osDoMes);
  const pctConsumoAntena = volumeOS > 0 ? (volumeConsumoAntena / volumeOS) * 100 : 0;
  const pctConsumoLnbs = volumeOS > 0 ? (volumeConsumoLnbs / volumeOS) * 100 : 0;

  // Consumo excessivo detalhado: AT Corretiva e UP/DOWN com antenas, cabo e LNBs
  const consumoExcessivo = useMemo(() => {
    const calcMateriais = (orders: typeof osDoMes) => {
      let antenas = 0;
      let cabo = 0;
      let lnbs = 0;
      orders.forEach((o) => {
        const m = o.materiais || [];
        antenas +=
          (m.find((x) => x.nome === "ANTENA 150 CM C/ KIT FIXACAO")?.quantidade || 0) +
          (m.find((x) => x.nome === "ANTENA 75 CM")?.quantidade || 0) +
          (m.find((x) => x.nome === "ANTENA 90CM C/ KIT FIXACAO")?.quantidade || 0) +
          (m.find((x) => x.nome === "ANTENA DE 60 CM C/ KIT FIXACAO")?.quantidade || 0);
        cabo += m.find((x) => x.nome === "CABO COAXIAL RGC06 BOBINA 100METROS")?.quantidade || 0;
        lnbs +=
          (m.find((x) => x.nome === "LNBF SIMPLES ANTENA 45/60/90 CM")?.quantidade || 0) +
          (m.find((x) => x.nome === "LNBF DUPLO ANTENA 45/60/90 CM")?.quantidade || 0);
      });
      return { antenas, cabo, lnbs };
    };

    const atOrders = osDoMes.filter(
      (o) => o.tipo_servico === "Assistência Técnica" && o.subtipo_servico === "Corretiva" && VALID_STATUS.includes(o.status)
    );
    const upDownOrders = osDoMes.filter(
      (o) => o.tipo_servico === "Instalação" && o.subtipo_servico === "Substituição" && VALID_STATUS.includes(o.status)
    );

    const atMats = calcMateriais(atOrders);
    const upMats = calcMateriais(upDownOrders);
    const pdv = (v: number, vol: number) => (vol > 0 ? (v / vol) * 100 : 0);

    return {
      atCorretiva: {
        volume: atOrders.length,
        antenas: { consumo: atMats.antenas, pdv: pdv(atMats.antenas, atOrders.length), gatilho: 12 },
        cabo:    { consumo: atMats.cabo,    pdv: pdv(atMats.cabo,    atOrders.length), gatilho: 1000 },
        lnbs:    { consumo: atMats.lnbs,    pdv: pdv(atMats.lnbs,    atOrders.length), gatilho: 25 },
      },
      upDown: {
        volume: upDownOrders.length,
        antenas: { consumo: upMats.antenas, pdv: pdv(upMats.antenas, upDownOrders.length), gatilho: 0 },
        cabo:    { consumo: upMats.cabo,    pdv: pdv(upMats.cabo,    upDownOrders.length), gatilho: 1000 },
        lnbs:    { consumo: upMats.lnbs,    pdv: pdv(upMats.lnbs,    upDownOrders.length), gatilho: 10 },
      },
    };
  }, [osDoMes]);

  // Top ofensor TV (técnico com mais reaberturas TV)
  const topOfensorTV = useMemo(() => {
    const entries = Object.entries(reopeningMetrics.reopeningsByTechnicianTV);
    if (entries.length === 0) return null;
    const [nome, count] = entries.sort(([, a], [, b]) => b - a)[0];
    return { nome, count };
  }, [reopeningMetrics]);

  // Categorias de meta com meta_definida > 0 (mês atual)
  const categoriasComMeta = useMemo(
    () => (metaEmpresa?.categorias ?? []).filter((c) => c.meta_definida > 0),
    [metaEmpresa]
  );

  /** Cartão de crédito (Pós-Pago) — mesma regra da aba Metas (MetricsOverview). */
  const cartaoCreditoResumo = useMemo(() => {
    if (!metaEmpresa) return null;
    const META_CARTAO_PERCENTUAL = 20;
    const catPos = metaEmpresa.categorias.find((c) => c.categoria === "PÓS-PAGO");
    const totalPosPago = catPos?.vendas_realizadas ?? 0;
    const totalCartao = metaEmpresa.cartao_credito_pos_pago;
    const percentualCartao =
      totalPosPago > 0 ? (totalCartao / totalPosPago) * 100 : 0;
    const metaCartaoQtd = Math.ceil(totalPosPago * (META_CARTAO_PERCENTUAL / 100));
    const atingiuMeta = percentualCartao >= META_CARTAO_PERCENTUAL;
    return {
      META_CARTAO_PERCENTUAL,
      totalPosPago,
      totalCartao,
      percentualCartao,
      metaCartaoQtd,
      atingiuMeta,
    };
  }, [metaEmpresa]);

  // Mês de referência das vendas para permanência (mesAtual - 4)
  const mesRefPermanencia = useMemo(() => {
    const d = new Date(anoAtual, mesAtual - 1 - 4, 1);
    return MESES_NOMES[d.getMonth()];
  }, [mesAtual, anoAtual]);

  // ── Roteiro do Dia ──────────────────────────────────────────────
  const { osRotas } = useRotas();

  const roteiroDoDia = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const osDia = osRotas.filter((o) => o.data_agendada === hoje);

    const isAT = (o: (typeof osRotas)[0]) =>
      o.tipo_servico?.toLowerCase().includes("assistência") || o.tipo_servico?.toLowerCase().includes("assistencia");
    const isINS = (o: (typeof osRotas)[0]) =>
      o.tipo_servico?.toLowerCase().includes("instalação") || o.tipo_servico?.toLowerCase().includes("instalacao");

    const byStatus = {
      pendente: osDia.filter((o) => o.status === "pendente"),
      atribuida: osDia.filter((o) => o.status === "atribuida"),
      em_andamento: osDia.filter((o) => o.status === "em_andamento"),
      pre_finalizada: osDia.filter((o) => o.status === "pre_finalizada"),
      finalizada: osDia.filter((o) => o.status === "finalizada"),
      cancelada: osDia.filter((o) => o.status === "cancelada"),
      reagendada: osDia.filter((o) => o.status === "reagendada"),
    };

    const pendenteMaisAtribuida = [...byStatus.pendente, ...byStatus.atribuida];

    return {
      total: osDia.length,
      byStatus,
      abertas: pendenteMaisAtribuida.length,
      abertasAT: pendenteMaisAtribuida.filter(isAT).length,
      abertasINS: pendenteMaisAtribuida.filter(isINS).length,
      finalizadas: byStatus.finalizada.length + byStatus.pre_finalizada.length,
      emAndamento: byStatus.em_andamento.length,
    };
  }, [osRotas]);

  const attv = timeMetrics.servicesByType["Assistência Técnica TV"];
  const pptv = timeMetrics.servicesByType["Ponto Principal TV"];
  const reabATTV = reopeningMetrics.reopeningsByOriginalType["Corretiva"];
  const reabPPTV = reopeningMetrics.reopeningsByOriginalType["Ponto Principal"];

  const pct = (v: number) => `${v.toFixed(2)}%`;
  const finalizedLine = (m?: { withinGoal: number; finalizedCount: number; percentFinalized: number }) =>
    m && m.finalizedCount > 0
      ? `${m.withinGoal}/${m.finalizedCount} · ${pct(m.percentFinalized)}`
      : undefined;
  const colorReab = (v: number) => (v <= 3.5 ? "text-green-600" : v <= 7 ? "text-yellow-600" : "text-red-600");

  const pctColor = (pct: number, meta: number) => {
    const ratio = meta > 0 ? pct / meta : 0;
    if (ratio >= 0.8) return "text-green-600";
    if (ratio >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-muted/35 via-background to-background p-4 shadow-sm sm:p-6 md:p-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
        aria-hidden
      />

      <div className="relative space-y-8 md:space-y-10">
        {/* Barra superior */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Visão geral</p>
            <h1 className="mt-1 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl">
              {mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Indicadores consolidados do período</p>
          </div>
          <ShimmerButton
            onClick={() => void handleRefreshPanel()}
            disabled={isLoadingFromSupabase}
            className="shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingFromSupabase ? "animate-spin" : ""}`} />
            {isLoadingFromSupabase ? "Atualizando…" : "Atualizar painel"}
          </ShimmerButton>
        </div>

        {/* Atendimento & Qualidade — Bento */}
        <section>
          <SectionLabel>Atendimento &amp; Qualidade</SectionLabel>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-4">
              <DashCard
                icon={<Clock className="h-4 w-4" strokeWidth={2.25} />}
                title="Tempo de Atendimento"
                badge={<StatusBadgeHigh value={timeMetrics.percentWithinGoal} good={85} warn={70} />}
                onClick={() => onPageChange?.("time")}
              >
                <CardContent className="space-y-1 p-4 pt-0">
                  <MetricRow
                    label="Assistência Técnica TV"
                    value={attv ? pct(attv.percentWithinGoal) : "—"}
                    colorClass={
                      attv
                        ? getTimeAttendanceColorByServiceType("Assistência Técnica TV", attv.percentWithinGoal)
                        : "text-muted-foreground"
                    }
                    backlogCount={attv?.backlogCount}
                    secondaryLine={finalizedLine(attv)}
                  />
                  <MetricRow
                    label="Ponto Principal TV"
                    value={pptv ? pct(pptv.percentWithinGoal) : "—"}
                    colorClass={
                      pptv
                        ? getTimeAttendanceColorByServiceType("Ponto Principal TV", pptv.percentWithinGoal)
                        : "text-muted-foreground"
                    }
                    backlogCount={pptv?.backlogCount}
                    secondaryLine={finalizedLine(pptv)}
                  />
                  <DetailLink>
                    Ver detalhes <ArrowRight className="h-3 w-3" />
                  </DetailLink>
                </CardContent>
              </DashCard>
            </div>

            <div className="md:col-span-4">
              <DashCard
                icon={<Repeat className="h-4 w-4" strokeWidth={2.25} />}
                title="Reaberturas"
                badge={<StatusBadgeLow value={reopeningMetrics.reopeningRate} good={3.5} warn={7} />}
                onClick={() => onPageChange?.("reopening")}
              >
                <CardContent className="space-y-1 p-4 pt-0">
                  <MetricRow
                    label="Assistência Técnica TV"
                    value={reabATTV ? pct(reabATTV.reopeningRate) : "0.00%"}
                    colorClass={reabATTV ? colorReab(reabATTV.reopeningRate) : "text-emerald-600"}
                  />
                  <MetricRow
                    label="Ponto Principal TV"
                    value={reabPPTV ? pct(reabPPTV.reopeningRate) : "0.00%"}
                    colorClass={reabPPTV ? colorReab(reabPPTV.reopeningRate) : "text-emerald-600"}
                  />
                  {topOfensorTV && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50/80 p-2 text-xs">
                      <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                      <span className="text-muted-foreground">Ofensor:</span>
                      <span className="truncate font-semibold text-rose-800">{topOfensorTV.nome}</span>
                      <span className="shrink-0 text-muted-foreground">({topOfensorTV.count})</span>
                    </div>
                  )}
                  <DetailLink>
                    Ver detalhes <ArrowRight className="h-3 w-3" />
                  </DetailLink>
                </CardContent>
              </DashCard>
            </div>

            <div className="md:col-span-4">
              <DashCard
                icon={<Shield className="h-4 w-4" strokeWidth={2.25} />}
                title="Permanência"
                subtitle={`Hab. em ${mesRefPermanencia} · ${permanenciaMesAtual.total} clientes`}
                badge={<StatusBadgeHigh value={permanenciaMesAtual.percentual_adimplentes} good={55} warn={45} />}
                onClick={() => onPageChange?.("permanencia")}
              >
                <CardContent className="p-4 pt-0">
                  <div className="mb-2 flex items-baseline gap-1">
                    <span
                      className={cn(
                        "text-3xl font-bold tracking-tight",
                        permanenciaMesAtual.percentual_adimplentes >= 55
                          ? "text-emerald-600"
                          : permanenciaMesAtual.percentual_adimplentes >= 45
                            ? "text-amber-600"
                            : "text-red-600"
                      )}
                    >
                      <NumberTicker
                        key={`perm-${tickerReplay}`}
                        value={permanenciaMesAtual.percentual_adimplentes}
                        decimalPlaces={2}
                      />
                      %
                    </span>
                    <span className="text-xs text-muted-foreground">adimplentes</span>
                  </div>
                  <Progress
                    value={Math.min(permanenciaMesAtual.percentual_adimplentes, 100)}
                    className="mb-3 h-2.5 rounded-full bg-muted [&>div]:bg-primary/70"
                  />
                  {permanenciaGap && (
                    <p className="flex items-center gap-1 text-xs">
                      {permanenciaGap.acima ? (
                        <>
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="font-medium text-emerald-800">
                            {permanenciaGap.quantidade} acima da meta (55%)
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                          <span className="font-medium text-amber-800">
                            Faltam {permanenciaGap.quantidade} para 55%
                          </span>
                        </>
                      )}
                    </p>
                  )}
                  <DetailLink className="mt-3">
                    Ver detalhes <ArrowRight className="h-3 w-3" />
                  </DetailLink>
                </CardContent>
              </DashCard>
            </div>
          </div>
        </section>

        {/* Metas comerciais */}
        <section>
          <SectionLabel>Metas comerciais</SectionLabel>
          {metaEmpresa ? (
            <DashCard
              featured
              icon={<Target className="h-4 w-4" strokeWidth={2.25} />}
              title="Metas Comerciais"
              subtitle={`Meta PayTV · ${mesLabel}`}
              badge={<StatusBadgeHigh value={metaEmpresa.percentual_geral} good={80} warn={50} />}
              onClick={() => onPageChange?.("metas")}
              className="overflow-hidden"
            >
              <CardContent className="p-5 pt-0">
                <div className="flex flex-col overflow-hidden rounded-xl border border-border/65 bg-muted/25 lg:flex-row lg:items-stretch">
                  <div className="flex w-full shrink-0 flex-col border-border/55 p-3 sm:p-4 lg:max-w-[13.75rem] lg:border-e lg:bg-muted/30">
                    <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Total geral</p>
                    <div className="flex items-baseline gap-1">
                      <span className={cn("text-3xl font-bold leading-none tracking-tight sm:text-[2rem]", pctColor(metaEmpresa.percentual_geral, 100))}>
                        <NumberTicker
                          key={`meta-${tickerReplay}`}
                          value={metaEmpresa.percentual_geral}
                          decimalPlaces={2}
                        />
                        %
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{metaEmpresa.total_vendas}</span>
                      <span> / {metaEmpresa.total_meta} vendas</span>
                    </p>
                    <Progress
                      value={Math.min(metaEmpresa.percentual_geral, 100)}
                      className="mb-0 mt-2 h-2 rounded-full bg-muted [&>div]:bg-primary"
                    />
                    <div className="mt-3 border-t border-border/55 pt-2.5">
                      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Funil no período
                      </p>
                      <dl className="divide-y divide-border/50 overflow-hidden rounded-md border border-border/50 bg-background/55">
                        <div className="flex items-center justify-between gap-2 px-2 py-1">
                          <dt className="flex min-w-0 items-center gap-1.5">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                            <span className="text-[11px] font-medium leading-tight text-foreground">Finalizado</span>
                          </dt>
                          <dd className="shrink-0 text-right tabular-nums">
                            <span className="text-sm font-semibold tracking-tight text-emerald-800">
                              {empresaBreakdown.finalizado}
                            </span>
                          </dd>
                        </div>
                        <div className="flex items-start justify-between gap-2 px-2 py-1">
                          <dt className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
                              <span className="text-[11px] font-medium leading-tight text-foreground" title="Aguardando pagamento">
                                Ag. pagamento
                              </span>
                            </div>
                            {(empresaBreakdown.agPagamentoPos > 0 || empresaBreakdown.agPagamentoFlex > 0) && (
                              <p className="mt-px pl-[0.9375rem] text-[9px] leading-snug text-muted-foreground">
                                {[empresaBreakdown.agPagamentoPos > 0 && `Pós ${empresaBreakdown.agPagamentoPos}`, empresaBreakdown.agPagamentoFlex > 0 && `Flex ${empresaBreakdown.agPagamentoFlex}`]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </dt>
                          <dd className="shrink-0 text-right tabular-nums leading-none">
                            <span className="text-sm font-semibold tracking-tight text-amber-900">{empresaBreakdown.agPagamento}</span>
                          </dd>
                        </div>
                        <div className="flex items-start justify-between gap-2 px-2 py-1">
                          <dt className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" aria-hidden />
                              <span className="text-[11px] font-medium leading-tight text-foreground" title="Aguardando habilitação">
                                Ag. habilitação
                              </span>
                            </div>
                            {(empresaBreakdown.agHabilitacaoPos > 0 || empresaBreakdown.agHabilitacaoFlex > 0) && (
                              <p className="mt-px pl-[0.9375rem] text-[9px] leading-snug text-muted-foreground">
                                {[empresaBreakdown.agHabilitacaoPos > 0 && `Pós ${empresaBreakdown.agHabilitacaoPos}`, empresaBreakdown.agHabilitacaoFlex > 0 && `Flex ${empresaBreakdown.agHabilitacaoFlex}`]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </dt>
                          <dd className="shrink-0 text-right tabular-nums leading-none">
                            <span className="text-sm font-semibold tracking-tight text-orange-900">{empresaBreakdown.agHabilitacao}</span>
                          </dd>
                        </div>
                      </dl>
                      {metaFunilEhMesCalendarioAtual && (
                        <p className="mt-2 text-[9px] leading-snug text-muted-foreground">
                          Inclui <span className="font-medium text-foreground/85">Aguardando</span> do mês anterior — mesma base da aba Metas.
                        </p>
                      )}
                    </div>

                    <DetailLink className="mt-3">
                      Ver detalhes <ArrowRight className="h-3 w-3" />
                    </DetailLink>
                  </div>

                  {(categoriasComMeta.length > 0 ||
                    (cartaoCreditoResumo && cartaoCreditoResumo.totalPosPago > 0)) && (
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-border/55 bg-muted/10 p-3 sm:border-t-0 sm:p-4">
                      <div className="grid grid-cols-[minmax(0,1fr)_2.75rem_2.875rem] items-end gap-x-2 border-b border-border/60 pb-1.5 pl-3 sm:grid-cols-[minmax(0,1fr)_3.25rem_3.375rem]">
                        <span className="min-w-0 text-[8px] font-semibold uppercase leading-none tracking-wide text-muted-foreground">
                          Categoria
                        </span>
                        <span className="py-0.5 text-center text-[8px] font-semibold uppercase leading-none tracking-wide text-muted-foreground">
                          %
                        </span>
                        <span className="py-0.5 text-center text-[8px] font-semibold uppercase leading-none tracking-wide text-muted-foreground">
                          Vendas
                        </span>
                      </div>
                      <div className="mt-1.5 flex min-h-0 flex-1 flex-col justify-between gap-1">
                      {categoriasComMeta.map((cat) => {
                        const borderAccent =
                          cat.percentual_atingido >= 80
                            ? "border-l-emerald-500"
                            : cat.percentual_atingido >= 50
                              ? "border-l-amber-400"
                              : cat.percentual_atingido > 0
                                ? "border-l-orange-400"
                                : "border-l-border";
                        const fillClass =
                          cat.percentual_atingido >= 80
                            ? "[&>div]:bg-emerald-500"
                            : cat.percentual_atingido >= 50
                              ? "[&>div]:bg-amber-400"
                              : cat.percentual_atingido > 0
                                ? "[&>div]:bg-orange-500"
                                : "[&>div]:bg-muted-foreground/35";
                        return (
                          <div key={cat.categoria} className={cn("min-w-0 rounded-r-md border-l-2 pl-3", borderAccent)}>
                            <div className="grid grid-cols-[minmax(0,1fr)_2.75rem_2.875rem] items-center gap-x-2 sm:grid-cols-[minmax(0,1fr)_3.25rem_3.375rem]">
                              <span className="min-w-0 truncate py-0.5 text-[10px] font-semibold uppercase leading-none text-foreground/80">
                                {cat.categoria}
                              </span>
                              <span className={cn("py-0.5 text-right text-[11px] font-bold tabular-nums leading-none", pctColor(cat.percentual_atingido, 100))}>
                                {cat.percentual_atingido.toFixed(2)}%
                              </span>
                              <span className="py-0.5 text-right text-[10px] tabular-nums leading-none text-muted-foreground">
                                {cat.vendas_realizadas}/{cat.meta_definida}
                              </span>
                            </div>
                            <Progress
                              value={Math.min(cat.percentual_atingido, 100)}
                              className={cn("mt-0.5 h-1 rounded-full bg-muted", fillClass)}
                            />
                          </div>
                        );
                      })}

                      {cartaoCreditoResumo && cartaoCreditoResumo.totalPosPago > 0 && (
                        <div className="min-w-0 rounded-r-md border-l-2 border-l-amber-500 pl-3">
                          <div className="grid grid-cols-[minmax(0,1fr)_2.75rem_2.875rem] items-center gap-x-2 sm:grid-cols-[minmax(0,1fr)_3.25rem_3.375rem]">
                            <span className="flex min-w-0 items-center gap-1.5 truncate py-0.5 text-[10px] font-semibold uppercase leading-none text-amber-950">
                              <CreditCard className="h-3 w-3 shrink-0 text-amber-700" strokeWidth={2.25} />
                              <span className="truncate">Cartão de crédito</span>
                            </span>
                            <span
                              className={cn(
                                "py-0.5 text-right text-[11px] font-bold tabular-nums leading-none",
                                cartaoCreditoResumo.atingiuMeta
                                  ? "text-emerald-600"
                                  : cartaoCreditoResumo.percentualCartao >=
                                      cartaoCreditoResumo.META_CARTAO_PERCENTUAL * 0.75
                                    ? "text-amber-700"
                                    : "text-rose-600"
                              )}
                            >
                              {cartaoCreditoResumo.percentualCartao.toFixed(2)}%
                            </span>
                            <span className="py-0.5 text-right text-[10px] tabular-nums leading-none text-muted-foreground">
                              {cartaoCreditoResumo.totalCartao}/{cartaoCreditoResumo.metaCartaoQtd}
                            </span>
                          </div>
                          <Progress
                            value={Math.min(
                              100,
                              (cartaoCreditoResumo.percentualCartao /
                                cartaoCreditoResumo.META_CARTAO_PERCENTUAL) *
                                100
                            )}
                            className={cn(
                              "mt-0.5 h-1 rounded-full bg-muted",
                              cartaoCreditoResumo.atingiuMeta
                                ? "[&>div]:bg-emerald-500"
                                : cartaoCreditoResumo.percentualCartao >=
                                    cartaoCreditoResumo.META_CARTAO_PERCENTUAL * 0.75
                                  ? "[&>div]:bg-amber-500"
                                  : "[&>div]:bg-rose-500"
                            )}
                          />
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </DashCard>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Meta não cadastrada para este mês.
              </CardContent>
            </Card>
          )}
        </section>

        {/* Otimização & Consumo */}
        <section>
          <SectionLabel>Otimização &amp; Consumo</SectionLabel>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            <div className="md:col-span-4">
              <DashCard
                icon={<Zap className="h-4 w-4" strokeWidth={2.25} />}
                title="Consumo de Materiais"
                onClick={() => onPageChange?.("time")}
              >
                <CardContent className="space-y-5 px-5 pb-5 pt-2">
                  <div className="pt-0.5">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Antena</span>
                      <StatusBadgeLow
                        value={pctConsumoAntena}
                        good={CONSUMO_PCT_LIMITE_VERDE}
                        warn={GATILHO_CONSUMO_ANTENA_PCT}
                      />
                    </div>
                    <div
                      className={cn(
                        "mb-2 flex items-baseline gap-0.5 text-2xl font-bold tracking-tight",
                        consumoOtimizacaoTextClass(pctConsumoAntena, GATILHO_CONSUMO_ANTENA_PCT)
                      )}
                    >
                      <NumberTicker
                        key={`ant-${tickerReplay}`}
                        value={pctConsumoAntena}
                        decimalPlaces={2}
                        className="text-inherit"
                      />
                      %
                    </div>
                    <p className="mb-3 text-[11px] text-muted-foreground">
                      {volumeConsumoAntena} antenas · {volumeOS} OS
                    </p>
                    <Progress
                      value={pctConsumoAntena}
                      className={consumoOtimizacaoProgressClass(pctConsumoAntena, GATILHO_CONSUMO_ANTENA_PCT)}
                    />
                  </div>

                  <div className="border-t border-border/60 pt-1" />

                  <div className="pb-0.5">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">LNBs</span>
                      <StatusBadgeLow
                        value={pctConsumoLnbs}
                        good={CONSUMO_PCT_LIMITE_VERDE}
                        warn={GATILHO_CONSUMO_LNBF_PCT}
                      />
                    </div>
                    <div
                      className={cn(
                        "mb-2 flex items-baseline gap-0.5 text-2xl font-bold tracking-tight",
                        consumoOtimizacaoTextClass(pctConsumoLnbs, GATILHO_CONSUMO_LNBF_PCT)
                      )}
                    >
                      <NumberTicker
                        key={`lnb-${tickerReplay}`}
                        value={pctConsumoLnbs}
                        decimalPlaces={2}
                        className="text-inherit"
                      />
                      %
                    </div>
                    <p className="mb-3 text-[11px] text-muted-foreground">
                      {volumeConsumoLnbs} LNBFs · {volumeOS} OS
                    </p>
                    <Progress
                      value={pctConsumoLnbs}
                      className={consumoOtimizacaoProgressClass(pctConsumoLnbs, GATILHO_CONSUMO_LNBF_PCT)}
                    />
                  </div>

                  <DetailLink className="mt-2">
                    Ver detalhes <ArrowRight className="h-3 w-3" />
                  </DetailLink>
                </CardContent>
              </DashCard>
            </div>

            <div className="md:col-span-4">
              <DashCard
                icon={<AlertTriangle className="h-4 w-4" strokeWidth={2.25} />}
                title="Consumo Excessivo"
                onClick={() => onPageChange?.("time")}
              >
                <CardContent className="px-4 pb-5 pt-2 sm:px-5">
                  {consumoExcessivo.atCorretiva.volume > 0 && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase leading-snug text-rose-800">
                        AT Corretiva · {consumoExcessivo.atCorretiva.volume} OS
                      </p>
                      <ConsumoHeader />
                      <ConsumoRow
                        label="Antenas"
                        volume={consumoExcessivo.atCorretiva.volume}
                        consumo={consumoExcessivo.atCorretiva.antenas.consumo}
                        pdv={consumoExcessivo.atCorretiva.antenas.pdv}
                        gatilho={consumoExcessivo.atCorretiva.antenas.gatilho}
                      />
                      <ConsumoRow
                        label="Cabo"
                        volume={consumoExcessivo.atCorretiva.volume}
                        consumo={consumoExcessivo.atCorretiva.cabo.consumo}
                        pdv={consumoExcessivo.atCorretiva.cabo.pdv}
                        gatilho={consumoExcessivo.atCorretiva.cabo.gatilho}
                        unidade="m"
                      />
                      <ConsumoRow
                        label="LNBs"
                        volume={consumoExcessivo.atCorretiva.volume}
                        consumo={consumoExcessivo.atCorretiva.lnbs.consumo}
                        pdv={consumoExcessivo.atCorretiva.lnbs.pdv}
                        gatilho={consumoExcessivo.atCorretiva.lnbs.gatilho}
                      />
                    </div>
                  )}

                  {consumoExcessivo.upDown.volume > 0 && (
                    <div
                      className={
                        consumoExcessivo.atCorretiva.volume > 0
                          ? "border-t border-border/50 pt-3"
                          : ""
                      }
                    >
                      <p className="mb-1.5 text-[10px] font-semibold uppercase leading-snug text-amber-800">
                        UP/DOWN · {consumoExcessivo.upDown.volume} OS
                      </p>
                      <ConsumoHeader />
                      <ConsumoRow
                        label="Antenas"
                        volume={consumoExcessivo.upDown.volume}
                        consumo={consumoExcessivo.upDown.antenas.consumo}
                        pdv={consumoExcessivo.upDown.antenas.pdv}
                        gatilho={consumoExcessivo.upDown.antenas.gatilho}
                      />
                      <ConsumoRow
                        label="Cabo"
                        volume={consumoExcessivo.upDown.volume}
                        consumo={consumoExcessivo.upDown.cabo.consumo}
                        pdv={consumoExcessivo.upDown.cabo.pdv}
                        gatilho={consumoExcessivo.upDown.cabo.gatilho}
                        unidade="m"
                      />
                      <ConsumoRow
                        label="LNBs"
                        volume={consumoExcessivo.upDown.volume}
                        consumo={consumoExcessivo.upDown.lnbs.consumo}
                        pdv={consumoExcessivo.upDown.lnbs.pdv}
                        gatilho={consumoExcessivo.upDown.lnbs.gatilho}
                      />
                    </div>
                  )}

                  {consumoExcessivo.atCorretiva.volume === 0 && consumoExcessivo.upDown.volume === 0 && (
                    <p className="py-2 text-sm text-muted-foreground">Sem dados no mês.</p>
                  )}

                  <DetailLink className="mt-4">
                    Ver detalhes <ArrowRight className="h-3 w-3" />
                  </DetailLink>
                </CardContent>
              </DashCard>
            </div>

            <div className="md:col-span-4">
              <DashCard
                icon={<MapPin className="h-4 w-4" strokeWidth={2.25} />}
                title="Roteiro do Dia"
                subtitle={new Date().toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                })}
                badge={
                  roteiroDoDia.total > 0 ? (
                    <Badge variant="secondary" className="border-primary/15 bg-primary/10 text-[10px] font-semibold text-primary">
                      {roteiroDoDia.total} OS
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Vazio
                    </Badge>
                  )
                }
                onClick={() => onPageChange?.("roteiro")}
              >
                <CardContent className="px-5 pb-5 pt-2">
                  {roteiroDoDia.total === 0 ? (
                    <p className="mt-1 rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm leading-relaxed text-muted-foreground">
                      Nenhuma OS agendada para hoje.
                    </p>
                  ) : (
                    <div className="space-y-3 pt-0.5">
                      {roteiroDoDia.abertas > 0 && (
                        <div className="flex items-start justify-between rounded-lg border border-amber-100 bg-amber-50/80 p-3.5">
                          <div className="flex items-center gap-2">
                            <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                            <div>
                              <p className="text-[11px] font-semibold text-amber-900">Pendentes / Atribuídas</p>
                              <p className="mt-0.5 text-[10px] text-amber-800/90">
                                {[
                                  roteiroDoDia.abertasAT > 0 ? `${roteiroDoDia.abertasAT} AT` : null,
                                  roteiroDoDia.abertasINS > 0 ? `${roteiroDoDia.abertasINS} INS` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "Outros"}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-amber-900">{roteiroDoDia.abertas}</span>
                        </div>
                      )}

                      {roteiroDoDia.emAndamento > 0 && (
                        <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/80 p-3.5">
                          <div className="flex items-center gap-2">
                            <CircleDot className="h-3.5 w-3.5 text-blue-700" />
                            <span className="text-[11px] font-semibold text-blue-900">Em andamento</span>
                          </div>
                          <span className="text-sm font-bold text-blue-900">{roteiroDoDia.emAndamento}</span>
                        </div>
                      )}

                      {roteiroDoDia.byStatus.pre_finalizada.length > 0 && (
                        <div className="flex items-center justify-between rounded-lg border border-violet-100 bg-violet-50/80 p-3.5">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-violet-700" />
                            <span className="text-[11px] font-semibold text-violet-900">Pré-finalizada</span>
                          </div>
                          <span className="text-sm font-bold text-violet-900">
                            {roteiroDoDia.byStatus.pre_finalizada.length}
                          </span>
                        </div>
                      )}

                      {roteiroDoDia.byStatus.finalizada.length > 0 && (
                        <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/80 p-3.5">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                            <span className="text-[11px] font-semibold text-emerald-900">Finalizada</span>
                          </div>
                          <span className="text-sm font-bold text-emerald-900">
                            {roteiroDoDia.byStatus.finalizada.length}
                          </span>
                        </div>
                      )}

                      {roteiroDoDia.byStatus.cancelada.length > 0 && (
                        <div className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/80 p-3.5">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-3.5 w-3.5 text-rose-600" />
                            <span className="text-[11px] font-semibold text-rose-900">Cancelada</span>
                          </div>
                          <span className="text-sm font-bold text-rose-800">
                            {roteiroDoDia.byStatus.cancelada.length}
                          </span>
                        </div>
                      )}

                      {roteiroDoDia.byStatus.reagendada.length > 0 && (
                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3.5">
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[11px] font-semibold text-foreground/80">Reagendada</span>
                          </div>
                          <span className="text-sm font-bold text-foreground">
                            {roteiroDoDia.byStatus.reagendada.length}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <DetailLink className="mt-5">
                    Ver roteiro <ArrowRight className="h-3 w-3" />
                  </DetailLink>
                </CardContent>
              </DashCard>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
