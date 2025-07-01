import React, { useState, useMemo } from 'react';
import { TrendChartsContainer, TrendDataPoint, TrendChartConfig } from './TrendChartsContainer';
import useData from "@/context/useData";
import { Venda, VendaMeta } from '@/types';

interface VendedorDesempenhoTrendChartProps {
  filtroMesHabilitacao: string[];
  filtroAnoHabilitacao: string[];
  vendasFiltradas: Venda[];
  vendasMetaFiltradas: VendaMeta[];
  chartHeight?: number;
  containerMaxWidth?: string;
  containerClassName?: string;
}

export function VendedorDesempenhoTrendChart({
  filtroMesHabilitacao,
  filtroAnoHabilitacao,
  vendasFiltradas,
  vendasMetaFiltradas,
  chartHeight,
  containerMaxWidth,
  containerClassName
}: VendedorDesempenhoTrendChartProps) {
  const { mapearCategoriaVenda, vendas } = useData();

  // Configurações iniciais dos indicadores por categoria
  const [chartConfigs, setChartConfigs] = useState<TrendChartConfig[]>([
    { key: 'POS', label: 'POS', color: '#16a34a', visible: true },
    { key: 'PRE', label: 'PRE', color: '#2563eb', visible: true },
    { key: 'FIBRA', label: 'FIBRA', color: '#7c3aed', visible: true },
    { key: 'NP', label: 'NP', color: '#dc2626', visible: true },
    { key: 'SKY+', label: 'SKY+', color: '#ea580c', visible: true },
    // --- PRODUTOS DIFERENCIAIS ---
    { key: 'CARTAO_CREDITO', label: 'Cartão de Crédito', color: '#f59e0b', visible: false },
    { key: 'DIGITAL_PEC_PIX', label: 'Digital/PEC/PIX', color: '#10b981', visible: false },
    { key: 'S_COBRANCA', label: 'S Cobrança', color: '#f97316', visible: false },
    { key: 'SEGURO_POS', label: 'Seguro POS', color: '#8b5cf6', visible: false },
    { key: 'SEGURO_FIBRA', label: 'Seguro Fibra', color: '#ec4899', visible: false }
  ]);

  // Função para extrair mês da data de habilitação
  const extrairMesHabilitacao = (dataHabilitacao: string): string => {
    const data = new Date(dataHabilitacao);
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
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
      // Digital/PEC/PIX: verificar no campo forma_pagamento por "DIGITAL", "LINHA DIGITÁVEL", "PEC" ou "PIX"
      temDigitalPecPix: pagamentoUpper.includes('DIGITAL') || 
                       pagamentoUpper.includes('LINHA DIGITÁVEL') || 
                       pagamentoUpper.includes('LINHA DIGITAVEL') ||
                       pagamentoUpper.includes('PEC') || 
                       pagamentoUpper.includes('PIX'),
      // S Cobrança: verificar no campo forma_pagamento por "NÃO HÁ COBRANÇA"
      temSCobranca: pagamentoUpper.includes('NÃO HÁ COBRANÇA') || 
                   pagamentoUpper.includes('NAO HA COBRANCA') || 
                   pagamentoUpper.includes('SEM COBRANÇA') ||
                   pagamentoUpper.includes('SEM COBRANCA'),
      // Seguros: verificar no campo produtos_secundarios
      temSeguroPOS: produtosUpper.includes('FATURA PROTEGIDA') || produtosUpper.includes('SEGURO'),
      temSeguroFibra: produtosUpper.includes('FATURA PROTEGIDA') || produtosUpper.includes('SEGURO')
    };
  };

  // Processar dados para o gráfico
  const chartData: TrendDataPoint[] = useMemo(() => {
    if (filtroMesHabilitacao.length < 2 || filtroAnoHabilitacao.length === 0) {
      return [];
    }

    // Criar combinações de mês/ano
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

    // Ordenar períodos cronologicamente
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
        // Verificar se há vendas meta para este período
        const temVendasMeta = vendasMetaFiltradas.some(vendaMeta => 
          vendaMeta.mes === mesComparacao && vendaMeta.ano === periodo.ano
        );
        return temVendasMeta;
      } else {
        // Verificar se há vendas de permanência para este período
        const temVendasPermanencia = vendasFiltradas.some(venda => {
          if (!venda.data_habilitacao) return false;
          const mesHabilitacao = extrairMesHabilitacao(venda.data_habilitacao);
          const anoHabilitacao = extrairAnoHabilitacao(venda.data_habilitacao);
          return mesHabilitacao === periodo.mes.substring(0, 3) && anoHabilitacao === periodo.ano;
        });
        return temVendasPermanencia;
      }
    });

    return periodosComDados.map(periodo => {
      // Determinar se é mês atual (busca vendas meta) ou mês anterior (busca vendas permanência)
      const dataAtual = new Date();
      const mesAtual = dataAtual.getMonth() + 1;
      const anoAtual = dataAtual.getFullYear();
      const mesComparacao = periodo.mesIndex + 1;
      const ehMesAtual = mesComparacao === mesAtual && periodo.ano === anoAtual;

      // Inicializar contadores por categoria
      const quantidadePorCategoria = {
        POS: 0,
        PRE: 0,
        FIBRA: 0,
        NP: 0,
        'SKY+': 0,
        // --- PRODUTOS DIFERENCIAIS ---
        CARTAO_CREDITO: 0,
        DIGITAL_PEC_PIX: 0,
        S_COBRANCA: 0,
        SEGURO_POS: 0,
        SEGURO_FIBRA: 0
      };

      if (ehMesAtual) {
        // Para o mês atual, usar dados de VENDAS META
        const vendasMetaDoPeriodo = vendasMetaFiltradas.filter(vendaMeta => {
          return vendaMeta.mes === mesComparacao && vendaMeta.ano === periodo.ano;
        });

        vendasMetaDoPeriodo.forEach(vendaMeta => {
          // Usar a função mapearCategoriaVenda do contexto para consistência
          const categoria = mapearCategoriaVenda ? mapearCategoriaVenda(vendaMeta) : vendaMeta.categoria;
          const tipo = mapearTipoParaQuadro(categoria);
          
          if (tipo in quantidadePorCategoria) {
            quantidadePorCategoria[tipo as keyof typeof quantidadePorCategoria] += 1;
          }

          // Verificar produtos diferenciais nas vendas meta
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
          
          // Para seguros, verificar também a categoria base
          if (produtosDiferenciais.temSeguroPOS && categoria === 'pos_pago') {
            quantidadePorCategoria.SEGURO_POS += 1;
          }
          
          if (produtosDiferenciais.temSeguroFibra && categoria === 'fibra') {
            quantidadePorCategoria.SEGURO_FIBRA += 1;
          }
        });
      } else {
        // Para meses anteriores, usar dados de VENDAS PERMANÊNCIA
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

          // Verificar produtos diferenciais nas vendas de permanência
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
          
          // Para seguros, verificar também a categoria base
          if (produtosDiferenciais.temSeguroPOS && categoria === 'pos_pago') {
            quantidadePorCategoria.SEGURO_POS += 1;
          }
          
          if (produtosDiferenciais.temSeguroFibra && categoria === 'fibra') {
            quantidadePorCategoria.SEGURO_FIBRA += 1;
          }
        });
      }

      // Construir objeto de dados para este período
      const dadosPeriodo: TrendDataPoint = {
        periodo: `${periodo.mes.substring(0, 3)}/${periodo.ano}`,
        mesAno: `${periodo.ano}-${String(periodo.mesIndex + 1).padStart(2, '0')}`,
        POS: quantidadePorCategoria.POS,
        PRE: quantidadePorCategoria.PRE,
        FIBRA: quantidadePorCategoria.FIBRA,
        NP: quantidadePorCategoria.NP,
        'SKY+': quantidadePorCategoria['SKY+'],
        // --- PRODUTOS DIFERENCIAIS ---
        CARTAO_CREDITO: quantidadePorCategoria.CARTAO_CREDITO,
        DIGITAL_PEC_PIX: quantidadePorCategoria.DIGITAL_PEC_PIX,
        S_COBRANCA: quantidadePorCategoria.S_COBRANCA,
        SEGURO_POS: quantidadePorCategoria.SEGURO_POS,
        SEGURO_FIBRA: quantidadePorCategoria.SEGURO_FIBRA
      };

      return dadosPeriodo;
    });
  }, [filtroMesHabilitacao, filtroAnoHabilitacao, vendasFiltradas, vendasMetaFiltradas, mapearCategoriaVenda]);

  return (
    <TrendChartsContainer
      title="Evolução do Desempenho por Categoria"
      description="Acompanhe a evolução das quantidades de vendas por categoria ao longo do tempo"
      data={chartData}
      chartConfigs={chartConfigs}
      onConfigChange={setChartConfigs}
      showMetaLines={false}
      emptyMessage="Selecione pelo menos 2 meses e 1 ano nos filtros acima para visualizar a evolução temporal das quantidades por categoria."
      formatTooltipValue={(value, name) => `${Number(value)} vendas`}
      formatYAxisLabel={(value) => `${Number(value)}`}
      groupByVendedor={false}
      showToggleAllButton={true}
      chartHeight={chartHeight}
      containerMaxWidth={containerMaxWidth}
      containerClassName={containerClassName}
    />
  );
} 