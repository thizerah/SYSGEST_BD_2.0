import { useState } from "react";
import useData from "@/context/useData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { ServiceOrder, BaseData } from "@/types";
import * as XLSX from "xlsx";
import { File, FileUp, X, FileText } from "lucide-react";

const FIELD_MAPPING: Record<string, string> = {
  "Código OS": "codigo_os",
  "ID Técnico": "id_tecnico",
  "Técnico": "nome_tecnico",
  "SGL": "sigla_tecnico",
  "Tipo de serviço": "tipo_servico",
  "Sub-Tipo de serviço": "subtipo_servico",
  "Motivo": "motivo",
  "Código Cliente": "codigo_cliente",
  "Cliente": "nome_cliente",
  "Status": "status",
  "Criação": "data_criacao",
  "Finalização": "data_finalizacao",
  "Info: ponto_de_ref": "info_ponto_de_referencia",
  "Info: info_cto": "info_cto",
  "Info: info_porta": "info_porta",
  "Info: info_endereco_completo": "info_endereco_completo",
  "Info: info_empresa_parceira": "info_empresa_parceira",
  "Endereço": "endereco",
  "Bairro": "bairro",
  "Complemento": "complemento",
  "CEP": "cep",
  "Cidade": "cidade",
  "UF": "uf",
  "Pacote": "pacote",
  "Tel. Cel": "telefone_celular",
  "Tel. Com": "telefone_comercial",
  "Total IRD": "total_ird",
  "Código Item (não permita duplicacao)": "codigo_item"
};

