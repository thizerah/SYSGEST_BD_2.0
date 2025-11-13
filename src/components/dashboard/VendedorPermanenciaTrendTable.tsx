import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BarChart3, TrendingUp, TrendingDown, Search } from "lucide-react";
import useData from "@/context/useData";
import { Venda, PrimeiroPagamento } from '@/types';

interface VendedorPermanenciaTrendTableProps {
  filtroMesPermanencia: string[];
  filtroAnoPermanencia: string[];
  vendasFiltradas: Venda[];
}

export function VendedorPermanenciaTrendTable({
  filtroMesPermanencia,
  filtroAnoPermanencia,
  vendasFiltradas
}: VendedorPermanenciaTrendTableProps) {
  const { primeirosPagamentos } = useData();
  const [searchTerm, setSearchTerm] = useState('');

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

  // Obter vendedores únicos
  const vendedoresUnicos = useMemo(() => {
    const vendedores = new Set<string>();
    vendasFiltradas.forEach(venda => {
      if (venda.nome_proprietario && venda.nome_proprietario.trim() !== '') {
        vendedores.add(venda.nome_proprietario);
      }
    });
    return Array.from(vendedores).sort();
  }, [vendasFiltradas]);


  // Processar dados para a tabela
  const tableData = useMemo(() => {
    if (filtroMesPermanencia.length < 2 || filtroAnoPermanencia.length === 0) {
      return { periodos: [], vendedoresData: new Map() };
    }

    const pagamentosMap = new Map<string, PrimeiroPagamento>();
    primeirosPagamentos.forEach(pagamento => {
      pagamentosMap.set(pagamento.proposta, pagamento);
    });

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

    periodos.sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mesIndex - b.mesIndex;
    });

    const vendedoresData = new Map<string, Map<string, {
      adimplencia: number;
      tendencia?: { direction: 'up' | 'down' | 'neutral', percentage: number };
    }>>();

    periodos.forEach((periodo, periodoIndex) => {
      const vendasDoPeriodo = vendasFiltradas.filter(venda => {
        if (!venda.data_habilitacao) return false;
        const mesPermanencia = calcularMesPermanencia(venda.data_habilitacao);
        const anoPermanencia = calcularAnoPermanencia(venda.data_habilitacao);
        return mesPermanencia === periodo.mes.substring(0, 3) && anoPermanencia === periodo.ano;
      });

      const metricasPorVendedor = new Map<string, {
        adimplentes: number;
        total: number;
      }>();

      vendasDoPeriodo.forEach(venda => {
        const vendedor = venda.nome_proprietario;
        if (!vendedor || vendedor.trim() === '') return;

        const sigla = getSigla(venda);
        if (sigla !== 'POS') return;

        if (!metricasPorVendedor.has(vendedor)) {
          metricasPorVendedor.set(vendedor, { adimplentes: 0, total: 0 });
        }

        const vendedorMetrics = metricasPorVendedor.get(vendedor)!;
        const pagamento = pagamentosMap.get(venda.numero_proposta);

        vendedorMetrics.total++;

        if (pagamento) {
          if (pagamento.status_pacote === 'C' || pagamento.status_pacote === 'S') {
            // Não conta como adimplente
          } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
            vendedorMetrics.adimplentes++;
          } else if (pagamento.passo === '0' || pagamento.passo === '1') {
            vendedorMetrics.adimplentes++;
          } else if (pagamento.status_pacote === 'I') {
            vendedorMetrics.adimplentes++;
          }
        }
      });

      metricasPorVendedor.forEach((metrics, vendedor) => {
        const adimplencia = metrics.total > 0 
          ? (metrics.adimplentes / metrics.total) * 100 
          : 0;

        if (!vendedoresData.has(vendedor)) {
          vendedoresData.set(vendedor, new Map());
        }

        const periodoKey = `${periodo.mes.substring(0, 3)}/${periodo.ano}`;
        
        // Calcular tendência
        let tendencia: { direction: 'up' | 'down' | 'neutral', percentage: number } | undefined;
        if (periodoIndex > 0) {
          const periodoAnterior = periodos[periodoIndex - 1];
          const periodoAnteriorKey = `${periodoAnterior.mes.substring(0, 3)}/${periodoAnterior.ano}`;
          const vendedorPeriodos = vendedoresData.get(vendedor);
          const dadosAnterior = vendedorPeriodos?.get(periodoAnteriorKey);
          
          if (dadosAnterior && dadosAnterior.adimplencia >= 0) {
            // Diferença absoluta (mês atual - mês anterior)
            const variacao = adimplencia - dadosAnterior.adimplencia;
            tendencia = {
              direction: variacao > 0 ? 'up' : variacao < 0 ? 'down' : 'neutral',
              percentage: Math.abs(variacao)
            };
          }
        }

        vendedoresData.get(vendedor)!.set(periodoKey, {
          adimplencia: Number(adimplencia.toFixed(2)),
          tendencia
        });
      });
    });

    return { periodos: periodos.map(p => `${p.mes.substring(0, 3)}/${p.ano}`), vendedoresData };
  }, [filtroMesPermanencia, filtroAnoPermanencia, vendasFiltradas, primeirosPagamentos]);

  // Filtrar vendedores por busca
  const vendedoresFiltrados = useMemo(() => {
    if (!searchTerm) return vendedoresUnicos;
    return vendedoresUnicos.filter(v => 
      v.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendedoresUnicos, searchTerm]);

  // Função para calcular mês de referência para um período específico
  const calcularMesReferencia = (mesPermanencia: string, anoPermanencia: number): string => {
    const mesesIndices = {
      'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
      'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
    };

    const mesesNomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const mesIndex = mesesIndices[mesPermanencia as keyof typeof mesesIndices] || 0;
    
    // Subtrair 4 meses para encontrar o mês de referência das vendas
    let mesReferenciaIndex = mesIndex - 4;
    let anoReferencia = anoPermanencia;

    // Ajustar se o mês de referência for negativo (ano anterior)
    if (mesReferenciaIndex < 0) {
      mesReferenciaIndex += 12;
      anoReferencia -= 1;
    }

    const mesReferenciaNome = mesesNomes[mesReferenciaIndex];
    
    return `${mesReferenciaNome}/${anoReferencia}`;
  };

  if (filtroMesPermanencia.length < 2 || filtroAnoPermanencia.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Evolução da Permanência por Vendedor (%)
          </CardTitle>
        <CardDescription>
          Percentual de adimplência POS por vendedor ao longo do tempo. Use a busca para filtrar vendedores específicos.
        </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-center p-6">
            <div>
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <div className="text-sm text-gray-500 max-w-sm">
                Selecione pelo menos 2 meses e 1 ano nos filtros acima para visualizar a evolução temporal da permanência por vendedor.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { periodos, vendedoresData } = tableData;

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Evolução da Permanência por Vendedor (%)
        </CardTitle>
        <CardDescription className="text-blue-700">
          Percentual de adimplência POS por vendedor ao longo do tempo. Use a busca para filtrar vendedores específicos.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {/* Campo de busca */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                <TableHead className="sticky left-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50 font-bold text-gray-900 min-w-[200px] border-r-2 border-gray-300">
                  Vendedor
                </TableHead>
                {periodos.map((periodo, index) => {
                  // Extrair mês e ano do período (formato: "Out/2025")
                  const [mesAbrev, ano] = periodo.split('/');
                  const mesesNomes = {
                    'Jan': 'Janeiro', 'Fev': 'Fevereiro', 'Mar': 'Março', 'Abr': 'Abril',
                    'Mai': 'Maio', 'Jun': 'Junho', 'Jul': 'Julho', 'Ago': 'Agosto',
                    'Set': 'Setembro', 'Out': 'Outubro', 'Nov': 'Novembro', 'Dez': 'Dezembro'
                  };
                  const mesCompleto = mesesNomes[mesAbrev as keyof typeof mesesNomes] || mesAbrev;
                  const mesReferencia = calcularMesReferencia(mesCompleto, parseInt(ano));
                  
                  return (
                    <TableHead 
                      key={periodo} 
                      className={`text-center font-bold text-gray-700 min-w-[100px] ${
                        index > 0 ? 'border-l-2 border-gray-300' : ''
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{periodo}</span>
                        <span className="text-xs font-normal text-gray-600">
                          (Ref: {mesReferencia})
                        </span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendedoresFiltrados.map((vendedor, index) => {
                const vendedorPeriodos = vendedoresData.get(vendedor);
                
                // Calcular média de tendência do vendedor
                let mediaTendencia = 0;
                let contadorTendencias = 0;
                let direcaoMedia: 'up' | 'down' | 'neutral' = 'neutral';
                
                if (vendedorPeriodos) {
                  let somaTendencias = 0;
                  periodos.forEach((periodo, periodoIndex) => {
                    if (periodoIndex > 0) { // Pular o primeiro período (mês base)
                      const dados = vendedorPeriodos.get(periodo);
                      if (dados?.tendencia && dados.tendencia.direction !== 'neutral') {
                        somaTendencias += dados.tendencia.direction === 'up' 
                          ? dados.tendencia.percentage 
                          : -dados.tendencia.percentage;
                        contadorTendencias++;
                      }
                    }
                  });
                  
                  if (contadorTendencias > 0) {
                    mediaTendencia = Math.abs(somaTendencias / contadorTendencias);
                    direcaoMedia = somaTendencias >= 0 ? 'up' : 'down';
                  }
                }
                
                return (
                  <TableRow 
                    key={vendedor}
                    className={index % 2 === 0 
                      ? 'bg-white hover:bg-gray-50' 
                      : 'bg-gray-50/50 hover:bg-gray-100'
                    }
                  >
                    <TableCell className="font-semibold text-gray-900 sticky left-0 z-10 bg-inherit border-r-2 border-gray-200">
                      <div className="flex items-center gap-2">
                        <span>{vendedor}</span>
                        {contadorTendencias > 0 && (
                          <Badge 
                            variant="outline"
                            className={`text-[9px] ${
                              direcaoMedia === 'up'
                                ? 'bg-green-100 text-green-800 border-green-300'
                                : 'bg-red-100 text-red-800 border-red-300'
                            }`}
                            title={`Média de tendência: ${direcaoMedia === 'up' ? '+' : '-'}${mediaTendencia.toFixed(2)}%`}
                          >
                            {direcaoMedia === 'up' ? (
                              <TrendingUp className="h-2.5 w-2.5 mr-0.5 inline" />
                            ) : (
                              <TrendingDown className="h-2.5 w-2.5 mr-0.5 inline" />
                            )}
                            {mediaTendencia.toFixed(2)}%
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                      {periodos.map((periodo, periodoIndex) => {
                        const dados = vendedorPeriodos?.get(periodo);
                        const adimplencia = dados?.adimplencia ?? 0;
                        const tendencia = dados?.tendencia;
                        
                        return (
                          <TableCell 
                            key={periodo} 
                            className={`text-center ${
                              periodoIndex > 0 ? 'border-l-2 border-gray-300' : ''
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              {adimplencia > 0 ? (
                                <Badge 
                                  variant="outline" 
                                  className={
                                    adimplencia >= 55.00 
                                      ? 'bg-green-100 text-green-800 border-green-300 font-semibold'
                                      : adimplencia >= 45.00
                                      ? 'bg-yellow-100 text-yellow-800 border-yellow-300 font-semibold'
                                      : 'bg-red-100 text-red-800 border-red-300 font-semibold'
                                  }
                                >
                                  {adimplencia.toFixed(2)}%
                                </Badge>
                              ) : (
                                <span className="text-xs text-gray-500 italic">
                                  (sem vendas no período)
                                </span>
                              )}
                              {adimplencia > 0 && (
                                <>
                                  {periodoIndex === 0 && !tendencia ? (
                                    <Badge 
                                      variant="outline"
                                      className="bg-gray-100 text-gray-700 border-gray-300 text-[9px]"
                                    >
                                      Mês Base
                                    </Badge>
                                  ) : tendencia && tendencia.direction !== 'neutral' ? (
                                    <Badge 
                                      variant="outline"
                                      className={`text-[9px] ${
                                        tendencia.direction === 'up'
                                          ? 'bg-green-100 text-green-800 border-green-300'
                                          : 'bg-red-100 text-red-800 border-red-300'
                                      }`}
                                    >
                                      {tendencia.direction === 'up' ? (
                                        <TrendingUp className="h-2 w-2 mr-0.5 inline" />
                                      ) : (
                                        <TrendingDown className="h-2 w-2 mr-0.5 inline" />
                                      )}
                                      {tendencia.percentage.toFixed(2)}%
                                    </Badge>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        {/* Resumo */}
        {periodos.length > 0 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Período analisado: <strong>{periodos[0]}</strong> - <strong>{periodos[periodos.length - 1]}</strong></span>
              <span>
                <strong>{vendedoresFiltrados.length}</strong> de <strong>{vendedoresUnicos.length}</strong> vendedor(es)
                {searchTerm && ` (filtrado)`}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

