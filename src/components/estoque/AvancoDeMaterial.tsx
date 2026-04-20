import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, Scan, CheckCircle2, Package, User, Plus, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import {
  fetchMateriais,
  fetchEstoque,
  registrarTransferencia,
  getOrCreateEstoqueCentral,
  getOrCreateLocalTecnico,
  buscarSerialDisponivelEstoqueCentral,
  fetchEstoqueTecnico,
} from '@/lib/estoque';
import { fetchEquipe, type EquipeRow } from '@/lib/equipe';
import { randomClientId, cn } from '@/lib/utils';
import type { Material, EstoqueSaldo, Serial } from '@/types/estoque';
import { MaterialCombobox } from './MaterialCombobox';

type ItemSessao =
  | {
      id: string;
      tipo: 'ird';
      numeroSerial: string;
      codigoMaterial: string;
      descricao: string;
    }
  | {
      id: string;
      tipo: 'nao_serial';
      codigoMaterial: string;
      descricao: string;
      quantidade: number;
      unidade: string;
    };

type LinhaSemSerial = {
  id: string;
  material_id: string;
  /** Vazio até o usuário informar (evita “1” ao adicionar linha). */
  quantidade: string;
};

function novaLinhaSemSerial(): LinhaSemSerial {
  return { id: randomClientId(), material_id: '', quantidade: '' };
}

function qtdLinhaNumero(q: string): number {
  return Number(String(q).trim().replace(',', '.'));
}

