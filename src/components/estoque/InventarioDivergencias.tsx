import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertTriangle, Plus, Printer } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  marcarSerialComoPerdido,
  registrarEntradaAjusteSerial,
  ajustarQuantidadeInventario,
  persistirItensInventario,
  finalizarSessaoInventario,
  fetchUltimoTecnicoDoSerial,
  gerarValePDF,
} from '@/lib/inventario';
import type { SessaoInventario, LinhaDivergencia } from '@/types/estoque';

interface Props {
  sessao: SessaoInventario;
  divergencias: LinhaDivergencia[];
  donoUserId: string;
  usuarioId: string;
  onFinalizar: () => void;
}

interface EstadoItem {
  concluido: boolean;
  loading: boolean;
  observacao: string;
  tecnicoNome: string;
  tecnicoEquipeId: string | null;
}

function estadoInicial(tipo: string): EstadoItem {
  return { concluido: false, loading: false, observacao: '', tecnicoNome: '', tecnicoEquipeId: null };
}

export function InventarioDivergencias({ sessao, divergencias, donoUserId, usuarioId, onFinalizar }: Props) {
  const { toast } = useToast();
  const [estados, setEstados] = useState<Record<number, EstadoItem>>(() =>
    Object.fromEntries(divergencias.map((_, i) => [i, estadoInicial(_.tipo)]))
  );
  const [finalizando, setFinalizando] = useState(false);

  const setEstado = (idx: number, patch: Partial<EstadoItem>) =>
    setEstados((prev) => ({ ...prev, [idx]: { ...prev[idx], ...patch } }));

  // Auto-busca técnico responsável para itens "falta"
  useEffect(() => {
    divergencias.forEach((div, i) => {
      if (div.tipo !== 'falta' || !div.serial_id) return;
      fetchUltimoTecnicoDoSerial(donoUserId, div.serial_id).then((resp) => {
        if (resp) setEstado(i, { tecnicoNome: resp.nome_completo ?? '', tecnicoEquipeId: resp.equipe_id });
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePerdido = async (idx: number, div: LinhaDivergencia) => {
    if (!div.serial_id) return;
    setEstado(idx, { loading: true });
    try {
      await marcarSerialComoPerdido(donoUserId, usuarioId, div.serial_id, sessao.local_id, estados[idx].observacao, sessao.id);
      setEstado(idx, { loading: false, concluido: true });
      toast({ title: 'Serial marcado como perdido', description: div.numero_serial });
    } catch (e) {
      setEstado(idx, { loading: false });
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao marcar perda.', variant: 'destructive' });
    }
  };

  const handleEntrada = async (idx: number, div: LinhaDivergencia) => {
    if (!div.numero_serial) return;
    setEstado(idx, { loading: true });
    try {
      const { encontrado } = await registrarEntradaAjusteSerial(donoUserId, usuarioId, sessao.local_id, div.numero_serial, sessao.id);
      setEstado(idx, { loading: false, concluido: true });
      if (encontrado) {
        toast({ title: 'Entrada registrada', description: `Serial ${div.numero_serial} regularizado.` });
      } else {
        toast({ title: 'Serial não encontrado no banco', description: 'Realize uma entrada manual para este serial.', variant: 'destructive' });
        setEstado(idx, { concluido: false });
      }
    } catch (e) {
      setEstado(idx, { loading: false });
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha.', variant: 'destructive' });
    }
  };

  const handleAjusteQtd = async (idx: number, div: LinhaDivergencia) => {
    if (div.qtd_sistema === undefined || div.qtd_contada === undefined) return;
    setEstado(idx, { loading: true });
    try {
      await ajustarQuantidadeInventario(donoUserId, usuarioId, div.material_id, sessao.local_id, div.qtd_sistema, div.qtd_contada, sessao.id);
      setEstado(idx, { loading: false, concluido: true });
      toast({ title: 'Quantidade ajustada', description: div.material_descricao });
    } catch (e) {
      setEstado(idx, { loading: false });
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha.', variant: 'destructive' });
    }
  };

  const handleGerarVale = (idx: number, div: LinhaDivergencia) => {
    gerarValePDF({
      materialDescricao: div.material_descricao,
      materialCodigo: div.material_codigo,
      numeroSerial: div.numero_serial ?? '',
      valorReais: div.material_valor,
      dataInventario: sessao.iniciado_em,
      tecnicoNome: estados[idx].tecnicoNome,
      observacao: estados[idx].observacao,
    });
    setEstado(idx, { vale_gerado: true } as any);
  };

  const handleFinalizar = async () => {
    setFinalizando(true);
    try {
      const itens = divergencias.map((div, i) => ({
        material_id: div.material_id || null,
        serial_id: div.serial_id ?? null,
        qtd_sistema: div.qtd_sistema ?? 0,
        qtd_contada: div.qtd_contada ?? 0,
        divergencia: div.tipo,
        acao_tomada: estados[i]?.concluido
          ? (div.tipo === 'falta' ? 'perdido' : div.tipo === 'extra' ? 'entrada' : 'ajuste_qtd') as const
          : 'sem_acao' as const,
        tecnico_resp_equipe_id: estados[i]?.tecnicoEquipeId ?? null,
        vale_gerado: false,
        observacao: estados[i]?.observacao || null,
      })).filter((i) => i.material_id);

      await persistirItensInventario(sessao.id, itens as any);
      await finalizarSessaoInventario(sessao.id);
      onFinalizar();
    } catch (e) {
      toast({ title: 'Erro ao finalizar', description: e instanceof Error ? e.message : 'Falha.', variant: 'destructive' });
    } finally {
      setFinalizando(false);
    }
  };

  const faltas = divergencias.filter((d) => d.tipo === 'falta');
  const extras = divergencias.filter((d) => d.tipo === 'extra');
  const qtdDiffs = divergencias.filter((d) => d.tipo === 'qtd_diff');

  if (divergencias.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
          <p className="font-medium">Nenhuma divergência encontrada!</p>
          <p className="text-sm text-muted-foreground">O estoque físico bate com o sistema.</p>
          <Button onClick={handleFinalizar} disabled={finalizando}>{finalizando ? 'Finalizando…' : 'Finalizar Inventário'}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Divergências Encontradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap text-sm">
            {faltas.length > 0 && <Badge variant="destructive">{faltas.length} serial(is) faltando</Badge>}
            {extras.length > 0 && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{extras.length} serial(is) extra(s)</Badge>}
            {qtdDiffs.length > 0 && <Badge variant="secondary">{qtdDiffs.length} qtd. divergente(s)</Badge>}
          </div>
        </CardContent>
      </Card>

      {faltas.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-destructive">Seriais no sistema — não encontrados fisicamente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {faltas.map((div) => {
              const idx = divergencias.indexOf(div);
              const est = estados[idx] ?? estadoInicial(div.tipo);
              return (
                <div key={idx} className={`p-3 rounded-md border space-y-2 ${est.concluido ? 'opacity-60 bg-muted/30' : ''}`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-medium font-mono">{div.numero_serial}</p>
                      <p className="text-xs text-muted-foreground">{div.material_descricao} {div.material_valor ? `· R$ ${div.material_valor.toFixed(2)}` : ''}</p>
                    </div>
                    {est.concluido && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Registrado</Badge>}
                  </div>
                  {!est.concluido && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Técnico responsável</Label>
                          <Input placeholder="Nome do técnico" value={est.tecnicoNome} onChange={(e) => setEstado(idx, { tecnicoNome: e.target.value })} className="text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Observação / motivo</Label>
                          <Input placeholder="Descreva o ocorrido" value={est.observacao} onChange={(e) => setEstado(idx, { observacao: e.target.value })} className="text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="destructive" onClick={() => handlePerdido(idx, div)} disabled={est.loading}>
                          {est.loading ? 'Aguarde…' : 'Marcar como Perdido'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleGerarVale(idx, div)} className="gap-1">
                          <Printer className="h-3 w-3" /> Gerar Vale PDF
                        </Button>
                      </div>
                    </>
                  )}
                  {est.concluido && (
                    <Button size="sm" variant="outline" onClick={() => handleGerarVale(idx, div)} className="gap-1">
                      <Printer className="h-3 w-3" /> Gerar Vale PDF
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {extras.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-700">Seriais encontrados — sem registro neste local</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {extras.map((div) => {
              const idx = divergencias.indexOf(div);
              const est = estados[idx] ?? estadoInicial(div.tipo);
              return (
                <div key={idx} className={`flex items-center justify-between gap-3 p-3 rounded-md border ${est.concluido ? 'opacity-60 bg-muted/30' : ''}`}>
                  <div>
                    <p className="text-sm font-mono font-medium">{div.numero_serial}</p>
                    <p className="text-xs text-muted-foreground">Bipado fisicamente — sem vínculo neste local no sistema</p>
                  </div>
                  {est.concluido
                    ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Regularizado</Badge>
                    : <Button size="sm" variant="outline" onClick={() => handleEntrada(idx, div)} disabled={est.loading}>
                        <Plus className="h-3 w-3 mr-1" />{est.loading ? 'Aguarde…' : 'Dar Entrada'}
                      </Button>
                  }
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {qtdDiffs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Quantidades divergentes — Não serializados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {qtdDiffs.map((div) => {
              const idx = divergencias.indexOf(div);
              const est = estados[idx] ?? estadoInicial(div.tipo);
              const diff = (div.qtd_contada ?? 0) - (div.qtd_sistema ?? 0);
              return (
                <div key={idx} className={`flex items-center justify-between gap-3 p-3 rounded-md border ${est.concluido ? 'opacity-60 bg-muted/30' : ''}`}>
                  <div>
                    <p className="text-sm font-medium">{div.material_descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      Sistema: {div.qtd_sistema} · Contado: {div.qtd_contada} ·{' '}
                      <span className={diff > 0 ? 'text-green-600' : 'text-red-600'}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    </p>
                  </div>
                  {est.concluido
                    ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ajustado</Badge>
                    : <Button size="sm" variant="outline" onClick={() => handleAjusteQtd(idx, div)} disabled={est.loading}>
                        {est.loading ? 'Aguarde…' : 'Ajustar Quantidade'}
                      </Button>
                  }
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleFinalizar} disabled={finalizando}>
          {finalizando ? 'Finalizando…' : 'Finalizar Inventário'}
        </Button>
      </div>
    </div>
  );
}
