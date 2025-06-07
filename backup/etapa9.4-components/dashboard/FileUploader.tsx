import React, { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import useServiceOrdersData from '@/context/useServiceOrdersData';
import useGlobalData from '@/context/useGlobalData';
import { ServiceOrder } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, AlertCircle, CheckCircle2, FileSpreadsheet, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from "xlsx";
import { validateFileType, validateRequiredFields, REQUIRED_FIELDS } from "@/utils/validators";
import { formatExcelDate } from "@/utils/dateUtils";
import { SERVICE_ORDER_FIELD_MAPPING } from "@/constants/fieldMappings";

interface FileUploaderProps {
  onUploadComplete?: (count: number) => void;
  className?: string;
}

export function FileUploader({ onUploadComplete, className = "" }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const { importServiceOrders } = useServiceOrdersData();
  const { clearData } = useGlobalData();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (!validateFileType(selectedFile)) {
        setError("Formato de arquivo inválido. Use .xlsx ou .csv");
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Nenhum arquivo selecionado");
      return;
    }

    setProcessing(true);
    setProgress(10);
    
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          setProgress(30);
          const data = e.target?.result;
          if (!data) throw new Error("Erro ao ler o arquivo");
          
          const workbook = XLSX.read(data, { type: 'binary' });
          setProgress(50);
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });
          setProgress(70);
          
          if (!jsonData || jsonData.length === 0) {
            throw new Error("Nenhum dado encontrado no arquivo");
          }
          
          console.log("Cabeçalhos na planilha:", Object.keys(jsonData[0]).join(", "));
          console.log("Primeira linha de dados:", jsonData[0]);
          
          const processedData = processData(jsonData as Record<string, unknown>[]);
          setProgress(90);
          
          importServiceOrders(processedData);
          setProgress(100);
          
          toast({
            title: "Importação concluída",
            description: `${processedData.length} ordens de serviço importadas com sucesso.`
          });
          
          setFile(null);
          onUploadComplete?.(processedData.length);
        } catch (err) {
          console.error('Error processing file:', err);
          setError(err instanceof Error ? err.message : "Erro ao processar o arquivo");
          toast({
            variant: "destructive",
            title: "Erro na importação",
            description: err instanceof Error ? err.message : "Falha ao processar o arquivo"
          });
        } finally {
          setProcessing(false);
          setProgress(0);
        }
      };
      
      reader.onerror = () => {
        setError("Erro ao ler o arquivo");
        setProcessing(false);
        setProgress(0);
      };
      
      reader.readAsBinaryString(file);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : "Erro na importação");
      setProcessing(false);
      setProgress(0);
    }
  };

  const processData = (data: Record<string, unknown>[]): ServiceOrder[] => {
    if (data.length === 0) {
      throw new Error("Nenhum dado encontrado para processamento");
    }
    
    const validation = validateRequiredFields(data, REQUIRED_FIELDS);
    if (!validation.isValid) {
      throw new Error(`Campos obrigatórios ausentes na planilha: ${validation.missingFields.join(", ")}`);
    }
    
    const processedOrders = data.map((row, index) => {
      const formatDateLocal = (dateStr: string | null | undefined, isFinalizacao = false): string => {
        const status = String(row["Status"] || "");
        if (isFinalizacao && status.toUpperCase() === "CANCELADA") {
          if (!dateStr || dateStr.trim() === "") {
            if (row["Criação"]) {
              console.log(`[FileUploader] OS ${row["Código OS"]}: Status Cancelada - Usando data de criação como finalização`);
              return formatExcelDate(row["Criação"] as string, false);
            } else {
              throw new Error(`OS ${row["Código OS"]} cancelada não possui data de criação válida`);
            }
          }
        }
        
        try {
          return formatExcelDate(dateStr, isFinalizacao);
        } catch (error) {
          throw new Error(`${error} na linha ${index + 2}`);
        }
      };
      
      let subtipo = String(row["Sub-Tipo de serviço"]);
      const pacote = String(row["Pacote"] || "");
      
      console.log(`[FileUploader] Processando OS ${row["Código OS"]}: Subtipo original="${subtipo}", Pacote="${pacote}"`);
      
      if (subtipo === "Corretiva" && pacote.toUpperCase().includes("FIBRA")) {
        subtipo = "Corretiva BL";
        console.log(`[FileUploader] OS ${row["Código OS"]}: Alterado subtipo de "Corretiva" para "Corretiva BL" (Pacote: ${pacote})`);
      } else {
        console.log(`[FileUploader] OS ${row["Código OS"]}: Mantido subtipo="${subtipo}" (condição não atendida)`);
      }
      
      const order: ServiceOrder = {
        codigo_os: String(row["Código OS"]),
        id_tecnico: row["ID Técnico"] ? String(row["ID Técnico"]) : "",
        nome_tecnico: String(row["Técnico"]),
        sigla_tecnico: String(row["SGL"]),
        tipo_servico: String(row["Tipo de serviço"]),
        subtipo_servico: subtipo,
        motivo: String(row["Motivo"]),
        codigo_cliente: String(row["Código Cliente"]),
        nome_cliente: String(row["Cliente"]),
        status: String(row["Status"]),
        data_criacao: formatDateLocal(row["Criação"] as string | null, false),
        data_finalizacao: formatDateLocal((row["Finalização"] || row["FInalização"]) as string | null, true),
        cidade: String(row["Cidade"] || ""),
        bairro: String(row["Bairro"] || ""),
        
        info_ponto_de_referencia: row["Info: ponto_de_ref"] as string | null || null,
        info_cto: row["Info: info_cto"] as string | null || null,
        info_porta: row["Info: info_porta"] as string | null || null,
        info_endereco_completo: row["Info: info_endereco_completo"] as string | null || null,
        info_empresa_parceira: row["Info: info_empresa_parceira"] as string | null || null
      };
      
      return order;
    });
    
    console.log(`[FileUploader] Total de ordens processadas: ${processedOrders.length}`);
    return processedOrders;
  };

  const handleClearData = () => {
    clearData();
    toast({
      title: "Dados limpos",
      description: "Todos os dados foram removidos com sucesso."
    });
  };

  return (
    <Card className={`h-auto ${className}`}>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Importação de Dados
        </CardTitle>
        <CardDescription className="text-xs">
          Importe arquivos Excel (.xlsx) ou CSV com registros de ordens de serviço.
        </CardDescription>
      </CardHeader>
      <CardContent className="py-2">
        {error && (
          <Alert variant="destructive" className="mb-2 py-2">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={processing}
                className="h-8 text-xs"
              />
            </div>
            <Button 
              onClick={handleUpload}
              disabled={!file || processing}
              size="sm"
              className="h-8 bg-sysgest-blue hover:bg-sysgest-teal"
            >
              Importar
            </Button>
          </div>
          
          {file && (
            <div className="flex items-center p-1 bg-muted rounded text-xs">
              <FileSpreadsheet className="h-3 w-3 mr-1 text-sysgest-blue" />
              <span className="flex-1 truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
                className="h-5 w-5 p-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {processing && (
            <div className="space-y-1">
              <Progress value={progress} className="h-1" />
              <p className="text-xs text-muted-foreground text-center">
                Processando... {progress}%
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="py-2 justify-end">
        <Button 
          variant="outline" 
          onClick={handleClearData}
          size="sm"
          className="h-7 text-xs border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="mr-1 h-3 w-3" /> Limpar Dados
        </Button>
      </CardFooter>
    </Card>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {children}
    </label>
  );
}
