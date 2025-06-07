/**
 * Aba de Métricas de Reabertura - Modularizada
 * Usa hooks customizados e componentes da Etapa 3
 */

import React from 'react';
import { Repeat, AlertCircle, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MetricCard, ProgressBar, MultiProgressBar } from '@/components/common';
import { FilterControls } from './shared/FilterControls';
import { NoDataMessage } from './shared/NoDataMessage';

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
      <FilterControls dashboard={dashboard} activeTab={dashboard.activeTab} />
      
      {!dashboard.showData ? (
        <NoDataMessage />
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <MetricCard
              title="Total de Reaberturas"
              value={dashboard.reopeningMetrics.reopenedOrders}
              subtitle="Ordens reabertas no período"
              icon={Repeat}
              variant="warning"
            />
            
            <MetricCard
              title="Taxa de Reabertura"
              value={`${dashboard.reopeningMetrics.reopeningRate.toFixed(2)}%`}
              subtitle="Percentual de reaberturas"
              icon={AlertCircle}
              variant={dashboard.reopeningMetrics.reopeningRate > 10 ? "danger" : 
                      dashboard.reopeningMetrics.reopeningRate > 5 ? "warning" : "success"}
              progress={{
                value: Math.min(dashboard.reopeningMetrics.reopeningRate, 20),
                max: 20,
                showBar: true
              }}
            />
            
            <MetricCard
              title="Tempo Médio Entre OS"
              value={`${dashboard.reopeningMetrics.averageTimeBetween.toFixed(1)}h`}
              subtitle="Tempo até reabertura"
              icon={TrendingDown}
              variant="info"
            />
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
                  <MultiProgressBar
                    items={techniciansData}
                    showValues={true}
                    showPercentages={false}
                    size="md"
                  />
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
                  <MultiProgressBar
                    items={citiesData}
                    showValues={true}
                    showPercentages={false}
                    size="md"
                  />
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
                      <ProgressBar
                        key={type}
                        label={type}
                        value={data.reopeningRate}
                        max={20}
                        variant={variant}
                        showPercentage={true}
                        subtitle={`${data.reopenings} reaberturas de ${data.totalOriginals} serviços originais`}
                      />
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