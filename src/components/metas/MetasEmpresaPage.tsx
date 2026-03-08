import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth';
import useData from '@/context/useData';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  fetchMetas,
  upsertMetaRow,
  ordenarMetasPorMesAno,
  getMesNomeMetas,
  MESES_NOMES_METAS,
} from '@/lib/metas';
import type { Meta } from '@/types';
import { Target, Plus, Loader2, GitCompare } from 'lucide-react';

const MESES_OPCOES = Object.entries(MESES_NOMES_METAS).map(([num, nome]) => ({
  valor: num,
  nome,
}));

const PAY_TV_CATEGORIAS = ['PÓS-PAGO', 'FLEX/CONFORTO', 'NOVA PARABÓLICA'] as const;

const CAMPOS_META = [
  { key: 'pos_pago', label: 'Pos Pago', categoria: 'PÓS-PAGO' },
  { key: 'flex_conforto', label: 'Flex Conforto', categoria: 'FLEX/CONFORTO' },
  { key: 'nova_parabolica', label: 'Nova Parabólica', categoria: 'NOVA PARABÓLICA' },
  { key: 'pay_tv', label: 'PAY TV', categoria: null },
  { key: 'fibra', label: 'Fibra', categoria: 'FIBRA' },
  { key: 'seguros_pos', label: 'Seguros Pos', categoria: 'SEGUROS POS' },
  { key: 'seguros_fibra', label: 'Seguros Fibra', categoria: 'SEGUROS FIBRA' },
  { key: 'sky_mais', label: 'Sky+', categoria: 'SKY MAIS' },
  { key: 'movel', label: 'Móvel', categoria: 'MÓVEL' },
] as const;

const CAMPOS_EDITAVEIS = CAMPOS_META.filter((c) => c.key !== 'pay_tv');

const MOVEL_DESDE_ANO = 2026;
const MOVEL_DESDE_MES = 1;

function isMovelAplicavel(ano: number, mes: number): boolean {
  return ano > MOVEL_DESDE_ANO || (ano === MOVEL_DESDE_ANO && mes >= MOVEL_DESDE_MES);
}

function getPayTvMeta(row: Meta): number {
  return (row.pos_pago ?? 0) + (row.flex_conforto ?? 0) + (row.nova_parabolica ?? 0);
}

function getPayTvRealizadas(metrics: { categorias: { categoria: string; vendas_realizadas: number }[] } | null | undefined): number {
  if (!metrics) return 0;
  return PAY_TV_CATEGORIAS.reduce((s, cat) => {
    const c = metrics.categorias.find((x) => x.categoria === cat);
    return s + (c?.vendas_realizadas ?? 0);
  }, 0);
}

const valoresIniciais = () => ({
  pos_pago: 0,
  flex_conforto: 0,
  nova_parabolica: 0,
  total: 0,
  fibra: 0,
  seguros_pos: 0,
  seguros_fibra: 0,
  sky_mais: 0,
  movel: 0,
});

