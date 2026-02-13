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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AcessoCadastrado } from '@/lib/subusuarios';
import type { PapelRow, PermissaoRow } from '@/lib/papeis-permissoes';
import type { EquipeRow } from '@/lib/equipe';
import { getLabelPermissaoRoteiro } from '@/lib/permissoes';
import { cn } from '@/lib/utils';

interface ModalEditarAcessoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acesso: AcessoCadastrado | null;
  papeis: PapelRow[];
  permissoes: PermissaoRow[];
  equipe: EquipeRow[];
  onSave: (papelCodigo: string, equipeId: string | null, permissoesCodigos: string[]) => void | Promise<void>;
  loading?: boolean;
}

export function ModalEditarAcesso({
  open,
  onOpenChange,
  acesso,
  papeis,
  permissoes,
  equipe,
  onSave,
  loading = false,
}: ModalEditarAcessoProps) {
  const [papelCodigo, setPapelCodigo] = useState('');
  const [equipeId, setEquipeId] = useState<string>('__none__');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open && acesso) {
      setPapelCodigo(acesso.papel_codigo);
      setEquipeId(acesso.equipe_id ?? '__none__');
      const codigos = acesso.permissoes_nomes
        .map((nome) => permissoes.find((p) => p.nome === nome)?.codigo)
        .filter((c): c is string => !!c);
      setSelected(codigos);
    }
  }, [open, acesso, permissoes]);

  const toggle = (codigo: string) => {
    setSelected((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  const handleSave = async () => {
    await onSave(
      papelCodigo,
      equipeId && equipeId !== '__none__' ? equipeId : null,
      selected
    );
  };

  if (!acesso) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar acesso</DialogTitle>
          <DialogDescription>
            {acesso.email ?? '—'} — altere papel, vínculo e permissões.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={papelCodigo} onValueChange={setPapelCodigo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o papel" />
              </SelectTrigger>
              <SelectContent>
                {papeis.map((p) => (
                  <SelectItem key={p.id} value={p.codigo}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Vincular à pessoa da equipe</Label>
            <Select value={equipeId} onValueChange={setEquipeId}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {equipe.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome_completo} — {e.funcao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Permissões</Label>
            <div className="grid gap-2 max-h-48 overflow-y-auto rounded-lg border p-3">
              {permissoes.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    'flex items-center gap-3 rounded p-2 transition-colors',
                    selected.includes(p.codigo) && 'bg-primary/5'
                  )}
                >
                  <Checkbox
                    id={`edit-${p.id}`}
                    checked={selected.includes(p.codigo)}
                    onCheckedChange={() => toggle(p.codigo)}
                  />
                  <Label htmlFor={`edit-${p.id}`} className="flex-1 cursor-pointer text-sm font-normal">
                    {getLabelPermissaoRoteiro(p.nome, p.codigo, papelCodigo)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !papelCodigo}>
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
