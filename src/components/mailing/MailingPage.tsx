import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import useData from '@/context/useData';
import { useAuth } from '@/context/useAuth';
import { normalizeCityName, normalizeNeighborhoodName } from '@/context/DataUtils';
import type { ServiceOrder, Venda, VendaMeta, VendaFibra, VendaMovel, VendaNovaParabolica } from '@/types';
import { fetchVendasFibra, fetchVendasMovel, fetchVendasNovaParabolica } from '@/lib/cadastro-comercial';
import { Mail, Download, Loader2, Search, ChevronLeft, ChevronRight, ChevronDown, Eraser } from 'lucide-react';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 25;

const NA = '—';

export interface MailingRow {
  nome: string;
  cpf: string;
  telefone: string;
  cidade: string;
  bairro: string;
  caracteristica: string;
  categoria: string;
  produto: string;
  tipo_servico: string;
  motivo: string;
  data: string;
}

function normTel(s: string | null | undefined): string {
  if (!s) return '';
  return String(s).replace(/\D/g, '').slice(-11);
}

function normCidade(c: string | null | undefined): string {
  if (!c || !String(c).trim()) return NA;
  const v = normalizeCityName(c);
  return v === 'Desconhecido' ? NA : v;
}

function normBairro(b: string | null | undefined): string {
  if (!b || !String(b).trim()) return NA;
  const v = normalizeNeighborhoodName(b);
  return v === 'Desconhecido' ? NA : v;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return NA;
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return NA;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return NA;
  }
}

