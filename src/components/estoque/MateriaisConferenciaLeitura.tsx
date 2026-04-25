import { useEffect, useMemo, useState } from 'react';
import { fetchMateriais } from '@/lib/estoque';
import { supabase } from '@/lib/supabase';
import type { Material } from '@/types/estoque';
import type { MaterialRota } from '@/types';
import { Package } from 'lucide-react';

type Props = {
  donoUserId: string;
  materiais: MaterialRota[];
};

/** Só exibe bloco de IRD se houver registro; catálogo "serializado" sem IRD vira exibição por quantidade. */
function eSerializado(m: MaterialRota): boolean {
  if (m.serial_ids?.some((id) => id?.trim())) return true;
  if (m.numeros_seriais?.some((n) => n?.trim())) return true;
  return false;
}

export function MateriaisConferenciaLeitura({ donoUserId, materiais }: Props) {
  const [catalogo, setCatalogo] = useState<Material[]>([]);
  const [seriaisMap, setSeriaisMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const mats = await fetchMateriais(donoUserId);
        if (!cancel) setCatalogo(mats);
      } catch {
        if (!cancel) setCatalogo([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [donoUserId]);

  const catMap = useMemo(() => new Map(catalogo.map((x) => [x.id, x])), [catalogo]);

  const chaveSeriais = useMemo(() => JSON.stringify(materiais), [materiais]);

  useEffect(() => {
    const ids: string[] = [];
    for (const m of materiais) {
      const sids = m.serial_ids ?? [];
      const nums = m.numeros_seriais ?? [];
      sids.forEach((id, j) => {
        if (id?.trim() && !nums[j]?.trim()) ids.push(id.trim());
      });
    }
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      setSeriaisMap({});
      return;
    }
    let cancel = false;
    (async () => {
      const { data, error } = await supabase
        .from('seriais')
        .select('id, numero_serial')
        .eq('dono_user_id', donoUserId)
        .in('id', unique);
      if (error || cancel) return;
      const next: Record<string, string> = {};
      for (const r of data ?? []) {
        const row = r as { id: string; numero_serial: string };
        next[row.id] = row.numero_serial;
      }
      if (!cancel) setSeriaisMap((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancel = true;
    };
  }, [donoUserId, chaveSeriais]);

  function irdExibir(m: MaterialRota, slot: number): string {
    const num = m.numeros_seriais?.[slot]?.trim();
    if (num) return num;
    const id = m.serial_ids?.[slot]?.trim();
    if (id) return seriaisMap[id] ?? id;
    return '—';
  }

  if (materiais.length === 0) {
    return (
      <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border/80 bg-muted/15 px-2 py-4 text-center">
        Nenhum material registrado nesta OS.
      </p>
    );
  }

  return (
    <ul className="list-none space-y-1.5">
      {materiais.map((m, i) => {
        const cat = m.material_id ? catMap.get(m.material_id) : undefined;
        const serializado = eSerializado(m);
        const codigo = cat?.codigo_material ?? (m.material_id ? m.material_id.slice(0, 8) : '—');
        const nSlots = Math.max(m.serial_ids?.length ?? 0, m.numeros_seriais?.filter(Boolean).length ?? 0);
        const unid = m.unidade?.trim() ? m.unidade : (cat?.unidade_medida ?? 'UN');
        const mostrarIrd = serializado && nSlots > 0;

        return (
          <li key={`${m.material_id}-${i}`} className="rounded-md border border-border/70 bg-card/90">
            <div className="flex gap-2 px-2 py-1.5">
              <div className="mt-0.5 shrink-0 rounded bg-primary/10 p-1 text-primary">
                <Package className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-xs font-medium leading-tight text-foreground line-clamp-2">{m.nome || cat?.descricao || 'Material'}</p>
                <p className="text-[10px] text-muted-foreground font-mono tracking-tight">Cód. {codigo}</p>
                {mostrarIrd ? (
                  <ul className="space-y-0 text-[11px]">
                    {Array.from({ length: nSlots }, (_, slot) => (
                      <li key={slot} className="flex flex-wrap items-baseline gap-x-1">
                        <span className="text-muted-foreground shrink-0">IRD</span>
                        <span className="font-mono text-foreground tabular-nums">{irdExibir(m, slot)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs tabular-nums leading-tight">
                    <span className="text-muted-foreground">Qtd. </span>
                    {m.quantidade} {unid}
                    {cat?.serializado && nSlots === 0 ? (
                      <span className="ml-1 text-[10px] text-muted-foreground">(serial sem IRD no registro)</span>
                    ) : null}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
