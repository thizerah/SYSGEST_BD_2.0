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

  // Função para identificar a sigla de um produto
  const getSigla = (venda: Venda): string => {
    const agrupamento = venda.agrupamento_produto || '';
    const produto = venda.produto_principal || '';
    
    if (agrupamento.includes('POS') || produto.includes('POS')) return 'POS';
    if (agrupamento.includes('BL-DGO') || produto.includes('BL-DGO')) return 'BL-DGO';
    
    return '';
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

  // Atualizar configurações quando vendedores mudarem
  React.useEffect(() => {
    // Cores semânticas puras por tipo de métrica
    const coresPorTipo = {
      adimplencia: '#16a34a', // Verde para adimplência
      inadimplencia: '#eab308', // Amarelo para inadimplência  
      cancelados: '#dc2626'     // Vermelho para cancelados
    };

    // Função para gerar variação de cor por tipo de serviço (POS/FIBRA)
    const gerarCorPorTipo = (corBase: string, tipoServico: 'POS' | 'FIBRA') => {
      // Converter cor hex para RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };

      const rgb = hexToRgb(corBase);
      if (!rgb) return corBase;

      // Ajustar intensidade por tipo de serviço
      const intensidade = tipoServico === 'POS' ? 1.0 : 0.8; // POS cor pura, FIBRA mais clara
      
      return `rgb(${Math.round(rgb.r * intensidade)}, ${Math.round(rgb.g * intensidade)}, ${Math.round(rgb.b * intensidade)})`;
    };

    const novasConfigs: TrendChartConfig[] = [];

    // Criar configurações para POS e FIBRA de cada vendedor
    vendedoresUnicos.forEach((vendedor) => {
      // POS - Adimplência (verde)
      novasConfigs.push({
        key: `vendedor_${vendedor.replace(/\s+/g, '_')}_POS_adimplencia`,
        label: `${vendedor} - POS Adimplência`,
        color: gerarCorPorTipo(coresPorTipo.adimplencia, 'POS'),
        visible: false
      });

      // POS - Inadimplência (amarelo)
      novasConfigs.push({
        key: `vendedor_${vendedor.replace(/\s+/g, '_')}_POS_inadimplencia`,
        label: `${vendedor} - POS Inadimplência`,
        color: gerarCorPorTipo(coresPorTipo.inadimplencia, 'POS'),
        visible: false
      });

      // POS - Cancelados (vermelho)
      novasConfigs.push({
        key: `vendedor_${vendedor.replace(/\s+/g, '_')}_POS_cancelados`,
        label: `${vendedor} - POS Cancelados`,
        color: gerarCorPorTipo(coresPorTipo.cancelados, 'POS'),
        visible: false
      });

      // FIBRA - Adimplência (verde)
      novasConfigs.push({
        key: `vendedor_${vendedor.replace(/\s+/g, '_')}_FIBRA_adimplencia`,
        label: `${vendedor} - FIBRA Adimplência`,
        color: gerarCorPorTipo(coresPorTipo.adimplencia, 'FIBRA'),
        visible: false
      });

      // FIBRA - Inadimplência (amarelo)
      novasConfigs.push({
        key: `vendedor_${vendedor.replace(/\s+/g, '_')}_FIBRA_inadimplencia`,
        label: `${vendedor} - FIBRA Inadimplência`,
        color: gerarCorPorTipo(coresPorTipo.inadimplencia, 'FIBRA'),
        visible: false
      });

      // FIBRA - Cancelados (vermelho)
      novasConfigs.push({
        key: `vendedor_${vendedor.replace(/\s+/g, '_')}_FIBRA_cancelados`,
        label: `${vendedor} - FIBRA Cancelados`,
        color: gerarCorPorTipo(coresPorTipo.cancelados, 'FIBRA'),
        visible: false
      });
    });

    setChartConfigs(novasConfigs);
  }, [vendedoresUnicos]);

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

      // Calcular métricas por vendedor e sigla
      const metricasPorVendedorSigla = new Map<string, {
        POS: { adimplentes: number; inadimplentes: number; cancelados: number; total: number };
        FIBRA: { adimplentes: number; inadimplentes: number; cancelados: number; total: number };
      }>();

      vendasDoPeriodo.forEach(venda => {
        const vendedor = venda.nome_proprietario;
        if (!vendedor || vendedor.trim() === '') return;

        const sigla = getSigla(venda);
        if (sigla !== 'POS' && sigla !== 'BL-DGO') return; // Apenas POS e FIBRA (BL-DGO)

        if (!metricasPorVendedorSigla.has(vendedor)) {
          metricasPorVendedorSigla.set(vendedor, {
            POS: { adimplentes: 0, inadimplentes: 0, cancelados: 0, total: 0 },
            FIBRA: { adimplentes: 0, inadimplentes: 0, cancelados: 0, total: 0 }
          });
        }

        const vendedorMetrics = metricasPorVendedorSigla.get(vendedor)!;
        const tipoMetric = sigla === 'POS' ? vendedorMetrics.POS : vendedorMetrics.FIBRA;
        const pagamento = pagamentosMap.get(venda.numero_proposta);

        tipoMetric.total++;

        if (pagamento) {
          if (pagamento.status_pacote === 'C') {
            // Cancelado
            tipoMetric.cancelados++;
          } else if (pagamento.status_pacote === 'S') {
            // Inadimplente (suspenso)
            tipoMetric.inadimplentes++;
          } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
            // Adimplente
            tipoMetric.adimplentes++;
          } else if (pagamento.passo === '0' || pagamento.passo === '1') {
            // Adimplente
            tipoMetric.adimplentes++;
          } else if (pagamento.status_pacote === 'I') {
            // Adimplente (inclusão)
            tipoMetric.adimplentes++;
          } else {
            // Inadimplente (outros casos)
            tipoMetric.inadimplentes++;
          }
        } else if (sigla === 'BL-DGO') {
          // BL-DGO sem pagamento é considerado adimplente
          tipoMetric.adimplentes++;
        }
      });

      // Construir objeto de dados para este período
      const dadosPeriodo: TrendDataPoint = {
        periodo: `${periodo.mes.substring(0, 3)}/${periodo.ano}`,
        mesAno: `${periodo.ano}-${String(periodo.mesIndex + 1).padStart(2, '0')}`
      };

      // Adicionar percentuais apenas para vendedores que têm dados neste período
      vendedoresUnicos.forEach(vendedor => {
        const vendedorMetrics = metricasPorVendedorSigla.get(vendedor);
        
        // Verificar se o vendedor tem dados (POS ou FIBRA) neste período
        const temDadosPOS = vendedorMetrics && vendedorMetrics.POS.total > 0;
        const temDadosFIBRA = vendedorMetrics && vendedorMetrics.FIBRA.total > 0;
        
        // Só adicionar dados se o vendedor tiver vendas no período
        if (temDadosPOS || temDadosFIBRA) {
          // POS - Calcular percentuais (só se tiver dados)
          if (temDadosPOS) {
            const percentualAdimplenciaPOS = (vendedorMetrics!.POS.adimplentes / vendedorMetrics!.POS.total) * 100;
            const percentualInadimplenciaPOS = (vendedorMetrics!.POS.inadimplentes / vendedorMetrics!.POS.total) * 100;
            const percentualCanceladosPOS = (vendedorMetrics!.POS.cancelados / vendedorMetrics!.POS.total) * 100;
            
            dadosPeriodo[`vendedor_${vendedor.replace(/\s+/g, '_')}_POS_adimplencia`] = Number(percentualAdimplenciaPOS.toFixed(2));
            dadosPeriodo[`vendedor_${vendedor.replace(/\s+/g, '_')}_POS_inadimplencia`] = Number(percentualInadimplenciaPOS.toFixed(2));
            dadosPeriodo[`vendedor_${vendedor.replace(/\s+/g, '_')}_POS_cancelados`] = Number(percentualCanceladosPOS.toFixed(2));
          }
          
          // FIBRA - Calcular percentuais (só se tiver dados)
          if (temDadosFIBRA) {
            const percentualAdimplenciaFIBRA = (vendedorMetrics!.FIBRA.adimplentes / vendedorMetrics!.FIBRA.total) * 100;
            const percentualInadimplenciaFIBRA = (vendedorMetrics!.FIBRA.inadimplentes / vendedorMetrics!.FIBRA.total) * 100;
            const percentualCanceladosFIBRA = (vendedorMetrics!.FIBRA.cancelados / vendedorMetrics!.FIBRA.total) * 100;
            
            dadosPeriodo[`vendedor_${vendedor.replace(/\s+/g, '_')}_FIBRA_adimplencia`] = Number(percentualAdimplenciaFIBRA.toFixed(2));
            dadosPeriodo[`vendedor_${vendedor.replace(/\s+/g, '_')}_FIBRA_inadimplencia`] = Number(percentualInadimplenciaFIBRA.toFixed(2));
            dadosPeriodo[`vendedor_${vendedor.replace(/\s+/g, '_')}_FIBRA_cancelados`] = Number(percentualCanceladosFIBRA.toFixed(2));
          }
        }
      });

      return dadosPeriodo;
    });
  }, [filtroMesPermanencia, filtroAnoPermanencia, vendasFiltradas, primeirosPagamentos, vendedoresUnicos]);

  return (
    <TrendChartsContainer
      title="Evolução da Permanência por Vendedor (%)"
      description="Percentual de adimplência, inadimplência e cancelados por vendedor ao longo do tempo (valores entre 0% e 100%)"
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