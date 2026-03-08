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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FUNCOES_EQUIPE } from '@/lib/funcoes-equipe';
import type { EquipeRow } from '@/lib/equipe';
import type { PapelRow, PermissaoRow } from '@/lib/papeis-permissoes';
import type { SubuserByEquipe } from '@/lib/subusuarios';
import { cn } from '@/lib/utils';
import { UserPlus } from 'lucide-react';

export interface ModalEditarUsuarioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipeRow: EquipeRow | null;
  subuser: SubuserByEquipe | null;
  papeis: PapelRow[];
  permissoes: PermissaoRow[];
  loading?: boolean;
  onSave: (payload: {
    nome: string;
    funcao: string;
    idVendedor?: string | null;
    papelCodigo?: string;
    permissoesCodigos?: string[];
  }) => Promise<void>;
  onNavigateToCadastroAcesso?: (equipeId?: string) => void;
}

export function ModalEditarUsuario({
  open,
  onOpenChange,
  equipeRow,
  subuser,
  papeis,
  permissoes,
  loading = false,
  onSave,
  onNavigateToCadastroAcesso,
}: ModalEditarUsuarioProps) {
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState('');
  const [idVendedor, setIdVendedor] = useState('');
  const [papelCodigo, setPapelCodigo] = useState('');
  const [permissoesLocal, setPermissoesLocal] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !equipeRow) return;
    setNome(equipeRow.nome_completo);
    setFuncao(equipeRow.funcao || '');
    setIdVendedor(equipeRow.id_vendedor ?? '');
    if (subuser) {
      setPapelCodigo(subuser.papel_codigo);
      setPermissoesLocal([...subuser.permissoes_codigos]);
    } else {
      setPapelCodigo('');
      setPermissoesLocal([]);
    }
  }, [open, equipeRow, subuser]);

  const togglePermissao = (codigo: string) => {
    setPermissoesLocal((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  const handleSave = async () => {
    if (!nome.trim() || !funcao) return;
    await onSave({
      nome: nome.trim(),
      funcao,
      idVendedor: idVendedor.trim() || null,
      ...(subuser && {
        papelCodigo,
        permissoesCodigos: permissoesLocal,
      }),
    });
    onOpenChange(false);
  };

  const hasAccess = !!subuser;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            Altere nome, função e, se houver acesso, papel e permissões.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="editar-nome">Nome completo *</Label>
            <Input
              id="editar-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editar-id">ID</Label>
            <Input
              id="editar-id"
              value={idVendedor}
              onChange={(e) => setIdVendedor(e.target.value)}
              placeholder="Código SKY ou outro (opcional)"
            />
          </div>

          <div className="space-y-2">
            <Label>Função *</Label>
            <Select value={funcao} onValueChange={setFuncao}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {FUNCOES_EQUIPE.map((f) => (
                  <SelectItem key={f.codigo} value={f.codigo}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasAccess ? (
            <>
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
                <Label>Permissões</Label>
                <p className="text-sm text-muted-foreground">
                  Selecione o que este usuário pode acessar.
                </p>
                <div className="grid gap-2 rounded-lg border p-3 max-h-48 overflow-y-auto">
                  {permissoes.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        'flex items-center gap-3 rounded-md p-2 transition-colors',
                        permissoesLocal.includes(p.codigo) && 'bg-primary/5'
                      )}
                    >
                      <Checkbox
                        id={`perm-${p.id}`}
                        checked={permissoesLocal.includes(p.codigo)}
                        onCheckedChange={() => togglePermissao(p.codigo)}
                      />
                      <Label
                        htmlFor={`perm-${p.id}`}
                        className="flex-1 cursor-pointer text-sm font-normal"
                      >
                        {p.nome}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">Sem acesso</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Esta pessoa ainda não possui login na plataforma.
              </p>
              {onNavigateToCadastroAcesso && equipeRow && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    onOpenChange(false);
                    onNavigateToCadastroAcesso(equipeRow.id);
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar acesso
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !nome.trim() || !funcao || (hasAccess && !papelCodigo)}
          >
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
