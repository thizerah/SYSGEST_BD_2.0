import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import { fetchLocais, getOrCreateEstoqueCentral } from '@/lib/estoque';
import {
  criarSessaoInventario,
  fetchSessoesInventario,
  fetchEstoqueEsperadoPorLocal,
  calcularDivergencias,
  type EstoqueEsperado,
  type DadosContagem,
} from '@/lib/inventario';
import type { Local, SessaoInventario as ISessaoInventario, LinhaDivergencia } from '@/types/estoque';
import { InventarioContagem } from './InventarioContagem';
import { InventarioDivergencias } from './InventarioDivergencias';

type Etapa = 'historico' | 'configuracao' | 'contagem' | 'divergencias';

/** Apenas dois modos de inventário suportados na UI. */
type ModoInventarioLocal = '' | 'central' | 'tecnico';

function nomeExibicaoLocalTecnico(l: Local): string {
  const n = l.equipe?.nome_completo?.trim() || l.nome?.trim();
  return n || 'Técnico';
}

export function SessaoInventario() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();

  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const operadorEquipeId = authExtras?.equipeId ?? null;
  const usuarioId = user?.id ?? '';

  const [etapa, setEtapa] = useState<Etapa>('historico');
  const [sessoes, setSessoes] = useState<ISessaoInventario[]>([]);
  const [sessaoAtiva, setSessaoAtiva] = useState<ISessaoInventario | null>(null);
  /** Locais tipo técnico (para inventário TECNICO). */
  const [locaisTecnicos, setLocaisTecnicos] = useState<Local[]>([]);
  const [modoInventario, setModoInventario] = useState<ModoInventarioLocal>('');
  const [localSelecionado, setLocalSelecionado] = useState('');
  const [estoqueEsperado, setEstoqueEsperado] = useState<EstoqueEsperado | null>(null);
  const [divergencias, setDivergencias] = useState<LinhaDivergencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInicio, setLoadingInicio] = useState(false);

  const loadDados = useCallback(async () => {
    if (!donoUserId) return;
    setLoading(true);
    try {
      const sessoesData = await fetchSessoesInventario(donoUserId);
      setSessoes(sessoesData);
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar dados.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [donoUserId, toast]);

  useEffect(() => {
    loadDados();
  }, [loadDados]);

  /** Lista de técnicos só ao abrir a configuração de nova sessão. */
  useEffect(() => {
    if (etapa !== 'configuracao' || !donoUserId) return;
    let cancelled = false;
    fetchLocais(donoUserId)
      .then((all) => {
        if (cancelled) return;
        const tec = all
          .filter((l) => l.tipo === 'tecnico')
          .sort((a, b) => nomeExibicaoLocalTecnico(a).localeCompare(nomeExibicaoLocalTecnico(b), 'pt-BR'));
        setLocaisTecnicos(tec);
      })
      .catch(() => {
        toast({ title: 'Erro', description: 'Falha ao carregar locais dos técnicos.', variant: 'destructive' });
      });
    return () => {
      cancelled = true;
    };
  }, [etapa, donoUserId, toast]);

  /** Ao escolher ESTOQUE CENTRAL, resolve o UUID do Estoque Central. */
  useEffect(() => {
    if (modoInventario !== 'central' || !donoUserId) return;
    let cancelled = false;
    getOrCreateEstoqueCentral(donoUserId)
      .then((loc) => {
        if (!cancelled) setLocalSelecionado(loc.id);
      })
      .catch(() => {
        toast({ title: 'Erro', description: 'Não foi possível obter o Estoque Central.', variant: 'destructive' });
      });
    return () => {
      cancelled = true;
    };
  }, [modoInventario, donoUserId, toast]);

  const iniciarSessao = async () => {
    if (!donoUserId || !localSelecionado) return;
    setLoadingInicio(true);
    try {
      const [sessao, esperado] = await Promise.all([
        criarSessaoInventario(donoUserId, localSelecionado, operadorEquipeId),
        fetchEstoqueEsperadoPorLocal(donoUserId, localSelecionado),
      ]);
      setSessaoAtiva(sessao);
      setEstoqueEsperado(esperado);
      setEtapa('contagem');
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível iniciar a sessão.', variant: 'destructive' });
    } finally {
      setLoadingInicio(false);
    }
  };

  const handleFinalizarContagem = (dados: DadosContagem) => {
    if (!estoqueEsperado) return;
    setDivergencias(calcularDivergencias(estoqueEsperado, dados));
    setEtapa('divergencias');
  };

  const handleFinalizar = () => {
    setSessaoAtiva(null);
    setEstoqueEsperado(null);
    setDivergencias([]);
    setModoInventario('');
    setLocalSelecionado('');
    loadDados();
    setEtapa('historico');
    toast({ title: 'Inventário finalizado', description: 'Sessão registrada com sucesso.' });
  };

  // ── Etapa: configuração ──
  if (etapa === 'configuracao') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova Sessão de Inventário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label>Inventário *</Label>
            <Select
              value={modoInventario}
              onValueChange={(v) => {
                const m = v as ModoInventarioLocal;
                setModoInventario(m);
                setLocalSelecionado('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="central">ESTOQUE CENTRAL</SelectItem>
                <SelectItem value="tecnico">TECNICO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {modoInventario === 'tecnico' && (
            <div className="space-y-1.5">
              <Label>Técnico *</Label>
              <Select value={localSelecionado} onValueChange={setLocalSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o técnico…" />
                </SelectTrigger>
                <SelectContent>
                  {locaisTecnicos.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {nomeExibicaoLocalTecnico(l)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {locaisTecnicos.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum local de técnico cadastrado.</p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setModoInventario('');
                setLocalSelecionado('');
                setEtapa('historico');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={iniciarSessao}
              disabled={
                loadingInicio ||
                !modoInventario ||
                !localSelecionado ||
                (modoInventario === 'tecnico' && locaisTecnicos.length === 0)
              }
            >
              {loadingInicio ? 'Iniciando…' : 'Iniciar Contagem'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Etapa: contagem ──
  if (etapa === 'contagem' && sessaoAtiva && estoqueEsperado) {
    return (
      <InventarioContagem
        sessao={sessaoAtiva}
        estoqueEsperado={estoqueEsperado}
        onFinalizar={handleFinalizarContagem}
        onCancelar={() => { setSessaoAtiva(null); setEtapa('historico'); loadDados(); }}
      />
    );
  }

  // ── Etapa: divergências ──
  if (etapa === 'divergencias' && sessaoAtiva) {
    return (
      <InventarioDivergencias
        sessao={sessaoAtiva}
        divergencias={divergencias}
        donoUserId={donoUserId ?? ''}
        usuarioId={usuarioId}
        onFinalizar={handleFinalizar}
      />
    );
  }

  // ── Histórico ──
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Inventário de Estoque</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setModoInventario('');
            setLocalSelecionado('');
            setEtapa('configuracao');
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nova sessão
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
        ) : sessoes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum inventário realizado ainda. Clique em "Nova sessão" para começar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Local</TableHead>
                <TableHead>Iniciado em</TableHead>
                <TableHead>Finalizado em</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessoes.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.local?.nome ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.iniciado_em).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.finalizado_em ? new Date(s.finalizado_em).toLocaleString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell>
                    {s.status === 'finalizado'
                      ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Finalizado</Badge>
                      : <Badge variant="secondary">Em andamento</Badge>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
