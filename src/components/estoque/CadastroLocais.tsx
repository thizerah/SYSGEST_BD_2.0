import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Plus, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import { fetchLocais, createLocal, updateLocal } from '@/lib/estoque';
import { fetchEquipe, type EquipeRow } from '@/lib/equipe';
import type { Local, LocalForm, TipoLocal } from '@/types/estoque';

const TIPO_LABEL: Record<TipoLocal, string> = {
  empresa: 'Empresa',
  tecnico: 'Técnico',
  cliente: 'Cliente',
};

const TIPO_BADGE_CLASS: Record<TipoLocal, string> = {
  empresa: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  tecnico: 'bg-violet-100 text-violet-800 hover:bg-violet-100',
  cliente: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
};

const FORM_INICIAL: LocalForm = { nome: '', tipo: 'empresa', equipe_id: null };

export function CadastroLocais() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;

  const [locais, setLocais] = useState<Local[]>([]);
  const [equipe, setEquipe] = useState<EquipeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Local | null>(null);
  const [form, setForm] = useState<LocalForm>(FORM_INICIAL);

  const load = useCallback(async () => {
    if (!donoUserId) return;
    setLoading(true);
    try {
      const [locs, eq] = await Promise.all([fetchLocais(donoUserId), fetchEquipe(donoUserId)]);
      setLocais(locs);
      setEquipe(eq.filter((e) => ['tecnico', 'técnico'].includes((e.funcao ?? '').toLowerCase())));
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao carregar locais.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [donoUserId, toast]);

  useEffect(() => { load(); }, [load]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_INICIAL);
    setModalOpen(true);
  };

  const abrirEditar = (l: Local) => {
    setEditando(l);
    setForm({ nome: l.nome, tipo: l.tipo, equipe_id: l.equipe_id });
    setModalOpen(true);
  };

  const handleTipoChange = (tipo: TipoLocal) => {
    setForm((f) => ({ ...f, tipo, equipe_id: tipo !== 'tecnico' ? null : f.equipe_id }));
  };

  const handleSalvar = async () => {
    if (!donoUserId) return;
    if (!form.nome.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o nome do local.', variant: 'destructive' });
      return;
    }
    if (form.tipo === 'tecnico' && !form.equipe_id) {
      toast({ title: 'Campo obrigatório', description: 'Selecione o técnico vinculado ao local.', variant: 'destructive' });
      return;
    }
    setSalvando(true);
    try {
      if (editando) {
        const atualizado = await updateLocal(editando.id, form);
        setLocais((prev) => prev.map((l) => (l.id === atualizado.id ? atualizado : l)));
        toast({ title: 'Local atualizado' });
      } else {
        const novo = await createLocal(donoUserId, form);
        setLocais((prev) => [...prev, novo]);
        toast({ title: 'Local cadastrado' });
      }
      setModalOpen(false);
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao salvar.', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const locaisFiltrados = locais.filter((l) =>
    l.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Locais de estoque</CardTitle>
        <Button size="sm" onClick={abrirNovo}>
          <Plus className="h-4 w-4 mr-1" /> Novo local
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome…" className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Técnico vinculado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {locaisFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhum local encontrado.</TableCell></TableRow>
              ) : (
                locaisFiltrados.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell>
                      <Badge className={TIPO_BADGE_CLASS[l.tipo]}>{TIPO_LABEL[l.tipo]}</Badge>
                    </TableCell>
                    <TableCell>{l.equipe?.nome_completo ?? '—'}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => abrirEditar(l)}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar local' : 'Novo local'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Estoque Central" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => handleTipoChange(v as TipoLocal)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_LABEL) as TipoLocal[]).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.tipo === 'tecnico' && (
              <div className="space-y-1.5">
                <Label>Técnico *</Label>
                <Select value={form.equipe_id ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, equipe_id: v || null }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o técnico…" /></SelectTrigger>
                  <SelectContent>
                    {equipe.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nome_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