export function MetasEmpresaPage() {
  const { authExtras, user, hasPermissao } = useAuth();
  const { refreshMetas, calculateMetaMetrics } = useData();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? '';
  const podeEditar = hasPermissao('editar_metas_empresa');

  const [dados, setDados] = useState<Meta[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [anoFiltro, setAnoFiltro] = useState<string>('');
  const [mostrarAdicionar, setMostrarAdicionar] = useState(false);
  const [novoMes, setNovoMes] = useState<string>('1');
  const [novoAno, setNovoAno] = useState<number>(new Date().getFullYear());
  const [novoValores, setNovoValores] = useState(valoresIniciais);
  const [editando, setEditando] = useState<Record<string, Partial<Meta>>>({});
  const [modalDetalhe, setModalDetalhe] = useState<{ row: Meta; campo: (typeof CAMPOS_META)[number] } | null>(null);
  const [mesesSelecionados, setMesesSelecionados] = useState<Set<string>>(new Set());
  const [modalComparar, setModalComparar] = useState(false);

  const carregar = useCallback(async () => {
    if (!donoUserId) return;
    try {
      const rows = await fetchMetas(donoUserId);
      setDados(rows.sort(ordenarMetasPorMesAno));
      const anos = [...new Set(rows.map((r) => r.ano))].sort((a, b) => b - a);
      if (anos.length > 0 && !anoFiltro) setAnoFiltro(String(anos[0]));
    } catch (e) {
      toast({
        title: 'Erro ao carregar metas',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  }, [donoUserId, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const dadosOrdenados = [...dados].sort(ordenarMetasPorMesAno);
  const dadosFiltrados =
    anoFiltro && anoFiltro !== '__todos__'
      ? dadosOrdenados.filter((r) => String(r.ano) === anoFiltro)
      : dadosOrdenados;

  const salvar = async (item: Meta) => {
    if (!donoUserId || !podeEditar) return;
    const key = `${item.mes}-${item.ano}`;
    setSaving(key);
    try {
      await upsertMetaRow(donoUserId, {
        mes: item.mes,
        ano: item.ano,
        pos_pago: item.pos_pago ?? 0,
        flex_conforto: item.flex_conforto ?? 0,
        nova_parabolica: item.nova_parabolica ?? 0,
        total: getPayTvMeta(item),
        fibra: item.fibra ?? 0,
        seguros_pos: item.seguros_pos ?? 0,
        seguros_fibra: item.seguros_fibra ?? 0,
        sky_mais: item.sky_mais ?? 0,
        movel: item.movel ?? 0,
      });
      await carregar();
      await refreshMetas();
      setEditando((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
      toast({ title: 'Salvo', description: `${getMesNomeMetas(item.mes)}/${item.ano} atualizado.` });
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const adicionar = async () => {
    if (!donoUserId || !podeEditar) return;
    const mesNum = parseInt(novoMes, 10);
    const mesNome = getMesNomeMetas(mesNum);
    if (!mesNome) {
      toast({ title: 'Mês inválido', variant: 'destructive' });
      return;
    }
    const duplicado = dados.some((d) => d.mes === mesNum && d.ano === novoAno);
    if (duplicado) {
      toast({
        title: 'Já existe',
        description: `Meta para ${mesNome}/${novoAno} já existe.`,
        variant: 'destructive',
      });
      return;
    }
    setSaving('__novo__');
    try {
      await upsertMetaRow(donoUserId, {
        mes: mesNum,
        ano: novoAno,
        ...novoValores,
        total: getPayTvMeta({ ...novoValores, mes: mesNum, ano: novoAno } as Meta),
      });
      await carregar();
      await refreshMetas();
      setMostrarAdicionar(false);
      setNovoMes('1');
      setNovoAno(new Date().getFullYear());
      setNovoValores(valoresIniciais());
      toast({ title: 'Adicionado', description: `${mesNome}/${novoAno} criado.` });
    } catch (e) {
      toast({
        title: 'Erro ao adicionar',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const cancelarAdicionar = () => {
    setMostrarAdicionar(false);
    setNovoMes('1');
    setNovoAno(new Date().getFullYear());
    setNovoValores(valoresIniciais());
  };

  const toggleMesSelecionado = (key: string) => {
    setMesesSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const metricsPorLinha = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateMetaMetrics>>();
    dadosFiltrados.forEach((row) => {
      const m = calculateMetaMetrics(row.mes, row.ano);
      if (m) map.set(`${row.mes}-${row.ano}`, m);
    });
    return map;
  }, [dadosFiltrados, calculateMetaMetrics]);

  const totaisEFooter = useMemo(() => {
    const totais: Record<string, { sumMeta: number; sumRealizadas: number; count: number }> = {};
    CAMPOS_META.forEach((c) => {
      totais[c.key] = { sumMeta: 0, sumRealizadas: 0, count: 0 };
    });
    dadosFiltrados.forEach((row) => {
      const metrics = metricsPorLinha.get(`${row.mes}-${row.ano}`);
      CAMPOS_META.forEach((c) => {
        if (c.key === 'movel' && !isMovelAplicavel(row.ano, row.mes)) return;
        const meta = c.key === 'pay_tv' ? getPayTvMeta(row) : (row[c.key] ?? 0);
        let realizadas = 0;
        if (c.key === 'pay_tv') {
          realizadas = getPayTvRealizadas(metrics);
        } else if (c.categoria && metrics) {
          realizadas = metrics.categorias.find((x) => x.categoria === c.categoria)?.vendas_realizadas ?? 0;
        }
        totais[c.key].sumMeta += meta;
        totais[c.key].sumRealizadas += realizadas;
        totais[c.key].count += 1;
      });
    });
    return totais;
  }, [dadosFiltrados, metricsPorLinha]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <Target className="h-5 w-5 text-amber-600" />
                </div>
                Meta de Vendas Empresa
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-gray-600">
                Metas mensais de vendas da empresa. Clique em uma célula para ver detalhes. Marque os checkboxes e use Comparar para analisar meses. Formato: meta / realizadas.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={anoFiltro || '__todos__'} onValueChange={(v) => setAnoFiltro(v === '__todos__' ? '' : v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos</SelectItem>
                  {[...new Set(dados.map((r) => r.ano))].sort((a, b) => b - a).map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mesesSelecionados.size >= 2 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setModalComparar(true)}
                >
                  <GitCompare className="h-4 w-4 mr-1" />
                  Comparar ({mesesSelecionados.size} meses)
                </Button>
              )}
              {podeEditar && (
                <Button
                  size="sm"
                  onClick={() => setMostrarAdicionar(!mostrarAdicionar)}
                  variant={mostrarAdicionar ? 'outline' : 'default'}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {mostrarAdicionar && podeEditar && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <h4 className="font-medium text-sm">Novo registro</h4>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                  <Label>Mês</Label>
                  <Select value={novoMes} onValueChange={setNovoMes}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES_OPCOES.map((m) => (
                        <SelectItem key={m.valor} value={m.valor}>
                          {m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Ano</Label>
                  <Input
                    type="number"
                    placeholder=""
                    className="w-24"
                    value={novoAno}
                    onChange={(e) => setNovoAno(parseInt(e.target.value, 10) || new Date().getFullYear())}
                    min={2020}
                    max={2030}
                  />
                </div>
                {CAMPOS_EDITAVEIS.map((c) => (
                  <div key={c.key} className="flex flex-col gap-1.5">
                    <Label>{c.label}</Label>
                    <Input
                      type="number"
                      placeholder=""
                      className="w-24"
                      value={novoValores[c.key] === 0 ? '' : novoValores[c.key]}
                      onChange={(e) =>
                        setNovoValores((v) => ({ ...v, [c.key]: parseInt(e.target.value, 10) || 0 }))
                      }
                      min={0}
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button onClick={adicionar} disabled={saving === '__novo__'}>
                    {saving === '__novo__' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                  </Button>
                  <Button variant="outline" onClick={cancelarAdicionar} disabled={saving === '__novo__'}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {dadosFiltrados.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhuma meta cadastrada. {podeEditar && 'Clique em Adicionar para criar.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold sticky left-0 bg-gray-50 z-10 w-12 px-2">
                      <span className="sr-only">Comparar</span>
                    </TableHead>
                    <TableHead className="font-semibold sticky left-12 bg-gray-50 z-10">Mês</TableHead>
                    <TableHead className="font-semibold">Ano</TableHead>
                    {CAMPOS_META.map((c) => (
                      <TableHead key={c.key} className="font-semibold text-right min-w-[100px]">
                        {c.label}
                      </TableHead>
                    ))}
                    {podeEditar && <TableHead className="w-24 sticky right-0 bg-gray-50" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosFiltrados.map((row, idx) => {
                    const key = `${row.mes}-${row.ano}`;
                    const ed = editando[key];
                    const isEditing = !!ed;
                    const metrics = metricsPorLinha.get(key);

                    return (
                      <TableRow key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <TableCell
                          className="sticky left-0 bg-inherit w-12 px-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={mesesSelecionados.has(key)}
                            onCheckedChange={() => toggleMesSelecionado(key)}
                            aria-label={`Selecionar ${getMesNomeMetas(row.mes)}/${row.ano} para comparar`}
                          />
                        </TableCell>
                        <TableCell className="font-medium sticky left-12 bg-inherit">
                          {getMesNomeMetas(row.mes)}
                        </TableCell>
                        <TableCell>{row.ano}</TableCell>
                        {CAMPOS_META.map((c) => {
                          const isPayTv = c.key === 'pay_tv';
                          const val = isPayTv ? getPayTvMeta(ed ? { ...row, ...ed } : row) : (ed?.[c.key] ?? row[c.key] ?? 0);
                          const isMovel = c.key === 'movel';
                          const movelNaoAplicavel = isMovel && !isMovelAplicavel(row.ano, row.mes);

                          if (movelNaoAplicavel) {
                            return (
                              <TableCell
                                key={c.key}
                                className="text-right text-gray-400"
                                onClick={() => !isEditing && setModalDetalhe({ row, campo: c })}
                                role={!isEditing ? 'button' : undefined}
                                tabIndex={!isEditing ? 0 : undefined}
                                onKeyDown={(e) => !isEditing && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setModalDetalhe({ row, campo: c }))}
                                style={!isEditing ? { cursor: 'pointer' } : undefined}
                              >
                                {isEditing && podeEditar ? (
                                  <Input
                                    type="number"
                                    className="w-20 h-8 text-right"
                                    value={val}
                                    onChange={(e) =>
                                      setEditando((x) => ({
                                        ...x,
                                        [key]: { ...(x[key] ?? row), [c.key]: parseInt(e.target.value, 10) || 0 },
                                      }))
                                    }
                                    min={0}
                                  />
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                            );
                          }

                          const cat = c.categoria ? metrics?.categorias.find((x) => x.categoria === c.categoria) : null;
                          const metaVal = isPayTv ? getPayTvMeta(row) : (row[c.key] ?? 0);
                          const realizadasVal = isPayTv ? getPayTvRealizadas(metrics) : (cat?.vendas_realizadas ?? 0);
                          const atingiu =
                            isPayTv
                              ? realizadasVal >= metaVal
                              : cat
                                ? cat.vendas_realizadas >= cat.meta_definida
                                : null;
                          const showColor = atingiu !== null;
                          const colorClass = showColor
                            ? atingiu
                              ? 'text-green-600 font-semibold'
                              : 'text-red-600 font-semibold'
                            : '';

                          return (
                            <TableCell
                              key={c.key}
                              className={`text-right ${colorClass} ${!isEditing ? 'cursor-pointer hover:bg-amber-50/50' : ''}`}
                              onClick={() => !isEditing && setModalDetalhe({ row, campo: c })}
                              role={!isEditing ? 'button' : undefined}
                              tabIndex={!isEditing ? 0 : undefined}
                              onKeyDown={(e) => !isEditing && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setModalDetalhe({ row, campo: c }))}
                            >
                              {isEditing && podeEditar && !isPayTv ? (
                                <Input
                                  type="number"
                                  className="w-20 h-8 text-right"
                                  value={val}
                                  onChange={(e) =>
                                    setEditando((x) => ({
                                      ...x,
                                      [key]: { ...(x[key] ?? row), [c.key]: parseInt(e.target.value, 10) || 0 },
                                    }))
                                  }
                                  min={0}
                                />
                              ) : (
                                <div className="flex flex-col items-end">
                                  <span>
                                    {metaVal.toLocaleString('pt-BR')} /{' '}
                                    {realizadasVal.toLocaleString('pt-BR')}
                                    {(() => {
                                      const pct = metaVal > 0 ? (realizadasVal / metaVal) * 100 : null;
                                      return pct !== null ? ` (${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)` : '';
                                    })()}
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        {podeEditar && (
                          <TableCell className="sticky right-0 bg-inherit">
                            {isEditing ? (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 text-xs"
                                  disabled={saving === key}
                                  onClick={() =>
                                    salvar({
                                      ...row,
                                      ...ed,
                                      pos_pago: ed?.pos_pago ?? row.pos_pago,
                                      flex_conforto: ed?.flex_conforto ?? row.flex_conforto,
                                      nova_parabolica: ed?.nova_parabolica ?? row.nova_parabolica,
                                      total: getPayTvMeta({ ...row, ...ed }),
                                      fibra: ed?.fibra ?? row.fibra,
                                      seguros_pos: ed?.seguros_pos ?? row.seguros_pos,
                                      seguros_fibra: ed?.seguros_fibra ?? row.seguros_fibra,
                                      sky_mais: ed?.sky_mais ?? row.sky_mais,
                                      movel: ed?.movel ?? row.movel ?? 0,
                                    })
                                  }
                                >
                                  {saving === key ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() =>
                                    setEditando((x) => {
                                      const n = { ...x };
                                      delete n[key];
                                      return n;
                                    })
                                  }
                                >
                                  Cancelar
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => setEditando((x) => ({ ...x, [key]: { ...row } }))}
                              >
                                Editar
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-amber-50 font-semibold">
                    <TableCell className="sticky left-0 bg-amber-50 w-12" />
                    <TableCell className="sticky left-12 bg-amber-50">Total</TableCell>
                    <TableCell />
                    {CAMPOS_META.map((c) => {
                      const t = totaisEFooter[c.key];
                      const media = t.count > 0 ? t.sumMeta / t.count : 0;
                      const pctFooter = t.sumMeta > 0 ? (t.sumRealizadas / t.sumMeta) * 100 : null;
                      return (
                        <TableCell key={c.key} className="text-right">
                          <div className="flex flex-col items-end">
                            <span>
                              {t.sumMeta.toLocaleString('pt-BR')} / {t.sumRealizadas.toLocaleString('pt-BR')}
                              {pctFooter !== null ? ` (${pctFooter.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)` : ''}
                            </span>
                            <span className="text-[10px] text-gray-600">
                              (média: {Math.round(media)})
                            </span>
                          </div>
                        </TableCell>
                      );
                    })}
                    {podeEditar && <TableCell />}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!modalDetalhe} onOpenChange={(open) => !open && setModalDetalhe(null)}>
        <DialogContent className="max-w-md">
          {modalDetalhe && (() => {
            const { row, campo } = modalDetalhe;
            const metrics = metricsPorLinha.get(`${row.mes}-${row.ano}`);
            const isPayTv = campo.key === 'pay_tv';
            const movelNaoAplicavel = campo.key === 'movel' && !isMovelAplicavel(row.ano, row.mes);
            const metaVal = isPayTv ? getPayTvMeta(row) : (row[campo.key] ?? 0);
            const realizadasVal = movelNaoAplicavel
              ? 0
              : isPayTv
                ? getPayTvRealizadas(metrics)
                : (metrics?.categorias.find((x) => x.categoria === campo.categoria)?.vendas_realizadas ?? 0);
            const pct = metaVal > 0 ? ((realizadasVal / metaVal) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : null;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {campo.label} — {getMesNomeMetas(row.mes)}/{row.ano}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  {movelNaoAplicavel ? (
                    <p className="text-gray-500">Móvel não disponível antes de jan/2026.</p>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Meta</span>
                        <span className="font-medium">{metaVal.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Realizadas</span>
                        <span className="font-medium">{realizadasVal.toLocaleString('pt-BR')}</span>
                      </div>
                      {pct !== null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Percentual</span>
                          <span className={`font-semibold ${realizadasVal >= metaVal ? 'text-green-600' : 'text-red-600'}`}>
                            {pct}%
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={modalComparar} onOpenChange={setModalComparar}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Comparar meses</DialogTitle>
          </DialogHeader>
          {(() => {
            const selecionados = dadosFiltrados.filter((r) => mesesSelecionados.has(`${r.mes}-${r.ano}`));
            if (selecionados.length < 2) return <p className="text-gray-500 py-4">Selecione pelo menos 2 meses para comparar.</p>;
            return (
              <div className="overflow-x-auto py-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      {selecionados.map((r) => (
                        <TableHead key={`${r.mes}-${r.ano}`} className="text-right">
                          {getMesNomeMetas(r.mes)}/{r.ano}
                        </TableHead>
                      ))}
                      <TableHead className="text-right min-w-[100px]">Variação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CAMPOS_META.filter((c) => c.key !== 'pay_tv').map((c) => {
                      if (c.key === 'movel') {
                        const vals = selecionados.map((r) => {
                          if (!isMovelAplicavel(r.ano, r.mes)) return null;
                          const m = metricsPorLinha.get(`${r.mes}-${r.ano}`);
                          const realizadas = m?.categorias.find((x) => x.categoria === 'MÓVEL')?.vendas_realizadas ?? 0;
                          const meta = r.movel ?? 0;
                          return { meta, realizadas };
                        });
                        const valid = vals.filter((v): v is { meta: number; realizadas: number } => v !== null);
                        if (valid.length < 2) return null;
                        const maisRecenteM = valid[0];
                        const maisAntigoM = valid[valid.length - 1];
                        const diff = maisRecenteM.realizadas - maisAntigoM.realizadas;
                        const pct = maisAntigoM.realizadas > 0 ? ((diff / maisAntigoM.realizadas) * 100).toFixed(1) : null;
                        return (
                          <TableRow key={c.key}>
                            <TableCell className="font-medium">{c.label}</TableCell>
                            {selecionados.map((r) => {
                              if (!isMovelAplicavel(r.ano, r.mes)) return <TableCell key={`${r.mes}-${r.ano}`} className="text-right text-gray-400">—</TableCell>;
                              const m = metricsPorLinha.get(`${r.mes}-${r.ano}`);
                              const real = m?.categorias.find((x) => x.categoria === 'MÓVEL')?.vendas_realizadas ?? 0;
                              const meta = r.movel ?? 0;
                              return (
                                <TableCell key={`${r.mes}-${r.ano}`} className="text-right">
                                  {meta.toLocaleString('pt-BR')} / {real.toLocaleString('pt-BR')}
                                </TableCell>
                              );
                            })}
                            <TableCell className={`text-right font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {diff >= 0 ? '+' : ''}{diff} {pct !== null ? `(${Number(pct) >= 0 ? '+' : ''}${pct}%)` : ''}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      const vals = selecionados.map((r) => {
                        const m = metricsPorLinha.get(`${r.mes}-${r.ano}`);
                        const meta = r[c.key] ?? 0;
                        const realizadas = m?.categorias.find((x) => x.categoria === c.categoria)?.vendas_realizadas ?? 0;
                        return { meta, realizadas };
                      });
                      const maisRecente = vals[0];
                      const maisAntigo = vals[vals.length - 1];
                      const diff = maisRecente.realizadas - maisAntigo.realizadas;
                      const pct = maisAntigo.realizadas > 0 ? ((diff / maisAntigo.realizadas) * 100).toFixed(1) : null;
                      return (
                        <TableRow key={c.key}>
                          <TableCell className="font-medium">{c.label}</TableCell>
                          {selecionados.map((r) => {
                            const m = metricsPorLinha.get(`${r.mes}-${r.ano}`);
                            const meta = r[c.key] ?? 0;
                            const real = m?.categorias.find((x) => x.categoria === c.categoria)?.vendas_realizadas ?? 0;
                            return (
                              <TableCell key={`${r.mes}-${r.ano}`} className="text-right">
                                {meta.toLocaleString('pt-BR')} / {real.toLocaleString('pt-BR')}
                              </TableCell>
                            );
                          })}
                          <TableCell className={`text-right font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {diff >= 0 ? '+' : ''}{diff} {pct !== null ? `(${Number(pct) >= 0 ? '+' : ''}${pct}%)` : ''}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-amber-50 font-semibold">
                      <TableCell>PAY TV</TableCell>
                      {selecionados.map((r) => {
                        const meta = getPayTvMeta(r);
                        const real = getPayTvRealizadas(metricsPorLinha.get(`${r.mes}-${r.ano}`));
                        return (
                          <TableCell key={`${r.mes}-${r.ano}`} className="text-right">
                            {meta.toLocaleString('pt-BR')} / {real.toLocaleString('pt-BR')}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        {(() => {
                          const maisRecente = selecionados[0];
                          const maisAntigo = selecionados[selecionados.length - 1];
                          const realRecente = getPayTvRealizadas(metricsPorLinha.get(`${maisRecente.mes}-${maisRecente.ano}`));
                          const realAntigo = getPayTvRealizadas(metricsPorLinha.get(`${maisAntigo.mes}-${maisAntigo.ano}`));
                          const diff = realRecente - realAntigo;
                          const pct = realAntigo > 0 ? ((diff / realAntigo) * 100).toFixed(1) : null;
                          return (
                            <span className={diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {diff >= 0 ? '+' : ''}{diff} {pct !== null ? `(${Number(pct) >= 0 ? '+' : ''}${pct}%)` : ''}
                            </span>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
