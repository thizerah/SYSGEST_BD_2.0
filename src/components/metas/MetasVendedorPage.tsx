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
import { useToast } from '@/components/ui/use-toast';
import { fetchEquipe } from '@/lib/equipe';
import {
  fetchMetasVendedor,
  upsertMetaVendedor,
  getMesNome,
  MESES_NOMES,
} from '@/lib/metas-vendedor';
import type { MetaVendedor } from '@/lib/metas-vendedor';
import { Target, Plus, Loader2 } from 'lucide-react';

const MESES_OPCOES = Object.entries(MESES_NOMES).map(([num, nome]) => ({
  valor: num,
  nome,
}));

const CAMPOS_META = [
  { key: 'pos_pago' as const, label: 'Pos Pago' },
  { key: 'flex_conforto' as const, label: 'Flex Conforto' },
  { key: 'nova_parabolica' as const, label: 'Nova Parabólica' },
  { key: 'fibra' as const, label: 'Fibra' },
  { key: 'seguros_pos' as const, label: 'Seguros Pos' },
  { key: 'seguros_fibra' as const, label: 'Seguros Fibra' },
  { key: 'sky_mais' as const, label: 'Sky+' },
  { key: 'movel' as const, label: 'Móvel' },
];

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

function getPayTvMeta(row: Pick<MetaVendedor, 'pos_pago' | 'flex_conforto' | 'nova_parabolica'>): number {
  return (row.pos_pago ?? 0) + (row.flex_conforto ?? 0) + (row.nova_parabolica ?? 0);
}

