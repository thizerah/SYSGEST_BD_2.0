import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import { fetchMovimentacoesComSeriais } from '@/lib/estoque';
import type { Movimentacao, TipoMovimentacao } from '@/types/estoque';

const TIPO_LABEL: Record<TipoMovimentacao, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  transferencia: 'Transferência',
  ajuste: 'Ajuste',
};

const TIPO_BADGE: Record<TipoMovimentacao, string> = {
  entrada: 'bg-green-100 text-green-800 hover:bg-green-100',
  saida: 'bg-red-100 text-red-800 hover:bg-red-100',
  transferencia: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  ajuste: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type LinhaSerial = { mov: Movimentacao; numero_serial: string | null };

export function HistoricoMovimentacoes() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;

  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(false);

  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const load = useCallback(async () => {
    if (!donoUserId) return;
    setLoading(true);
    try {
      setMovimentacoes(
        await fetchMovimentacoesComSeriais(donoUserId, {
          tipo_movimentacao: filtroTipo !== 'todos' ? (filtroTipo as TipoMovimentacao) : undefined,
          data_inicio: dataInicio || undefined,
          data_fim: dataFim ? `${dataFim}T23:59:59` : undefined,
        })
      );
    } catch (e) {
      toast({
        title: 'Erro',
        description: e instanceof Error ? e.message : 'Falha ao carregar o histórico de material.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [donoUserId, filtroTipo, dataInicio, dataFim, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const movFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return movimentacoes;
    return movimentacoes.filter((m) => {
      return (
        m.material?.codigo_material?.toLowerCase().includes(q) ||
        m.material?.descricao?.toLowerCase().includes(q) ||
        m.numero_nota_fiscal?.toLowerCase().includes(q) ||
        (m.seriais_vinculados ?? []).some((s) => s.numero_serial.toLowerCase().includes(q))
      );
    });
  }, [movimentacoes, busca]);

  const movPorQuantidade = useMemo(
    () => movFiltradas.filter((m) => !m.material?.serializado),
    [movFiltradas]
  );

  const linhasSerializadas = useMemo((): LinhaSerial[] => {
    const out: LinhaSerial[] = [];
    for (const m of movFiltradas) {
      if (!m.material?.serializado) continue;
      const list = m.seriais_vinculados ?? [];
      if (list.length === 0) {
        out.push({ mov: m, numero_serial: null });
      } else {
        for (const s of list) out.push({ mov: m, numero_serial: s.numero_serial });
      }
    }
    return out;
  }, [movFiltradas]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Histórico de material</CardTitle>
        <p className="text-xs text-muted-foreground font-normal">
          Aba Quantidade: materiais por metro/peça/kit. Aba Seriais: uma linha por número de serial (IRD, receptor etc.) vinculado ao
          registro no estoque.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Buscar</Label>
            <Input placeholder="Código, descrição, NF ou número de serial…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(Object.keys(TIPO_LABEL) as TipoMovimentacao[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
        ) : (
          <Tabs defaultValue="quantidade" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="quantidade">Quantidade (UMB)</TabsTrigger>
              <TabsTrigger value="seriais">Seriais</TabsTrigger>
            </TabsList>

            <TabsContent value="quantidade" className="mt-3">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>NF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movPorQuantidade.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                          Nenhum registro por quantidade neste filtro.
                        </TableCell>
                      </TableRow>
                    ) : (
                      movPorQuantidade.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm whitespace-nowrap">{formatarData(m.data_movimentacao)}</TableCell>
                          <TableCell>
                            <Badge className={TIPO_BADGE[m.tipo_movimentacao]}>{TIPO_LABEL[m.tipo_movimentacao]}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{m.material?.descricao ?? '—'}</div>
                            <div className="text-xs text-muted-foreground font-mono">{m.material?.codigo_material}</div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {m.quantidade} {m.material?.unidade_medida}
                          </TableCell>
                          <TableCell className="text-sm">
                            {m.local_origem?.nome ?? <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-sm">
                            {m.local_destino?.nome ?? <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-sm font-mono">{m.numero_nota_fiscal ?? '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="seriais" className="mt-3">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead className="min-w-[140px]">Serial</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>NF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhasSerializadas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                          Nenhum registro de material serializado neste filtro.
                        </TableCell>
                      </TableRow>
                    ) : (
                      linhasSerializadas.map((row, i) => {
                        const m = row.mov;
                        const key = row.numero_serial ? `${m.id}-${row.numero_serial}` : `${m.id}-sem-${i}`;
                        return (
                          <TableRow key={key}>
                            <TableCell className="text-sm whitespace-nowrap">{formatarData(m.data_movimentacao)}</TableCell>
                            <TableCell>
                              <Badge className={TIPO_BADGE[m.tipo_movimentacao]}>{TIPO_LABEL[m.tipo_movimentacao]}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{m.material?.descricao ?? '—'}</div>
                              <div className="text-xs text-muted-foreground font-mono">{m.material?.codigo_material}</div>
                            </TableCell>
                            <TableCell className="text-sm font-mono align-top">
                              {row.numero_serial ? (
                                <span className="break-all">{row.numero_serial}</span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Sem serial vinculado
                                  <span className="block text-xs mt-0.5">Qtd registrada: {m.quantidade}</span>
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {m.local_origem?.nome ?? <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {m.local_destino?.nome ?? <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm font-mono">{m.numero_nota_fiscal ?? '—'}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
