import { useMemo } from 'react';
import { BaseData, BaseMetrics } from '@/types';

interface UseBaseMetricsProps {
  baseData: BaseData[];
  selectedMonth?: number;
  selectedYear?: number;
}

export function useBaseMetrics({ baseData, selectedMonth, selectedYear }: UseBaseMetricsProps): BaseMetrics | null {
  return useMemo(() => {
    if (!baseData || baseData.length === 0) return null;

    // Converte campo 'mes' (string ou número) para número
    const mesParaNumero = (mes: string | number): number => {
      if (typeof mes === 'number') return mes;
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
        'dezembro': 12, 'dez': 12, 'dec': 12, 'december': 12, '12': 12,
      };
      return meses[String(mes).toLowerCase().trim()] || parseInt(String(mes)) || 0;
    };

    // Normaliza todos os itens e ordena por ANO primeiro, depois por mês
    const dados = baseData
      .map(item => ({ ...item, mesNumero: mesParaNumero(item.mes) }))
      .sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mesNumero - b.mesNumero);

    // Função para verificar se o registro tem dados válidos (não zerado)
    const dadosValidos = (d: (typeof dados)[number]): boolean =>
      d.base_tv > 0 || d.base_fibra > 0 || d.alianca > 0;

    // Busca uma entrada pelo mês + ano exatos
    const findEntry = (m: number, a: number) =>
      dados.find(d => d.mesNumero === m && d.ano === a);

    // Determinar o ponto de partida (mês/ano selecionado ou último disponível)
    let mesAtual: number;
    let anoAtual: number;

    if (selectedMonth && selectedYear) {
      mesAtual = selectedMonth;
      anoAtual = selectedYear;
    } else {
      const ultimo = dados[dados.length - 1];
      mesAtual = ultimo.mesNumero;
      anoAtual = ultimo.ano;
    }

    // Tentar encontrar dados do mês/ano solicitado
    let dadosAtual = findEntry(mesAtual, anoAtual);
    let usandoMesAnteriorFlag = false;

    // Se não encontrou ou dados estão zerados → tenta o mês anterior (com ano correto)
    if (!dadosAtual || !dadosValidos(dadosAtual)) {
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
      const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
      const entradaAnterior = findEntry(mesAnterior, anoAnterior);

      if (entradaAnterior && dadosValidos(entradaAnterior)) {
        dadosAtual = entradaAnterior;
        mesAtual = mesAnterior;   // atualiza mês E ano para o fallback
        anoAtual = anoAnterior;
        usandoMesAnteriorFlag = true;
      } else {
        // Último recurso: entrada mais recente com dados válidos
        const ultimoValido = [...dados].reverse().find(d => dadosValidos(d));
        if (ultimoValido) {
          dadosAtual = ultimoValido;
          mesAtual = ultimoValido.mesNumero;
          anoAtual = ultimoValido.ano;
          usandoMesAnteriorFlag = true;
        }
      }
    }

    if (!dadosAtual || !dadosValidos(dadosAtual)) return null;

    // Mês de referência para comparação de tendência (usa mesAtual/anoAtual já corrigidos)
    const mesComp = mesAtual === 1 ? 12 : mesAtual - 1;
    const anoComp = mesAtual === 1 ? anoAtual - 1 : anoAtual;
    const dadosComp = findEntry(mesComp, anoComp);

    // Calcular tendência com filtro de ano correto
    const calcularTendencia = (
      atual: number,
      campo: 'base_tv' | 'base_fibra' | 'alianca',
    ): { tendencia: 'positiva' | 'negativa' | 'estavel'; percentual: number; diferencaQuantidade: number } => {
      if (!dadosComp) return { tendencia: 'estavel', percentual: 0, diferencaQuantidade: 0 };

      const valorAnterior = dadosComp[campo];
      const diferencaQuantidade = atual - valorAnterior;

      if (valorAnterior === 0) return { tendencia: 'estavel', percentual: 0, diferencaQuantidade };

      const percentual = (diferencaQuantidade / valorAnterior) * 100;

      if (percentual > 0.1) return { tendencia: 'positiva', percentual, diferencaQuantidade };
      if (percentual < -0.1) return { tendencia: 'negativa', percentual, diferencaQuantidade };
      return { tendencia: 'estavel', percentual, diferencaQuantidade };
    };

    // Média dos últimos 3 meses disponíveis (ordem cronológica correta após sort por ano+mês)
    const calcularMedia3M = (campo: 'base_tv' | 'base_fibra' | 'alianca'): number => {
      const ultimos3 = dados.slice(-3);
      if (ultimos3.length === 0) return 0;
      return ultimos3.reduce((acc, d) => acc + d[campo], 0) / ultimos3.length;
    };

    const tendenciaTV     = calcularTendencia(dadosAtual.base_tv,    'base_tv');
    const tendenciaFibra  = calcularTendencia(dadosAtual.base_fibra, 'base_fibra');
    const tendenciaAlianca = calcularTendencia(dadosAtual.alianca,   'alianca');

    return {
      tv: {
        atual: dadosAtual.base_tv,
        tendencia: tendenciaTV.tendencia,
        media3m: Math.round(calcularMedia3M('base_tv')),
        percentualTendencia: tendenciaTV.percentual,
        diferencaQuantidade: tendenciaTV.diferencaQuantidade,
      },
      fibra: {
        atual: dadosAtual.base_fibra,
        tendencia: tendenciaFibra.tendencia,
        media3m: Math.round(calcularMedia3M('base_fibra')),
        percentualTendencia: tendenciaFibra.percentual,
        diferencaQuantidade: tendenciaFibra.diferencaQuantidade,
      },
      alianca: {
        atual: dadosAtual.alianca,
        tendencia: tendenciaAlianca.tendencia,
        media3m: Math.round(calcularMedia3M('alianca')),
        percentualTendencia: tendenciaAlianca.percentual,
        diferencaQuantidade: tendenciaAlianca.diferencaQuantidade,
      },
      mesUtilizado: mesAtual,
      mesOriginal: selectedMonth || new Date().getMonth() + 1,
      usandoMesAnterior: usandoMesAnteriorFlag,
    };
  }, [baseData, selectedMonth, selectedYear]);
}