function buildMailingRows(
  serviceOrders: ServiceOrder[],
  vendas: Venda[],
  vendasMeta: VendaMeta[],
  vendasFibra: VendaFibra[],
  vendasMovel: VendaMovel[],
  vendasNovaParabolica: VendaNovaParabolica[]
): MailingRow[] {
  const rows: MailingRow[] = [];
  const byCpfComercial = new Map<string, { nome: string; cpf: string; telefone: string; cidade: string; bairro: string; categoria: string; produto: string; data: string }>();
  const comercialByTel = new Map<string, string>(); // tel -> cpf

  type VendaEntry =
    | { tipo: 'venda'; r: Venda }
    | { tipo: 'meta'; r: VendaMeta }
    | { tipo: 'fibra'; r: VendaFibra }
    | { tipo: 'movel'; r: VendaMovel }
    | { tipo: 'np'; r: VendaNovaParabolica };

  const allVendas: VendaEntry[] = [
    ...vendas.map((r) => ({ tipo: 'venda' as const, r })),
    ...vendasMeta.map((r) => ({ tipo: 'meta' as const, r })),
    ...vendasFibra.map((r) => ({ tipo: 'fibra' as const, r })),
    ...vendasMovel.map((r) => ({ tipo: 'movel' as const, r })),
    ...vendasNovaParabolica.map((r) => ({ tipo: 'np' as const, r })),
  ];

  for (const entry of allVendas) {
    let cpfNorm: string;
    let nome: string;
    let telefone: string;
    let cidade: string;
    let bairro: string;
    let categoria: string;
    let produto: string;
    let data: string;

    if (entry.tipo === 'venda') {
      cpfNorm = String(entry.r.cpf ?? '').trim();
      nome = entry.r.nome_fantasia?.trim() || entry.r.nome_proprietario || '';
      telefone = entry.r.telefone_celular ?? '';
      cidade = entry.r.cidade ?? '';
      bairro = entry.r.bairro ?? '';
      categoria = entry.r.agrupamento_produto ?? '';
      produto = entry.r.produto_principal ?? '';
      data = entry.r.data_habilitacao ?? '';
    } else if (entry.tipo === 'meta') {
      cpfNorm = String(entry.r.cpf ?? '').trim();
      nome = entry.r.nome_fantasia?.trim() || entry.r.nome_proprietario || '';
      telefone = entry.r.telefone_celular ?? '';
      cidade = entry.r.cidade ?? '';
      bairro = entry.r.bairro ?? '';
      categoria = entry.r.categoria ?? '';
      produto = entry.r.produto ?? '';
      data = entry.r.data_venda ?? '';
    } else if (entry.tipo === 'fibra') {
      cpfNorm = String(entry.r.cpf_cnpj ?? '').trim();
      nome = entry.r.nome_completo ?? '';
      telefone = entry.r.telefone ?? '';
      cidade = entry.r.cidade ?? '';
      bairro = entry.r.bairro ?? '';
      categoria = 'Fibra';
      produto = entry.r.plano_fibra_nome ?? '';
      data = entry.r.data_venda ?? '';
    } else if (entry.tipo === 'movel') {
      cpfNorm = String(entry.r.cpf ?? '').trim();
      nome = entry.r.nome_completo ?? '';
      telefone = entry.r.telefone ?? '';
      cidade = entry.r.cidade ?? '';
      bairro = entry.r.bairro ?? '';
      categoria = 'Móvel';
      produto = entry.r.plano_movel_nome ?? '';
      data = entry.r.data_venda ?? '';
    } else {
      cpfNorm = String(entry.r.cpf ?? '').trim();
      nome = entry.r.nome_proprietario ?? '';
      telefone = entry.r.telefone_celular ?? '';
      cidade = entry.r.cidade ?? '';
      bairro = entry.r.bairro ?? '';
      categoria = 'Nova Parabólica';
      produto = 'Nova Parabólica';
      data = entry.r.data_venda ?? '';
    }

    if (!cpfNorm || byCpfComercial.has(cpfNorm)) continue;

    byCpfComercial.set(cpfNorm, { nome, cpf: cpfNorm, telefone, cidade, bairro, categoria, produto, data });
    const tel = normTel(telefone);
    if (tel) comercialByTel.set(tel, cpfNorm);
  }

  // Operacional: agregar por cliente (codigo_cliente) para uma linha por cliente; deduplicação por codigo_item já feita ao agrupar
  const operacionalByCliente = new Map<string, { nome: string; telefone: string; cidade: string; bairro: string; tipos: string[]; motivos: string[]; datas: string[] }>();

  for (const os of serviceOrders) {
    const key = os.codigo_cliente || `${os.nome_cliente}-${os.telefone_celular || ''}`;
    const existing = operacionalByCliente.get(key);
    const tipo = os.subtipo_servico || os.tipo_servico || '';
    const motivo = os.motivo ?? '';
    const data = os.data_finalizacao || os.data_criacao || '';

    if (existing) {
      if (tipo && !existing.tipos.includes(tipo)) existing.tipos.push(tipo);
      if (motivo && !existing.motivos.includes(motivo)) existing.motivos.push(motivo);
      if (data) existing.datas.push(data);
    } else {
      operacionalByCliente.set(key, {
        nome: os.nome_cliente ?? '',
        telefone: os.telefone_celular ?? '',
        cidade: os.cidade ?? '',
        bairro: os.bairro ?? '',
        tipos: tipo ? [tipo] : [],
        motivos: motivo ? [motivo] : [],
        datas: data ? [data] : [],
      });
    }
  }

  const mergedCpf = new Set<string>();

  for (const [, op] of operacionalByCliente) {
    const tel = normTel(op.telefone);
    const cpfComercial = tel ? comercialByTel.get(tel) : null;
    const comercialRow = cpfComercial ? byCpfComercial.get(cpfComercial) : null;

    const tipoStr = op.tipos.length ? op.tipos.join('; ') : NA;
    const motivoStr = op.motivos.length ? op.motivos.join('; ') : NA;
    const dataStr = op.datas.length ? formatDate(op.datas[op.datas.length - 1]) : NA;

    if (comercialRow) {
      mergedCpf.add(cpfComercial!);
      rows.push({
        nome: comercialRow.nome || op.nome,
        cpf: comercialRow.cpf || NA,
        telefone: op.telefone || NA,
        cidade: normCidade(comercialRow.cidade || op.cidade),
        bairro: normBairro(comercialRow.bairro || op.bairro),
        caracteristica: 'Comercial e Operacional',
        categoria: comercialRow.categoria || NA,
        produto: comercialRow.produto || NA,
        tipo_servico: tipoStr,
        motivo: motivoStr,
        data: dataStr,
      });
    } else {
      rows.push({
        nome: op.nome || NA,
        cpf: NA,
        telefone: op.telefone || NA,
        cidade: normCidade(op.cidade),
        bairro: normBairro(op.bairro),
        caracteristica: 'Operacional',
        categoria: NA,
        produto: NA,
        tipo_servico: tipoStr,
        motivo: motivoStr,
        data: dataStr,
      });
    }
  }

  for (const [cpf, cr] of byCpfComercial) {
    if (mergedCpf.has(cpf)) continue;
    rows.push({
      nome: cr.nome || NA,
      cpf: cpf || NA,
      telefone: cr.telefone || NA,
      cidade: normCidade(cr.cidade),
      bairro: normBairro(cr.bairro),
      caracteristica: 'Comercial',
      categoria: cr.categoria || NA,
      produto: cr.produto || NA,
      tipo_servico: NA,
      motivo: NA,
      data: formatDate(cr.data),
    });
  }

  return rows;
}

