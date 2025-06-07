/**
 * Componente reutilizável para controles de filtro
 * Usado para criar interfaces de filtro consistentes em diferentes páginas
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { MONTH_NAMES } from '@/constants/serviceTypes';
import { useFilters } from '@/hooks/useFilters';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterFieldProps {
  type: 'select' | 'text' | 'number' | 'month-year';
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options?: FilterOption[];
  placeholder?: string;
  className?: string;
}

function FilterField({ 
  type, 
  label, 
  value, 
  onChange, 
  options, 
  placeholder,
  className 
}: FilterFieldProps) {
  if (type === 'select') {
    return (
      <div className={cn("flex flex-col space-y-1", className)}>
        <Label className="text-xs font-medium">{label}</Label>
        <Select 
          value={String(value)} 
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={placeholder || `Selecionar ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === 'month-year') {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const [selectedMonth, selectedYear] = String(value).split('-');

    return (
      <div className={cn("flex space-x-2", className)}>
        <div className="flex-1">
          <Label className="text-xs font-medium">Mês</Label>
          <Select 
            value={selectedMonth || ''} 
            onValueChange={(month) => onChange(`${month}-${selectedYear || currentYear}`)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((month, index) => (
                <SelectItem key={index + 1} value={String(index + 1)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="text-xs font-medium">Ano</Label>
          <Select 
            value={selectedYear || ''} 
            onValueChange={(year) => onChange(`${selectedMonth || 1}-${year}`)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      <Label className="text-xs font-medium">{label}</Label>
      <Input
        type={type}
        value={String(value)}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="h-8 text-xs"
      />
    </div>
  );
}

interface FilterCardProps {
  title?: string;
  description?: string;
  fields: FilterFieldProps[];
  onApply?: () => void;
  onClear?: () => void;
  className?: string;
  compact?: boolean;
  loading?: boolean;
}

export function FilterCard({
  title = "Filtros",
  description,
  fields,
  onApply,
  onClear,
  className,
  compact = false,
  loading = false
}: FilterCardProps) {
  return (
    <Card className={cn("mb-4", className)}>
      <CardHeader className={compact ? "pb-2 py-3" : "pb-3"}>
        <CardTitle className={cn(
          compact ? "text-sm" : "text-base",
          "font-medium flex items-center"
        )}>
          <Filter className={cn("mr-2", compact ? "h-3 w-3" : "h-4 w-4")} />
          {title}
        </CardTitle>
        {description && (
          <CardDescription className={compact ? "text-xs" : undefined}>
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={compact ? "py-2" : undefined}>
        <div className={cn(
          "grid gap-3",
          fields.length <= 2 ? "grid-cols-1 md:grid-cols-2" :
          fields.length <= 3 ? "grid-cols-1 md:grid-cols-3" :
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        )}>
          {fields.map((field, index) => (
            <FilterField key={index} {...field} />
          ))}
        </div>
        
        {(onApply || onClear) && (
          <div className="flex space-x-2 mt-4">
            {onApply && (
              <Button 
                onClick={onApply}
                size="sm"
                className="h-8 text-xs bg-sysgest-blue hover:bg-sysgest-teal"
                disabled={loading}
              >
                Aplicar Filtros
              </Button>
            )}
            {onClear && (
              <Button 
                onClick={onClear}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={loading}
              >
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 