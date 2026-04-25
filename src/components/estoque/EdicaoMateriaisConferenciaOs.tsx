import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import {
  fetchMateriais,
  fetchMateriaisDisponiveisTecnicoConferencia,
  fetchSeriaisTecnicoPorMaterial,
} from '@/lib/estoque';
import type { Material, Serial } from '@/types/estoque';
import type { MaterialRota } from '@/types';
import { MaterialCombobox } from './MaterialCombobox';
import { cn } from '@/lib/utils';
import { Package, Plus, Trash2 } from 'lucide-react';

type Props = {
  donoUserId: string;
  equipeId: string | null | undefined;
  value: MaterialRota[];
  onChange: (next: MaterialRota[]) => void;
  disabled?: boolean;
  className?: string;
};

async function opcoesSerialComAtuais(
  donoUserId: string,
  equipeId: string,
  materialId: string,
  idsAtuais: string[]
): Promise<Serial[]> {
  const disp = await fetchSeriaisTecnicoPorMaterial(donoUserId, equipeId, materialId);
  const map = new Map(disp.map((s) => [s.id, s]));
  const missing = idsAtuais.filter((id) => id && !map.has(id));
  if (missing.length > 0) {
    const { data, error } = await supabase
      .from('seriais')
      .select('*')
      .eq('dono_user_id', donoUserId)
      .in('id', missing);
    if (error) throw error;
    for (const r of data ?? []) map.set((r as Serial).id, r as Serial);
  }
  return [...map.values()].sort((a, b) => a.numero_serial.localeCompare(b.numero_serial, 'pt-BR', { numeric: true }));
}

function eLinhaLote(
  m: MaterialRota,
  mat: { serializado: boolean } | undefined
): boolean {
  return !(mat?.serializado ?? Boolean(m.serial_ids?.length));
}

function qtdLoteNoRascunho(
  list: MaterialRota[],
  materialId: string,
  materialPorId: Map<string, Material>
): number {
  return list
    .filter((m) => {
      if (m.material_id !== materialId) return false;
      return eLinhaLote(m, m.material_id ? materialPorId.get(m.material_id) : undefined);
    })
    .reduce((a, m) => a + (m.quantidade ?? 0), 0);
}

function slotsSerialNoRascunho(list: MaterialRota[], materialId: string): number {
  return list
    .filter((m) => m.material_id === materialId)
    .reduce((a, m) => a + (m.serial_ids?.length ?? 0), 0);
}

