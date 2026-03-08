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
import type { Venda, VendaMeta, VendaFibra, VendaMovel, VendaNovaParabolica } from '@/types';
import { Eye, Loader2, FilterX } from 'lucide-react';

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
      const [fibra, movel, np, eq] = await Promise.all([
        fetchVendasFibra(donoUserId),
        fetchVendasMovel(donoUserId),
        fetchVendasNovaParabolica(donoUserId),
        fetchEquipe(donoUserId),
      ]);
      setVendasFibra(fibra);
      setVendasMovel(movel);
      setVendasNp(np);
      setEquipe(eq);
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

  const dashboard = useMemo(() => {
    const pos = filtradas.filter((v) => v.tipo === 'POS').length;
    const pre = filtradas.filter((v) => v.tipo === 'PRE').length;
    const sky = filtradas.filter((v) => v.tipo === 'SKY+').length;
    const fibra = filtradas.filter((v) => v.tipo === 'FIBRA').length;
    const movel = filtradas.filter((v) => v.tipo === 'MÓVEL').length;
    const np = filtradas.filter((v) => v.tipo === 'NOVA PARABÓLICA').length;
    const seguros = filtradas.filter((v) => v.temSeguro).length;
    const cartao = filtradas.filter((v) =>
      (v.formaPagamento || '').toUpperCase().includes('CARTAO')
    ).length;
    return { pos, pre, sky, fibra, movel, np, seguros, cartao };
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
            <div className="rounded-lg border bg-green-50/50 p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{dashboard.pos}</div>
              <div className="text-xs text-gray-600">Vendas POS</div>
            </div>
            <div className="rounded-lg border bg-teal-50/50 p-3 text-center">
              <div className="text-2xl font-bold text-teal-700">{dashboard.pre}</div>
              <div className="text-xs text-gray-600">Vendas PRE</div>
            </div>
            <div className="rounded-lg border bg-indigo-50/50 p-3 text-center">
              <div className="text-2xl font-bold text-indigo-700">{dashboard.sky}</div>
              <div className="text-xs text-gray-600">SKY+</div>
            </div>
            <div className="rounded-lg border bg-purple-50/50 p-3 text-center">
              <div className="text-2xl font-bold text-purple-700">{dashboard.fibra}</div>
              <div className="text-xs text-gray-600">Vendas FIBRA</div>
            </div>
            <div className="rounded-lg border bg-blue-50/50 p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{dashboard.movel}</div>
              <div className="text-xs text-gray-600">Vendas MÓVEL</div>
            </div>
            <div className="rounded-lg border bg-orange-50/50 p-3 text-center">
              <div className="text-2xl font-bold text-orange-700">{dashboard.np}</div>
              <div className="text-xs text-gray-600">Nova Parabólica</div>
            </div>
            <div className="rounded-lg border bg-amber-50/50 p-3 text-center">
              <div className="text-2xl font-bold text-amber-700">{dashboard.seguros}</div>
              <div className="text-xs text-gray-600">Seguros</div>
            </div>
            <div className="rounded-lg border bg-slate-50/50 p-3 text-center">
              <div className="text-2xl font-bold text-slate-700">{dashboard.cartao}</div>
              <div className="text-xs text-gray-600">Cartão Crédito</div>
            </div>
          </div>

          {filtradas.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhuma venda encontrada para o período selecionado.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">Produto</TableHead>
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Forma Pagamento</TableHead>
                    <TableHead className="font-semibold">Seguro</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    {verTodas && <TableHead className="font-semibold">Vendedor</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((row, idx) => (
                    <TableRow
                      key={row.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                    >
                      <TableCell className="font-medium">{row.tipo}</TableCell>
                      <TableCell>{row.produto}</TableCell>
                      <TableCell>{row.cliente}</TableCell>
                      <TableCell>{formatarData(row.dataVenda)}</TableCell>
                      <TableCell>{row.formaPagamento}</TableCell>
                      <TableCell>{row.temSeguro ? 'Sim' : 'Não'}</TableCell>
                      <TableCell>
                        {row.editavel ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={row.status}
                              onValueChange={(v) => handleStatusChange(row, v)}
                              disabled={savingId === row.id}
                            >
                              <SelectTrigger className="h-8 w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPCOES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {savingId === row.id && (
                              <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                            )}
                          </div>
                        ) : (
                          <span>{row.status}</span>
                        )}
                      </TableCell>
                      {verTodas && <TableCell>{row.vendedor}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
