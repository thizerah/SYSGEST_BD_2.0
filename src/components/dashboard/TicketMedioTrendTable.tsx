import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, Users, BarChart3, ChevronDown, ChevronRight, Eye, X } from "lucide-react";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import useData from "@/context/useData";
import { Venda, VendaMeta } from '@/types';

interface TicketMedioTrendTableProps {
  filtroMesHabilitacao: string[];
  filtroAnoHabilitacao: string[];
  vendasFiltradas: Venda[];
  vendasMetaFiltradas: VendaMeta[];
}

export function TicketMedioTrendTable({
  filtroMesHabilitacao,
  filtroAnoHabilitacao,
  vendasFiltradas,
  vendasMetaFiltradas
}: TicketMedioTrendTableProps) {
  const { mapearCategoriaVenda, vendas } = useData();
  const [mostrarPorVendedor, setMostrarPorVendedor] = useState(false);
  const [vendedoresSelecionados, setVendedoresSelecionados] = useState<string[]>([]);
  const [vendedoresExpandidos, setVendedoresExpandidos] = useState<Set<string>>(new Set());

  // Função para extrair mês da data de habilitação
  const extrairMesHabilitacao = (dataHabilitacao: string): string => {
    const data = new Date(dataHabilitacao);
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[data.getMonth()];
  };

  // Função para extrair ano da data de habilitação
  const extrairAnoHabilitacao = (dataHabilitacao: string): number => {
    const data = new Date(dataHabilitacao);
    return data.getFullYear();
  };

  // Função para mapear categoria para os tipos do quadro
  const mapearTipoParaQuadro = (categoria: string): string => {
    switch (categoria) {
      case 'pos_pago':
        return 'POS';
      case 'flex_conforto':
        return 'PRE';
      case 'nova_parabolica':
        return 'NP';
      case 'sky_mais':
        return 'SKY+';
      default:
        return 'OUTROS';
    }
  };

  // Obter vendedores únicos
  const vendedoresUnicos = useMemo(() => {
    const vendedores = new Set<string>();
    
    vendasFiltradas.forEach(venda => {
      if (venda.nome_proprietario && venda.nome_proprietario.trim() !== '') {
        vendedores.add(venda.nome_proprietario);
      }
    });
    
    vendasMetaFiltradas.forEach(vendaMeta => {
      const id = vendaMeta.vendedor;
      const vendaExistente = vendas.find(v => v.id_vendedor === id);
      const nomeVendedor = vendaExistente?.nome_proprietario && vendaExistente.nome_proprietario !== id 
        ? vendaExistente.nome_proprietario 
        : id;
      
      if (nomeVendedor && nomeVendedor.trim() !== '') {
        vendedores.add(nomeVendedor);
      }
    });
    
    return Array.from(vendedores).sort();
  }, [vendasFiltradas, vendasMetaFiltradas, vendas]);

  // Processar dados para a tabela (estrutura invertida: períodos como colunas)
  const tableData = useMemo(() => {
    if (filtroMesHabilitacao.length < 2 || filtroAnoHabilitacao.length === 0) {
      return { periodos: [], categoriasConsolidadas: new Map(), vendedoresData: new Map() };
    }

    const periodos: Array<{mes: string, ano: number, mesIndex: number}> = [];
    
    const mesesIndices = {
      'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
      'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
    };

    filtroMesHabilitacao.forEach(mes => {
      filtroAnoHabilitacao.forEach(ano => {
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

    // Filtrar apenas períodos que têm dados reais
    const periodosComDados = periodos.filter(periodo => {
      const dataAtual = new Date();
      const mesAtual = dataAtual.getMonth() + 1;
      const anoAtual = dataAtual.getFullYear();
      const mesComparacao = periodo.mesIndex + 1;
      const ehMesAtual = mesComparacao === mesAtual && periodo.ano === anoAtual;

      if (ehMesAtual) {
        return vendasMetaFiltradas.some(vendaMeta => 
          vendaMeta.mes === mesComparacao && vendaMeta.ano === periodo.ano
        );
      } else {
        return vendasFiltradas.some(venda => {
          if (!venda.data_habilitacao) return false;
          const mesHabilitacao = extrairMesHabilitacao(venda.data_habilitacao);
          const anoHabilitacao = extrairAnoHabilitacao(venda.data_habilitacao);
          return mesHabilitacao === periodo.mes.substring(0, 3) && anoHabilitacao === periodo.ano;
        });
      }
    });

    const periodosFormatados = periodosComDados.map(p => `${p.mes.substring(0, 3)}/${p.ano}`);

    // Dados consolidados: categorias como linhas, períodos como colunas
    const categoriasConsolidadas = new Map<string, Map<string, {
      valor: number;
      tendencia?: { direction: 'up' | 'down' | 'neutral', percentage: number };
    }>>();

    const categorias = ['Total', 'POS', 'PRE', 'NP', 'SKY+'];
    categorias.forEach(categoria => {
      categoriasConsolidadas.set(categoria, new Map());
    });

    periodosComDados.forEach((periodo, periodoIndex) => {
      const dataAtual = new Date();
      const mesAtual = dataAtual.getMonth() + 1;
      const anoAtual = dataAtual.getFullYear();
      const mesComparacao = periodo.mesIndex + 1;
      const ehMesAtual = mesComparacao === mesAtual && periodo.ano === anoAtual;

      const metricasPorTipo = {
        POS: { valor: 0, quantidade: 0 },
        PRE: { valor: 0, quantidade: 0 },
        NP: { valor: 0, quantidade: 0 },
        'SKY+': { valor: 0, quantidade: 0 }
      };

      if (ehMesAtual) {
        const vendasMetaDoPeriodo = vendasMetaFiltradas.filter(vendaMeta => {
          return vendaMeta.mes === mesComparacao && vendaMeta.ano === periodo.ano;
        });

        vendasMetaDoPeriodo.forEach(vendaMeta => {
          const categoria = mapearCategoriaVenda(vendaMeta);
          const tipo = mapearTipoParaQuadro(categoria);
          
          if (metricasPorTipo[tipo as keyof typeof metricasPorTipo]) {
            const valorArredondado = Math.round(vendaMeta.valor * 100) / 100;
            metricasPorTipo[tipo as keyof typeof metricasPorTipo].valor += valorArredondado;
            metricasPorTipo[tipo as keyof typeof metricasPorTipo].quantidade += 1;
          }
        });
      } else {
        const vendasDoPeriodo = vendasFiltradas.filter(venda => {
          if (!venda.data_habilitacao) return false;
          const mesHabilitacao = extrairMesHabilitacao(venda.data_habilitacao);
          const anoHabilitacao = extrairAnoHabilitacao(venda.data_habilitacao);
          return mesHabilitacao === periodo.mes.substring(0, 3) && anoHabilitacao === periodo.ano;
        });

        vendasDoPeriodo.forEach(venda => {
          const categoria = mapearCategoriaVenda(venda);
          const tipo = mapearTipoParaQuadro(categoria);
          
          if (metricasPorTipo[tipo as keyof typeof metricasPorTipo]) {
            const valorArredondado = Math.round((venda.valor || 0) * 100) / 100;
            metricasPorTipo[tipo as keyof typeof metricasPorTipo].valor += valorArredondado;
            metricasPorTipo[tipo as keyof typeof metricasPorTipo].quantidade += 1;
          }
        });
      }

      const valorTotal = Object.values(metricasPorTipo).reduce((sum, tipo) => sum + tipo.valor, 0);
      const quantidadeTotal = Object.values(metricasPorTipo).reduce((sum, tipo) => sum + tipo.quantidade, 0);
      const ticketMedioTotal = quantidadeTotal > 0 ? valorTotal / quantidadeTotal : 0;

      const ticketMedioPOS = metricasPorTipo.POS.quantidade > 0 ? metricasPorTipo.POS.valor / metricasPorTipo.POS.quantidade : 0;
      const ticketMedioPRE = metricasPorTipo.PRE.quantidade > 0 ? metricasPorTipo.PRE.valor / metricasPorTipo.PRE.quantidade : 0;
      const ticketMedioNP = metricasPorTipo.NP.quantidade > 0 ? metricasPorTipo.NP.valor / metricasPorTipo.NP.quantidade : 0;
      const ticketMedioSKY = metricasPorTipo['SKY+'].quantidade > 0 ? metricasPorTipo['SKY+'].valor / metricasPorTipo['SKY+'].quantidade : 0;

      const periodoKey = `${periodo.mes.substring(0, 3)}/${periodo.ano}`;

      // Calcular tendências comparando com período anterior
      const calcularTendencia = (valorAtual: number, valorAnterior: number): { direction: 'up' | 'down' | 'neutral', percentage: number } => {
        if (valorAnterior === 0 || valorAtual === 0) return { direction: 'neutral', percentage: 0 };
        const variacao = ((valorAtual - valorAnterior) / valorAnterior) * 100;
        return {
          direction: variacao > 0 ? 'up' : variacao < 0 ? 'down' : 'neutral',
          percentage: Math.abs(variacao)
        };
      };

      categoriasConsolidadas.get('Total')!.set(periodoKey, {
        valor: Number(ticketMedioTotal.toFixed(2)),
        tendencia: periodoIndex > 0 ? calcularTendencia(
          ticketMedioTotal,
          categoriasConsolidadas.get('Total')!.get(periodosFormatados[periodoIndex - 1])?.valor || 0
        ) : undefined
      });

      categoriasConsolidadas.get('POS')!.set(periodoKey, {
        valor: Number(ticketMedioPOS.toFixed(2)),
        tendencia: periodoIndex > 0 ? calcularTendencia(
          ticketMedioPOS,
          categoriasConsolidadas.get('POS')!.get(periodosFormatados[periodoIndex - 1])?.valor || 0
        ) : undefined
      });

      categoriasConsolidadas.get('PRE')!.set(periodoKey, {
        valor: Number(ticketMedioPRE.toFixed(2)),
        tendencia: periodoIndex > 0 ? calcularTendencia(
          ticketMedioPRE,
          categoriasConsolidadas.get('PRE')!.get(periodosFormatados[periodoIndex - 1])?.valor || 0
        ) : undefined
      });

      categoriasConsolidadas.get('NP')!.set(periodoKey, {
        valor: Number(ticketMedioNP.toFixed(2)),
        tendencia: periodoIndex > 0 ? calcularTendencia(
          ticketMedioNP,
          categoriasConsolidadas.get('NP')!.get(periodosFormatados[periodoIndex - 1])?.valor || 0
        ) : undefined
      });

      categoriasConsolidadas.get('SKY+')!.set(periodoKey, {
        valor: Number(ticketMedioSKY.toFixed(2)),
        tendencia: periodoIndex > 0 ? calcularTendencia(
          ticketMedioSKY,
          categoriasConsolidadas.get('SKY+')!.get(periodosFormatados[periodoIndex - 1])?.valor || 0
        ) : undefined
      });
    });

    // Dados por vendedor: vendedores como linhas, períodos como colunas (total)
    const vendedoresData = new Map<string, Map<string, {
      valor: number;
      tendencia?: { direction: 'up' | 'down' | 'neutral', percentage: number };
    }>>();

    // Dados por vendedor E categoria: vendedor -> categoria -> período -> { valor, tendencia }
    const vendedoresDataPorCategoria = new Map<string, Map<string, Map<string, {
      valor: number;
      tendencia?: { direction: 'up' | 'down' | 'neutral', percentage: number };
    }>>>();

    vendedoresUnicos.forEach(vendedor => {
      const dadosVendedor = new Map<string, {
        valor: number;
        tendencia?: { direction: 'up' | 'down' | 'neutral', percentage: number };
      }>();

      periodosComDados.forEach((periodo, periodoIndex) => {
        const dataAtual = new Date();
        const mesAtual = dataAtual.getMonth() + 1;
        const anoAtual = dataAtual.getFullYear();
        const mesComparacao = periodo.mesIndex + 1;
        const ehMesAtual = mesComparacao === mesAtual && periodo.ano === anoAtual;

        const metricasPorTipo = {
          POS: { valor: 0, quantidade: 0 },
          PRE: { valor: 0, quantidade: 0 },
          NP: { valor: 0, quantidade: 0 },
          'SKY+': { valor: 0, quantidade: 0 }
        };

        if (ehMesAtual) {
          const vendasMetaDoPeriodo = vendasMetaFiltradas.filter(vendaMeta => {
            if (vendaMeta.mes !== mesComparacao || vendaMeta.ano !== periodo.ano) return false;
            const id = vendaMeta.vendedor;
            const vendaExistente = vendas.find(v => v.id_vendedor === id);
            const nomeVendedor = vendaExistente?.nome_proprietario && vendaExistente.nome_proprietario !== id 
              ? vendaExistente.nome_proprietario 
              : id;
            return nomeVendedor === vendedor;
          });

          vendasMetaDoPeriodo.forEach(vendaMeta => {
            const categoria = mapearCategoriaVenda(vendaMeta);
            const tipo = mapearTipoParaQuadro(categoria);
            if (metricasPorTipo[tipo as keyof typeof metricasPorTipo]) {
              const valorArredondado = Math.round(vendaMeta.valor * 100) / 100;
              metricasPorTipo[tipo as keyof typeof metricasPorTipo].valor += valorArredondado;
              metricasPorTipo[tipo as keyof typeof metricasPorTipo].quantidade += 1;
            }
          });
        } else {
          const vendasDoPeriodo = vendasFiltradas.filter(venda => {
            if (!venda.data_habilitacao || venda.nome_proprietario !== vendedor) return false;
            const mesHabilitacao = extrairMesHabilitacao(venda.data_habilitacao);
            const anoHabilitacao = extrairAnoHabilitacao(venda.data_habilitacao);
            return mesHabilitacao === periodo.mes.substring(0, 3) && anoHabilitacao === periodo.ano;
          });

          vendasDoPeriodo.forEach(venda => {
            const categoria = mapearCategoriaVenda(venda);
            const tipo = mapearTipoParaQuadro(categoria);
            if (metricasPorTipo[tipo as keyof typeof metricasPorTipo]) {
              const valorArredondado = Math.round((venda.valor || 0) * 100) / 100;
              metricasPorTipo[tipo as keyof typeof metricasPorTipo].valor += valorArredondado;
              metricasPorTipo[tipo as keyof typeof metricasPorTipo].quantidade += 1;
            }
          });
        }

        const valorTotal = Object.values(metricasPorTipo).reduce((sum, tipo) => sum + tipo.valor, 0);
        const quantidadeTotal = Object.values(metricasPorTipo).reduce((sum, tipo) => sum + tipo.quantidade, 0);
        const ticketMedioTotal = quantidadeTotal > 0 ? valorTotal / quantidadeTotal : 0;

        const periodoKey = `${periodo.mes.substring(0, 3)}/${periodo.ano}`;

        const calcularTendencia = (valorAtual: number, valorAnterior: number): { direction: 'up' | 'down' | 'neutral', percentage: number } => {
          if (valorAnterior === 0 || valorAtual === 0) return { direction: 'neutral', percentage: 0 };
          const variacao = ((valorAtual - valorAnterior) / valorAnterior) * 100;
          return {
            direction: variacao > 0 ? 'up' : variacao < 0 ? 'down' : 'neutral',
            percentage: Math.abs(variacao)
          };
        };

        dadosVendedor.set(periodoKey, {
          valor: Number(ticketMedioTotal.toFixed(2)),
          tendencia: periodoIndex > 0 ? calcularTendencia(
            ticketMedioTotal,
            dadosVendedor.get(periodosFormatados[periodoIndex - 1])?.valor || 0
          ) : undefined
        });

        // Armazenar dados por categoria
        if (!vendedoresDataPorCategoria.has(vendedor)) {
          vendedoresDataPorCategoria.set(vendedor, new Map());
        }
        const dadosPorCategoria = vendedoresDataPorCategoria.get(vendedor)!;

        const categoriasParaVendedor = ['POS', 'PRE', 'NP', 'SKY+'];
        categoriasParaVendedor.forEach(catKey => {
          if (!dadosPorCategoria.has(catKey)) {
            dadosPorCategoria.set(catKey, new Map());
          }
        });

        const ticketMedioPOS = metricasPorTipo.POS.quantidade > 0 ? metricasPorTipo.POS.valor / metricasPorTipo.POS.quantidade : 0;
        const ticketMedioPRE = metricasPorTipo.PRE.quantidade > 0 ? metricasPorTipo.PRE.valor / metricasPorTipo.PRE.quantidade : 0;
        const ticketMedioNP = metricasPorTipo.NP.quantidade > 0 ? metricasPorTipo.NP.valor / metricasPorTipo.NP.quantidade : 0;
        const ticketMedioSKY = metricasPorTipo['SKY+'].quantidade > 0 ? metricasPorTipo['SKY+'].valor / metricasPorTipo['SKY+'].quantidade : 0;

        dadosPorCategoria.get('POS')!.set(periodoKey, {
          valor: Number(ticketMedioPOS.toFixed(2)),
          tendencia: periodoIndex > 0 ? calcularTendencia(
            ticketMedioPOS,
            dadosPorCategoria.get('POS')!.get(periodosFormatados[periodoIndex - 1])?.valor || 0
          ) : undefined
        });

        dadosPorCategoria.get('PRE')!.set(periodoKey, {
          valor: Number(ticketMedioPRE.toFixed(2)),
          tendencia: periodoIndex > 0 ? calcularTendencia(
            ticketMedioPRE,
            dadosPorCategoria.get('PRE')!.get(periodosFormatados[periodoIndex - 1])?.valor || 0
          ) : undefined
        });

        dadosPorCategoria.get('NP')!.set(periodoKey, {
          valor: Number(ticketMedioNP.toFixed(2)),
          tendencia: periodoIndex > 0 ? calcularTendencia(
            ticketMedioNP,
            dadosPorCategoria.get('NP')!.get(periodosFormatados[periodoIndex - 1])?.valor || 0
          ) : undefined
        });

        dadosPorCategoria.get('SKY+')!.set(periodoKey, {
          valor: Number(ticketMedioSKY.toFixed(2)),
          tendencia: periodoIndex > 0 ? calcularTendencia(
            ticketMedioSKY,
            dadosPorCategoria.get('SKY+')!.get(periodosFormatados[periodoIndex - 1])?.valor || 0
          ) : undefined
        });
      });

      vendedoresData.set(vendedor, dadosVendedor);
    });

    return { periodos: periodosFormatados, categoriasConsolidadas, vendedoresData, vendedoresDataPorCategoria };
  }, [filtroMesHabilitacao, filtroAnoHabilitacao, vendasFiltradas, vendasMetaFiltradas, mapearCategoriaVenda, vendedoresUnicos, vendas]);

  if (filtroMesHabilitacao.length < 2 || filtroAnoHabilitacao.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            Ticket Médio no Período
          </CardTitle>
          <CardDescription>
            Acompanhe a evolução do ticket médio por categoria ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-center p-6">
            <div>
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <div className="text-sm text-gray-500 max-w-sm">
                Selecione pelo menos 2 meses e 1 ano nos filtros acima para visualizar a evolução temporal do ticket médio.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { periodos, categoriasConsolidadas, vendedoresData, vendedoresDataPorCategoria } = tableData;

  // Opções para o MultiSelect de vendedores
  const opcoesVendedores = useMemo(() => {
    return vendedoresUnicos.map(vendedor => ({
      label: vendedor,
      value: vendedor
    }));
  }, [vendedoresUnicos]);

  // Filtrar vendedores baseado na seleção (se vazio, mostrar todos)
  const vendedoresFiltrados = useMemo(() => {
    if (vendedoresSelecionados.length === 0) {
      return vendedoresUnicos; // Mostrar todos quando não há seleção específica
    }
    return vendedoresUnicos.filter(v => vendedoresSelecionados.includes(v));
  }, [vendedoresUnicos, vendedoresSelecionados]);

  // Função helper para renderizar valor com tendência
  const renderizarValorComTendencia = (
    valor: number | undefined,
    tendencia: { direction: 'up' | 'down' | 'neutral', percentage: number } | undefined,
    isFirstPeriod: boolean,
    colorClass: string
  ) => {
    if (valor === undefined || valor === null || valor === 0) {
      return <span className="text-gray-400">-</span>;
    }

    const valorFormatado = valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return (
      <div className="flex flex-col items-center gap-1">
        <span className={`font-medium ${colorClass}`}>{valorFormatado}</span>
        {isFirstPeriod ? (
          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 text-[9px] px-1 py-0">
            Base
          </Badge>
        ) : tendencia ? (
          tendencia.direction !== 'neutral' && tendencia.percentage > 0 ? (
            <Badge
              variant="outline"
              className={`text-[9px] px-1 py-0 ${
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
          ) : (
            <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 text-[9px] px-1 py-0">
              0.00%
            </Badge>
          )
        ) : null}
      </div>
    );
  };

  const categorias = [
    { key: 'Total', label: 'Total', color: 'text-gray-700' },
    { key: 'POS', label: 'POS', color: 'text-green-700' },
    { key: 'PRE', label: 'PRE', color: 'text-blue-700' },
    { key: 'NP', label: 'NP', color: 'text-orange-700' },
    { key: 'SKY+', label: 'SKY+', color: 'text-indigo-700' }
  ];

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b-2 border-purple-200">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <DollarSign className="h-5 w-5 text-purple-600" />
                Ticket Médio no Período
              </CardTitle>
              <CardDescription className="text-purple-700">
                Acompanhe a evolução do ticket médio por categoria ao longo do tempo
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={!mostrarPorVendedor ? "default" : "outline"}
                size="sm"
                onClick={() => setMostrarPorVendedor(false)}
                className={!mostrarPorVendedor ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Consolidado
              </Button>
              <Button
                variant={mostrarPorVendedor ? "default" : "outline"}
                size="sm"
                onClick={() => setMostrarPorVendedor(true)}
                className={mostrarPorVendedor ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
              >
                <Users className="h-4 w-4 mr-2" />
                Por Vendedor
              </Button>
            </div>
          </div>
          {mostrarPorVendedor && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-purple-900">Filtrar Vendedores:</label>
              <MultiSelect
                options={opcoesVendedores}
                selected={vendedoresSelecionados}
                onChange={setVendedoresSelecionados}
                placeholder="Selecione vendedores para comparar..."
                className="w-full max-w-md"
              />
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                {vendedoresSelecionados.length === 0 
                  ? `${vendedoresUnicos.length} vendedor(es) (todos)`
                  : `${vendedoresSelecionados.length} de ${vendedoresUnicos.length} selecionado(s)`
                }
              </Badge>
              {vendedoresSelecionados.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVendedoresSelecionados([])}
                  className="h-8 px-2 text-purple-700 hover:text-purple-900 hover:bg-purple-100 border-purple-300"
                  title="Limpar filtros"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                <TableHead className="sticky left-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50 font-bold text-gray-900 min-w-[150px] border-r-2 border-gray-300">
                  {mostrarPorVendedor ? 'Vendedor' : 'Categoria'}
                </TableHead>
                {periodos.map((periodo, index) => (
                  <TableHead
                    key={periodo}
                    className={`text-center font-bold text-gray-700 min-w-[120px] ${
                      index > 0 ? 'border-l-2 border-gray-300' : ''
                    }`}
                  >
                    {periodo}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!mostrarPorVendedor ? (
                // Modo consolidado: categorias como linhas
                categorias.map((categoria, catIndex) => {
                  const dadosCategoria = categoriasConsolidadas.get(categoria.key);
                  return (
                    <TableRow
                      key={categoria.key}
                      className={catIndex % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'}
                    >
                      <TableCell className="font-semibold text-gray-900 sticky left-0 z-10 bg-inherit border-r-2 border-gray-200">
                        {categoria.label}
                      </TableCell>
                      {periodos.map((periodo, periodoIndex) => {
                        const dados = dadosCategoria?.get(periodo);
                        return (
                          <TableCell
                            key={periodo}
                            className={`text-center py-2 ${
                              periodoIndex > 0 ? 'border-l-2 border-gray-300' : ''
                            }`}
                          >
                            {renderizarValorComTendencia(
                              dados?.valor,
                              dados?.tendencia,
                              periodoIndex === 0,
                              categoria.color
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              ) : (
                // Modo por vendedor: vendedores como linhas com dropdown para detalhes
                vendedoresFiltrados.map((vendedor, vendedorIndex) => {
                  const dadosVendedor = vendedoresData.get(vendedor);
                  const dadosPorCategoria = vendedoresDataPorCategoria.get(vendedor);
                  const isExpanded = vendedoresExpandidos.has(vendedor);

                  return (
                    <React.Fragment key={vendedor}>
                      <TableRow
                        className={vendedorIndex % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'}
                      >
                        <TableCell className="font-semibold text-gray-900 sticky left-0 z-10 bg-inherit border-r-2 border-gray-200">
                          <Collapsible
                            open={isExpanded}
                            onOpenChange={(open) => {
                              const novosExpandidos = new Set(vendedoresExpandidos);
                              if (open) {
                                novosExpandidos.add(vendedor);
                              } else {
                                novosExpandidos.delete(vendedor);
                              }
                              setVendedoresExpandidos(novosExpandidos);
                            }}
                          >
                            <CollapsibleTrigger asChild>
                              <button className="flex items-center gap-2 hover:bg-gray-100 rounded px-2 py-1 -ml-2 transition-colors">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-purple-600" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                                <Eye className="h-4 w-4 text-gray-400" />
                                <span>{vendedor}</span>
                              </button>
                            </CollapsibleTrigger>
                          </Collapsible>
                        </TableCell>
                        {periodos.map((periodo, periodoIndex) => {
                          const dados = dadosVendedor?.get(periodo);
                          return (
                            <TableCell
                              key={periodo}
                              className={`text-center py-2 ${
                                periodoIndex > 0 ? 'border-l-2 border-gray-300' : ''
                              }`}
                            >
                              {renderizarValorComTendencia(
                                dados?.valor,
                                dados?.tendencia,
                                periodoIndex === 0,
                                'text-gray-700'
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      
                      {/* Linha expandida com detalhes por categoria */}
                      {isExpanded && dadosPorCategoria && (
                        <TableRow className="bg-purple-50/30">
                          <TableCell colSpan={periodos.length + 1} className="p-4">
                            <div className="bg-white rounded-lg border-2 border-purple-200 p-4 shadow-sm">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Eye className="h-4 w-4 text-purple-600" />
                                Detalhes por Categoria - {vendedor}
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                                      <th className="text-left py-2 px-3 font-bold text-gray-900 min-w-[120px]">Categoria</th>
                                      {periodos.map((periodo, index) => (
                                        <th
                                          key={periodo}
                                          className={`text-center font-bold text-gray-700 py-2 px-2 min-w-[100px] ${
                                            index > 0 ? 'border-l-2 border-gray-300' : ''
                                          }`}
                                        >
                                          {periodo}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {categorias.filter(c => c.key !== 'Total').map((categoria, catIndex) => {
                                      const dadosCategoria = dadosPorCategoria.get(categoria.key);
                                      return (
                                        <tr
                                          key={categoria.key}
                                          className={catIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                                        >
                                          <td className={`font-medium py-2 px-3 ${categoria.color}`}>
                                            {categoria.label}
                                          </td>
                                          {periodos.map((periodo, periodoIndex) => {
                                            const dados = dadosCategoria?.get(periodo);
                                            return (
                                              <td
                                                key={periodo}
                                                className={`text-center py-2 ${
                                                  periodoIndex > 0 ? 'border-l-2 border-gray-200' : ''
                                                }`}
                                              >
                                                {renderizarValorComTendencia(
                                                  dados?.valor,
                                                  dados?.tendencia,
                                                  periodoIndex === 0,
                                                  categoria.color
                                                )}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {periodos.length > 0 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                Período analisado: <strong>{periodos[0]}</strong> - <strong>{periodos[periodos.length - 1]}</strong>
              </span>
              <span>
                <strong>{periodos.length}</strong> período(s) selecionado(s)
                {mostrarPorVendedor && (
                  <>
                    {vendedoresSelecionados.length > 0 ? (
                      <>
                        {' • '}
                        <strong>{vendedoresFiltrados.length}</strong> de <strong>{vendedoresUnicos.length}</strong> vendedor(es) selecionado(s)
                      </>
                    ) : (
                      <>
                        {' • '}
                        <strong>{vendedoresUnicos.length}</strong> vendedor(es)
                      </>
                    )}
                  </>
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}