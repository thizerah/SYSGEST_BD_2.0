import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import {
  fetchHistoricoMaterialQuantidadePaginado,
  fetchHistoricoMaterialSeriaisPaginado,
  fetchMateriaisComSaldoParaHistorico,
  fetchLocaisTecnicosParaHistorico,
  HISTORICO_PAGE_SIZE,
  CONTEXTO_HISTORICO_LABEL,
  HISTORICO_CONTEXTO_FILTRO_OPTIONS,
  type HistoricoFiltroTipoMov,
} from '@/lib/estoque';
import type {
  Local,
  Material,
  ModoHistoricoMaterial,
  Movimentacao,
  TipoMovimentacao,
  ContextoHistoricoKey,
  HistoricoFiltroContexto,
} from '@/types/estoque';
import { MaterialCombobox } from './MaterialCombobox';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react';

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

const BADGE_INSTALADO = 'bg-sky-100 text-sky-900 hover:bg-sky-100';

/** Saída vinculada a OS: exibe como Instalado (mesmo registro no banco continua `saida`). */
function badgeTipoHistorico(m: Movimentacao, codigoOsLinha?: string | null): { label: string; className: string } {
  const vinculoOs = Boolean(m.roteiro_os_id?.trim()) || Boolean(codigoOsLinha?.trim());
  if (m.tipo_movimentacao === 'saida' && vinculoOs) {
    return { label: 'Instalado', className: BADGE_INSTALADO };
  }
  return { label: TIPO_LABEL[m.tipo_movimentacao], className: TIPO_BADGE[m.tipo_movimentacao] };
}

const TIPOS_FILTRO_SELECT: { value: HistoricoFiltroTipoMov; label: string }[] = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'instalado', label: 'Instalado' },
  { value: 'transferencia', label: 'Transferência' },
];

const TIPOS_FILTRO_VALUES = new Set(TIPOS_FILTRO_SELECT.map((x) => x.value));

const TECNICO_TODOS = '__tecnico_todos__';

/** Tabelas de histórico: fonte e padding compactos. */
const CLASSES_TABELA_HISTORICO = 'text-xs [&_th]:!h-7 [&_th]:!px-2 [&_th]:!py-1.5 [&_td]:!p-2';

function formatarData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Resultado =
  | {
      modo: 'quantidade';
      movimentacoes: Movimentacao[];
      total: number;
      totalDesconhecido?: boolean;
      haMaisAposFiltrar?: boolean;
    }
  | { modo: 'seriais'; linhas: { mov: Movimentacao; numero_serial: string | null }[]; haMais: boolean };

function badgeContextoHistorico(k: ContextoHistoricoKey | undefined): string {
  if (!k) return 'bg-muted text-muted-foreground border-border';
  if (k === 'estorno_auditoria' || k === 'entrada_pos_estorno') {
    return 'bg-violet-100 text-violet-950 border-violet-200 dark:bg-violet-950/40 dark:text-violet-100';
  }
  if (k === 'baixa_reconferencia') {
    return 'bg-orange-100 text-orange-950 border-orange-200 dark:bg-orange-950/40 dark:text-orange-100';
  }
  if (k === 'baixa_roteiro') {
    return 'bg-sky-100 text-sky-950 border-sky-200 dark:bg-sky-950/40 dark:text-sky-100';
  }
  return 'bg-muted/80 text-foreground border-border';
}

