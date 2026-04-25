import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import type { Material } from '@/types/estoque';
import type { ChaveEntradaSerial } from '@/lib/estoque';
import { randomClientId, cn } from '@/lib/utils';
import { ImportacaoSeriais } from './ImportacaoSeriais';
import { MaterialCombobox } from './MaterialCombobox';

export interface LinhaEntrada {
  id: string;
  material_id: string;
  quantidade: string;
  seriais: string[];
  inputsSerial: string[];
}

export function novaLinhaEntrada(): LinhaEntrada {
  return {
    id: randomClientId(),
    material_id: '',
    quantidade: '',
    seriais: [],
    inputsSerial: [''],
  };
}

type Props = {
  linha: LinhaEntrada;
  index: number;
  materiais: Material[];
  donoUserId: string | null;
  chaveEntrada: ChaveEntradaSerial;
  removivel: boolean;
  onRemove: () => void;
  onMaterialChange: (materialId: string) => void;
  onQuantidadeChange: (valor: string) => void;
  onSeriaisImportados: (seriais: string[]) => void;
  onSerialInput: (idx: number, value: string) => void;
  onSerialKeyDown: (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAddSerialBlank: () => void;
  onRemoveSerial: (idx: number) => void;
  setSerialRef: (idx: number, el: HTMLInputElement | null) => void;
  /** Mais de um item na entrada: destaca linhas de material por quantidade (não serial). */
  multiplosItens: boolean;
};

export function EntradaMaterialLinha({
  linha,
  index,
  materiais,
  donoUserId,
  chaveEntrada,
  removivel,
  onRemove,
  onMaterialChange,
  onQuantidadeChange,
  onSeriaisImportados,
  onSerialInput,
  onSerialKeyDown,
  onAddSerialBlank,
  onRemoveSerial,
  setSerialRef,
  multiplosItens,
}: Props) {
  const mat = materiais.find((m) => m.id === linha.material_id) ?? null;
  const serializado = mat?.serializado ?? false;

  const cardClass = cn(
    'rounded-lg border p-4 space-y-3 shadow-sm',
    !multiplosItens && 'bg-card',
    multiplosItens &&
      mat?.serializado &&
      'bg-slate-50/95 border-slate-300/90 ring-1 ring-slate-200/60',
    multiplosItens &&
      mat &&
      !mat.serializado &&
      (index % 2 === 0
        ? 'bg-sky-50/95 border-sky-200/90 ring-1 ring-sky-100/80'
        : 'bg-teal-50/90 border-teal-200/90 ring-1 ring-teal-100/70'),
    multiplosItens && !mat && 'bg-muted/30 border-muted-foreground/20'
  );

  return (
    <div className={cn(cardClass, 'min-w-0')}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground shrink-0 pt-2">Item {index + 1}</span>
        {removivel && (
          <Button type="button" variant="ghost" size="sm" className="text-destructive shrink-0" onClick={onRemove}>
            <X className="h-4 w-4 mr-1" />
            Remover
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Material</Label>
        <MaterialCombobox
          materiais={materiais}
          value={linha.material_id}
          onValueChange={onMaterialChange}
          placeholder="Buscar por código ou nome…"
        />
      </div>

      {linha.material_id && !serializado && (
        <div className="space-y-1.5 w-full min-w-0">
          <Label className="text-xs">Quantidade *</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              className="min-w-0 w-full max-w-[180px] sm:max-w-none sm:flex-1 sm:min-w-[120px]"
              placeholder=""
              value={linha.quantidade === '' ? '' : linha.quantidade}
              onChange={(e) => onQuantidadeChange(e.target.value)}
            />
            {mat?.unidade_medida ? (
              <span
                className="inline-flex items-center rounded-md border border-border bg-muted/60 px-3 py-2 text-sm font-medium tabular-nums"
                title="UMB"
              >
                {mat.unidade_medida}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {linha.material_id && serializado && (
        <div className="space-y-3">
          <Label className="text-xs">Seriais *</Label>
          <p className="text-xs text-muted-foreground">Enter no campo preenchido abre o próximo.</p>
          <div className="space-y-2">
            {linha.inputsSerial.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-6 text-right shrink-0">{idx + 1}</span>
                <Input
                  ref={(el) => setSerialRef(idx, el)}
                  className="font-mono"
                  placeholder="Número do serial / IRD"
                  value={val}
                  onChange={(e) => onSerialInput(idx, e.target.value)}
                  onKeyDown={(e) => onSerialKeyDown(idx, e)}
                />
                {linha.inputsSerial.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveSerial(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={onAddSerialBlank}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar serial
            </Button>
          </div>
          {donoUserId && (
            <div className="pt-1">
              <p className="text-xs text-muted-foreground mb-1.5">Importar lista (esta linha):</p>
              <ImportacaoSeriais
                donoUserId={donoUserId}
                chaveEntrada={chaveEntrada}
                seriais={linha.seriais}
                onChange={onSeriaisImportados}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
