import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Printer, Search, User } from "lucide-react";

import type { ServiceOrder } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PRINT_STYLE_ID = "technician-detail-print-styles";

function parseOrderDate(value: string | undefined): number {
  if (!value) return 0;
  try {
    if (value.includes("/")) {
      const parts = value.split(" ")[0].split("/").map((p) => parseInt(p, 10));
      if (parts.length >= 3 && !parts.some(Number.isNaN)) {
        const [day, month, year] = parts;
        return new Date(year, month - 1, day).getTime();
      }
    }
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? 0 : t;
  } catch {
    return 0;
  }
}

/** Mesma regra do quadro “Quantidade de Serviços por Técnico” em MetricsOverview */
export function orderMatchesServiceTypeSummaryKey(o: ServiceOrder, key: string): boolean {
  const sub = o.subtipo_servico ?? "";
  switch (key) {
    case "Corretiva":
      return sub.includes("Corretiva") && !sub.includes("BL");
    case "Corretiva BL":
      return sub.includes("Corretiva BL");
    case "Ponto Principal":
      return sub.includes("Ponto Principal") && !sub.includes("BL");
    case "Prestação de Serviço":
      return sub.includes("Prestação de Serviço") && !sub.includes("BL");
    case "Prestação de Serviço BL":
      return sub.includes("Prestação de Serviço BL");
    case "Preventiva":
      return sub.includes("Preventiva") && !sub.includes("BL");
    case "Preventiva BL":
      return sub.includes("Preventiva BL");
    case "Sistema Opcional":
      return sub.includes("Sistema Opcional");
    case "Cancelamento Voluntário":
      return sub.includes("Cancelamento Voluntário");
    case "Kit TVRO":
      return sub.includes("Kit TVRO");
    case "Substituição":
      return sub.includes("Substituição");
    default:
      return false;
  }
}

/** Exibe datas ISO ou texto já em DD/MM/AAAA como dd/MM/yyyy HH:mm (pt-BR) */
export function formatServiceOrderDateDisplay(value: string | undefined): string {
  if (!value?.trim()) return "—";
  const v = value.trim();
  if (v.includes("/") && !v.includes("T")) {
    const [datePart, ...rest] = v.split(/\s+/);
    const timePart = rest.join(" ");
    if (timePart) {
      const hm = timePart.length >= 5 ? timePart.slice(0, 5) : timePart;
      return `${datePart} ${hm}`;
    }
    return datePart;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return format(d, "dd/MM/yyyy HH:mm");
}

function sanitizeFilename(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 72) || "tecnico";
}

const SUMMARY_LABELS: { key: string; label: string }[] = [
  { key: "Corretiva", label: "Corretiva" },
  { key: "Corretiva BL", label: "Corr. BL" },
  { key: "Ponto Principal", label: "Ponto princ." },
  { key: "Prestação de Serviço", label: "Prest. serv." },
  { key: "Prestação de Serviço BL", label: "Prest. BL" },
  { key: "Preventiva", label: "Preventiva" },
  { key: "Preventiva BL", label: "Prev. BL" },
  { key: "Sistema Opcional", label: "Sist. opc." },
  { key: "Cancelamento Voluntário", label: "Canc. vol." },
  { key: "Kit TVRO", label: "Kit TVRO" },
  { key: "Substituição", label: "Substituição" },
];

export interface TechnicianServicesDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicianName: string;
  orders: ServiceOrder[];
  periodLabel: string;
  servicesByType: Record<string, number>;
}