function applyFilters(
  rows: MailingRow[],
  filtroAtuacao: string[],
  filtroCidade: string[],
  filtroBairro: string[],
  filtroTipoServico: string[],
  filtroMotivo: string[],
  filtroCategoria: string[],
  filtroProduto: string[],
  dataInicio: string,
  dataFim: string
): MailingRow[] {
  let list = rows;
  if (filtroAtuacao.length > 0) list = list.filter((r) => filtroAtuacao.includes(r.caracteristica));
  if (filtroCidade.length > 0) list = list.filter((r) => filtroCidade.includes(r.cidade));
  if (filtroBairro.length > 0) list = list.filter((r) => filtroBairro.includes(r.bairro));
  if (filtroTipoServico.length > 0) list = list.filter((r) => r.tipo_servico !== NA && filtroTipoServico.some((t) => r.tipo_servico.includes(t)));
  if (filtroMotivo.length > 0) list = list.filter((r) => r.motivo !== NA && filtroMotivo.some((m) => r.motivo.includes(m)));
  if (filtroCategoria.length > 0) list = list.filter((r) => r.categoria !== NA && filtroCategoria.includes(r.categoria));
  if (filtroProduto.length > 0) list = list.filter((r) => r.produto !== NA && filtroProduto.includes(r.produto));
  if (dataInicio || dataFim) {
    list = list.filter((r) => {
      if (r.data === NA) return false;
      const parts = r.data.split('/');
      if (parts.length !== 3) return false;
      const [d, M, y] = parts;
      const date = new Date(parseInt(y, 10), parseInt(M, 10) - 1, parseInt(d, 10));
      if (dataInicio && date < new Date(dataInicio)) return false;
      if (dataFim && date > new Date(dataFim)) return false;
      return true;
    });
  }
  return list;
}


/** Verifica se a linha atende aos filtros atuais exceto uma dimensão (para cascata). */
function rowMatchesOtherFilters(
  row: MailingRow,
  filters: {
    filtroAtuacao: string[];
    filtroCidade: string[];
    filtroBairro: string[];
    filtroTipoServico: string[];
    filtroMotivo: string[];
    filtroCategoria: string[];
    filtroProduto: string[];
    dataInicio: string;
    dataFim: string;
  },
  exclude: 'atuacao' | 'cidade' | 'bairro' | 'tipoServico' | 'motivo' | 'categoria' | 'produto' | 'data'
): boolean {
  if (exclude !== 'atuacao' && filters.filtroAtuacao.length > 0 && !filters.filtroAtuacao.includes(row.caracteristica)) return false;
  if (exclude !== 'cidade' && filters.filtroCidade.length > 0 && !filters.filtroCidade.includes(row.cidade)) return false;
  if (exclude !== 'bairro' && filters.filtroBairro.length > 0 && !filters.filtroBairro.includes(row.bairro)) return false;
  if (exclude !== 'tipoServico' && filters.filtroTipoServico.length > 0 && (row.tipo_servico === NA || !filters.filtroTipoServico.some((t) => row.tipo_servico.includes(t)))) return false;
  if (exclude !== 'motivo' && filters.filtroMotivo.length > 0 && (row.motivo === NA || !filters.filtroMotivo.some((m) => row.motivo.includes(m)))) return false;
  if (exclude !== 'categoria' && filters.filtroCategoria.length > 0 && (row.categoria === NA || !filters.filtroCategoria.includes(row.categoria))) return false;
  if (exclude !== 'produto' && filters.filtroProduto.length > 0 && (row.produto === NA || !filters.filtroProduto.includes(row.produto))) return false;
  if (exclude !== 'data' && (filters.dataInicio || filters.dataFim)) {
    if (row.data === NA) return false;
    const parts = row.data.split('/');
    if (parts.length !== 3) return false;
    const date = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    if (filters.dataInicio && date < new Date(filters.dataInicio)) return false;
    if (filters.dataFim && date > new Date(filters.dataFim)) return false;
  }
  return true;
}

