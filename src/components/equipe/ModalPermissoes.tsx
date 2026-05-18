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
import type { PermissaoRow } from '@/lib/papeis-permissoes';
import { PermissoesGroupedPicker } from './PermissoesGroupedPicker';

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

  const handleConfirm = async () => {
    await onConfirm(local);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissões de acesso</DialogTitle>
          <DialogDescription>
            Selecione o que este usuário poderá acessar na plataforma, organizado por módulo.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <PermissoesGroupedPicker
            permissoes={permissoes}
            value={local}
            onChange={setLocal}
            papelCodigo={papelCodigo}
            idPrefix="criar-acesso-"
          />
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
