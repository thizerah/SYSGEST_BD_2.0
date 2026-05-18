import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, RotateCcw, Wrench, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import { fetchOtimizacaoMaterial, atualizarAptaParaUso } from '@/lib/estoque';
import type { LinhaOtimizacaoMaterial } from '@/types/estoque';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 15;
const CLASSES_TABELA = 'text-xs [&_th]:!h-7 [&_th]:!px-2 [&_th]:!py-1.5 [&_td]:!p-2';
const TODOS = '__todos__';

type FiltroSituacao = 'todos' | 'apto' | 'inapto' | 'nao_avaliado';
type FiltroStatus = 'todos' | 'disponivel' | 'com_tecnico' | 'usado_os';

const STATUS_LABEL: Record<string, string> = {
  disponivel: 'No estoque',
  com_tecnico: 'C/ técnico',
  usado_os: 'Usado na OS',
};

const STATUS_CLS: Record<string, string> = {
  disponivel: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  com_tecnico: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  usado_os: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
};

function BadgeStatus({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full text-[10px] font-medium px-1.5 py-0.5', STATUS_CLS[status] ?? 'bg-muted text-muted-foreground')}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function formatarData(iso: string) {
  // Strings somente com data (YYYY-MM-DD) devem ser exibidas sem hora
  // para evitar conversao errada de fuso (UTC midnight → dia anterior em UTC-3)
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BadgeSituacao({ apta }: { apta: boolean | null }) {
  if (apta === null) {
    return <span className="text-[10px] text-muted-foreground italic">Nao avaliado</span>;
  }
  return (
    <Badge
      className={cn(
        'text-[10px] font-medium px-1.5 py-0 pointer-events-none',
        apta
          ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-100'
          : 'bg-red-100 text-red-900 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-100'
      )}
    >
      {apta ? 'Apto' : 'Inapto'}
    </Badge>
  );
}

export function OtimizacaoMaterial() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;

  // Dados brutos carregados (todos, sem filtro)
  const [todasLinhas, setTodasLinhas] = useState<LinhaOtimizacaoMaterial[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Filtros
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroMaterial, setFiltroMaterial] = useState(TODOS);
  const [filtroEntregue, setFiltroEntregue] = useState(TODOS);
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacao>('todos');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');

  // Controle de busca e paginacao
  const [buscou, setBuscou] = useState(false);
  const [resultados, setResultados] = useState<LinhaOtimizacaoMaterial[]>([]);
  const [pagina, setPagina] = useState(0);

  // Atualizacoes inline
  const [atualizando, setAtualizando] = useState<string | null>(null);

  // ─── Carga inicial (popula opcoes dos filtros) ───────────────────────────
  const carregar = useCallback(async () => {
    if (!donoUserId) return;
    setCarregando(true);
    try {
      const dados = await fetchOtimizacaoMaterial(donoUserId);
      setTodasLinhas(dados);
    } catch (e) {
      toast({
        title: 'Erro',
        description: e instanceof Error ? e.message : 'Falha ao carregar retiradas.',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }, [donoUserId, toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // ─── Opcoes dos filtros com dependencias ────────────────────────────────

  // 1. Dados filtrados por data (base para todos os outros)
  const filtradosPorData = useMemo(() => {
    return todasLinhas.filter((l) => {
      const dt = l.data_movimentacao.slice(0, 10);
      if (dataInicio && dt < dataInicio) return false;
      if (dataFim && dt > dataFim) return false;
      return true;
    });
  }, [todasLinhas, dataInicio, dataFim]);

  // 2. Opcoes de Material (dependem da data)
  const opcoesMaterial = useMemo(() => {
    const vistos = new Map<string, string>();
    for (const l of filtradosPorData) {
      if (!vistos.has(l.material_codigo)) vistos.set(l.material_codigo, l.material_descricao);
    }
    return Array.from(vistos.entries()).map(([codigo, descricao]) => ({ codigo, descricao }));
  }, [filtradosPorData]);

  // Reset material se nao existe mais nas opcoes
  useEffect(() => {
    if (filtroMaterial !== TODOS && !opcoesMaterial.some((o) => o.codigo === filtroMaterial)) {
      setFiltroMaterial(TODOS);
    }
  }, [opcoesMaterial, filtroMaterial]);

  // 3. Dados filtrados por data + material
  const filtradosPorDataMaterial = useMemo(() => {
    if (filtroMaterial === TODOS) return filtradosPorData;
    return filtradosPorData.filter((l) => l.material_codigo === filtroMaterial);
  }, [filtradosPorData, filtroMaterial]);

  // 4. Opcoes de Entregue por (dependem de data + material)
  const opcoesEntregue = useMemo(() => {
    const vistos = new Map<string, string>();
    for (const l of filtradosPorDataMaterial) {
      const nome = l.entregue_por_nome;
      if (nome && !vistos.has(nome)) vistos.set(nome, nome);
    }
    return Array.from(vistos.keys());
  }, [filtradosPorDataMaterial]);

  // Reset entregue se nao existe mais nas opcoes
  useEffect(() => {
    if (filtroEntregue !== TODOS && !opcoesEntregue.includes(filtroEntregue)) {
      setFiltroEntregue(TODOS);
    }
  }, [opcoesEntregue, filtroEntregue]);

  // ─── Busca ──────────────────────────────────────────────────────────────
  const executarBusca = useCallback(() => {
    let lista = filtradosPorDataMaterial;

    if (filtroEntregue !== TODOS) {
      lista = lista.filter((l) => l.entregue_por_nome === filtroEntregue);
    }

    if (filtroSituacao !== 'todos') {
      lista = lista.filter((l) => {
        if (filtroSituacao === 'apto') return l.apta_para_uso === true;
        if (filtroSituacao === 'inapto') return l.apta_para_uso === false;
        return l.apta_para_uso === null;
      });
    }

    if (filtroStatus !== 'todos') {
      lista = lista.filter((l) => l.status === filtroStatus);
    }

    // Ordena: material → mesmo lote (movimentacao) → número da peça
    lista = [...lista].sort((a, b) => {
      const mat = a.material_codigo.localeCompare(b.material_codigo, 'pt-BR');
      if (mat !== 0) return mat;
      const mov = a.movimentacao_id.localeCompare(b.movimentacao_id);
      if (mov !== 0) return mov;
      return a.numero_unidade - b.numero_unidade;
    });

    setResultados(lista);
    setPagina(0);
    setBuscou(true);
  }, [filtradosPorDataMaterial, filtroEntregue, filtroSituacao, filtroStatus]);

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setFiltroMaterial(TODOS);
    setFiltroEntregue(TODOS);
    setFiltroSituacao('todos');
    setFiltroStatus('todos');
    setBuscou(false);
    setResultados([]);
    setPagina(0);
  };

  // ─── Paginacao ──────────────────────────────────────────────────────────
  const totalPaginas = Math.max(1, Math.ceil(resultados.length / PAGE_SIZE));
  const paginaAtual = resultados.slice(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE);

  // Sincroniza atualizacoes inline com resultados e dados brutos
  const aplicarAtualizacao = (unidadeId: string, novoValor: boolean | null) => {
    const atualizar = (l: LinhaOtimizacaoMaterial) =>
      l.unidade_id === unidadeId ? { ...l, apta_para_uso: novoValor } : l;
    setTodasLinhas((prev) => prev.map(atualizar));
    setResultados((prev) => prev.map(atualizar));
  };

  // ─── Avaliacao inline ───────────────────────────────────────────────────
  const handleApto = async (unidadeId: string, valor: boolean) => {
    if (!donoUserId) return;
    const linhaAtual = todasLinhas.find((l) => l.unidade_id === unidadeId);
    const novoValor = linhaAtual?.apta_para_uso === valor ? null : valor;

    setAtualizando(unidadeId);
    try {
      await atualizarAptaParaUso(donoUserId, unidadeId, novoValor);
      aplicarAtualizacao(unidadeId, novoValor);
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: e instanceof Error ? e.message : 'Falha ao atualizar aptidao.',
        variant: 'destructive',
      });
    } finally {
      setAtualizando(null);
    }
  };

  // ─── Totais do rodape (baseados nos resultados filtrados) ───────────────
  const totais = useMemo(() => {
    const base = buscou ? resultados : [];
    return {
      apto: base.filter((l) => l.apta_para_uso === true).length,
      inapto: base.filter((l) => l.apta_para_uso === false).length,
      naoAvaliado: base.filter((l) => l.apta_para_uso === null).length,
    };
  }, [resultados, buscou]);

  // ─── Agrupamento visual por movimentacao ────────────────────────────────
  const paginaComGrupo = paginaAtual.map((l, idx) => ({
    ...l,
    primeiraDoGrupo:
      idx === 0 || paginaAtual[idx - 1].movimentacao_id !== l.movimentacao_id,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-500" />
            Otimizacao de Material
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { void carregar(); setBuscou(false); setResultados([]); setPagina(0); }}
            disabled={carregando}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', carregando && 'animate-spin')} />
            Recarregar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground font-normal">
          Cada unidade recuperada de cliente (entrada RET) aparece em linha separada. Marque "Apto" ou "Inapto" apos conferencia fisica. Clique novamente para desfazer.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* ─── Filtros ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => { setDataInicio(e.target.value); setBuscou(false); }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ate</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => { setDataFim(e.target.value); setBuscou(false); }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Material
              {filtroMaterial === TODOS && opcoesMaterial.length > 0 && (
                <span className="ml-1 text-muted-foreground">({opcoesMaterial.length} disponivel{opcoesMaterial.length !== 1 ? 'is' : ''})</span>
              )}
            </Label>
            <Select
              value={filtroMaterial}
              onValueChange={(v) => { setFiltroMaterial(v); setBuscou(false); }}
              disabled={carregando}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {opcoesMaterial.map((o) => (
                  <SelectItem key={o.codigo} value={o.codigo}>
                    {o.descricao}
                    <span className="ml-1 text-xs text-muted-foreground font-mono">({o.codigo})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Entregue por</Label>
            <Select
              value={filtroEntregue}
              onValueChange={(v) => { setFiltroEntregue(v); setBuscou(false); }}
              disabled={carregando}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {opcoesEntregue.map((nome) => (
                  <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Avaliação</Label>
            <Select
              value={filtroSituacao}
              onValueChange={(v) => { setFiltroSituacao(v as FiltroSituacao); setBuscou(false); }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="nao_avaliado">Nao avaliado</SelectItem>
                <SelectItem value="apto">Apto</SelectItem>
                <SelectItem value="inapto">Inapto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={filtroStatus}
              onValueChange={(v) => { setFiltroStatus(v as FiltroStatus); setBuscou(false); }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="disponivel">No estoque</SelectItem>
                <SelectItem value="com_tecnico">C/ técnico</SelectItem>
                <SelectItem value="usado_os">Usado na OS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ─── Acoes ─── */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={executarBusca}
            disabled={carregando}
          >
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={limparFiltros}
            disabled={carregando}
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
                disabled={pagina === 0}
                onClick={() => setPagina((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagina + 1 >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Proxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Pagina {pagina + 1} de {totalPaginas} · {resultados.length} registro(s)
              </span>
            </>
          )}
        </div>

        {/* ─── Tabela ─── */}
        {carregando ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
        ) : !buscou ? (
          <p className="text-sm text-muted-foreground py-8 text-center border rounded-md bg-muted/30">
            Preencha os filtros e clique em <strong>Buscar</strong> para ver as retiradas.
          </p>
        ) : resultados.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border rounded-md bg-muted/30">
            Nenhuma retirada encontrada com estes filtros.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table className={CLASSES_TABELA}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Data</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="whitespace-nowrap">NF</TableHead>
                    <TableHead>Entregue por</TableHead>
                    <TableHead className="text-center">Avaliação</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead className="whitespace-nowrap">OS</TableHead>
                    <TableHead className="text-center">Avaliar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginaComGrupo.map((l) => (
                    <TableRow
                      key={l.unidade_id}
                      className={cn(
                        l.primeiraDoGrupo && l.numero_unidade !== 1 && 'border-t-2 border-t-border/40'
                      )}
                    >
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatarData(l.data_movimentacao)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium leading-tight">{l.material_descricao}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">{l.material_codigo}</span>
                          {l.quantidade_total > 1 && (
                            <span className="text-[10px] text-muted-foreground">
                              · peça {l.numero_unidade} de {l.quantidade_total}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {l.numero_nota_fiscal ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {l.entregue_por_nome ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <BadgeSituacao apta={l.apta_para_uso} />
                      </TableCell>
                      <TableCell className="text-center">
                        <BadgeStatus status={l.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {l.tecnico_nome ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] whitespace-nowrap">
                        {l.roteiro_os_codigo
                          ? <span>{l.roteiro_os_codigo}</span>
                          : l.roteiro_os_id
                            ? <span title={l.roteiro_os_id} className="text-muted-foreground">{l.roteiro_os_id.slice(0, 8)}…</span>
                            : <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        {l.status === 'usado_os' ? (
                          <span className="text-[10px] text-muted-foreground italic">Consumido</span>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] text-emerald-700 dark:text-emerald-400">
                              <Checkbox
                                checked={l.apta_para_uso === true}
                                disabled={atualizando === l.unidade_id}
                                onCheckedChange={() => void handleApto(l.unidade_id, true)}
                                className="h-3.5 w-3.5 border-emerald-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                              />
                              Apto
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] text-red-600 dark:text-red-400">
                              <Checkbox
                                checked={l.apta_para_uso === false}
                                disabled={atualizando === l.unidade_id}
                                onCheckedChange={() => void handleApto(l.unidade_id, false)}
                                className="h-3.5 w-3.5 border-red-400 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                              />
                              Inapto
                            </label>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* ─── Rodape com totais ─── */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-1 border-t text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">Totais (resultados filtrados):</span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{totais.apto}</span>
                <span>apto{totais.apto !== 1 ? 's' : ''}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                <span className="font-semibold text-red-600 dark:text-red-400">{totais.inapto}</span>
                <span>inapto{totais.inapto !== 1 ? 's' : ''}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
                <span className="font-semibold">{totais.naoAvaliado}</span>
                <span>nao avaliado{totais.naoAvaliado !== 1 ? 's' : ''}</span>
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
