import { useMemo } from 'react';
import { BaseData, BaseMetrics } from '@/types';

interface UseBaseMetricsProps {
  baseData: BaseData[];
  selectedMonth?: number;
  selectedYear?: number;
}

export function useBaseMetrics({ baseData, selectedMonth, selectedYear }: UseBaseMetricsProps): BaseMetrics | null {
  return useMemo(() => {
    console.log('[useBaseMetrics] Debug:', {
      baseDataLength: baseData?.length || 0,
      selectedMonth,
      selectedYear,
      baseDataSample: baseData?.[0]
    });
    
    if (!baseData || baseData.length === 0) {
      console.log('[useBaseMetrics] Retornando null - dados BASE não disponíveis');
      return null;
    }

    // Função para converter mês string para número
    const mesParaNumero = (mes: string | number): number => {
      // Se já for número, retorna o número
      if (typeof mes === 'number') return mes;
      
      // Se for string, tenta converter
      const meses: Record<string, number> = {
        'janeiro': 1, 'jan': 1, '1': 1,
        'fevereiro': 2, 'fev': 2, 'feb': 2, '2': 2,
        'março': 3, 'mar': 3, 'marzo': 3, '3': 3,
        'abril': 4, 'abr': 4, 'apr': 4, '4': 4,
        'maio': 5, 'mai': 5, 'may': 5, '5': 5,
        'junho': 6, 'jun': 6, 'june': 6, '6': 6,
        'julho': 7, 'jul': 7, 'july': 7, '7': 7,
        'agosto': 8, 'ago': 8, 'aug': 8, '8': 8,
        'setembro': 9, 'set': 9, 'sep': 9, '9': 9,
        'outubro': 10, 'out': 10, 'oct': 10, '10': 10,
        'novembro': 11, 'nov': 11, 'november': 11, '11': 11,
        'dezembro': 12, 'dez': 12, 'dec': 12, 'december': 12, '12': 12
      };

      const mesString = String(mes).toLowerCase().trim();
      const resultado = meses[mesString] || parseInt(mesString) || 0;
      
      console.log('[useBaseMetrics] Conversão mês:', mes, '=>', resultado);
      return resultado;
    };

    // Converter dados para incluir número do mês e ordenar por data
    const dadosComMesNumero = baseData.map(item => ({
      ...item,
      mesNumero: mesParaNumero(item.mes)
    })).sort((a, b) => a.mesNumero - b.mesNumero);

    console.log('[useBaseMetrics] Dados convertidos:', dadosComMesNumero);

    // Encontrar o mês atual (baseado nos filtros ou último mês disponível)
    let mesAtual: number;
    let anoAtual: number;

    if (selectedMonth && selectedYear) {
      mesAtual = selectedMonth;
      anoAtual = selectedYear;
    } else {
      // Usar o último mês disponível nos dados
      const ultimoRegistro = dadosComMesNumero[dadosComMesNumero.length - 1];
      mesAtual = ultimoRegistro.mesNumero;
      anoAtual = new Date().getFullYear(); // Assumir ano atual se não especificado
    }

    console.log('[useBaseMetrics] Procurando por mês:', mesAtual, 'ano:', anoAtual);

    // Função para verificar se os dados são válidos (não zerados)
    const dadosValidos = (dados: BaseData & { mesNumero: number }): boolean => {
      return dados && (dados.base_tv > 0 || dados.base_fibra > 0 || dados.alianca > 0);
    };

    // Encontrar dados do mês atual
    let dadosAtual = dadosComMesNumero.find(item => item.mesNumero === mesAtual);
    
    // Se não encontrar dados para o mês específico OU se os dados estão zerados, tentar mês anterior primeiro
    if ((!dadosAtual || !dadosValidos(dadosAtual)) && dadosComMesNumero.length > 0) {
      // Calcular mês anterior
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
      const dadosAnterior = dadosComMesNumero.find(item => item.mesNumero === mesAnterior);
      
      if (dadosAnterior && dadosValidos(dadosAnterior)) {
        console.log('[useBaseMetrics] Mês', mesAtual, 'não encontrado ou zerado. Usando mês anterior:', mesAnterior);
        dadosAtual = dadosAnterior;
        mesAtual = dadosAnterior.mesNumero; // Atualizar o mesAtual para o cálculo de tendências
      } else {
        // Se mês anterior também não existir ou estiver zerado, usar último mês disponível com dados válidos
        const ultimoMesValido = dadosComMesNumero.reverse().find(item => dadosValidos(item));
        if (ultimoMesValido) {
          console.log('[useBaseMetrics] Mês anterior também não encontrado ou zerado. Usando último mês válido disponível:', ultimoMesValido.mesNumero);
          dadosAtual = ultimoMesValido;
          mesAtual = ultimoMesValido.mesNumero; // Atualizar o mesAtual para o cálculo de tendências
          // Reverter a ordem de volta
          dadosComMesNumero.reverse();
        } else {
          // Se nenhum dado válido for encontrado, reverter a ordem e continuar
          dadosComMesNumero.reverse();
        }
      }
    }
    
    console.log('[useBaseMetrics] Dados encontrados para mês atual:', dadosAtual);
    
    if (!dadosAtual || !dadosValidos(dadosAtual)) {
      console.log('[useBaseMetrics] Nenhum dado BASE válido disponível');
      return null;
    }

    // Calcular média dos últimos 3 meses
    const calcularMedia3M = (campo: 'base_tv' | 'base_fibra' | 'alianca'): number => {
      // Pegar os últimos 3 registros disponíveis (independente do mês)
      const ultimos3Meses = dadosComMesNumero.slice(-3);
      
      if (ultimos3Meses.length === 0) return 0;
      
      const soma = ultimos3Meses.reduce((acc, item) => acc + item[campo], 0);
      return soma / ultimos3Meses.length;
    };

    // Calcular tendência (comparar com mês anterior)
    const calcularTendencia = (atual: number, campo: 'base_tv' | 'base_fibra' | 'alianca'): { 
      tendencia: 'positiva' | 'negativa' | 'estavel'; 
      percentual: number; 
      diferencaQuantidade: number;
    } => {
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
      const dadosAnterior = dadosComMesNumero.find(item => item.mesNumero === mesAnterior);
      
      if (!dadosAnterior) {
        return { tendencia: 'estavel', percentual: 0, diferencaQuantidade: 0 };
      }
      
      const valorAnterior = dadosAnterior[campo];
      const diferencaQuantidade = atual - valorAnterior;
      
      if (valorAnterior === 0) {
        return { tendencia: 'estavel', percentual: 0, diferencaQuantidade };
      }
      
      const percentual = (diferencaQuantidade / valorAnterior) * 100;
      
      if (percentual > 0.1) { // Mudança para detectar qualquer crescimento positivo
        return { tendencia: 'positiva', percentual, diferencaQuantidade };
      } else if (percentual < -0.1) { // Mudança para detectar qualquer queda
        return { tendencia: 'negativa', percentual, diferencaQuantidade };
      } else {
        return { tendencia: 'estavel', percentual, diferencaQuantidade };
      }
    };

    // Calcular métricas para TV
    const tendenciaTV = calcularTendencia(dadosAtual.base_tv, 'base_tv');
    const media3mTV = calcularMedia3M('base_tv');

    // Calcular métricas para FIBRA
    const tendenciaFibra = calcularTendencia(dadosAtual.base_fibra, 'base_fibra');
    const media3mFibra = calcularMedia3M('base_fibra');

    // Calcular métricas para ALIANÇA
    const tendenciaAlianca = calcularTendencia(dadosAtual.alianca, 'alianca');
    const media3mAlianca = calcularMedia3M('alianca');

    return {
      tv: {
        atual: dadosAtual.base_tv,
        tendencia: tendenciaTV.tendencia,
        media3m: Math.round(media3mTV),
        percentualTendencia: tendenciaTV.percentual,
        diferencaQuantidade: tendenciaTV.diferencaQuantidade
      },
      fibra: {
        atual: dadosAtual.base_fibra,
        tendencia: tendenciaFibra.tendencia,
        media3m: Math.round(media3mFibra),
        percentualTendencia: tendenciaFibra.percentual,
        diferencaQuantidade: tendenciaFibra.diferencaQuantidade
      },
      alianca: {
        atual: dadosAtual.alianca,
        tendencia: tendenciaAlianca.tendencia,
        media3m: Math.round(media3mAlianca),
        percentualTendencia: tendenciaAlianca.percentual,
        diferencaQuantidade: tendenciaAlianca.diferencaQuantidade
      },
      // Informações sobre o período dos dados
      mesUtilizado: mesAtual,
      mesOriginal: selectedMonth || new Date().getMonth() + 1,
      usandoMesAnterior: selectedMonth && selectedMonth !== mesAtual
    };
  }, [baseData, selectedMonth, selectedYear]);
} 