const REQUIRED_FIELDS = [
  "Código OS", 
  "ID Técnico", 
  "Técnico", 
  "SGL", 
  "Tipo de serviço", 
  "Sub-Tipo de serviço", 
  "Motivo", 
  "Código Cliente", 
  "Cliente", 
  "Status", 
  "Criação", 
  "Finalização"
];

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [detectedSheets, setDetectedSheets] = useState<{
    servicos: string | null;
    base: string | null;
  }>({ servicos: null, base: null });
  const { importServiceOrders, importBaseData, clearData } = useData();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
      if (!validTypes.includes(selectedFile.type)) {
        setError("Formato de arquivo inválido. Use .xlsx ou .csv");
        setFile(null);
        setAvailableSheets([]);
        setDetectedSheets({ servicos: null, base: null });
        return;
      }
      
      setFile(selectedFile);
      setError("");
      
      // Para arquivos Excel, tentar detectar abas imediatamente
      if (selectedFile.type.includes('sheet')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = event.target?.result;
            if (data) {
              const workbook = XLSX.read(data, { type: 'binary' });
              const detectedSheetsResult = detectSheetTypes(workbook);
              setDetectedSheets(detectedSheetsResult);
              setAvailableSheets(workbook.SheetNames);
            }
          } catch (err) {
            console.log("Erro ao detectar abas:", err);
            // Não mostrar erro aqui, apenas não detectar abas
          }
        };
        reader.readAsBinaryString(selectedFile);
      }
    }
  };

  const handleUpload = async () => {
    console.log("[FileUploader] handleUpload chamado - arquivo:", file?.name);
    
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
          setProgress(20);
          const data = e.target?.result;
          if (!data) throw new Error("Erro ao ler o arquivo");
          
          const workbook = XLSX.read(data, { type: 'binary' });
          setProgress(30);
          
          console.log("[FileUploader] Arquivo Excel lido com sucesso");
          console.log("[FileUploader] Nomes das abas disponíveis:", workbook.SheetNames);
          
          // Detectar tipos de abas
          const detectedSheetsResult = detectSheetTypes(workbook);
          console.log("[FileUploader] Resultado detecção:", detectedSheetsResult);
          setDetectedSheets(detectedSheetsResult);
          setAvailableSheets(workbook.SheetNames);
          
          let processedServiceOrders = 0;
          let processedBaseData = 0;
          
          // Processar aba de serviços
          let servicosImportResult = null;
          if (detectedSheetsResult.servicos) {
            setProgress(40);
            const servicosWorksheet = workbook.Sheets[detectedSheetsResult.servicos];
            const servicosJsonData = XLSX.utils.sheet_to_json(servicosWorksheet, { defval: null, raw: false });
            
            if (servicosJsonData && servicosJsonData.length > 0) {
              console.log("Cabeçalhos na aba de serviços:", Object.keys(servicosJsonData[0]).join(", "));
              console.log("Primeira linha de serviços:", servicosJsonData[0]);
              
              const processedServices = processData(servicosJsonData as Record<string, unknown>[]);
              servicosImportResult = importServiceOrders(processedServices, true); // Usar append=true para comportamento incremental
              processedServiceOrders = servicosImportResult.newRecords;
            }
          }
          
          setProgress(60);
          
          // Processar aba BASE (se existir)
          let baseImportResult = null;
          console.log("[FileUploader] Verificando aba BASE:", detectedSheetsResult.base);
          if (detectedSheetsResult.base) {
            console.log("[FileUploader] Processando aba BASE:", detectedSheetsResult.base);
            const baseWorksheet = workbook.Sheets[detectedSheetsResult.base];
            const baseJsonData = XLSX.utils.sheet_to_json(baseWorksheet, { defval: null, raw: false });
            
            if (baseJsonData && baseJsonData.length > 0) {
              console.log("Cabeçalhos na aba BASE:", Object.keys(baseJsonData[0]).join(", "));
              console.log("Primeira linha de BASE:", baseJsonData[0]);
              
              const processedBase = processBaseData(baseJsonData as Record<string, unknown>[]);
              console.log('[FileUploader] Dados BASE processados:', processedBase);
              
              baseImportResult = importBaseData(processedBase, true); // Usar append=true para comportamento incremental
              console.log('[FileUploader] Resultado importação BASE:', baseImportResult);
              
              processedBaseData = baseImportResult.newRecords; // Usar apenas novos registros na contagem
            }
          }
          
          setProgress(90);
          
          setProgress(100);
          
          // Mensagens de duplicatas
          const servicosDuplicatas = servicosImportResult?.duplicatesIgnored || 0;
          const baseDuplicatas = baseImportResult?.duplicatesIgnored || 0;
          const totalDuplicatas = servicosDuplicatas + baseDuplicatas;
          
          // Verificar se nenhum dado novo foi processado
          if (processedServiceOrders === 0 && processedBaseData === 0) {
            if (totalDuplicatas > 0) {
              // Todos os registros eram duplicatas
              toast({
                title: "Importação concluída",
                description: "Nenhum novo registro foi adicionado (todos já existiam)."
              });
            } else {
              // Nenhum dado válido foi encontrado
              throw new Error("Nenhum dado válido encontrado no arquivo");
            }
          } else {
            // Mensagem de sucesso baseada nos dados processados
            let successMessage = "";
            const servicosMessage = processedServiceOrders > 0 ? 
              `${processedServiceOrders} ${processedServiceOrders === 1 ? 'ordem de serviço' : 'ordens de serviço'}` : "";
            const baseMessage = processedBaseData > 0 ? 
              `${processedBaseData} ${processedBaseData === 1 ? 'registro BASE' : 'registros BASE'}` : "";
            
            const duplicatesInfo = [];
            if (servicosDuplicatas > 0) {
              duplicatesInfo.push(`${servicosDuplicatas} ${servicosDuplicatas === 1 ? 'serviço duplicado' : 'serviços duplicados'}`);
            }
            if (baseDuplicatas > 0) {
              duplicatesInfo.push(`${baseDuplicatas} ${baseDuplicatas === 1 ? 'registro BASE duplicado' : 'registros BASE duplicados'}`);
            }
            
            if (processedServiceOrders > 0 && processedBaseData > 0) {
              successMessage = `${servicosMessage} e ${baseMessage} importados.`;
            } else if (processedServiceOrders > 0) {
              successMessage = `${servicosMessage} importadas.`;
            } else if (processedBaseData > 0) {
              successMessage = `${baseMessage} importados.`;
            }
            
            if (duplicatesInfo.length > 0) {
              successMessage += ` (${duplicatesInfo.join(' e ')} ignorados)`;
            }
            
            toast({
              title: "Importação concluída",
              description: successMessage
            });
          }
          
          setFile(null);
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
    
    const firstRow = data[0];
    const excelHeaders = Object.keys(firstRow);
    
    console.log("Headers necessários:", REQUIRED_FIELDS);
    console.log("Headers encontrados na planilha:", excelHeaders);
    
    const missingRequiredFields: string[] = [];
    
    for (const requiredField of REQUIRED_FIELDS) {
      if (!excelHeaders.includes(requiredField)) {
        if (requiredField === "Finalização" && excelHeaders.includes("FInalização")) {
          continue;
        }
        
        // Se o campo ausente for Finalização, verificar se todas as ordens são canceladas
        if (requiredField === "Finalização") {
          // Verificar se todas as ordens são canceladas
          const todasCanceladas = data.every(row => 
            String(row["Status"] || "").toUpperCase() === "CANCELADA"
          );
          
          if (todasCanceladas) {
            console.log("[FileUploader] Todas as ordens são canceladas. Campo 'Finalização' não será obrigatório.");
            continue;
          }
        }
        
        missingRequiredFields.push(requiredField);
      }
    }
    
    if (missingRequiredFields.length > 0) {
      throw new Error(`Campos obrigatórios ausentes na planilha: ${missingRequiredFields.join(", ")}`);
    }
    
    const processedOrders = data.map((row, index) => {
      const formatDate = (dateStr: string | null | undefined, isFinalizacao = false): string => {
        // Se for data de finalização e o status for cancelada, permite data vazia
        const status = String(row["Status"] || "");
        if (isFinalizacao && status.toUpperCase() === "CANCELADA") {
          if (!dateStr || dateStr.trim() === "") {
            if (row["Criação"]) {
              console.log(`[FileUploader] OS ${row["Código OS"]}: Status Cancelada - Usando data de criação como finalização`);
              return formatDate(row["Criação"] as string, false);
            } else {
              // Se não tiver data de criação (caso extremamente raro), lançar erro
              throw new Error(`OS ${row["Código OS"]} cancelada não possui data de criação válida`);
            }
          }
        }
        
        if (!dateStr) {
          throw new Error(`Data inválida na linha ${index + 2}`);
        }
        
        let date: Date;
        
        try {
          date = new Date(dateStr);
          
          if (isNaN(date.getTime())) {
            const parts = dateStr.split(/[/\-\s]/);
            if (parts.length >= 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
              
              date = new Date(year, month, day);
              
              if (dateStr.includes(':')) {
                const timeParts = dateStr.split(' ')[1].split(':');
                date.setHours(parseInt(timeParts[0], 10));
                date.setMinutes(parseInt(timeParts[1], 10));
                if (timeParts.length > 2) {
                  date.setSeconds(parseInt(timeParts[2], 10));
                }
              }
            }
          }
        } catch (e) {
          throw new Error(`Data inválida: "${dateStr}" na linha ${index + 2}`);
        }
        
        if (isNaN(date.getTime())) {
          throw new Error(`Data inválida: "${dateStr}" na linha ${index + 2}`);
        }
        
        return date.toISOString();
      };
      
      // Verificar se é Corretiva e se o Pacote contém a palavra FIBRA
      let subtipo = String(row["Sub-Tipo de serviço"]);
      const pacote = String(row["Pacote"] || "");
      
      console.log(`[FileUploader] Processando OS ${row["Código OS"]}: Subtipo original="${subtipo}", Pacote="${pacote}"`);
      
      // Se for Corretiva e o pacote contiver a palavra FIBRA, alterar para Corretiva BL
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
        data_criacao: formatDate(row["Criação"] as string | null, false),
        data_finalizacao: formatDate((row["Finalização"] || row["FInalização"]) as string | null, true),
        cidade: String(row["Cidade"] || ""),
        bairro: String(row["Bairro"] || ""),
        
        info_ponto_de_referencia: row["Info: ponto_de_ref"] as string | null || null,
        info_cto: row["Info: info_cto"] as string | null || null,
        info_porta: row["Info: info_porta"] as string | null || null,
        info_endereco_completo: row["Info: info_endereco_completo"] as string | null || null,
        info_empresa_parceira: row["Info: info_empresa_parceira"] as string | null || null,
        telefone_celular: row["Tel. Cel"] as string | null || null
      };
      
      return order;
    });
    
    return processedOrders;
  };

  const processBaseData = (data: Record<string, unknown>[]): BaseData[] => {
    if (data.length === 0) {
      throw new Error("Nenhum dado BASE encontrado para processamento");
    }
    
    console.log("Processando dados BASE:", data);
    
    const processedBaseData = data.map((row, index) => {
      // Função para converter valores numéricos
      const parseNumericValue = (value: unknown): number => {
        if (value === null || value === undefined || value === "") return 0;
        
        const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[,.]/g, '.'));
        return isNaN(numValue) ? 0 : numValue;
      };
      
      // Mapear campos da planilha BASE
      const baseItem: BaseData = {
        mes: String(row["MÊS"] || row["MES"] || row["Mês"] || `Mês ${index + 1}`),
        base_tv: parseNumericValue(row["BASE TV"] || row["BASE_TV"] || row["base_tv"]),
        base_fibra: parseNumericValue(row["BASE FIBRA"] || row["BASE_FIBRA"] || row["base_fibra"]),
        alianca: parseNumericValue(row["ALIANCA"] || row["ALIANÇA"] || row["alianca"])
      };
      
      console.log(`[BASE DATA] Linha ${index + 1}:`, baseItem);
      return baseItem;
    });
    
    console.log(`[BASE DATA] Processados ${processedBaseData.length} registros BASE`);
    return processedBaseData;
  };

  const detectSheetTypes = (workbook: XLSX.WorkBook): { servicos: string | null; base: string | null } => {
    const sheetNames = workbook.SheetNames;
    console.log("[detectSheetTypes] Abas disponíveis:", sheetNames);
    
    let servicosSheet: string | null = null;
    let baseSheet: string | null = null;
    
    // Detectar aba de serviços (primeira aba ou aba com nome relacionado a serviços)
    if (sheetNames.length > 0) {
      servicosSheet = sheetNames[0]; // Por padrão, primeira aba
      
      // Procurar por nomes mais específicos
      const servicosPatterns = ['serviço', 'servico', 'os', 'ordem', 'service'];
      for (const pattern of servicosPatterns) {
        const found = sheetNames.find(name => 
          name.toLowerCase().includes(pattern.toLowerCase())
        );
        if (found) {
          servicosSheet = found;
          break;
        }
      }
    }
    
    // Detectar aba BASE
    console.log("[detectSheetTypes] Procurando aba BASE...");
    const basePatterns = ['base', 'BASE'];
    for (const pattern of basePatterns) {
      console.log(`[detectSheetTypes] Testando padrão: ${pattern}`);
      const found = sheetNames.find(name => {
        const match = name.toLowerCase().includes(pattern.toLowerCase());
        console.log(`[detectSheetTypes] Aba "${name}" inclui "${pattern}"? ${match}`);
        return match;
      });
      if (found) {
        console.log(`[detectSheetTypes] Aba BASE encontrada: ${found}`);
        baseSheet = found;
        break;
      }
    }
    
    console.log("[detectSheetTypes] Resultado final:", { servicos: servicosSheet, base: baseSheet });
    return { servicos: servicosSheet, base: baseSheet };
  };

  const handleClearData = () => {
    clearData();
    toast({
      title: "Dados limpos",
      description: "Todos os dados foram removidos do sistema."
    });
  };

  return (
    <Card className="h-auto">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center">
          <FileUp className="mr-2 h-4 w-4" />
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
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={processing}
                className="h-8 text-xs"
              />
            </div>
            <Button 
              onClick={() => {
                console.log("[FileUploader] Botão Importar clicado!");
                handleUpload();
              }}
              disabled={!file || processing}
              size="sm"
              className="h-8 bg-sysgest-blue hover:bg-sysgest-teal"
            >
              Importar
            </Button>
          </div>
          
          {file && (
            <div className="space-y-2">
              <div className="flex items-center p-1 bg-muted rounded text-xs">
                <File className="h-3 w-3 mr-1 text-sysgest-blue" />
                <span className="flex-1 truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setAvailableSheets([]);
                    setDetectedSheets({ servicos: null, base: null });
                  }}
                  className="h-5 w-5 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              {availableSheets.length > 0 && (
                <div className="p-2 bg-blue-50 rounded text-xs border border-blue-200">
                  <div className="flex items-center mb-1">
                    <FileText className="h-3 w-3 mr-1 text-blue-600" />
                    <span className="font-medium text-blue-800">Abas detectadas:</span>
                  </div>
                  <div className="space-y-1">
                    {detectedSheets.servicos && (
                      <div className="flex items-center text-green-700">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        <span className="font-medium">Serviços:</span>
                        <span className="ml-1">"{detectedSheets.servicos}"</span>
                      </div>
                    )}
                    {detectedSheets.base && (
                      <div className="flex items-center text-blue-700">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        <span className="font-medium">BASE:</span>
                        <span className="ml-1">"{detectedSheets.base}"</span>
                      </div>
                    )}
                    {availableSheets.filter(sheet => 
                      sheet !== detectedSheets.servicos && sheet !== detectedSheets.base
                    ).length > 0 && (
                      <div className="flex items-center text-gray-600">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                        <span className="font-medium">Outras:</span>
                        <span className="ml-1">
                          {availableSheets.filter(sheet => 
                            sheet !== detectedSheets.servicos && sheet !== detectedSheets.base
                          ).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
          <X className="mr-1 h-3 w-3" /> Limpar Dados
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
