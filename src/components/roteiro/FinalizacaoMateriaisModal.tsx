import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import {
  fetchEstoqueTecnico,
  fetchSeriaisTecnicoPorMaterial,
  fetchContagemReusoComTecnico,
  isMaterialRetiradaRet,
} from '@/lib/estoque';
import type { EstoqueSaldo, Serial } from '@/types/estoque';
import type { MaterialRota } from '@/types';
import { Loader2 } from 'lucide-react';

type LinhaLote = {
  tipo: 'lote';
  ordem: number;
  material_id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade_disponivel: number;
  /** 'reuso' apenas para materiais RET com unidades reuso disponíveis */
  tipoOrigem: 'reuso' | 'novo';
};

type LinhaSerial = {
  tipo: 'serial';
  ordem: number;
  material_id: string;
  codigo: string;
  descricao: string;
  serial_id: string;
  numero_serial: string;
};

export type LinhaEstoqueFinalizacao = LinhaLote | LinhaSerial;

/** Chave única para usoLote: composite material_id + tipoOrigem */
function chaveUsoLote(materialId: string, tipoOrigem: 'reuso' | 'novo'): string {
  return `${materialId}|${tipoOrigem}`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  donoUserId: string;
  /** ID do técnico (`equipe.id`) cujo estoque local será consultado — vazio se a OS não tem técnico. */
  equipeId: string;
  codigoOs: string;
  /** `true`: técnico (pré-finaliza). `false`: controlador/outros (finaliza e baixa na hora). */
  fluxoTecnico: boolean;
  /** Nome do técnico (exibido no fluxo controlador). */
  tecnicoEstoqueNome?: string | null;
  onConfirm: (materiais: MaterialRota[]) => void | Promise<void>;
};

function mergeSaldosPorMaterial(saldos: EstoqueSaldo[]): EstoqueSaldo[] {
  const map = new Map<string, EstoqueSaldo>();
  for (const s of saldos) {
    const ex = map.get(s.material_id);
    if (ex) {
      map.set(s.material_id, { ...ex, quantidade: ex.quantidade + s.quantidade });
    } else {
      map.set(s.material_id, { ...s });
    }
  }
  return [...map.values()];
}

function montarLinhas(
  saldos: EstoqueSaldo[],
  seriaisPorMaterial: Record<string, Serial[]>,
  reusoComTecnico: Map<string, number>
): LinhaEstoqueFinalizacao[] {
  const ordenados = [...saldos].sort((a, b) => {
    const ca = a.material?.codigo_material ?? '';
    const cb = b.material?.codigo_material ?? '';
    if (ca !== cb) return ca.localeCompare(cb, 'pt-BR');
    return (a.material?.descricao ?? '').localeCompare(b.material?.descricao ?? '', 'pt-BR');
  });

  const linhas: LinhaEstoqueFinalizacao[] = [];
  let ordem = 1;

  for (const s of ordenados) {
    const mat = s.material;
    if (!mat) continue;
    const codigo = mat.codigo_material ?? '';
    const descricao = mat.descricao ?? s.material_id;

    if (mat.serializado) {
      const seriais = (seriaisPorMaterial[s.material_id] ?? []).slice().sort((a, b) =>
        a.numero_serial.localeCompare(b.numero_serial, 'pt-BR', { numeric: true })
      );
      for (const ser of seriais) {
        linhas.push({
          tipo: 'serial',
          ordem: ordem++,
          material_id: s.material_id,
          codigo,
          descricao,
          serial_id: ser.id,
          numero_serial: ser.numero_serial,
        });
      }
    } else {
      const isRet = isMaterialRetiradaRet(codigo);
      const qtdReuso = isRet ? (reusoComTecnico.get(s.material_id) ?? 0) : 0;
      const qtdNovo = s.quantidade - qtdReuso;

      if (isRet && qtdReuso > 0) {
        linhas.push({
          tipo: 'lote',
          ordem: ordem++,
          material_id: s.material_id,
          codigo,
          descricao,
          unidade: mat.unidade_medida ?? 'UN',
          quantidade_disponivel: qtdReuso,
          tipoOrigem: 'reuso',
        });
        if (qtdNovo > 0) {
          linhas.push({
            tipo: 'lote',
            ordem: ordem++,
            material_id: s.material_id,
            codigo,
            descricao,
            unidade: mat.unidade_medida ?? 'UN',
            quantidade_disponivel: qtdNovo,
            tipoOrigem: 'novo',
          });
        }
      } else {
        linhas.push({
          tipo: 'lote',
          ordem: ordem++,
          material_id: s.material_id,
          codigo,
          descricao,
          unidade: mat.unidade_medida ?? 'UN',
          quantidade_disponivel: s.quantidade,
          tipoOrigem: 'novo',
        });
      }
    }
  }

  return linhas;
}

