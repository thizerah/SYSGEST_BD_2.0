import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, List, ChevronRight, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import { fetchEstoque, fetchSeriais, fetchMateriais, fetchBreakdownReusoMateriais, CODIGOS_MATERIAL_RETIRADA_RET } from '@/lib/estoque';
import type { EstoqueSaldo, Serial, StatusSerial, Material, BreakdownReusoMaterial, AvaliacaoReuso } from '@/types/estoque';
import { MaterialCombobox } from './MaterialCombobox';

// ── Helpers de cálculo ajustado ──────────────────────────────────────────────

/** Qtd ajustada = novo + reuso_apto (inapto e nao_avaliado não contam). */
function qtdAjustadaLocal(
  saldoQtd: number,
  breakdown: AvaliacaoReuso
): number {
  const totalReuso = breakdown.apto + breakdown.inapto + breakdown.nao_avaliado;
  const novo = Math.max(0, saldoQtd - totalReuso);
  return novo + breakdown.apto;
}

function qtdAjustadaGrupo(
  totalSaldo: number,
  bd: BreakdownReusoMaterial
): number {
  const totalReuso = bd.disponivel + bd.com_tecnico;
  const novo = Math.max(0, totalSaldo - totalReuso);
  return novo + bd.apto;
}

const STATUS_BADGE: Record<StatusSerial, string> = {
  disponivel: 'bg-green-100 text-green-800 hover:bg-green-100',
  instalado: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  defeito: 'bg-red-100 text-red-800 hover:bg-red-100',
  perdido: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  pago: 'bg-violet-100 text-violet-800 hover:bg-violet-100',
};

const STATUS_LABEL: Record<StatusSerial, string> = {
  disponivel: 'Disponível',
  instalado: 'Instalado',
  defeito: 'Defeito',
  perdido: 'Perdido',
  pago: 'Pago',
};

type GrupoMaterial = {
  material_id: string;
  material: NonNullable<EstoqueSaldo['material']>;
  linhas: EstoqueSaldo[];
  totalQuantidade: number;
  atualizadoEm: string;
};

