import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useRotas } from '@/context/RotasContext';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
import { RotaOS } from '@/types';

export function ImportacaoRoteiro() {
  const { adicionarOSEmLote } = useRotas();
  const { toast } = useToast();
  
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: number;
    erros: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivo(file);
      setResultado(null);
    }
  };

  const processarExcel = useCallback(async () => {
    if (!arquivo) {
      toast({
        title: 'Erro',
        description: 'Selecione um arquivo Excel para importar.',
        variant: 'destructive',
      });
      return;
    }

    setImportando(true);
    setResultado(null);

    try {
      const dados = await arquivo.arrayBuffer();
      const workbook = XLSX.read(dados, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        throw new Error('Arquivo vazio ou sem dados');
      }

      // Primeira linha é o cabeçalho
      const headers = jsonData[0].map((h: any) => String(h).trim());
      const linhasDados = jsonData.slice(1);

      const ossParaImportar: Omit<RotaOS, 'id' | 'status' | 'data_importacao' | 'user_id'>[] = [];
      const erros: string[] = [];

      linhasDados.forEach((linha, index) => {
        try {
          // Mapear os campos do CSV/Excel para a interface RotaOS
          const os: Omit<RotaOS, 'id' | 'status' | 'data_importacao' | 'user_id'> = {
            codigo_os: String(linha[headers.indexOf('Código OS')] || '').trim(),
            codigo_cliente: String(linha[headers.indexOf('Código Cliente')] || '').trim(),
            nome_cliente: String(linha[headers.indexOf('Cliente')] || linha[headers.indexOf('Nome Cliente')] || '').trim(),
            telefone: String(linha[headers.indexOf('Tel. Cel')] || linha[headers.indexOf('Telefone')] || '').trim(),
            endereco: String(linha[headers.indexOf('Endereço')] || '').trim(),
            bairro: String(linha[headers.indexOf('Bairro')] || '').trim(),
            cidade: String(linha[headers.indexOf('Cidade')] || '').trim(),
            tipo_servico: String(linha[headers.indexOf('Tipo de serviço')] || linha[headers.indexOf('Tipo Serviço')] || '').trim(),
            motivo: String(linha[headers.indexOf('Motivo')] || ''),
            observacoes: String(linha[headers.indexOf('Observações')] || ''),
            periodo: String(linha[headers.indexOf('Período')] || linha[headers.indexOf('Periodo')] || '').trim(),
            prioridade: String(linha[headers.indexOf('Prioridade')] || '').trim(),
            data_agendada: '', // Torre de controle define a data ao criar a rota
            servico_cobrado: false, // Valor não vem do Excel, será definido manualmente
            valor: undefined, // Valor não vem do Excel, será definido manualmente
          };

          // Validar campos obrigatórios
          if (!os.codigo_os || !os.nome_cliente || !os.endereco) {
            erros.push(`Linha ${index + 2}: Campos obrigatórios faltando (Código OS, Nome Cliente ou Endereço)`);
            return;
          }

          ossParaImportar.push(os);
        } catch (error) {
          erros.push(`Linha ${index + 2}: Erro ao processar - ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      });

      if (ossParaImportar.length > 0) {
        adicionarOSEmLote(ossParaImportar);
      }

      setResultado({
        sucesso: ossParaImportar.length,
        erros,
      });

      if (ossParaImportar.length > 0) {
        toast({
          title: 'Importação concluída',
          description: `${ossParaImportar.length} OS(s) importada(s) com sucesso.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Erro na importação',
        description: error instanceof Error ? error.message : 'Erro ao processar arquivo',
        variant: 'destructive',
      });
      setResultado({
        sucesso: 0,
        erros: [error instanceof Error ? error.message : 'Erro desconhecido'],
      });
    } finally {
      setImportando(false);
    }
  }, [arquivo, adicionarOSEmLote, toast]);

  const baixarModelo = () => {
    const modelo = [
      ['Código OS', 'Código Cliente', 'Cliente', 'Tel. Cel', 'Endereço', 'Bairro', 'Cidade', 'Tipo de serviço', 'Motivo', 'Período', 'Prioridade'],
      ['OS001', 'CLI001', 'João Silva', '(11) 98765-4321', 'Rua das Flores, 123', 'Centro', 'São Paulo', 'Instalação', 'Nova instalação', 'Manhã', 'Alta'],
      ['OS002', 'CLI002', 'Maria Santos', '(11) 91234-5678', 'Av. Paulista, 456', 'Bela Vista', 'São Paulo', 'Manutenção', 'Reparo', 'Tarde', 'Média'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(modelo);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo OSs');
    XLSX.writeFile(wb, 'modelo_importacao_oss.xlsx');

    toast({
      title: 'Modelo baixado',
      description: 'Arquivo modelo salvo com sucesso.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importar Ordens de Serviço
        </CardTitle>
        <CardDescription>
          Importe OSs via arquivo Excel para criar rotas e atribuir técnicos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instruções */}
        <Alert>
          <FileSpreadsheet className="w-4 h-4" />
          <AlertDescription>
            <strong>Formato esperado:</strong> Arquivo Excel (.xlsx) ou CSV (.csv) com colunas: Código OS, Código Cliente, Cliente,
            Tel. Cel, Endereço, Bairro, Cidade, Tipo de serviço, Motivo, Período (Manhã/Tarde), Prioridade (Alta/Média).
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Obs: A data de agendamento será definida pela torre de controle ao criar a rota. Os campos Período e Prioridade são opcionais.
            </span>
          </AlertDescription>
        </Alert>

        {/* Botão para baixar modelo */}
        <div>
          <Button variant="outline" onClick={baixarModelo} className="w-full sm:w-auto">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Baixar Modelo Excel
          </Button>
        </div>

        {/* Seleção de arquivo */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">Selecionar Arquivo</Label>
          <Input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            disabled={importando}
          />
          {arquivo && (
            <p className="text-sm text-muted-foreground">
              Arquivo selecionado: {arquivo.name}
            </p>
          )}
        </div>

        {/* Botão de importação */}
        <Button
          onClick={processarExcel}
          disabled={!arquivo || importando}
          className="w-full"
        >
          {importando ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Importar OSs
            </>
          )}
        </Button>

        {/* Resultado da importação */}
        {resultado && (
          <div className="space-y-4">
            {resultado.sucesso > 0 && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>{resultado.sucesso} OS(s)</strong> importada(s) com sucesso!
                </AlertDescription>
              </Alert>
            )}

            {resultado.erros.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>{resultado.erros.length} erro(s) encontrado(s):</strong>
                  <ul className="mt-2 list-disc list-inside text-sm">
                    {resultado.erros.slice(0, 5).map((erro, index) => (
                      <li key={index}>{erro}</li>
                    ))}
                    {resultado.erros.length > 5 && (
                      <li className="text-muted-foreground">
                        ... e mais {resultado.erros.length - 5} erro(s)
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