function construirMateriaisRota(
  linhas: LinhaEstoqueFinalizacao[],
  usoLote: Record<string, string>,
  usoSerial: Record<string, boolean>
): MaterialRota[] {
  const porMaterial = new Map<string, MaterialRota>();

  for (const linha of linhas) {
    if (linha.tipo === 'lote') {
      const key = chaveUsoLote(linha.material_id, linha.tipoOrigem);
      const raw = (usoLote[key] ?? '').trim();
      if (raw === '') continue;
      const q = Number(raw);
      if (!Number.isFinite(q) || q <= 0) continue;
      const qtd = Math.min(Math.floor(q), linha.quantidade_disponivel);
      if (qtd <= 0) continue;

      const prev = porMaterial.get(linha.material_id);
      if (prev) {
        prev.quantidade += qtd;
        if (linha.tipoOrigem === 'reuso') {
          prev.qtd_reuso = (prev.qtd_reuso ?? 0) + qtd;
        }
      } else {
        porMaterial.set(linha.material_id, {
          material_id: linha.material_id,
          nome: linha.descricao,
          unidade: linha.unidade,
          quantidade: qtd,
          qtd_reuso: linha.tipoOrigem === 'reuso' ? qtd : 0,
        });
      }
    } else {
      if (!usoSerial[linha.serial_id]) continue;
      const prev = porMaterial.get(linha.material_id);
      if (prev?.serial_ids) {
        prev.serial_ids.push(linha.serial_id);
        prev.numeros_seriais = [...(prev.numeros_seriais ?? []), linha.numero_serial];
        prev.quantidade = prev.serial_ids.length;
      } else {
        porMaterial.set(linha.material_id, {
          material_id: linha.material_id,
          nome: linha.descricao,
          unidade: 'UN',
          quantidade: 1,
          serial_ids: [linha.serial_id],
          numeros_seriais: [linha.numero_serial],
        });
      }
    }
  }

  return [...porMaterial.values()];
}

