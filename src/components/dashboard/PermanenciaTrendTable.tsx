import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import useData from "@/context/useData";
import { Venda, PrimeiroPagamento } from '@/types';

interface PermanenciaTrendTableProps {
  filtroMesPermanencia: string[];
  filtroAnoPermanencia: string[];
  vendasFiltradas: Venda[];
}

export function PermanenciaTrendTable({
  filtroMesPermanencia,
  filtroAnoPermanencia,
  vendasFiltradas
}: PermanenciaTrendTableProps) {
  const { primeirosPagamentos } = useData();

  // Função para identificar a sigla de um produto (apenas POS)
  const getSigla = (venda: Venda): string => {
    const agrupamento = venda.agrupamento_produto || '';
    const produto = venda.produto_principal || '';
    
    if (agrupamento.includes('POS') || produto.includes('POS')) return 'POS';
    
    return ''; // Removido BL-DGO (FIBRA)
  };

  // Função para calcular o mês de permanência (data de habilitação + 4 meses)
  const calcularMesPermanencia = (dataHabilitacao: string): string => {
    const data = new Date(dataHabilitacao);
    data.setMonth(data.getMonth() + 4);
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return meses[data.getMonth()];
  };

  // Função para calcular o ano de permanência
  const calcularAnoPermanencia = (dataHabilitacao: string): number => {
    const data = new Date(dataHabilitacao);
    data.setMonth(data.getMonth() + 4);
    return data.getFullYear();
  };

  // Processar dados para a tabela
  const tableData = useMemo(() => {
    if (filtroMesPermanencia.length < 2 || filtroAnoPermanencia.length === 0) {
      return [];
    }

    // Criar mapa de pagamentos por proposta
    const pagamentosMap = new Map<string, PrimeiroPagamento>();
    primeirosPagamentos.forEach(pagamento => {
      pagamentosMap.set(pagamento.proposta, pagamento);
    });

    // Criar combinações de mês/ano
    const periodos: Array<{mes: string, ano: number, mesIndex: number}> = [];
    
    const mesesIndices = {
      'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
      'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
    };

    filtroMesPermanencia.forEach(mes => {
      filtroAnoPermanencia.forEach(ano => {
        periodos.push({
          mes,
          ano: parseInt(ano),
          mesIndex: mesesIndices[mes as keyof typeof mesesIndices] || 0
        });
      });
    });

    // Ordenar períodos cronologicamente
    periodos.sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mesIndex - b.mesIndex;
    });

    return periodos.map((periodo, index) => {
      // Filtrar vendas para este período específico
      const vendasDoPeriodo = vendasFiltradas.filter(venda => {
        if (!venda.data_habilitacao) return false;
        
        const mesPermanencia = calcularMesPermanencia(venda.data_habilitacao);
        const anoPermanencia = calcularAnoPermanencia(venda.data_habilitacao);
        
        return mesPermanencia === periodo.mes.substring(0, 3) && anoPermanencia === periodo.ano;
      });

      // Calcular métricas por sigla (apenas POS)
      const metricasPorSigla = {
        POS: { adimplentes: 0, inadimplentes: 0, cancelados: 0, total: 0 }
      };

      vendasDoPeriodo.forEach(venda => {
        const sigla = getSigla(venda);
        if (sigla === '') return;

        const pagamento = pagamentosMap.get(venda.numero_proposta);
        metricasPorSigla.POS.total++;

        if (pagamento) {
          if (pagamento.status_pacote === 'C') {
            // Cancelado
            metricasPorSigla.POS.cancelados++;
          } else if (pagamento.status_pacote === 'S') {
            // Inadimplente (suspenso)
            metricasPorSigla.POS.inadimplentes++;
          } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
            // Adimplente
            metricasPorSigla.POS.adimplentes++;
          } else if (pagamento.passo === '0' || pagamento.passo === '1') {
            // Adimplente
            metricasPorSigla.POS.adimplentes++;
          } else if (pagamento.status_pacote === 'I') {
            // Adimplente (inclusão)
            metricasPorSigla.POS.adimplentes++;
          } else {
            // Inadimplente (outros casos)
            metricasPorSigla.POS.inadimplentes++;
          }
        }
      });

      const posAdimplencia = metricasPorSigla.POS.total > 0 
        ? (metricasPorSigla.POS.adimplentes / metricasPorSigla.POS.total) * 100 
        : 0;

      // Calcular tendência comparando com período anterior
      let tendencia: { direction: 'up' | 'down' | 'neutral', percentage: number } = { direction: 'neutral', percentage: 0 };
      if (index > 0) {
        const periodoAnterior = periodos[index - 1];
        const vendasAnterior = vendasFiltradas.filter(venda => {
          if (!venda.data_habilitacao) return false;
          const mesPermanencia = calcularMesPermanencia(venda.data_habilitacao);
          const anoPermanencia = calcularAnoPermanencia(venda.data_habilitacao);
          return mesPermanencia === periodoAnterior.mes.substring(0, 3) && anoPermanencia === periodoAnterior.ano;
        });

        const metricasAnterior = {
          POS: { adimplentes: 0, total: 0 }
        };

        vendasAnterior.forEach(venda => {
          const sigla = getSigla(venda);
          if (sigla === '') return;
          const pagamento = pagamentosMap.get(venda.numero_proposta);
          metricasAnterior.POS.total++;

          if (pagamento) {
            if (pagamento.status_pacote === 'C' || pagamento.status_pacote === 'S') {
              // Não conta como adimplente
            } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
              metricasAnterior.POS.adimplentes++;
            } else if (pagamento.passo === '0' || pagamento.passo === '1') {
              metricasAnterior.POS.adimplentes++;
            } else if (pagamento.status_pacote === 'I') {
              metricasAnterior.POS.adimplentes++;
            }
          }
        });

        const adimplenciaAnterior = metricasAnterior.POS.total > 0 
          ? (metricasAnterior.POS.adimplentes / metricasAnterior.POS.total) * 100 
          : 0;

        if (adimplenciaAnterior >= 0) {
          // Diferença absoluta (mes atual - mês anterior)
          const variacao = posAdimplencia - adimplenciaAnterior;
          tendencia = {
            direction: variacao > 0 ? 'up' : variacao < 0 ? 'down' : 'neutral',
            percentage: Math.abs(variacao)
          };
        }
      }

      return {
        periodo: `${periodo.mes.substring(0, 3)}/${periodo.ano}`,
        mesAno: `${periodo.ano}-${String(periodo.mesIndex + 1).padStart(2, '0')}`,
        adimplencia: Number(posAdimplencia.toFixed(2)),
        total: metricasPorSigla.POS.total,
        inadimplentes: metricasPorSigla.POS.inadimplentes,
        cancelados: metricasPorSigla.POS.cancelados,
        tendencia
      };
    });
  }, [filtroMesPermanencia, filtroAnoPermanencia, vendasFiltradas, primeirosPagamentos]);

  if (filtroMesPermanencia.length < 2 || filtroAnoPermanencia.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Evolução da Permanência por Período
          </CardTitle>
          <CardDescription>
            Acompanhe a evolução dos percentuais de adimplência e totais de clientes POS ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-center p-6">
            <div>
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <div className="text-sm text-gray-500 max-w-sm">
                Selecione pelo menos 2 meses e 1 ano nos filtros acima para visualizar a evolução temporal da permanência.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200">
        <CardTitle className="flex items-center gap-2 text-green-900">
          <BarChart3 className="h-5 w-5 text-green-600" />
          Evolução da Permanência por Período
        </CardTitle>
        <CardDescription className="text-green-700">
          Acompanhe a evolução dos percentuais de adimplência e totais de clientes POS ao longo do tempo
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                <TableHead className="sticky left-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50 font-bold text-gray-900 min-w-[120px] border-r-2 border-gray-300">
                  Período
                </TableHead>
                <TableHead className="text-center font-bold text-green-700 bg-green-50/30">
                  % Adimplência
                </TableHead>
                <TableHead className="text-center font-bold text-gray-700">
                  Total Clientes
                </TableHead>
                <TableHead className="text-center font-bold text-amber-700 bg-amber-50/30">
                  Inadimplentes
                </TableHead>
                <TableHead className="text-center font-bold text-red-700 bg-red-50/30">
                  Cancelados
                </TableHead>
                <TableHead className="text-center font-bold text-gray-700">
                  Tendência
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row, index) => (
                <TableRow 
                  key={row.mesAno}
                  className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'}
                >
                  <TableCell className="font-semibold text-gray-900 sticky left-0 z-10 bg-inherit border-r-2 border-gray-200">
                    {row.periodo}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline" 
                      className={
                        row.adimplencia >= 55.00 
                          ? 'bg-green-100 text-green-800 border-green-300 font-semibold'
                          : row.adimplencia >= 45.00
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300 font-semibold'
                          : 'bg-red-100 text-red-800 border-red-300 font-semibold'
                      }
                    >
                      {row.adimplencia.toFixed(2)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium text-gray-700">
                    {row.total}
                  </TableCell>
                  <TableCell className="text-center text-amber-700 font-medium">
                    {row.inadimplentes}
                  </TableCell>
                  <TableCell className="text-center text-red-700 font-medium">
                    {row.cancelados}
                  </TableCell>
                  <TableCell className="text-center">
                    {index === 0 ? (
                      <Badge 
                        variant="outline"
                        className="bg-gray-100 text-gray-700 border-gray-300 text-xs"
                      >
                        Mês Base
                      </Badge>
                    ) : row.tendencia.direction !== 'neutral' ? (
                      <Badge 
                        variant="outline"
                        className={
                          row.tendencia.direction === 'up'
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : 'bg-red-100 text-red-800 border-red-300'
                        }
                      >
                        {row.tendencia.direction === 'up' ? (
                          <TrendingUp className="h-3 w-3 mr-1 inline" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1 inline" />
                        )}
                        {row.tendencia.percentage.toFixed(2)}%
                      </Badge>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Resumo no rodapé */}
        {tableData.length > 0 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Período analisado: <strong>{tableData[0]?.periodo}</strong> - <strong>{tableData[tableData.length - 1]?.periodo}</strong></span>
              <span><strong>{tableData.length}</strong> período(s) selecionado(s)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

