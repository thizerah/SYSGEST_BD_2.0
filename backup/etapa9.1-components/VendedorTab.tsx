/**
 * Aba de Análise de Vendedores - Modularizada  
 * Usa hooks customizados e componentes da Etapa 3
 */

import React, { useMemo } from 'react';
import { TrendingUp, Target, Users, DollarSign, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricCard, ProgressBar, MultiProgressBar } from '@/components/common';
import { FilterControls } from './shared/FilterControls';
import { NoDataMessage } from './shared/NoDataMessage';
import useVendasData from '@/context/useVendasData';
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

interface VendedorTabProps {
  dashboard: DashboardState & {
    activeTab: string;
    showData: boolean;
    filteredServiceOrders: ServiceOrder[];
  };
}

export function VendedorTab({ dashboard }: VendedorTabProps) {
  const { vendedores, calculateVendedorMetrics } = useVendasData();
  
  // Calcular métricas dos vendedores
  const vendedorMetrics = useMemo(() => {
    return calculateVendedorMetrics();
  }, [calculateVendedorMetrics]);

  // Preparar dados agregados
  const aggregatedData = useMemo(() => {
    if (vendedorMetrics.length === 0) {
      return {
        totalVendedores: 0,
        totalVendas: 0,
        totalPropostas: 0,
        taxaConversaoMedia: 0,
        totalClientes: 0,
        percentualAdimplenciaGeral: 0
      };
    }

    const totalVendas = vendedorMetrics.reduce((sum, v) => sum + v.total_vendas, 0);
    const totalPropostas = vendedorMetrics.reduce((sum, v) => sum + v.total_propostas, 0);
    const totalAdimplentes = vendedorMetrics.reduce((sum, v) => sum + v.clientes_adimplentes, 0);
    const totalClientes = vendedorMetrics.reduce((sum, v) => 
      sum + v.clientes_adimplentes + v.clientes_inadimplentes + v.clientes_cancelados, 0);

    return {
      totalVendedores: vendedorMetrics.length,
      totalVendas,
      totalPropostas,
      taxaConversaoMedia: totalPropostas > 0 ? (totalVendas / totalPropostas) * 100 : 0,
      totalClientes,
      percentualAdimplenciaGeral: totalClientes > 0 ? (totalAdimplentes / totalClientes) * 100 : 0
    };
  }, [vendedorMetrics]);

  // Top 10 vendedores por conversão
  const topVendedoresByConversion = useMemo(() => {
    return vendedorMetrics
      .filter(v => v.total_propostas >= 5) // Mínimo 5 propostas para aparecer no ranking
      .sort((a, b) => b.taxa_conversao - a.taxa_conversao)
      .slice(0, 10)
      .map(v => ({
        label: v.nome_vendedor || v.id_vendedor,
        value: v.taxa_conversao,
        variant: v.taxa_conversao > 75 ? 'success' as const : 
                v.taxa_conversao > 50 ? 'warning' as const : 'danger' as const
      }));
  }, [vendedorMetrics]);

  // Top 10 vendedores por adimplência
  const topVendedoresByAdimplencia = useMemo(() => {
    return vendedorMetrics
      .filter(v => (v.clientes_adimplentes + v.clientes_inadimplentes + v.clientes_cancelados) >= 3)
      .sort((a, b) => b.percentual_adimplentes - a.percentual_adimplentes)
      .slice(0, 10)
      .map(v => ({
        label: v.nome_vendedor || v.id_vendedor,
        value: v.percentual_adimplentes,
        variant: v.percentual_adimplentes > 80 ? 'success' as const : 
                v.percentual_adimplentes > 60 ? 'warning' as const : 'danger' as const
      }));
  }, [vendedorMetrics]);

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
              title="Total de Vendedores"
              value={aggregatedData.totalVendedores}
              subtitle="Vendedores ativos"
              icon={Users}
              variant="info"
            />
            
            <MetricCard
              title="Total de Vendas"
              value={aggregatedData.totalVendas}
              subtitle={`De ${aggregatedData.totalPropostas} propostas`}
              icon={TrendingUp}
              variant="success"
            />
            
            <MetricCard
              title="Taxa de Conversão"
              value={`${aggregatedData.taxaConversaoMedia.toFixed(1)}%`}
              subtitle="Média geral"
              icon={Target}
              variant={aggregatedData.taxaConversaoMedia > 60 ? "success" : 
                      aggregatedData.taxaConversaoMedia > 40 ? "warning" : "danger"}
              progress={{
                value: aggregatedData.taxaConversaoMedia,
                max: 100,
                showBar: true
              }}
            />
            
            <MetricCard
              title="Adimplência Geral"
              value={`${aggregatedData.percentualAdimplenciaGeral.toFixed(1)}%`}
              subtitle={`${aggregatedData.totalClientes} clientes`}
              icon={CheckCircle}
              variant={aggregatedData.percentualAdimplenciaGeral > 80 ? "success" : 
                      aggregatedData.percentualAdimplenciaGeral > 60 ? "warning" : "danger"}
              progress={{
                value: aggregatedData.percentualAdimplenciaGeral,
                max: 100,
                showBar: true
              }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Ranking por Taxa de Conversão */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <Target className="mr-2 h-5 w-5" />
                    Top 10 - Taxa de Conversão
                  </div>
                </CardTitle>
                <CardDescription>
                  Vendedores com melhor conversão (mín. 5 propostas)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topVendedoresByConversion.length > 0 ? (
                  <MultiProgressBar
                    items={topVendedoresByConversion}
                    showValues={true}
                    showPercentages={true}
                    size="sm"
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhum vendedor com dados suficientes
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ranking por Adimplência */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Top 10 - Adimplência
                  </div>
                </CardTitle>
                <CardDescription>
                  Vendedores com melhor adimplência (mín. 3 clientes)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topVendedoresByAdimplencia.length > 0 ? (
                  <MultiProgressBar
                    items={topVendedoresByAdimplencia}
                    showValues={true}
                    showPercentages={true}
                    size="sm"
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhum vendedor com dados suficientes
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabela Detalhada */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Detalhamento por Vendedor
                </div>
              </CardTitle>
              <CardDescription>
                Performance detalhada de todos os vendedores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-center">Propostas</TableHead>
                      <TableHead className="text-center">Vendas</TableHead>
                      <TableHead className="text-center">Conversão %</TableHead>
                      <TableHead className="text-center">Clientes</TableHead>
                      <TableHead className="text-center">Adimplentes</TableHead>
                      <TableHead className="text-center">Inadimplentes</TableHead>
                      <TableHead className="text-center">Cancelados</TableHead>
                      <TableHead className="text-center">Adimplência %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendedorMetrics
                      .sort((a, b) => b.taxa_conversao - a.taxa_conversao)
                      .map((vendedor, index) => {
                        const totalClientes = vendedor.clientes_adimplentes + 
                                            vendedor.clientes_inadimplentes + 
                                            vendedor.clientes_cancelados;
                        return (
                          <TableRow 
                            key={vendedor.id_vendedor} 
                            className={index % 2 === 0 ? "bg-sky-50" : "bg-white"}
                          >
                            <TableCell className="font-medium">
                              {vendedor.nome_vendedor || vendedor.id_vendedor}
                            </TableCell>
                            <TableCell className="text-center">{vendedor.total_propostas}</TableCell>
                            <TableCell className="text-center font-bold">{vendedor.total_vendas}</TableCell>
                            <TableCell className={`text-center font-medium ${
                              vendedor.taxa_conversao > 75 ? "text-green-600" :
                              vendedor.taxa_conversao > 50 ? "text-amber-600" : "text-red-600"
                            }`}>
                              {vendedor.taxa_conversao.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-center">{totalClientes}</TableCell>
                            <TableCell className="text-center text-green-600 font-medium">
                              {vendedor.clientes_adimplentes}
                            </TableCell>
                            <TableCell className="text-center text-red-600 font-medium">
                              {vendedor.clientes_inadimplentes}
                            </TableCell>
                            <TableCell className="text-center text-gray-600">
                              {vendedor.clientes_cancelados}
                            </TableCell>
                            <TableCell className={`text-center font-medium ${
                              vendedor.percentual_adimplentes > 80 ? "text-green-600" :
                              vendedor.percentual_adimplentes > 60 ? "text-amber-600" : "text-red-600"
                            }`}>
                              {vendedor.percentual_adimplentes.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    
                    {vendedorMetrics.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                          Nenhum vendedor encontrado
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