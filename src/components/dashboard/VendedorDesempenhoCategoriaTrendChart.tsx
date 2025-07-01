import React, { useState, useMemo } from 'react';
import { TrendChartsContainer, TrendDataPoint, TrendChartConfig } from './TrendChartsContainer';
import useData from "@/context/useData";
import { Venda, VendaMeta } from '@/types';

interface VendedorDesempenhoCategoriaTrendChartProps {
  filtroMesHabilitacao: string[];
  filtroAnoHabilitacao: string[];
  vendasFiltradas: Venda[];
  vendasMetaFiltradas: VendaMeta[];
  chartHeight?: number;
  containerMaxWidth?: string;
  containerClassName?: string;
}

export function VendedorDesempenhoCategoriaTrendChart({
  filtroMesHabilitacao,
  filtroAnoHabilitacao,
  vendasFiltradas,
  vendasMetaFiltradas,
  chartHeight,
  containerMaxWidth,
  containerClassName
}: VendedorDesempenhoCategoriaTrendChartProps) {
  const { mapearCategoriaVenda, vendas } = useData();

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

  // Função para mapear categoria para os tipos do quadro (mesma lógica do componente que funciona)
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

  // Função para ajustar intensidade da cor
  const adjustColorIntensity = (hexColor: string, intensity: number): string => {
    // Remove o # se presente
    const hex = hexColor.replace('#', '');
    
    // Converte para RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Ajusta a intensidade
    const newR = Math.round(r * intensity);
    const newG = Math.round(g * intensity);
    const newB = Math.round(b * intensity);
    
    // Converte de volta para hex
    const toHex = (c: number) => {
      const hex = c.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  };

  // Obter vendedores únicos e criar configurações
  const { vendedoresUnicos, chartConfigs } = useMemo(() => {
    const vendedoresSet = new Set<string>();
    
    // Coletar vendedores das vendas de permanência
    vendasFiltradas.forEach(venda => {
      if (venda.nome_proprietario && venda.nome_proprietario.trim() !== '') {
        vendedoresSet.add(venda.nome_proprietario);
      }
    });
    
    // Coletar vendedores das vendas meta
    vendasMetaFiltradas.forEach(vendaMeta => {
      const id = vendaMeta.vendedor;
      const vendaExistente = vendas.find(v => v.id_vendedor === id);
      const nomeVendedor = vendaExistente?.nome_proprietario && vendaExistente.nome_proprietario !== id 
        ? vendaExistente.nome_proprietario 
        : id;
      
      if (nomeVendedor && nomeVendedor.trim() !== '') {
        vendedoresSet.add(nomeVendedor);
      }
    });
    
    const vendedoresArray = Array.from(vendedoresSet).sort();

    // Criar configurações
    const coresBase = [
      '#16a34a', '#2563eb', '#7c3aed', '#dc2626', '#ea580c',
      '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#f97316',
      '#059669', '#1d4ed8', '#9333ea', '#b91c1c', '#c2410c'
    ];

    const configs: TrendChartConfig[] = [];

    vendedoresArray.forEach((vendedor, vendedorIndex) => {
      const corBase = coresBase[vendedorIndex % coresBase.length];
      
      // Primeiro, adicionar as categorias principais
      const categoriasPrincipais = ['POS', 'PRE', 'FIBRA', 'NP', 'SKY+'];
      
      categoriasPrincipais.forEach((categoria, categoriaIndex) => {
        // Ajustar intensidade da cor baseada na categoria
        const intensidade = 1.0 - (categoriaIndex * 0.15); // Varia de 1.0 a 0.25
        const cor = adjustColorIntensity(corBase, intensidade);
        
        configs.push({
          key: `${vendedor.replace(/\s+/g, '_')}_${categoria}`,
          label: `${vendedor} - ${categoria}`,
          color: cor,
          visible: false // Iniciar desmarcado para evitar poluição visual
        });
      });

      // Depois, adicionar os produtos diferenciais com cores mais diferenciadas
      const produtosDiferenciais = [
        { key: 'CARTAO_CREDITO', label: 'Cartão de Crédito', color: '#f59e0b' },
        { key: 'DIGITAL_PEC_PIX', label: 'Digital/PEC/PIX', color: '#10b981' },
        { key: 'S_COBRANCA', label: 'S Cobrança', color: '#f97316' },
        { key: 'SEGURO_POS', label: 'Seguro POS', color: '#8b5cf6' },
        { key: 'SEGURO_FIBRA', label: 'Seguro Fibra', color: '#ec4899' }
      ];
      
      produtosDiferenciais.forEach((produto) => {
        configs.push({
          key: `${vendedor.replace(/\s+/g, '_')}_${produto.key}`,
          label: `${vendedor} - ${produto.label}`,
          color: produto.color,
          visible: false // Iniciar desmarcado para evitar poluição visual
        });
      });
    });

    return {
      vendedoresUnicos: vendedoresArray,
      chartConfigs: configs
    };
  }, [vendasFiltradas, vendasMetaFiltradas, vendas]);

  // Estado para as configurações do gráfico
  const [chartConfigsState, setChartConfigsState] = useState<TrendChartConfig[]>([]);

  // Atualizar configurações quando mudarem
  React.useEffect(() => {
    setChartConfigsState(chartConfigs);
  }, [chartConfigs]);

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

    const resultData = periodosComDados.map(periodo => {
      // Determinar se é mês atual (busca vendas meta) ou mês anterior (busca vendas permanência)
      const dataAtual = new Date();
      const mesAtual = dataAtual.getMonth() + 1;
      const anoAtual = dataAtual.getFullYear();
      const mesComparacao = periodo.mesIndex + 1;
      const ehMesAtual = mesComparacao === mesAtual && periodo.ano === anoAtual;

      // Calcular quantidades por vendedor e categoria
      const quantidadePorVendedorCategoria = new Map<string, number>();

      if (ehMesAtual) {
        // Para o mês atual, usar dados de VENDAS META
        const vendasMetaDoPeriodo = vendasMetaFiltradas.filter(vendaMeta => {
          return vendaMeta.mes === mesComparacao && vendaMeta.ano === periodo.ano;
        });

        vendasMetaDoPeriodo.forEach(vendaMeta => {
          const id = vendaMeta.vendedor;
          const vendaExistente = vendas.find(v => v.id_vendedor === id);
          const nomeVendedor = vendaExistente?.nome_proprietario && vendaExistente.nome_proprietario !== id 
            ? vendaExistente.nome_proprietario 
            : id;
          
          // Usar a função mapearCategoriaVenda do contexto para consistência
          const categoria = mapearCategoriaVenda ? mapearCategoriaVenda(vendaMeta) : vendaMeta.categoria;
          const tipo = mapearTipoParaQuadro(categoria);

          if (nomeVendedor && nomeVendedor.trim() !== '' && tipo !== 'OUTROS') {
            const chave = `${nomeVendedor.replace(/\s+/g, '_')}_${tipo}`;
            const quantidadeAtual = quantidadePorVendedorCategoria.get(chave) || 0;
            quantidadePorVendedorCategoria.set(chave, quantidadeAtual + 1);
          }

          // Verificar produtos diferenciais nas vendas meta
          if (nomeVendedor && nomeVendedor.trim() !== '') {
            const produtosDiferenciais = verificarProdutosSecundarios(vendaMeta.produtos_secundarios, vendaMeta.forma_pagamento);
            
            if (produtosDiferenciais.temCartaoCredito) {
              const chave = `${nomeVendedor.replace(/\s+/g, '_')}_CARTAO_CREDITO`;
              const quantidadeAtual = quantidadePorVendedorCategoria.get(chave) || 0;
              quantidadePorVendedorCategoria.set(chave, quantidadeAtual + 1);
            }
            
            if (produtosDiferenciais.temDigitalPecPix) {
              const chave = `${nomeVendedor.replace(/\s+/g, '_')}_DIGITAL_PEC_PIX`;
              const quantidadeAtual = quantidadePorVendedorCategoria.get(chave) || 0;
              quantidadePorVendedorCategoria.set(chave, quantidadeAtual + 1);
            }
            
            if (produtosDiferenciais.temSCobranca) {
              const chave = `${nomeVendedor.replace(/\s+/g, '_')}_S_COBRANCA`;
              const quantidadeAtual = quantidadePorVendedorCategoria.get(chave) || 0;
              quantidadePorVendedorCategoria.set(chave, quantidadeAtual + 1);
            }
            
            // Para seguros, verificar também a categoria base
            if (produtosDiferenciais.temSeguroPOS && categoria === 'pos_pago') {
              const chave = `${nomeVendedor.replace(/\s+/g, '_')}_SEGURO_POS`;
              const quantidadeAtual = quantidadePorVendedorCategoria.get(chave) || 0;
              quantidadePorVendedorCategoria.set(chave, quantidadeAtual + 1);
            }
            
            if (produtosDiferenciais.temSeguroFibra && categoria === 'fibra') {
              const chave = `${nomeVendedor.replace(/\s+/g, '_')}_SEGURO_FIBRA`;
              const quantidadeAtual = quantidadePorVendedorCategoria.get(chave) || 0;
              quantidadePorVendedorCategoria.set(chave, quantidadeAtual + 1);
            }
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
          const vendedor = venda.nome_proprietario;
          const categoria = mapearCategoriaVenda ? mapearCategoriaVenda(venda) : venda.agrupamento_produto;
          const tipoQuadro = mapearTipoParaQuadro(categoria);
          
          if (vendedor && vendedor.trim() !== '' && tipoQuadro !== 'OUTROS') {
            const chave = `${vendedor.replace(/\s+/g, '_')}_${tipoQuadro}`;
            const quantidadeAtual = quantidadePorVendedorCategoria.get(chave) || 0;
            quantidadePorVendedorCategoria.set(chave, quantidadeAtual + 1);
          }

          // Verificar produtos diferenciais nas vendas de permanência
          if (vendedor && vendedor.trim() !== '') {
            const produtosDiferenciais = verificarProdutosSecundarios(venda.produtos_secundarios, venda.forma_pagamento);
            
            if (produtosDiferenciais.temCartaoCredito) {
              const chave = `${vendedor.replace(/\s+/g, '_')}_CARTAO_CREDITO`;
              const quantidadeAtual = quantidadePorVendedorCategoria.get(chave) || 0;
              quantidadePorVendedorCategoria.set(chave, quantidadeAtual + 1);
            }
            
            if (produtosDiferenciais.temDigitalPecPix) {
              const chave = `${vendedor.replace(/\s+/g, '_')}_DIGITAL_PEC_PIX`;
              const quantidadeAtual = quantidadePorVendedorCategoria.get(chave) || 0;
              quantidadePorVendedorCategoria.set(chave, quantidadeAtual + 1);
            }
            
            if (produtosDiferenciais.temSCobranca) {
              const chave = `${vendedor.replace(/\s+/g, '_')}_S_COBRANCA`;
              const quantidadeAtual = quantidadePorVendedorCategoria.get(chave) || 0;
              quantidadePorVendedorCategoria.set(chave, quantidadeAtual + 1);
            }
            
            // Para seguros, verificar também a categoria base
            if (produtosDiferenciais.temSeguroPOS && categoria === 'pos_pago') {
              const chave = `${vendedor.replace(/\s+/g, '_')}_SEGURO_POS`;
              const quantidadeAtual = quantidadePorVendedorCategoria.get(chave) || 0;
              quantidadePorVendedorCategoria.set(chave, quantidadeAtual + 1);
            }
            
            if (produtosDiferenciais.temSeguroFibra && categoria === 'fibra') {
              const chave = `${vendedor.replace(/\s+/g, '_')}_SEGURO_FIBRA`;
              const quantidadeAtual = quantidadePorVendedorCategoria.get(chave) || 0;
              quantidadePorVendedorCategoria.set(chave, quantidadeAtual + 1);
            }
          }
        });
      }

      // Construir objeto de dados para este período
      const dadosPeriodo: TrendDataPoint = {
        periodo: `${periodo.mes.substring(0, 3)}/${periodo.ano}`,
        mesAno: `${periodo.ano}-${String(periodo.mesIndex + 1).padStart(2, '0')}`
      };

      // Adicionar quantidades para todas as combinações vendedor-categoria (incluindo produtos diferenciais)
      vendedoresUnicos.forEach(vendedor => {
        const categorias = ['POS', 'PRE', 'FIBRA', 'NP', 'SKY+', 'CARTAO_CREDITO', 'DIGITAL_PEC_PIX', 'S_COBRANCA', 'SEGURO_POS', 'SEGURO_FIBRA'];
        categorias.forEach(categoria => {
          const chave = `${vendedor.replace(/\s+/g, '_')}_${categoria}`;
          const quantidade = quantidadePorVendedorCategoria.get(chave) || 0;
          dadosPeriodo[chave] = quantidade;
        });
      });

      return dadosPeriodo;
    });

    return resultData;
  }, [filtroMesHabilitacao, filtroAnoHabilitacao, vendasFiltradas, vendasMetaFiltradas, vendedoresUnicos, vendas, mapearCategoriaVenda]);

  return (
    <TrendChartsContainer
      title="Evolução do Desempenho por Categoria por Vendedor"
      description="Acompanhe a evolução das quantidades de vendas por categoria de cada vendedor ao longo do tempo"
      data={chartData}
      chartConfigs={chartConfigsState}
      onConfigChange={setChartConfigsState}
      showMetaLines={false}
      emptyMessage="Selecione pelo menos 2 meses e 1 ano nos filtros acima para visualizar a evolução temporal do desempenho por categoria e vendedor."
      formatTooltipValue={(value, name) => `${Number(value)} vendas`}
      formatYAxisLabel={(value) => `${Number(value)}`}
      groupByVendedor={true}
      showToggleAllButton={true}
      chartHeight={chartHeight}
      containerMaxWidth={containerMaxWidth}
      containerClassName={containerClassName}
    />
  );
} 