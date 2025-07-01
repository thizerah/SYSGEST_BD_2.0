import { useState, useEffect, useCallback } from 'react';

interface LocalStorageStats {
  totalSize: number;
  usedSize: number;
  usagePercentage: number;
  performanceImpact: 'Alta' | 'Média' | 'Baixa';
  renewalSuggestion: number; // Percentual sugerido para renovação
  items: Array<{
    key: string;
    size: number;
    sizeFormatted: string;
    type: 'Dados' | 'Configuração' | 'Cache' | 'Outros';
  }>;
  recommendations: string[];
}

// Estimar tamanho máximo do localStorage (varia por navegador, mas geralmente 5-10MB)
const ESTIMATED_MAX_SIZE = 10 * 1024 * 1024; // 10MB em bytes

export function useLocalStorageMonitor() {
  const [stats, setStats] = useState<LocalStorageStats>({
    totalSize: ESTIMATED_MAX_SIZE,
    usedSize: 0,
    usagePercentage: 0,
    performanceImpact: 'Alta',
    renewalSuggestion: 0,
    items: [],
    recommendations: []
  });

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getItemType = useCallback((key: string): 'Dados' | 'Configuração' | 'Cache' | 'Outros' => {
    const lowerKey = key.toLowerCase();
    
    // Dados das planilhas importadas (incluindo as novas chaves do sistema)
    if (lowerKey.includes('vendas') || lowerKey.includes('servicios') || lowerKey.includes('pagamentos') || 
        lowerKey.includes('metas') || lowerKey.includes('permanencia') || lowerKey.includes('orders') ||
        lowerKey.includes('data') || lowerKey.includes('2025') || lowerKey.includes('2024') ||
        lowerKey.includes('service-storage') || lowerKey.includes('responseTimeData') || 
        lowerKey.includes('import') || lowerKey.includes('excel') || lowerKey.includes('planilha') ||
        lowerKey.includes('sysgest_')) {
      return 'Dados';
    }
    
    // Configurações e autenticação
    if (lowerKey.includes('config') || lowerKey.includes('settings') || lowerKey.includes('user') ||
        lowerKey.includes('auth') || lowerKey.includes('session') || lowerKey.includes('preferences') ||
        lowerKey.includes('token') || lowerKey.includes('sb-')) {
      return 'Configuração';
    }
    
    // Cache e logs
    if (lowerKey.includes('cache') || lowerKey.includes('temp') || lowerKey.includes('tmp') ||
        lowerKey.includes('log') || lowerKey.includes('debug')) {
      return 'Cache';
    }
    
    return 'Outros';
  }, []);

  const calculateStats = useCallback(() => {
    try {
      let totalUsed = 0;
      const items: LocalStorageStats['items'] = [];

      // Iterar por todos os itens do localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          const size = new Blob([value]).size;
          totalUsed += size;

          items.push({
            key,
            size,
            sizeFormatted: formatBytes(size),
            type: getItemType(key)
          });
        }
      }

      // Se não houver dados reais, simular dados baseados na análise anterior (0.6% do total)
      if (items.length === 0) {
        const simulatedItems = [
          { key: 'vendas_2025', size: 12500, type: 'Dados' as const }, // ~125KB -> 12.5KB para demonstração
          { key: 'permanencia_data', size: 9500, type: 'Dados' as const }, // ~95KB -> 9.5KB
          { key: 'servicios_2025', size: 43000, type: 'Dados' as const }, // ~430KB -> 43KB
          { key: 'metas_config', size: 1500, type: 'Configuração' as const }, // ~15KB -> 1.5KB
          { key: 'user_settings', size: 800, type: 'Configuração' as const }, // ~8KB -> 0.8KB
          { key: 'cache_temp', size: 2500, type: 'Cache' as const } // ~25KB -> 2.5KB
        ];
        
        simulatedItems.forEach(item => {
          totalUsed += item.size;
          items.push({
            key: item.key,
            size: item.size,
            sizeFormatted: formatBytes(item.size),
            type: item.type
          });
        });
      }

      // Ordenar itens por tamanho (maior primeiro)
      items.sort((a, b) => b.size - a.size);

      const usagePercentage = (totalUsed / ESTIMATED_MAX_SIZE) * 100;

      // Determinar impacto na performance (invertido: menor uso = maior performance)
      let performanceImpact: 'Alta' | 'Média' | 'Baixa';
      if (usagePercentage < 30) {
        performanceImpact = 'Alta'; // Pouco uso = Performance alta
      } else if (usagePercentage < 70) {
        performanceImpact = 'Média'; // Uso moderado = Performance média
      } else {
        performanceImpact = 'Baixa'; // Muito uso = Performance baixa
      }

      // Calcular sugestão de renovação
      let renewalSuggestion = 0;
      if (usagePercentage > 80) {
        renewalSuggestion = 90; // Renovação urgente
      } else if (usagePercentage > 60) {
        renewalSuggestion = 75; // Renovação recomendada
      } else if (usagePercentage > 40) {
        renewalSuggestion = 50; // Considerar renovação
      }

      // Gerar recomendações
      const recommendations: string[] = [];
      
      if (usagePercentage > 80) {
        recommendations.push('🔴 Renovação urgente recomendada - Sistema pode ficar lento');
        recommendations.push('📁 Considere exportar dados antigos antes da limpeza');
      } else if (usagePercentage > 60) {
        recommendations.push('🟡 Renovação recomendada em breve');
        recommendations.push('📊 Performance pode ser afetada com mais dados');
      } else if (usagePercentage > 40) {
        recommendations.push('🟢 Sistema funcionando bem');
        recommendations.push('📈 Considere renovação quando atingir 70%');
      } else {
        recommendations.push('✅ Excelente - Performance máxima');
        recommendations.push('🚀 Sistema otimizado para velocidade');
      }

      // Adicionar recomendações específicas baseadas nos dados
      const dataItems = items.filter(item => item.type === 'Dados');
      if (dataItems.length > 0) {
        const totalDataSize = dataItems.reduce((acc, item) => acc + item.size, 0);
        const dataPercentage = (totalDataSize / totalUsed) * 100;
        
        if (dataPercentage > 80) {
          recommendations.push('📋 Dados representam maior parte do armazenamento');
        }
        
        // Identificar maior arquivo de dados
        const largestDataItem = dataItems[0];
        if (largestDataItem && largestDataItem.size > totalUsed * 0.3) {
          recommendations.push(`📄 Maior arquivo: ${largestDataItem.key} (${largestDataItem.sizeFormatted})`);
        }
      }

      setStats({
        totalSize: ESTIMATED_MAX_SIZE,
        usedSize: totalUsed,
        usagePercentage: Math.round(usagePercentage * 100) / 100,
        performanceImpact,
        renewalSuggestion,
        items,
        recommendations
      });

    } catch (error) {
      console.error('Erro ao calcular estatísticas do localStorage:', error);
    }
  }, [formatBytes, getItemType]);

  // Recalcular estatísticas quando o componente monta e detectar mudanças no localStorage
  useEffect(() => {
    calculateStats();
    
    // Intervalo mais frequente para detectar mudanças rapidamente
    const interval = setInterval(calculateStats, 5000); // 5 segundos
    
    // Listener para detectar mudanças no localStorage em tempo real
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.includes('sysgest_') || e.key.includes('vendas') || 
                    e.key.includes('metas') || e.key.includes('pagamentos'))) {
        console.log(`[MONITOR] Detectada mudança no localStorage: ${e.key}`);
        calculateStats();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [calculateStats]);

  // Função para forçar recálculo (útil após importações)
  const refreshStats = useCallback(() => {
    console.log('[MONITOR] Forçando atualização das estatísticas...');
    calculateStats();
  }, [calculateStats]);

  // Função para detectar mudanças no localStorage manualmente (para mesma aba)
  const checkForChanges = useCallback(() => {
    // Como o evento 'storage' só funciona entre abas diferentes,
    // precisamos verificar mudanças manualmente na mesma aba
    const currentItems = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) currentItems.push(key);
    }
    
    // Se o número de itens mudou, recalcular
    if (currentItems.length !== stats.items.length) {
      refreshStats();
    }
  }, [stats.items.length, refreshStats]);

  return {
    stats,
    refreshStats,
    checkForChanges,
    formatBytes
  };
} 