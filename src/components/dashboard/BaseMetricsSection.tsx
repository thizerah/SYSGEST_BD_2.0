import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BaseMetrics } from "@/types";

interface BaseMetricsSectionProps {
  type: 'tv' | 'fibra';
  metrics: BaseMetrics | null;
  title: string;
}

export function BaseMetricsSection({ type, metrics, title }: BaseMetricsSectionProps) {
  if (!metrics) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-sm text-gray-600 mb-2">{title}</h4>
        <p className="text-sm text-gray-500">Dados BASE não disponíveis</p>
      </div>
    );
  }

  const data = metrics[type];
  
  // Função para converter número do mês para nome
  const obterNomeMes = (numeroMes: number): string => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[numeroMes - 1] || 'Mês Inválido';
  };

  const getTrendIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'positiva':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negativa':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (tendencia: string) => {
    switch (tendencia) {
      case 'positiva':
        return 'text-green-600';
      case 'negativa':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getBadgeVariant = (tendencia: string) => {
    switch (tendencia) {
      case 'positiva':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'negativa':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBadgeText = (tendencia: string) => {
    switch (tendencia) {
      case 'positiva':
        return 'Crescendo';
      case 'negativa':
        return 'Perdendo';
      default:
        return 'Estável';
    }
  };

  const formatPercentual = (percentual: number) => {
    const sign = percentual > 0 ? '+' : '';
    return `${sign}${percentual.toFixed(1)}%`;
  };

  const formatQuantidade = (quantidade: number) => {
    const sign = quantidade > 0 ? '+' : '';
    return `${sign}${quantidade.toLocaleString('pt-BR')}`;
  };

  return (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <h4 className="font-medium text-sm text-blue-900">{title}</h4>
          {metrics.usandoMesAnterior && (
            <p className="text-xs text-amber-600 mt-1">
              📅 Dados de {obterNomeMes(metrics.mesUtilizado)} (mês anterior)
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            variant="outline" 
            className={`${getBadgeVariant(data.tendencia)} text-xs`}
          >
            {getBadgeText(data.tendencia)}
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Atual */}
        <div className="text-center">
          <p className="text-xs text-gray-600 mb-1">Base Atual</p>
          <p className="text-lg font-bold text-gray-900">
            {data.atual.toLocaleString('pt-BR')}
          </p>
        </div>
        
        {/* Tendência */}
        <div className="text-center">
          <p className="text-xs text-gray-600 mb-1">vs Mês Anterior</p>
          <div className="flex flex-col items-center space-y-1">
            <div className="flex items-center space-x-1">
              {getTrendIcon(data.tendencia)}
              <span className={`text-sm font-medium ${getTrendColor(data.tendencia)}`}>
                {formatPercentual(data.percentualTendencia)}
              </span>
            </div>
            <span className={`text-xs font-medium ${getTrendColor(data.tendencia)}`}>
              {formatQuantidade(data.diferencaQuantidade)}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
} 