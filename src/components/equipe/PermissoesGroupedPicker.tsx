import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { PermissaoRow } from '@/lib/papeis-permissoes';
import {
  getLabelPermissaoGroupedPicker,
  PERMISSOES_OCULTAS_NO_PICKER,
  PERMISSOES_UI_GRUPOS,
} from '@/lib/permissoes';
import { cn } from '@/lib/utils';

export interface PermissoesGroupedPickerProps {
  permissoes: PermissaoRow[];
  value: string[];
  onChange: (codigos: string[]) => void;
  /** Código do papel (dicas Roteiro / técnico). */
  papelCodigo?: string;
  className?: string;
  /** Prefixo para ids de acessibilidade quando há mais de um picker na página. */
  idPrefix?: string;
}

/**
 * Lista de permissões agrupada por módulo (mesma lógica do fluxo de criação de acesso).
 */
export function PermissoesGroupedPicker({
  permissoes,
  value,
  onChange,
  papelCodigo = '',
  className,
  idPrefix = '',
}: PermissoesGroupedPickerProps) {
  const grupos = useMemo(() => {
    const ocultas = new Set<string>(PERMISSOES_OCULTAS_NO_PICKER as readonly string[]);
    const visiveis = permissoes.filter((p) => !ocultas.has(p.codigo));
    const byCodigo = new Map(visiveis.map((p) => [p.codigo, p]));
    const used = new Set<string>();
    const gruposRender: { id: string; title: string; rows: PermissaoRow[] }[] = [];

    for (const g of PERMISSOES_UI_GRUPOS) {
      const rows: PermissaoRow[] = [];
      for (const c of g.codigos) {
        const row = byCodigo.get(c);
        if (row) {
          rows.push(row);
          used.add(c);
        }
      }
      if (rows.length > 0) gruposRender.push({ id: g.id, title: g.label, rows });
    }

    const rest = visiveis.filter((p) => !used.has(p.codigo));
    if (rest.length > 0) {
      gruposRender.push({
        id: 'outros',
        title: 'Demais permissões',
        rows: rest.sort((a, b) => a.nome.localeCompare(b.nome)),
      });
    }

    return gruposRender;
  }, [permissoes]);

  const toggle = (codigo: string) => {
    onChange(
      value.includes(codigo) ? value.filter((c) => c !== codigo) : [...value, codigo]
    );
  };

  const toggleGrupoCodigos = (codigosInGrupo: string[], marcarTodos: boolean) => {
    const next = new Set(value);
    for (const c of codigosInGrupo) {
      if (marcarTodos) next.add(c);
      else next.delete(c);
    }
    onChange([...next]);
  };

  const selectedSet = useMemo(() => new Set(value), [value]);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {grupos.map((grupo) => {
        const codigosDaLinha = grupo.rows.map((r) => r.codigo);
        const todosMarcados = codigosDaLinha.every((c) => selectedSet.has(c));
        const algumMarcado = codigosDaLinha.some((c) => selectedSet.has(c));
        const headId = `${idPrefix}grupo-head-${grupo.id}`;
        return (
          <div key={grupo.id} className="space-y-3">
            <div className="flex items-center gap-3 border-b border-border pb-2">
              <Checkbox
                id={headId}
                checked={todosMarcados ? true : algumMarcado ? 'indeterminate' : false}
                onCheckedChange={(v) => toggleGrupoCodigos(codigosDaLinha, v === true)}
              />
              <Label htmlFor={headId} className="cursor-pointer font-semibold text-sm">
                {grupo.title}
              </Label>
              {algumMarcado && !todosMarcados && (
                <span className="text-xs text-muted-foreground">parcial</span>
              )}
            </div>
            <div className="grid gap-2 pl-1">
              {grupo.rows.map((p) => {
                const rowId = `${idPrefix}perm-${p.id}`;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                      selectedSet.has(p.codigo) && 'border-primary bg-primary/5'
                    )}
                  >
                    <Checkbox
                      id={rowId}
                      checked={selectedSet.has(p.codigo)}
                      onCheckedChange={() => toggle(p.codigo)}
                    />
                    <Label htmlFor={rowId} className="flex-1 cursor-pointer font-normal">
                      {getLabelPermissaoGroupedPicker(p.nome, p.codigo, grupo.id, papelCodigo)}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
