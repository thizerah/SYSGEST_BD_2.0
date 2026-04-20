import { useMemo } from "react";
import useData from "@/context/useData";
import { BACKLOG_STATUS } from "@/context/DataUtils";

// Tipos que sempre aparecem na tabela de reaberturas (mesmos do MetricsOverview)
const REQUIRED_TYPES = ["Corretiva", "Corretiva BL", "Ponto Principal", "Ponto Principal BL"];
const TV_MAIN_TYPES = ["Ponto Principal", "Ponto Principal BL", "Corretiva", "Corretiva BL"];

interface ReopeningByType {
  reopenings: number;
  totalOriginals: number;
  backlogCount: number;
  reopeningRate: number;
}

export interface ReopeningMetricsByMonth {
  reopeningRate: number;
  reopeningsByOriginalType: Record<string, ReopeningByType>;
  reopeningsByTechnicianTV: Record<string, number>;
}

// Extrai { month: "MM", year: "YYYY" } de qualquer formato de data suportado
function extractMonthYear(dateStr: string): { month: string; year: string } | null {
  if (!dateStr?.trim()) return null;
  try {
    if (dateStr.includes("/")) {
      const parts = dateStr.split(" ")[0].split("/");
      return { month: parts[1].padStart(2, "0"), year: parts[2] };
    }
    if (dateStr.includes("-")) {
      const parts = dateStr.split("T")[0].split("-");
      return { month: parts[1], year: parts[0] };
    }
    const d = new Date(dateStr);
    return { month: (d.getMonth() + 1).toString().padStart(2, "0"), year: d.getFullYear().toString() };
  } catch {
    return null;
  }
}

/**
 * Replica exatamente a lógica de cálculo da tabela "Reaberturas por Tipo da OS Original"
 * do MetricsOverview — incluindo backlog no denominador.
 *
 * @param targetMonth mês no formato "MM" (ex: "04")
 * @param targetYear  ano no formato "YYYY" (ex: "2026")
 */
export function useReopeningMetricsByMonth(
  targetMonth: string,
  targetYear: string
): ReopeningMetricsByMonth {
  const { serviceOrders, getReopeningPairs } = useData();

  return useMemo(() => {
    // ── 1. OS finalizadas OU criadas no mês alvo ──────────────────────────
    const filteredOrders = serviceOrders.filter((order) => {
      const byFin = order.data_finalizacao
        ? extractMonthYear(order.data_finalizacao)
        : null;
      if (byFin && byFin.month === targetMonth && byFin.year === targetYear)
        return true;
      const byCria = order.data_criacao
        ? extractMonthYear(order.data_criacao)
        : null;
      return !!(byCria && byCria.month === targetMonth && byCria.year === targetYear);
    });

    // ── 2. Pares de reabertura cuja OS secundária foi criada no mês alvo ──
    const allPairs = getReopeningPairs();
    const filteredPairs = allPairs.filter((pair) => {
      const d = extractMonthYear(pair.reopeningOrder.data_criacao || "");
      return d?.month === targetMonth && d?.year === targetYear;
    });

    const isBacklog = (status: string) =>
      BACKLOG_STATUS.some((s) =>
        (status || "").toUpperCase().includes(s.toUpperCase())
      );

    // ── 3. Conta OS originais e backlog por tipo (mesma lógica do MetricsOverview) ─
    const originalOrdersByType: Record<string, number> = {};
    const backlogByType: Record<string, number> = {};

    // Inicializar tipos obrigatórios com zero
    REQUIRED_TYPES.forEach((t) => {
      originalOrdersByType[t] = 0;
    });

    filteredOrders.forEach((order) => {
      if (!order.subtipo_servico) return;
      // Match exato primeiro, depois parcial
      let matched = false;
      for (const reqType of REQUIRED_TYPES) {
        if (order.subtipo_servico === reqType) {
          originalOrdersByType[reqType]++;
          matched = true;
          break;
        }
      }
      if (!matched) {
        for (const reqType of REQUIRED_TYPES) {
          if (order.subtipo_servico.includes(reqType)) {
            originalOrdersByType[reqType]++;
            break;
          }
        }
      }

      // Backlog: contagem separada (igual ao MetricsOverview)
      if (isBacklog(order.status)) {
        let bMatched = false;
        for (const reqType of REQUIRED_TYPES) {
          if (order.subtipo_servico === reqType) {
            backlogByType[reqType] = (backlogByType[reqType] || 0) + 1;
            bMatched = true;
            break;
          }
        }
        if (!bMatched) {
          for (const reqType of REQUIRED_TYPES) {
            if (order.subtipo_servico.includes(reqType)) {
              backlogByType[reqType] = (backlogByType[reqType] || 0) + 1;
              break;
            }
          }
        }
      }
    });

    // ── 4. Reaberturas e técnicos TV por tipo original ────────────────────
    const reopeningsCountByType: Record<string, number> = {};
    const reopeningsByTechnicianTV: Record<string, number> = {};

    filteredPairs.forEach((pair) => {
      const originalType = pair.originalOrder.subtipo_servico || "";
      for (const reqType of REQUIRED_TYPES) {
        if (originalType === reqType || originalType.includes(reqType)) {
          reopeningsCountByType[reqType] =
            (reopeningsCountByType[reqType] || 0) + 1;
          break;
        }
      }

      const category = pair.originalServiceCategory || "";
      if (category.includes("TV")) {
        const tech = pair.originalOrder.nome_tecnico || "Desconhecido";
        reopeningsByTechnicianTV[tech] =
          (reopeningsByTechnicianTV[tech] || 0) + 1;
      }
    });

    // ── 5. Monta estrutura final por tipo (denominador = total + backlog) ─
    const reopeningsByOriginalType: Record<string, ReopeningByType> = {};
    REQUIRED_TYPES.forEach((type) => {
      const totalOriginals = originalOrdersByType[type] || 0;
      const backlogCount = backlogByType[type] || 0;
      const reopenings = reopeningsCountByType[type] || 0;
      const totalWithBacklog = totalOriginals + backlogCount;
      reopeningsByOriginalType[type] = {
        reopenings,
        totalOriginals,
        backlogCount,
        reopeningRate:
          totalWithBacklog > 0 ? (reopenings / totalWithBacklog) * 100 : 0,
      };
    });

    // ── 6. Taxa geral de reabertura (igual ao MetricsOverview — sem backlog no denom.) ─
    const totalMainServices = filteredOrders.filter((o) =>
      TV_MAIN_TYPES.some((t) => o.subtipo_servico?.includes(t))
    ).length;
    const reopeningRate =
      totalMainServices > 0
        ? (filteredPairs.length / totalMainServices) * 100
        : 0;

    return { reopeningRate, reopeningsByOriginalType, reopeningsByTechnicianTV };
  }, [serviceOrders, getReopeningPairs, targetMonth, targetYear]);
}