export function EdicaoMateriaisConferenciaOs({
  donoUserId,
  equipeId,
  value,
  onChange,
  disabled,
  className,
}: Props) {
  const [catalogo, setCatalogo] = useState<Material[]>([]);
  const [disponiveis, setDisponiveis] = useState<
    { material: Material; capacidade: number }[]
  >([]);
  const [novoMaterialId, setNovoMaterialId] = useState('');
  const [qtdInclusao, setQtdInclusao] = useState(1);
  const [opcoesSerial, setOpcoesSerial] = useState<Record<string, Serial[]>>({});

  const chaveCargaSeriais = useMemo(() => JSON.stringify(value), [value]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const mats = await fetchMateriais(donoUserId);
        if (!cancel) setCatalogo(mats.filter((m) => m.ativo));
      } catch {
        if (!cancel) setCatalogo([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [donoUserId]);

  useEffect(() => {
    if (!donoUserId || !equipeId) {
      setDisponiveis([]);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const rows = await fetchMateriaisDisponiveisTecnicoConferencia(donoUserId, equipeId);
        if (!cancel) setDisponiveis(rows);
      } catch {
        if (!cancel) setDisponiveis([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [donoUserId, equipeId]);

  const materialPorId = useMemo(() => new Map(catalogo.map((m) => [m.id, m])), [catalogo]);

  const materiaisPraCombobox = useMemo(
    () => disponiveis.map((d) => d.material),
    [disponiveis]
  );

  const selecionadoInfo = useMemo(
    () => disponiveis.find((d) => d.material.id === novoMaterialId),
    [disponiveis, novoMaterialId]
  );

  const maxInclusao = useMemo(() => {
    if (!novoMaterialId || !selecionadoInfo) return 0;
    const mat = selecionadoInfo.material;
    if (mat.serializado) {
      return Math.max(0, selecionadoInfo.capacidade - slotsSerialNoRascunho(value, novoMaterialId));
    }
    return Math.max(0, selecionadoInfo.capacidade - qtdLoteNoRascunho(value, novoMaterialId, materialPorId));
  }, [novoMaterialId, selecionadoInfo, value, materialPorId]);

  useEffect(() => {
    setQtdInclusao(1);
  }, [novoMaterialId]);

  useEffect(() => {
    if (!equipeId) {
      setOpcoesSerial({});
      return;
    }
    let cancel = false;
    (async () => {
      const mids = [...new Set(value.map((m) => m.material_id).filter(Boolean))] as string[];
      const next: Record<string, Serial[]> = {};
      for (const mid of mids) {
        const mat = materialPorId.get(mid);
        if (!mat?.serializado) continue;
        const ids = value.filter((m) => m.material_id === mid).flatMap((m) => m.serial_ids ?? []);
        try {
          next[mid] = await opcoesSerialComAtuais(donoUserId, equipeId, mid, ids);
        } catch {
          next[mid] = [];
        }
      }
      if (!cancel) setOpcoesSerial(next);
    })();
    return () => {
      cancel = true;
    };
  }, [chaveCargaSeriais, equipeId, donoUserId, materialPorId, catalogo.length]);

  const setQtd = (i: number, raw: string) => {
    const n = parseInt(raw, 10);
    const q = Number.isFinite(n) ? Math.max(0, n) : 0;
    const next = [...value];
    next[i] = { ...next[i], quantidade: q };
    onChange(next);
  };

  const setSerialSlot = (i: number, slot: number, serialId: string) => {
    const row = value[i];
    if (!row?.material_id) return;
    const opcoes = opcoesSerial[row.material_id] ?? [];
    const ser = opcoes.find((s) => s.id === serialId);
    const ids = [...(row.serial_ids ?? [])];
    const nums = [...(row.numeros_seriais ?? [])];
    ids[slot] = serialId;
    nums[slot] = ser?.numero_serial ?? '';
    const next = [...value];
    next[i] = {
      ...row,
      serial_ids: ids,
      numeros_seriais: nums,
      quantidade: Math.max(1, ids.filter(Boolean).length),
    };
    onChange(next);
  };

  const addSlotSerial = (i: number) => {
    const row = value[i];
    if (!row?.material_id) return;
    const ids = [...(row.serial_ids ?? []), ''];
    const nums = [...(row.numeros_seriais ?? []), ''];
    const next = [...value];
    next[i] = { ...row, serial_ids: ids, numeros_seriais: nums, quantidade: ids.length };
    onChange(next);
  };

  const removeSlotSerial = (i: number, slot: number) => {
    const row = value[i];
    if (!row?.serial_ids?.length) return;
    const ids = row.serial_ids.filter((_, j) => j !== slot);
    const nums = (row.numeros_seriais ?? []).filter((_, j) => j !== slot);
    const next = [...value];
    next[i] = {
      ...row,
      serial_ids: ids.length ? ids : undefined,
      numeros_seriais: nums.length ? nums : undefined,
      quantidade: ids.length || 1,
    };
    onChange(next);
  };

  const removerLinha = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  const salvarMaterialNaLista = () => {
    if (!novoMaterialId || !selecionadoInfo || disabled) return;
    const mat = selecionadoInfo.material;
    const cap = maxInclusao;
    if (cap < 1) return;
    const q = Math.min(Math.max(1, Math.floor(qtdInclusao)), cap);
    if (q < 1) return;
    if (mat.serializado) {
      onChange([
        ...value,
        {
          material_id: mat.id,
          nome: mat.descricao,
          unidade: 'UN',
          quantidade: q,
          serial_ids: Array.from({ length: q }, () => ''),
          numeros_seriais: Array.from({ length: q }, () => ''),
        },
      ]);
    } else {
      onChange([
        ...value,
        {
          material_id: mat.id,
          nome: mat.descricao,
          unidade: mat.unidade_medida ?? 'UN',
          quantidade: q,
        },
      ]);
    }
    setNovoMaterialId('');
    setQtdInclusao(1);
  };

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-1.5', className)}>
      {!equipeId ? (
        <p className="shrink-0 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200/60 dark:border-amber-900 px-2 py-1.5">
          OS sem técnico: ajuste quantidades ou atribua um técnico para listar IRDs.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5">
        <ul className="list-none space-y-1.5">
          {value.length === 0 ? (
            <li className="list-none text-xs text-muted-foreground">Nenhum material. Inclua abaixo a partir do estoque do técnico.</li>
          ) : (
            value.map((m, i) => {
              const cat = m.material_id ? materialPorId.get(m.material_id) : undefined;
              const serializado = cat?.serializado ?? Boolean(m.serial_ids?.length);
              return (
                <li
                  key={`${m.material_id}-${i}`}
                  className="rounded-md border border-border/70 bg-card/90"
                >
                  <div className="flex gap-2 px-2 py-1.5">
                    <div className="mt-0.5 shrink-0 rounded bg-primary/10 p-1 text-primary">
                      <Package className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
                            {m.nome || cat?.descricao || 'Material'}
                          </p>
                          <p className="text-[10px] font-mono text-muted-foreground">
                            Cód. {cat?.codigo_material ?? m.material_id ?? '—'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                          disabled={disabled}
                          onClick={() => removerLinha(i)}
                          aria-label="Remover linha"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {serializado ? (
                        <div className="space-y-1.5 pl-0">
                          <Label className="text-[10px] text-muted-foreground">IRD (estoque do técnico)</Label>
                          {(m.serial_ids?.length ? m.serial_ids : ['']).map((sid, slot) => (
                            <div key={slot} className="flex items-center gap-1.5">
                              <Select
                                value={sid || undefined}
                                onValueChange={(v) => setSerialSlot(i, slot, v)}
                                disabled={disabled || !equipeId}
                              >
                                <SelectTrigger className="h-7 min-w-0 flex-1 text-[11px]">
                                  <SelectValue placeholder="IRD…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(opcoesSerial[m.material_id!] ?? []).map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.numero_serial}
                                      {s.status !== 'disponivel' ? ` · ${s.status}` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {(m.serial_ids?.length ?? 0) > 1 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 shrink-0 p-0"
                                  disabled={disabled}
                                  onClick={() => removeSlotSerial(i, slot)}
                                >
                                  −
                                </Button>
                              ) : null}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 w-full text-[11px]"
                            disabled={disabled || !equipeId}
                            onClick={() => addSlotSerial(i)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Outro IRD
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-muted-foreground">Qtd. ({m.unidade ?? cat?.unidade_medida ?? 'UN'})</Label>
                            <Input
                              type="number"
                              min={0}
                              value={m.quantidade}
                              disabled={disabled}
                              onChange={(e) => setQtd(i, e.target.value)}
                              className="h-7 w-20 text-[11px]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="shrink-0 rounded-md border border-dashed border-border/60 bg-muted/15 p-2 space-y-1.5">
        <Label className="text-[10px] font-medium text-muted-foreground">Incluir (estoque do técnico)</Label>
        {equipeId && materiaisPraCombobox.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Nada disponível no estoque do técnico para novas linhas.</p>
        ) : null}
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-0.5">
            <Label className="text-[10px] text-muted-foreground">Material</Label>
            <MaterialCombobox
              materiais={materiaisPraCombobox}
              value={novoMaterialId}
              onValueChange={setNovoMaterialId}
              disabled={disabled || !equipeId || materiaisPraCombobox.length === 0}
              placeholder="Selecione o material…"
              className="h-7 w-full text-[11px]"
            />
          </div>
          <div className="flex flex-wrap items-end gap-1.5 sm:shrink-0">
            <div className="w-20 space-y-0.5 sm:w-24">
              <Label className="text-[10px] text-muted-foreground">
                {selecionadoInfo?.material.serializado ? 'Nº IRD' : 'Qtd.'}
              </Label>
              <Input
                type="number"
                min={1}
                max={maxInclusao > 0 ? maxInclusao : 1}
                value={qtdInclusao}
                disabled={disabled || !novoMaterialId || maxInclusao < 1}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isFinite(n)) {
                    setQtdInclusao(1);
                    return;
                  }
                  const cap = Math.max(1, maxInclusao);
                  setQtdInclusao(Math.min(Math.max(1, n), cap));
                }}
                className="h-7 w-full text-[11px]"
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="h-7 min-w-[6.5rem] text-[11px]"
              variant="secondary"
              disabled={disabled || !novoMaterialId || maxInclusao < 1}
              onClick={salvarMaterialNaLista}
            >
              Salvar material
            </Button>
          </div>
        </div>
        {novoMaterialId && maxInclusao >= 1 ? (
          <p className="text-[10px] text-muted-foreground">Máx. nesta inclusão: {maxInclusao}.</p>
        ) : null}
      </div>
    </div>
  );
}

/** Remove linhas inválidas antes de persistir ou baixar. */
export function sanitizarMateriaisConferencia(list: MaterialRota[]): MaterialRota[] {
  return list
    .filter((m) => m.material_id?.trim())
    .map((m) => ({ ...m }))
    .filter((m) => {
      if (m.serial_ids?.length) {
        const ok = m.serial_ids.every((id) => id?.trim());
        return ok;
      }
      return (m.quantidade ?? 0) > 0;
    });
}
