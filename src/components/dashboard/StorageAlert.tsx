import React from 'react';
import { useLocalStorageMonitor } from '@/hooks/useLocalStorageMonitor';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Database, TrendingUp } from 'lucide-react';

export function StorageAlert() {
  const { stats } = useLocalStorageMonitor();

  // Só mostrar alerta se o uso for maior que 60%
  if (stats.usagePercentage <= 60) {
    return null;
  }

  const isUrgent = stats.usagePercentage > 80;
  const isWarning = stats.usagePercentage > 60;

  return (
    <Alert className={`${isUrgent ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'} mb-4`}>
      <div className="flex items-center space-x-2">
        {isUrgent ? (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        ) : (
          <Database className="h-4 w-4 text-yellow-600" />
        )}
        <AlertDescription className={`${isUrgent ? 'text-red-800' : 'text-yellow-800'} font-medium`}>
          {isUrgent ? (
            <>
              <strong>⚠️ Atenção:</strong> Armazenamento em {stats.usagePercentage.toFixed(1)}% 
              - Renovação urgente recomendada para manter a performance
            </>
          ) : (
            <>
              <strong>📊 Aviso:</strong> Armazenamento em {stats.usagePercentage.toFixed(1)}% 
              - Considere renovar os dados em breve
            </>
          )}
          {stats.renewalSuggestion > 0 && (
            <span className="ml-2 inline-flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              Sugestão: {stats.renewalSuggestion}%
            </span>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
} 