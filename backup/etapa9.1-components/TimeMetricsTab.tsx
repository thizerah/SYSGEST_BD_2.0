/**
 * Aba de Métricas de Tempo - Modularizada
 * Usa hooks customizados e componentes da Etapa 3
 */

import React from 'react';
import { Clock, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MetricCard, ProgressBar } from '@/components/common';
import { FilterControls } from './shared/FilterControls';
import { NoDataMessage } from './shared/NoDataMessage';
import { ServiceOrderTable } from '../ServiceOrderTable';
import { ServiceOrder } from '@/types';

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

interface TimeMetricsTabProps {
  dashboard: DashboardState & {
    activeTab: string;
    showData: boolean;
    filteredServiceOrders: ServiceOrder[];
    timeMetrics: {
      ordersWithinGoal: number;
      ordersOutsideGoal: number;
      percentWithinGoal: number;
      averageTime: number;
      servicesByType: Record<string, {
        withinGoal: number;
        totalOrders: number;
        percentWithinGoal: number;
        averageTime: number;
      }>;
    };
  };
}

// Função para obter meta por tipo de serviço
function getServiceGoal(serviceType: string): number {
  const goals: Record<string, number> = {
    'Ponto Principal TV': 48,
    'Ponto Principal Fibra': 48,
    'Ponto Principal': 48,
    'Ponto Principal BL': 48,
    'Assistência Técnica Fibra': 24,
    'Assistência Técnica TV': 34,
    'Corretiva': 48,
    'Corretiva BL': 48,
    'Preventiva BL': 48,
    'Prestação de Serviço': 48,
    'Prestação de Serviço BL': 48,
  };
  return goals[serviceType] || 48;
}

export function TimeMetricsTab({ dashboard }: TimeMetricsTabProps) {
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
              title="Total de Ordens"
              value={dashboard.timeMetrics.ordersWithinGoal + dashboard.timeMetrics.ordersOutsideGoal}
              subtitle="Ordens analisadas"
              icon={Clock}
              variant="info"
            />
            
            <MetricCard
              title="Dentro da Meta"
              value={dashboard.timeMetrics.ordersWithinGoal}
              subtitle={`${dashboard.timeMetrics.percentWithinGoal.toFixed(1)}% do total`}
              icon={CheckCircle}
              variant="success"
              progress={{
                value: dashboard.timeMetrics.percentWithinGoal,
                max: 100,
                showBar: true
              }}
            />
            
            <MetricCard
              title="Tempo Médio"
              value={`${dashboard.timeMetrics.averageTime.toFixed(1)}h`}
              subtitle="Tempo de atendimento"
              icon={Clock}
              variant="default"
            />
          </div>

          {/* Desempenho por Tipo de Serviço */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Desempenho por Tempo de Atendimento
                </div>
              </CardTitle>
              <CardDescription>
                Análise do tempo médio de atendimento por tipo de serviço
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(dashboard.timeMetrics.servicesByType).map(([type, metrics]) => {
                  const goalPercent = metrics.percentWithinGoal;
                  const serviceGoal = getServiceGoal(type);
                  
                  // Determinar variante da barra de progresso baseada no desempenho
                  const progressVariant = goalPercent > 80 
                    ? "success" 
                    : goalPercent > 50 
                      ? "warning" 
                      : "danger";
                  
                  return (
                    <div key={type} className="space-y-2">
                      <ProgressBar
                        label={type}
                        value={goalPercent}
                        max={100}
                        variant={progressVariant}
                        showPercentage={true}
                        subtitle={`${metrics.averageTime.toFixed(2)} horas (meta: ${serviceGoal} horas) - ${metrics.withinGoal} de ${metrics.totalOrders} dentro da meta`}
                      />
                    </div>
                  );
                })}
                
                {Object.keys(dashboard.timeMetrics.servicesByType).length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhum dado disponível para análise no período selecionado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Ordens de Serviço */}
          {dashboard.filteredServiceOrders && dashboard.filteredServiceOrders.length > 0 && (
            <ServiceOrderTable filteredOrders={dashboard.filteredServiceOrders} />
          )}
        </>
      )}
    </>
  );
} 