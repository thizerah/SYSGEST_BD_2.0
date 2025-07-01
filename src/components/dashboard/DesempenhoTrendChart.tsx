import React, { useState, useMemo } from 'react';
import { TrendChartsContainer, TrendDataPoint, TrendChartConfig } from './TrendChartsContainer';
import useData from "@/context/useData";
import { Venda, VendaMeta } from '@/types';

interface DesempenhoTrendChartProps {
  filtroMesHabilitacao: string[];
  filtroAnoHabilitacao: string[];
  vendasFiltradas: Venda[];
  vendasMetaFiltradas: VendaMeta[];
  chartHeight?: number;
  containerMaxWidth?: string;
  containerClassName?: string;
}

export function DesempenhoTrendChart({
  filtroMesHabilitacao,
  filtroAnoHabilitacao,
  vendasFiltradas,
  vendasMetaFiltradas,
  chartHeight,
  containerMaxWidth,
  containerClassName
}: DesempenhoTrendChartProps) {
  const { mapearCategoriaVenda } = useData();

  // Configurações iniciais dos indicadores
  const [chartConfigs, setChartConfigs] = useState<TrendChartConfig[]>([
    {
      key: 'ticket_medio_total',
      label: 'Ticket Médio Total (R$)',
      color: '#8b5cf6', // violet-500
      visible: true
    },
    {
      key: 'ticket_medio_pos',
      label: 'Ticket Médio POS (R$)',
      color: '#2563eb', // blue-600
      visible: true
    },
    {
      key: 'ticket_medio_fibra',
      label: 'Ticket Médio FIBRA (R$)',
      color: '#16a34a', // green-600
      visible: true
    },
    {
      key: 'ticket_medio_pre',
      label: 'Ticket Médio PRE (R$)',
      color: '#dc2626', // red-600
      visible: true
    },
    {
      key: 'ticket_medio_np',
      label: 'Ticket Médio NP (R$)',
      color: '#ea580c', // orange-600
      visible: true
    },
    {
      key: 'ticket_medio_sky',
      label: 'Ticket Médio SKY+ (R$)',
      color: '#7c3aed', // purple-600
      visible: true
    },
    {
      key: 'valor_total',
      label: 'Valor Total (R$)',
      color: '#1f2937', // gray-800
      visible: false
    },
    {
      key: 'valor_pos',
      label: 'Valor POS (R$)',
      color: '#3b82f6', // blue-500
      visible: false
    },
    {
      key: 'valor_fibra',
      label: 'Valor FIBRA (R$)',
      color: '#22c55e', // green-500
      visible: false
    },
    {
      key: 'valor_pre',
      label: 'Valor PRE (R$)',
      color: '#ef4444', // red-500
      visible: false
    },
    {
      key: 'valor_np',
      label: 'Valor NP (R$)',
      color: '#f97316', // orange-500
      visible: false
    },
    {
      key: 'valor_sky',
      label: 'Valor SKY+ (R$)',
      color: '#a855f7', // purple-500
      visible: false
    }
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

  // Função para extrair mês das vendas meta
  const extrairMesVendaMeta = (mes: number): string => {
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return meses[mes - 1];
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

  // Função para formatar valores monetários
  const formatarValorMonetario = (valor: number): number => {
    return Math.round(valor * 100) / 100;
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
      const mesAtual = dataAtual.getMonth() + 1; // 1-12 para comparar com vendas meta
      const anoAtual = dataAtual.getFullYear();
      
      // Para VendaMeta, usar mes (1-12), para comparação converter mesIndex (0-11) para (1-12)
      const mesComparacao = periodo.mesIndex + 1;
      const ehMesAtual = mesComparacao === mesAtual && periodo.ano === anoAtual;
      


      // Calcular valores e quantidades por tipo
      const metricasPorTipo = {
        POS: { valor: 0, quantidade: 0 },
        FIBRA: { valor: 0, quantidade: 0 },
        PRE: { valor: 0, quantidade: 0 },
        NP: { valor: 0, quantidade: 0 },
        'SKY+': { valor: 0, quantidade: 0 }
      };

      if (ehMesAtual) {
        // Para o mês atual, usar dados de VENDAS META
        const vendasMetaDoPeriodo = vendasMetaFiltradas.filter(vendaMeta => {
          // Comparar diretamente o número do mês (1-12)
          return vendaMeta.mes === mesComparacao && vendaMeta.ano === periodo.ano;
        });

        vendasMetaDoPeriodo.forEach(vendaMeta => {
          // VendaMeta tem: numero_proposta, valor, data_venda, vendedor, categoria, produto, mes, ano
          // Usar a função mapearCategoriaVenda do contexto para consistência
          const categoria = mapearCategoriaVenda(vendaMeta);
          const tipo = mapearTipoParaQuadro(categoria);
          
          if (metricasPorTipo[tipo as keyof typeof metricasPorTipo]) {
            // Arredondar valor para evitar problemas de precisão decimal
            const valorArredondado = Math.round(vendaMeta.valor * 100) / 100;
            metricasPorTipo[tipo as keyof typeof metricasPorTipo].valor += valorArredondado;
            metricasPorTipo[tipo as keyof typeof metricasPorTipo].quantidade += 1;
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
          const categoria = mapearCategoriaVenda(venda);
          const tipo = mapearTipoParaQuadro(categoria);
          
          if (metricasPorTipo[tipo as keyof typeof metricasPorTipo]) {
            // Arredondar valor para evitar problemas de precisão decimal
            const valorArredondado = Math.round((venda.valor || 0) * 100) / 100;
            metricasPorTipo[tipo as keyof typeof metricasPorTipo].valor += valorArredondado;
            metricasPorTipo[tipo as keyof typeof metricasPorTipo].quantidade += 1;
          }
        });
      }

      // Calcular totais e tickets médios
      const valorTotal = Object.values(metricasPorTipo).reduce((sum, tipo) => sum + tipo.valor, 0);
      const quantidadeTotal = Object.values(metricasPorTipo).reduce((sum, tipo) => sum + tipo.quantidade, 0);
      const ticketMedioTotal = quantidadeTotal > 0 ? valorTotal / quantidadeTotal : 0;

      // Calcular ticket médio por categoria
      const ticketMedioPOS = metricasPorTipo.POS.quantidade > 0 ? metricasPorTipo.POS.valor / metricasPorTipo.POS.quantidade : 0;
      const ticketMedioFIBRA = metricasPorTipo.FIBRA.quantidade > 0 ? metricasPorTipo.FIBRA.valor / metricasPorTipo.FIBRA.quantidade : 0;
      const ticketMedioPRE = metricasPorTipo.PRE.quantidade > 0 ? metricasPorTipo.PRE.valor / metricasPorTipo.PRE.quantidade : 0;
      const ticketMedioNP = metricasPorTipo.NP.quantidade > 0 ? metricasPorTipo.NP.valor / metricasPorTipo.NP.quantidade : 0;
      const ticketMedioSKY = metricasPorTipo['SKY+'].quantidade > 0 ? metricasPorTipo['SKY+'].valor / metricasPorTipo['SKY+'].quantidade : 0;

      return {
        periodo: `${periodo.mes.substring(0, 3)}/${periodo.ano}`,
        mesAno: `${periodo.ano}-${String(periodo.mesIndex + 1).padStart(2, '0')}`,
        ticket_medio_total: formatarValorMonetario(ticketMedioTotal),
        ticket_medio_pos: formatarValorMonetario(ticketMedioPOS),
        ticket_medio_fibra: formatarValorMonetario(ticketMedioFIBRA),
        ticket_medio_pre: formatarValorMonetario(ticketMedioPRE),
        ticket_medio_np: formatarValorMonetario(ticketMedioNP),
        ticket_medio_sky: formatarValorMonetario(ticketMedioSKY),
        valor_total: formatarValorMonetario(valorTotal),
        valor_pos: formatarValorMonetario(metricasPorTipo.POS.valor),
        valor_fibra: formatarValorMonetario(metricasPorTipo.FIBRA.valor),
        valor_pre: formatarValorMonetario(metricasPorTipo.PRE.valor),
        valor_np: formatarValorMonetario(metricasPorTipo.NP.valor),
        valor_sky: formatarValorMonetario(metricasPorTipo['SKY+'].valor)
      };
    });
  }, [filtroMesHabilitacao, filtroAnoHabilitacao, vendasFiltradas, vendasMetaFiltradas, mapearCategoriaVenda]);

  return (
    <TrendChartsContainer
      title="Ticket Médio no Período"
      description="Acompanhe a evolução do ticket médio por categoria ao longo do tempo"
      data={chartData}
      chartConfigs={chartConfigs}
      onConfigChange={setChartConfigs}
      showMetaLines={false}
      emptyMessage="Selecione pelo menos 2 meses e 1 ano nos filtros acima para visualizar a evolução temporal do ticket médio."
      formatTooltipValue={(value, name) => {
        // Formatar como moeda para ticket médio
        return `R$ ${Number(value).toFixed(2)}`;
      }}
      formatYAxisLabel={(value) => {
        // Formatar como moeda
        const numValue = Number(value);
        return `R$ ${numValue.toFixed(2)}`;
      }}
      showToggleAllButton={true}
      chartHeight={chartHeight}
      containerMaxWidth={containerMaxWidth}
      containerClassName={containerClassName}
    />
  );
} 