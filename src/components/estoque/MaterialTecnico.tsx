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
} from '@/lib/estoque';
import { fetchEquipe, type EquipeRow } from '@/lib/equipe';
import type { EstoqueSaldo, Serial } from '@/types/estoque';

interface MaterialComSeriais extends EstoqueSaldo {
  seriais?: Serial[];
}

export function MaterialTecnico() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const usuarioId = user?.id ?? '';

  const [tecnicos, setTecnicos] = useState<EquipeRow[]>([]);
  const [tecnicoId, setTecnicoId] = useState('');
  const [localOrigemId, setLocalOrigemId] = useState<string | null>(null);
  const [itens, setItens] = useState<MaterialComSeriais[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogItem, setDialogItem] = useState<MaterialComSeriais | null>(null);
  const [destinoKey, setDestinoKey] = useState<string>('central');
  const [qtdTransfer, setQtdTransfer] = useState(1);
  const [seriaisSelecionados, setSeriaisSelecionados] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadTecnicos = useCallback(async () => {
    if (!donoUserId) return;
    try {
      const eq = await fetchEquipe(donoUserId);
      setTecnicos(eq.filter((e) => ['tecnico', 'técnico'].includes((e.funcao ?? '').toLowerCase())));
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao carregar técnicos.', variant: 'destructive' });
    }
  }, [donoUserId, toast]);

  useEffect(() => {
    loadTecnicos();
  }, [loadTecnicos]);

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
      const tecnico = tecnicos.find((t) => t.id === tecnicoId)!;
      const local = await getOrCreateLocalTecnico(donoUserId, tecnico.id, tecnico.nome_completo);
      const saldo = await fetchEstoque(donoUserId, { local_id: local.id, apenasComSaldo: true });

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

      // Só exibe linhas com saldo > 0; serializado some se não houver mais serial nesse local
      setItens(
        itensComSeriais.filter((item) => {
          if (item.quantidade <= 0) return false;
          if (item.material?.serializado) return (item.seriais?.length ?? 0) > 0;
          return true;
        })
      );
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao carregar materiais.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [donoUserId, tecnicoId, tecnicos, toast]);

  useEffect(() => {
    loadMateriais();
  }, [loadMateriais]);

  const abrirDialog = (item: MaterialComSeriais) => {
    setDialogItem(item);
    setDestinoKey('central');
    setQtdTransfer(Math.min(item.quantidade, 1));
    setSeriaisSelecionados([]);
  };

  const toggleSerial = (id: string) => {
    setSeriaisSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const outrosTecnicos = tecnicos.filter((t) => t.id !== tecnicoId);

  const executarTransferencia = async () => {
    if (!donoUserId || !usuarioId || !dialogItem || !localOrigemId) return;
    if (destinoKey !== 'central' && destinoKey === tecnicoId) {
      toast({ title: 'Destino inválido', description: 'Escolha outro técnico ou o Estoque Central.', variant: 'destructive' });
      return;
    }

    const serializado = !!dialogItem.material?.serializado;
    if (serializado) {
      if (seriaisSelecionados.length === 0) {
        toast({ title: 'Selecione os IRDs', description: 'Marque ao menos um serial disponível.', variant: 'destructive' });
        return;
      }
    } else {
      if (qtdTransfer < 1 || qtdTransfer > dialogItem.quantidade) {
        toast({ title: 'Quantidade inválida', description: `Informe entre 1 e ${dialogItem.quantidade}.`, variant: 'destructive' });
        return;
      }
    }

    setSubmitting(true);
    try {
      let destinoId: string;
      if (destinoKey === 'central') {
        destinoId = (await getOrCreateEstoqueCentral(donoUserId)).id;
      } else {
        const outro = tecnicos.find((t) => t.id === destinoKey)!;
        destinoId = (await getOrCreateLocalTecnico(donoUserId, outro.id, outro.nome_completo)).id;
      }

      await registrarTransferencia(donoUserId, usuarioId, {
        material_id: dialogItem.material_id,
        local_origem_id: localOrigemId,
        local_destino_id: destinoId,
        quantidade: serializado ? seriaisSelecionados.length : qtdTransfer,
        observacao: 'Devolução/transferência (Material do Técnico)',
        seriais: serializado ? seriaisSelecionados : undefined,
      });

      toast({ title: 'Transferência registrada!' });
      setDialogItem(null);
      await loadMateriais();
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao transferir.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const seriaisDisponiveisDialog = dialogItem?.seriais?.filter((s) => s.status === 'disponivel') ?? [];

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

        {!tecnicoId && (
          <p className="text-sm text-muted-foreground">Selecione um técnico para ver o material avançado.</p>
        )}

        {tecnicoId && loading && (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando…</p>
        )}

        {tecnicoId && !loading && itens.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum material avançado para este técnico.</p>
        )}

        {tecnicoId && !loading && itens.length > 0 && (
          <div className="space-y-4">
            {itens.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-sm">{item.material?.descricao}</span>
                    <span className="text-xs text-muted-foreground font-mono ml-2">{item.material?.codigo_material}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!item.material?.serializado && (
                      <Badge variant="secondary">
                        {item.quantidade} {item.material?.unidade_medida}
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => abrirDialog(item)}
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      Devolver / transferir
                    </Button>
                  </div>
                </div>

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
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!dialogItem} onOpenChange={(o) => !o && setDialogItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Devolver ou transferir material</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {dialogItem?.material?.descricao} — saldo disponível para movimentar:{' '}
              {dialogItem?.material?.serializado
                ? `${seriaisDisponiveisDialog.length} IRD(s) disponível(is)`
                : `${dialogItem?.quantidade ?? 0} ${dialogItem?.material?.unidade_medida}`}
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

            {dialogItem?.material?.serializado ? (
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
                  max={dialogItem?.quantidade ?? 1}
                  value={qtdTransfer}
                  onChange={(e) => setQtdTransfer(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogItem(null)} disabled={submitting}>
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
