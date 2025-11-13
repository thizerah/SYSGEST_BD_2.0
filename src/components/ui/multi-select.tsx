import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Option = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Selecionar itens...",
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Garantir que options e selected são arrays válidos
  const safeOptions = Array.isArray(options) ? options : [];
  const safeSelected = Array.isArray(selected) ? selected : [];

  const handleUnselect = (item: string) => {
    onChange(safeSelected.filter((i) => i !== item));
  };

  const toggleItem = (value: string) => {
    if (safeSelected.includes(value)) {
      onChange(safeSelected.filter((item) => item !== value));
    } else {
      onChange([...safeSelected, value]);
    }
  };

  // Fechar quando clicar fora do componente
  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full", className)}
    >
      {/* Botão de seleção */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-10 w-full flex-wrap items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-accent/50 transition-colors"
      >
        {safeSelected.length > 0 ? (
          <div className="flex flex-wrap gap-1 mr-1">
            {safeSelected.map((item) => {
              const option = safeOptions.find((o) => o.value === item);
              return (
                <Badge key={item} variant="secondary" className="flex items-center gap-1">
                  {option?.label || item}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnselect(item);
                    }}
                  />
                </Badge>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground">{placeholder}</div>
        )}
      </div>

      {/* Dropdown de opções */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {safeOptions.length === 0 ? (
            <div className="px-2 py-2 text-sm text-center text-muted-foreground">
              Nenhuma opção disponível
            </div>
          ) : (
            <>
              {safeOptions.map((option) => {
                const isSelected = safeSelected.includes(option.value);
                return (
                  <div
                    key={option.value}
                    className={cn(
                      "px-2 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent/50"
                    )}
                    onClick={() => toggleItem(option.value)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 h-4 w-4 border rounded-sm flex items-center justify-center">
                        {isSelected && <X className="h-3 w-3" />}
                      </div>
                      <span>{option.label}</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
} 