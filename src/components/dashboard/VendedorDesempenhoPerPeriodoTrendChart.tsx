import React, { useState, useMemo } from 'react';
import { TrendChartsContainer, TrendDataPoint, TrendChartConfig } from './TrendChartsContainer';
import useData from "@/context/useData";
import { Venda, VendaMeta } from '@/types';

interface VendedorDesempenhoPerPeriodoTrendChartProps {
  filtroMesHabilitacao: string[];
  filtroAnoHabilitacao: string[];
  vendasFiltradas: Venda[];
  vendasMetaFiltradas: VendaMeta[];
  chartHeight?: number;
  containerMaxWidth?: string;
  containerClassName?: string;
}

export function VendedorDesempenhoPerPeriodoTrendChart({
  filtroMesHabilitacao,
  filtroAnoHabilitacao,
  vendasFiltradas,
  vendasMetaFiltradas,
  chartHeight,
  containerMaxWidth,
  containerClassName
}: VendedorDesempenhoPerPeriodoTrendChartProps) {
  const { mapearCategoriaVenda, vendas } = useData();

  // Configurações iniciais dos indicadores por vendedor
  const [chartConfigs, setChartConfigs] = useState<TrendChartConfig[]>([]);

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

  // Obter vendedores únicos das vendas filtradas e vendas meta
  const vendedoresUnicos = useMemo(() => {
    const vendedores = new Set<string>();
    
    // Adicionar vendedores das vendas de permanência
    vendasFiltradas.forEach(venda => {
      if (venda.nome_proprietario && venda.nome_proprietario.trim() !== '') {
        vendedores.add(venda.nome_proprietario);
      }
    });
    
    // Adicionar vendedores das vendas meta (usando ID e tentando mapear para nome)
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

  // Atualizar configurações quando vendedores mudarem
  React.useEffect(() => {
    const coresBase = [
      '#16a34a', '#2563eb', '#7c3aed', '#dc2626', '#ea580c',
      '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#f97316',
      '#059669', '#1d4ed8', '#9333ea', '#b91c1c', '#c2410c'
    ];

    const novasConfigs: TrendChartConfig[] = [];

    // Criar configurações para cada vendedor com suas métricas específicas
    vendedoresUnicos.forEach((vendedor, vendedorIndex) => {
      const corBase = coresBase[vendedorIndex % coresBase.length];
      
      // Métricas para cada vendedor
      const metricas = [
        { sufixo: '_ticket_medio_total', nome: 'Ticket Médio Total', intensidade: 1.0 },
        { sufixo: '_ticket_medio_pos', nome: 'Ticket Médio POS', intensidade: 0.9 },
        { sufixo: '_ticket_medio_pre', nome: 'Ticket Médio PRE', intensidade: 0.8 },
        { sufixo: '_ticket_medio_np', nome: 'Ticket Médio NP', intensidade: 0.7 },
        { sufixo: '_ticket_medio_fibra', nome: 'Ticket Médio FIBRA', intensidade: 0.6 },
        { sufixo: '_ticket_medio_sky', nome: 'Ticket Médio SKY+', intensidade: 0.5 },
        { sufixo: '_valor_total', nome: 'Valor Total', intensidade: 1.0 },
        { sufixo: '_valor_pos', nome: 'Valor POS', intensidade: 0.9 },
        { sufixo: '_valor_pre', nome: 'Valor PRE', intensidade: 0.8 },
        { sufixo: '_valor_np', nome: 'Valor NP', intensidade: 0.7 },
        { sufixo: '_valor_fibra', nome: 'Valor FIBRA', intensidade: 0.6 },
        { sufixo: '_valor_sky', nome: 'Valor SKY+', intensidade: 0.5 }
      ];

      metricas.forEach(metrica => {
        // Ajustar intensidade da cor
        const cor = adjustColorIntensity(corBase, metrica.intensidade);
        
        novasConfigs.push({
          key: `${vendedor.replace(/\s+/g, '_')}${metrica.sufixo}`,
          label: `${vendedor} - ${metrica.nome}`,
          color: cor,
          visible: false // Todas as opções por vendedor iniciam desmarcadas
        });
      });
    });

    setChartConfigs(novasConfigs);
  }, [vendedoresUnicos]);

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

      // Calcular métricas por vendedor e categoria
      const metricasPorVendedor = new Map<string, {
        POS: { valor: number; quantidade: number };
        PRE: { valor: number; quantidade: number };
        NP: { valor: number; quantidade: number };
        FIBRA: { valor: number; quantidade: number };
        'SKY+': { valor: number; quantidade: number };
      }>();

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
          
          const categoria = mapearCategoriaVenda ? mapearCategoriaVenda(vendaMeta) : vendaMeta.categoria;
          const tipo = mapearTipoParaQuadro(categoria);

          if (nomeVendedor && nomeVendedor.trim() !== '' && tipo !== 'OUTROS') {
            if (!metricasPorVendedor.has(nomeVendedor)) {
              metricasPorVendedor.set(nomeVendedor, {
                POS: { valor: 0, quantidade: 0 },
                PRE: { valor: 0, quantidade: 0 },
                NP: { valor: 0, quantidade: 0 },
                FIBRA: { valor: 0, quantidade: 0 },
                'SKY+': { valor: 0, quantidade: 0 }
              });
            }

            const metricas = metricasPorVendedor.get(nomeVendedor)!;
            const valor = vendaMeta.valor || 0;

            metricas[tipo as keyof typeof metricas].valor += valor;
            metricas[tipo as keyof typeof metricas].quantidade += 1;
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
          const tipo = mapearTipoParaQuadro(categoria);

          if (vendedor && vendedor.trim() !== '' && tipo !== 'OUTROS') {
            if (!metricasPorVendedor.has(vendedor)) {
              metricasPorVendedor.set(vendedor, {
                POS: { valor: 0, quantidade: 0 },
                PRE: { valor: 0, quantidade: 0 },
                NP: { valor: 0, quantidade: 0 },
                FIBRA: { valor: 0, quantidade: 0 },
                'SKY+': { valor: 0, quantidade: 0 }
              });
            }

            const metricas = metricasPorVendedor.get(vendedor)!;
            const valor = venda.valor || 0;

            metricas[tipo as keyof typeof metricas].valor += valor;
            metricas[tipo as keyof typeof metricas].quantidade += 1;
          }
        });
      }

      // Construir objeto de dados para este período
      const dadosPeriodo: TrendDataPoint = {
        periodo: `${periodo.mes.substring(0, 3)}/${periodo.ano}`,
        mesAno: `${periodo.ano}-${String(periodo.mesIndex + 1).padStart(2, '0')}`
      };

      // Adicionar métricas para cada vendedor
      vendedoresUnicos.forEach(vendedor => {
        const metricas = metricasPorVendedor.get(vendedor);
        const vendedorKey = vendedor.replace(/\s+/g, '_');
        
        if (metricas) {
          // Calcular totais
          const valorTotal = Object.values(metricas).reduce((sum, cat) => sum + cat.valor, 0);
          const quantidadeTotal = Object.values(metricas).reduce((sum, cat) => sum + cat.quantidade, 0);
          
          // Calcular tickets médios
          const ticketMedioTotal = quantidadeTotal > 0 ? valorTotal / quantidadeTotal : 0;
          const ticketMedioPOS = metricas.POS.quantidade > 0 ? metricas.POS.valor / metricas.POS.quantidade : 0;
          const ticketMedioPRE = metricas.PRE.quantidade > 0 ? metricas.PRE.valor / metricas.PRE.quantidade : 0;
          const ticketMedioNP = metricas.NP.quantidade > 0 ? metricas.NP.valor / metricas.NP.quantidade : 0;
          const ticketMedioFIBRA = metricas.FIBRA.quantidade > 0 ? metricas.FIBRA.valor / metricas.FIBRA.quantidade : 0;
          const ticketMedioSKY = metricas['SKY+'].quantidade > 0 ? metricas['SKY+'].valor / metricas['SKY+'].quantidade : 0;
          
          dadosPeriodo[`${vendedorKey}_ticket_medio_total`] = Math.round(ticketMedioTotal * 100) / 100;
          dadosPeriodo[`${vendedorKey}_ticket_medio_pos`] = Math.round(ticketMedioPOS * 100) / 100;
          dadosPeriodo[`${vendedorKey}_ticket_medio_pre`] = Math.round(ticketMedioPRE * 100) / 100;
          dadosPeriodo[`${vendedorKey}_ticket_medio_np`] = Math.round(ticketMedioNP * 100) / 100;
          dadosPeriodo[`${vendedorKey}_ticket_medio_fibra`] = Math.round(ticketMedioFIBRA * 100) / 100;
          dadosPeriodo[`${vendedorKey}_ticket_medio_sky`] = Math.round(ticketMedioSKY * 100) / 100;
          dadosPeriodo[`${vendedorKey}_valor_total`] = Math.round(valorTotal * 100) / 100;
          dadosPeriodo[`${vendedorKey}_valor_pos`] = Math.round(metricas.POS.valor * 100) / 100;
          dadosPeriodo[`${vendedorKey}_valor_pre`] = Math.round(metricas.PRE.valor * 100) / 100;
          dadosPeriodo[`${vendedorKey}_valor_np`] = Math.round(metricas.NP.valor * 100) / 100;
          dadosPeriodo[`${vendedorKey}_valor_fibra`] = Math.round(metricas.FIBRA.valor * 100) / 100;
          dadosPeriodo[`${vendedorKey}_valor_sky`] = Math.round(metricas['SKY+'].valor * 100) / 100;
        } else {
          // Se não há dados para este vendedor no período, definir como 0
          dadosPeriodo[`${vendedorKey}_ticket_medio_total`] = 0;
          dadosPeriodo[`${vendedorKey}_ticket_medio_pos`] = 0;
          dadosPeriodo[`${vendedorKey}_ticket_medio_pre`] = 0;
          dadosPeriodo[`${vendedorKey}_ticket_medio_np`] = 0;
          dadosPeriodo[`${vendedorKey}_ticket_medio_fibra`] = 0;
          dadosPeriodo[`${vendedorKey}_ticket_medio_sky`] = 0;
          dadosPeriodo[`${vendedorKey}_valor_total`] = 0;
          dadosPeriodo[`${vendedorKey}_valor_pos`] = 0;
          dadosPeriodo[`${vendedorKey}_valor_pre`] = 0;
          dadosPeriodo[`${vendedorKey}_valor_np`] = 0;
          dadosPeriodo[`${vendedorKey}_valor_fibra`] = 0;
          dadosPeriodo[`${vendedorKey}_valor_sky`] = 0;
        }
      });

      return dadosPeriodo;
    });
  }, [filtroMesHabilitacao, filtroAnoHabilitacao, vendasFiltradas, vendasMetaFiltradas, vendedoresUnicos, vendas, mapearCategoriaVenda]);

  return (
    <TrendChartsContainer
      title="Ticket Médio no Período por Vendedor"
      description="Acompanhe a evolução do ticket médio por categoria de cada vendedor ao longo do tempo"
      data={chartData}
      chartConfigs={chartConfigs}
      onConfigChange={setChartConfigs}
      showMetaLines={false}
      emptyMessage="Selecione pelo menos 2 meses e 1 ano nos filtros acima para visualizar a evolução temporal do ticket médio por vendedor."
      formatTooltipValue={(value, name) => {
        // Formatar como moeda para ticket médio
        return `R$ ${Number(value).toFixed(2)}`;
      }}
      formatYAxisLabel={(value) => {
        // Formatar como moeda
        const numValue = Number(value);
        return `R$ ${numValue.toFixed(2)}`;
      }}
      groupByVendedor={true}
      showToggleAllButton={true}
      chartHeight={chartHeight}
      containerMaxWidth={containerMaxWidth}
      containerClassName={containerClassName}
    />
  );
} 