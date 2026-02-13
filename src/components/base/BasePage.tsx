import { useState, useEffect, useCallback } from 'react';
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
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/auth';
import useData from '@/context/useData';
import { useToast } from '@/components/ui/use-toast';
import {
  fetchBaseData,
  upsertBaseRow,
  ordenarPorMesAno,
  getMesNome,
  MESES_NOMES,
} from '@/lib/base';
import type { BaseData } from '@/types';
import { Database, Plus, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

const MESES_OPCOES = Object.entries(MESES_NOMES).map(([num, nome]) => ({
  valor: num,
  nome,
}));

function calcularVariacao(
  atual: number,
  anterior: number
): { pct: number; diff: number; subindo: boolean } | null {
  if (anterior === 0) return null;
  const diff = atual - anterior;
  const pct = (diff / anterior) * 100;
  return { pct, diff, subindo: pct > 0 };
}

/** Formato curto do mês para "vs Nov/25" */
function formatarMesAnoLabel(mes: string, ano: number): string {
  const abreviacao = String(mes).slice(0, 3);
  const anoCurto = String(ano).slice(-2);
  return `${abreviacao}/${anoCurto}`;
}

/** Formata valor como moeda (R$) */
function formatarMoeda(valor: number | undefined | null): string {
  if (valor == null || isNaN(valor)) return '—';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function BasePage() {
  const { authExtras, user, hasPermissao } = useAuth();
  const { refreshBaseData } = useData();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? '';
  const podeEditar = hasPermissao('editar_base');

  const [dados, setDados] = useState<BaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [anoFiltro, setAnoFiltro] = useState<string>('');
  const [mostrarAdicionar, setMostrarAdicionar] = useState(false);
  const [novoMes, setNovoMes] = useState<string>('1');
  const [novoAno, setNovoAno] = useState<number>(new Date().getFullYear());
  const [novoBaseTv, setNovoBaseTv] = useState<string>('0');
  const [novoBaseFibra, setNovoBaseFibra] = useState<string>('0');
  const [novoAlianca, setNovoAlianca] = useState<string>('0');
  const [novoAliancaFibra, setNovoAliancaFibra] = useState<string>('');
  const [editando, setEditando] = useState<Record<string, Partial<BaseData>>>({});

  const carregar = useCallback(async () => {
    if (!donoUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchBaseData(donoUserId);
      setDados(rows.sort(ordenarPorMesAno));
      const anos = [...new Set(rows.map((r) => r.ano))].sort((a, b) => b - a);
      if (anos.length > 0 && !anoFiltro) setAnoFiltro(String(anos[0]));
    } catch (e) {
      toast({
        title: 'Erro ao carregar Base',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [donoUserId, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const dadosOrdenados = [...dados].sort(ordenarPorMesAno);
  const dadosFiltrados = anoFiltro && anoFiltro !== '__todos__'
    ? dadosOrdenados.filter((r) => String(r.ano) === anoFiltro)
    : dadosOrdenados;

  const mapaAnterior = useCallback(() => {
    const mapa = new Map<
      string,
      { base_tv: number; base_fibra: number; mes: string; ano: number }
    >();
    for (let i = dadosOrdenados.length - 1; i >= 0; i--) {
      const curr = dadosOrdenados[i]!;
      const key = `${curr.mes}-${curr.ano}`;
      const prev = dadosOrdenados[i + 1];
      if (prev) mapa.set(key, { base_tv: prev.base_tv, base_fibra: prev.base_fibra, mes: prev.mes, ano: prev.ano });
    }
    return mapa;
  }, [dadosOrdenados]);

  const anteriorMap = mapaAnterior();

  const salvar = async (item: BaseData) => {
    if (!donoUserId || !podeEditar) return;
    const key = `${item.mes}-${item.ano}`;
    setSaving(key);
    try {
      await upsertBaseRow(donoUserId, item);
      await carregar();
      await refreshBaseData();
      setEditando((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
      toast({ title: 'Salvo', description: `${item.mes}/${item.ano} atualizado.` });
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
    const mesNome = getMesNome(parseInt(novoMes, 10));
    if (!mesNome) {
      toast({ title: 'Mês inválido', variant: 'destructive' });
      return;
    }
    const duplicado = dados.some(
      (d) => String(d.mes) === mesNome && d.ano === novoAno
    );
    if (duplicado) {
      toast({
        title: 'Já existe',
        description: `Registro para ${mesNome}/${novoAno} já existe.`,
        variant: 'destructive',
      });
      return;
    }
    const baseTv = parseInt(novoBaseTv, 10) || 0;
    const baseFibra = parseInt(novoBaseFibra, 10) || 0;
    const alianca = parseFloat(novoAlianca.replace(',', '.')) || 0;
    const aliancaFibra = novoAliancaFibra.trim()
      ? parseFloat(novoAliancaFibra.replace(',', '.')) || undefined
      : undefined;
    setSaving('__novo__');
    try {
      await upsertBaseRow(donoUserId, {
        mes: mesNome,
        ano: novoAno,
        base_tv: baseTv,
        base_fibra: baseFibra,
        alianca,
        alianca_fibra: aliancaFibra,
      });
      await carregar();
      await refreshBaseData();
      setMostrarAdicionar(false);
      setNovoMes('1');
      setNovoAno(new Date().getFullYear());
      setNovoBaseTv('0');
      setNovoBaseFibra('0');
      setNovoAlianca('0');
      setNovoAliancaFibra('');
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

  const VariacaoBadge = ({
    atual,
    anterior,
    mesAnteriorLabel,
  }: {
    atual: number;
    anterior: number;
    mesAnteriorLabel?: string;
  }) => {
    const v = calcularVariacao(atual, anterior);
    if (!v) return <span className="text-gray-400">—</span>;
    const cor = v.subindo ? 'text-green-600' : 'text-red-600';
    const icone = v.subindo ? (
      <TrendingUp className="h-3.5 w-3.5 shrink-0" />
    ) : (
      <TrendingDown className="h-3.5 w-3.5 shrink-0" />
    );
    const sinal = v.diff >= 0 ? '+' : '';
    return (
      <div className="inline-flex flex-col items-end">
        <span className={`inline-flex items-center gap-1 font-medium ${cor}`}>
          {icone}
          {v.pct >= 0 ? '+' : ''}
          {v.pct.toFixed(1)}% ({sinal}
          {v.diff.toLocaleString('pt-BR')})
        </span>
        {mesAnteriorLabel && (
          <span className="text-[10px] text-gray-500 mt-0.5">vs {mesAnteriorLabel}</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="bg-slate-100 p-2 rounded-lg">
                  <Database className="h-5 w-5 text-slate-600" />
                </div>
                Base (TV, Fibra, Aliança)
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-gray-600">
                Dados mensais da base de clientes. Variação em relação ao mês anterior.
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
              <div className="grid grid-cols-2 sm:grid-cols-8 gap-3">
                <Select value={novoMes} onValueChange={setNovoMes}>
                  <SelectTrigger>
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
                <Input
                  type="number"
                  placeholder="Ano"
                  value={novoAno}
                  onChange={(e) => setNovoAno(parseInt(e.target.value, 10) || new Date().getFullYear())}
                  min={2020}
                  max={2030}
                />
                <Input
                  type="number"
                  placeholder="Base TV"
                  value={novoBaseTv}
                  onChange={(e) => setNovoBaseTv(e.target.value)}
                  min={0}
                />
                <Input
                  type="text"
                  placeholder="Aliança TV (R$)"
                  value={novoAlianca}
                  onChange={(e) => setNovoAlianca(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Base Fibra"
                  value={novoBaseFibra}
                  onChange={(e) => setNovoBaseFibra(e.target.value)}
                  min={0}
                />
                <Input
                  type="text"
                  placeholder="Aliança Fibra (R$)"
                  value={novoAliancaFibra}
                  onChange={(e) => setNovoAliancaFibra(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={adicionar} disabled={saving === '__novo__'}>
                    {saving === '__novo__' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMostrarAdicionar(false);
                      setNovoMes('1');
                      setNovoAno(new Date().getFullYear());
                      setNovoBaseTv('0');
                      setNovoBaseFibra('0');
                      setNovoAlianca('0');
                      setNovoAliancaFibra('');
                    }}
                    disabled={saving === '__novo__'}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {dadosFiltrados.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhum dado de base cadastrado. {podeEditar && 'Clique em Adicionar para criar.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Mês</TableHead>
                    <TableHead className="font-semibold">Ano</TableHead>
                    <TableHead className="font-semibold text-right">Base TV</TableHead>
                    <TableHead className="font-semibold text-right">Aliança TV</TableHead>
                    <TableHead className="font-semibold text-right" title="Comparado ao mês anterior (cronológico)">
                      Var. TV (vs mês ant.)
                    </TableHead>
                    <TableHead className="font-semibold text-right">Base Fibra</TableHead>
                    <TableHead className="font-semibold text-right">Aliança Fibra</TableHead>
                    <TableHead className="font-semibold text-right" title="Comparado ao mês anterior (cronológico)">
                      Var. Fibra (vs mês ant.)
                    </TableHead>
                    {podeEditar && <TableHead className="w-24" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosFiltrados.map((row, idx) => {
                    const key = `${row.mes}-${row.ano}`;
                    const prev = anteriorMap.get(key);
                    const ed = editando[key];
                    const isEditing = !!ed;
                    const baseTv = ed?.base_tv ?? row.base_tv;
                    const baseFibra = ed?.base_fibra ?? row.base_fibra;
                    const alianca = ed?.alianca ?? row.alianca;
                    const aliancaFibra = ed?.alianca_fibra ?? row.alianca_fibra ?? null;

                    return (
                      <TableRow key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <TableCell className="font-medium">{row.mes}</TableCell>
                        <TableCell>{row.ano}</TableCell>
                        <TableCell className="text-right">
                          {isEditing && podeEditar ? (
                            <Input
                              type="number"
                              className="w-24 h-8 text-right"
                              value={baseTv}
                              onChange={(e) =>
                                setEditando((x) => ({
                                  ...x,
                                  [key]: { ...(x[key] ?? row), base_tv: parseInt(e.target.value, 10) || 0 },
                                }))
                              }
                              min={0}
                            />
                          ) : (
                            row.base_tv.toLocaleString('pt-BR')
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing && podeEditar ? (
                            <Input
                              type="text"
                              className="w-24 h-8 text-right"
                              placeholder="R$"
                              value={typeof alianca === 'number' ? String(alianca) : ''}
                              onChange={(e) =>
                                setEditando((x) => ({
                                  ...x,
                                  [key]: {
                                    ...(x[key] ?? row),
                                    alianca: parseFloat(e.target.value.replace(',', '.')) || 0,
                                  },
                                }))
                              }
                            />
                          ) : (
                            formatarMoeda(row.alianca)
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {prev ? (
                            <VariacaoBadge
                              atual={row.base_tv}
                              anterior={prev.base_tv}
                              mesAnteriorLabel={formatarMesAnoLabel(prev.mes, prev.ano)}
                            />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing && podeEditar ? (
                            <Input
                              type="number"
                              className="w-24 h-8 text-right"
                              value={baseFibra}
                              onChange={(e) =>
                                setEditando((x) => ({
                                  ...x,
                                  [key]: { ...(x[key] ?? row), base_fibra: parseInt(e.target.value, 10) || 0 },
                                }))
                              }
                              min={0}
                            />
                          ) : (
                            row.base_fibra.toLocaleString('pt-BR')
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing && podeEditar ? (
                            <Input
                              type="text"
                              className="w-24 h-8 text-right"
                              placeholder="R$"
                              value={aliancaFibra != null && aliancaFibra !== '' ? String(aliancaFibra) : ''}
                              onChange={(e) => {
                                const v = e.target.value.trim();
                                setEditando((x) => ({
                                  ...x,
                                  [key]: {
                                    ...(x[key] ?? row),
                                    alianca_fibra: v ? parseFloat(v.replace(',', '.')) || undefined : undefined,
                                  },
                                }));
                              }}
                            />
                          ) : (
                            formatarMoeda(row.alianca_fibra)
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {prev ? (
                            <VariacaoBadge
                              atual={row.base_fibra}
                              anterior={prev.base_fibra}
                              mesAnteriorLabel={formatarMesAnoLabel(prev.mes, prev.ano)}
                            />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        {podeEditar && (
                          <TableCell>
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
                                      base_tv: typeof baseTv === 'number' ? baseTv : row.base_tv,
                                      base_fibra: typeof baseFibra === 'number' ? baseFibra : row.base_fibra,
                                      alianca: typeof alianca === 'number' ? alianca : row.alianca,
                                      alianca_fibra: aliancaFibra != null && aliancaFibra !== ''
                                        ? (typeof aliancaFibra === 'number' ? aliancaFibra : parseFloat(String(aliancaFibra).replace(',', '.')))
                                        : undefined,
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
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
