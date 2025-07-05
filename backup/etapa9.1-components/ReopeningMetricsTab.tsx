/**
 * Aba de Métricas de Reabertura - Modularizada
 * Usa hooks customizados e componentes da Etapa 3
 */

import React from 'react';
import { Repeat, AlertCircle, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../src/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../src/components/ui/select";
import { Label } from "../../src/components/ui/label";
// import { MetricCard, ProgressBar, MultiProgressBar } from '../../src/components/common'; // Componentes não existem no projeto principal
// import { FilterControls } from './shared/FilterControls'; // Componente não existe na estrutura etapa9.1
// import { NoDataMessage } from './shared/NoDataMessage'; // Componente não existe na estrutura etapa9.1

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

interface ReopeningMetricsTabProps {
  dashboard: DashboardState & {
    activeTab: string;
    showData: boolean;
    originalServiceTypeFilter: string;
    setOriginalServiceTypeFilter: (filter: string) => void;
    uniqueOriginalServiceTypes: string[];
    reopeningMetrics: {
      reopenedOrders: number;
      reopeningRate: number;
      averageTimeBetween: number;
      reopeningsByTechnician: Record<string, number>;
      reopeningsByOriginalType: Record<string, {
        reopenings: number;
        totalOriginals: number;
        reopeningRate: number;
      }>;
      reopeningsByCity: Record<string, number>;
      reopeningsByReason: Record<string, {
        byOriginalType: Record<string, number>;
        total: number;
      }>;
    };
  };
}

export function ReopeningMetricsTab({ dashboard }: ReopeningMetricsTabProps) {
  // Preparar dados para as barras de progresso dos técnicos
  const techniciansData = Object.entries(dashboard.reopeningMetrics.reopeningsByTechnician)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([technician, count]) => ({
      label: technician,
      value: count,
      variant: 'warning' as const
    }));

  // Preparar dados para as cidades
  const citiesData = Object.entries(dashboard.reopeningMetrics.reopeningsByCity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([city, count]) => ({
      label: city,
      value: count,
      variant: 'danger' as const
    }));

  return (
    <>
      {/* <FilterControls dashboard={dashboard} activeTab={dashboard.activeTab} /> */}
      
      {!dashboard.showData ? (
        <div className="text-center text-muted-foreground py-8">
          Nenhum dado disponível para exibir
        </div>
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total de Reaberturas</CardTitle>
                <CardDescription>{dashboard.reopeningMetrics.reopenedOrders}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Ordens reabertas no período</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Taxa de Reabertura</CardTitle>
                <CardDescription>{dashboard.reopeningMetrics.reopeningRate.toFixed(2)}%</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Percentual de reaberturas</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Tempo Médio Entre OS</CardTitle>
                <CardDescription>{dashboard.reopeningMetrics.averageTimeBetween.toFixed(1)}h</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Tempo até reabertura</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtro de Tipo de Serviço Original */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Filtro Adicional</CardTitle>
              <CardDescription>
                Filtre as reaberturas por tipo de serviço original
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="service-type-filter">Tipo de Serviço Original</Label>
                  <Select 
                    value={dashboard.originalServiceTypeFilter || ""} 
                    onValueChange={(value) => dashboard.setOriginalServiceTypeFilter(value || "")}
                  >
                    <SelectTrigger id="service-type-filter">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os tipos</SelectItem>
                      {dashboard.uniqueOriginalServiceTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reaberturas por Técnico */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <Repeat className="mr-2 h-5 w-5" />
                    Top 10 Técnicos com Reaberturas
                  </div>
                </CardTitle>
                <CardDescription>
                  Técnicos com maior número de reaberturas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {techniciansData.length > 0 ? (
                  <div className="space-y-3">
                    {techniciansData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="text-sm text-muted-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhuma reabertura encontrada no período
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reaberturas por Cidade */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <AlertCircle className="mr-2 h-5 w-5" />
                    Top 5 Cidades com Reaberturas
                  </div>
                </CardTitle>
                <CardDescription>
                  Distribuição de reaberturas por localização
                </CardDescription>
              </CardHeader>
              <CardContent>
                {citiesData.length > 0 ? (
                  <div className="space-y-3">
                    {citiesData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="text-sm text-muted-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhuma reabertura encontrada no período
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Reaberturas por Tipo Original */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <TrendingDown className="mr-2 h-5 w-5" />
                  Taxa de Reabertura por Tipo de Serviço Original
                </div>
              </CardTitle>
              <CardDescription>
                Análise de reaberturas por tipo de serviço original
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(dashboard.reopeningMetrics.reopeningsByOriginalType)
                  .sort((a, b) => b[1].reopeningRate - a[1].reopeningRate)
                  .map(([type, data]) => {
                    const variant = data.reopeningRate > 15 
                      ? "danger" 
                      : data.reopeningRate > 8 
                        ? "warning" 
                        : "success";
                    
                    return (
                      <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{type}</div>
                          <div className="text-xs text-muted-foreground">
                            {data.reopenings} reaberturas de {data.totalOriginals} serviços originais
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">{data.reopeningRate.toFixed(2)}%</div>
                        </div>
                      </div>
                    );
                  })}
                
                {Object.keys(dashboard.reopeningMetrics.reopeningsByOriginalType).length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhum dado de reabertura disponível no período selecionado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
} 