export function TechnicianServicesDetailModal({
  open,
  onOpenChange,
  technicianName,
  orders,
  periodLabel,
  servicesByType,
}: TechnicianServicesDetailModalProps) {
  const [query, setQuery] = useState("");
  const [selectedServiceKey, setSelectedServiceKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedServiceKey(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const style = document.createElement("style");
    style.id = PRINT_STYLE_ID;
    style.textContent = `
      @media print {
        @page {
          margin: 8mm;
          size: auto;
        }
        html, body {
          height: auto !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
        /*
         * O #root inteiro ainda ocupava altura no fluxo de impressão (visibility:hidden não tira layout),
         * gerando várias páginas em branco antes do relatório.
         */
        body > #root {
          display: none !important;
        }
        .technician-services-print-dialog {
          position: static !important;
          inset: auto !important;
          left: auto !important;
          top: auto !important;
          transform: none !important;
          translate: none !important;
          max-width: 100% !important;
          width: 100% !important;
          max-height: none !important;
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          box-shadow: none !important;
          background: white !important;
          color: #111 !important;
          display: block !important;
          gap: 0 !important;
        }
        .technician-services-print-dialog * {
          color: inherit !important;
        }
        #technician-detail-print-root {
          position: relative !important;
          left: auto !important;
          top: auto !important;
          width: 100% !important;
          padding: 6px 8px !important;
          background: white !important;
          color: #111 !important;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        #technician-detail-table-scroll {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
          border: none !important;
          background: white !important;
          padding: 4px 4px !important;
        }
        /* Shadcn Table envolve <table> em div overflow-auto — evita área fantasma na impressão */
        #technician-detail-table-scroll > div.relative {
          overflow: visible !important;
          height: auto !important;
        }
        #technician-detail-print-root table {
          font-size: 9px !important;
          line-height: 1.15 !important;
          border-collapse: collapse !important;
          page-break-inside: auto;
        }
        #technician-detail-print-root th,
        #technician-detail-print-root td {
          color: #111 !important;
          padding: 2px 5px !important;
          line-height: 1.15 !important;
          height: auto !important;
          vertical-align: top !important;
        }
        #technician-detail-print-root th {
          font-size: 9px !important;
        }
        #technician-detail-print-root tr {
          page-break-inside: auto !important;
        }
        #technician-detail-print-root thead {
          display: table-header-group;
        }
        #technician-detail-print-root .sticky {
          position: static !important;
          box-shadow: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.getElementById(PRINT_STYLE_ID)?.remove();
    };
  }, [open]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort(
      (a, b) => parseOrderDate(b.data_finalizacao) - parseOrderDate(a.data_finalizacao),
    );
  }, [orders]);

  const ordersBySelectedType = useMemo(() => {
    if (!selectedServiceKey) return sortedOrders;
    return sortedOrders.filter((o) => orderMatchesServiceTypeSummaryKey(o, selectedServiceKey));
  }, [sortedOrders, selectedServiceKey]);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordersBySelectedType;
    return ordersBySelectedType.filter((o) => {
      const hay = [
        o.codigo_os,
        o.codigo_item,
        o.nome_cliente,
        o.codigo_cliente,
        o.cidade,
        o.bairro,
        o.tipo_servico,
        o.subtipo_servico,
        o.status,
        o.data_criacao,
        o.data_finalizacao,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [ordersBySelectedType, query]);

  const exportExcel = () => {
    const rows = orders.map((o) => ({
      "Código OS": o.codigo_os,
      Item: o.codigo_item ?? "",
      Cliente: o.nome_cliente,
      "Código cliente": o.codigo_cliente,
      Cidade: o.cidade,
      Bairro: o.bairro,
      "Tipo serviço": o.tipo_servico,
      Subtipo: o.subtipo_servico,
      Status: o.status,
      "Data criação": formatServiceOrderDateDisplay(o.data_criacao),
      "Data finalização": formatServiceOrderDateDisplay(o.data_finalizacao),
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Serviços");
    const slug = sanitizeFilename(technicianName);
    XLSX.writeFile(wb, `Servicos_${slug}_${sanitizeFilename(periodLabel)}.xlsx`);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const typeFilterableKeys = useMemo(
    () => SUMMARY_LABELS.filter(({ key }) => (servicesByType[key] ?? 0) > 0),
    [servicesByType],
  );

  const signatureDateLabel = format(new Date(), "dd/MM/yyyy");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="technician-services-print-dialog max-h-[92vh] flex flex-col gap-0 p-0 sm:max-w-5xl overflow-hidden border-indigo-200/80">
        <div id="technician-detail-print-root" className="flex flex-col min-h-0 flex-1 bg-background">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0 rounded-t-lg print:bg-white print:text-black print:border-gray-400 print:px-3 print:pb-2 print:pt-3 print:gap-1">
            <DialogTitle className="flex items-center gap-2 text-xl text-white print:text-black print:text-base print:leading-tight">
              <User className="h-6 w-6 opacity-90 print:hidden" />
              <span className="print:block">
                Relatório de serviços — <span className="font-semibold">{technicianName}</span>
              </span>
            </DialogTitle>
            <DialogDescription className="text-indigo-100 text-sm print:text-gray-800 print:text-xs print:leading-snug">
              Período: {periodLabel} · {orders.length} serviço(s) no período (OS com status diferente de Cancelada)
            </DialogDescription>

            <div className="technician-print-summary mt-4 hidden print:mt-2 print:block rounded border border-black bg-white text-black">
              <p className="summary-title border-b border-black bg-gray-100 px-2 py-1 text-xs font-bold uppercase tracking-wide print:px-2 print:py-0.5 print:text-[9px]">
                Quantidades por tipo de serviço (período)
              </p>
              <table className="w-full border-collapse text-xs print:text-[9px]">
                <tbody>
                  {SUMMARY_LABELS.map(({ key, label }) => {
                    const n = servicesByType[key] ?? 0;
                    if (n <= 0) return null;
                    return (
                      <tr key={key}>
                        <td className="border border-gray-400 px-2 py-1 print:px-1.5 print:py-0">{label}</td>
                        <td className="border border-gray-400 px-2 py-1 text-right tabular-nums font-medium print:px-1.5 print:py-0">
                          {n}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="border border-gray-400 px-2 py-1 print:px-1.5 print:py-0">Total</td>
                    <td className="border border-gray-400 px-2 py-1 text-right tabular-nums print:px-1.5 print:py-0">
                      {orders.length}
                    </td>
                  </tr>
                </tfoot>
              </table>
              <p className="border-t border-black px-2 py-2 text-[11px] leading-snug print:px-2 print:py-1 print:text-[9px] print:leading-tight">
                Listagem abaixo: <strong>{filteredOrders.length}</strong> registro(s)
                {filteredOrders.length !== orders.length ? (
                  <>
                    {" "}
                    (filtros de tipo/busca aplicados na tela; o relatório numérico acima refere-se ao período
                    completo)
                  </>
                ) : null}
                .
              </p>
            </div>

            {typeFilterableKeys.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 print:hidden" role="group" aria-label="Filtrar por tipo de serviço">
                <button
                  type="button"
                  onClick={() => setSelectedServiceKey(null)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600 ${
                    selectedServiceKey === null
                      ? "border-white bg-white/25 text-white shadow-sm"
                      : "border-white/40 bg-white/10 text-indigo-50 hover:bg-white/20"
                  }`}
                >
                  Todos · {orders.length}
                </button>
                {typeFilterableKeys.map(({ key, label }) => {
                  const n = servicesByType[key] ?? 0;
                  const selected = selectedServiceKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedServiceKey((prev) => (prev === key ? null : key))}
                      title={selected ? "Clique para mostrar todos os tipos" : `Filtrar: ${label}`}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600 ${
                        selected
                          ? "border-white bg-white text-indigo-700 shadow-sm"
                          : "border-white/40 bg-white/10 text-indigo-50 hover:bg-white/20"
                      }`}
                    >
                      {label}: {n}
                    </button>
                  );
                })}
              </div>
            )}
          </DialogHeader>

          <div className="px-6 py-3 border-b shrink-0 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between bg-muted/30 print:hidden">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por OS, cliente, cidade, tipo..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground shrink-0 text-right sm:text-left">
              Exibindo <span className="font-medium text-foreground">{filteredOrders.length}</span> de{" "}
              <span className="font-medium text-foreground">{ordersBySelectedType.length}</span>
              {selectedServiceKey ? (
                <span className="text-muted-foreground"> · {orders.length} no período completo</span>
              ) : null}
            </p>
          </div>

          <div
            id="technician-detail-table-scroll"
            className="min-h-[220px] h-[min(52vh,560px)] overflow-y-auto overflow-x-auto border-y border-border bg-muted/10 px-4 py-3 [scrollbar-gutter:stable] print:min-h-0 print:h-auto print:overflow-visible print:border-y print:border-gray-300 print:bg-white"
          >
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b bg-muted/90 sticky top-0 z-10 shadow-sm backdrop-blur-sm print:bg-gray-100">
                    <TableHead className="w-[88px]">OS</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden lg:table-cell print:table-cell">Cidade</TableHead>
                    <TableHead>Subtipo</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[110px] text-right">Finalização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        Nenhum serviço encontrado para este filtro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((o, idx) => (
                      <TableRow key={`${o.codigo_os}-${o.codigo_item ?? idx}`}>
                        <TableCell className="font-mono text-xs font-medium">{o.codigo_os}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="line-clamp-2">{o.nome_cliente}</span>
                          <span className="block text-[11px] text-muted-foreground truncate">
                            {o.codigo_cliente}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell print:table-cell text-sm">{o.cidade}</TableCell>
                        <TableCell className="max-w-[220px] text-sm">
                          <span className="line-clamp-2">{o.subtipo_servico || o.tipo_servico}</span>
                        </TableCell>
                        <TableCell className="text-xs">{o.status}</TableCell>
                        <TableCell className="text-right text-xs whitespace-nowrap tabular-nums">
                          {formatServiceOrderDateDisplay(o.data_finalizacao)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          </div>

          <section
            className="hidden print:mt-4 print:block print:break-inside-avoid rounded-lg border-2 border-black bg-white px-5 py-6 text-black print:px-4 print:py-4"
            aria-label="Declaração e assinatura"
          >
            <p className="text-sm leading-relaxed print:text-xs print:leading-snug">
              Declaro que realizei os serviços constantes na listagem deste relatório, correspondentes ao período e às
              quantidades informadas acima.
            </p>
            <div className="mt-10 grid gap-10 sm:grid-cols-2 sm:gap-16 print:mt-5 print:gap-8">
              <div className="text-center sm:text-left">
                <p className="text-base font-semibold print:text-sm">{technicianName}</p>
                <div className="mx-auto mt-12 max-w-xs border-t border-black pt-2 text-center text-xs print:mx-0 print:mt-8 sm:mx-0">
                  Assinatura do técnico
                </div>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-base font-semibold tabular-nums print:text-sm">{signatureDateLabel}</p>
                <div className="mx-auto mt-12 max-w-xs border-t border-black pt-2 text-center text-xs print:mx-0 print:mt-8 sm:mx-0">
                  Data (dia da conferência / assinatura)
                </div>
              </div>
            </div>
          </section>

          <DialogFooter className="px-6 py-4 border-t gap-2 sm:gap-2 shrink-0 bg-muted/20 flex-row flex-wrap justify-between sm:justify-end print:hidden">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button type="button" variant="outline" onClick={exportExcel} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button type="button" variant="outline" onClick={handlePrintPdf} className="gap-2">
                <Printer className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