export function FinalizacaoMateriaisModal({
  open,
  onOpenChange,
  donoUserId,
  equipeId,
  codigoOs,
  fluxoTecnico,
  tecnicoEstoqueNome,
  onConfirm,
}: Props) {
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [linhas, setLinhas] = useState<LinhaEstoqueFinalizacao[]>([]);
  const [usoLote, setUsoLote] = useState<Record<string, string>>({});
  const [usoSerial, setUsoSerial] = useState<Record<string, boolean>>({});

  const resetCampos = useCallback((ls: LinhaEstoqueFinalizacao[]) => {
    const lote: Record<string, string> = {};
    const ser: Record<string, boolean> = {};
    for (const l of ls) {
      if (l.tipo === 'lote') lote[chaveUsoLote(l.material_id, l.tipoOrigem)] = '';
      else ser[l.serial_id] = false;
    }
    setUsoLote(lote);
    setUsoSerial(ser);
  }, []);

  useEffect(() => {
    if (!open || !donoUserId || !equipeId) {
      setLinhas([]);
      return;
    }

    let cancel = false;
    setCarregando(true);
    setLinhas([]);

    (async () => {
      try {
        const [saldos, reusoComTecnico] = await Promise.all([
          fetchEstoqueTecnico(donoUserId, equipeId).then(mergeSaldosPorMaterial),
          fetchContagemReusoComTecnico(donoUserId, equipeId),
        ]);
        if (cancel) return;

        const seriaisPorMaterial: Record<string, Serial[]> = {};
        await Promise.all(
          saldos
            .filter((s) => s.material?.serializado)
            .map(async (s) => {
              const list = await fetchSeriaisTecnicoPorMaterial(donoUserId, equipeId, s.material_id);
              if (!cancel) seriaisPorMaterial[s.material_id] = list;
            })
        );

        if (cancel) return;
        const ls = montarLinhas(saldos, seriaisPorMaterial, reusoComTecnico);
        setLinhas(ls);
        resetCampos(ls);
      } catch {
        if (!cancel) {
          toast({
            title: 'Não foi possível carregar o estoque',
            description: 'Verifique a conexão e tente novamente.',
            variant: 'destructive',
          });
          setLinhas([]);
        }
      } finally {
        if (!cancel) setCarregando(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [open, donoUserId, equipeId, toast, resetCampos]);

  const temInventario = linhas.length > 0;

  const validar = useCallback((): string | null => {
    for (const l of linhas) {
      if (l.tipo !== 'lote') continue;
      const key = chaveUsoLote(l.material_id, l.tipoOrigem);
      const raw = (usoLote[key] ?? '').trim();
      if (raw === '') continue;
      const q = Number(raw);
      if (!Number.isFinite(q) || q < 0) return `Quantidade inválida para ${l.descricao}.`;
      if (q > l.quantidade_disponivel) {
        return `Quantidade usada maior que o disponível (${l.quantidade_disponivel}) em ${l.descricao}${l.tipoOrigem === 'reuso' ? ' [REUSO]' : ''}.`;
      }
    }
    return null;
  }, [linhas, usoLote]);

  const handleConfirmar = async () => {
    const err = validar();
    if (err) {
      toast({ title: 'Revise os materiais', description: err, variant: 'destructive' });
      return;
    }
    setEnviando(true);
    try {
      await Promise.resolve(onConfirm(construirMateriaisRota(linhas, usoLote, usoSerial)));
    } finally {
      setEnviando(false);
    }
  };

  const colDisponivelClass = useMemo(() => 'min-w-0 text-sm border-r bg-muted/40 px-2 py-2 align-top', []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Materiais utilizados na OS {codigoOs}</DialogTitle>
          <DialogDescription>
            {fluxoTecnico ? (
              <>
                À esquerda, o que você tem no estoque (numerado). À direita, informe apenas o que foi utilizado neste
                serviço — campos começam vazios. Aparelhos serializados: marque cada IRD usado.
              </>
            ) : (
              <>
                Estoque do técnico {tecnicoEstoqueNome ? `(${tecnicoEstoqueNome})` : 'atribuído à OS'} — à esquerda o
                disponível, à direita o utilizado neste serviço. Campos começam vazios; aparelhos serializados: marque
                cada IRD usado. Ao confirmar, a OS será finalizada e o estoque será baixado.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[min(420px,55vh)] border-y">
          <div className="min-w-[520px]">
            {carregando && (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{fluxoTecnico ? 'Carregando seu estoque…' : 'Carregando estoque do técnico…'}</span>
              </div>
            )}

            {!carregando && !temInventario && (
              <p className="px-6 py-10 text-sm text-muted-foreground text-center">
                Não há materiais com saldo neste estoque. Você pode finalizar sem baixa de material.
              </p>
            )}

            {!carregando && temInventario && (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="w-10 px-2 py-2 text-center border-r sticky left-0 bg-muted/60 z-[1]">#</th>
                    <th className="min-w-[200px] px-2 py-2 border-r">
                      {fluxoTecnico ? 'Disponível no seu estoque' : 'Disponível (técnico)'}
                    </th>
                    <th className="min-w-[160px] px-2 py-2">Utilizado nesta OS</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha) => (
                    <tr
                      key={`${linha.tipo}-${linha.ordem}`}
                      className={`border-b ${linha.tipo === 'lote' && linha.tipoOrigem === 'reuso' ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}
                    >
                      <td className="text-center font-mono tabular-nums text-muted-foreground border-r bg-muted/30 sticky left-0 z-[1] px-1 py-2">
                        {linha.ordem}
                      </td>
                      <td className={colDisponivelClass}>
                        {linha.tipo === 'lote' ? (
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-foreground">{linha.codigo}</span>
                              <span className="text-muted-foreground">— {linha.descricao}</span>
                              {linha.tipoOrigem === 'reuso' && (
                                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                                  REUSO
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Saldo: <strong className="text-foreground">{linha.quantidade_disponivel}</strong>{' '}
                              {linha.unidade}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="font-medium text-foreground">{linha.codigo}</span>
                            <span className="text-muted-foreground"> — {linha.descricao}</span>
                            <div className="font-mono text-xs mt-1 bg-background/80 rounded border px-1.5 py-0.5 inline-block">
                              {linha.numero_serial}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 align-middle">
                        {linha.tipo === 'lote' ? (
                          <Input
                            type="number"
                            min={0}
                            max={linha.quantidade_disponivel}
                            step={1}
                            inputMode="numeric"
                            className="h-9 w-24 font-mono tabular-nums"
                            placeholder="—"
                            value={usoLote[chaveUsoLote(linha.material_id, linha.tipoOrigem)] ?? ''}
                            onChange={(e) =>
                              setUsoLote((prev) => ({
                                ...prev,
                                [chaveUsoLote(linha.material_id, linha.tipoOrigem)]: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer text-xs">
                            <Checkbox
                              checked={usoSerial[linha.serial_id] ?? false}
                              onCheckedChange={(c) =>
                                setUsoSerial((prev) => ({ ...prev, [linha.serial_id]: c === true }))
                              }
                            />
                            <span>Utilizei este IRD</span>
                          </label>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 shrink-0 flex-row gap-2 sm:justify-end bg-muted/30">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button type="button" onClick={() => void handleConfirmar()} disabled={carregando || enviando}>
            {enviando ? 'Salvando…' : fluxoTecnico ? 'Confirmar e pré-finalizar OS' : 'Confirmar e finalizar OS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
