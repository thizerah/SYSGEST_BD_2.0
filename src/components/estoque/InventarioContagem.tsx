import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Scan } from 'lucide-react';
import { normalizarNumeroSerial } from '@/lib/estoque';
import type { SessaoInventario } from '@/types/estoque';
import type { EstoqueEsperado, DadosContagem } from '@/lib/inventario';

interface Props {
  sessao: SessaoInventario;
  estoqueEsperado: EstoqueEsperado;
  onFinalizar: (dados: DadosContagem) => void;
  onCancelar: () => void;
}

export function InventarioContagem({ sessao, estoqueEsperado, onFinalizar, onCancelar }: Props) {
  const [inputSerial, setInputSerial] = useState('');
  const [serialsBipados, setSerialsBipados] = useState<string[]>([]);
  const [contagemNaoSerial, setContagemNaoSerial] = useState<Record<string, number>>(() =>
    Object.fromEntries(estoqueEsperado.naoSeriais.map((s) => [s.material_id, s.quantidade]))
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const esperadosSet = new Set(
    estoqueEsperado.seriais.map((s) => normalizarNumeroSerial(s.numero_serial).toUpperCase())
  );

  const adicionarSerial = () => {
    const num = normalizarNumeroSerial(inputSerial).toUpperCase();
    if (!num) return;
    if (serialsBipados.includes(num)) {
      setInputSerial('');
      inputRef.current?.focus();
      return;
    }
    setSerialsBipados((prev) => [...prev, num]);
    setInputSerial('');
    inputRef.current?.focus();
  };

  const removerSerial = (num: string) =>
    setSerialsBipados((prev) => prev.filter((s) => s !== num));

  const bipados = serialsBipados.length;
  const encontrados = serialsBipados.filter((n) => esperadosSet.has(n)).length;
  const extras = bipados - encontrados;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scan className="h-4 w-4" />
            Contagem — {sessao.local?.nome}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm text-muted-foreground flex-wrap">
            <span>Esperado no sistema: <strong className="text-foreground">{estoqueEsperado.seriais.length}</strong> seriais</span>
            <span>Bipados: <strong className="text-foreground">{bipados}</strong></span>
            {extras > 0 && <span className="text-amber-600">Extras (não esperados): <strong>{extras}</strong></span>}
          </div>
        </CardContent>
      </Card>

      {estoqueEsperado.seriais.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bipar Seriais — Pistola ou Teclado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Aponte a pistola ou digite o serial e pressione Enter…"
                value={inputSerial}
                onChange={(e) => setInputSerial(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') adicionarSerial(); }}
                className="font-mono"
              />
              <Button onClick={adicionarSerial} variant="secondary">Adicionar</Button>
            </div>

            {serialsBipados.length > 0 && (
              <div className="max-h-52 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serial</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serialsBipados.map((num) => {
                      const ok = esperadosSet.has(num);
                      return (
                        <TableRow key={num}>
                          <TableCell className="font-mono text-sm">{num}</TableCell>
                          <TableCell>
                            {ok
                              ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="h-3 w-3" /> Esperado</span>
                              : <span className="flex items-center gap-1 text-amber-600 text-xs"><XCircle className="h-3 w-3" /> Não esperado neste local</span>
                            }
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => removerSerial(num)}
                              className="text-muted-foreground hover:text-destructive text-xs leading-none"
                            >✕</button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {estoqueEsperado.naoSeriais.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Materiais Não Serializados — Quantidade Física</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {estoqueEsperado.naoSeriais.map((saldo) => (
              <div key={saldo.material_id} className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{(saldo.material as any)?.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    Sistema: {saldo.quantidade} {(saldo.material as any)?.unidade_medida}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Label className="text-xs text-muted-foreground">Contado:</Label>
                  <Input
                    type="number"
                    min="0"
                    className="w-24 text-right"
                    value={contagemNaoSerial[saldo.material_id] ?? saldo.quantidade}
                    onChange={(e) =>
                      setContagemNaoSerial((prev) => ({
                        ...prev,
                        [saldo.material_id]: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button onClick={() => onFinalizar({ seriais_bipados: serialsBipados, contagem_nao_serial: contagemNaoSerial })}>
          Finalizar Contagem {bipados > 0 ? `(${bipados} seriais)` : ''}
        </Button>
      </div>
    </div>
  );
}
