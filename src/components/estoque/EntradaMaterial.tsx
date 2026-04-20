import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PackagePlus, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import { fetchMateriais, registrarEntrada, getOrCreateEstoqueCentral, checkSeriaisExistentes } from '@/lib/estoque';
import type { Material } from '@/types/estoque';
import { EntradaMaterialLinha, type LinhaEntrada, novaLinhaEntrada } from './EntradaMaterialLinha';

type TipoOrigem = 'novo' | 'reuso';

interface CabecalhoEntrada {
  tipo_origem: TipoOrigem;
  numero_nota_fiscal: string;
  data_nota_fiscal: string;
  data_movimentacao: string;
  observacao: string;
}

const CABECALHO_INICIAL: CabecalhoEntrada = {
  tipo_origem: 'novo',
  numero_nota_fiscal: '',
  data_nota_fiscal: '',
  data_movimentacao: new Date().toISOString().split('T')[0],
  observacao: '',
};

export function EntradaMaterial() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const usuarioId = user?.id ?? '';

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [cabecalho, setCabecalho] = useState<CabecalhoEntrada>(CABECALHO_INICIAL);
  const [linhas, setLinhas] = useState<LinhaEntrada[]>(() => [novaLinhaEntrada()]);
  const lineSerialRefs = useRef<Record<string, (HTMLInputElement | null)[]>>({});

  const load = useCallback(async () => {
    if (!donoUserId) return;
    setLoading(true);
    try {
      setMateriais((await fetchMateriais(donoUserId)).filter((m) => m.ativo));
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao carregar materiais.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [donoUserId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const atualizarLinha = (id: string, patch: Partial<LinhaEntrada>) => {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const materialDaLinha = (linha: LinhaEntrada) => materiais.find((m) => m.id === linha.material_id) ?? null;

  const handleMaterialLinha = (linhaId: string, materialId: string) => {
    atualizarLinha(linhaId, { material_id: materialId, quantidade: '', seriais: [], inputsSerial: [''] });
    lineSerialRefs.current[linhaId] = [];
  };

  const handleSerialInput = (linhaId: string, idx: number, value: string) => {
    setLinhas((prev) =>
      prev.map((l) => (l.id === linhaId ? { ...l, inputsSerial: l.inputsSerial.map((v, i) => (i === idx ? value : v)) } : l))
    );
  };

  const handleSerialKeyDown = (linhaId: string, idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = e.currentTarget.value.trim();
    if (!val) return;
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.id !== linhaId) return l;
        const next = [...l.inputsSerial];
        if (idx === next.length - 1) next.push('');
        return { ...l, inputsSerial: next };
      })
    );
    setTimeout(() => {
      const refs = lineSerialRefs.current[linhaId];
      refs?.[idx + 1]?.focus();
      refs?.[idx + 1]?.select();
    }, 0);
  };

  const addSerialInput = (linhaId: string) => {
    setLinhas((prev) =>
      prev.map((l) => (l.id === linhaId ? { ...l, inputsSerial: [...l.inputsSerial, ''] } : l))
    );
  };

  const removeSerialInput = (linhaId: string, idx: number) => {
    setLinhas((prev) =>
      prev.map((l) => (l.id === linhaId ? { ...l, inputsSerial: l.inputsSerial.filter((_, i) => i !== idx) } : l))
    );
  };

  const adicionarLinha = () => setLinhas((prev) => [...prev, novaLinhaEntrada()]);

  const removerLinha = (id: string) => {
    setLinhas((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
    delete lineSerialRefs.current[id];
  };

  const handleSubmit = async () => {
    if (!donoUserId || !usuarioId) return;

    const linhasPreenchidas = linhas.filter((l) => l.material_id.trim());
    if (linhasPreenchidas.length === 0) {
      toast({ title: 'Nenhum item', description: 'Selecione o material em ao menos uma linha.', variant: 'destructive' });
      return;
    }

    const errosLinha: string[] = [];
    const payloads: Array<{
      material_id: string;
      quantidade: number;
      seriais?: string[];
      rotulo: string;
    }> = [];

    const todosSeriais: string[] = [];

    linhasPreenchidas.forEach((linha, i) => {
      const n = i + 1;
      const mat = materialDaLinha(linha);
      if (!linha.material_id || !mat) {
        errosLinha.push(`Linha ${n}: selecione o material.`);
        return;
      }
      if (mat.serializado) {
        const manuais = linha.inputsSerial.map((s) => s.trim()).filter(Boolean);
        const seriais = [...new Set([...manuais, ...linha.seriais])];
        if (seriais.length === 0) {
          errosLinha.push(`Linha ${n} (${mat.codigo_material}): informe ao menos um serial.`);
          return;
        }
        todosSeriais.push(...seriais);
        payloads.push({
          material_id: linha.material_id,
          quantidade: 0,
          seriais,
          rotulo: `${mat.codigo_material} (${seriais.length} ${seriais.length === 1 ? 'serial' : 'seriais'})`,
        });
      } else {
        const q = Number(String(linha.quantidade).trim().replace(',', '.'));
        if (!Number.isFinite(q) || q <= 0) {
          errosLinha.push(`Linha ${n} (${mat.codigo_material}): informe quantidade maior que zero.`);
          return;
        }
        payloads.push({
          material_id: linha.material_id,
          quantidade: q,
          rotulo: `${mat.codigo_material} (${q} ${mat.unidade_medida})`,
        });
      }
    });

    if (errosLinha.length > 0) {
      toast({
        title: 'Revise os itens',
        description: errosLinha.slice(0, 4).join(' ') + (errosLinha.length > 4 ? ` (+${errosLinha.length - 4})` : ''),
        variant: 'destructive',
      });
      return;
    }

    const serialNorm = todosSeriais.map((s) => s.trim().toLowerCase());
    if (serialNorm.length !== new Set(serialNorm).size) {
      toast({ title: 'Serial repetido', description: 'Há o mesmo serial em mais de uma linha ou duplicado na lista.', variant: 'destructive' });
      return;
    }

    if (todosSeriais.length > 0) {
      const existentes = await checkSeriaisExistentes(donoUserId, todosSeriais);
      if (existentes.length > 0) {
        toast({
          title: 'Seriais já cadastrados',
          description: `Ex.: ${existentes.slice(0, 5).join(', ')}${existentes.length > 5 ? '…' : ''}`,
          variant: 'destructive',
        });
        return;
      }
    }

    setSalvando(true);
    try {
      const estoqueCentral = await getOrCreateEstoqueCentral(donoUserId);
      const tipoOrigem = cabecalho.tipo_origem === 'novo' ? 'compra' : 'reuso';
      const obs = cabecalho.observacao.trim() || null;
      const nf = cabecalho.numero_nota_fiscal.trim() || null;
      const dataNf = cabecalho.data_nota_fiscal || null;

      for (const p of payloads) {
        await registrarEntrada(donoUserId, usuarioId, {
          material_id: p.material_id,
          local_destino_id: estoqueCentral.id,
          quantidade: p.quantidade,
          tipo_origem: tipoOrigem,
          numero_nota_fiscal: nf,
          data_nota_fiscal: dataNf,
          data_movimentacao: cabecalho.data_movimentacao,
          observacao: obs,
          seriais: p.seriais,
        });
      }

      toast({
        title: 'Entrada registrada!',
        description:
          payloads.length === 1
            ? payloads[0].rotulo
            : `${payloads.length} itens na mesma nota: ${payloads.map((p) => p.rotulo).join('; ')}`,
      });
      setLinhas([novaLinhaEntrada()]);
      setCabecalho((c) => ({
        ...CABECALHO_INICIAL,
        tipo_origem: c.tipo_origem,
        data_movimentacao: new Date().toISOString().split('T')[0],
        numero_nota_fiscal: c.numero_nota_fiscal,
        data_nota_fiscal: c.data_nota_fiscal,
      }));
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao registrar.', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const podeEnviar = linhas.some((l) => Boolean(l.material_id));

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <PackagePlus className="h-5 w-5 text-orange-500" />
          Entrada de material
        </CardTitle>
        <p className="text-xs text-muted-foreground font-normal">
          Inclua uma linha por item da nota fiscal (cabo, antena, LNB, aparelhos etc.). Os dados da NF valem para todos os itens deste envio.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Tipo de origem *</Label>
            <Select
              value={cabecalho.tipo_origem}
              onValueChange={(v) => setCabecalho((c) => ({ ...c, tipo_origem: v as TipoOrigem }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="reuso">Reuso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Data de entrada *</Label>
            <Input
              type="date"
              value={cabecalho.data_movimentacao}
              onChange={(e) => setCabecalho((c) => ({ ...c, data_movimentacao: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Nota fiscal</Label>
            <Input
              value={cabecalho.numero_nota_fiscal}
              onChange={(e) => setCabecalho((c) => ({ ...c, numero_nota_fiscal: e.target.value }))}
              placeholder="Número da NF"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Data da nota fiscal</Label>
            <Input
              type="date"
              value={cabecalho.data_nota_fiscal}
              onChange={(e) => setCabecalho((c) => ({ ...c, data_nota_fiscal: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-base">Itens da entrada *</Label>
            <Button type="button" variant="outline" size="sm" onClick={adicionarLinha}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar item
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {linhas.map((linha, index) => (
              <EntradaMaterialLinha
                key={linha.id}
                linha={linha}
                index={index}
                materiais={materiais}
                donoUserId={donoUserId}
                removivel={linhas.length > 1}
                onRemove={() => removerLinha(linha.id)}
                onMaterialChange={(id) => handleMaterialLinha(linha.id, id)}
                onQuantidadeChange={(valor) => atualizarLinha(linha.id, { quantidade: valor })}
                onSeriaisImportados={(s) => atualizarLinha(linha.id, { seriais: s })}
                onSerialInput={(idx, value) => handleSerialInput(linha.id, idx, value)}
                onSerialKeyDown={(idx, e) => handleSerialKeyDown(linha.id, idx, e)}
                onAddSerialBlank={() => addSerialInput(linha.id)}
                onRemoveSerial={(idx) => removeSerialInput(linha.id, idx)}
                setSerialRef={(idx, el) => {
                  if (!lineSerialRefs.current[linha.id]) lineSerialRefs.current[linha.id] = [];
                  lineSerialRefs.current[linha.id][idx] = el;
                }}
                multiplosItens={linhas.length > 1}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Observação</Label>
          <Textarea
            value={cabecalho.observacao}
            onChange={(e) => setCabecalho((c) => ({ ...c, observacao: e.target.value }))}
            placeholder="Observações sobre a entrada…"
            rows={2}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={salvando || !podeEnviar}>
            {salvando ? 'Registrando…' : linhas.filter((l) => l.material_id).length > 1 ? 'Registrar todas as entradas' : 'Registrar entrada'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
