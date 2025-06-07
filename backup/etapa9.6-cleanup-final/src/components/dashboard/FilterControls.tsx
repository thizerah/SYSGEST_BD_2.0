/**
 * FilterControls - Componente centralizado para controles de filtro
 * Etapa 9.4: Extraído do MetricsOverview para melhor modularidade
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, X } from 'lucide-react';
import { MONTH_NAMES } from '@/constants/serviceTypes';

interface FilterControlsProps {
  // Estados de filtro
  selectedMonth: string | null;
  selectedYear: string | null;
  showData: boolean;
  isFiltering: boolean;
  
  // Dados disponíveis
  availableYears: string[];
  availableMonths: string[];
  
  // Callbacks
  setSelectedMonth: (month: string | null) => void;
  setSelectedYear: (year: string | null) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  
  // Configurações opcionais
  showApplyButton?: boolean;
  disabled?: boolean;
}

export const FilterControls: React.FC<FilterControlsProps> = React.memo(({
  selectedMonth,
  selectedYear,
  showData,
  isFiltering,
  availableYears,
  availableMonths,
  setSelectedMonth,
  setSelectedYear,
  onApplyFilters,
  onClearFilters,
  showApplyButton = true,
  disabled = false
}) => {
  // Função para obter o nome do mês a partir do número
  const getMonthName = (monthNumber: string): string => {
    return MONTH_NAMES[parseInt(monthNumber, 10) - 1];
  };

  // Estado interno para controlar se os filtros mudaram
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);

  // Detectar mudanças nos filtros
  useEffect(() => {
    if (showApplyButton) {
      setHasUnappliedChanges(!!selectedMonth || !!selectedYear);
    }
  }, [selectedMonth, selectedYear, showApplyButton]);

  return (
    <Card className="w-full mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Filtros de Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-end">
          {/* Seletor de Ano */}
          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm font-medium mb-2">Ano</label>
            <Select 
              value={selectedYear || ""} 
              onValueChange={(value) => setSelectedYear(value || null)}
              disabled={disabled || isFiltering}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seletor de Mês */}
          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm font-medium mb-2">Mês</label>
            <Select 
              value={selectedMonth || ""} 
              onValueChange={(value) => setSelectedMonth(value || null)}
              disabled={disabled || isFiltering || !selectedYear}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar mês" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {getMonthName(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2">
            {showApplyButton && (
              <Button 
                onClick={onApplyFilters}
                disabled={disabled || isFiltering || !hasUnappliedChanges}
                className="min-w-[100px]"
              >
                {isFiltering ? "Aplicando..." : "Aplicar"}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={onClearFilters}
              disabled={disabled || isFiltering || (!showData && !hasUnappliedChanges)}
              className="min-w-[100px]"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>

        {/* Indicador de Status */}
        {showData && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              <strong>Filtro ativo:</strong> {getMonthName(selectedMonth!)} de {selectedYear}
            </p>
          </div>
        )}

        {isFiltering && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              Aplicando filtros...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

FilterControls.displayName = 'FilterControls'; 