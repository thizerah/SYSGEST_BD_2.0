import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import { useRotas } from '@/context/RotasContext';
import { abaterMateriaisOS, estornarBaixaEstoqueOS, type MaterialUtilizadoOS } from '@/lib/estoque';
import { fetchOsConferenciaEstoque, updateRoteiroOs } from '@/lib/roteiro';
import type { MaterialRota, RotaOS } from '@/types';
import { EdicaoMateriaisConferenciaOs, sanitizarMateriaisConferencia } from './EdicaoMateriaisConferenciaOs';
import { MateriaisConferenciaLeitura } from './MateriaisConferenciaLeitura';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2, Lock, RefreshCw, Undo2 } from 'lucide-react';

function mergeItensParaBaixa(mats: MaterialRota[]): MaterialUtilizadoOS[] {
  const sanit = sanitizarMateriaisConferencia(mats);
  const byMat = new Map<string, MaterialUtilizadoOS>();
  for (const m of sanit) {
    if (!m.material_id) continue;
    if (m.serial_ids?.length) {
      const ex = byMat.get(m.material_id);
      if (ex?.serial_ids) {
        ex.serial_ids.push(...m.serial_ids);
        ex.quantidade = ex.serial_ids.length;
      } else {
        byMat.set(m.material_id, {
          material_id: m.material_id,
          quantidade: m.serial_ids.length,
          serial_ids: [...m.serial_ids],
        });
      }
    } else {
      const q = m.quantidade ?? 0;
      if (q <= 0) continue;
      const ex = byMat.get(m.material_id);
      if (ex && !ex.serial_ids) {
        ex.quantidade += q;
      } else if (!ex) {
        byMat.set(m.material_id, { material_id: m.material_id, quantidade: q });
      }
    }
  }
  return [...byMat.values()];
}

function formatDateYMDLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatarDataHoraBr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function ConfirmacaoOsEstoque() {
  const { user, authExtras, papelCodigo } = useAuth();
  const { toast } = useToast();
  const { atualizarOS, tecnicos } = useRotas();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const usuarioId = user?.id ?? null;

  const [dataRef, setDataRef] = useState(() => formatDateYMDLocal(new Date()));
  const [tecnicoId, setTecnicoId] = useState<string>('todos');
  const [situacao, setSituacao] = useState<'pendente' | 'conferido'>('pendente');
  const [lista, setLista] = useState<RotaOS[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [detalhe, setDetalhe] = useState<RotaOS | null>(null);
  const [materiaisDraft, setMateriaisDraft] = useState<MaterialRota[]>([]);
  const [confirmando, setConfirmando] = useState(false);
  const [salvandoMateriais, setSalvandoMateriais] = useState(false);
  const [estornoDialog, setEstornoDialog] = useState(false);
  const [motivoEstorno, setMotivoEstorno] = useState('');
  const [estornando, setEstornando] = useState(false);

  const carregar = useCallback(async () => {
    if (!donoUserId) return;
    setCarregando(true);
    try {
      const rows = await fetchOsConferenciaEstoque(donoUserId, {
        dataRef,
        tecnicoId: tecnicoId === 'todos' ? null : tecnicoId,
        situacao,
      });
      setLista(rows);
    } catch (e) {
      toast({
        title: 'Erro ao carregar OS',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }, [donoUserId, dataRef, tecnicoId, situacao, toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!detalhe) {
      setMateriaisDraft([]);
      return;
    }
    setMateriaisDraft(JSON.parse(JSON.stringify(detalhe.materiais_utilizados ?? [])) as MaterialRota[]);
  }, [detalhe?.id]);

  const tecnicosOrdenados = useMemo(
    () => [...tecnicos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [tecnicos]
  );

  const podeEditarMateriais = !!detalhe && situacao === 'pendente' && detalhe.status !== 'cancelada';

  const permitirEstorno = papelCodigo !== 'tecnico';
  const podeExibirBotaoEstorno =
    !podeEditarMateriais &&
    !!detalhe?.estoque_sincronizado &&
    detalhe?.status !== 'cancelada' &&
    permitirEstorno;

  const handleSalvarMateriais = async () => {
    if (!detalhe) return;
    const s = sanitizarMateriaisConferencia(materiaisDraft);
    if (
      s.length === 0 &&
      materiaisDraft.some((m) => m.material_id && ((m.serial_ids?.length ?? 0) > 0 || (m.quantidade ?? 0) > 0))
    ) {
      toast({
        title: 'Revise os materiais',
        description: 'Preencha quantidades ou IRDs válidos antes de salvar.',
        variant: 'destructive',
      });
      return;
    }
    setSalvandoMateriais(true);
    try {
      atualizarOS(detalhe.id, { materiais_utilizados: s });
      setDetalhe({ ...detalhe, materiais_utilizados: s.length ? s : undefined });
      toast({ title: 'Materiais salvos', description: 'A lista da OS foi atualizada.' });
      await carregar();
    } finally {
      setSalvandoMateriais(false);
    }
  };

  const handleConfirmarBaixa = async () => {
    if (!detalhe || !donoUserId || !usuarioId) return;
    const s = sanitizarMateriaisConferencia(materiaisDraft);
    if (s.length === 0 && (materiaisDraft.some((m) => m.material_id) || (detalhe.materiais_utilizados?.length ?? 0) > 0)) {
      toast({
        title: 'Revise os materiais',
        description: 'Preencha quantidades ou IRDs válidos antes de confirmar a baixa.',
        variant: 'destructive',
      });
      return;
    }
    setConfirmando(true);
    try {
      await updateRoteiroOs(detalhe.id, { materiais_utilizados: s });

      const itens = mergeItensParaBaixa(materiaisDraft);

      if (itens.length > 0 && detalhe.tecnico_id) {
        await abaterMateriaisOS(
          donoUserId,
          usuarioId,
          detalhe.id,
          detalhe.tecnico_id,
          detalhe.tecnico_nome ?? '',
          itens
        );
      }

      if (detalhe.status === 'pre_finalizada') {
        atualizarOS(detalhe.id, {
          materiais_utilizados: s,
          status: 'finalizada',
          data_finalizacao: new Date().toISOString(),
          estoque_sincronizado: true,
        });
      } else {
        atualizarOS(detalhe.id, { materiais_utilizados: s, estoque_sincronizado: true });
      }

      toast({
        title: 'Baixa conferida',
        description: 'OS atualizada e estoque alinhado.',
      });
      setDetalhe(null);
      await carregar();
    } catch (e) {
      toast({
        title: 'Erro ao confirmar',
        description: e instanceof Error ? e.message : 'Falha ao abater estoque.',
        variant: 'destructive',
      });
    } finally {
      setConfirmando(false);
    }
  };

  const handleEstornarBaixa = async () => {
    if (!detalhe || !donoUserId || !usuarioId) return;
    if (motivoEstorno.trim().length < 8) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Descreva o motivo com pelo menos 8 caracteres (auditoria).',
        variant: 'destructive',
      });
      return;
    }
    setEstornando(true);
    try {
      await estornarBaixaEstoqueOS({
        donoUserId,
        usuarioId,
        roteiroOsId: detalhe.id,
        codigoOs: detalhe.codigo_os,
        motivo: motivoEstorno,
      });
      atualizarOS(detalhe.id, { estoque_sincronizado: false });
      setEstornoDialog(false);
      setMotivoEstorno('');
      setDetalhe(null);
      toast({
        title: 'Baixa estornada',
        description:
          'O estoque do técnico foi reajustado e a OS voltou à fila de conferência pendente. Corrija os materiais, se necessário, e confirme a baixa de novo.',
      });
      if (situacao === 'conferido') {
        setSituacao('pendente');
      }
      await carregar();
    } catch (e) {
      toast({
        title: 'Não foi possível estornar',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setEstornando(false);
    }
  };

  if (!donoUserId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conferência de OS</CardTitle>
          <CardDescription>Faça login para ver as ordens do dia.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Conferência de OS</CardTitle>
          <CardDescription>
            Ordens pré-finalizadas pelo técnico ou conferidas neste dia. Você pode corrigir materiais e IRDs antes de
            salvar na OS e confirmar a baixa no estoque do técnico.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="conf-data">Data</Label>
            <Input
              id="conf-data"
              type="date"
              value={dataRef}
              onChange={(e) => setDataRef(e.target.value)}
              className="w-[180px]"
            />
          </div>
          <div className="space-y-1.5 min-w-[200px]">
            <Label>Técnico</Label>
            <Select value={tecnicoId} onValueChange={setTecnicoId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tecnicosOrdenados.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-[220px]">
            <Label>Conferência estoque</Label>
            <Select value={situacao} onValueChange={(v) => setSituacao(v as 'pendente' | 'conferido')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente (aguardando OK)</SelectItem>
                <SelectItem value="conferido">Conferido (baixa OK)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={() => void carregar()} disabled={carregando}>
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OS</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[140px]">Reconferência</TableHead>
                  <TableHead className="text-right">Materiais</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.length === 0 && !carregando ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma OS nesta combinação de filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  lista.map((os) => {
                    const n = (os.materiais_utilizados ?? []).length;
                    const ext = os.estorno_baixa_conferencia;
                    const estornoLabel =
                      ext && ext.ocorrencias > 0
                        ? `Estorno de baixa (${ext.ocorrencias}×). Último: ${formatarDataHoraBr(ext.ultimo_em)}. Motivo: ${ext.ultimo_motivo}`
                        : undefined;
                    return (
                      <TableRow
                        key={os.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setDetalhe(os)}
                      >
                        <TableCell className="font-medium">{os.codigo_os}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={os.nome_cliente}>
                          {os.nome_cliente}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate" title={os.tipo_servico}>
                          {os.tipo_servico || '—'}
                        </TableCell>
                        <TableCell>{os.tecnico_nome ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={os.status === 'pre_finalizada' ? 'secondary' : 'outline'}>
                            {os.status === 'pre_finalizada' ? 'Pré-finalizada' : 'Finalizada'}
                          </Badge>
                        </TableCell>
                        <TableCell title={estornoLabel}>
                          {ext && ext.ocorrencias > 0 ? (
                            <div className="flex flex-col items-start gap-0.5">
                              <Badge
                                variant="secondary"
                                className="w-fit gap-1 border-amber-200 bg-amber-50 font-normal text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                              >
                                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                                Estorno e reedição
                              </Badge>
                              <span className="line-clamp-2 max-w-[220px] text-[11px] text-muted-foreground" title={ext.ultimo_motivo}>
                                Último motivo: {ext.ultimo_motivo}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{n}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 space-y-1.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 pr-10">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <DialogHeader className="space-y-0.5 text-left">
                <DialogTitle className="text-base font-semibold leading-tight tracking-tight">OS {detalhe?.codigo_os}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {detalhe?.nome_cliente} · {detalhe?.tecnico_nome ?? 'Sem técnico'}
                </DialogDescription>
              </DialogHeader>
              {podeEditarMateriais && detalhe ? (
                <Badge variant="outline" className="shrink-0 gap-1 border-sky-200 bg-sky-50 font-normal text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
                  Conferência
                </Badge>
              ) : null}
              {!podeEditarMateriais && detalhe ? (
                <Badge variant="secondary" className="shrink-0 gap-1 font-normal">
                  <Lock className="h-3 w-3" aria-hidden />
                  Só leitura
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-foreground/90">
              <span className="text-muted-foreground">Serviço: </span>
              {detalhe?.tipo_servico || '—'}
            </p>
            {detalhe?.estorno_baixa_conferencia && detalhe.estorno_baixa_conferencia.ocorrencias > 0 ? (
              <div
                className="rounded-md border border-amber-200 bg-amber-50/90 px-2.5 py-1.5 text-[11px] leading-snug text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-50"
                role="status"
              >
                <span className="font-medium">Já houve estorno de baixa nesta OS ({detalhe.estorno_baixa_conferencia.ocorrencias}×).</span>{' '}
                Último em {formatarDataHoraBr(detalhe.estorno_baixa_conferencia.ultimo_em)}. Motivo registrado:{' '}
                <span className="text-foreground/95">{detalhe.estorno_baixa_conferencia.ultimo_motivo}</span>
              </div>
            ) : null}
            {podeEditarMateriais && detalhe ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Ajuste materiais e IRDs; use <span className="text-foreground/80">Salvar material</span>, depois{' '}
                <span className="text-foreground/80">Salvar materiais na OS</span> e <span className="text-foreground/80">Confirmar baixa</span>.
              </p>
            ) : null}
            {!podeEditarMateriais && detalhe?.estoque_sincronizado ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Baixa confirmada. Lista para conferência; IRDs podem não constar no estoque atual do técnico.
              </p>
            ) : null}
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
            <p className="shrink-0 text-xs font-medium text-foreground/90">Materiais da OS</p>
            {donoUserId && detalhe && podeEditarMateriais ? (
              <EdicaoMateriaisConferenciaOs
                className="min-h-0 flex-1 pt-1.5"
                donoUserId={donoUserId}
                equipeId={detalhe.tecnico_id}
                value={materiaisDraft}
                onChange={setMateriaisDraft}
              />
            ) : null}
            {donoUserId && detalhe && !podeEditarMateriais ? (
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-1.5">
                <MateriaisConferenciaLeitura donoUserId={donoUserId} materiais={materiaisDraft} />
              </div>
            ) : null}
          </div>
          {podeEditarMateriais ? (
            <DialogFooter className="shrink-0 flex-col gap-1.5 border-t border-border/60 bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              {detalhe?.status === 'finalizada' && (
                <p className="w-full text-left text-[10px] text-muted-foreground sm:max-w-[220px]">
                  OS finalizada no roteiro; confirme a baixa no estoque.
                </p>
              )}
              <div className="flex w-full flex-wrap items-center justify-end gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => setDetalhe(null)}>
                  Fechar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleSalvarMateriais()}
                  disabled={salvandoMateriais || confirmando}
                >
                  {salvandoMateriais ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando…
                    </>
                  ) : (
                    'Salvar materiais na OS'
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleConfirmarBaixa()}
                  disabled={confirmando || salvandoMateriais}
                >
                  {confirmando ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirmando…
                    </>
                  ) : detalhe?.status === 'finalizada' ? (
                    'Confirmar baixa no estoque'
                  ) : (
                    'Confirmar baixa e finalizar'
                  )}
                </Button>
              </div>
            </DialogFooter>
          ) : (
            <DialogFooter className="shrink-0 flex-col gap-1.5 border-t border-border/60 bg-muted/20 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
              {podeExibirBotaoEstorno ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full border-amber-200 text-amber-900 hover:bg-amber-50 sm:w-auto dark:border-amber-800 dark:text-amber-100 dark:hover:bg-amber-950/40"
                  onClick={() => {
                    setMotivoEstorno('');
                    setEstornoDialog(true);
                  }}
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Estornar baixa e reabrir conferência
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="secondary" className="w-full sm:w-auto" onClick={() => setDetalhe(null)}>
                Fechar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={estornoDialog} onOpenChange={(o) => !estornando && setEstornoDialog(o)}>
        <DialogContent className="max-w-[min(100%,20rem)] gap-3 p-4 sm:max-w-sm">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base">Estornar baixa de estoque</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              O material volta ao técnico, IRDs reabertos e a OS fica
              <span className="font-medium text-foreground"> pendente de nova conferência</span>. O motivo fica
              salvo: em itens a granel na <span className="text-foreground/90">observação da entrada de ajuste</span>;
              com aparelhos, no histórico como movimento <span className="text-foreground/90">Ajuste</span> (ou nas
              observações da OS se o sistema não puder gerar a linha). Consulte em <span className="text-foreground/90">Histórico de material</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-estorno" className="text-xs">
              Motivo (auditoria)
            </Label>
            <Textarea
              id="motivo-estorno"
              value={motivoEstorno}
              onChange={(e) => setMotivoEstorno(e.target.value)}
              placeholder="Ex.: material lançado por engano; IRD trocado após retorno com o técnico."
              rows={3}
              className="min-h-[72px] resize-y text-sm"
            />
            <p className="text-[11px] text-muted-foreground">Mínimo 8 caracteres.</p>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" size="sm" variant="outline" onClick={() => setEstornoDialog(false)} disabled={estornando}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => void handleEstornarBaixa()}
              disabled={estornando}
            >
              {estornando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Estornando…
                </>
              ) : (
                'Confirmar estorno'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