function agruparPorMaterial(rows: EstoqueSaldo[]): GrupoMaterial[] {
  const map = new Map<string, GrupoMaterial>();
  for (const s of rows) {
    if (!s.material_id || !s.material) continue;
    const mid = s.material_id;
    let g = map.get(mid);
    if (!g) {
      g = {
        material_id: mid,
        material: s.material,
        linhas: [],
        totalQuantidade: 0,
        atualizadoEm: s.data_atualizacao,
      };
      map.set(mid, g);
    }
    g.linhas.push(s);
    g.totalQuantidade += Number(s.quantidade) || 0;
    if (new Date(s.data_atualizacao) > new Date(g.atualizadoEm)) {
      g.atualizadoEm = s.data_atualizacao;
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    (a.material.codigo_material || '').localeCompare(b.material.codigo_material || '', undefined, { numeric: true })
  );
}

type SerialModal =
  | { modo: 'local'; saldo: EstoqueSaldo; seriais: Serial[] }
  | { modo: 'grupo'; titulo: string; seriais: Serial[] };

export function SaldoEstoque() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;

  const [saldo, setSaldo] = useState<EstoqueSaldo[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [breakdownReuso, setBreakdownReuso] = useState<Map<string, BreakdownReusoMaterial>>(new Map());
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [materialFiltroId, setMaterialFiltroId] = useState('');
  const [filtroLocal, setFiltroLocal] = useState('todos');
  const [expandedMaterialIds, setExpandedMaterialIds] = useState<Set<string>>(new Set());

  const [serialModal, setSerialModal] = useState<SerialModal | null>(null);
  const [loadingSeriais, setLoadingSeriais] = useState(false);

  const load = useCallback(async () => {
    if (!donoUserId) return;
    setLoading(true);
    try {
      const [est, mats, breakdown] = await Promise.all([
        fetchEstoque(donoUserId, { apenasComSaldo: true }),
        fetchMateriais(donoUserId),
        fetchBreakdownReusoMateriais(donoUserId),
      ]);
      setSaldo(est);
      setMateriais(mats.filter((m) => m.ativo));
      setBreakdownReuso(breakdown);
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao carregar estoque.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [donoUserId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  /** Só materiais com saldo > 0 em algum local (entrada já refletida no estoque). */
  const materialIdsComSaldoPositivo = useMemo(() => {
    const ids = new Set<string>();
    for (const s of saldo) {
      if ((Number(s.quantidade) || 0) > 0 && s.material_id) ids.add(s.material_id);
    }
    return ids;
  }, [saldo]);

  const materiaisParaLista = useMemo(
    () =>
      materiais
        .filter((m) => materialIdsComSaldoPositivo.has(m.id))
        .sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR')),
    [materiais, materialIdsComSaldoPositivo]
  );

  useEffect(() => {
    if (materialFiltroId && !materialIdsComSaldoPositivo.has(materialFiltroId)) {
      setMaterialFiltroId('');
    }
  }, [materialFiltroId, materialIdsComSaldoPositivo]);

  const locaisUnicos = useMemo(
    () => [...new Map(saldo.map((s) => [s.local_id, s.local?.nome ?? s.local_id])).entries()],
    [saldo]
  );

  const saldoPorFiltros = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return saldo.filter((s) => {
      if (filtroLocal !== 'todos' && s.local_id !== filtroLocal) return false;
      if (materialFiltroId && s.material_id !== materialFiltroId) return false;
      if (!q) return true;
      return (
        s.material?.codigo_material?.toLowerCase().includes(q) || s.material?.descricao?.toLowerCase().includes(q)
      );
    });
  }, [saldo, filtroLocal, materialFiltroId, busca]);

  const grupos = useMemo(() =>
    agruparPorMaterial(saldoPorFiltros).filter((g) => {
      const isRet = CODIGOS_MATERIAL_RETIRADA_RET.includes(g.material.codigo_material);
      const bd = isRet ? breakdownReuso.get(g.material_id) : undefined;
      const qtd = bd ? qtdAjustadaGrupo(g.totalQuantidade, bd) : g.totalQuantidade;
      return qtd > 0;
    }),
    [saldoPorFiltros, breakdownReuso]
  );

  const limparFiltrosMaterial = () => {
    setMaterialFiltroId('');
    setBusca('');
  };

  const toggleExpand = (materialId: string) => {
    setExpandedMaterialIds((prev) => {
      const next = new Set(prev);
      if (next.has(materialId)) next.delete(materialId);
      else next.add(materialId);
      return next;
    });
  };

  const abrirSeriais = async (item: EstoqueSaldo) => {
    if (!donoUserId) return;
    setSerialModal({ modo: 'local', saldo: item, seriais: [] });
    setLoadingSeriais(true);
    try {
      const seriais = await fetchSeriais(donoUserId, {
        material_id: item.material_id,
        local_id: item.local_id,
        status: 'disponivel',
      });
      setSerialModal({ modo: 'local', saldo: item, seriais });
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao carregar seriais.', variant: 'destructive' });
    } finally {
      setLoadingSeriais(false);
    }
  };

  const abrirSeriaisGrupo = async (g: GrupoMaterial) => {
    if (!donoUserId) return;
    const titulo = `${g.material.codigo_material} — ${g.material.descricao}`;
    setSerialModal({ modo: 'grupo', titulo, seriais: [] });
    setLoadingSeriais(true);
    try {
      const localIds = new Set(g.linhas.map((l) => l.local_id));
      const todos = await fetchSeriais(donoUserId, { material_id: g.material_id, status: 'disponivel' });
      const seriais = todos.filter((s) => localIds.has(s.local_id));
      setSerialModal({ modo: 'grupo', titulo, seriais });
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao carregar seriais.', variant: 'destructive' });
    } finally {
      setLoadingSeriais(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Saldo de estoque</CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Uma linha por material (total). Use a seta para ver quantidade por local. A lista de materiais só aparece quando há saldo positivo (já houve entrada). Nos seriais, só entram aparelhos <strong>disponíveis</strong> (não instalados). Busca em texto filtra código/descrição.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-5 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Material (lista)</Label>
                {materiaisParaLista.length > 0 ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="min-w-0 flex-1">
                      <MaterialCombobox
                        materiais={materiaisParaLista}
                        value={materialFiltroId}
                        onValueChange={setMaterialFiltroId}
                        placeholder="Selecione um material…"
                      />
                    </div>
                    <Button type="button" variant="outline" className="shrink-0" onClick={limparFiltrosMaterial}>
                      Limpar
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground rounded-md border border-dashed bg-muted/30 px-3 py-2.5">
                    Nenhum material com saldo no estoque. Registre uma{' '}
                    <span className="font-medium text-foreground">entrada de material</span> para habilitar a lista de filtro aqui.
                  </p>
                )}
              </div>
              <div className="lg:col-span-4 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Busca rápida</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Código ou descrição…"
                    className="pl-8"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
              </div>
              <div className="lg:col-span-3 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Local</Label>
                <Select value={filtroLocal} onValueChange={setFiltroLocal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os locais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os locais</SelectItem>
                    {locaisUnicos.map(([id, nome]) => (
                      <SelectItem key={id} value={id}>
                        {nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 p-2" />
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Qtd total</TableHead>
                    <TableHead>UMB</TableHead>
                    <TableHead>Atualizado em</TableHead>
                    <TableHead className="w-12 text-center">Seriais</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        Nenhum item encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    grupos.flatMap((g) => {
                      const aberto = expandedMaterialIds.has(g.material_id);
                      const mainRow = (
                        <TableRow key={`grp-${g.material_id}`} className="bg-muted/20">
                          <TableCell className="p-1 align-middle">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => toggleExpand(g.material_id)}
                              title={aberto ? 'Ocultar locais' : 'Ver por local'}
                            >
                              {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{g.material.codigo_material}</TableCell>
                          <TableCell className="max-w-[280px] sm:max-w-md">
                            <span className="line-clamp-2">{g.material.descricao}</span>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {(() => {
                              const isRet = CODIGOS_MATERIAL_RETIRADA_RET.includes(g.material.codigo_material);
                              const bd = isRet ? breakdownReuso.get(g.material_id) : undefined;
                              if (!bd) return g.totalQuantidade;
                              return qtdAjustadaGrupo(g.totalQuantidade, bd);
                            })()}
                          </TableCell>
                          <TableCell>{g.material.unidade_medida}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(g.atualizadoEm).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-center">
                            {g.material.serializado ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver seriais disponíveis (locais do filtro)"
                                onClick={() => void abrirSeriaisGrupo(g)}
                              >
                                <List className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                      if (!aberto) return [mainRow];
                      const childRows = g.linhas
                        .slice()
                        .sort((a, b) => (a.local?.nome ?? '').localeCompare(b.local?.nome ?? ''))
                        .map((s) => {
                          const isRet = CODIGOS_MATERIAL_RETIRADA_RET.includes(g.material.codigo_material);
                          const bd = isRet ? breakdownReuso.get(g.material_id) : undefined;
                          const equipeId = s.local?.equipe_id ?? null;
                          const localBreakdown: AvaliacaoReuso | undefined = bd
                            ? equipeId
                              ? bd.por_tecnico[equipeId]
                              : bd.central
                            : undefined;
                          const qtdMostrada = localBreakdown
                            ? qtdAjustadaLocal(s.quantidade, localBreakdown)
                            : s.quantidade;
                          return (
                            <TableRow key={s.id} className="bg-background hover:bg-muted/30">
                              <TableCell />
                              <TableCell colSpan={2} className="text-sm pl-6 border-l-2 border-muted-foreground/20">
                                <span className="text-muted-foreground mr-2">↳</span>
                                {s.local?.nome ?? '—'}
                                {localBreakdown && (
                                  <div className="mt-1 space-y-0.5 pl-2 border-l border-dashed border-muted-foreground/30">
                                    {localBreakdown.apto > 0 && (
                                      <div className="text-[10px] flex items-center gap-1">
                                        <span className="font-medium text-amber-700 dark:text-amber-400">{localBreakdown.apto} reuso</span>
                                        <span className="text-muted-foreground">— apto para uso</span>
                                      </div>
                                    )}
                                    {localBreakdown.nao_avaliado > 0 && (
                                      <div className="text-[10px] flex items-center gap-1">
                                        <span className="font-medium text-muted-foreground">{localBreakdown.nao_avaliado} reuso</span>
                                        <span className="text-muted-foreground">— não avaliado (não contabilizado)</span>
                                      </div>
                                    )}
                                    {(() => {
                                      const totalReusoLocal = localBreakdown.apto + localBreakdown.inapto + localBreakdown.nao_avaliado;
                                      const novo = Math.max(0, s.quantidade - totalReusoLocal);
                                      return novo > 0 ? (
                                        <div className="text-[10px] flex items-center gap-1">
                                          <span className="font-medium text-foreground/70">{novo} novo</span>
                                        </div>
                                      ) : null;
                                    })()}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums align-top">{qtdMostrada}</TableCell>
                              <TableCell className="text-muted-foreground text-xs align-top">{g.material.unidade_medida}</TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top">
                                {new Date(s.data_atualizacao).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-center align-top">
                                {g.material.serializado ? (
                                  <Button variant="ghost" size="icon" title="Seriais disponíveis neste local" onClick={() => void abrirSeriais(s)}>
                                    <List className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      return [mainRow, ...childRows];
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!serialModal} onOpenChange={() => setSerialModal(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {serialModal?.modo === 'local' ? (
                <>
                  Seriais disponíveis — {serialModal.saldo.material?.descricao}{' '}
                  <span className="text-muted-foreground font-normal">@ {serialModal.saldo.local?.nome}</span>
                </>
              ) : (
                <>Seriais disponíveis — {serialModal?.titulo}</>
              )}
            </DialogTitle>
          </DialogHeader>
          {loadingSeriais ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número serial</TableHead>
                  {serialModal?.modo === 'grupo' ? <TableHead>Local</TableHead> : null}
                  <TableHead>Status</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data entrada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const lista =
                    serialModal?.modo === 'local' || serialModal?.modo === 'grupo' ? serialModal.seriais : [];
                  const cols = serialModal?.modo === 'grupo' ? 5 : 4;
                  if (lista.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={cols} className="text-center text-muted-foreground py-4">
                          Nenhum serial encontrado.
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return lista.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm">{s.numero_serial}</TableCell>
                      {serialModal?.modo === 'grupo' ? (
                        <TableCell className="text-sm">{s.local?.nome ?? '—'}</TableCell>
                      ) : null}
                      <TableCell>
                        <Badge className={STATUS_BADGE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                      </TableCell>
                      <TableCell>{s.nome_cliente ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(s.data_entrada).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
