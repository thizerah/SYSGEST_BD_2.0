import React, { useState, useMemo } from 'react';
import { TrendChartsContainer, TrendDataPoint, TrendChartConfig } from './TrendChartsContainer';
import useData from "@/context/useData";
import { Venda, PrimeiroPagamento } from '@/types';

interface PermanenciaTrendChartProps {
  filtroMesPermanencia: string[];
  filtroAnoPermanencia: string[];
  vendasFiltradas: Venda[];
  chartHeight?: number;
  containerMaxWidth?: string;
  containerClassName?: string;
}

export function PermanenciaTrendChart({
  filtroMesPermanencia,
  filtroAnoPermanencia,
  vendasFiltradas,
  chartHeight,
  containerMaxWidth,
  containerClassName
}: PermanenciaTrendChartProps) {
  const { primeirosPagamentos } = useData();

  // Configurações iniciais dos indicadores
  const [chartConfigs, setChartConfigs] = useState<TrendChartConfig[]>([
    {
      key: 'pos_adimplencia',
      label: 'POS Adimplência (%)',
      color: '#16a34a', // green-600 - VERDE
      visible: true
    },
    {
      key: 'fibra_adimplencia',
      label: 'FIBRA Adimplência (%)',
      color: '#22c55e', // green-500 - VERDE
      visible: true
    },
    {
      key: 'pos_total',
      label: 'POS Total Clientes',
      color: '#2563eb', // blue-600 - AZUL
      visible: true
    },
    {
      key: 'fibra_total',
      label: 'FIBRA Total Clientes',
      color: '#7c3aed', // violet-600 - ROXO
      visible: true
    },
    {
      key: 'pos_inadimplentes',
      label: 'POS Inadimplentes',
      color: '#eab308', // yellow-500 - AMARELO
      visible: true
    },
    {
      key: 'fibra_inadimplentes',
      label: 'FIBRA Inadimplentes',
      color: '#f59e0b', // amber-500 - AMARELO
      visible: true
    },
    {
      key: 'pos_cancelados',
      label: 'POS Cancelados',
      color: '#8b5cf6', // violet-500 - ROXO
      visible: true
    },
    {
      key: 'fibra_cancelados',
      label: 'FIBRA Cancelados',
      color: '#a855f7', // purple-500 - ROXO
      visible: true
    }
  ]);

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

      // Calcular métricas por sigla
      const metricasPorSigla = {
        POS: { adimplentes: 0, inadimplentes: 0, cancelados: 0, total: 0 },
        'BL-DGO': { adimplentes: 0, inadimplentes: 0, cancelados: 0, total: 0 }
      };

      vendasDoPeriodo.forEach(venda => {
        const sigla = getSigla(venda);
        if (sigla === '') return;

        const pagamento = pagamentosMap.get(venda.numero_proposta);
        metricasPorSigla[sigla as keyof typeof metricasPorSigla].total++;

        if (pagamento) {
          if (pagamento.status_pacote === 'C') {
            // Cancelado
            metricasPorSigla[sigla as keyof typeof metricasPorSigla].cancelados++;
          } else if (pagamento.status_pacote === 'S') {
            // Inadimplente (suspenso)
            metricasPorSigla[sigla as keyof typeof metricasPorSigla].inadimplentes++;
          } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
            // Adimplente
            metricasPorSigla[sigla as keyof typeof metricasPorSigla].adimplentes++;
          } else if (pagamento.passo === '0' || pagamento.passo === '1') {
            // Adimplente
            metricasPorSigla[sigla as keyof typeof metricasPorSigla].adimplentes++;
          } else if (pagamento.status_pacote === 'I') {
            // Adimplente (inclusão)
            metricasPorSigla[sigla as keyof typeof metricasPorSigla].adimplentes++;
          } else {
            // Inadimplente (outros casos)
            metricasPorSigla[sigla as keyof typeof metricasPorSigla].inadimplentes++;
          }
        } else if (sigla === 'BL-DGO') {
          // BL-DGO sem pagamento é considerado adimplente
          metricasPorSigla[sigla as keyof typeof metricasPorSigla].adimplentes++;
        }
      });

      const posAdimplencia = metricasPorSigla.POS.total > 0 
        ? (metricasPorSigla.POS.adimplentes / metricasPorSigla.POS.total) * 100 
        : 0;
      
      const fibraAdimplencia = metricasPorSigla['BL-DGO'].total > 0 
        ? (metricasPorSigla['BL-DGO'].adimplentes / metricasPorSigla['BL-DGO'].total) * 100 
        : 0;

      return {
        periodo: `${periodo.mes.substring(0, 3)}/${periodo.ano}`,
        mesAno: `${periodo.ano}-${String(periodo.mesIndex + 1).padStart(2, '0')}`,
        pos_adimplencia: Number(posAdimplencia.toFixed(2)),
        fibra_adimplencia: Number(fibraAdimplencia.toFixed(2)),
        pos_total: metricasPorSigla.POS.total,
        fibra_total: metricasPorSigla['BL-DGO'].total,
        pos_inadimplentes: metricasPorSigla.POS.inadimplentes,
        fibra_inadimplentes: metricasPorSigla['BL-DGO'].inadimplentes,
        pos_cancelados: metricasPorSigla.POS.cancelados,
        fibra_cancelados: metricasPorSigla['BL-DGO'].cancelados
      };
    });
  }, [filtroMesPermanencia, filtroAnoPermanencia, vendasFiltradas, primeirosPagamentos]);

  return (
    <TrendChartsContainer
      title="Evolução da Permanência por Período"
      description="Acompanhe a evolução dos percentuais de adimplência e totais de clientes ao longo do tempo"
      data={chartData}
      chartConfigs={chartConfigs}
      onConfigChange={setChartConfigs}
      showMetaLines={false}
      emptyMessage="Selecione pelo menos 2 meses e 1 ano nos filtros acima para visualizar a evolução temporal da permanência."
      formatTooltipValue={(value, name) => {
        // Se for um campo de adimplência (percentual), formatar com % e 2 casas decimais
        if (name.toLowerCase().includes('adimplência') || name.toLowerCase().includes('adimplencia')) {
          return `${Number(value).toFixed(2)}%`;
        }
        // Caso contrário, manter o valor original (para totais, inadimplentes, cancelados)
        return String(value);
      }}
      formatYAxisLabel={(value) => {
        // Para o eixo Y, verificar se é um valor percentual (geralmente entre 0-100 para adimplência)
        const numValue = Number(value);
        if (numValue <= 100 && numValue >= 0) {
          return `${numValue.toFixed(2)}%`;
        }
        return String(value);
      }}
      showToggleAllButton={true}
      chartHeight={chartHeight}
      containerMaxWidth={containerMaxWidth}
      containerClassName={containerClassName}
    />
  );
} 