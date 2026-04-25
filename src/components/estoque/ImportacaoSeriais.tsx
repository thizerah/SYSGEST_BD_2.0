import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Table2, X, AlertTriangle } from 'lucide-react';
import {
  checkSeriaisMesmaChaveEntrada,
  normalizarNumeroSerial,
  type ChaveEntradaSerial,
} from '@/lib/estoque';

interface ImportacaoSeriaisProps {
  donoUserId: string;
  chaveEntrada: ChaveEntradaSerial;
  seriais: string[];
  onChange: (seriais: string[]) => void;
}

const COLUNAS_SERIAL = ['serial', 'ird', 'número serial', 'numero serial', 'num_serial', 'numero_serial'];

function parseTxt(conteudo: string): string[] {
  return conteudo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseExcel(buffer: ArrayBuffer): string[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
  if (rows.length < 2) return [];

  const cabecalho = (rows[0] as unknown[]).map((c) => String(c ?? '').trim().toLowerCase());
  const colIdx = cabecalho.findIndex((c) => COLUNAS_SERIAL.includes(c));
  const idx = colIdx >= 0 ? colIdx : 0;

  return rows
    .slice(1)
    .map((row) => String((row as unknown[])[idx] ?? '').trim())
    .filter(Boolean);
}

export function ImportacaoSeriais({ donoUserId, chaveEntrada, seriais, onChange }: ImportacaoSeriaisProps) {
  const inputTxtRef = useRef<HTMLInputElement>(null);
  const inputXlsxRef = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  const processar = async (novos: string[]) => {
    setProcessando(true);
    setErros([]);
    try {
      const normalizados = novos.map(normalizarNumeroSerial).filter(Boolean);
      const duplicadosNoArquivo = normalizados.filter((s, i) => normalizados.indexOf(s) !== i);
      const unicos = [...new Set(normalizados)];
      const jaMesmaEntrada = await checkSeriaisMesmaChaveEntrada(donoUserId, unicos, chaveEntrada);

      const avisos: string[] = [];
      if (duplicadosNoArquivo.length > 0)
        avisos.push(`${[...new Set(duplicadosNoArquivo)].length} serial(is) duplicado(s) no arquivo foram ignorados.`);
      if (jaMesmaEntrada.length > 0)
        avisos.push(
          `${jaMesmaEntrada.length} serial(is) já têm entrada com a mesma origem e NF/data informados no cabeçalho: ${jaMesmaEntrada.slice(0, 3).join(', ')}${jaMesmaEntrada.length > 3 ? '…' : ''}`
        );

      const validos = unicos.filter((s) => !jaMesmaEntrada.includes(s));
      const combinados = [...new Set([...seriais, ...validos])];

      setErros(avisos);
      onChange(combinados);
    } catch (e) {
      setErros([e instanceof Error ? e.message : 'Erro ao processar arquivo.']);
    } finally {
      setProcessando(false);
    }
  };

  const handleTxt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => processar(parseTxt(ev.target?.result as string));
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => processar(parseExcel(ev.target?.result as ArrayBuffer));
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const remover = (serial: string) => onChange(seriais.filter((s) => s !== serial));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <input ref={inputTxtRef} type="file" accept=".txt" className="hidden" onChange={handleTxt} />
        <input ref={inputXlsxRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcel} />
        <Button type="button" variant="outline" size="sm" disabled={processando} onClick={() => inputTxtRef.current?.click()}>
          <FileText className="h-4 w-4 mr-1" /> Importar TXT
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={processando} onClick={() => inputXlsxRef.current?.click()}>
          <Table2 className="h-4 w-4 mr-1" /> Importar Excel
        </Button>
        {seriais.length > 0 && (
          <span className="text-sm text-muted-foreground">{seriais.length} serial(is) adicionado(s)</span>
        )}
      </div>

      {erros.length > 0 && (
        <Alert variant="default" className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 space-y-0.5">
            {erros.map((e, i) => <p key={i} className="text-sm">{e}</p>)}
          </AlertDescription>
        </Alert>
      )}

      {seriais.length > 0 && (
        <div className="border rounded-md p-2 max-h-48 overflow-y-auto flex flex-wrap gap-1.5">
          {seriais.map((s) => (
            <Badge key={s} variant="secondary" className="font-mono text-xs gap-1 pr-1">
              {s}
              <button type="button" onClick={() => remover(s)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
