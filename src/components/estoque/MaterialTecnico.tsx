import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserCheck, ArrowLeftRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import {
  fetchEstoque,
  fetchSeriais,
  getOrCreateLocalTecnico,
  getOrCreateEstoqueCentral,
  registrarTransferencia,
  isMaterialRetiradaRet,
  fetchContagemReusoComTecnico,
  moverUnidadesReusoTecnico,
} from '@/lib/estoque';
import { fetchEquipe, type EquipeRow } from '@/lib/equipe';
import type { EstoqueSaldo, Serial } from '@/types/estoque';

interface MaterialComSeriais extends EstoqueSaldo {
  seriais?: Serial[];
}

/** Linha virtual expandida para exibição — pode representar REUSO ou NOVO de um mesmo material */
interface LinhaVirtual {
  item: MaterialComSeriais;
  tipoOrigem: 'reuso' | 'novo';
  qtd: number;
}

interface DialogInfo {
  item: MaterialComSeriais;
  tipoOrigem: 'reuso' | 'novo';
  maxQtd: number;
}

function isFuncaoTecnico(funcao: string | null | undefined): boolean {
  const f = (funcao ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  return f === 'tecnico';
}

export function MaterialTecnico() {
  const { user, authExtras, papelCodigo } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const usuarioId = user?.id ?? '';
  const equipeIdLogado = authExtras?.equipeId ?? null;
  /** Subusuário com papel técnico: só enxerga o próprio bolso; não escolhe outro técnico. */
  const somenteProprioTecnico = papelCodigo === 'tecnico';

  const [tecnicos, setTecnicos] = useState<EquipeRow[]>([]);
  const [tecnicoId, setTecnicoId] = useState('');
  const [localOrigemId, setLocalOrigemId] = useState<string | null>(null);
  const [itens, setItens] = useState<MaterialComSeriais[]>([]);
  const [reusoComTecnico, setReusoComTecnico] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);

  const [dialogInfo, setDialogInfo] = useState<DialogInfo | null>(null);
  const [destinoKey, setDestinoKey] = useState<string>('central');
  const [qtdTransfer, setQtdTransfer] = useState(1);
  const [seriaisSelecionados, setSeriaisSelecionados] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadTecnicos = useCallback(async () => {
    if (!donoUserId) return;
    try {
      const eq = await fetchEquipe(donoUserId);
      let list = eq.filter((e) => isFuncaoTecnico(e.funcao));
      // Quem entra como técnico deve ver o próprio material mesmo se `funcao` no cadastro divergir do esperado
      if (somenteProprioTecnico && equipeIdLogado) {
        const self = eq.find((e) => e.id === equipeIdLogado);
        if (self && !list.some((t) => t.id === self.id)) {
          list = [self, ...list];
        }
      }
      setTecnicos(list);
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao carregar técnicos.', variant: 'destructive' });
    }
  }, [donoUserId, toast, somenteProprioTecnico, equipeIdLogado]);

  useEffect(() => {
    loadTecnicos();
  }, [loadTecnicos]);

  /** Pré-seleciona o técnico logado (equipe) quando o papel é só técnico. */
  useEffect(() => {
    if (!somenteProprioTecnico || !equipeIdLogado || tecnicos.length === 0) return;
    if (!tecnicos.some((t) => t.id === equipeIdLogado)) return;
    setTecnicoId((prev) => (prev === equipeIdLogado ? prev : equipeIdLogado));
  }, [somenteProprioTecnico, equipeIdLogado, tecnicos]);

  useEffect(() => {
    if (!donoUserId || !tecnicoId) {
      setLocalOrigemId(null);
      return;
    }
    const t = tecnicos.find((x) => x.id === tecnicoId);
    if (!t) return;
    let cancelled = false;
    getOrCreateLocalTecnico(donoUserId, t.id, t.nome_completo).then((loc) => {
      if (!cancelled) setLocalOrigemId(loc.id);
    });
    return () => {
      cancelled = true;
    };
  }, [donoUserId, tecnicoId, tecnicos]);

  const loadMateriais = useCallback(async () => {
    if (!donoUserId || !tecnicoId) return;
    setLoading(true);
    try {
      const tecnico = tecnicos.find((t) => t.id === tecnicoId);
      const nomeLocal =
        tecnico?.nome_completo?.trim() ||
        (somenteProprioTecnico ? (user?.name ?? '').trim() : '') ||
        tecnicoId;
      const local = await getOrCreateLocalTecnico(donoUserId, tecnicoId, nomeLocal);

      const [saldo, contagemReuso] = await Promise.all([
        fetchEstoque(donoUserId, { local_id: local.id, apenasComSaldo: true }),
        fetchContagemReusoComTecnico(donoUserId, tecnicoId),
      ]);

      const itensComSeriais: MaterialComSeriais[] = await Promise.all(
        saldo.map(async (s) => {
          if (s.material?.serializado) {
            const seriais = await fetchSeriais(donoUserId, {
              material_id: s.material_id,
              local_id: local.id,
              status: 'disponivel',
            });
            return { ...s, seriais };
          }
          return s;
        })
      );

      setItens(
        itensComSeriais.filter((item) => {
          if (item.quantidade <= 0) return false;
          if (item.material?.serializado) return (item.seriais?.length ?? 0) > 0;
          return true;
        })
      );
      setReusoComTecnico(contagemReuso);
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao carregar materiais.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [donoUserId, tecnicoId, tecnicos, toast, somenteProprioTecnico, user?.name]);

  useEffect(() => {
    loadMateriais();
  }, [loadMateriais]);

  /** Expande itens RET com reuso em linhas virtuais REUSO + NOVO quando aplicável. */
  const linhasVirtuais = (() => {
    const result: LinhaVirtual[] = [];
    for (const item of itens) {
      const isRet = !item.material?.serializado && isMaterialRetiradaRet(item.material?.codigo_material ?? '');
      const qtdReuso = isRet ? (reusoComTecnico.get(item.material_id) ?? 0) : 0;
      const qtdNovo = item.quantidade - qtdReuso;

      if (isRet && qtdReuso > 0) {
        result.push({ item, tipoOrigem: 'reuso', qtd: qtdReuso });
        if (qtdNovo > 0) {
          result.push({ item, tipoOrigem: 'novo', qtd: qtdNovo });
        }
      } else {
        // Serializado ou não-RET: exibe como estava
        result.push({ item, tipoOrigem: 'novo', qtd: item.quantidade });
      }
    }
    return result;
  })();

  const abrirDialog = (info: DialogInfo) => {
    setDialogInfo(info);
    setDestinoKey('central');
    setQtdTransfer(Math.min(info.maxQtd, 1));
    setSeriaisSelecionados([]);
  };

  const toggleSerial = (id: string) => {
    setSeriaisSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const outrosTecnicos = tecnicos.filter((t) => t.id !== tecnicoId);

  const executarTransferencia = async () => {
    if (!donoUserId || !usuarioId || !dialogInfo || !localOrigemId) return;
    if (destinoKey !== 'central' && destinoKey === tecnicoId) {
      toast({ title: 'Destino inválido', description: 'Escolha outro técnico ou o Estoque Central.', variant: 'destructive' });
      return;
    }

    const { item, tipoOrigem, maxQtd } = dialogInfo;
    const serializado = !!item.material?.serializado;

    if (serializado) {
      if (seriaisSelecionados.length === 0) {
        toast({ title: 'Selecione os IRDs', description: 'Marque ao menos um serial disponível.', variant: 'destructive' });
        return;
      }
    } else {
      if (qtdTransfer < 1 || qtdTransfer > maxQtd) {
        toast({ title: 'Quantidade inválida', description: `Informe entre 1 e ${maxQtd}.`, variant: 'destructive' });
        return;
      }
    }

    setSubmitting(true);
    try {
      let destinoId: string;
      let tecnicoDestinoEquipeId: string | null = null;

      if (destinoKey === 'central') {
        destinoId = (await getOrCreateEstoqueCentral(donoUserId)).id;
      } else {
        const outro = tecnicos.find((t) => t.id === destinoKey)!;
        destinoId = (await getOrCreateLocalTecnico(donoUserId, outro.id, outro.nome_completo)).id;
        tecnicoDestinoEquipeId = outro.id;
      }

      const qtdMovida = serializado ? seriaisSelecionados.length : qtdTransfer;

      await registrarTransferencia(donoUserId, usuarioId, {
        material_id: item.material_id,
        local_origem_id: localOrigemId,
        local_destino_id: destinoId,
        quantidade: qtdMovida,
        observacao: 'Devolução/transferência (Material do Técnico)',
        seriais: serializado ? seriaisSelecionados : undefined,
      });

      // Sincroniza unidades reuso se for linha de origem reuso
      if (tipoOrigem === 'reuso' && !serializado) {
        await moverUnidadesReusoTecnico(
          donoUserId,
          item.material_id,
          qtdMovida,
          tecnicoId,
          tecnicoDestinoEquipeId
        );
      }

      toast({ title: 'Transferência registrada!' });
      setDialogInfo(null);
      await loadMateriais();
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao transferir.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const seriaisDisponiveisDialog = dialogInfo?.item.seriais?.filter((s) => s.status === 'disponivel') ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-violet-500" />
          Material do Técnico
        </CardTitle>
        <p className="text-xs text-muted-foreground font-normal">
          Exibe apenas material <strong className="font-medium text-foreground">disponível</strong> no bolso do técnico (IRD instalados não aparecem).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {somenteProprioTecnico ? (
          <div className="max-w-lg space-y-1">
            <Label>Técnico</Label>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              {!equipeIdLogado ? (
                <span className="text-destructive">
                  Seu usuário não está vinculado a um registro de equipe. Peça ao administrador para corrigir o cadastro.
                </span>
              ) : (
                <>
                  <span className="text-muted-foreground">Visualizando material de </span>
                  <span className="font-medium">
                    {tecnicos.find((t) => t.id === equipeIdLogado)?.nome_completo ?? user?.name ?? '—'}
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-xs space-y-1.5">
            <Label>Técnico</Label>
            <Select value={tecnicoId} onValueChange={setTecnicoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o técnico…" />
              </SelectTrigger>
              <SelectContent>
                {tecnicos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!somenteProprioTecnico && !tecnicoId && (
          <p className="text-sm text-muted-foreground">Selecione um técnico para ver o material avançado.</p>
        )}

        {somenteProprioTecnico && equipeIdLogado && !tecnicoId && (
          <p className="text-sm text-muted-foreground">Carregando seu material…</p>
        )}

        {tecnicoId && loading && (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando…</p>
        )}

        {tecnicoId && !loading && itens.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum material avançado para este técnico.</p>
        )}

        {tecnicoId && !loading && linhasVirtuais.length > 0 && (
          <div className="space-y-3">
            {/* Agrupa linhas virtuais pelo material para exibir o cabeçalho uma vez */}
            {itens.map((item) => {
              const linhasDeste = linhasVirtuais.filter((l) => l.item.material_id === item.material_id);
              if (linhasDeste.length === 0) return null;
              const temSplit = linhasDeste.length > 1 || linhasDeste[0].tipoOrigem === 'reuso';

              return (
                <div key={item.id} className="border rounded-lg p-3 space-y-2">
                  {/* Cabeçalho do material */}
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{item.material?.descricao}</span>
                    <span className="text-xs text-muted-foreground font-mono">{item.material?.codigo_material}</span>
                  </div>

                  {/* Linhas de quantidade: split REUSO/NOVO ou linha única */}
                  {temSplit ? (
                    <div className="space-y-1.5 pl-2 border-l-2 border-muted">
                      {linhasDeste.map((linha) => (
                        <div
                          key={`${item.material_id}-${linha.tipoOrigem}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            {linha.tipoOrigem === 'reuso' ? (
                              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                                REUSO
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                NOVO
                              </Badge>
                            )}
                            <span className="text-sm tabular-nums">
                              {linha.qtd} {item.material?.unidade_medida}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1 h-7 text-xs"
                            onClick={() =>
                              abrirDialog({ item, tipoOrigem: linha.tipoOrigem, maxQtd: linha.qtd })
                            }
                          >
                            <ArrowLeftRight className="h-3 w-3" />
                            Devolver / transferir
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Linha sem split (não-RET ou serializado) */
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {!item.material?.serializado && (
                          <Badge variant="secondary">
                            {item.quantidade} {item.material?.unidade_medida}
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() =>
                          abrirDialog({ item, tipoOrigem: 'novo', maxQtd: item.quantidade })
                        }
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        Devolver / transferir
                      </Button>
                    </div>
                  )}

                  {/* Seriais */}
                  {item.material?.serializado && item.seriais && item.seriais.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">IRD disponível</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {item.seriais.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-mono text-xs py-1.5">{s.numero_serial}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!dialogInfo} onOpenChange={(o) => !o && setDialogInfo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Devolver ou transferir material</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {dialogInfo?.item.material?.descricao}
              {dialogInfo?.tipoOrigem === 'reuso' && (
                <span className="ml-1.5 inline-flex items-center rounded px-1.5 py-0 text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300">
                  REUSO
                </span>
              )}
              {' — '}saldo disponível para movimentar:{' '}
              {dialogInfo?.item.material?.serializado
                ? `${seriaisDisponiveisDialog.length} IRD(s) disponível(is)`
                : `${dialogInfo?.maxQtd ?? 0} ${dialogInfo?.item.material?.unidade_medida}`}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Destino</Label>
              <Select value={destinoKey} onValueChange={setDestinoKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="central">Estoque Central</SelectItem>
                  {outrosTecnicos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      Técnico: {t.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dialogInfo?.item.material?.serializado ? (
              <div className="space-y-2">
                <Label className="text-xs">IRDs disponíveis (marque os que deseja enviar)</Label>
                {seriaisDisponiveisDialog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum serial com status disponível para transferir.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded border p-2 space-y-2">
                    {seriaisDisponiveisDialog.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox checked={seriaisSelecionados.includes(s.id)} onCheckedChange={() => toggleSerial(s.id)} />
                        <span className="font-mono text-xs">{s.numero_serial}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 max-w-[140px]">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  max={dialogInfo?.maxQtd ?? 1}
                  value={qtdTransfer}
                  onChange={(e) => setQtdTransfer(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogInfo(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void executarTransferencia()} disabled={submitting}>
              {submitting ? 'Registrando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
