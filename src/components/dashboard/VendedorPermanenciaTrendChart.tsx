import React, { useState, useMemo } from 'react';
import { TrendChartsContainer, TrendDataPoint, TrendChartConfig } from './TrendChartsContainer';
import useData from "@/context/useData";
import { Venda, PrimeiroPagamento } from '@/types';

interface VendedorPermanenciaTrendChartProps {
  filtroMesPermanencia: string[];
  filtroAnoPermanencia: string[];
  vendasFiltradas: Venda[];
  chartHeight?: number;
  containerMaxWidth?: string;
  containerClassName?: string;
}

export function VendedorPermanenciaTrendChart({
  filtroMesPermanencia,
  filtroAnoPermanencia,
  vendasFiltradas,
  chartHeight,
  containerMaxWidth,
  containerClassName
}: VendedorPermanenciaTrendChartProps) {
  const { primeirosPagamentos } = useData();

  // Configurações iniciais dos indicadores por vendedor
  const [chartConfigs, setChartConfigs] = useState<TrendChartConfig[]>([]);

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

  // Obter vendedores únicos e gerar configurações dinâmicas
  const vendedoresUnicos = useMemo(() => {
    const vendedores = new Set<string>();
    vendasFiltradas.forEach(venda => {
      if (venda.nome_proprietario && venda.nome_proprietario.trim() !== '') {
        vendedores.add(venda.nome_proprietario);
      }
    });
    return Array.from(vendedores).sort();
  }, [vendasFiltradas]);

  // Processar dados para calcular top 5 vendedores
  const dadosParaTopVendedores = useMemo(() => {
    if (filtroMesPermanencia.length < 2 || filtroAnoPermanencia.length === 0) {
      return [];
    }

    // Criar mapa de pagamentos por proposta
    const pagamentosMap = new Map<string, PrimeiroPagamento>();
    primeirosPagamentos.forEach(pagamento => {
      pagamentosMap.set(pagamento.proposta, pagamento);
    });

    // Calcular métricas por vendedor (apenas POS)
    const metricasPorVendedor = new Map<string, {
      adimplentes: number;
      total: number;
      mediaAdimplencia: number;
    }>();

    vendasFiltradas.forEach(venda => {
      const vendedor = venda.nome_proprietario;
      if (!vendedor || vendedor.trim() === '') return;

      const sigla = getSigla(venda);
      if (sigla !== 'POS') return; // Apenas POS

      if (!metricasPorVendedor.has(vendedor)) {
        metricasPorVendedor.set(vendedor, {
          adimplentes: 0,
          total: 0,
          mediaAdimplencia: 0
        });
      }

      const vendedorMetrics = metricasPorVendedor.get(vendedor)!;
      const pagamento = pagamentosMap.get(venda.numero_proposta);

      vendedorMetrics.total++;

      if (pagamento) {
        if (pagamento.status_pacote === 'C') {
          // Cancelado - não conta como adimplente
        } else if (pagamento.status_pacote === 'S') {
          // Inadimplente
        } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
          // Adimplente
          vendedorMetrics.adimplentes++;
        } else if (pagamento.passo === '0' || pagamento.passo === '1') {
          // Adimplente
          vendedorMetrics.adimplentes++;
        } else if (pagamento.status_pacote === 'I') {
          // Adimplente (inclusão)
          vendedorMetrics.adimplentes++;
        }
      }
    });

    // Calcular média de adimplência por vendedor
    metricasPorVendedor.forEach((metrics, vendedor) => {
      metrics.mediaAdimplencia = metrics.total > 0 
        ? (metrics.adimplentes / metrics.total) * 100 
        : 0;
    });

    // Ordenar vendedores por volume total (total de vendas) ou por adimplência
    // Priorizando volume para identificar top performers
    return Array.from(metricasPorVendedor.entries())
      .sort((a, b) => {
        // Primeiro por volume total (decrescente)
        if (b[1].total !== a[1].total) {
          return b[1].total - a[1].total;
        }
        // Se empate, por adimplência (decrescente)
        return b[1].mediaAdimplencia - a[1].mediaAdimplencia;
      });
  }, [filtroMesPermanencia, filtroAnoPermanencia, vendasFiltradas, primeirosPagamentos]);

  // Atualizar configurações quando vendedores mudarem - Apenas % Adimplência POS
  React.useEffect(() => {
    // Gerar cores distintas para cada vendedor
    const gerarCorParaVendedor = (index: number, total: number): string => {
      // Paleta de cores harmoniosas
      const cores = [
        '#16a34a', // green-600
        '#2563eb', // blue-600
        '#7c3aed', // violet-600
        '#dc2626', // red-600
        '#ea580c', // orange-600
        '#0891b2', // cyan-600
        '#059669', // emerald-600
        '#9333ea', // purple-600
        '#be185d', // pink-700
        '#ca8a04', // yellow-600
      ];

      // Usar cores da paleta primeiro
      if (index < cores.length) {
        return cores[index];
      }

      // Para mais vendedores, gerar cores gradativamente
      const hue = (index * 137.508) % 360; // Golden angle para distribuição uniforme
      return `hsl(${hue}, 70%, 50%)`;
    };

    const novasConfigs: TrendChartConfig[] = [];
    const top5Vendedores = dadosParaTopVendedores.slice(0, 5).map(([vendedor]) => vendedor);

    // Criar configurações apenas para % Adimplência POS de cada vendedor
    vendedoresUnicos.forEach((vendedor, index) => {
      const isTop5 = top5Vendedores.includes(vendedor);
      
      novasConfigs.push({
        key: `vendedor_${vendedor.replace(/\s+/g, '_')}_POS_adimplencia`,
        label: `${vendedor} - Adimplência POS (%)`,
        color: gerarCorParaVendedor(index, vendedoresUnicos.length),
        visible: isTop5 // Top 5 pré-selecionados
      });
    });

    setChartConfigs(novasConfigs);
  }, [vendedoresUnicos, dadosParaTopVendedores]);

  // Processar dados para o gráfico
  const chartData: TrendDataPoint[] = useMemo(() => {
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

    return periodos.map(periodo => {
      // Filtrar vendas para este período específico
      const vendasDoPeriodo = vendasFiltradas.filter(venda => {
        if (!venda.data_habilitacao) return false;
        
        const mesPermanencia = calcularMesPermanencia(venda.data_habilitacao);
        const anoPermanencia = calcularAnoPermanencia(venda.data_habilitacao);
        
        return mesPermanencia === periodo.mes.substring(0, 3) && anoPermanencia === periodo.ano;
      });

      // Calcular métricas por vendedor (apenas POS)
      const metricasPorVendedor = new Map<string, {
        adimplentes: number;
        inadimplentes: number;
        cancelados: number;
        total: number;
      }>();

      vendasDoPeriodo.forEach(venda => {
        const vendedor = venda.nome_proprietario;
        if (!vendedor || vendedor.trim() === '') return;

        const sigla = getSigla(venda);
        if (sigla !== 'POS') return; // Apenas POS

        if (!metricasPorVendedor.has(vendedor)) {
          metricasPorVendedor.set(vendedor, {
            adimplentes: 0,
            inadimplentes: 0,
            cancelados: 0,
            total: 0
          });
        }

        const vendedorMetrics = metricasPorVendedor.get(vendedor)!;
        const pagamento = pagamentosMap.get(venda.numero_proposta);

        vendedorMetrics.total++;

        if (pagamento) {
          if (pagamento.status_pacote === 'C') {
            // Cancelado
            vendedorMetrics.cancelados++;
          } else if (pagamento.status_pacote === 'S') {
            // Inadimplente (suspenso)
            vendedorMetrics.inadimplentes++;
          } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
            // Adimplente
            vendedorMetrics.adimplentes++;
          } else if (pagamento.passo === '0' || pagamento.passo === '1') {
            // Adimplente
            vendedorMetrics.adimplentes++;
          } else if (pagamento.status_pacote === 'I') {
            // Adimplente (inclusão)
            vendedorMetrics.adimplentes++;
          } else {
            // Inadimplente (outros casos)
            vendedorMetrics.inadimplentes++;
          }
        }
      });

      // Construir objeto de dados para este período
      const dadosPeriodo: TrendDataPoint = {
        periodo: `${periodo.mes.substring(0, 3)}/${periodo.ano}`,
        mesAno: `${periodo.ano}-${String(periodo.mesIndex + 1).padStart(2, '0')}`
      };

      // Adicionar percentuais apenas para vendedores que têm dados neste período (apenas % Adimplência POS)
      vendedoresUnicos.forEach(vendedor => {
        const vendedorMetrics = metricasPorVendedor.get(vendedor);
        
        // Verificar se o vendedor tem dados POS neste período
        const temDadosPOS = vendedorMetrics && vendedorMetrics.total > 0;
        
        // Só adicionar dados se o vendedor tiver vendas no período
        if (temDadosPOS) {
          // Calcular apenas % Adimplência POS
          const percentualAdimplenciaPOS = (vendedorMetrics!.adimplentes / vendedorMetrics!.total) * 100;
          
          dadosPeriodo[`vendedor_${vendedor.replace(/\s+/g, '_')}_POS_adimplencia`] = Number(percentualAdimplenciaPOS.toFixed(2));
        }
      });

      return dadosPeriodo;
    });
  }, [filtroMesPermanencia, filtroAnoPermanencia, vendasFiltradas, primeirosPagamentos, vendedoresUnicos]);

  return (
    <TrendChartsContainer
      title="Evolução da Permanência por Vendedor (%)"
      description="Percentual de adimplência POS por vendedor ao longo do tempo. Top 5 vendedores são pré-selecionados automaticamente."
      data={chartData}
      chartConfigs={chartConfigs}
      onConfigChange={setChartConfigs}
      showMetaLines={false}
      emptyMessage="Selecione pelo menos 2 meses e 1 ano nos filtros acima para visualizar a evolução temporal da permanência por vendedor."
      formatTooltipValue={(value, name) => `${Number(value).toFixed(2)}%`}
      formatYAxisLabel={(value) => `${Number(value).toFixed(2)}%`}
      groupByVendedor={true}
      showToggleAllButton={true}
      chartHeight={chartHeight}
      containerMaxWidth={containerMaxWidth}
      containerClassName={containerClassName}
    />
  );
} 