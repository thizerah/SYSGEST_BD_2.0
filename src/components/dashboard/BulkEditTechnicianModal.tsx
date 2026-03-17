import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2, UserCircle } from 'lucide-react';

interface Technician {
  id: string;
  nome: string;
  sigla: string;
}

interface BulkEditTechnicianModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  technicians: Technician[];
  onConfirm: (technician: Technician) => Promise<void>;
}

export function BulkEditTechnicianModal({
  open,
  onOpenChange,
  selectedCount,
  technicians,
  onConfirm,
}: BulkEditTechnicianModalProps) {
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selectedTech || technicians.length === 0) return;
    const tech = technicians.find(t => t.nome === selectedTech);
    if (!tech) return;

    setSaving(true);
    try {
      await onConfirm(tech);
      setSelectedTech('');
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !saving) {
      setSelectedTech('');
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-blue-600" />
            Alterar técnico em lote
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Você selecionou <strong>{selectedCount}</strong> ordem(ns) de serviço. Selecione o novo técnico para aplicar a todas.
          </p>

          <div className="space-y-2">
            <Label htmlFor="bulk-tecnico" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-blue-600" />
              Técnico *
            </Label>
            <Select
              value={selectedTech}
              onValueChange={setSelectedTech}
            >
              <SelectTrigger id="bulk-tecnico" className="w-full">
                <SelectValue placeholder="Selecione o técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => (
                  <SelectItem key={tech.nome} value={tech.nome}>
                    {tech.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || !selectedTech}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aplicando...
              </>
            ) : (
              `Aplicar a ${selectedCount} OS`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