/** Opções em cascata a partir de rawRows: cada dropdown só mostra valores que existem com os outros filtros. */
function getCascadingOptions(
  rawRows: MailingRow[],
  filters: {
    filtroAtuacao: string[];
    filtroCidade: string[];
    filtroBairro: string[];
    filtroTipoServico: string[];
    filtroMotivo: string[];
    filtroCategoria: string[];
    filtroProduto: string[];
    dataInicio: string;
    dataFim: string;
  }
) {
  const cidades = new Set<string>();
  const bairros = new Set<string>();
  const tiposServico = new Set<string>();
  const motivos = new Set<string>();
  const categorias = new Set<string>();
  const produtos = new Set<string>();
  for (const row of rawRows) {
    if (rowMatchesOtherFilters(row, filters, 'cidade') && row.cidade && row.cidade !== NA) cidades.add(row.cidade);
    if (rowMatchesOtherFilters(row, filters, 'bairro') && row.bairro && row.bairro !== NA) bairros.add(row.bairro);
    if (rowMatchesOtherFilters(row, filters, 'tipoServico') && row.tipo_servico && row.tipo_servico !== NA) tiposServico.add(row.tipo_servico);
    if (rowMatchesOtherFilters(row, filters, 'motivo') && row.motivo && row.motivo !== NA) motivos.add(row.motivo);
    if (rowMatchesOtherFilters(row, filters, 'categoria') && row.categoria && row.categoria !== NA) categorias.add(row.categoria);
    if (rowMatchesOtherFilters(row, filters, 'produto') && row.produto && row.produto !== NA) produtos.add(row.produto);
  }
  return {
    cidades: Array.from(cidades).sort(),
    bairros: Array.from(bairros).sort(),
    tiposServico: Array.from(tiposServico).sort(),
    motivos: Array.from(motivos).sort(),
    categorias: Array.from(categorias).sort(),
    produtos: Array.from(produtos).sort(),
  };
}

const OPCOES_ATUACAO = ['Operacional', 'Comercial', 'Comercial e Operacional'] as const;

