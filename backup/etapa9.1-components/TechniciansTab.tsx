/**
 * Aba de Análise de Técnicos - Modularizada
 * Usa hooks customizados e componentes da Etapa 3
 */

import React, { useMemo } from 'react';
import { Users, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { MetricCard, ProgressBar, MultiProgressBar } from '@/components/common';
import { FilterControls } from './shared/FilterControls';
import { NoDataMessage } from './shared/NoDataMessage';
import useServiceOrdersData from '@/context/useServiceOrdersData';
import { standardizeServiceCategory } from '@/context/DataUtils';
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

interface TechniciansTabProps {
  dashboard: DashboardState & {
    activeTab: string;
    showData: boolean;
    filteredServiceOrders: ServiceOrder[];
    reopeningMetrics: {
      reopenedOrders: number;
      reopeningRate: number;
      reopeningsByTechnician: Record<string, number>;
    };
  };
}

// Função para obter cor baseada na taxa de reabertura por tipo
const getServiceColorByType = (type: string, rate: number) => {
  const rules: Record<string, { green: number; yellow?: number }> = {
    'Ponto Principal TV': { green: 2.00 },
    'Ponto Principal FIBRA': { green: 5.00 },
    'Assistência Técnica TV': { green: 3.50, yellow: 10.50 },
    'Assistência Técnica FIBRA': { green: 8.00, yellow: 16.00 }
  };
  
  const rule = rules[type];
  if (!rule) return "text-gray-600";
  
  if (rate < rule.green) return "text-green-600";
  if (rule.yellow && rate < rule.yellow) return "text-amber-600";
  return "text-red-600";
};

export function TechniciansTab({ dashboard }: TechniciansTabProps) {
  const { technicians, getReopeningPairs } = useServiceOrdersData();
  
  // Preparar dados dos técnicos
  const techniciansData = useMemo(() => {
    if (!dashboard.showData || !dashboard.filteredServiceOrders.length) return [];
    
    const allPairs = getReopeningPairs();
    
    return technicians
      .filter(name => name) // Filtrar nomes vazios
      .map(name => {
        const techOrders = dashboard.filteredServiceOrders.filter(o => o.nome_tecnico === name);
        const totalOrders = techOrders.length;
        
        if (totalOrders === 0) return null;
        
        const reopenings = dashboard.reopeningMetrics.reopeningsByTechnician[name] || 0;
        
        // Contadores por tipo de serviço
        let pontoTVServices = 0, pontoFibraServices = 0;
        let assistTVServices = 0, assistFibraServices = 0;
        let pontoTVReopenings = 0, pontoFibraReopenings = 0;
        let assistTVReopenings = 0, assistFibraReopenings = 0;
        
        // Contar serviços por categoria
        techOrders.forEach(order => {
          const category = standardizeServiceCategory(
            order.subtipo_servico || "",
            order.motivo || ""
          );
          
          if (category.includes("Ponto Principal TV")) pontoTVServices++;
          else if (category.includes("Ponto Principal FIBRA")) pontoFibraServices++;
          else if (category.includes("Assistência Técnica TV")) assistTVServices++;
          else if (category.includes("Assistência Técnica FIBRA")) assistFibraServices++;
        });
        
        // Contar reaberturas por tipo
        const techReopeningPairs = allPairs.filter(
          pair => pair.originalOrder.nome_tecnico === name
        );
        
        techReopeningPairs.forEach(pair => {
          const originalCategory = pair.originalServiceCategory;
          if (originalCategory?.includes("Ponto Principal TV")) pontoTVReopenings++;
          else if (originalCategory?.includes("Ponto Principal FIBRA")) pontoFibraReopenings++;
          else if (originalCategory?.includes("Assistência Técnica TV")) assistTVReopenings++;
          else if (originalCategory?.includes("Assistência Técnica FIBRA")) assistFibraReopenings++;
        });
        
        // Calcular taxas
        const totalServices = pontoTVServices + pontoFibraServices + assistTVServices + assistFibraServices;
        const totalReopeningRate = totalServices > 0 ? (reopenings / totalServices) * 100 : 0;
        
        const pontoTVRate = pontoTVServices > 0 ? (pontoTVReopenings / pontoTVServices) * 100 : 0;
        const pontoFibraRate = pontoFibraServices > 0 ? (pontoFibraReopenings / pontoFibraServices) * 100 : 0;
        const assistTVRate = assistTVServices > 0 ? (assistTVReopenings / assistTVServices) * 100 : 0;
        const assistFibraRate = assistFibraServices > 0 ? (assistFibraReopenings / assistFibraServices) * 100 : 0;
        
        return {
          name,
          totalOrders: totalServices,
          reopenings,
          totalReopeningRate,
          pontoTVServices,
          pontoTVReopenings,
          pontoTVRate,
          pontoFibraServices,
          pontoFibraReopenings,
          pontoFibraRate,
          assistTVServices,
          assistTVReopenings,
          assistTVRate,
          assistFibraServices,
          assistFibraReopenings,
          assistFibraRate
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Primeiro: menor taxa de reabertura
        if (a!.totalReopeningRate !== b!.totalReopeningRate) {
          return a!.totalReopeningRate - b!.totalReopeningRate;
        }
        // Segundo: maior volume de serviços
        return b!.totalOrders - a!.totalOrders;
      });
  }, [dashboard.filteredServiceOrders, dashboard.showData, technicians, dashboard.reopeningMetrics.reopeningsByTechnician, getReopeningPairs]);
  
  // Preparar dados para rankings (top 10 técnicos)
  const topTechniciansData = useMemo(() => {
    return techniciansData
      .slice(0, 10)
      .map(tech => ({
        label: tech!.name,
        value: tech!.totalReopeningRate,
        variant: tech!.totalReopeningRate > 10 ? 'danger' as const : 
                tech!.totalReopeningRate > 5 ? 'warning' as const : 'success' as const
      }));
  }, [techniciansData]);

  return (
    <>
      <FilterControls dashboard={dashboard} activeTab={dashboard.activeTab} />
      
      {!dashboard.showData ? (
        <NoDataMessage />
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total de Técnicos"
              value={techniciansData.length}
              subtitle="Técnicos ativos no período"
              icon={Users}
              variant="info"
            />
            
            <MetricCard
              title="Total de Ordens"
              value={techniciansData.reduce((sum, tech) => sum + tech!.totalOrders, 0)}
              subtitle="Ordens de serviço"
              icon={Clock}
              variant="default"
            />
            
            <MetricCard
              title="Total de Reaberturas"
              value={techniciansData.reduce((sum, tech) => sum + tech!.reopenings, 0)}
              subtitle="Reaberturas registradas"
              icon={AlertTriangle}
              variant="warning"
            />
            
            <MetricCard
              title="Taxa Média"
              value={`${(techniciansData.reduce((sum, tech) => sum + tech!.totalReopeningRate, 0) / techniciansData.length || 0).toFixed(2)}%`}
              subtitle="Taxa média de reabertura"
              icon={TrendingUp}
              variant="default"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Ranking dos Melhores Técnicos */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Top 10 - Menores Taxas
                  </div>
                </CardTitle>
                <CardDescription>
                  Técnicos com menores taxas de reabertura
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topTechniciansData.length > 0 ? (
                  <MultiProgressBar
                    items={topTechniciansData}
                    showValues={true}
                    showPercentages={true}
                    size="sm"
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhum técnico encontrado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribuição por Tipo de Serviço */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Distribuição por Tipo de Serviço
                  </div>
                </CardTitle>
                <CardDescription>
                  Volume de ordens por categoria de serviço
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <ProgressBar
                    label="Ponto Principal TV"
                    value={techniciansData.reduce((sum, tech) => sum + tech!.pontoTVServices, 0)}
                    max={techniciansData.reduce((sum, tech) => sum + tech!.totalOrders, 0)}
                    variant="info"
                    showPercentage={false}
                    subtitle={`${techniciansData.reduce((sum, tech) => sum + tech!.pontoTVServices, 0)} ordens`}
                  />
                  <ProgressBar
                    label="Ponto Principal FIBRA"
                    value={techniciansData.reduce((sum, tech) => sum + tech!.pontoFibraServices, 0)}
                    max={techniciansData.reduce((sum, tech) => sum + tech!.totalOrders, 0)}
                    variant="success"
                    showPercentage={false}
                    subtitle={`${techniciansData.reduce((sum, tech) => sum + tech!.pontoFibraServices, 0)} ordens`}
                  />
                  <ProgressBar
                    label="Assistência Técnica TV"
                    value={techniciansData.reduce((sum, tech) => sum + tech!.assistTVServices, 0)}
                    max={techniciansData.reduce((sum, tech) => sum + tech!.totalOrders, 0)}
                    variant="warning"
                    showPercentage={false}
                    subtitle={`${techniciansData.reduce((sum, tech) => sum + tech!.assistTVServices, 0)} ordens`}
                  />
                  <ProgressBar
                    label="Assistência Técnica FIBRA"
                    value={techniciansData.reduce((sum, tech) => sum + tech!.assistFibraServices, 0)}
                    max={techniciansData.reduce((sum, tech) => sum + tech!.totalOrders, 0)}
                    variant="danger"
                    showPercentage={false}
                    subtitle={`${techniciansData.reduce((sum, tech) => sum + tech!.assistFibraServices, 0)} ordens`}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Detalhada */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Detalhamento por Técnico
                </div>
              </CardTitle>
              <CardDescription>
                Taxa de reabertura por técnico e tipo de serviço
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Técnico</TableHead>
                      <TableHead className="text-center">Total OS</TableHead>
                      <TableHead className="text-center">Reab.</TableHead>
                      <TableHead className="text-center">Taxa %</TableHead>
                      <TableHead className="text-center">Ponto TV %</TableHead>
                      <TableHead className="text-center">Ponto FIBRA %</TableHead>
                      <TableHead className="text-center">Assist. TV %</TableHead>
                      <TableHead className="text-center">Assist. FIBRA %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {techniciansData.map((tech, index) => (
                      <TableRow 
                        key={tech!.name} 
                        className={index % 2 === 0 ? "bg-sky-50" : "bg-white"}
                      >
                        <TableCell className="font-medium">{tech!.name}</TableCell>
                        <TableCell className="text-center">{tech!.totalOrders}</TableCell>
                        <TableCell className="text-center font-bold">{tech!.reopenings}</TableCell>
                        <TableCell className={`text-center font-medium ${
                          tech!.totalReopeningRate < 5 ? "text-green-600" :
                          tech!.totalReopeningRate < 10 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {tech!.totalReopeningRate.toFixed(2)}%
                        </TableCell>
                        <TableCell className={`text-center ${getServiceColorByType('Ponto Principal TV', tech!.pontoTVRate)}`}>
                          {tech!.pontoTVRate.toFixed(2)}%
                        </TableCell>
                        <TableCell className={`text-center ${getServiceColorByType('Ponto Principal FIBRA', tech!.pontoFibraRate)}`}>
                          {tech!.pontoFibraRate.toFixed(2)}%
                        </TableCell>
                        <TableCell className={`text-center ${getServiceColorByType('Assistência Técnica TV', tech!.assistTVRate)}`}>
                          {tech!.assistTVRate.toFixed(2)}%
                        </TableCell>
                        <TableCell className={`text-center ${getServiceColorByType('Assistência Técnica FIBRA', tech!.assistFibraRate)}`}>
                          {tech!.assistFibraRate.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {techniciansData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                          Nenhum técnico encontrado no período selecionado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
} 