import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { ChevronsUpDown } from 'lucide-react';
import type { Material } from '@/types/estoque';

type Props = {
  materiais: Material[];
  value: string;
  onValueChange: (materialId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function MaterialCombobox({
  materiais,
  value,
  onValueChange,
  placeholder = 'Buscar por código ou nome…',
  disabled,
  className,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const selecionado = materiais.find((m) => m.id === value) ?? null;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', className)}
        >
          <span className="truncate text-left">
            {selecionado ? `${selecionado.codigo_material} — ${selecionado.descricao}` : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Digite código ou descrição…" />
          <CommandList>
            <CommandEmpty>Nenhum material encontrado.</CommandEmpty>
            <CommandGroup>
              {materiais.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`${m.codigo_material} ${m.descricao}`}
                  onSelect={() => {
                    onValueChange(m.id);
                    setAberto(false);
                  }}
                >
                  <span className="truncate">
                    <span className="font-medium tabular-nums">{m.codigo_material}</span>
                    <span className="text-muted-foreground"> — </span>
                    {m.descricao}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
