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
import { PermissoesGroupedPicker } from './PermissoesGroupedPicker';

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
            <p className="text-sm text-muted-foreground">
              Organizado por módulo. Use o grupo para marcar ou desmarcar tudo da seção.
            </p>
            <div className="max-h-[min(52vh,420px)] overflow-y-auto rounded-lg border p-3">
              <PermissoesGroupedPicker
                permissoes={permissoes}
                value={selected}
                onChange={setSelected}
                papelCodigo={papelCodigo}
                idPrefix="editar-acesso-"
              />
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