/** Filtro multi-seleção com checkboxes (Popover). */
function FilterMultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Todos',
  width = 'w-[220px]',
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  width?: string;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter((s) => s !== value));
    else onChange([...selected, value]);
  };
  const selectAll = () => onChange([...options]);
  const clearAll = () => onChange([]);
  const someSelected = selected.length > 0;
  const displayText =
    !someSelected ? placeholder : selected.length === options.length ? `Todos (${options.length})` : `${selected.length} selecionado(s)`;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-600 block">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(width, 'justify-between font-normal')}
          >
            <span className="truncate">{displayText}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn(width, 'p-2')} align="start">
          <div className="flex gap-1 mb-2 border-b pb-2">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
              Todos
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
              Limpar
            </Button>
          </div>
          <div className="max-h-[240px] overflow-y-auto space-y-1">
            {options.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">Nenhuma opção</p>
            ) : (
              options.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 py-1.5 px-1 rounded cursor-pointer hover:bg-accent"
                >
                  <Checkbox
                    checked={selected.includes(opt)}
                    onCheckedChange={() => toggle(opt)}
                  />
                  <span className="text-sm truncate">{opt}</span>
                </label>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function MailingPage() {
  const { serviceOrders, vendas, vendasMeta } = useData();
  const { user, authExtras } = useAuth();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? '';
  const [vendasFibra, setVendasFibra] = useState<VendaFibra[]>([]);
  const [vendasMovel, setVendasMovel] = useState<VendaMovel[]>([]);
  const [vendasNp, setVendasNp] = useState<VendaNovaParabolica[]>([]);
  const [filtroAtuacao, setFiltroAtuacao] = useState<string[]>([]);
  const [filtroCidade, setFiltroCidade] = useState<string[]>([]);
  const [filtroBairro, setFiltroBairro] = useState<string[]>([]);
  const [filtroTipoServico, setFiltroTipoServico] = useState<string[]>([]);
  const [filtroMotivo, setFiltroMotivo] = useState<string[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string[]>([]);
  const [filtroProduto, setFiltroProduto] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);
  const [rawRows, setRawRows] = useState<MailingRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!donoUserId) return;
    Promise.all([
      fetchVendasFibra(donoUserId),
      fetchVendasMovel(donoUserId),
      fetchVendasNovaParabolica(donoUserId),
    ]).then(([fibra, movel, np]) => {
      setVendasFibra(fibra);
      setVendasMovel(movel);
      setVendasNp(np);
    }).catch(() => {});
  }, [donoUserId]);

  const allRows = useMemo(
    () => buildMailingRows(serviceOrders, vendas, vendasMeta, vendasFibra, vendasMovel, vendasNp),
    [serviceOrders, vendas, vendasMeta, vendasFibra, vendasMovel, vendasNp]
  );

  const filterState = useMemo(
    () => ({
      filtroAtuacao,
      filtroCidade,
      filtroBairro,
      filtroTipoServico,
      filtroMotivo,
      filtroCategoria,
      filtroProduto,
      dataInicio,
      dataFim,
    }),
    [
      filtroAtuacao,
      filtroCidade,
      filtroBairro,
      filtroTipoServico,
      filtroMotivo,
      filtroCategoria,
      filtroProduto,
      dataInicio,
      dataFim,
    ]
  );

  const resultRows = useMemo(() => {
    if (!hasSearched || rawRows.length === 0) return [];
    return applyFilters(
      rawRows,
      filtroAtuacao,
      filtroCidade,
      filtroBairro,
      filtroTipoServico,
      filtroMotivo,
      filtroCategoria,
      filtroProduto,
      dataInicio,
      dataFim
    );
  }, [
    hasSearched,
    rawRows,
    filtroAtuacao,
    filtroCidade,
    filtroBairro,
    filtroTipoServico,
    filtroMotivo,
    filtroCategoria,
    filtroProduto,
    dataInicio,
    dataFim,
  ]);

  const options = useMemo(() => {
    const sourceRows = hasSearched && rawRows.length > 0 ? rawRows : allRows;
    return getCascadingOptions(sourceRows, filterState);
  }, [hasSearched, rawRows, allRows, filterState]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroAtuacao, filtroCidade, filtroBairro, filtroTipoServico, filtroMotivo, filtroCategoria, filtroProduto, dataInicio, dataFim]);

  // Quando as opções em cascata mudam, remover dos filtros valores que não existem mais nas opções
  useEffect(() => {
    if (!hasSearched || rawRows.length === 0) return;
    setFiltroAtuacao((prev) => { const n = prev.filter((a) => OPCOES_ATUACAO.includes(a as typeof OPCOES_ATUACAO[number])); return n.length === prev.length ? prev : n; });
    setFiltroCidade((prev) => { const n = prev.filter((c) => options.cidades.includes(c)); return n.length === prev.length ? prev : n; });
    setFiltroBairro((prev) => { const n = prev.filter((b) => options.bairros.includes(b)); return n.length === prev.length ? prev : n; });
    setFiltroTipoServico((prev) => { const n = prev.filter((t) => options.tiposServico.includes(t)); return n.length === prev.length ? prev : n; });
    setFiltroMotivo((prev) => { const n = prev.filter((m) => options.motivos.includes(m)); return n.length === prev.length ? prev : n; });
    setFiltroCategoria((prev) => { const n = prev.filter((c) => options.categorias.includes(c)); return n.length === prev.length ? prev : n; });
    setFiltroProduto((prev) => { const n = prev.filter((p) => options.produtos.includes(p)); return n.length === prev.length ? prev : n; });
  }, [hasSearched, rawRows.length, options.cidades, options.bairros, options.tiposServico, options.motivos, options.categorias, options.produtos]);

  const clearFilters = useCallback(() => {
    setFiltroAtuacao([]);
    setFiltroCidade([]);
    setFiltroBairro([]);
    setFiltroTipoServico([]);
    setFiltroMotivo([]);
    setFiltroCategoria([]);
    setFiltroProduto([]);
    setDataInicio('');
    setDataFim('');
    setHasSearched(false);
    setRawRows([]);
    setCurrentPage(1);
  }, []);

  const runSearch = useCallback(() => {
    const raw = buildMailingRows(serviceOrders, vendas, vendasMeta, vendasFibra, vendasMovel, vendasNp);
    setRawRows(raw);
    setHasSearched(true);
    setCurrentPage(1);
  }, [serviceOrders, vendas, vendasMeta]);

  const totalPages = Math.max(1, Math.ceil(resultRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(
    () =>
      resultRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [resultRows, currentPage]
  );

  const exportExcel = () => {
    if (resultRows.length === 0) return;
    setExporting(true);
    try {
      const cols = [
        'Nome do cliente',
        'CPF',
        'Telefone',
        'Cidade',
        'Bairro',
        'Característica',
        'Categoria',
        'Produto',
        'Tipo de serviço',
        'Motivo',
        'Data',
      ];
      const data = resultRows.map((r) => [
        r.nome,
        r.cpf,
        r.telefone,
        r.cidade,
        r.bairro,
        r.caracteristica,
        r.categoria,
        r.produto,
        r.tipo_servico,
        r.motivo,
        r.data,
      ]);
      const ws = XLSX.utils.aoa_to_sheet([cols, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mailing');
      XLSX.writeFile(wb, `mailing_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="bg-rose-100 p-2 rounded-lg">
                  <Mail className="h-5 w-5 text-rose-600" />
                </div>
                Mailing
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-gray-600">
                Base unificada de clientes (operacional e comercial) para geração de mailing. Exporte para Excel.
              </CardDescription>
            </div>
            <Button onClick={exportExcel} disabled={exporting || !hasSearched || resultRows.length === 0}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-start">
              <FilterMultiSelect
                label="Atuação"
                options={[...OPCOES_ATUACAO]}
                selected={filtroAtuacao}
                onChange={setFiltroAtuacao}
                placeholder="Todos"
                width="w-[220px]"
              />
              <FilterMultiSelect
                label="Cidade"
                options={options.cidades}
                selected={filtroCidade}
                onChange={setFiltroCidade}
                placeholder="Todas"
                width="w-[220px]"
              />
              <FilterMultiSelect
                label="Bairro"
                options={options.bairros}
                selected={filtroBairro}
                onChange={setFiltroBairro}
                placeholder="Todos"
                width="w-[220px]"
              />
              <FilterMultiSelect
                label="Tipo de serviço"
                options={options.tiposServico}
                selected={filtroTipoServico}
                onChange={setFiltroTipoServico}
                placeholder="Todos"
                width="w-[220px]"
              />
              <FilterMultiSelect
                label="Motivo"
                options={options.motivos}
                selected={filtroMotivo}
                onChange={setFiltroMotivo}
                placeholder="Todos"
                width="w-[220px]"
              />
            </div>
            <div className="flex flex-wrap gap-3 items-start">
              <FilterMultiSelect
                label="Categoria"
                options={options.categorias}
                selected={filtroCategoria}
                onChange={setFiltroCategoria}
                placeholder="Todas"
                width="w-[220px]"
              />
              <FilterMultiSelect
                label="Produto"
                options={options.produtos}
                selected={filtroProduto}
                onChange={setFiltroProduto}
                placeholder="Todos"
                width="w-[220px]"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600 block">Data início</label>
                <Input
                  type="date"
                  className="w-[200px]"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600 block">Data fim</label>
                <Input
                  type="date"
                  className="w-[200px]"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <Button onClick={runSearch} className="shrink-0 self-end">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters} className="shrink-0 self-end">
                <Eraser className="h-4 w-4 mr-2" />
                Limpar filtros
              </Button>
            </div>
          </div>

          {!hasSearched ? (
            <p className="text-sm text-gray-500 py-6 text-center rounded-md border border-dashed">
              Defina os filtros (opcional) e clique em <strong>Buscar</strong> para carregar os registros.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                {resultRows.length} registro(s) — Página {currentPage} de {totalPages} (25 por página).
              </p>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Nome do cliente</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Bairro</TableHead>
                    <TableHead>Característica</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo de serviço</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {resultRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-gray-500 py-8">
                          Nenhum registro encontrado. Ajuste os filtros e clique em Buscar novamente.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((row, idx) => (
                        <TableRow key={(currentPage - 1) * PAGE_SIZE + idx}>
                          <TableCell className="font-medium">{row.nome}</TableCell>
                          <TableCell>{row.cpf}</TableCell>
                          <TableCell>{row.telefone}</TableCell>
                          <TableCell>{row.cidade}</TableCell>
                          <TableCell>{row.bairro}</TableCell>
                          <TableCell>{row.caracteristica}</TableCell>
                          <TableCell>{row.categoria}</TableCell>
                          <TableCell>{row.produto}</TableCell>
                          <TableCell>{row.tipo_servico}</TableCell>
                          <TableCell>{row.motivo}</TableCell>
                          <TableCell>{row.data}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {resultRows.length > PAGE_SIZE && (
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-sm text-gray-600">
                    Exibindo {(currentPage - 1) * PAGE_SIZE + 1} a {Math.min(currentPage * PAGE_SIZE, resultRows.length)} de {resultRows.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-sm font-medium min-w-[100px] text-center">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