export function HistoricoMovimentacoes() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;

  const [modo, setModo] = useState<ModoHistoricoMaterial>('quantidade');
  const [materiaisOpcoes, setMateriaisOpcoes] = useState<Material[]>([]);
  const [tecnicosOpcoes, setTecnicosOpcoes] = useState<Local[]>([]);
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(false);

  const [materialId, setMaterialId] = useState('');
  const [tecnicoLocalId, setTecnicoLocalId] = useState(TECNICO_TODOS);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [busca, setBusca] = useState('');
  const [contextoFiltro, setContextoFiltro] = useState<HistoricoFiltroContexto>('todos');

  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [buscou, setBuscou] = useState(false);

  const filtroTipoEfetivo =
    filtroTipo !== 'todos' && !TIPOS_FILTRO_VALUES.has(filtroTipo as HistoricoFiltroTipoMov) ? 'todos' : filtroTipo;

  const limparFiltros = useCallback(() => {
    setTecnicoLocalId(TECNICO_TODOS);
    setMaterialId('');
    setFiltroTipo('todos');
    setDataInicio('');
    setDataFim('');
    setBusca('');
    setContextoFiltro('todos');
    setResultado(null);
    setBuscou(false);
    setPageIndex(0);
  }, []);

  useEffect(() => {
    if (!donoUserId) return;
    let cancel = false;
    (async () => {
      setCarregandoOpcoes(true);
      try {
        const [mats, locs] = await Promise.all([
          fetchMateriaisComSaldoParaHistorico(donoUserId, modo === 'seriais'),
          fetchLocaisTecnicosParaHistorico(donoUserId),
        ]);
        if (cancel) return;
        setMateriaisOpcoes(mats);
        setTecnicosOpcoes(locs);
        setMaterialId('');
        setResultado(null);
        setBuscou(false);
        setPageIndex(0);
      } catch (e) {
        if (!cancel) {
          toast({
            title: 'Erro',
            description: e instanceof Error ? e.message : 'Falha ao carregar filtros.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancel) setCarregandoOpcoes(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [donoUserId, modo, toast]);

  const materialIdsParaBusca = useMemo(() => {
    if (materialId) {
      return materiaisOpcoes.some((m) => m.id === materialId) ? [materialId] : [];
    }
    return materiaisOpcoes.map((m) => m.id);
  }, [materialId, materiaisOpcoes]);

  const executarBusca = useCallback(
    async (pagina: number) => {
      if (!donoUserId) return;
      if (materialIdsParaBusca.length === 0) {
        toast({
          title: 'Sem materiais',
          description: 'Não há materiais com saldo neste modo para consultar.',
          variant: 'destructive',
        });
        return;
      }

      const base = {
        materialIds: materialIdsParaBusca,
        localTecnicoId: tecnicoLocalId !== TECNICO_TODOS ? tecnicoLocalId : null,
        tipo: (filtroTipoEfetivo === 'todos' ? 'todos' : filtroTipoEfetivo) as HistoricoFiltroTipoMov,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim ? `${dataFim}T23:59:59` : undefined,
        busca: busca.trim() || undefined,
        contextoFiltro: modo === 'quantidade' ? contextoFiltro : ('todos' as HistoricoFiltroContexto),
      };

      setLoading(true);
      try {
        if (modo === 'quantidade') {
          const { movimentacoes, total, totalDesconhecido, haMaisAposFiltrar } =
            await fetchHistoricoMaterialQuantidadePaginado(donoUserId, {
              ...base,
              page: pagina,
            });
          setResultado({
            modo: 'quantidade',
            movimentacoes,
            total,
            totalDesconhecido,
            haMaisAposFiltrar,
          });
        } else {
          const { linhas, haMais } = await fetchHistoricoMaterialSeriaisPaginado(donoUserId, {
            ...base,
            lineOffset: pagina * HISTORICO_PAGE_SIZE,
          });
          setResultado({ modo: 'seriais', linhas, haMais });
        }
        setPageIndex(pagina);
        setBuscou(true);
      } catch (e) {
        toast({
          title: 'Erro',
          description: e instanceof Error ? e.message : 'Falha ao carregar o histórico de material.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [
      donoUserId,
      materialIdsParaBusca,
      tecnicoLocalId,
      filtroTipoEfetivo,
      dataInicio,
      dataFim,
      busca,
      modo,
      contextoFiltro,
      toast,
    ]
  );

  const onBuscar = () => {
    void executarBusca(0);
  };

  const totalPaginasQuantidade =
    resultado?.modo === 'quantidade' && resultado.total >= 0
      ? Math.max(1, Math.ceil(resultado.total / HISTORICO_PAGE_SIZE))
      : 1;

  const podeAnterior = buscou && pageIndex > 0;
  const podeProxima =
    buscou &&
    (resultado?.modo === 'quantidade'
      ? resultado.total < 0
        ? Boolean(resultado.haMaisAposFiltrar)
        : (pageIndex + 1) * HISTORICO_PAGE_SIZE < resultado.total
      : resultado?.modo === 'seriais'
        ? resultado.haMais
        : false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Histórico de material</CardTitle>
        <p className="text-xs text-muted-foreground font-normal">
          Escolha o modo (quantidade ou serial), preencha os filtros e clique em Buscar. Exibimos até {HISTORICO_PAGE_SIZE}{' '}
          {modo === 'quantidade' ? 'movimentações' : 'linhas (1 por serial)'} por página. Materiais listados têm saldo &gt; 0 no
          estoque. Técnicos listados têm material (estoque ou serial disponível) no local. Busca por serial usa o número exato
          (após normalizar espaços). No modo seriais, para baixa vinculada à OS mostramos o técnico (origem), o cliente
          (destino), o código da OS e a NF da entrada do aparelho quando houver.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Modo</Label>
          <div className="flex flex-wrap gap-2 max-w-md">
            <Button
              type="button"
              variant={modo === 'quantidade' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 h-8 text-xs font-medium"
              onClick={() => {
                setModo('quantidade');
                setPageIndex(0);
              }}
            >
              Quantidade (UMB)
            </Button>
            <Button
              type="button"
              variant={modo === 'seriais' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 h-8 text-xs font-medium"
              onClick={() => {
                setModo('seriais');
                setPageIndex(0);
              }}
            >
              Seriais
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Técnico</Label>
            <Select value={tecnicoLocalId} onValueChange={setTecnicoLocalId} disabled={carregandoOpcoes}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TECNICO_TODOS}>Todos</SelectItem>
                {tecnicosOpcoes.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.equipe?.nome_completo ?? loc.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 lg:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Material (com saldo)</Label>
              {materialId ? (
                <Button type="button" variant="link" className="text-xs h-auto p-0" onClick={() => setMaterialId('')}>
                  Todos os materiais do modo
                </Button>
              ) : null}
            </div>
            <MaterialCombobox
              materiais={materiaisOpcoes}
              value={materialId}
              onValueChange={setMaterialId}
              disabled={carregandoOpcoes}
              placeholder="Todos os materiais deste modo…"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={filtroTipoEfetivo} onValueChange={setFiltroTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {TIPOS_FILTRO_SELECT.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contexto</Label>
            <Select
              value={contextoFiltro}
              onValueChange={(v) => setContextoFiltro(v as HistoricoFiltroContexto)}
              disabled={modo === 'seriais'}
            >
              <SelectTrigger title={modo === 'seriais' ? 'No modo Seriais use Quantidade para filtrar por contexto.' : undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HISTORICO_CONTEXTO_FILTRO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modo === 'seriais' ? (
              <p className="text-[10px] text-muted-foreground leading-tight">Filtro por contexto só no modo Quantidade.</p>
            ) : null}
          </div>
          <div className="space-y-1 lg:col-span-3">
            <Label className="text-xs">Buscar (NF, código, descrição contém · serial exato)</Label>
            <Input
              placeholder="Opcional — serial: digite o número completo; demais campos: parte do texto…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={onBuscar} disabled={loading || carregandoOpcoes || !donoUserId}>
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={limparFiltros}
            disabled={loading || carregandoOpcoes}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpar filtros
          </Button>
          {buscou && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!podeAnterior || loading}
                onClick={() => void executarBusca(pageIndex - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!podeProxima || loading}
                onClick={() => void executarBusca(pageIndex + 1)}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Página {pageIndex + 1}
                {resultado?.modo === 'quantidade' && resultado.total >= 0 ? ` de ${totalPaginasQuantidade}` : ''}
                {resultado?.modo === 'quantidade'
                  ? resultado.total < 0
                    ? ' · filtrado por contexto (total não calculado)'
                    : ` · ${resultado.total} registro(s)`
                  : resultado?.modo === 'seriais'
                    ? ` · ${resultado.linhas.length} linha(s) nesta página`
                    : ''}
              </span>
            </>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
        ) : !buscou ? (
          <p className="text-sm text-muted-foreground py-8 text-center border rounded-md bg-muted/30">
            Preencha os filtros e clique em <strong>Buscar</strong> para ver o histórico.
          </p>
        ) : resultado?.modo === 'quantidade' ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed px-0.5">
              Reedição de material na mesma OS gera novas linhas (auditoria). Use data, material e busca por OS para
              focar o período; em <strong>Instalado</strong>, destino e código seguem a OS do roteiro.
            </p>
            <div className="overflow-x-auto rounded-md border">
            <Table className={CLASSES_TABELA_HISTORICO}>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="min-w-[150px]">Contexto</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>NF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.movimentacoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                      Nenhum registro encontrado com estes filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  resultado.movimentacoes.map((m) => {
                    const tipoEx = badgeTipoHistorico(m, m.codigo_os_roteiro);
                    const ctx = m.contexto_historico;
                    return (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">{formatarData(m.data_movimentacao)}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-[10px] font-medium px-1.5 py-0', tipoEx.className)}>{tipoEx.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {ctx ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-normal whitespace-normal text-left h-auto py-0.5 px-1.5 leading-tight',
                              badgeContextoHistorico(ctx)
                            )}
                          >
                            {CONTEXTO_HISTORICO_LABEL[ctx]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium leading-tight">{m.material?.descricao ?? '—'}</div>
                        <div className="text-[10px] text-muted-foreground font-mono leading-tight mt-0.5">{m.material?.codigo_material}</div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {m.quantidade} {m.material?.unidade_medida}
                      </TableCell>
                      <TableCell>
                        {m.local_origem?.nome ? (
                          <div>
                            <span className="leading-tight">{m.local_origem.nome}</span>
                            {m.local_origem.tipo === 'tecnico' && (
                              <span className="block text-[10px] text-muted-foreground">Técnico</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tipoEx.label === 'Instalado' ? (
                          m.nome_cliente_roteiro?.trim() ? (
                            <div>
                              <span className="font-medium leading-tight">{m.nome_cliente_roteiro.trim()}</span>
                              <span className="block text-[10px] text-muted-foreground">Cliente (roteiro)</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : m.local_destino?.nome ? (
                          m.local_destino.nome
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">
                        {m.codigo_os_roteiro ?? <span className="text-muted-foreground font-normal">—</span>}
                      </TableCell>
                      <TableCell>
                        {tipoEx.label === 'Instalado' ? (
                          m.codigo_cliente_roteiro?.trim() ? (
                            <div>
                              <span className="font-mono">{m.codigo_cliente_roteiro.trim()}</span>
                              <span className="block text-[10px] text-muted-foreground">Código cliente (OS)</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className="font-mono">{m.numero_nota_fiscal?.trim() || '—'}</span>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table className={CLASSES_TABELA_HISTORICO}>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="min-w-[150px]">Contexto</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="min-w-[140px]">Serial</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>NF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.linhas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                      Nenhum registro encontrado com estes filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  resultado.linhas.map((row, i) => {
                    const m = row.mov;
                    const tipoEx = badgeTipoHistorico(m, row.codigo_os);
                    const ctx = m.contexto_historico;
                    const key = row.numero_serial ? `${m.id}-${row.numero_serial}` : `${m.id}-sem-${i}`;
                    return (
                      <TableRow key={key}>
                        <TableCell className="whitespace-nowrap tabular-nums">{formatarData(m.data_movimentacao)}</TableCell>
                        <TableCell>
                          <Badge className={cn('text-[10px] font-medium px-1.5 py-0', tipoEx.className)}>{tipoEx.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {ctx ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-normal whitespace-normal text-left h-auto py-0.5 px-1.5 leading-tight',
                                badgeContextoHistorico(ctx)
                              )}
                            >
                              {CONTEXTO_HISTORICO_LABEL[ctx]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium leading-tight">{m.material?.descricao ?? '—'}</div>
                          <div className="text-[10px] text-muted-foreground font-mono leading-tight mt-0.5">{m.material?.codigo_material}</div>
                        </TableCell>
                        <TableCell className="font-mono align-top">
                          {row.numero_serial ? (
                            <div
                              className={cn(
                                'inline-block max-w-full text-[11px] leading-snug transition-colors',
                                tipoEx.label === 'Instalado' &&
                                  (row.ird_confirmado_planilha
                                    ? 'rounded border border-emerald-500/45 bg-emerald-50/90 px-1.5 py-0.5 shadow-sm dark:bg-emerald-950/35 dark:border-emerald-500/35'
                                    : 'rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 dark:bg-muted/30')
                              )}
                              title={
                                tipoEx.label === 'Instalado'
                                  ? row.ird_confirmado_planilha
                                    ? 'IRD conferido na importação (service_orders)'
                                    : 'Aguardando conferência na planilha importada (service_orders)'
                                  : undefined
                              }
                            >
                              <span className="break-all">{row.numero_serial}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">
                              Sem serial vinculado
                              <span className="block text-[10px] mt-0.5">Qtd registrada: {m.quantidade}</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {m.local_origem?.nome ? (
                            <div>
                              <span className="leading-tight">{m.local_origem.nome}</span>
                              {m.local_origem.tipo === 'tecnico' && (
                                <span className="block text-[10px] text-muted-foreground">Técnico</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {tipoEx.label === 'Instalado' ? (
                            (row.nome_cliente_roteiro ?? row.nome_cliente_instalacao)?.trim() ? (
                              <div>
                                <span className="font-medium leading-tight">
                                  {(row.nome_cliente_roteiro ?? row.nome_cliente_instalacao)!.trim()}
                                </span>
                                <span className="block text-[10px] text-muted-foreground">Cliente (roteiro)</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )
                          ) : row.nome_cliente_instalacao?.trim() ? (
                            <div>
                              <span className="font-medium leading-tight">{row.nome_cliente_instalacao}</span>
                              <span className="block text-[10px] text-muted-foreground">Cliente</span>
                            </div>
                          ) : m.local_destino?.nome ? (
                            m.local_destino.nome
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium tabular-nums align-top">
                          {row.codigo_os ?? <span className="text-muted-foreground font-normal">—</span>}
                        </TableCell>
                        <TableCell className="align-top">
                          {tipoEx.label === 'Instalado' ? (
                            <div className="space-y-1">
                              {row.codigo_cliente_roteiro?.trim() ? (
                                <div>
                                  <span className="font-mono">{row.codigo_cliente_roteiro.trim()}</span>
                                  <span className="block text-[10px] text-muted-foreground">Código cliente (OS)</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                              {row.nf_entrada_serial ? (
                                <div className="text-[10px] text-muted-foreground">
                                  NF entrada: <span className="font-mono">{row.nf_entrada_serial}</span>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <>
                              <div className="font-mono">{m.numero_nota_fiscal?.trim() || '—'}</div>
                              {row.nf_entrada_serial ? (
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  NF entrada: <span className="font-mono">{row.nf_entrada_serial}</span>
                                </div>
                              ) : null}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
