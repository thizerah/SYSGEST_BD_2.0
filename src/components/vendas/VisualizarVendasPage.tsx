import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth';
import useData from '@/context/useData';
import { useToast } from '@/components/ui/use-toast';
import { fetchEquipe } from '@/lib/equipe';
import {
  fetchVendasFibra,
  fetchVendasMovel,
  fetchVendasNovaParabolica,
  updateStatusVendaFibra,
  updateStatusVendaMovel,
  updateStatusVendaNovaParabolica,
} from '@/lib/cadastro-comercial';
import { fetchMetasVendedor, type MetaVendedor } from '@/lib/metas-vendedor';
import { fetchMetas } from '@/lib/metas';
import type { Venda, VendaMeta, VendaFibra, VendaMovel, VendaNovaParabolica, Meta } from '@/types';
import { Eye, Loader2, FilterX, TrendingUp } from 'lucide-react';

const STATUS_OPCOES = [
  'Aguardando',
  'Finalizado',
  'Aguardando Habilitação',
  'Aguardando Pagamento',
  'Pagamento Confirmado',
];

const STATUS_FINALIZADO_GROUP = ['FINALIZADA', 'FINALIZADO', 'HABILITADO'];

const MESES_NOMES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril', 5: 'Maio', 6: 'Junho',
  7: 'Julho', 8: 'Agosto', 9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

export type TipoVendaUnificada = 'POS' | 'PRE' | 'SKY+' | 'FIBRA' | 'MÓVEL' | 'NOVA PARABÓLICA';

export interface VendaUnificada {
  id: string;
  tipo: TipoVendaUnificada;
  produto: string;
  cliente: string;
  dataVenda: string;
  mes: number;
  ano: number;
  formaPagamento: string;
  temSeguro: boolean;
  status: string;
  vendedor: string;
  editavel: boolean;
  origem?: 'fibra' | 'movel' | 'nova_parabolica';
}

/** Extrai mês (1-12) e ano da string de data sem timezone.
 * Formatos: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, DD/MM/YYYY */
function extrairMesAno(dataStr: string): { mes: number; ano: number } | null {
  if (!dataStr || typeof dataStr !== 'string') return null;
  const s = dataStr.split('T')[0].trim();
  // ISO: YYYY-MM-DD
  let match = s.match(/^(\d{4})-(\d{2})/);
  if (match) {
    const ano = parseInt(match[1], 10);
    const mes = parseInt(match[2], 10);
    if (mes >= 1 && mes <= 12) return { mes, ano };
    return null;
  }
  // DD/MM/YYYY
  match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const dia = parseInt(match[1], 10);
    const mes = parseInt(match[2], 10);
    const ano = parseInt(match[3], 10);
    if (mes >= 1 && mes <= 12 && dia >= 1) return { mes, ano };
    return null;
  }
  return null;
}

function formatarData(data: string | undefined): string {
  if (!data) return '—';
  try {
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return data;
  }
}

/** Mapeia categoria (vendas_meta) ou agrupamento_produto (vendas) para tipo exibido. */
function mapearTipoDeCategoria(valor: string): TipoVendaUnificada {
  const v = (valor || '').toUpperCase().trim();
  if (!v) return 'POS';
  if (v === 'PRE' || v.includes('PRÉ-PAGO') || v.includes('FLEX') || v.includes('CONFORTO')) return 'PRE';
  if (v === 'POS' || v.includes('PÓS-PAGO')) return 'POS';
  if (v.includes('SKY MAIS') || v.includes('SKY+') || v.includes('DGO')) return 'SKY+';
  if (v.includes('FIBRA') || v.includes('BL-DGO')) return 'FIBRA';
  if (v.includes('MÓVEL') || v.includes('MOVEL') || v.includes('CELULAR')) return 'MÓVEL';
  if (v.includes('NOVA PARABÓLICA') || v === 'NP') return 'NOVA PARABÓLICA';
  return 'POS';
}

function verificarSeguro(produtosSecundarios?: string, formaPagamento?: string): boolean {
  const sec = (produtosSecundarios || '').toUpperCase();
  const fp = (formaPagamento || '').toUpperCase();
  return (
    sec.includes('FATURA PROTEGIDA') ||
    sec.includes('SEGURO') ||
    sec.includes('PROTEGIDA') ||
    fp.includes('SEGURO')
  );
}