export function AvancoDeMaterial() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const usuarioId = user?.id ?? '';

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [tecnicos, setTecnicos] = useState<EquipeRow[]>([]);
  const [saldoCentral, setSaldoCentral] = useState<EstoqueSaldo[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvandoIrd, setSalvandoIrd] = useState(false);
  const [buscandoIrd, setBuscandoIrd] = useState(false);

  const [tecnicoEquipeId, setTecnicoEquipeId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [linhasSemSerial, setLinhasSemSerial] = useState<LinhaSemSerial[]>(() => [novaLinhaSemSerial()]);

  const [sessaoAvancos, setSessaoAvancos] = useState<ItemSessao[]>([]);
  const [estoqueTecnicoPreview, setEstoqueTecnicoPreview] = useState<EstoqueSaldo[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewTick, setPreviewTick] = useState(0);

  const [scanIrd, setScanIrd] = useState('');
  const [pendenteIrd, setPendenteIrd] = useState<{ serial: Serial; material: Material } | null>(null);
  const inputIrdRef = useRef<HTMLInputElement>(null);

  /** Só materiais sem serial que tenham saldo > 0 no Estoque Central (evita escolher item sem estoque). */
  const materiaisComSaldoNoCentral = useMemo(() => {
    const comSaldo = new Set(
      saldoCentral.filter((s) => s.quantidade > 0).map((s) => s.material_id)
    );
    return materiais.filter((m) => m.ativo && !m.serializado && comSaldo.has(m.id));
  }, [materiais, saldoCentral]);

  const load = useCallback(async () => {
    if (!donoUserId) return;
    setLoading(true);
    try {
      const [mats, eq] = await Promise.all([fetchMateriais(donoUserId), fetchEquipe(donoUserId)]);
      const central = await getOrCreateEstoqueCentral(donoUserId);
      const saldo = await fetchEstoque(donoUserId, { local_id: central.id });
      setMateriais(mats.filter((m) => m.ativo));
      setTecnicos(eq.filter((e) => ['tecnico', 'técnico'].includes((e.funcao ?? '').toLowerCase())));
      setSaldoCentral(saldo);
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao carregar dados.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [donoUserId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setLinhasSemSerial((prev) =>
      prev.map((l) => {
        if (!l.material_id) return l;
        if (!materiaisComSaldoNoCentral.some((m) => m.id === l.material_id)) {
          return { ...l, material_id: '', quantidade: '' };
        }
        return l;
      })
    );
  }, [materiaisComSaldoNoCentral]);

  const saldoRestanteParaLinha = useCallback(
    (materialId: string, linhaId: string) => {
      if (!materialId) return 0;
      const base = saldoCentral.find((s) => s.material_id === materialId)?.quantidade ?? 0;
      const usadoEmOutras = linhasSemSerial
        .filter((l) => l.id !== linhaId && l.material_id === materialId)
        .reduce((acc, l) => {
          const q = qtdLinhaNumero(l.quantidade);
          return acc + (Number.isFinite(q) && q > 0 ? q : 0);
        }, 0);
      return Math.max(0, base - usadoEmOutras);
    },
    [saldoCentral, linhasSemSerial]
  );

  const atualizarLinhaSemSerial = (id: string, patch: Partial<LinhaSemSerial>) => {
    setLinhasSemSerial((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const adicionarLinhaSemSerial = () => setLinhasSemSerial((prev) => [...prev, novaLinhaSemSerial()]);

  const removerLinhaSemSerial = (id: string) => {
    setLinhasSemSerial((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  };

  const refreshPreviewTecnico = useCallback(async () => {
    if (!donoUserId || !tecnicoEquipeId) {
      setEstoqueTecnicoPreview([]);
      return;
    }
    setLoadingPreview(true);
    try {
      const rows = await fetchEstoqueTecnico(donoUserId, tecnicoEquipeId);
      setEstoqueTecnicoPreview(rows.filter((r) => r.quantidade > 0));
    } catch {
      setEstoqueTecnicoPreview([]);
    } finally {
      setLoadingPreview(false);
    }
  }, [donoUserId, tecnicoEquipeId]);

  useEffect(() => {
    void refreshPreviewTecnico();
  }, [refreshPreviewTecnico, previewTick]);

  useEffect(() => {
    setSessaoAvancos([]);
    setPendenteIrd(null);
    setScanIrd('');
    setLinhasSemSerial([novaLinhaSemSerial()]);
  }, [tecnicoEquipeId]);

  useEffect(() => {
    if (pendenteIrd && scanIrd.trim() !== pendenteIrd.serial.numero_serial) {
      setPendenteIrd(null);
    }
  }, [scanIrd, pendenteIrd]);

  const buscarIrd = async () => {
    if (!donoUserId || !tecnicoEquipeId) {
      toast({ title: 'Selecione o técnico', description: 'Escolha o técnico antes de bipar o IRD.', variant: 'destructive' });
      return;
    }
    const raw = scanIrd.trim();
    if (!raw) return;

    if (pendenteIrd && pendenteIrd.serial.numero_serial === raw) {
      await confirmarAvancoIrd();
      return;
    }

    setBuscandoIrd(true);
    try {
      const found = await buscarSerialDisponivelEstoqueCentral(donoUserId, raw);
      if (!found) {
        setPendenteIrd(null);
        toast({
          title: 'IRD não encontrado',
          description: 'Não há serial disponível no Estoque Central com este número.',
          variant: 'destructive',
        });
        return;
      }
      setPendenteIrd(found);
      toast({
        title: 'Serial localizado',
        description: `${found.material.descricao} — Enter novamente ou clique em Confirmar para avançar.`,
      });
    } catch (e) {
      toast({ title: 'Erro na busca', description: e instanceof Error ? e.message : 'Falha ao buscar.', variant: 'destructive' });
    } finally {
      setBuscandoIrd(false);
    }
  };

  const confirmarAvancoIrd = async () => {
    if (!donoUserId || !usuarioId || !tecnicoEquipeId || !pendenteIrd) return;

    setSalvandoIrd(true);
    try {
      const tecnico = tecnicos.find((t) => t.id === tecnicoEquipeId)!;
      const localTecnico = await getOrCreateLocalTecnico(donoUserId, tecnico.id, tecnico.nome_completo);

      await registrarTransferencia(donoUserId, usuarioId, {
        material_id: pendenteIrd.serial.material_id,
        local_origem_id: pendenteIrd.serial.local_id,
        local_destino_id: localTecnico.id,
        quantidade: 1,
        observacao: observacao.trim() || null,
        seriais: [pendenteIrd.serial.id],
      });

      const snap = pendenteIrd;
      setSessaoAvancos((prev) => [
        ...prev,
        {
          id: randomClientId(),
          tipo: 'ird',
          numeroSerial: snap.serial.numero_serial,
          codigoMaterial: snap.material.codigo_material,
          descricao: snap.material.descricao,
        },
      ]);

      toast({ title: 'IRD avançado!', description: `${snap.serial.numero_serial} → ${tecnico.nome_completo}` });
      setPendenteIrd(null);
      setScanIrd('');
      await load();
      setPreviewTick((t) => t + 1);
      setTimeout(() => inputIrdRef.current?.focus(), 0);
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao avançar.', variant: 'destructive' });
    } finally {
      setSalvandoIrd(false);
    }
  };

  const handleIrdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    void buscarIrd();
  };

  const handleSubmit = async () => {
    if (!donoUserId || !usuarioId) return;
    if (!tecnicoEquipeId) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione o técnico.', variant: 'destructive' });
      return;
    }

    const preenchidas = linhasSemSerial.filter((l) => l.material_id.trim());
    if (preenchidas.length === 0) {
      toast({ title: 'Nenhum item', description: 'Informe ao menos um material e quantidade.', variant: 'destructive' });
      return;
    }

    const erros: string[] = [];
    for (let i = 0; i < preenchidas.length; i++) {
      const linha = preenchidas[i];
      const n = i + 1;
      const mat = materiais.find((m) => m.id === linha.material_id);
      if (!mat || mat.serializado) {
        erros.push(`Item ${n}: material inválido.`);
        continue;
      }
      const q = qtdLinhaNumero(linha.quantidade);
      if (!Number.isFinite(q) || q <= 0) {
        erros.push(`Item ${n} (${mat.codigo_material}): informe quantidade maior que zero.`);
        continue;
      }
      const maxLinha = saldoRestanteParaLinha(linha.material_id, linha.id);
      if (q > maxLinha) {
        erros.push(`Item ${n} (${mat.codigo_material}): máximo ${maxLinha} para esta distribuição entre linhas.`);
        continue;
      }
    }

    if (erros.length > 0) {
      toast({
        title: 'Revise os itens',
        description: erros.slice(0, 3).join(' ') + (erros.length > 3 ? ` (+${erros.length - 3})` : ''),
        variant: 'destructive',
      });
      return;
    }

    setSalvando(true);
    try {
      const tecnico = tecnicos.find((t) => t.id === tecnicoEquipeId)!;
      const [central, localTecnico] = await Promise.all([
        getOrCreateEstoqueCentral(donoUserId),
        getOrCreateLocalTecnico(donoUserId, tecnico.id, tecnico.nome_completo),
      ]);

      const obs = observacao.trim() || null;
      const novosItens: ItemSessao[] = [];

      for (const linha of preenchidas) {
        const mat = materiais.find((m) => m.id === linha.material_id)!;
        const q = qtdLinhaNumero(linha.quantidade);
        await registrarTransferencia(donoUserId, usuarioId, {
          material_id: linha.material_id,
          local_origem_id: central.id,
          local_destino_id: localTecnico.id,
          quantidade: q,
          observacao: obs,
        });
        novosItens.push({
          id: randomClientId(),
          tipo: 'nao_serial',
          codigoMaterial: mat.codigo_material,
          descricao: mat.descricao,
          quantidade: q,
          unidade: mat.unidade_medida,
        });
      }

      setSessaoAvancos((prev) => [...prev, ...novosItens]);

      toast({
        title: preenchidas.length === 1 ? 'Material avançado com sucesso!' : `${preenchidas.length} materiais avançados!`,
        description: novosItens.map((it) => `${it.codigoMaterial} (${it.quantidade} ${it.unidade})`).join(' · '),
      });
      setLinhasSemSerial([novaLinhaSemSerial()]);
      await load();
      setPreviewTick((t) => t + 1);
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao avançar material.', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Avanço de Material
          <span className="text-xs font-normal text-muted-foreground">(Estoque Central → Técnico)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1.5 max-w-md">
          <Label>Técnico *</Label>
          <Select value={tecnicoEquipeId} onValueChange={setTecnicoEquipeId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o técnico…" />
            </SelectTrigger>
            <SelectContent>
              {tecnicos.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* IRD / serializado — pistola */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Scan className="h-4 w-4 text-blue-600" />
            Material serializado (IRD)
          </div>
          <p className="text-xs text-muted-foreground">
            Bipe o IRD e pressione Enter para buscar. Se encontrar, pressione Enter de novo ou use Confirmar para avançar ao técnico.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="scan-ird">Leitura IRD</Label>
              <Input
                id="scan-ird"
                ref={inputIrdRef}
                className="font-mono"
                placeholder="Bipe o número do IRD…"
                value={scanIrd}
                onChange={(e) => setScanIrd(e.target.value)}
                onKeyDown={handleIrdKeyDown}
                disabled={buscandoIrd || salvandoIrd}
                autoComplete="off"
              />
            </div>
            <Button type="button" variant="secondary" onClick={() => void buscarIrd()} disabled={buscandoIrd || salvandoIrd || !scanIrd.trim()}>
              {buscandoIrd ? 'Buscando…' : pendenteIrd && scanIrd.trim() === pendenteIrd.serial.numero_serial ? 'Confirmar avanço' : 'Buscar'}
            </Button>
          </div>

          {pendenteIrd && scanIrd.trim() === pendenteIrd.serial.numero_serial && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-green-200 bg-green-50/80 p-3 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-green-900">Pronto para avançar</div>
                <div className="text-green-800 truncate flex flex-wrap items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="font-mono shrink-0">
                    {pendenteIrd.serial.numero_serial}
                  </Badge>
                  <span>
                    {pendenteIrd.material.codigo_material} — {pendenteIrd.material.descricao}
                  </span>
                </div>
              </div>
              <Button type="button" size="sm" className="shrink-0 bg-green-600 hover:bg-green-700" onClick={() => void confirmarAvancoIrd()} disabled={salvandoIrd}>
                {salvandoIrd ? 'Avançando…' : 'Confirmar avanço'}
              </Button>
            </div>
          )}
        </div>

        {/* Itens já avançados nesta sessão (permanecem na tela) */}
        {sessaoAvancos.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Avanços nesta sessão</div>
            <div className="space-y-2">
              {sessaoAvancos.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/90 p-3 text-sm"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-emerald-900">Avançado</div>
                    <div className="text-emerald-800 flex flex-wrap items-center gap-2 mt-0.5">
                      {item.tipo === 'ird' ? (
                        <>
                          <Badge variant="outline" className="font-mono shrink-0 bg-white/80">
                            {item.numeroSerial}
                          </Badge>
                          <span>
                            {item.codigoMaterial} — {item.descricao}
                          </span>
                        </>
                      ) : (
                        <span>
                          <span className="font-mono text-xs mr-1">{item.codigoMaterial}</span>
                          {item.descricao} — <span className="font-semibold">{item.quantidade}</span> {item.unidade}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Não serializado — vários itens por envio */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Material sem serial (quantidade)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Só aparecem materiais com saldo no Estoque Central. Adicione várias linhas e avance tudo de uma vez.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={adicionarLinhaSemSerial}
              disabled={materiaisComSaldoNoCentral.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar item
            </Button>
          </div>

          {materiaisComSaldoNoCentral.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Não há material sem serial com saldo no Estoque Central. Verifique entradas ou use outro material.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {linhasSemSerial.map((linha, idx) => {
                const mat = materiais.find((m) => m.id === linha.material_id);
                const maxQ = linha.material_id ? saldoRestanteParaLinha(linha.material_id, linha.id) : 0;
                const variasLinhas = linhasSemSerial.length > 1;
                const cardClass = cn(
                  'rounded-lg border p-3 space-y-3 shadow-sm',
                  !variasLinhas && 'bg-card',
                  variasLinhas &&
                    mat &&
                    (idx % 2 === 0
                      ? 'bg-sky-50/95 border-sky-200/90 ring-1 ring-sky-100/80'
                      : 'bg-teal-50/90 border-teal-200/90 ring-1 ring-teal-100/70'),
                  variasLinhas && !mat && 'bg-muted/30 border-muted-foreground/20'
                );
                return (
                  <div key={linha.id} className={cn(cardClass, 'min-w-0')}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                      {linhasSemSerial.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => removerLinhaSemSerial(linha.id)}>
                          <X className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Material *</Label>
                      <MaterialCombobox
                        materiais={materiaisComSaldoNoCentral}
                        value={linha.material_id}
                        onValueChange={(id) => atualizarLinhaSemSerial(linha.id, { material_id: id, quantidade: '' })}
                        placeholder="Buscar por código ou nome…"
                      />
                    </div>
                    {linha.material_id && mat && (
                      <div className="space-y-1.5 w-full min-w-0">
                        <Label className="text-xs">
                          Quantidade * <span className="text-muted-foreground font-normal">(máx: {maxQ})</span>
                        </Label>
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            max={maxQ > 0 ? maxQ : undefined}
                            value={linha.quantidade === '' ? '' : linha.quantidade}
                            onChange={(e) => atualizarLinhaSemSerial(linha.id, { quantidade: e.target.value })}
                            className="min-w-0 w-full max-w-[140px] sm:max-w-none sm:flex-1 sm:min-w-[100px]"
                          />
                          <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2.5 py-1.5 text-xs font-medium">
                            {mat.unidade_medida}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Saldo central: {saldoCentral.find((s) => s.material_id === linha.material_id)?.quantidade ?? 0}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Material que o técnico já possui (antes da observação) */}
        {tecnicoEquipeId && (
          <div className="rounded-lg border bg-slate-50/80 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-slate-600" />
              Material já com este técnico
            </div>
            {loadingPreview ? (
              <p className="text-xs text-muted-foreground">Carregando…</p>
            ) : estoqueTecnicoPreview.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum saldo no momento (após os avanços acima, os itens aparecem aqui).</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {estoqueTecnicoPreview.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-baseline gap-x-2 border-b border-slate-200/80 pb-1.5 last:border-0 last:pb-0">
                    <Package className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span className="font-mono text-xs text-muted-foreground">{row.material?.codigo_material}</span>
                    <span>{row.material?.descricao ?? '—'}</span>
                    <Badge variant="secondary" className="text-xs">
                      {row.quantidade} {row.material?.unidade_medida ?? ''}
                      {row.material?.serializado ? ' (serializado)' : ''}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Observação</Label>
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observações para os próximos avanços…" rows={2} />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => void handleSubmit()}
            disabled={salvando || !tecnicoEquipeId || !linhasSemSerial.some((l) => l.material_id.trim())}
          >
            {salvando
              ? 'Avançando…'
              : linhasSemSerial.filter((l) => l.material_id.trim()).length > 1
                ? 'Avançar materiais (sem serial)'
                : 'Avançar material (sem serial)'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
