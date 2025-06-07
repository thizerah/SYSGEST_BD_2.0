/**
 * Aba de Indicadores Gerais - Modularizada
 * KPIs e métricas resumidas do dashboard
 */

import React, { useMemo } from 'react';
import { BarChart2, TrendingUp, Target, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MetricCard, ProgressBar } from '@/components/common';
import { FilterControls } from './shared/FilterControls';
import { NoDataMessage } from './shared/NoDataMessage';
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

interface IndicatorsTabProps {
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
    reopeningMetrics: {
      reopenedOrders: number;
      reopeningRate: number;
      averageTimeBetween: number;
      reopeningsByOriginalType: Record<string, {
        reopenings: number;
        totalOriginals: number;
        reopeningRate: number;
      }>;
    };
  };
}

export function IndicatorsTab({ dashboard }: IndicatorsTabProps) {
  // Calcular KPIs principais
  const indicators = useMemo(() => {
    if (!dashboard.showData || !dashboard.filteredServiceOrders.length) {
      return {
        totalOrders: 0,
        goalAttainment: 0,
        reopeningRate: 0,
        averageTime: 0,
        productivity: 0,
        quality: 0,
        efficiency: 0,
        overallScore: 0
      };
    }

    const totalOrders = dashboard.filteredServiceOrders.length;
    const goalAttainment = dashboard.timeMetrics.percentWithinGoal;
    const reopeningRate = dashboard.reopeningMetrics.reopeningRate;
    const averageTime = dashboard.timeMetrics.averageTime;
    
    // KPIs derivados
    const productivity = Math.min(100, (totalOrders / 100) * 100); // Score baseado em volume
    const quality = Math.max(0, 100 - reopeningRate * 2); // Score baseado em reabertura
    const efficiency = goalAttainment; // Score baseado no cumprimento da meta
    
    // Score geral (média ponderada)
    const overallScore = (efficiency * 0.4 + quality * 0.3 + productivity * 0.3);

    return {
      totalOrders,
      goalAttainment,
      reopeningRate,
      averageTime,
      productivity,
      quality,
      efficiency,
      overallScore
    };
  }, [dashboard.showData, dashboard.filteredServiceOrders, dashboard.timeMetrics, dashboard.reopeningMetrics]);

  // Preparar dados dos tipos de serviço mais críticos
  const criticalServices = useMemo(() => {
    return Object.entries(dashboard.timeMetrics.servicesByType || {})
      .map(([type, metrics]) => ({
        type,
        performance: metrics.percentWithinGoal,
        totalOrders: metrics.totalOrders,
        averageTime: metrics.averageTime
      }))
      .sort((a, b) => a.performance - b.performance) // Piores primeiro
      .slice(0, 5);
  }, [dashboard.timeMetrics.servicesByType]);

  return (
    <>
      <FilterControls dashboard={dashboard} activeTab={dashboard.activeTab} />
      
      {!dashboard.showData ? (
        <NoDataMessage />
      ) : (
        <>
          {/* KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Score Geral"
              value={`${indicators.overallScore.toFixed(1)}`}
              subtitle="Pontuação geral de desempenho"
              icon={BarChart2}
              variant={indicators.overallScore > 80 ? "success" : 
                      indicators.overallScore > 60 ? "warning" : "danger"}
              progress={{
                value: indicators.overallScore,
                max: 100,
                showBar: true
              }}
            />
            
            <MetricCard
              title="Eficiência"
              value={`${indicators.efficiency.toFixed(1)}%`}
              subtitle="Cumprimento de metas"
              icon={Target}
              variant={indicators.efficiency > 75 ? "success" : 
                      indicators.efficiency > 50 ? "warning" : "danger"}
              progress={{
                value: indicators.efficiency,
                max: 100,
                showBar: true
              }}
            />
            
            <MetricCard
              title="Qualidade"
              value={`${indicators.quality.toFixed(1)}`}
              subtitle="Score baseado em reaberturas"
              icon={CheckCircle}
              variant={indicators.quality > 80 ? "success" : 
                      indicators.quality > 60 ? "warning" : "danger"}
              progress={{
                value: indicators.quality,
                max: 100,
                showBar: true
              }}
            />
            
            <MetricCard
              title="Produtividade"
              value={`${indicators.productivity.toFixed(1)}`}
              subtitle="Score baseado em volume"
              icon={TrendingUp}
              variant={indicators.productivity > 80 ? "success" : 
                      indicators.productivity > 60 ? "warning" : "danger"}
              progress={{
                value: indicators.productivity,
                max: 100,
                showBar: true
              }}
            />
          </div>

          {/* Métricas Resumidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total de Ordens"
              value={indicators.totalOrders}
              subtitle="Ordens processadas"
              icon={BarChart2}
              variant="info"
            />
            
            <MetricCard
              title="Tempo Médio"
              value={`${indicators.averageTime.toFixed(1)}h`}
              subtitle="Tempo de atendimento"
              icon={Clock}
              variant="default"
            />
            
            <MetricCard
              title="Taxa de Reabertura"
              value={`${indicators.reopeningRate.toFixed(2)}%`}
              subtitle="Percentual de reaberturas"
              icon={AlertCircle}
              variant={indicators.reopeningRate < 5 ? "success" : 
                      indicators.reopeningRate < 10 ? "warning" : "danger"}
            />
            
            <MetricCard
              title="Meta Atingida"
              value={`${indicators.goalAttainment.toFixed(1)}%`}
              subtitle="Dentro do prazo"
              icon={Target}
              variant={indicators.goalAttainment > 75 ? "success" : 
                      indicators.goalAttainment > 50 ? "warning" : "danger"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Serviços Críticos */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <AlertCircle className="mr-2 h-5 w-5" />
                    Serviços com Maior Necessidade de Atenção
                  </div>
                </CardTitle>
                <CardDescription>
                  Tipos de serviço com menor performance de tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {criticalServices.map((service) => (
                    <ProgressBar
                      key={service.type}
                      label={service.type}
                      value={service.performance}
                      max={100}
                      variant={service.performance > 75 ? "success" : 
                              service.performance > 50 ? "warning" : "danger"}
                      showPercentage={true}
                      subtitle={`${service.totalOrders} ordens - ${service.averageTime.toFixed(1)}h média`}
                    />
                  ))}
                  
                  {criticalServices.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      Nenhum dado disponível no período
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Distribuição de Performance por Tipo Original */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Taxa de Reabertura por Tipo Original
                  </div>
                </CardTitle>
                <CardDescription>
                  Performance de qualidade por categoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(dashboard.reopeningMetrics.reopeningsByOriginalType || {})
                    .sort((a, b) => b[1].reopeningRate - a[1].reopeningRate)
                    .slice(0, 5)
                    .map(([type, data]) => {
                      const variant = data.reopeningRate > 15 ? "danger" : 
                                    data.reopeningRate > 8 ? "warning" : "success";
                      
                      return (
                        <ProgressBar
                          key={type}
                          label={type}
                          value={Math.min(data.reopeningRate, 20)}
                          max={20}
                          variant={variant}
                          showPercentage={false}
                          subtitle={`${data.reopeningRate.toFixed(2)}% - ${data.reopenings}/${data.totalOriginals} ordens`}
                        />
                      );
                    })}
                  
                  {Object.keys(dashboard.reopeningMetrics.reopeningsByOriginalType || {}).length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      Nenhum dado de reabertura disponível
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumo de Metas */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <Target className="mr-2 h-5 w-5" />
                  Resumo de Indicadores vs. Metas
                </div>
              </CardTitle>
              <CardDescription>
                Comparação com metas organizacionais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold mb-2">
                    <span className={indicators.efficiency > 75 ? "text-green-600" : 
                                   indicators.efficiency > 50 ? "text-amber-600" : "text-red-600"}>
                      {indicators.efficiency.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Eficiência (Meta: 75%)</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold mb-2">
                    <span className={indicators.reopeningRate < 5 ? "text-green-600" : 
                                   indicators.reopeningRate < 10 ? "text-amber-600" : "text-red-600"}>
                      {indicators.reopeningRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Reabertura (Meta: &lt;5%)</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold mb-2">
                    <span className={indicators.overallScore > 80 ? "text-green-600" : 
                                   indicators.overallScore > 60 ? "text-amber-600" : "text-red-600"}>
                      {indicators.overallScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Score Geral (Meta: 80)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
} 