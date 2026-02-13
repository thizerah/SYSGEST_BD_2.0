import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { PermissaoRow } from '@/lib/papeis-permissoes';
import { getLabelPermissaoRoteiro } from '@/lib/permissoes';
import { cn } from '@/lib/utils';

interface ModalPermissoesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissoes: PermissaoRow[];
  selected: string[];
  /** Código do papel selecionado (ex.: "tecnico") para dica contextual em Rota do Dia e Rotas. */
  papelCodigo?: string;
  onConfirm: (codigos: string[]) => void | Promise<void>;
  loading?: boolean;
}

export function ModalPermissoes({
  open,
  onOpenChange,
  permissoes,
  selected,
  papelCodigo = '',
  onConfirm,
  loading = false,
}: ModalPermissoesProps) {
  const [local, setLocal] = useState<string[]>([]);

  useEffect(() => {
    if (open) setLocal([...selected]);
  }, [open, selected]);

  const toggle = (codigo: string) => {
    setLocal((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  const handleConfirm = async () => {
    await onConfirm(local);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Permissões de acesso</DialogTitle>
          <DialogDescription>
            Selecione o que este usuário poderá acessar na plataforma.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {permissoes.map((p) => (
            <div
              key={p.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                local.includes(p.codigo) && 'border-primary bg-primary/5'
              )}
            >
              <Checkbox
                id={p.id}
                checked={local.includes(p.codigo)}
                onCheckedChange={() => toggle(p.codigo)}
              />
              <Label htmlFor={p.id} className="flex-1 cursor-pointer font-normal">
                {getLabelPermissaoRoteiro(p.nome, p.codigo, papelCodigo)}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Salvando…' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
