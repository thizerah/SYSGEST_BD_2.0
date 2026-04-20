import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeftRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import { fetchMateriais, fetchLocais, fetchEstoque, fetchSeriaisDisponiveisPorLocal, registrarTransferencia } from '@/lib/estoque';
import type { Material, Local, EstoqueSaldo, Serial, TransferenciaForm } from '@/types/estoque';

const FORM_INICIAL: TransferenciaForm = {
  material_id: '',
  local_origem_id: '',
  local_destino_id: '',
  quantidade: 1,
  observacao: null,
  seriais: [],
};

export function TransferenciaEstoque() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const usuarioId = user?.id ?? '';

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [saldo, setSaldo] = useState<EstoqueSaldo[]>([]);
  const [seriaisDisponiveis, setSeriaisDisponiveis] = useState<Serial[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<TransferenciaForm>(FORM_INICIAL);

  const materialSelecionado = materiais.find((m) => m.id === form.material_id) ?? null;
  const isSerializado = materialSelecionado?.serializado ?? false;

  const saldoOrigem = saldo.find(
    (s) => s.material_id === form.material_id && s.local_id === form.local_origem_id
  );
  const saldoDisponivel = saldoOrigem?.quantidade ?? 0;

  const load = useCallback(async () => {
    if (!donoUserId) return;
    setLoading(true);
    try {
      const [mats, locs, estoqueAtual] = await Promise.all([
        fetchMateriais(donoUserId),
        fetchLocais(donoUserId),
        fetchEstoque(donoUserId),
      ]);
      setMateriais(mats.filter((m) => m.ativo));
      setLocais(locs);
      setSaldo(estoqueAtual);
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao carregar dados.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [donoUserId, toast]);

  useEffect(() => { load(); }, [load]);

  // Carrega seriais disponíveis ao mudar material ou local de origem (apenas serializado)
  useEffect(() => {
    if (!donoUserId || !form.material_id || !form.local_origem_id || !isSerializado) {
      setSeriaisDisponiveis([]);
      setForm((f) => ({ ...f, seriais: [] }));
      return;
    }
    fetchSeriaisDisponiveisPorLocal(donoUserId, form.material_id, form.local_origem_id)
      .then(setSeriaisDisponiveis)
      .catch(() => setSeriaisDisponiveis([]));
  }, [donoUserId, form.material_id, form.local_origem_id, isSerializado]);

  const handleMaterialChange = (id: string) => {
    setForm((f) => ({ ...f, material_id: id, local_origem_id: '', seriais: [] }));
  };

  const toggleSerial = (serialId: string) => {
    setForm((f) => {
      const atual = f.seriais ?? [];
      return {
        ...f,
        seriais: atual.includes(serialId) ? atual.filter((s) => s !== serialId) : [...atual, serialId],
      };
    });
  };

  const handleSubmit = async () => {
    if (!donoUserId || !usuarioId) return;
    if (!form.material_id || !form.local_origem_id || !form.local_destino_id) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione material, origem e destino.', variant: 'destructive' });
      return;
    }
    if (form.local_origem_id === form.local_destino_id) {
      toast({ title: 'Locais iguais', description: 'Origem e destino devem ser diferentes.', variant: 'destructive' });
      return;
    }
    if (isSerializado && (!form.seriais || form.seriais.length === 0)) {
      toast({ title: 'Sem seriais', description: 'Selecione ao menos um serial para transferir.', variant: 'destructive' });
      return;
    }
    if (!isSerializado && form.quantidade > saldoDisponivel) {
      toast({ title: 'Saldo insuficiente', description: `Saldo disponível: ${saldoDisponivel}.`, variant: 'destructive' });
      return;
    }

    setSalvando(true);
    try {
      await registrarTransferencia(donoUserId, usuarioId, form);
      toast({ title: 'Transferência registrada com sucesso!' });
      setForm(FORM_INICIAL);
      await load();
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao transferir.', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>;

  const locaisDestino = locais.filter((l) => l.id !== form.local_origem_id);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-blue-500" />
          Transferência entre locais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Material *</Label>
            <Select value={form.material_id} onValueChange={handleMaterialChange}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {materiais.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.codigo_material} — {m.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Local de origem *</Label>
            <Select value={form.local_origem_id} onValueChange={(v) => setForm((f) => ({ ...f, local_origem_id: v, seriais: [] }))}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {locais.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.local_origem_id && form.material_id && (
              <p className="text-xs text-muted-foreground">Saldo disponível: <strong>{saldoDisponivel}</strong></p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Local de destino *</Label>
            <Select value={form.local_destino_id} onValueChange={(v) => setForm((f) => ({ ...f, local_destino_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {locaisDestino.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quantidade (não serializado) */}
        {form.material_id && form.local_origem_id && !isSerializado && (
          <div className="space-y-1.5 max-w-[160px]">
            <Label>Quantidade *</Label>
            <Input
              type="number" min={1} max={saldoDisponivel}
              value={form.quantidade}
              onChange={(e) => setForm((f) => ({ ...f, quantidade: Number(e.target.value) }))}
            />
          </div>
        )}

        {/* Seleção de seriais (serializado) */}
        {form.material_id && form.local_origem_id && isSerializado && (
          <div className="space-y-1.5">
            <Label>Seriais disponíveis ({seriaisDisponiveis.length})</Label>
            {seriaisDisponiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum serial disponível neste local.</p>
            ) : (
              <div className="border rounded-md p-2 max-h-48 overflow-y-auto flex flex-wrap gap-2">
                {seriaisDisponiveis.map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 cursor-pointer select-none">
                    <Checkbox
                      checked={(form.seriais ?? []).includes(s.id)}
                      onCheckedChange={() => toggleSerial(s.id)}
                    />
                    <Badge variant="secondary" className="font-mono text-xs">{s.numero_serial}</Badge>
                  </label>
                ))}
              </div>
            )}
            {(form.seriais ?? []).length > 0 && (
              <p className="text-xs text-muted-foreground">{(form.seriais ?? []).length} serial(is) selecionado(s)</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Observação</Label>
          <Textarea
            value={form.observacao ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value || null }))}
            placeholder="Observações sobre a transferência…"
            rows={2}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={salvando || !form.material_id}>
            {salvando ? 'Transferindo…' : 'Confirmar transferência'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
