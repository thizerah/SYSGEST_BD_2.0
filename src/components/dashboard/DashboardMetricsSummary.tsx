import { useMemo } from "react";
import useData from "@/context/useData";
import { useOptimizationCounts } from "@/hooks/useOptimizationCounts";
import { addMonthsForPermanencia } from "@/context/DataUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  if (value >= good) return <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px]">Ótimo</Badge>;
  if (value >= warn) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-[10px]">Atenção</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px]">Crítico</Badge>;
}

// Badge onde valor baixo = bom (consumo, reaberturas)
function StatusBadgeLow({ value, good, warn }: { value: number; good: number; warn: number }) {
  if (value <= good) return <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px]">Ótimo</Badge>;
  if (value <= warn) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-[10px]">Atenção</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px]">Crítico</Badge>;
}

function MetricRow({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-600">{label}</span>
      <span className={`text-sm font-bold ${colorClass}`}>{value}</span>
    </div>
  );
}

// Linha de consumo: Material | Vol Consumo | %PDV (badge colorido por gatilho)
function ConsumoRow({
  label,
  consumo,
  pdv,
  gatilho,
  unidade = "",
}: {
  label: string;
  consumo: number;
  pdv: number;
  gatilho: number;
  unidade?: string;
}) {
  const badgeClass =
    pdv === 0
      ? "bg-green-100 text-green-700"
      : pdv > gatilho
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <div className="grid grid-cols-3 items-center py-0.5 text-[11px]">
      <span className="text-gray-600">{label}</span>
      <span className="text-center text-gray-700 font-medium">
        {consumo}{unidade}
      </span>
      <span className={`text-center font-bold rounded px-1 py-0.5 ${badgeClass}`}>
        {pdv.toFixed(2)}%
      </span>
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
    calculateReopeningMetrics,
    calculateMetaMetrics,
  } = useData();

  const mesAtual = new Date().getMonth() + 1;   // 1-indexed
  const anoAtual = new Date().getFullYear();
  const mesLabel = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });

  // OSs do mês atual (por data_finalizacao ou data_criacao)
  const osDoMes = useMemo(() => {
    return serviceOrders.filter((o) => {
      const finalizacao = o.data_finalizacao ? parseDateMesAno(o.data_finalizacao) : null;
      if (finalizacao && finalizacao.mes === mesAtual && finalizacao.ano === anoAtual) return true;
      const criacao = o.data_criacao ? parseDateMesAno(o.data_criacao) : null;
      return !!(criacao && criacao.mes === mesAtual && criacao.ano === anoAtual);
    });
  }, [serviceOrders, mesAtual, anoAtual]);

  // Tempo de atendimento (mês atual)
  const timeMetrics = useMemo(
    () => calculateTimeMetrics(osDoMes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [osDoMes]
  );

  // Reaberturas (mês atual)
  const reopeningMetrics = useMemo(
    () => calculateReopeningMetrics(osDoMes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [osDoMes]
  );

  // Permanência: vendas que entram em permanência NESTE mês (habilitadas ~4 meses atrás)
  const permanenciaMesAtual = useMemo(() => {
    const mesTarget = mesAtual - 1; // addMonthsForPermanencia retorna mês 0-indexed
    const vazios = { total: 0, adimplentes: 0, inadimplentes: 0, cancelados: 0, percentual_adimplentes: 0, percentual_inadimplentes: 0, percentual_cancelados: 0 };

    if (vendas.length === 0) return vazios;

    const vendasMesPerm = vendas.filter((v) => {
      if (!v.data_habilitacao) return false;
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
  const propostasMes = useMemo(
    () => propostasUnificadas.filter((p) => p.mes === mesAtual && p.ano === anoAtual),
    [propostasUnificadas, mesAtual, anoAtual]
  );

  const empresaBreakdown = useMemo(() => {
    const s = (v?: string) => (v ?? "").toUpperCase();
    const isFinalizados = (p: typeof propostasMes[0]) => s(p.status_proposta).includes("FINALIZ") || s(p.status_proposta).includes("HABILIT");
    const isAgPgto = (p: typeof propostasMes[0]) => s(p.status_proposta).includes("AGUARDANDO") && s(p.status_proposta).includes("PAGAMENTO");
    const isAgHab = (p: typeof propostasMes[0]) => s(p.status_proposta).includes("AGUARDANDO") && s(p.status_proposta).includes("HABILIT");
    // categoria pode ser "pos"/"pos_pago" (venda normal) ou "flex_conforto"/"pre" (vendaMeta)
    const isPos = (p: typeof propostasMes[0]) =>
      p.categoria === "pos_pago" || p.categoria === "pos";
    const isFlex = (p: typeof propostasMes[0]) =>
      p.categoria === "flex_conforto" || p.categoria === "pre";
    return {
      finalizado: propostasMes.filter(isFinalizados).length,
      agPagamento: propostasMes.filter(isAgPgto).length,
      agPagamentoPos: propostasMes.filter((p) => isAgPgto(p) && isPos(p)).length,
      agPagamentoFlex: propostasMes.filter((p) => isAgPgto(p) && isFlex(p)).length,
      agHabilitacao: propostasMes.filter(isAgHab).length,
      agHabilitacaoPos: propostasMes.filter((p) => isAgHab(p) && isPos(p)).length,
      agHabilitacaoFlex: propostasMes.filter((p) => isAgHab(p) && isFlex(p)).length,
    };
  }, [propostasMes]);

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

  // Mês de referência das vendas para permanência (mesAtual - 4)
  const mesRefPermanencia = useMemo(() => {
    const d = new Date(anoAtual, mesAtual - 1 - 4, 1);
    return MESES_NOMES[d.getMonth()];
  }, [mesAtual, anoAtual]);

  const attv = timeMetrics.servicesByType["Assistência Técnica TV"];
  const pptv = timeMetrics.servicesByType["Ponto Principal TV"];
  const reabATTV = reopeningMetrics.reopeningsByOriginalType["Corretiva"];
  const reabPPTV = reopeningMetrics.reopeningsByOriginalType["Ponto Principal"];

  const pct = (v: number) => `${v.toFixed(2)}%`;
  const colorTA = (v: number) => (v >= 85 ? "text-green-600" : v >= 70 ? "text-yellow-600" : "text-red-600");
  const colorReab = (v: number) => (v <= 3.5 ? "text-green-600" : v <= 7 ? "text-yellow-600" : "text-red-600");

  const pctColor = (pct: number, meta: number) => {
    const ratio = meta > 0 ? pct / meta : 0;
    if (ratio >= 0.8) return "text-green-600";
    if (ratio >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* ── ATENDIMENTO & QUALIDADE ─────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Atendimento &amp; Qualidade — {mesLabel}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Tempo de Atendimento */}
          <Card className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-blue-400" onClick={() => onPageChange?.("time")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-blue-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Tempo de Atendimento</span>
                </div>
                <StatusBadgeHigh value={timeMetrics.percentWithinGoal} good={85} warn={70} />
              </div>
              <MetricRow label="Assistência Técnica TV" value={attv ? pct(attv.percentWithinGoal) : "—"} colorClass={attv ? colorTA(attv.percentWithinGoal) : "text-gray-400"} />
              <MetricRow label="Ponto Principal TV" value={pptv ? pct(pptv.percentWithinGoal) : "—"} colorClass={pptv ? colorTA(pptv.percentWithinGoal) : "text-gray-400"} />
              {timeMetrics.backlogCount > 0 && (
                <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />{timeMetrics.backlogCount} em backlog
                </p>
              )}
              <div className="flex items-center gap-1 text-xs text-blue-600 mt-3 font-medium">
                Ver detalhes <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Reaberturas */}
          <Card className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-red-400" onClick={() => onPageChange?.("reopening")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-red-600">
                  <Repeat className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Reaberturas</span>
                </div>
                <StatusBadgeLow value={reopeningMetrics.reopeningRate} good={3.5} warn={7} />
              </div>
              <MetricRow label="Assistência Técnica TV" value={reabATTV ? pct(reabATTV.reopeningRate) : "0,00%"} colorClass={reabATTV ? colorReab(reabATTV.reopeningRate) : "text-green-600"} />
              <MetricRow label="Ponto Principal TV" value={reabPPTV ? pct(reabPPTV.reopeningRate) : "0,00%"} colorClass={reabPPTV ? colorReab(reabPPTV.reopeningRate) : "text-green-600"} />
              {topOfensorTV && (
                <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                  <span className="text-gray-500">Ofensor: </span>
                  <span className="font-semibold text-red-700">{topOfensorTV.nome}</span>
                  <span className="text-gray-500 ml-1">({topOfensorTV.count} reab.)</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-red-600 mt-3 font-medium">
                Ver detalhes <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Permanência — mês de permanência atual */}
          <Card className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-orange-400" onClick={() => onPageChange?.("permanencia")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-orange-600">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Permanência</span>
                </div>
                <StatusBadgeHigh value={permanenciaMesAtual.percentual_adimplentes} good={55} warn={45} />
              </div>
              <p className="text-[10px] text-gray-400 mb-2">Hab. em {mesRefPermanencia} · {permanenciaMesAtual.total} clientes</p>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold text-gray-900">{permanenciaMesAtual.percentual_adimplentes.toFixed(2)}%</span>
                <span className="text-xs text-gray-400">adimplentes</span>
              </div>
              <Progress value={Math.min(permanenciaMesAtual.percentual_adimplentes, 100)} className="h-1.5 [&>div]:bg-orange-400 mb-2" />

              {permanenciaGap && (
                <p className="text-xs mt-2 flex items-center gap-1">
                  {permanenciaGap.acima ? (
                    <><TrendingUp className="w-3 h-3 text-green-600" /><span className="text-green-700">{permanenciaGap.quantidade} acima da meta (55%)</span></>
                  ) : (
                    <><TrendingDown className="w-3 h-3 text-red-600" /><span className="text-red-700">Faltam {permanenciaGap.quantidade} para 55%</span></>
                  )}
                </p>
              )}
              <div className="flex items-center gap-1 text-xs text-orange-600 mt-3 font-medium">
                Ver detalhes <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── METAS COMERCIAIS ────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Metas Comerciais — {mesLabel}
        </h3>
        {metaEmpresa ? (
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-green-400" onClick={() => onPageChange?.("metas")}>
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-green-600">
                  <Target className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Total Geral</span>
                  <span className="text-[10px] text-gray-400 font-normal normal-case">· Meta PayTV</span>
                </div>
                <StatusBadgeHigh value={metaEmpresa.percentual_geral} good={80} warn={50} />
              </div>

              {/* Layout horizontal: resumo à esquerda, mini-cards à direita */}
              <div className="flex gap-4 items-start">
                {/* Resumo geral */}
                <div className="flex-shrink-0 w-52">
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-2xl font-bold text-gray-900">{metaEmpresa.percentual_geral.toFixed(2)}%</span>
                    <span className="text-xs text-gray-500">({metaEmpresa.total_vendas}/{metaEmpresa.total_meta})</span>
                  </div>
                  <Progress value={Math.min(metaEmpresa.percentual_geral, 100)} className="h-1.5 [&>div]:bg-green-500 mb-2" />
                  <div className="grid grid-cols-3 gap-1">
                    <div className="text-center bg-green-50 rounded p-1.5">
                      <p className="font-bold text-green-700 text-sm">{empresaBreakdown.finalizado}</p>
                      <p className="text-[10px] text-gray-500">Finalizado</p>
                    </div>
                    <div className="text-center bg-yellow-50 rounded p-1.5">
                      <p className="font-bold text-yellow-700 text-sm">{empresaBreakdown.agPagamento}</p>
                      <p className="text-[10px] text-gray-500">Ag. Pgto</p>
                      {(empresaBreakdown.agPagamentoPos > 0 || empresaBreakdown.agPagamentoFlex > 0) && (
                        <p className="text-[9px] text-yellow-700 font-medium mt-0.5 leading-tight">
                          {empresaBreakdown.agPagamentoPos > 0 && <span className="block">{empresaBreakdown.agPagamentoPos} Pós-Pago</span>}
                          {empresaBreakdown.agPagamentoFlex > 0 && <span className="block">{empresaBreakdown.agPagamentoFlex} Flex</span>}
                        </p>
                      )}
                    </div>
                    <div className="text-center bg-orange-50 rounded p-1.5">
                      <p className="font-bold text-orange-700 text-sm">{empresaBreakdown.agHabilitacao}</p>
                      <p className="text-[10px] text-gray-500">Ag. Hab.</p>
                      {(empresaBreakdown.agHabilitacaoPos > 0 || empresaBreakdown.agHabilitacaoFlex > 0) && (
                        <p className="text-[9px] text-orange-700 font-medium mt-0.5 leading-tight">
                          {empresaBreakdown.agHabilitacaoPos > 0 && <span className="block">{empresaBreakdown.agHabilitacaoPos} Pós-Pago</span>}
                          {empresaBreakdown.agHabilitacaoFlex > 0 && <span className="block">{empresaBreakdown.agHabilitacaoFlex} Flex</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mini-cards por categoria — linha compacta */}
                {categoriasComMeta.length > 0 && (
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    {categoriasComMeta.map((cat) => (
                      <div key={cat.categoria} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-2 py-1 gap-2">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase truncate flex-shrink-0 w-28">{cat.categoria}</p>
                        <Progress value={Math.min(cat.percentual_atingido, 100)} className="h-1 flex-1 min-w-0" />
                        <p className={`text-xs font-bold flex-shrink-0 w-14 text-right ${pctColor(cat.percentual_atingido, 100)}`}>
                          {cat.percentual_atingido.toFixed(2)}%
                        </p>
                        <p className="text-[10px] text-gray-400 flex-shrink-0 w-10 text-right">{cat.vendas_realizadas}/{cat.meta_definida}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="p-4 text-sm text-gray-400">Meta não cadastrada para este mês.</CardContent></Card>
        )}
      </div>

      {/* ── OTIMIZAÇÃO & CONSUMO ─────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Otimização &amp; Consumo — {mesLabel}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Consumo AT (antenas) */}
          <Card className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-purple-400" onClick={() => onPageChange?.("time")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-purple-600">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Consumo Antena</span>
                </div>
                <StatusBadgeLow value={pctConsumoAntena} good={40} warn={60} />
              </div>
              <span className="text-2xl font-bold text-gray-900">{pct(pctConsumoAntena)}</span>
              <p className="text-xs text-gray-500 mt-1">consumo de antenas ({volumeConsumoAntena}/{volumeOS} OS)</p>
              <Progress value={pctConsumoAntena} className="h-1.5 [&>div]:bg-purple-400 mt-2" />
              <div className="flex items-center gap-1 text-xs text-purple-600 mt-3 font-medium">
                Ver detalhes <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Consumo PP (LNBF) */}
          <Card className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-violet-400" onClick={() => onPageChange?.("time")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-violet-600">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Consumo LNBs</span>
                </div>
                <StatusBadgeLow value={pctConsumoLnbs} good={40} warn={60} />
              </div>
              <span className="text-2xl font-bold text-gray-900">{pct(pctConsumoLnbs)}</span>
              <p className="text-xs text-gray-500 mt-1">consumo de LNBF ({volumeConsumoLnbs}/{volumeOS} OS)</p>
              <Progress value={pctConsumoLnbs} className="h-1.5 [&>div]:bg-violet-400 mt-2" />
              <div className="flex items-center gap-1 text-xs text-violet-600 mt-3 font-medium">
                Ver detalhes <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Consumo Excessivo */}
          <Card className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-rose-400" onClick={() => onPageChange?.("time")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-rose-600 mb-3">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Consumo Excessivo</span>
              </div>

              {/* AT Corretiva */}
              {consumoExcessivo.atCorretiva.volume > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-red-700 uppercase mb-1">
                    AT Corretiva · {consumoExcessivo.atCorretiva.volume} OS
                  </p>
                  <ConsumoRow label="Antenas" consumo={consumoExcessivo.atCorretiva.antenas.consumo} pdv={consumoExcessivo.atCorretiva.antenas.pdv} gatilho={consumoExcessivo.atCorretiva.antenas.gatilho} />
                  <ConsumoRow label="Cabo"    consumo={consumoExcessivo.atCorretiva.cabo.consumo}    pdv={consumoExcessivo.atCorretiva.cabo.pdv}    gatilho={consumoExcessivo.atCorretiva.cabo.gatilho} unidade="m" />
                  <ConsumoRow label="LNBs"    consumo={consumoExcessivo.atCorretiva.lnbs.consumo}   pdv={consumoExcessivo.atCorretiva.lnbs.pdv}   gatilho={consumoExcessivo.atCorretiva.lnbs.gatilho} />
                </div>
              )}

              {/* UP/DOWN */}
              {consumoExcessivo.upDown.volume > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-orange-700 uppercase mb-1">
                    UP/DOWN · {consumoExcessivo.upDown.volume} OS
                  </p>
                  <ConsumoRow label="Antenas" consumo={consumoExcessivo.upDown.antenas.consumo} pdv={consumoExcessivo.upDown.antenas.pdv} gatilho={consumoExcessivo.upDown.antenas.gatilho} />
                  <ConsumoRow label="Cabo"    consumo={consumoExcessivo.upDown.cabo.consumo}    pdv={consumoExcessivo.upDown.cabo.pdv}    gatilho={consumoExcessivo.upDown.cabo.gatilho} unidade="m" />
                  <ConsumoRow label="LNBs"    consumo={consumoExcessivo.upDown.lnbs.consumo}   pdv={consumoExcessivo.upDown.lnbs.pdv}   gatilho={consumoExcessivo.upDown.lnbs.gatilho} />
                </div>
              )}

              {consumoExcessivo.atCorretiva.volume === 0 && consumoExcessivo.upDown.volume === 0 && (
                <p className="text-sm text-gray-400">Sem dados no mês.</p>
              )}

              <div className="flex items-center gap-1 text-xs text-rose-600 mt-3 font-medium">
                Ver detalhes <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
