import { useState } from "react";
import useData from "@/context/useData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { ServiceOrder, BaseData, TODOS_MATERIAIS } from "@/types";
import * as XLSX from "xlsx";
import { File, FileUp, X, FileText } from "lucide-react";

// Função para consolidar materiais de OSs duplicadas
function consolidateMaterials(orders: ServiceOrder[]): ServiceOrder[] {
  console.log(`[MaterialConsolidation] === INICIANDO CONSOLIDAÇÃO ===`);
  console.log(`[MaterialConsolidation] Total de OSs recebidas: ${orders.length}`);
  
  // Agrupar OSs por codigo_os
  const ordersByCode = orders.reduce((acc, order) => {
    if (!acc[order.codigo_os]) {
      acc[order.codigo_os] = [];
    }
    acc[order.codigo_os].push(order);
    return acc;
  }, {} as Record<string, ServiceOrder[]>);

  console.log(`[MaterialConsolidation] Grupos únicos de OS: ${Object.keys(ordersByCode).length}`);
  
  // Log de grupos com duplicatas
  Object.entries(ordersByCode).forEach(([codigo, group]) => {
    if (group.length > 1) {
      console.log(`[MaterialConsolidation] OS ${codigo} tem ${group.length} itens:`, 
        group.map(g => `${g.tipo_servico} - ${g.subtipo_servico} (${g.codigo_item})`)
      );
    }
  });

  const consolidatedOrders: ServiceOrder[] = [];

  // Processar cada grupo de OSs
  Object.values(ordersByCode).forEach(group => {
    if (group.length === 1) {
      // OS única, manter como está
      console.log(`[MaterialConsolidation] OS ${group[0].codigo_os} é única, mantendo como está`);
      consolidatedOrders.push(group[0]);
    } else {
      // Múltiplas OSs com mesmo código, consolidar
      console.log(`[MaterialConsolidation] === CONSOLIDANDO OS ${group[0].codigo_os} ===`);
      console.log(`[MaterialConsolidation] Encontradas ${group.length} OSs com mesmo código`);
      
      // Mostrar detalhes de cada OS no grupo
      group.forEach((order, index) => {
        console.log(`[MaterialConsolidation] OS ${index + 1}: ${order.tipo_servico} - ${order.subtipo_servico} - ${order.codigo_item} - Materiais: ${order.materiais?.length || 0}`);
        if (order.materiais && order.materiais.length > 0) {
          console.log(`[MaterialConsolidation]   Materiais:`, order.materiais.map(m => `${m.nome}=${m.quantidade}`));
        }
      });
      
      // Encontrar OS primária (Ponto Principal) e secundária (Sistema Opcional)
      const osPrimaria = group.find(order => order.subtipo_servico === "Ponto Principal");
      const osSecundaria = group.find(order => order.subtipo_servico === "Sistema Opcional");
      
      console.log(`[MaterialConsolidation] OS Primária encontrada: ${osPrimaria ? 'SIM' : 'NÃO'}`);
      console.log(`[MaterialConsolidation] OS Secundária encontrada: ${osSecundaria ? 'SIM' : 'NÃO'}`);
      
      if (osPrimaria && osSecundaria) {
        console.log(`[MaterialConsolidation] === CONSOLIDANDO MATERIAIS ===`);
        
        // Consolidar materiais na primária
        const materiaisPrimaria = osPrimaria.materiais || [];
        const materiaisSecundaria = osSecundaria.materiais || [];
        
        console.log(`[MaterialConsolidation] Materiais OS Primária (${osPrimaria.codigo_item}):`, 
          materiaisPrimaria.map(m => `${m.nome}=${m.quantidade}`)
        );
        console.log(`[MaterialConsolidation] Materiais OS Secundária (${osSecundaria.codigo_item}):`, 
          materiaisSecundaria.map(m => `${m.nome}=${m.quantidade}`)
        );
        
        // Combinar materiais (replicar da secundária para primária, sem somar)
        const materiaisConsolidados = [...materiaisPrimaria];
        
        materiaisSecundaria.forEach(materialSecundario => {
          const materialExistente = materiaisConsolidados.find(m => m.nome === materialSecundario.nome);
          
          if (materialExistente) {
            // Material já existe na primária, manter quantidade original (não somar)
            console.log(`[MaterialConsolidation] Material ${materialSecundario.nome} já existe na primária (${materialExistente.quantidade}), mantendo quantidade original`);
          } else {
            // Adicionar novo material da secundária
            materiaisConsolidados.push({ ...materialSecundario });
            console.log(`[MaterialConsolidation] Adicionando novo material ${materialSecundario.nome}: ${materialSecundario.quantidade}`);
          }
        });
        
        console.log(`[MaterialConsolidation] Materiais consolidados:`, 
          materiaisConsolidados.map(m => `${m.nome}=${m.quantidade}`)
        );
        
        // Atualizar OS primária com materiais consolidados
        const osPrimariaConsolidada = {
          ...osPrimaria,
          materiais: materiaisConsolidados
        };
        
        // Zerar materiais da OS secundária
        const osSecundariaZerada = {
          ...osSecundaria,
          materiais: []
        };
        
        console.log(`[MaterialConsolidation] RESULTADO FINAL:`);
        console.log(`[MaterialConsolidation] - OS ${osPrimaria.codigo_os} (${osPrimaria.codigo_item}): ${materiaisConsolidados.length} materiais`);
        console.log(`[MaterialConsolidation] - OS ${osSecundaria.codigo_os} (${osSecundaria.codigo_item}): 0 materiais`);
        
        consolidatedOrders.push(osPrimariaConsolidada);
        consolidatedOrders.push(osSecundariaZerada);
      } else {
        // Se não encontrar Ponto Principal e Sistema Opcional, manter todas como estão
        console.log(`[MaterialConsolidation] ⚠️ Não encontrou Ponto Principal/Sistema Opcional para OS ${group[0].codigo_os}`);
        console.log(`[MaterialConsolidation] Subtipos encontrados:`, group.map(g => g.subtipo_servico));
        console.log(`[MaterialConsolidation] Mantendo todas como estão`);
        consolidatedOrders.push(...group);
      }
    }
  });

  console.log(`[MaterialConsolidation] === CONSOLIDAÇÃO CONCLUÍDA ===`);
  console.log(`[MaterialConsolidation] Total: ${orders.length} → ${consolidatedOrders.length} OSs`);
  return consolidatedOrders;
}

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
  "Código Item (não permita duplicacao)": "codigo_item",
  
  // Adicionar todos os materiais ao mapeamento
  ...TODOS_MATERIAIS.reduce((acc, material) => {
    acc[material] = material.toLowerCase().replace(/\s+/g, '_');
    return acc;
  }, {} as Record<string, string>)
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
      
      reader.onload = async (e) => {
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
          
          // Informações detalhadas sobre a importação
          const servicosDuplicatas = servicosImportResult?.duplicatesIgnored || 0;
          const servicosNovos = servicosImportResult?.newRecords || 0;
          const servicosAtualizados = servicosImportResult?.updatedRecords || 0;
          
          const baseNovos = baseImportResult?.newRecords || 0;
          const baseAtualizados = baseImportResult?.updatedRecords || 0;
          const baseDuplicatas = baseImportResult?.duplicatesIgnored || 0;
          
          const totalProcessados = servicosNovos + servicosAtualizados + baseNovos + baseAtualizados;
          
          // Verificar se nenhum dado foi processado
          if (totalProcessados === 0) {
            if (servicosDuplicatas > 0 || baseDuplicatas > 0) {
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
            // Construir mensagem de sucesso detalhada
            const mensagens = [];
            
            // Mensagens para serviços
            if (servicosNovos > 0) {
              mensagens.push(`${servicosNovos} ${servicosNovos === 1 ? 'nova ordem de serviço' : 'novas ordens de serviço'}`);
            }
            if (servicosAtualizados > 0) {
              mensagens.push(`${servicosAtualizados} ${servicosAtualizados === 1 ? 'ordem de serviço atualizada' : 'ordens de serviço atualizadas'}`);
            }
            
            // Mensagens para BASE
            if (baseNovos > 0) {
              mensagens.push(`${baseNovos} ${baseNovos === 1 ? 'nova base' : 'novas bases'}`);
            }
            if (baseAtualizados > 0) {
              mensagens.push(`${baseAtualizados} ${baseAtualizados === 1 ? 'base atualizada' : 'bases atualizadas'}`);
            }
            
            // Informações sobre duplicatas (se houver)
            const duplicatesInfo = [];
            if (servicosDuplicatas > 0) {
              duplicatesInfo.push(`${servicosDuplicatas} ${servicosDuplicatas === 1 ? 'serviço duplicado' : 'serviços duplicados'}`);
            }
            if (baseDuplicatas > 0) {
              duplicatesInfo.push(`${baseDuplicatas} ${baseDuplicatas === 1 ? 'base duplicada' : 'bases duplicadas'}`);
            }
            
            let successMessage = mensagens.join(', ');
            
            if (duplicatesInfo.length > 0) {
              successMessage += ` (${duplicatesInfo.join(' e ')} ignorados)`;
            }
            
            // Adicionar ponto final se não houver
            if (!successMessage.endsWith('.') && !successMessage.includes('ignorados)')) {
              successMessage += '.';
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

  // Função para processar materiais de uma linha
  const processarMateriais = (row: Record<string, unknown>) => {
    const materiais: { nome: string; quantidade: number }[] = [];
    
    TODOS_MATERIAIS.forEach(material => {
      const quantidade = row[material];
      if (quantidade !== undefined && quantidade !== null && quantidade !== '') {
        const qtd = parseInt(String(quantidade)) || 0;
        if (qtd > 0) {
          materiais.push({
            nome: material,
            quantidade: qtd
          });
        }
      }
    });
    
    return materiais.length > 0 ? materiais : undefined;
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
    
    console.log("Processando dados de serviços:", data.length, "linhas");
    console.log("Primeiras 3 linhas de dados:", data.slice(0, 3));
    
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
        codigo_item: String(row["Código Item"] || ""), // Código do item específico
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
        telefone_celular: row["Tel. Cel"] as string | null || null,
        
        // Processar materiais
        materiais: processarMateriais(row)
      };
      
      // Log para debug
      if (index < 5) {
        console.log(`[FileUploader] Linha ${index + 1}:`, {
          codigo_os: order.codigo_os,
          codigo_item: order.codigo_item,
          tipo_servico: order.tipo_servico,
          subtipo_servico: order.subtipo_servico
        });
      }
      
      return order;
    });
    
    console.log(`[FileUploader] Processados ${processedOrders.length} registros`);
    console.log("Primeiros 3 registros processados:", processedOrders.slice(0, 3));
    
    // Consolidar materiais de OSs duplicadas
    const consolidatedOrders = consolidateMaterials(processedOrders);
    
    return consolidatedOrders;
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
        ano: parseInt(String(row["ANO"] || row["Ano"] || new Date().getFullYear()), 10),
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
