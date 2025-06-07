/**
 * Componente de controles de filtro compartilhado
 * Usa os hooks customizados para gerenciar filtros de data
 */

import React from 'react';
import { Filter } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface DashboardState {
  selectedMonth: string | null;
  selectedYear: string | null;
  isFiltering: boolean;
  availableMonths: string[];
  availableYears: string[];
  setSelectedMonth: (month: string | null) => void;
  setSelectedYear: (year: string | null) => void;
  handleApplyFilters: () => void;
  handleClearFilters: () => void;
}

interface FilterControlsProps {
  dashboard: DashboardState;
  activeTab: string;
}

// Função para obter o nome do mês a partir do número
const getMonthName = (monthNumber: string): string => {
  const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return MONTH_NAMES[parseInt(monthNumber, 10) - 1];
};

export function FilterControls({ dashboard, activeTab }: FilterControlsProps) {
  // Função para obter a descrição baseada na aba ativa
  const getFilterDescription = () => {
    switch (activeTab) {
      case "reopening":
        return "Selecione o mês e ano para visualizar reaberturas criadas no período";
      case "time":
        return "Selecione o mês e ano para visualizar os dados (Data de Finalização)";
      default:
        return "Selecione o mês e ano para visualizar os dados (Data de Criação ou Finalização)";
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          <div className="flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filtrar por Período
          </div>
        </CardTitle>
        <CardDescription>
          {getFilterDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="month-select">Mês</Label>
            <Select 
              value={dashboard.selectedMonth || ""} 
              onValueChange={(value) => dashboard.setSelectedMonth(value || null)}
              disabled={dashboard.isFiltering}
            >
              <SelectTrigger id="month-select">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {dashboard.availableMonths.map((month: string) => (
                  <SelectItem key={month} value={month}>
                    {getMonthName(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <Label htmlFor="year-select">Ano</Label>
            <Select 
              value={dashboard.selectedYear || ""} 
              onValueChange={(value) => dashboard.setSelectedYear(value || null)}
              disabled={dashboard.isFiltering}
            >
              <SelectTrigger id="year-select">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                {dashboard.availableYears.map((year: string) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 flex flex-col justify-end">
            <div className="flex gap-2">
              <Button 
                onClick={dashboard.handleApplyFilters}
                disabled={!dashboard.selectedMonth || !dashboard.selectedYear || dashboard.isFiltering}
                className="flex-1"
              >
                {dashboard.isFiltering ? "Carregando..." : "Aplicar"}
              </Button>
              <Button 
                variant="outline" 
                onClick={dashboard.handleClearFilters}
                disabled={dashboard.isFiltering}
              >
                Limpar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 