import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChartContainer
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Eye,
  EyeOff,
  Target
} from "lucide-react";

// Tipos para os dados do gráfico
export interface TrendDataPoint {
  periodo: string;           // Ex: "Jan/2024"
  mesAno: string;           // Ex: "2024-01"
  [key: string]: string | number; // Dados dinâmicos por categoria
}

export interface TrendChartConfig {
  key: string;
  label: string;
  color: string;
  visible: boolean;
  meta?: number; // Valor de meta opcional
}

interface TrendChartsContainerProps {
  title: string;
  description: string;
  data: TrendDataPoint[];
  chartConfigs: TrendChartConfig[];
  onConfigChange: (updatedConfigs: TrendChartConfig[]) => void;
  showMetaLines?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  formatTooltipValue?: (value: string | number, name: string) => string;
  formatYAxisLabel?: (value: string | number) => string;
  groupByVendedor?: boolean;
  showToggleAllButton?: boolean;
  // Configurações de layout específicas por contexto
  chartHeight?: number;
  containerMaxWidth?: string;
  containerClassName?: string;
}

export function TrendChartsContainer({
  title,
  description,
  data,
  chartConfigs,
  onConfigChange,
  showMetaLines = false,
  isLoading = false,
  emptyMessage = "Selecione múltiplos meses para visualizar a evolução temporal dos dados.",
  formatTooltipValue,
  formatYAxisLabel,
  groupByVendedor = false,
  showToggleAllButton = false,
  // Configurações de layout com valores padrão
  chartHeight = 300,
  containerMaxWidth,
  containerClassName
}: TrendChartsContainerProps) {
  const [showMetas, setShowMetas] = useState(showMetaLines);

  // Filtrar apenas configurações visíveis
  const visibleConfigs = useMemo(() => 
    chartConfigs.filter(config => config.visible), 
    [chartConfigs]
  );

  // Função para alternar visibilidade de um indicador
  const toggleIndicatorVisibility = (key: string) => {
    const updatedConfigs = chartConfigs.map(config =>
      config.key === key ? { ...config, visible: !config.visible } : config
    );
    onConfigChange(updatedConfigs);
  };

  // Função para marcar/desmarcar todos
  const toggleAllVisibility = () => {
    const hasAnyVisible = chartConfigs.some(config => config.visible);
    const updatedConfigs = chartConfigs.map(config => ({
      ...config,
      visible: !hasAnyVisible
    }));
    onConfigChange(updatedConfigs);
  };

  // Função para calcular tendência
  const calculateTrend = (key: string) => {
    if (data.length < 2) return { direction: 'neutral', percentage: 0 };
    
    const values = data.map(d => Number(d[key]) || 0);
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    
    if (firstValue === 0) return { direction: 'neutral', percentage: 0 };
    
    const percentage = ((lastValue - firstValue) / firstValue) * 100;
    const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';
    
    return { direction, percentage: Math.abs(percentage) };
  };

  // Interfaces para o tooltip
  interface TooltipPayload {
    color: string;
    name: string;
    value: string | number;
    dataKey: string;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
  }

  // Função para obter cor semântica baseada no tipo de métrica
  const getSemanticColor = (metricName: string): string => {
    const lowerName = metricName.toLowerCase();
    
    // Remover acentos para comparação mais robusta
    const normalizedName = lowerName
      .replace(/[áàâãä]/g, 'a')
      .replace(/[éèêë]/g, 'e') 
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôõö]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[ñ]/g, 'n');
    
    // Verificar por inadimplência PRIMEIRO (para evitar conflito com "adimpl")
    if (normalizedName.includes('inadimpl')) {
      return '#eab308'; // Amarelo para inadimplência
    }
    // Verificar por adimplência
    else if (normalizedName.includes('adimpl')) {
      return '#16a34a'; // Verde para adimplência
    } 
    // Verificar por cancelados
    else if (normalizedName.includes('cancel')) {
      return '#dc2626'; // Vermelho para cancelados
    }
    
    return '#6b7280'; // Cinza padrão para outros casos
  };

  // Componente personalizado para tooltip
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <div className="font-semibold text-gray-900 mb-2">{label}</div>
          {payload.map((entry: TooltipPayload, index: number) => {
            const semanticColor = getSemanticColor(entry.name);
            
            return (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-700">
                  {entry.name}: <span 
                    className="font-medium" 
                    style={{ color: semanticColor }}
                  >
                    {formatTooltipValue ? formatTooltipValue(entry.value, entry.name) : entry.value}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Renderizar o gráfico
  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center" style={{ height: chartHeight }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Carregando dados...</p>
          </div>
        </div>
      );
    }

    if (data.length === 0 || visibleConfigs.length === 0) {
      return (
        <div className="flex items-center justify-center text-center p-6" style={{ height: chartHeight }}>
          <div>
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
            <div className="text-sm text-gray-500 max-w-sm">{emptyMessage}</div>
          </div>
        </div>
      );
    }

    const chartProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    return (
      <ChartContainer
        config={{}}
        className="w-full"
        style={{ minHeight: chartHeight }}
      >
        {/* Warning do Recharts suprimido globalmente via ChartContainer - comportamento desejado para responsividade */}
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="periodo" 
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#666"
              tickFormatter={formatYAxisLabel}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {visibleConfigs.map((config) => (
              <Bar
                key={config.key}
                dataKey={config.key}
                fill={config.color}
                name={config.label}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  };

  // Aplicar configurações de container
  const cardClassName = `mt-6 ${containerClassName || ''}`;
  const cardStyle = containerMaxWidth ? { maxWidth: containerMaxWidth } : {};

  return (
    <Card className={cardClassName} style={cardStyle}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          {/* Controles do gráfico */}
          <div className="flex items-center gap-4">
            {/* Toggle de linhas de meta */}
            {showMetaLines && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-metas"
                  checked={showMetas}
                  onCheckedChange={setShowMetas}
                />
                <Label htmlFor="show-metas" className="text-xs flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Metas
                </Label>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Controles de visibilidade dos indicadores */}
        <div className="mb-4">
          {showToggleAllButton && (
            <div className="mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllVisibility}
                className="h-8 px-3 text-xs"
              >
                {chartConfigs.some(config => config.visible) ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Desmarcar Todos
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Marcar Todos
                  </>
                )}
              </Button>
            </div>
          )}
          
          {groupByVendedor ? (
            // Layout agrupado por vendedor
            <div className="space-y-3">
              {(() => {
                // Agrupar configurações por vendedor
                const vendedorGroups = new Map<string, TrendChartConfig[]>();
                chartConfigs.forEach(config => {
                  // Suportar múltiplos padrões de chaves
                  let match = config.key.match(/^vendedor_(.+?)_(POS|FIBRA)(_\w+)?$/); // Padrão antigo (permanência)
                  if (!match) {
                    // Verificar produtos diferenciais PRIMEIRO para evitar conflito com categorias principais
                    match = config.key.match(/^(.+?)_(CARTAO_CREDITO|DIGITAL_PEC_PIX|S_COBRANCA|SEGURO_POS|SEGURO_FIBRA)$/);
                  }
                  if (!match) {
                    match = config.key.match(/^(.+?)_(ticket_medio|pos_|fibra_|quantidade_|POS|PRE|FIBRA|NP|SKY\+)/); // Novos padrões (desempenho)
                  }
                  if (!match) {
                    // Padrão específico para desempenho por categoria: vendedor_CATEGORIA
                    match = config.key.match(/^(.+?)_(POS|PRE|FIBRA|NP|SKY\+)$/) || config.key.match(/^(.+?)_(SKY\+)$/);
                  }
                  
                  if (match) {
                    const vendedorKey = match[1];
                    const vendedorName = vendedorKey.replace(/_/g, ' ');
                    if (!vendedorGroups.has(vendedorName)) {
                      vendedorGroups.set(vendedorName, []);
                    }
                    vendedorGroups.get(vendedorName)!.push(config);
                  }
                });

                return Array.from(vendedorGroups.entries()).map(([vendedorName, configs]) => {
                  // Ordenar configurações baseado no tipo de componente
                  const configsOrdenadas = configs.sort((a, b) => {
                    // Verificar se é padrão de permanência
                    const aMatchPermanencia = a.key.match(/^vendedor_.+?_(POS|FIBRA)(_(\w+))?$/);
                    const bMatchPermanencia = b.key.match(/^vendedor_.+?_(POS|FIBRA)(_(\w+))?$/);
                    
                    if (aMatchPermanencia && bMatchPermanencia) {
                      const aTipo = aMatchPermanencia[1]; // POS ou FIBRA
                      const bTipo = bMatchPermanencia[1];
                      const aMetrica = aMatchPermanencia[3] || 'adimplencia'; // padrão é adimplência
                      const bMetrica = bMatchPermanencia[3] || 'adimplencia';
                      
                      // Primeiro por tipo (POS antes de FIBRA)
                      if (aTipo !== bTipo) {
                        return aTipo === 'POS' ? -1 : 1;
                      }
                      
                      // Depois por métrica (adimplência, inadimplência, cancelados)
                      const ordemMetricas = ['adimplencia', 'inadimplencia', 'cancelados'];
                      return ordemMetricas.indexOf(aMetrica) - ordemMetricas.indexOf(bMetrica);
                    }
                    
                    // Verificar se é padrão de desempenho por período
                    const aMatchPeriodo = a.key.match(/^.+?_(ticket_medio_total|pos_valor|fibra_valor|quantidade_total|pos_quantidade|fibra_quantidade)$/);
                    const bMatchPeriodo = b.key.match(/^.+?_(ticket_medio_total|pos_valor|fibra_valor|quantidade_total|pos_quantidade|fibra_quantidade)$/);
                    
                    if (aMatchPeriodo && bMatchPeriodo) {
                      const ordemPeriodo = ['ticket_medio_total', 'pos_valor', 'fibra_valor', 'quantidade_total', 'pos_quantidade', 'fibra_quantidade'];
                      return ordemPeriodo.indexOf(aMatchPeriodo[1]) - ordemPeriodo.indexOf(bMatchPeriodo[1]);
                    }
                    
                    // Verificar se é padrão de desempenho por categoria
                    const aMatchCategoria = a.key.match(/^.+?_(POS|PRE|FIBRA|NP|SKY\+)$/) || a.key.match(/^.+?_(SKY\+)$/);
                    const bMatchCategoria = b.key.match(/^.+?_(POS|PRE|FIBRA|NP|SKY\+)$/) || b.key.match(/^.+?_(SKY\+)$/);
                    
                    if (aMatchCategoria && bMatchCategoria) {
                      const ordemCategoria = ['POS', 'PRE', 'FIBRA', 'NP', 'SKY+'];
                      const aCat = aMatchCategoria[1] || aMatchCategoria[2];
                      const bCat = bMatchCategoria[1] || bMatchCategoria[2];
                      return ordemCategoria.indexOf(aCat) - ordemCategoria.indexOf(bCat);
                    }
                    
                    // Verificar se é padrão de produtos diferenciais
                    const aMatchDiferencial = a.key.match(/^.+?_(CARTAO_CREDITO|DIGITAL_PEC_PIX|S_COBRANCA|SEGURO_POS|SEGURO_FIBRA)$/);
                    const bMatchDiferencial = b.key.match(/^.+?_(CARTAO_CREDITO|DIGITAL_PEC_PIX|S_COBRANCA|SEGURO_POS|SEGURO_FIBRA)$/);
                    
                    if (aMatchDiferencial && bMatchDiferencial) {
                      const ordemDiferencial = ['CARTAO_CREDITO', 'DIGITAL_PEC_PIX', 'S_COBRANCA', 'SEGURO_POS', 'SEGURO_FIBRA'];
                      return ordemDiferencial.indexOf(aMatchDiferencial[1]) - ordemDiferencial.indexOf(bMatchDiferencial[1]);
                    }
                    
                    // Priorizar categorias principais sobre produtos diferenciais
                    if (aMatchCategoria && bMatchDiferencial) return -1;
                    if (aMatchDiferencial && bMatchCategoria) return 1;
                    
                    return 0;
                  });
                  
                  return (
                    <div key={vendedorName} className="border rounded-lg p-3 bg-gray-50">
                      <div className="text-sm font-medium text-gray-700 mb-2">{vendedorName}</div>
                      <div className="flex flex-wrap gap-2">
                        {configsOrdenadas.map((config) => {
                          const trend = calculateTrend(config.key);
                          return (
                            <Button
                              key={config.key}
                              variant={config.visible ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleIndicatorVisibility(config.key)}
                              className="h-8 px-3 text-xs"
                              style={{
                                backgroundColor: config.visible ? config.color : 'transparent',
                                borderColor: config.color,
                                color: config.visible ? 'white' : config.color
                              }}
                            >
                              {config.visible ? (
                                <Eye className="h-3 w-3 mr-1" />
                              ) : (
                                <EyeOff className="h-3 w-3 mr-1" />
                              )}
                              {config.label.replace(/^.+? - /, '')}
                              {data.length > 1 && config.visible && (
                                <Badge 
                                  variant="secondary" 
                                  className="ml-2 h-4 px-1 text-xs"
                                >
                                  {trend.direction === 'up' && <TrendingUp className="h-2 w-2 mr-1 text-green-600" />}
                                  {trend.direction === 'down' && <TrendingDown className="h-2 w-2 mr-1 text-red-600" />}
                                  {trend.percentage.toFixed(1)}%
                                </Badge>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                 });
               })()}
             </div>
          ) : (
            // Layout tradicional
            <div className="flex flex-wrap gap-2">
              {chartConfigs.map((config) => {
                const trend = calculateTrend(config.key);
                return (
                  <Button
                    key={config.key}
                    variant={config.visible ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleIndicatorVisibility(config.key)}
                    className="h-8 px-3 text-xs"
                    style={{
                      backgroundColor: config.visible ? config.color : 'transparent',
                      borderColor: config.color,
                      color: config.visible ? 'white' : config.color
                    }}
                  >
                    {config.visible ? (
                      <Eye className="h-3 w-3 mr-1" />
                    ) : (
                      <EyeOff className="h-3 w-3 mr-1" />
                    )}
                    {config.label.replace(/^.+? - /, '')}
                    {data.length > 1 && config.visible && (
                      <Badge 
                        variant="secondary" 
                        className="ml-2 h-4 px-1 text-xs"
                      >
                        {trend.direction === 'up' && <TrendingUp className="h-2 w-2 mr-1 text-green-600" />}
                        {trend.direction === 'down' && <TrendingDown className="h-2 w-2 mr-1 text-red-600" />}
                        {trend.percentage.toFixed(1)}%
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Gráfico */}
        {renderChart()}

        {/* Informações adicionais */}
        {data.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Período analisado: {data[0]?.periodo} - {data[data.length - 1]?.periodo}</span>
              <span>{data.length} período(s) selecionado(s)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 