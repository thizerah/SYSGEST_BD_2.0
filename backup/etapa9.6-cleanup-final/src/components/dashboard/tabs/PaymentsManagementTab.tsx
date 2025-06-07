/**
 * Aba de Gerenciamento de Pagamentos - Modularizada
 * Análise de pagamentos e performance financeira
 */

import React, { useMemo } from 'react';
import { CreditCard, TrendingUp, AlertTriangle, DollarSign, Calendar, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricCard, ProgressBar, MultiProgressBar } from '@/components/common';
import { FilterControls } from './shared/FilterControls';
import { NoDataMessage } from './shared/NoDataMessage';
import usePagamentosData from '@/context/usePagamentosData';
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

interface PaymentsManagementTabProps {
  dashboard: DashboardState & {
    activeTab: string;
    showData: boolean;
    filteredServiceOrders: ServiceOrder[];
  };
}

// Função para calcular diferença em dias
const calcularDiasEntreDatas = (dataInicio: string, dataFim: string): number => {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const diffTime = fim.getTime() - inicio.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export function PaymentsManagementTab({ dashboard }: PaymentsManagementTabProps) {
  const { primeirosPagamentos, vendas, calculatePermanenciaMetrics } = usePagamentosData();
  
  // Calcular métricas de cobrança
  const paymentMetrics = useMemo(() => {
    if (primeirosPagamentos.length === 0) {
      return {
        totalPropostas: 0,
        totalCobrancas: 0,
        taxaCobranca: 0,
        tempoMedioCobranca: 0,
        cobrancasPorStatus: {},
        cobrancasRecentes: []
      };
    }

    // Mapear vendas por proposta para obter dados adicionais
    const vendasMap = new Map(vendas.map(v => [v.numero_proposta, v]));
    
    // Filtrar cobranças válidas
    const cobrancasValidas = primeirosPagamentos.filter(p => 
      p.proposta && p.data_passo_cobranca
    );

    // Calcular tempo médio até primeira cobrança
    const temposAteCobranca = cobrancasValidas
      .map(p => {
        const venda = vendasMap.get(p.proposta);
        if (venda?.data_habilitacao) {
          return calcularDiasEntreDatas(venda.data_habilitacao, p.data_passo_cobranca);
        }
        return 0;
      })
      .filter(tempo => tempo > 0);

    const tempoMedioCobranca = temposAteCobranca.length > 0 
      ? temposAteCobranca.reduce((sum, t) => sum + t, 0) / temposAteCobranca.length 
      : 0;

    // Contagem por status
    const cobrancasPorStatus = cobrancasValidas.reduce((acc, p) => {
      const status = p.status_pacote || 'Não informado';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Cobranças recentes (últimos 30 dias)
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);
    
    const cobrancasRecentes = cobrancasValidas.filter(p => {
      const dataCobranca = new Date(p.data_passo_cobranca);
      return dataCobranca >= dataLimite;
    });

    return {
      totalPropostas: vendas.length,
      totalCobrancas: cobrancasValidas.length,
      taxaCobranca: vendas.length > 0 ? (cobrancasValidas.length / vendas.length) * 100 : 0,
      tempoMedioCobranca,
      cobrancasPorStatus,
      cobrancasRecentes
    };
  }, [primeirosPagamentos, vendas]);

  // Ranking de passos de cobrança
  const topPassos = useMemo(() => {
    const passoCount = primeirosPagamentos.reduce((acc, p) => {
      const passo = p.passo || 'Não informado';
      acc[passo] = (acc[passo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(passoCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([passo, count]) => ({
        label: passo,
        value: count,
        variant: passo.toLowerCase().includes('pago') ? 'success' as const : 
                passo.toLowerCase().includes('pendente') ? 'warning' as const : 'danger' as const
      }));
  }, [primeirosPagamentos]);

  // Análise por status de pacote
  const statusPacote = useMemo(() => {
    return Object.entries(paymentMetrics.cobrancasPorStatus)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([status, count]) => ({
        label: status,
        value: count,
        variant: status.toLowerCase().includes('ativo') ? 'success' as const :
                status.toLowerCase().includes('pendente') ? 'warning' as const : 'danger' as const
      }));
  }, [paymentMetrics.cobrancasPorStatus]);

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
              title="Total de Cobranças"
              value={paymentMetrics.totalCobrancas}
              subtitle={`De ${paymentMetrics.totalPropostas} propostas`}
              icon={CreditCard}
              variant="info"
            />
            
            <MetricCard
              title="Taxa de Cobrança"
              value={`${paymentMetrics.taxaCobranca.toFixed(1)}%`}
              subtitle="Propostas com cobrança"
              icon={TrendingUp}
              variant={paymentMetrics.taxaCobranca > 70 ? "success" : 
                      paymentMetrics.taxaCobranca > 50 ? "warning" : "danger"}
              progress={{
                value: paymentMetrics.taxaCobranca,
                max: 100,
                showBar: true
              }}
            />
            
            <MetricCard
              title="Tempo Médio"
              value={`${paymentMetrics.tempoMedioCobranca.toFixed(0)} dias`}
              subtitle="Até primeira cobrança"
              icon={Calendar}
              variant={paymentMetrics.tempoMedioCobranca < 30 ? "success" : 
                      paymentMetrics.tempoMedioCobranca < 60 ? "warning" : "danger"}
            />
            
            <MetricCard
              title="Cobranças Recentes"
              value={paymentMetrics.cobrancasRecentes.length}
              subtitle="Últimos 30 dias"
              icon={DollarSign}
              variant="default"
            />
          </div>

          {/* Cards de Análise Adicional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <MetricCard
              title="Status Diferentes"
              value={Object.keys(paymentMetrics.cobrancasPorStatus).length}
              subtitle="Categorias de status"
              icon={AlertTriangle}
              variant="warning"
            />
            
            <MetricCard
              title="Passos Únicos"
              value={new Set(primeirosPagamentos.map(p => p.passo)).size}
              subtitle="Tipos de passo de cobrança"
              icon={Users}
              variant="info"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Passos de Cobrança */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Top 10 - Passos de Cobrança
                  </div>
                </CardTitle>
                <CardDescription>
                  Passos mais frequentes no processo de cobrança
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topPassos.length > 0 ? (
                  <MultiProgressBar
                    items={topPassos}
                    showValues={true}
                    showPercentages={false}
                    size="sm"
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhum passo encontrado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribuição por Status de Pacote */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Distribuição por Status
                  </div>
                </CardTitle>
                <CardDescription>
                  Status de pacotes mais frequentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statusPacote.length > 0 ? (
                  <MultiProgressBar
                    items={statusPacote}
                    showValues={true}
                    showPercentages={false}
                    size="sm"
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhum status encontrado
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabela Detalhada de Cobranças Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Cobranças Recentes (Últimos 30 dias)
                </div>
              </CardTitle>
              <CardDescription>
                Lista das cobranças mais recentes registradas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Proposta</TableHead>
                      <TableHead className="text-center">Passo</TableHead>
                      <TableHead className="text-center">Data Cobrança</TableHead>
                      <TableHead className="text-center">Vencimento</TableHead>
                      <TableHead className="text-center">Status Pacote</TableHead>
                      <TableHead className="text-center">Dias Habilitação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMetrics.cobrancasRecentes
                      .sort((a, b) => new Date(b.data_passo_cobranca).getTime() - new Date(a.data_passo_cobranca).getTime())
                      .slice(0, 20)
                      .map((cobranca, index) => {
                        const venda = vendas.find(v => v.numero_proposta === cobranca.proposta);
                        const diasAteHabilitacao = venda?.data_habilitacao 
                          ? calcularDiasEntreDatas(venda.data_habilitacao, cobranca.data_passo_cobranca)
                          : 0;
                        
                        return (
                          <TableRow 
                            key={`${cobranca.proposta}-${cobranca.data_passo_cobranca}`} 
                            className={index % 2 === 0 ? "bg-sky-50" : "bg-white"}
                          >
                            <TableCell className="font-medium">{cobranca.proposta}</TableCell>
                            <TableCell className="text-center">{cobranca.passo}</TableCell>
                            <TableCell className="text-center">
                              {new Date(cobranca.data_passo_cobranca).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-center">
                              {new Date(cobranca.vencimento_fatura).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className={`text-center ${
                              cobranca.status_pacote?.toLowerCase().includes('ativo') ? "text-green-600" :
                              cobranca.status_pacote?.toLowerCase().includes('pendente') ? "text-amber-600" : "text-red-600"
                            }`}>
                              {cobranca.status_pacote || 'N/A'}
                            </TableCell>
                            <TableCell className={`text-center ${
                              diasAteHabilitacao < 30 ? "text-green-600" :
                              diasAteHabilitacao < 60 ? "text-amber-600" : "text-red-600"
                            }`}>
                              {diasAteHabilitacao > 0 ? `${diasAteHabilitacao} dias` : 'N/A'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    
                    {paymentMetrics.cobrancasRecentes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                          Nenhuma cobrança recente encontrada
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