const TIPO_STYLES: Record<string, string> = {
  POS: 'bg-green-100 text-green-800',
  PRE: 'bg-teal-100 text-teal-800',
  'SKY+': 'bg-indigo-100 text-indigo-800',
  FIBRA: 'bg-purple-100 text-purple-800',
  'MÓVEL': 'bg-blue-100 text-blue-800',
  'NOVA PARABÓLICA': 'bg-orange-100 text-orange-800',
};

function TipoBadge({ tipo }: { tipo: string }) {
  const cls = TIPO_STYLES[tipo] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {tipo}
    </span>
  );
}

function getStatusStyle(status: string): string {
  const u = (status || '').toUpperCase();
  if (STATUS_FINALIZADO_GROUP.includes(u) || u === 'FINALIZADO') return 'bg-green-100 text-green-800';
  if (u.includes('CANCELAD') || u.includes('NEGAD') || u.includes('RECUSA')) return 'bg-red-100 text-red-700';
  if (u.includes('AGUARDANDO') || u.includes('PENDENTE')) return 'bg-yellow-100 text-yellow-800';
  if (u.includes('CONFIRMADO') || u.includes('PAGO')) return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

const DESEMPENHO_TEXT_COLOR: Record<string, string> = {
  green: 'text-green-700', teal: 'text-teal-700', orange: 'text-orange-700',
  purple: 'text-purple-700', blue: 'text-blue-700', indigo: 'text-indigo-700',
  amber: 'text-amber-700', slate: 'text-slate-700',
};

function DesempenhoCard({
  label, realizado, meta, color, metaLabel,
}: {
  label: string;
  realizado: number;
  meta: number;
  color: string;
  metaLabel?: string;
}) {
  const pct = meta > 0 ? Math.min(Math.round((realizado / meta) * 100), 100) : null;
  const over = meta > 0 && realizado > meta;
  const barColor =
    pct === null ? 'bg-gray-200'
    : over ? 'bg-green-500'
    : pct >= 70 ? 'bg-yellow-400'
    : 'bg-red-400';
  const textColor = DESEMPENHO_TEXT_COLOR[color] ?? 'text-gray-700';
  return (
    <div className="bg-white rounded-lg border border-blue-100 p-3 flex flex-col gap-2">
      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="flex items-stretch gap-2">
        <div className="flex flex-col items-center flex-1 bg-gray-50 rounded-md py-1.5 px-2">
          <span className={`text-2xl font-bold leading-none ${textColor}`}>{realizado}</span>
          <span className="text-[10px] text-gray-400 mt-1">finalizadas</span>
        </div>
        {meta > 0 && (
          <div className="flex flex-col items-center flex-1 bg-gray-50 rounded-md py-1.5 px-2">
            <span className="text-2xl font-bold leading-none text-gray-600">{meta}</span>
            <span className="text-[10px] text-gray-400 mt-1">{metaLabel ?? 'meta'}</span>
          </div>
        )}
      </div>
      {meta > 0 ? (
        <>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min((realizado / meta) * 100, 100)}%` }}
            />
          </div>
          <div className={`text-[11px] font-semibold ${over ? 'text-green-600' : pct! >= 70 ? 'text-yellow-600' : 'text-red-500'}`}>
            {over ? `+${realizado - meta} acima da meta` : `${pct}% atingido`}
          </div>
        </>
      ) : (
        <div className="text-[11px] text-muted-foreground">Sem meta cadastrada</div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const display = STATUS_FINALIZADO_GROUP.includes((status || '').toUpperCase()) ? 'Finalizado' : status;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(status)}`}>
      {display}
    </span>
  );
}

export function VisualizarVendasPage() {
  const { user, authExtras, hasPermissao } = useAuth();
  const { vendas, vendasMeta, loadFromSupabaseIfEmpty } = useData();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? '';
  const vendedorNome = user?.name || user?.username || user?.email?.split('@')[0] || '';
  const verTodas = hasPermissao('visualizar_vendas_todas');

  const [vendasFibra, setVendasFibra] = useState<VendaFibra[]>([]);
  const [vendasMovel, setVendasMovel] = useState<VendaMovel[]>([]);
  const [vendasNp, setVendasNp] = useState<VendaNovaParabolica[]>([]);
  const [equipe, setEquipe] = useState<Awaited<ReturnType<typeof fetchEquipe>>>([]);
  const [todasMetasVendedor, setTodasMetasVendedor] = useState<MetaVendedor[]>([]);
  const [todasMetasEmpresa, setTodasMetasEmpresa] = useState<Meta[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('__todos__');
  const [filtroMes, setFiltroMes] = useState<string>('');
  const [filtroAno, setFiltroAno] = useState<string>('');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('__todos__');
  const [filtroStatus, setFiltroStatus] = useState<string>('__todos__');

  const mesAnoSelecionados = Boolean(filtroMes && filtroAno);

  const carregar = useCallback(async () => {
    if (!donoUserId) return;
    try {
      await loadFromSupabaseIfEmpty();
      const [fibra, movel, np, eq, metasV, metasE] = await Promise.all([
        fetchVendasFibra(donoUserId),
        fetchVendasMovel(donoUserId),
        fetchVendasNovaParabolica(donoUserId),
        fetchEquipe(donoUserId),
        fetchMetasVendedor(donoUserId),
        fetchMetas(donoUserId),
      ]);
      setVendasFibra(fibra);
      setVendasMovel(movel);
      setVendasNp(np);
      setEquipe(eq);
      setTodasMetasVendedor(metasV);
      setTodasMetasEmpresa(metasE);
    } catch (e) {
      toast({
        title: 'Erro ao carregar vendas',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  }, [donoUserId, loadFromSupabaseIfEmpty, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /** Mapa id_vendedor -> nome_completo para padronizar exibição */
  const mapaVendedorPorId = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of equipe) {
      const id = (e.id_vendedor || '').trim();
      if (id) m.set(id, e.nome_completo);
    }
    return m;
  }, [equipe]);

  const nomePadronizado = useCallback(
    (idVendedor: string | undefined | null, vendedorOriginal: string): string => {
      const id = (idVendedor || '').trim();
      if (id && mapaVendedorPorId.has(id)) return mapaVendedorPorId.get(id)!;
      return vendedorOriginal || '—';
    },
    [mapaVendedorPorId]
  );

  const equipeDoUsuario = useMemo(
    () => (authExtras?.equipeId ? equipe.find((e) => e.id === authExtras.equipeId) : null),
    [equipe, authExtras?.equipeId]
  );
  const meuIdVendedor = (equipeDoUsuario?.id_vendedor || '').trim();

  const vendedorCorresponde = useCallback(
    (v: { vendedor?: string; nome_proprietario?: string; id_vendedor?: string }) => {
      if (verTodas) return true;
      if (meuIdVendedor) {
        const vid = (v.id_vendedor || '').trim();
        const vVendedor = (v.vendedor || '').trim();
        if (vid === meuIdVendedor || vVendedor === meuIdVendedor) return true;
      }
      const nome = (vendedorNome || '').trim();
      if (!nome) return false;
      const vendedor = (v.vendedor || '').trim();
      const np = (v.nome_proprietario || '').trim();
      const id = (v.id_vendedor || '').trim();
      return (
        vendedor.toLowerCase() === nome.toLowerCase() ||
        np.toLowerCase() === nome.toLowerCase() ||
        id.toLowerCase() === nome.toLowerCase()
      );
    },
    [verTodas, vendedorNome, meuIdVendedor]
  );

  const unificadas = useMemo((): VendaUnificada[] => {
    const list: VendaUnificada[] = [];

    vendas
      .filter((v) => vendedorCorresponde(v))
      .forEach((v) => {
        const tipo = mapearTipoDeCategoria(v.agrupamento_produto || '');
        const ma = extrairMesAno(v.data_habilitacao || '');
        if (!ma) return;
        list.push({
          id: `v-${v.numero_proposta}`,
          tipo,
          produto: v.produto_principal || v.agrupamento_produto || '—',
          cliente: v.nome_fantasia || v.nome_proprietario || '—',
          dataVenda: v.data_habilitacao || '',
          mes: ma.mes,
          ano: ma.ano,
          formaPagamento: v.forma_pagamento || '—',
          temSeguro: verificarSeguro((v as VendaMeta).produtos_secundarios, v.forma_pagamento),
          status: v.status_proposta || '—',
          vendedor: nomePadronizado(v.id_vendedor, v.nome_proprietario || v.id_vendedor || ''),
          editavel: false,
        });
      });

    vendasMeta
      .filter((v) => vendedorCorresponde(v))
      .forEach((v) => {
        const tipo = mapearTipoDeCategoria(v.categoria || '');
        const mes = v.mes && v.mes >= 1 && v.mes <= 12 ? v.mes : (extrairMesAno(v.data_venda || '')?.mes ?? 0);
        const ano = v.ano && v.ano >= 2000 ? v.ano : (extrairMesAno(v.data_venda || '')?.ano ?? 0);
        if (!mes || !ano) return;
        list.push({
          id: `vm-${v.numero_proposta}`,
          tipo,
          produto: v.produto || v.categoria || '—',
          cliente: v.nome_fantasia || v.nome_proprietario || '—',
          dataVenda: v.data_venda || '',
          mes,
          ano,
          formaPagamento: v.forma_pagamento || '—',
          temSeguro: verificarSeguro(v.produtos_secundarios, v.forma_pagamento),
          status: v.status_proposta || '—',
          vendedor: nomePadronizado(v.vendedor, v.nome_proprietario || v.vendedor || ''),
          editavel: false,
        });
      });

    vendasFibra
      .filter((v) => vendedorCorresponde(v))
      .forEach((v) => {
        const ma = extrairMesAno(v.data_venda || v.data_cadastro || '');
        if (!ma) return;
        list.push({
          id: v.id || `f-${v.cpf_cnpj}`,
          tipo: 'FIBRA',
          produto: 'FIBRA',
          cliente: v.nome_completo || '—',
          dataVenda: v.data_venda || v.data_cadastro || '',
          mes: ma.mes,
          ano: ma.ano,
          formaPagamento: '—',
          temSeguro: false,
          status: v.status_proposta || 'Aguardando',
          vendedor: nomePadronizado(v.id_vendedor, v.vendedor || ''),
          editavel: true,
          origem: 'fibra',
        });
      });

    vendasMovel
      .filter((v) => vendedorCorresponde(v))
      .forEach((v) => {
        const ma = extrairMesAno(v.data_venda || v.data_cadastro || '');
        if (!ma) return;
        list.push({
          id: v.id || `m-${v.cpf || v.email}`,
          tipo: 'MÓVEL',
          produto: 'MÓVEL',
          cliente: v.nome_completo || '—',
          dataVenda: v.data_venda || v.data_cadastro || '',
          mes: ma.mes,
          ano: ma.ano,
          formaPagamento: '—',
          temSeguro: false,
          status: v.status_proposta || 'Aguardando',
          vendedor: nomePadronizado(v.id_vendedor, v.vendedor || ''),
          editavel: true,
          origem: 'movel',
        });
      });

    vendasNp
      .filter((v) => vendedorCorresponde(v))
      .forEach((v) => {
        const ma = extrairMesAno(v.data_venda || '');
        if (!ma) return;
        list.push({
          id: v.id || `np-${v.numero_proposta}`,
          tipo: 'NOVA PARABÓLICA',
          produto: 'Nova Parabólica',
          cliente: v.nome_proprietario || '—',
          dataVenda: v.data_venda || '',
          mes: ma.mes,
          ano: ma.ano,
          formaPagamento: v.forma_pagamento || '—',
          temSeguro: false,
          status: v.status_proposta || 'Aguardando',
          vendedor: nomePadronizado(v.id_vendedor, v.vendedor || ''),
          editavel: true,
          origem: 'nova_parabolica',
        });
      });

    list.sort((a, b) => {
      const da = a.dataVenda ? new Date(a.dataVenda).getTime() : 0;
      const db = b.dataVenda ? new Date(b.dataVenda).getTime() : 0;
      return db - da;
    });
    return list;
  }, [
    vendas,
    vendasMeta,
    vendasFibra,
    vendasMovel,
    vendasNp,
    vendedorCorresponde,
    nomePadronizado,
  ]);

  /** Meses que têm dados — escolher primeiro */
  const mesesDisponiveis = useMemo(() => {
    const mesesNoDado = new Set(unificadas.map((v) => v.mes));
    return mesesNoDado.size > 0
      ? Object.entries(MESES_NOMES).filter(([num]) => mesesNoDado.has(parseInt(num, 10)))
      : Object.entries(MESES_NOMES);
  }, [unificadas]);

  /** Anos que têm o mês selecionado — escolher depois do mês */
  const anosDisponiveis = useMemo(() => {
    if (!filtroMes) {
      const anos = new Set(unificadas.map((v) => v.ano).filter((a) => a >= 2000));
      if (anos.size === 0) {
        const y = new Date().getFullYear();
        return [y, y - 1, y - 2];
      }
      return Array.from(anos).sort((a, b) => b - a);
    }
    const mes = parseInt(filtroMes, 10);
    const anos = new Set(unificadas.filter((v) => v.mes === mes).map((v) => v.ano).filter((a) => a >= 2000));
    return Array.from(anos).sort((a, b) => b - a);
  }, [unificadas, filtroMes]);

  /** Vendas do período selecionado (mes+ano) — usadas para vendedores e anos */
  const unificadasDoPeriodo = useMemo(() => {
    if (!filtroMes || !filtroAno) return [];
    const mes = parseInt(filtroMes, 10);
    const ano = parseInt(filtroAno, 10);
    return unificadas.filter((v) => v.mes === mes && v.ano === ano);
  }, [unificadas, filtroMes, filtroAno]);

  /** Vendas do período + vendedor (quando selecionado) — usadas para tipo */
  const unificadasParaTipo = useMemo(() => {
    let base = unificadasDoPeriodo;
    if (filtroVendedor !== '__todos__') {
      base = base.filter((v) => v.vendedor === filtroVendedor);
    }
    return base;
  }, [unificadasDoPeriodo, filtroVendedor]);

  /** Vendas do período + vendedor + tipo (quando selecionados) — usadas para status */
  const unificadasParaStatus = useMemo(() => {
    let base = unificadasParaTipo;
    if (filtroTipo !== '__todos__') {
      base = base.filter((v) => v.tipo === filtroTipo);
    }
    return base;
  }, [unificadasParaTipo, filtroTipo]);

  const vendedoresUnicos = useMemo(() => {
    const set = new Set(unificadasDoPeriodo.map((v) => v.vendedor).filter(Boolean));
    return Array.from(set).sort();
  }, [unificadasDoPeriodo]);

  const tiposDisponiveis = useMemo(() => {
    const tipos = new Set(unificadasParaTipo.map((v) => v.tipo));
    return Array.from(tipos).sort();
  }, [unificadasParaTipo]);

  const statusUnicos = useMemo(() => {
    const display = new Set<string>();
    for (const v of unificadasParaStatus) {
      const s = (v.status || '').trim();
      if (!s) continue;
      const u = s.toUpperCase();
      if (STATUS_FINALIZADO_GROUP.includes(u)) {
        display.add('Finalizado');
      } else {
        display.add(s);
      }
    }
    return Array.from(display).sort();
  }, [unificadasParaStatus]);

  const limparFiltros = () => {
    setFiltroMes('');
    setFiltroAno('');
    setFiltroVendedor('__todos__');
    setFiltroTipo('__todos__');
    setFiltroStatus('__todos__');
  };

  const filtradas = useMemo(() => {
    if (!filtroMes || !filtroAno) return [];
    const mes = parseInt(filtroMes, 10);
    const ano = parseInt(filtroAno, 10);
    let result = unificadas.filter((v) => v.mes === mes && v.ano === ano);
    if (verTodas && filtroVendedor !== '__todos__') {
      result = result.filter((v) => v.vendedor === filtroVendedor);
    }
    if (filtroTipo !== '__todos__') {
      result = result.filter((v) => v.tipo === filtroTipo);
    }
    if (filtroStatus !== '__todos__') {
      if (filtroStatus === 'Finalizado') {
        result = result.filter((v) => STATUS_FINALIZADO_GROUP.includes((v.status || '').trim().toUpperCase()));
      } else {
        result = result.filter((v) => (v.status || '—') === filtroStatus);
      }
    }
    return result;
  }, [unificadas, filtroMes, filtroAno, filtroVendedor, filtroTipo, filtroStatus, verTodas]);

  const handleStatusChange = async (row: VendaUnificada, novoStatus: string) => {
    if (!row.editavel || !row.origem) return;
    setSavingId(row.id);
    try {
      if (row.origem === 'fibra') {
        await updateStatusVendaFibra(row.id, novoStatus);
      } else if (row.origem === 'movel') {
        await updateStatusVendaMovel(row.id, novoStatus);
      } else if (row.origem === 'nova_parabolica') {
        await updateStatusVendaNovaParabolica(row.id, novoStatus);
      }
      await carregar();
      toast({ title: 'Status atualizado', description: `Status alterado para ${novoStatus}.` });
    } catch (e) {
      toast({
        title: 'Erro ao atualizar',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  /** Nome do vendedor para cruzar com metas_vendedor */
  const nomeVendedorParaMeta = useMemo(() => {
    if (!verTodas) return equipeDoUsuario?.nome_completo ?? vendedorNome;
    if (filtroVendedor !== '__todos__') return filtroVendedor;
    return null; // supervisor sem filtro → sem meta individual
  }, [verTodas, equipeDoUsuario, vendedorNome, filtroVendedor]);

  const metaVendedorPeriodo = useMemo((): MetaVendedor | null => {
    if (!filtroMes || !filtroAno || !nomeVendedorParaMeta) return null;
    const mes = parseInt(filtroMes, 10);
    const ano = parseInt(filtroAno, 10);
    return (
      todasMetasVendedor.find(
        (m) => m.mes === mes && m.ano === ano && m.vendedor_nome === nomeVendedorParaMeta
      ) ?? null
    );
  }, [todasMetasVendedor, filtroMes, filtroAno, nomeVendedorParaMeta]);

  const metaEmpresaPeriodo = useMemo((): Meta | null => {
    if (!filtroMes || !filtroAno) return null;
    const mes = parseInt(filtroMes, 10);
    const ano = parseInt(filtroAno, 10);
    return todasMetasEmpresa.find((m) => m.mes === mes && m.ano === ano) ?? null;
  }, [todasMetasEmpresa, filtroMes, filtroAno]);


  /** Contagem apenas de vendas finalizadas — usada nos cards de desempenho vs meta */
  const dashboardFinalizado = useMemo(() => {
    const fin = filtradas.filter((v) =>
      STATUS_FINALIZADO_GROUP.includes((v.status || '').trim().toUpperCase())
    );
    const pos = fin.filter((v) => v.tipo === 'POS').length;
    const cartao = fin.filter(
      (v) =>
        v.tipo === 'POS' &&
        (v.formaPagamento || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()
          .includes('CARTAO')
    ).length;
    return {
      pos,
      pre: fin.filter((v) => v.tipo === 'PRE').length,
      sky: fin.filter((v) => v.tipo === 'SKY+').length,
      fibra: fin.filter((v) => v.tipo === 'FIBRA').length,
      movel: fin.filter((v) => v.tipo === 'MÓVEL').length,
      np: fin.filter((v) => v.tipo === 'NOVA PARABÓLICA').length,
      seguros: fin.filter((v) => v.temSeguro).length,
      cartao,
      /** Meta dinâmica: 20% das vendas POS finalizadas (mínimo 1 se houver POS) */
      metaCartao: pos > 0 ? Math.max(1, Math.ceil(pos * 0.2)) : 0,
    };
  }, [filtradas]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-lg">
              <Eye className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Visualizar Vendas</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                {verTodas
                  ? 'Visão de todas as vendas (supervisor).'
                  : 'Suas vendas cadastradas. Edite o status em FIBRA, MÓVEL e Nova Parabólica.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <Label>Mês</Label>
              <Select
                value={filtroMes}
                onValueChange={setFiltroMes}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {mesesDisponiveis.map(([num, nome]) => (
                    <SelectItem key={num} value={num}>{nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Ano</Label>
              <Select
                value={filtroAno}
                onValueChange={setFiltroAno}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {verTodas && (
              <div className="flex flex-col gap-1.5">
                <Label>Vendedor</Label>
                <Select
                  value={filtroVendedor}
                  onValueChange={(v) => {
                    setFiltroVendedor(v);
                    setFiltroTipo('__todos__');
                    setFiltroStatus('__todos__');
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos os vendedores</SelectItem>
                    {vendedoresUnicos.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select
                value={filtroTipo}
                onValueChange={(v) => {
                  setFiltroTipo(v);
                  setFiltroStatus('__todos__');
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos</SelectItem>
                  {tiposDisponiveis.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos</SelectItem>
                  {statusUnicos.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 justify-end">
              <Button variant="outline" size="sm" onClick={limparFiltros} className="shrink-0 h-9">
                <FilterX className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            </div>
          </div>

          {!mesAnoSelecionados ? (
            <p className="text-gray-500 text-center py-12">
              Selecione o mês e o ano para visualizar as vendas.
            </p>
          ) : (
            <>
            {/* ── Cards de desempenho vs meta ── */}
            {(metaVendedorPeriodo || metaEmpresaPeriodo) && (
              <div className="mb-5 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">
                    Desempenho do período · apenas Finalizados
                    {metaVendedorPeriodo && nomeVendedorParaMeta ? ` — ${nomeVendedorParaMeta}` : ''}
                  </span>
                  {metaVendedorPeriodo && (
                    <span className="ml-auto text-xs text-muted-foreground">Meta individual</span>
                  )}
                  {metaEmpresaPeriodo && !metaVendedorPeriodo && (
                    <span className="ml-auto text-xs text-muted-foreground">Meta empresa</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
                  {([
                    { label: 'Pos Pago', realizado: dashboardFinalizado.pos, keyV: 'pos_pago' as const, keyE: 'pos_pago' as const, color: 'green' },
                    { label: 'Pré / Flex', realizado: dashboardFinalizado.pre, keyV: 'flex_conforto' as const, keyE: 'flex_conforto' as const, color: 'teal' },
                    { label: 'Nova Parabólica', realizado: dashboardFinalizado.np, keyV: 'nova_parabolica' as const, keyE: 'nova_parabolica' as const, color: 'orange' },
                    { label: 'Fibra', realizado: dashboardFinalizado.fibra, keyV: 'fibra' as const, keyE: 'fibra' as const, color: 'purple' },
                    { label: 'Móvel', realizado: dashboardFinalizado.movel, keyV: 'movel' as const, keyE: 'movel' as const, color: 'blue' },
                    { label: 'SKY+', realizado: dashboardFinalizado.sky, keyV: 'sky_mais' as const, keyE: 'sky_mais' as const, color: 'indigo' },
                    { label: 'Seguros', realizado: dashboardFinalizado.seguros, keyV: 'seguros_pos' as const, keyE: 'seguros_pos' as const, color: 'amber' },
                  ] as const).map(({ label, realizado, keyV, keyE, color }) => {
                    const meta = metaVendedorPeriodo
                      ? (metaVendedorPeriodo[keyV] ?? 0)
                      : (metaEmpresaPeriodo?.[keyE] ?? 0);
                    return (
                      <DesempenhoCard key={label} label={label} realizado={realizado} meta={meta} color={color} />
                    );
                  })}
                  {/* Card Cartão de Crédito — meta dinâmica: mín. 20% do POS finalizado */}
                  <DesempenhoCard
                    label="Cartão Crédito"
                    realizado={dashboardFinalizado.cartao}
                    meta={dashboardFinalizado.metaCartao}
                    color="slate"
                    metaLabel={dashboardFinalizado.pos > 0 ? '20% do POS' : undefined}
                  />
                </div>
              </div>
            )}

            {/* ── Tabela de vendas ── */}
            {filtradas.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhuma venda encontrada para o período selecionado.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-b border-gray-200">
                      <TableHead className="font-semibold text-gray-700 py-3">Tipo</TableHead>
                      <TableHead className="font-semibold text-gray-700">Produto</TableHead>
                      <TableHead className="font-semibold text-gray-700">Cliente</TableHead>
                      <TableHead className="font-semibold text-gray-700">Data</TableHead>
                      <TableHead className="font-semibold text-gray-700">Forma Pagamento</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Seguro</TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                      {verTodas && <TableHead className="font-semibold text-gray-700">Vendedor</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((row) => (
                      <TableRow
                        key={row.id}
                        className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors"
                      >
                        <TableCell className="py-3">
                          <TipoBadge tipo={row.tipo} />
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">{row.produto}</TableCell>
                        <TableCell className="font-medium text-gray-800">{row.cliente}</TableCell>
                        <TableCell className="text-sm text-gray-600 whitespace-nowrap">{formatarData(row.dataVenda)}</TableCell>
                        <TableCell className="text-sm text-gray-600">{row.formaPagamento}</TableCell>
                        <TableCell className="text-center">
                          {row.temSeguro ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Sim</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Não</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.editavel ? (
                            <div className="flex items-center gap-2">
                              <Select
                                value={row.status}
                                onValueChange={(v) => handleStatusChange(row, v)}
                                disabled={savingId === row.id}
                              >
                                <SelectTrigger className="h-8 w-[180px] text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPCOES.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {savingId === row.id && (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              )}
                            </div>
                          ) : (
                            <StatusBadge status={row.status} />
                          )}
                        </TableCell>
                        {verTodas && (
                          <TableCell className="text-sm text-gray-700">{row.vendedor}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-muted-foreground text-right">
                  {filtradas.length} registro{filtradas.length !== 1 ? 's' : ''}
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