export function MetasVendedorPage() {
  const { authExtras, user, hasPermissao } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? '';
  const podeEditar = hasPermissao('editar_metas_vendedor');

  const [dados, setDados] = useState<MetaVendedor[]>([]);
  const [equipe, setEquipe] = useState<Awaited<ReturnType<typeof fetchEquipe>>>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [filtroAno, setFiltroAno] = useState<string>('__todos__');
  const [filtroMes, setFiltroMes] = useState<string>('__todos__');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('__todos__');
  const [mostrarAdicionar, setMostrarAdicionar] = useState(false);
  const [novoVendedor, setNovoVendedor] = useState('');
  const [novoMes, setNovoMes] = useState<string>(String(new Date().getMonth() + 1));
  const [novoAno, setNovoAno] = useState<number>(new Date().getFullYear());
  const [novoValores, setNovoValores] = useState(valoresIniciais);
  const [editando, setEditando] = useState<Record<string, Partial<MetaVendedor>>>({});

  const carregar = useCallback(async () => {
    if (!donoUserId) return;
    try {
      const filtro: { mes?: number; ano?: number; vendedor?: string } = {};
      if (filtroMes !== '__todos__') filtro.mes = parseInt(filtroMes, 10);
      if (filtroAno !== '__todos__') filtro.ano = parseInt(filtroAno, 10);
      if (filtroVendedor !== '__todos__') filtro.vendedor = filtroVendedor;
      const [rows, eq] = await Promise.all([
        fetchMetasVendedor(donoUserId, filtro),
        fetchEquipe(donoUserId),
      ]);
      setDados(rows);
      setEquipe(eq);
    } catch (e) {
      toast({
        title: 'Erro ao carregar metas',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  }, [donoUserId, filtroMes, filtroAno, filtroVendedor, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const vendedoresUnicos = useMemo(
    () => [...new Set(dados.map((r) => r.vendedor_nome))].sort(),
    [dados]
  );
  const vendedoresDaEquipe = useMemo(
    () => equipe.map((e) => e.nome_completo).filter(Boolean).sort(),
    [equipe]
  );
  const anosDisponiveis = useMemo(
    () => [...new Set(dados.map((r) => r.ano))].sort((a, b) => b - a),
    [dados]
  );

  const salvar = async (item: MetaVendedor) => {
    if (!donoUserId || !podeEditar) return;
    const key = `${item.vendedor_nome}-${item.mes}-${item.ano}`;
    setSaving(key);
    try {
      await upsertMetaVendedor(donoUserId, {
        vendedor_nome: item.vendedor_nome,
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
      setEditando((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
      toast({ title: 'Salvo', description: `Meta de ${item.vendedor_nome} atualizada.` });
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
    const vendedor = novoVendedor.trim();
    if (!vendedor) {
      toast({ title: 'Informe o vendedor', variant: 'destructive' });
      return;
    }
    const mesNum = parseInt(novoMes, 10);
    const duplicado = dados.some(
      (d) => d.vendedor_nome === vendedor && d.mes === mesNum && d.ano === novoAno
    );
    if (duplicado) {
      toast({
        title: 'Já existe',
        description: `Meta para ${vendedor} em ${getMesNome(mesNum)}/${novoAno} já existe.`,
        variant: 'destructive',
      });
      return;
    }
    setSaving('__novo__');
    try {
      await upsertMetaVendedor(donoUserId, {
        vendedor_nome: vendedor,
        mes: mesNum,
        ano: novoAno,
        ...novoValores,
        total: getPayTvMeta({ ...novoValores, pos_pago: novoValores.pos_pago, flex_conforto: novoValores.flex_conforto, nova_parabolica: novoValores.nova_parabolica }),
      });
      await carregar();
      setMostrarAdicionar(false);
      setNovoVendedor('');
      setNovoMes(String(new Date().getMonth() + 1));
      setNovoAno(new Date().getFullYear());
      setNovoValores(valoresIniciais());
      toast({ title: 'Adicionado', description: `Meta de ${vendedor} criada.` });
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
                Meta de Vendas por Vendedor
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-gray-600">
                Metas mensais por vendedor. Filtre por mês, ano e vendedor.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filtroAno} onValueChange={setFiltroAno}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos</SelectItem>
                  {anosDisponiveis.length > 0
                    ? anosDisponiveis.map((a) => (
                        <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                      ))
                    : [new Date().getFullYear()].map((a) => (
                        <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                      ))}
                </SelectContent>
              </Select>
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos</SelectItem>
                  {MESES_OPCOES.map((m) => (
                    <SelectItem key={m.valor} value={m.valor}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos</SelectItem>
                  {vendedoresUnicos.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
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
              <h4 className="font-medium text-sm">Nova meta</h4>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                  <Label>Vendedor</Label>
                  <Select value={novoVendedor} onValueChange={setNovoVendedor}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedoresDaEquipe.map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Mês</Label>
                  <Select value={novoMes} onValueChange={setNovoMes}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES_OPCOES.map((m) => (
                        <SelectItem key={m.valor} value={m.valor}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Ano</Label>
                  <Input
                    type="number"
                    placeholder="Ano"
                    className="w-24"
                    value={novoAno}
                    onChange={(e) => setNovoAno(parseInt(e.target.value, 10) || new Date().getFullYear())}
                    min={2020}
                    max={2030}
                  />
                </div>
                {CAMPOS_META.map((c) => (
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
                  <Button variant="outline" onClick={() => setMostrarAdicionar(false)} disabled={saving === '__novo__'}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {dados.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhuma meta cadastrada. {podeEditar && 'Clique em Adicionar para criar.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Vendedor</TableHead>
                    <TableHead className="font-semibold">Mês</TableHead>
                    <TableHead className="font-semibold">Ano</TableHead>
                    {CAMPOS_META.map((c) => (
                      <TableHead key={c.key} className="font-semibold text-right min-w-[90px]">
                        {c.label}
                      </TableHead>
                    ))}
                    {podeEditar && <TableHead className="w-24" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.map((row) => {
                    const key = `${row.vendedor_nome}-${row.mes}-${row.ano}`;
                    const ed = editando[key];
                    const isEditing = !!ed;

                    return (
                      <TableRow key={key} className="bg-white even:bg-gray-50/50">
                        <TableCell className="font-medium">{row.vendedor_nome}</TableCell>
                        <TableCell>{getMesNome(row.mes)}</TableCell>
                        <TableCell>{row.ano}</TableCell>
                        {CAMPOS_META.map((c) => (
                          <TableCell key={c.key} className="text-right">
                            {isEditing && podeEditar ? (
                              <Input
                                type="number"
                                className="w-20 h-8 text-right"
                                value={ed?.[c.key] ?? row[c.key] ?? 0}
                                onChange={(e) =>
                                  setEditando((x) => ({
                                    ...x,
                                    [key]: { ...(x[key] ?? row), [c.key]: parseInt(e.target.value, 10) || 0 },
                                  }))
                                }
                                min={0}
                              />
                            ) : (
                              (row[c.key] ?? 0).toLocaleString('pt-BR')
                            )}
                          </TableCell>
                        ))}
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
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
