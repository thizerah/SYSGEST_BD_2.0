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
  deleteMetaVendedor,
  getMesNome,
  MESES_NOMES,
} from '@/lib/metas-vendedor';
import type { MetaVendedor } from '@/lib/metas-vendedor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Target, Plus, Loader2, Trash2, FilterX, Users } from 'lucide-react';

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

const valoresIniciais = () =>
  Object.fromEntries(CAMPOS_META.map((c) => [c.key, ''])) as Record<(typeof CAMPOS_META)[number]['key'], string>;

function parseValoresParaNumeros(v: Record<string, string>): Record<string, number> {
  return Object.fromEntries(
    CAMPOS_META.map((c) => [c.key, parseInt(String(v[c.key]), 10) || 0])
  );
}

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
  const [modalLote, setModalLote] = useState(false);
  const [novoVendedor, setNovoVendedor] = useState('');
  const [novoMes, setNovoMes] = useState<string>(String(new Date().getMonth() + 1));
  const [novoAno, setNovoAno] = useState<number>(new Date().getFullYear());
  const [novoValores, setNovoValores] = useState(valoresIniciais);
  const [loteVendedores, setLoteVendedores] = useState<Set<string>>(new Set());
  const [loteMes, setLoteMes] = useState<string>(String(new Date().getMonth() + 1));
  const [loteAno, setLoteAno] = useState<number>(new Date().getFullYear());
  const [loteValores, setLoteValores] = useState(valoresIniciais);
  const [modalEditar, setModalEditar] = useState<MetaVendedor | null>(null);
  const [editarForm, setEditarForm] = useState<{
    vendedor: string;
    mes: string;
    ano: number;
    valores: Record<string, string>;
  } | null>(null);

  const carregar = useCallback(async () => {
    if (!donoUserId) return;
    try {
      const [rows, eq] = await Promise.all([
        fetchMetasVendedor(donoUserId),
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
  }, [donoUserId, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const vendedoresDaEquipe = useMemo(
    () =>
      equipe
        .filter((e) => e.funcao === 'vendedor')
        .map((e) => e.nome_completo)
        .filter(Boolean)
        .sort(),
    [equipe]
  );

  // Opções disponíveis calculadas a partir dos dados carregados
  const mesesDisponiveis = useMemo(() => {
    const nums = [...new Set(dados.map((r) => r.mes))].sort((a, b) => a - b);
    return nums.map((n) => ({ valor: String(n), nome: getMesNome(n) }));
  }, [dados]);

  const anosDisponiveis = useMemo(
    () => [...new Set(dados.map((r) => r.ano))].sort((a, b) => b - a),
    [dados]
  );

  const vendedoresDisponiveis = useMemo(
    () => [...new Set(dados.map((r) => r.vendedor_nome))].sort(),
    [dados]
  );

  // Filtragem client-side
  const dadosFiltrados = useMemo(() => {
    return dados.filter((r) => {
      if (filtroMes !== '__todos__' && r.mes !== parseInt(filtroMes, 10)) return false;
      if (filtroAno !== '__todos__' && r.ano !== parseInt(filtroAno, 10)) return false;
      if (filtroVendedor !== '__todos__' && r.vendedor_nome !== filtroVendedor) return false;
      return true;
    });
  }, [dados, filtroMes, filtroAno, filtroVendedor]);

  const limparFiltros = () => {
    setFiltroMes('__todos__');
    setFiltroAno('__todos__');
    setFiltroVendedor('__todos__');
  };

  const filtrosAtivos = filtroMes !== '__todos__' || filtroAno !== '__todos__' || filtroVendedor !== '__todos__';

  const abrirModalEditar = (row: MetaVendedor) => {
    setModalEditar(row);
    setEditarForm({
      vendedor: row.vendedor_nome,
      mes: String(row.mes),
      ano: row.ano,
      valores: Object.fromEntries(
        CAMPOS_META.map((c) => [c.key, String(row[c.key] ?? '')])
      ) as Record<string, string>,
    });
  };

  const salvarEdicao = async () => {
    if (!donoUserId || !podeEditar || !modalEditar || !editarForm) return;
    const vendedor = editarForm.vendedor.trim();
    if (!vendedor) {
      toast({ title: 'Informe o vendedor', variant: 'destructive' });
      return;
    }
    const mesNum = parseInt(editarForm.mes, 10);
    const parsed = parseValoresParaNumeros(editarForm.valores);
    const mudouChave =
      vendedor !== modalEditar.vendedor_nome ||
      mesNum !== modalEditar.mes ||
      editarForm.ano !== modalEditar.ano;

    setSaving('__editar__');
    try {
      if (mudouChave) {
        await deleteMetaVendedor(
          donoUserId,
          modalEditar.vendedor_nome,
          modalEditar.mes,
          modalEditar.ano
        );
      }
      await upsertMetaVendedor(donoUserId, {
        vendedor_nome: vendedor,
        mes: mesNum,
        ano: editarForm.ano,
        ...parsed,
        total: getPayTvMeta(parsed),
      });
      await carregar();
      setModalEditar(null);
      setEditarForm(null);
      toast({ title: 'Salvo', description: `Meta de ${vendedor} atualizada.` });
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

  const excluirEdicao = async () => {
    if (!donoUserId || !podeEditar || !modalEditar) return;
    setSaving('__editar__');
    try {
      await deleteMetaVendedor(
        donoUserId,
        modalEditar.vendedor_nome,
        modalEditar.mes,
        modalEditar.ano
      );
      await carregar();
      setModalEditar(null);
      setEditarForm(null);
      toast({ title: 'Excluído', description: 'Meta removida.' });
    } catch (e) {
      toast({
        title: 'Erro ao excluir',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const adicionarEmLote = async () => {
    if (!donoUserId || !podeEditar) return;
    if (loteVendedores.size === 0) {
      toast({ title: 'Selecione ao menos um vendedor', variant: 'destructive' });
      return;
    }
    const mesNum = parseInt(loteMes, 10);
    const parsed = parseValoresParaNumeros(loteValores);
    const vendedoresSelecionados = Array.from(loteVendedores);
    const duplicados = vendedoresSelecionados.filter((v) =>
      dados.some((d) => d.vendedor_nome === v && d.mes === mesNum && d.ano === loteAno)
    );
    if (duplicados.length > 0) {
      toast({
        title: 'Já existe meta para',
        description: `${duplicados.join(', ')} em ${getMesNome(mesNum)}/${loteAno}.`,
        variant: 'destructive',
      });
      return;
    }
    setSaving('__lote__');
    try {
      await Promise.all(
        vendedoresSelecionados.map((vendedor) =>
          upsertMetaVendedor(donoUserId, {
            vendedor_nome: vendedor,
            mes: mesNum,
            ano: loteAno,
            ...parsed,
            total: getPayTvMeta(parsed),
          })
        )
      );
      await carregar();
      setModalLote(false);
      setLoteVendedores(new Set());
      setLoteMes(String(new Date().getMonth() + 1));
      setLoteAno(new Date().getFullYear());
      setLoteValores(valoresIniciais());
      toast({
        title: 'Adicionado em lote',
        description: `Meta criada para ${vendedoresSelecionados.length} vendedor(es).`,
      });
    } catch (e) {
      toast({
        title: 'Erro ao adicionar em lote',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const toggleLoteVendedor = (nome: string) => {
    setLoteVendedores((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  };

  const selecionarTodosLote = () => {
    setLoteVendedores(new Set(vendedoresDaEquipe));
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
    const parsed = parseValoresParaNumeros(novoValores);
    setSaving('__novo__');
    try {
      await upsertMetaVendedor(donoUserId, {
        vendedor_nome: vendedor,
        mes: mesNum,
        ano: novoAno,
        ...parsed,
        total: getPayTvMeta(parsed),
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
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Mês</Label>
                <Select value={filtroMes} onValueChange={setFiltroMes}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos</SelectItem>
                    {mesesDisponiveis.map((m) => (
                      <SelectItem key={m.valor} value={m.valor}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Ano</Label>
                <Select value={filtroAno} onValueChange={setFiltroAno}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos</SelectItem>
                    {anosDisponiveis.map((a) => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Vendedor</Label>
                <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos</SelectItem>
                    {vendedoresDisponiveis.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filtrosAtivos && (
                <Button variant="outline" size="sm" onClick={limparFiltros} className="h-9 shrink-0 self-end">
                  <FilterX className="h-4 w-4 mr-1" />
                  Limpar filtros
                </Button>
              )}
              {podeEditar && (
                <div className="flex gap-2 self-end">
                  <Button
                    size="sm"
                    onClick={() => setMostrarAdicionar(!mostrarAdicionar)}
                    variant={mostrarAdicionar ? 'outline' : 'default'}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setModalLote(true)}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Adicionar em Lote
                  </Button>
                </div>
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
                      value={novoValores[c.key] ?? ''}
                      onChange={(e) =>
                        setNovoValores((v) => ({ ...v, [c.key]: e.target.value }))
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

          {filtroMes === '__todos__' || filtroAno === '__todos__' ? (
            <p className="text-gray-500 text-center py-10">
              Selecione o <strong>Mês</strong> e o <strong>Ano</strong> para visualizar as metas.
            </p>
          ) : dadosFiltrados.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhuma meta cadastrada para {getMesNome(parseInt(filtroMes, 10))}/{filtroAno}.
              {podeEditar && ' Clique em Adicionar para criar.'}
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
                  {dadosFiltrados.map((row) => {
                    const key = `${row.vendedor_nome}-${row.mes}-${row.ano}`;
                    return (
                      <TableRow key={key} className="bg-white even:bg-gray-50/50">
                        <TableCell className="font-medium">{row.vendedor_nome}</TableCell>
                        <TableCell>{getMesNome(row.mes)}</TableCell>
                        <TableCell>{row.ano}</TableCell>
                        {CAMPOS_META.map((c) => (
                          <TableCell key={c.key} className="text-right">
                            {(row[c.key] ?? 0).toLocaleString('pt-BR')}
                          </TableCell>
                        ))}
                        {podeEditar && (
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => abrirModalEditar(row)}
                            >
                              Editar
                            </Button>
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

      <Dialog open={!!modalEditar} onOpenChange={(open) => !open && (setModalEditar(null), setEditarForm(null))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar meta</DialogTitle>
          </DialogHeader>
          {modalEditar && editarForm && (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                  <Label>Vendedor</Label>
                  <Select
                    value={editarForm.vendedor}
                    onValueChange={(v) => setEditarForm((f) => f && { ...f, vendedor: v })}
                  >
                    <SelectTrigger className="w-[220px]">
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
                  <Select
                    value={editarForm.mes}
                    onValueChange={(v) => setEditarForm((f) => f && { ...f, mes: v })}
                  >
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
                    placeholder=""
                    className="w-24"
                    value={editarForm.ano}
                    onChange={(e) =>
                      setEditarForm((f) =>
                        f ? { ...f, ano: parseInt(e.target.value, 10) || new Date().getFullYear() } : null
                      )
                    }
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
                      value={editarForm.valores[c.key] ?? ''}
                      onChange={(e) =>
                        setEditarForm((f) =>
                          f ? {
                            ...f,
                            valores: { ...f.valores, [c.key]: e.target.value },
                          } : null
                        )
                      }
                      min={0}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={saving === '__editar__'}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir meta</AlertDialogTitle>
                      <AlertDialogDescription>
                        Excluir a meta de <strong>{modalEditar.vendedor_nome}</strong> em{' '}
                        {getMesNome(modalEditar.mes)}/{modalEditar.ano}? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={excluirEdicao}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => (setModalEditar(null), setEditarForm(null))}>
                    Cancelar
                  </Button>
                  <Button onClick={salvarEdicao} disabled={saving === '__editar__'}>
                    {saving === '__editar__' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal – Adicionar em Lote */}
      <Dialog
        open={modalLote}
        onOpenChange={(open) => {
          if (!open) {
            setLoteVendedores(new Set());
            setLoteMes(String(new Date().getMonth() + 1));
            setLoteAno(new Date().getFullYear());
            setLoteValores(valoresIniciais());
          }
          setModalLote(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Adicionar metas em lote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Período */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Período
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Mês</Label>
                  <Select value={loteMes} onValueChange={setLoteMes}>
                    <SelectTrigger className="w-[150px]">
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
                    value={loteAno}
                    onChange={(e) => setLoteAno(parseInt(e.target.value, 10) || new Date().getFullYear())}
                    min={2020}
                    max={2030}
                  />
                </div>
              </div>
            </div>

            {/* Metas */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Valores das metas
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {CAMPOS_META.map((c) => (
                  <div key={c.key} className="flex flex-col gap-1.5">
                    <Label>{c.label}</Label>
                    <Input
                      type="number"
                      placeholder=""
                      value={loteValores[c.key] ?? ''}
                      onChange={(e) =>
                        setLoteValores((v) => ({ ...v, [c.key]: e.target.value }))
                      }
                      min={0}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Vendedores */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Vendedores
                </p>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={
                    loteVendedores.size === vendedoresDaEquipe.length
                      ? () => setLoteVendedores(new Set())
                      : selecionarTodosLote
                  }
                >
                  {loteVendedores.size === vendedoresDaEquipe.length
                    ? 'Desmarcar todos'
                    : 'Selecionar todos'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 border rounded-md p-3 bg-gray-50">
                {vendedoresDaEquipe.map((v) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer select-none py-1">
                    <Checkbox
                      checked={loteVendedores.has(v)}
                      onCheckedChange={() => toggleLoteVendedor(v)}
                    />
                    <span className="text-sm leading-tight">{v}</span>
                  </label>
                ))}
              </div>
              {loteVendedores.size > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {loteVendedores.size} vendedor(es) selecionado(s)
                </p>
              )}
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setModalLote(false)}
                disabled={saving === '__lote__'}
              >
                Cancelar
              </Button>
              <Button onClick={adicionarEmLote} disabled={saving === '__lote__'}>
                {saving === '__lote__' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Users className="h-4 w-4 mr-1" />
                )}
                Salvar em lote
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
