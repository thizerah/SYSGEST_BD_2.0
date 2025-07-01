import React from 'react';
import { useLocalStorageMonitor } from '@/hooks/useLocalStorageMonitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Database, Upload, AlertCircle } from 'lucide-react';

export function ImportDataAnalyzer() {
  const { stats } = useLocalStorageMonitor();

  // Analisar dados das planilhas (incluindo as novas chaves do sistema)
  const importedDataFiles = stats.items.filter(item => {
    const key = item.key.toLowerCase();
    return key.includes('service-storage') || 
           key.includes('vendas') || 
           key.includes('servicios') || 
           key.includes('orders') ||
           key.includes('metas') ||
           key.includes('pagamentos') ||
           key.includes('permanencia') ||
           key.includes('responseTimeData') ||
           key.includes('import') ||
           key.includes('sysgest_') ||
           item.type === 'Dados';
  });

  const totalImportedSize = importedDataFiles.reduce((acc, item) => acc + item.size, 0);
  const totalImportedPercentage = stats.usedSize > 0 ? (totalImportedSize / stats.usedSize) * 100 : 0;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          <span>Análise dos Dados Importados</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Database className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Arquivos de Dados</p>
            <p className="text-lg font-bold text-blue-600">{importedDataFiles.length}</p>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Upload className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Tamanho Total</p>
            <p className="text-lg font-bold text-green-600">{formatBytes(totalImportedSize)}</p>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <AlertCircle className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium">% do Storage</p>
            <p className="text-lg font-bold text-purple-600">{totalImportedPercentage.toFixed(1)}%</p>
          </div>
        </div>

        {/* Lista de arquivos de dados */}
        <div>
          <h4 className="font-semibold mb-3">Dados das Planilhas Detectados:</h4>
          {importedDataFiles.length > 0 ? (
            <div className="space-y-2">
              {importedDataFiles.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.key}</p>
                    <p className="text-xs text-gray-600">
                      {item.type} • {((item.size / totalImportedSize) * 100).toFixed(1)}% dos dados
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{item.sizeFormatted}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum dado de planilha detectado no localStorage</p>
              <p className="text-xs mt-2">
                Os dados podem estar sendo salvos no Supabase ou em memória (React Context)
              </p>
            </div>
          )}
        </div>

        {/* Análise específica */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">🔍 Análise Detalhada:</h4>
          <div className="text-sm text-yellow-700 space-y-1">
            {stats.items.find(item => item.key.includes('sysgest_vendas')) && (
              <p>• <strong>Vendas</strong> ({formatBytes(stats.items.find(item => item.key.includes('sysgest_vendas'))?.size || 0)}) - Dados de vendas persistidos automaticamente</p>
            )}
            {stats.items.find(item => item.key.includes('sysgest_service_orders')) && (
              <p>• <strong>Ordens de Serviço</strong> ({formatBytes(stats.items.find(item => item.key.includes('sysgest_service_orders'))?.size || 0)}) - Dados de OS persistidos automaticamente</p>
            )}
            {stats.items.find(item => item.key.includes('sysgest_pagamentos')) && (
              <p>• <strong>Pagamentos</strong> ({formatBytes(stats.items.find(item => item.key.includes('sysgest_pagamentos'))?.size || 0)}) - Dados de primeiros pagamentos</p>
            )}
            {stats.items.find(item => item.key.includes('sysgest_metas')) && (
              <p>• <strong>Metas</strong> ({formatBytes(stats.items.find(item => item.key.includes('sysgest_metas'))?.size || 0)}) - Dados de metas mensais</p>
            )}
            {stats.items.find(item => item.key.includes('sysgest_vendas_meta')) && (
              <p>• <strong>Vendas Meta</strong> ({formatBytes(stats.items.find(item => item.key.includes('sysgest_vendas_meta'))?.size || 0)}) - Dados de vendas para cálculo de metas</p>
            )}
            {stats.items.find(item => item.key.includes('service-storage')) && (
              <p>• <strong>service-storage</strong> ({formatBytes(stats.items.find(item => item.key.includes('service-storage'))?.size || 0)}) - Dados antigos (pode ser removido)</p>
            )}
            {stats.items.find(item => item.key.includes('responseTimeData')) && (
              <p>• <strong>responseTimeData</strong> - Dados de tempo de resposta/métricas</p>
            )}
            {stats.items.filter(item => item.key.includes('sb-')).length > 0 && (
              <p>• <strong>Tokens Supabase</strong> - Sistema está usando banco de dados online</p>
            )}
            {importedDataFiles.length === 0 && (
              <p>• <strong>Nenhum dado encontrado:</strong> Os dados podem ter sido perdidos na atualização da página</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 