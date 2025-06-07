/**
 * ImportDataManager - Componente dedicado para importação de dados
 * Etapa 9.4: Extraído do MetricsOverview para melhor modularidade
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, FileIcon, X, Trash } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ServiceOrder, Venda, PrimeiroPagamento } from '@/types';
import useServiceOrdersData from '@/context/useServiceOrdersData';
import useVendasData from '@/context/useVendasData';
import usePagamentosData from '@/context/usePagamentosData';
import useGlobalData from '@/context/useGlobalData';

interface ImportDataManagerProps {
  onImportSuccess?: () => void;
  allowedFileTypes?: ('serviceOrders' | 'vendas' | 'pagamentos')[];
}

type FileType = 'serviceOrders' | 'vendas' | 'pagamentos';

interface FileData {
  file: File;
  type: FileType;
  data?: Record<string, unknown>[];
  error?: string;
  isProcessing?: boolean;
}

export const ImportDataManager: React.FC<ImportDataManagerProps> = React.memo(({
  onImportSuccess,
  allowedFileTypes = ['serviceOrders', 'vendas', 'pagamentos']
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados do componente
  const [filesData, setFilesData] = useState<FileData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Hooks de contexto
  const { importServiceOrders } = useServiceOrdersData();
  const { importVendas } = useVendasData(); 
  const { importPrimeirosPagamentos } = usePagamentosData();
  const { clearData } = useGlobalData();

  // Mapear tipo para display
  const getFileTypeDisplay = useCallback((type: FileType): string => {
    const typeMap = {
      serviceOrders: 'Ordens de Serviço',
      vendas: 'Vendas',
      pagamentos: 'Pagamentos'
    };
    return typeMap[type];
  }, []);

  // Detectar tipo de arquivo baseado no conteúdo
  const detectFileType = useCallback((data: Record<string, unknown>[]): FileType | null => {
    if (data.length === 0) return null;
    
    const firstRow = data[0];
    const columns = Object.keys(firstRow).map(key => key.toLowerCase().trim());
    
    // Detectar Ordens de Serviço
    if (columns.some(col => col.includes('codigo_os') || col.includes('código_os') || col.includes('os'))) {
      return 'serviceOrders';
    }
    
    // Detectar Vendas
    if (columns.some(col => col.includes('numero_proposta') || col.includes('número_proposta') || col.includes('proposta'))) {
      return 'vendas';
    }
    
    // Detectar Pagamentos
    if (columns.some(col => col.includes('passo') || col.includes('vencimento') || col.includes('status_pacote'))) {
      return 'pagamentos';
    }
    
    return null;
  }, []);

  // Processar dados de ordens de serviço
  const processServiceOrdersData = useCallback((data: Record<string, unknown>[]): ServiceOrder[] => {
    // Implementação simplificada - pode ser expandida conforme necessário
    return data.map((row, index) => {
      try {
        const findColumn = (possibleNames: string[]): string | undefined => {
          const columns = Object.keys(row);
          return columns.find(col => 
            possibleNames.some(name => 
              col.toLowerCase().includes(name.toLowerCase())
            )
          );
        };

        const codigoOSCol = findColumn(['codigo_os', 'código_os', 'os', 'numero_os']);
        const tipoServicoCol = findColumn(['tipo_servico', 'tipo', 'subtipo_servico']);
        const statusCol = findColumn(['status', 'situacao']);
        const tecnicoCol = findColumn(['tecnico', 'técnico', 'nome_tecnico']);
        
        return {
          codigo_os: row[codigoOSCol || '']?.toString() || `TEMP_${index}`,
          id_tecnico: '',
          nome_tecnico: row[tecnicoCol || '']?.toString() || '',
          sigla_tecnico: '',
          tipo_servico: row[tipoServicoCol || '']?.toString() || '',
          subtipo_servico: row[tipoServicoCol || '']?.toString() || '',
          motivo: '',
          codigo_cliente: '',
          nome_cliente: '',
          status: row[statusCol || '']?.toString() || '',
          data_criacao: '',
          data_finalizacao: '',
          cidade: '',
          bairro: ''
        };
      } catch (error) {
        console.error(`Erro ao processar linha ${index}:`, error);
        return {
          codigo_os: `ERROR_${index}`,
          id_tecnico: '',
          nome_tecnico: '',
          sigla_tecnico: '',
          tipo_servico: '',
          subtipo_servico: '',
          motivo: '',
          codigo_cliente: '',
          nome_cliente: '',
          status: '',
          data_criacao: '',
          data_finalizacao: '',
          cidade: '',
          bairro: ''
        };
      }
    });
  }, []);

  // Processar dados de vendas
  const processVendasData = useCallback((data: Record<string, unknown>[]): Venda[] => {
    return data.map((row, index) => ({
      numero_proposta: row.numero_proposta?.toString() || `TEMP_${index}`,
      id_vendedor: row.id_vendedor?.toString() || '',
      nome_proprietario: row.nome_proprietario?.toString() || '',
      cpf: row.cpf?.toString() || '',
      nome_fantasia: row.nome_fantasia?.toString() || '',
      agrupamento_produto: row.agrupamento_produto?.toString() || '',
      produto_principal: row.produto_principal?.toString() || '',
      valor: Number(row.valor) || 0,
      status_proposta: row.status_proposta?.toString() || '',
      data_habilitacao: row.data_habilitacao?.toString() || '',
      telefone_celular: row.telefone_celular?.toString() || ''
    }));
  }, []);

  // Processar dados de pagamentos
  const processPagamentosData = useCallback((data: Record<string, unknown>[]): PrimeiroPagamento[] => {
    return data.map((row, index) => ({
      proposta: row.proposta?.toString() || `TEMP_${index}`,
      passo: row.passo?.toString() || '',
      data_passo_cobranca: row.data_passo_cobranca?.toString() || '',
      vencimento_fatura: row.vencimento_fatura?.toString() || '',
      status_pacote: row.status_pacote?.toString() || '',
      data_importacao: new Date().toISOString()
    }));
  }, []);

  // Processar arquivo
  const processFile = useCallback(async (file: File): Promise<FileData> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
          
          if (jsonData.length === 0) {
            resolve({
              file,
              type: 'serviceOrders',
              error: 'Arquivo vazio ou sem dados válidos'
            });
            return;
          }
          
          const detectedType = detectFileType(jsonData);
          
          if (!detectedType) {
            resolve({
              file,
              type: 'serviceOrders',
              error: 'Tipo de arquivo não reconhecido'
            });
            return;
          }
          
          if (!allowedFileTypes.includes(detectedType)) {
            resolve({
              file,
              type: detectedType,
              error: `Tipo ${getFileTypeDisplay(detectedType)} não permitido`
            });
            return;
          }
          
          resolve({
            file,
            type: detectedType,
            data: jsonData
          });
          
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          resolve({
            file,
            type: 'serviceOrders',
            error: 'Erro ao processar arquivo Excel'
          });
        }
      };
      
      reader.onerror = () => {
        resolve({
          file,
          type: 'serviceOrders',
          error: 'Erro ao ler arquivo'
        });
      };
      
      reader.readAsBinaryString(file);
    });
  }, [detectFileType, allowedFileTypes, getFileTypeDisplay]);

  // Manipular seleção de arquivos
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      const processedFiles = await Promise.all(
        files.map(file => processFile(file))
      );
      
      setFilesData(prev => [...prev, ...processedFiles]);
      
      toast({
        title: "Arquivos carregados",
        description: `${files.length} arquivo(s) processado(s) com sucesso`,
      });
      
    } catch (error) {
      console.error('Erro ao processar arquivos:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar arquivos",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [processFile, toast]);

  // Remover arquivo
  const removeFile = useCallback((index: number) => {
    setFilesData(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Limpar todos os arquivos
  const clearFiles = useCallback(() => {
    setFilesData([]);
  }, []);

  // Processar dados baseado no tipo
  const processDataByType = useCallback((type: FileType, data: Record<string, unknown>[]): ServiceOrder[] | Venda[] | PrimeiroPagamento[] => {
    switch (type) {
      case 'serviceOrders':
        return processServiceOrdersData(data);
      case 'vendas':
        return processVendasData(data);
      case 'pagamentos':
        return processPagamentosData(data);
      default:
        return [];
    }
  }, [processServiceOrdersData, processVendasData, processPagamentosData]);

  // Importar dados
  const handleImport = useCallback(async () => {
    const validFiles = filesData.filter(f => f.data && !f.error);
    
    if (validFiles.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum arquivo válido para importar",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      for (const fileData of validFiles) {
        const processedData = processDataByType(fileData.type, fileData.data!);
        
        switch (fileData.type) {
          case 'serviceOrders':
            await importServiceOrders(processedData as ServiceOrder[]);
            break;
          case 'vendas':
            await importVendas(processedData as Venda[]);
            break;
          case 'pagamentos':
            await importPrimeirosPagamentos(processedData as PrimeiroPagamento[]);
            break;
        }
      }
      
      toast({
        title: "Importação concluída",
        description: `${validFiles.length} arquivo(s) importado(s) com sucesso`,
      });
      
      clearFiles();
      onImportSuccess?.();
      
    } catch (error) {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: "Erro ao importar dados",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [filesData, processDataByType, importServiceOrders, importVendas, importPrimeirosPagamentos, toast, clearFiles, onImportSuccess]);

  // Estatísticas dos arquivos
  const fileStats = useMemo(() => {
    const stats = {
      total: filesData.length,
      valid: filesData.filter(f => f.data && !f.error).length,
      errors: filesData.filter(f => f.error).length,
      byType: {} as Record<FileType, number>
    };

    allowedFileTypes.forEach(type => {
      stats.byType[type] = filesData.filter(f => f.type === type && f.data && !f.error).length;
    });

    return stats;
  }, [filesData, allowedFileTypes]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Importação de Dados</h2>
          <p className="text-gray-600">Importe dados a partir de arquivos Excel</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Selecionar Arquivos
          </Button>
          {filesData.length > 0 && (
            <Button
              variant="outline"
              onClick={clearFiles}
              disabled={isUploading}
            >
              <Trash className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Input de arquivo (oculto) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Estatísticas */}
      {fileStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo dos Arquivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{fileStats.total}</div>
                <div className="text-sm text-blue-700">Total</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{fileStats.valid}</div>
                <div className="text-sm text-green-700">Válidos</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{fileStats.errors}</div>
                <div className="text-sm text-red-700">Com Erro</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {Object.values(fileStats.byType).reduce((a, b) => a + b, 0)}
                </div>
                <div className="text-sm text-gray-700">Prontos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de arquivos */}
      {filesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Arquivos Selecionados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filesData.map((fileData, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileIcon className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="font-medium">{fileData.file.name}</div>
                    <div className="text-sm text-gray-500">
                      {getFileTypeDisplay(fileData.type)} • {(fileData.file.size / 1024).toFixed(1)} KB
                    </div>
                    {fileData.data && (
                      <div className="text-sm text-green-600">
                        {fileData.data.length} registros
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {fileData.error ? (
                    <Alert className="py-1 px-2 text-xs">
                      <AlertDescription>{fileData.error}</AlertDescription>
                    </Alert>
                  ) : fileData.data ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Pronto
                    </span>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Botões de ação */}
      {fileStats.valid > 0 && (
        <div className="flex justify-center gap-4">
          <Button
            onClick={handleImport}
            disabled={isUploading}
            className="min-w-[150px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar Dados
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => clearData()}
            disabled={isUploading}
          >
            Limpar Dados Existentes
          </Button>
        </div>
      )}
    </div>
  );
});

ImportDataManager.displayName = 'ImportDataManager'; 