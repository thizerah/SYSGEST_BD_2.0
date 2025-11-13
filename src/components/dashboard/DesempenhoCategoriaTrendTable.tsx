import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, TrendingDown, Users, BarChart3, ChevronDown, ChevronRight, Eye, X } from "lucide-react";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MultiSelect } from "@/components/ui/multi-select";
import useData from "@/context/useData";
import { Venda, VendaMeta } from '@/types';

interface DesempenhoCategoriaTrendTableProps {
  filtroMesHabilitacao: string[];
  filtroAnoHabilitacao: string[];
  vendasFiltradas: Venda[];
  vendasMetaFiltradas: VendaMeta[];
}

export function DesempenhoCategoriaTrendTable({
  filtroMesHabilitacao,
  filtroAnoHabilitacao,
  vendasFiltradas,
  vendasMetaFiltradas
}: DesempenhoCategoriaTrendTableProps) {
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
      case 'fibra':
        return 'FIBRA';
      case 'sky_mais':
        return 'SKY+';
      case 'seguros_pos':
        return 'POS';
      case 'seguros_fibra':
        return 'FIBRA';
      default:
        return 'OUTROS';
    }
  };

  // Função para verificar produtos diferenciais
  const verificarProdutosSecundarios = (produtosSecundarios: string | undefined, formaPagamento?: string) => {
    const produtosUpper = (produtosSecundarios || '').toUpperCase();
    const pagamentoUpper = (formaPagamento || '').toUpperCase();
    
    return {
      temCartaoCredito: pagamentoUpper.includes('CARTÃO DE CRÉDITO') || pagamentoUpper.includes('CARTAO DE CREDITO'),
      temDigitalPecPix: pagamentoUpper.includes('DIGITAL') || 
                       pagamentoUpper.includes('LINHA DIGITÁVEL') || 
                       pagamentoUpper.includes('LINHA DIGITAVEL') ||
                       pagamentoUpper.includes('PEC') || 
                       pagamentoUpper.includes('PIX'),
      temSCobranca: pagamentoUpper.includes('NÃO HÁ COBRANÇA') || 
                   pagamentoUpper.includes('NAO HA COBRANCA') || 
                   pagamentoUpper.includes('SEM COBRANÇA') ||
                   pagamentoUpper.includes('SEM COBRANCA'),
      temSeguroPOS: produtosUpper.includes('FATURA PROTEGIDA') || produtosUpper.includes('SEGURO'),
      temSeguroFibra: produtosUpper.includes('FATURA PROTEGIDA') || produtosUpper.includes('SEGURO')
    };
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
      return { periodos: [], categoriasConsolidadas: new Map(), vendedoresData: new Map(), vendedoresDataPorCategoria: new Map() };
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
      quantidade: number;
      tendencia?: { direction: 'up' | 'down' | 'neutral', percentage: number };
    }>>();

    const categorias = ['POS', 'PRE', 'NP', 'SKY+', 'CARTAO_CREDITO', 'DIGITAL_PEC_PIX', 'S_COBRANCA', 'SEGURO_POS'];
    categorias.forEach(categoria => {
      categoriasConsolidadas.set(categoria, new Map());
    });

    periodosComDados.forEach((periodo, periodoIndex) => {
      const dataAtual = new Date();
      const mesAtual = dataAtual.getMonth() + 1;
      const anoAtual = dataAtual.getFullYear();
      const mesComparacao = periodo.mesIndex + 1;
      const ehMesAtual = mesComparacao === mesAtual && periodo.ano === anoAtual;

      const quantidadePorCategoria = {
        POS: 0,
        PRE: 0,
        NP: 0,
        'SKY+': 0,
        CARTAO_CREDITO: 0,
        DIGITAL_PEC_PIX: 0,
        S_COBRANCA: 0,
        SEGURO_POS: 0
      };

      if (ehMesAtual) {
        const vendasMetaDoPeriodo = vendasMetaFiltradas.filter(vendaMeta => {
          return vendaMeta.mes === mesComparacao && vendaMeta.ano === periodo.ano;
        });

        vendasMetaDoPeriodo.forEach(vendaMeta => {
          const categoria = mapearCategoriaVenda ? mapearCategoriaVenda(vendaMeta) : vendaMeta.categoria;
          const tipo = mapearTipoParaQuadro(categoria);
          
          if (tipo in quantidadePorCategoria) {
            quantidadePorCategoria[tipo as keyof typeof quantidadePorCategoria] += 1;
          }

          const produtosDiferenciais = verificarProdutosSecundarios(vendaMeta.produtos_secundarios, vendaMeta.forma_pagamento);
          
          if (produtosDiferenciais.temCartaoCredito) {
            quantidadePorCategoria.CARTAO_CREDITO += 1;
          }
          
          if (produtosDiferenciais.temDigitalPecPix) {
            quantidadePorCategoria.DIGITAL_PEC_PIX += 1;
          }
          
          if (produtosDiferenciais.temSCobranca) {
            quantidadePorCategoria.S_COBRANCA += 1;
          }
          
          if (produtosDiferenciais.temSeguroPOS && categoria === 'pos_pago') {
            quantidadePorCategoria.SEGURO_POS += 1;
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
          const categoria = mapearCategoriaVenda ? mapearCategoriaVenda(venda) : venda.agrupamento_produto;
          const tipoQuadro = mapearTipoParaQuadro(categoria);
          
          if (tipoQuadro in quantidadePorCategoria) {
            quantidadePorCategoria[tipoQuadro as keyof typeof quantidadePorCategoria] += 1;
          }

          const produtosDiferenciais = verificarProdutosSecundarios(venda.produtos_secundarios, venda.forma_pagamento);
          
          if (produtosDiferenciais.temCartaoCredito) {
            quantidadePorCategoria.CARTAO_CREDITO += 1;
          }
          
          if (produtosDiferenciais.temDigitalPecPix) {
            quantidadePorCategoria.DIGITAL_PEC_PIX += 1;
          }
          
          if (produtosDiferenciais.temSCobranca) {
            quantidadePorCategoria.S_COBRANCA += 1;
          }
          
          if (produtosDiferenciais.temSeguroPOS && categoria === 'pos_pago') {
            quantidadePorCategoria.SEGURO_POS += 1;
          }
        });
      }

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

      categorias.forEach(categoria => {
        const quantidade = quantidadePorCategoria[categoria as keyof typeof quantidadePorCategoria];
        categoriasConsolidadas.get(categoria)!.set(periodoKey, {
          quantidade,
          tendencia: periodoIndex > 0 ? calcularTendencia(
            quantidade,
            categoriasConsolidadas.get(categoria)!.get(periodosFormatados[periodoIndex - 1])?.quantidade || 0
          ) : undefined
        });
      });
    });

    // Dados por vendedor: vendedores como linhas, períodos como colunas (quantidade total por vendedor)
    const vendedoresData = new Map<string, Map<string, {
      quantidade: number;
      tendencia?: { direction: 'up' | 'down' | 'neutral', percentage: number };
    }>>();

    // Dados por vendedor E categoria: vendedor -> categoria -> período -> { quantidade, tendencia }
    const vendedoresDataPorCategoria = new Map<string, Map<string, Map<string, {
      quantidade: number;
      tendencia?: { direction: 'up' | 'down' | 'neutral', percentage: number };
    }>>>();

    vendedoresUnicos.forEach(vendedor => {
      const dadosVendedor = new Map<string, {
        quantidade: number;
        tendencia?: { direction: 'up' | 'down' | 'neutral', percentage: number };
      }>();

      periodosComDados.forEach((periodo, periodoIndex) => {
        const dataAtual = new Date();
        const mesAtual = dataAtual.getMonth() + 1;
        const anoAtual = dataAtual.getFullYear();
        const mesComparacao = periodo.mesIndex + 1;
        const ehMesAtual = mesComparacao === mesAtual && periodo.ano === anoAtual;

        const quantidadePorCategoria = {
          POS: 0,
          PRE: 0,
          NP: 0,
          'SKY+': 0,
          CARTAO_CREDITO: 0,
          DIGITAL_PEC_PIX: 0,
          S_COBRANCA: 0,
          SEGURO_POS: 0
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
            const categoria = mapearCategoriaVenda ? mapearCategoriaVenda(vendaMeta) : vendaMeta.categoria;
            const tipo = mapearTipoParaQuadro(categoria);
            if (tipo in quantidadePorCategoria) {
              quantidadePorCategoria[tipo as keyof typeof quantidadePorCategoria] += 1;
            }

            const produtosDiferenciais = verificarProdutosSecundarios(vendaMeta.produtos_secundarios, vendaMeta.forma_pagamento);
            if (produtosDiferenciais.temCartaoCredito) quantidadePorCategoria.CARTAO_CREDITO += 1;
            if (produtosDiferenciais.temDigitalPecPix) quantidadePorCategoria.DIGITAL_PEC_PIX += 1;
            if (produtosDiferenciais.temSCobranca) quantidadePorCategoria.S_COBRANCA += 1;
            if (produtosDiferenciais.temSeguroPOS && categoria === 'pos_pago') quantidadePorCategoria.SEGURO_POS += 1;
          });
        } else {
          const vendasDoPeriodo = vendasFiltradas.filter(venda => {
            if (!venda.data_habilitacao || venda.nome_proprietario !== vendedor) return false;
            const mesHabilitacao = extrairMesHabilitacao(venda.data_habilitacao);
            const anoHabilitacao = extrairAnoHabilitacao(venda.data_habilitacao);
            return mesHabilitacao === periodo.mes.substring(0, 3) && anoHabilitacao === periodo.ano;
          });

          vendasDoPeriodo.forEach(venda => {
            const categoria = mapearCategoriaVenda ? mapearCategoriaVenda(venda) : venda.agrupamento_produto;
            const tipoQuadro = mapearTipoParaQuadro(categoria);
            if (tipoQuadro in quantidadePorCategoria) {
              quantidadePorCategoria[tipoQuadro as keyof typeof quantidadePorCategoria] += 1;
            }

            const produtosDiferenciais = verificarProdutosSecundarios(venda.produtos_secundarios, venda.forma_pagamento);
            if (produtosDiferenciais.temCartaoCredito) quantidadePorCategoria.CARTAO_CREDITO += 1;
            if (produtosDiferenciais.temDigitalPecPix) quantidadePorCategoria.DIGITAL_PEC_PIX += 1;
            if (produtosDiferenciais.temSCobranca) quantidadePorCategoria.S_COBRANCA += 1;
            if (produtosDiferenciais.temSeguroPOS && categoria === 'pos_pago') quantidadePorCategoria.SEGURO_POS += 1;
          });
        }

        const quantidadeTotal = Object.values(quantidadePorCategoria).reduce((sum, qtd) => sum + qtd, 0);

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
          quantidade: quantidadeTotal,
          tendencia: periodoIndex > 0 ? calcularTendencia(
            quantidadeTotal,
            dadosVendedor.get(periodosFormatados[periodoIndex - 1])?.quantidade || 0
          ) : undefined
        });

        // Armazenar dados por categoria
        if (!vendedoresDataPorCategoria.has(vendedor)) {
          vendedoresDataPorCategoria.set(vendedor, new Map());
        }
        const dadosPorCategoria = vendedoresDataPorCategoria.get(vendedor)!;

        const categoriasParaVendedor = ['POS', 'PRE', 'NP', 'SKY+', 'CARTAO_CREDITO', 'DIGITAL_PEC_PIX', 'S_COBRANCA', 'SEGURO_POS'];
        categoriasParaVendedor.forEach(catKey => {
          if (!dadosPorCategoria.has(catKey)) {
            dadosPorCategoria.set(catKey, new Map());
          }
        });

        categoriasParaVendedor.forEach(catKey => {
          const quantidade = quantidadePorCategoria[catKey as keyof typeof quantidadePorCategoria];
          dadosPorCategoria.get(catKey)!.set(periodoKey, {
            quantidade,
            tendencia: periodoIndex > 0 ? calcularTendencia(
              quantidade,
              dadosPorCategoria.get(catKey)!.get(periodosFormatados[periodoIndex - 1])?.quantidade || 0
            ) : undefined
          });
        });
      });

      vendedoresData.set(vendedor, dadosVendedor);
    });

    return { periodos: periodosFormatados, categoriasConsolidadas, vendedoresData, vendedoresDataPorCategoria };
  }, [filtroMesHabilitacao, filtroAnoHabilitacao, vendasFiltradas, vendasMetaFiltradas, mapearCategoriaVenda, vendedoresUnicos, vendas]);

  const categorias = [
    { key: 'POS', label: 'POS', color: 'text-green-700 bg-green-50/30' },
    { key: 'PRE', label: 'PRE', color: 'text-blue-700 bg-blue-50/30' },
    { key: 'NP', label: 'NP', color: 'text-orange-700 bg-orange-50/30' },
    { key: 'SKY+', label: 'SKY+', color: 'text-indigo-700 bg-indigo-50/30' },
    { key: 'CARTAO_CREDITO', label: 'Cartão Crédito', color: 'text-amber-700 bg-amber-50/30' },
    { key: 'DIGITAL_PEC_PIX', label: 'Digital/PEC/PIX', color: 'text-emerald-700 bg-emerald-50/30' },
    { key: 'S_COBRANCA', label: 'S Cobrança', color: 'text-red-700 bg-red-50/30' },
    { key: 'SEGURO_POS', label: 'Seguro POS', color: 'text-purple-700 bg-purple-50/30' }
  ];

  if (filtroMesHabilitacao.length < 2 || filtroAnoHabilitacao.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Evolução do Desempenho por Categoria
          </CardTitle>
          <CardDescription>
            Acompanhe a evolução das quantidades de vendas por categoria ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-center p-6">
            <div>
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <div className="text-sm text-gray-500 max-w-sm">
                Selecione pelo menos 2 meses e 1 ano nos filtros acima para visualizar a evolução temporal das quantidades por categoria.
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

  // Função helper para renderizar quantidade com tendência
  const renderizarQuantidadeComTendencia = (
    quantidade: number | undefined,
    tendencia: { direction: 'up' | 'down' | 'neutral', percentage: number } | undefined,
    isFirstPeriod: boolean
  ) => {
    if (quantidade === undefined || quantidade === null || quantidade === 0) {
      return <span className="text-gray-400">-</span>;
    }

    return (
      <div className="flex flex-col items-center gap-1">
        <span className="font-medium text-gray-900">{quantidade}</span>
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

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Target className="h-5 w-5 text-blue-600" />
                Evolução do Desempenho por Categoria
              </CardTitle>
              <CardDescription className="text-blue-700">
                Acompanhe a evolução das quantidades de vendas por categoria ao longo do tempo
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={!mostrarPorVendedor ? "default" : "outline"}
                size="sm"
                onClick={() => setMostrarPorVendedor(false)}
                className={!mostrarPorVendedor ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Consolidado
              </Button>
              <Button
                variant={mostrarPorVendedor ? "default" : "outline"}
                size="sm"
                onClick={() => setMostrarPorVendedor(true)}
                className={mostrarPorVendedor ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
              >
                <Users className="h-4 w-4 mr-2" />
                Por Vendedor
              </Button>
            </div>
          </div>
          {mostrarPorVendedor && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-blue-900">Filtrar Vendedores:</label>
              <MultiSelect
                options={opcoesVendedores}
                selected={vendedoresSelecionados}
                onChange={setVendedoresSelecionados}
                placeholder="Selecione vendedores para comparar..."
                className="w-full max-w-md"
              />
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
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
                  className="h-8 px-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100 border-blue-300"
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
                      <TableCell className={`font-semibold text-gray-900 sticky left-0 z-10 bg-inherit border-r-2 border-gray-200 ${categoria.color}`}>
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
                            {renderizarQuantidadeComTendencia(
                              dados?.quantidade,
                              dados?.tendencia,
                              periodoIndex === 0
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
                                  <ChevronDown className="h-4 w-4 text-blue-600" />
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
                              {renderizarQuantidadeComTendencia(
                                dados?.quantidade,
                                dados?.tendencia,
                                periodoIndex === 0
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      
                      {/* Linha expandida com detalhes por categoria */}
                      {isExpanded && dadosPorCategoria && (
                        <TableRow className="bg-blue-50/30">
                          <TableCell colSpan={periodos.length + 1} className="p-4">
                            <div className="bg-white rounded-lg border-2 border-blue-200 p-4 shadow-sm">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Eye className="h-4 w-4 text-blue-600" />
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
                                    {categorias.map((categoria, catIndex) => {
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
                                                {renderizarQuantidadeComTendencia(
                                                  dados?.quantidade,
                                                  dados?.tendencia,
                                                  periodoIndex === 0
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