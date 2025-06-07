/**
 * Aba de Importação de Dados - Modularizada
 * Gerenciamento de upload e importação de dados
 */

import React, { useState } from 'react';
import { FileUp, Upload, Database, AlertCircle, CheckCircle, Trash2, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from '@/components/common';
import { FilterControls } from './shared/FilterControls';
import { toast } from "@/hooks/use-toast";
import useServiceOrdersData from '@/context/useServiceOrdersData';
import useVendasData from '@/context/useVendasData';
import usePagamentosData from '@/context/usePagamentosData';
import useGlobalData from '@/context/useGlobalData';
import { ServiceOrder } from '@/types';
import * as XLSX from 'xlsx';

interface DashboardState {
  selectedMonth: string | null;
  selectedYear: string | null;
  isFiltering: boolean;
  availableMonths: string[];
  availableYears: string[];
  setSelectedMonth: (month: string | null) => void;
  setSelectedYear: (year: string | null) => void;
  handleApplyFilters: () => void;
  handleClearFilters: () => void;
}

interface ImportDataTabProps {
  dashboard: DashboardState & {
    activeTab: string;
    showData: boolean;
    filteredServiceOrders: ServiceOrder[];
  };
}

export function ImportDataTab({ dashboard }: ImportDataTabProps) {
  const { serviceOrders, importServiceOrders } = useServiceOrdersData();
  const { vendas, importVendas } = useVendasData();
  const { primeirosPagamentos, importPrimeirosPagamentos } = usePagamentosData();
  const { clearData, loading } = useGlobalData();
  
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'service_orders' | 'vendas' | 'pagamentos'>('service_orders');
  const [isProcessing, setIsProcessing] = useState(false);

  // Função para processar upload de arquivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Erro no arquivo",
        description: "Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV.",
        variant: "destructive",
      });
      return;
    }

    setUploadFile(file);
    toast({
      title: "Arquivo selecionado",
      description: `${file.name} pronto para importação.`,
    });
  };

  // Função para processar importação
  const handleImport = async () => {
    if (!uploadFile) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo para importar.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const data = await uploadFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      if (jsonData.length === 0) {
        throw new Error("Arquivo vazio ou sem dados válidos");
      }

      switch (importType) {
        case 'service_orders': {
          // Processar ordens de serviço (reutilizar lógica existente)
          const processedOrders = processServiceOrderData(jsonData);
          importServiceOrders(processedOrders, false);
          toast({
            title: "Importação concluída",
            description: `${processedOrders.length} ordens de serviço importadas com sucesso.`,
          });
          break;
        }

        case 'vendas': {
          // Processar vendas (implementação básica)
          const processedVendas = processVendasData(jsonData);
          importVendas(processedVendas, false);
          toast({
            title: "Importação concluída",
            description: `${processedVendas.length} vendas importadas com sucesso.`,
          });
          break;
        }

        case 'pagamentos': {
          // Processar pagamentos (implementação básica)
          const processedPagamentos = processPagamentosData(jsonData);
          importPrimeirosPagamentos(processedPagamentos, false);
          toast({
            title: "Importação concluída",
            description: `${processedPagamentos.length} pagamentos importados com sucesso.`,
          });
          break;
        }

        default:
          throw new Error("Tipo de importação não suportado");
      }

    } catch (error) {
      console.error("Erro na importação:", error);
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido durante a importação.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setUploadFile(null);
    }
  };

  // Função auxiliar para processar dados de ordens de serviço
  const processServiceOrderData = (data: unknown[]): ServiceOrder[] => {
    return data.map((row, index) => {
      const rowData = row as Record<string, unknown>;
      const formatDateLocal = (dateStr: string | null | undefined, isFinalizacao = false): string => {
        if (!dateStr || dateStr.trim() === "") {
          return isFinalizacao ? "" : new Date().toISOString().split('T')[0];
        }
        
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            return isFinalizacao ? "" : new Date().toISOString().split('T')[0];
          }
          return date.toISOString().split('T')[0];
        } catch {
          return isFinalizacao ? "" : new Date().toISOString().split('T')[0];
        }
      };

      return {
        codigo_os: String(rowData["Código OS"] || `OS_${index + 1}`),
        id_tecnico: String(rowData["ID Técnico"] || ""),
        nome_tecnico: String(rowData["Técnico"] || ""),
        sigla_tecnico: String(rowData["SGL"] || ""),
        tipo_servico: String(rowData["Tipo de serviço"] || ""),
        subtipo_servico: String(rowData["Sub-Tipo de serviço"] || ""),
        motivo: String(rowData["Motivo"] || ""),
        codigo_cliente: String(rowData["Código Cliente"] || ""),
        nome_cliente: String(rowData["Cliente"] || ""),
        status: String(rowData["Status"] || ""),
        data_criacao: formatDateLocal(rowData["Criação"] as string),
        data_finalizacao: formatDateLocal(rowData["Finalização"] as string, true),
        cidade: String(rowData["Cidade"] || ""),
        bairro: String(rowData["Bairro"] || ""),
        info_ponto_de_referencia: rowData["Info: ponto_de_ref"] as string || null,
        info_cto: rowData["Info: info_cto"] as string || null,
        info_porta: rowData["Info: info_porta"] as string || null,
        info_endereco_completo: rowData["Info: info_endereco_completo"] as string || null,
        info_empresa_parceira: rowData["Info: info_empresa_parceira"] as string || null
      };
    });
  };

  // Função auxiliar para processar dados de vendas
  const processVendasData = (data: unknown[]) => {
    return data.map((row) => {
      const rowData = row as Record<string, unknown>;
      return {
        numero_proposta: String(rowData["Número da proposta"] || ""),
        id_vendedor: String(rowData["ID do vendedor"] || ""),
        nome_proprietario: String(rowData["Nome proprietário"] || ""),
        cpf: String(rowData["CPF"] || ""),
        nome_fantasia: String(rowData["Nome fantasia"] || ""),
        agrupamento_produto: String(rowData["Agrupamento do produto"] || ""),
        produto_principal: String(rowData["Produto principal"] || ""),
        valor: Number(rowData["Valor"] || 0),
        status_proposta: String(rowData["Status da proposta"] || ""),
        data_habilitacao: String(rowData["Data de habilitação"] || ""),
        telefone_celular: String(rowData["Telefone celular"] || "")
      };
    });
  };

  // Função auxiliar para processar dados de pagamentos
  const processPagamentosData = (data: unknown[]) => {
    return data.map((row) => {
      const rowData = row as Record<string, unknown>;
      return {
        proposta: String(rowData["Proposta"] || ""),
        passo: String(rowData["Passo"] || ""),
        data_passo_cobranca: String(rowData["Data Passo Cobrança"] || ""),
        vencimento_fatura: String(rowData["Vencimento Fatura"] || ""),
        status_pacote: String(rowData["Status Pacote"] || ""),
        data_importacao: new Date().toISOString()
      };
    });
  };

  // Função para limpar dados
  const handleClearData = () => {
    clearData();
    toast({
      title: "Dados limpos",
      description: "Todos os dados foram removidos com sucesso.",
    });
  };

  // Função para exportar dados
  const handleExportData = () => {
    try {
      const exportData = {
        ordens_de_servico: serviceOrders,
        vendas: vendas,
        pagamentos: primeirosPagamentos,
        exportado_em: new Date().toISOString()
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_dados_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportação concluída",
        description: "Dados exportados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Erro ao exportar os dados.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <FilterControls dashboard={dashboard} activeTab={dashboard.activeTab} />
      
      <div className="space-y-6">
        {/* Cards de Status dos Dados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Ordens de Serviço"
            value={serviceOrders.length}
            subtitle="Registros carregados"
            icon={Database}
            variant={serviceOrders.length > 0 ? "success" : "warning"}
          />
          
          <MetricCard
            title="Vendas"
            value={vendas.length}
            subtitle="Registros carregados"
            icon={Database}
            variant={vendas.length > 0 ? "success" : "warning"}
          />
          
          <MetricCard
            title="Pagamentos"
            value={primeirosPagamentos.length}
            subtitle="Registros carregados"
            icon={Database}
            variant={primeirosPagamentos.length > 0 ? "success" : "warning"}
          />
        </div>

        {/* Seção de Importação */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center">
                <FileUp className="mr-2 h-5 w-5" />
                Importar Dados
              </div>
            </CardTitle>
            <CardDescription>
              Importe arquivos Excel ou CSV com dados do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Seleção do tipo de importação */}
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de Dados</label>
                <select 
                  value={importType} 
                  onChange={(e) => setImportType(e.target.value as 'service_orders' | 'vendas' | 'pagamentos')}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="service_orders">Ordens de Serviço</option>
                  <option value="vendas">Vendas</option>
                  <option value="pagamentos">Pagamentos</option>
                </select>
              </div>

              {/* Upload de arquivo */}
              <div>
                <label className="block text-sm font-medium mb-2">Arquivo</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
                {uploadFile && (
                  <div className="mt-2 flex items-center text-sm text-green-600">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    {uploadFile.name} selecionado
                  </div>
                )}
              </div>

              {/* Botões de ação */}
              <div className="flex space-x-2">
                <Button 
                  onClick={handleImport}
                  disabled={!uploadFile || isProcessing || loading}
                  className="flex items-center"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isProcessing ? "Importando..." : "Importar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Gerenciamento */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Gerenciamento de Dados
              </div>
            </CardTitle>
            <CardDescription>
              Operações de backup e limpeza dos dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Button 
                  onClick={handleExportData}
                  variant="outline"
                  className="flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Backup
                </Button>
                
                <Button 
                  onClick={handleClearData}
                  variant="destructive"
                  className="flex items-center"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Todos os Dados
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center mb-1">
                  <AlertCircle className="mr-1 h-4 w-4" />
                  Importante:
                </div>
                <ul className="list-disc list-inside space-y-1 ml-5">
                  <li>Exporte um backup antes de limpar os dados</li>
                  <li>A operação de limpeza é irreversível</li>
                  <li>Certifique-se que os arquivos Excel seguem o formato correto</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Informações */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center">
                <AlertCircle className="mr-2 h-5 w-5" />
                Formatos Suportados
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Ordens de Serviço</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Código OS</li>
                  <li>ID Técnico</li>
                  <li>Técnico</li>
                  <li>SGL</li>
                  <li>Tipo de serviço</li>
                  <li>Sub-Tipo de serviço</li>
                  <li>Motivo</li>
                  <li>Status</li>
                  <li>Criação</li>
                  <li>Finalização</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Vendas</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Número da proposta</li>
                  <li>ID do vendedor</li>
                  <li>Nome proprietário</li>
                  <li>CPF</li>
                  <li>Nome fantasia</li>
                  <li>Agrupamento do produto</li>
                  <li>Produto principal</li>
                  <li>Valor</li>
                  <li>Status da proposta</li>
                  <li>Data de habilitação</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Pagamentos</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Proposta</li>
                  <li>Passo</li>
                  <li>Data Passo Cobrança</li>
                  <li>Vencimento Fatura</li>
                  <li>Status Pacote</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 