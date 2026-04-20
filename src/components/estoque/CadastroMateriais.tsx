import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Plus, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import { fetchMateriais, createMaterial, updateMaterial } from '@/lib/estoque';
import type { Material, MaterialForm } from '@/types/estoque';

/** Opções permitidas no cadastro; valores antigos (UN, CX, RL) aparecem só ao editar até ser trocado. */
const UMB_OPCOES = ['KIT', 'PEÇ', 'M'] as const;

const FORM_INICIAL: MaterialForm = {
  codigo_material: '',
  descricao: '',
  unidade_medida: 'PEÇ',
  serializado: false,
  ativo: true,
  categoria: null, // mantido no tipo mas não exposto na UI
};

export function CadastroMateriais() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Material | null>(null);
  const [form, setForm] = useState<MaterialForm>(FORM_INICIAL);

  const opcoesUmbSelect = useMemo(() => {
    const base = [...UMB_OPCOES];
    if (form.unidade_medida && !base.includes(form.unidade_medida as (typeof UMB_OPCOES)[number])) {
      return [form.unidade_medida, ...base];
    }
    return base;
  }, [form.unidade_medida]);

  const load = useCallback(async () => {
    if (!donoUserId) return;
    setLoading(true);
    try {
      setMateriais(await fetchMateriais(donoUserId));
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao carregar materiais.', variant: 'destructive' });
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

  const abrirEditar = (m: Material) => {
    setEditando(m);
    setForm({ codigo_material: m.codigo_material, descricao: m.descricao, unidade_medida: m.unidade_medida, serializado: m.serializado, ativo: m.ativo, categoria: m.categoria });
    setModalOpen(true);
  };

  const handleDescricaoChange = (descricao: string) => {
    const serializado = descricao.toUpperCase().includes('RECEPTOR') ? true : form.serializado;
    setForm((f) => ({ ...f, descricao, serializado }));
  };

  const handleSalvar = async () => {
    if (!donoUserId) return;
    if (!form.codigo_material.trim() || !form.descricao.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha código e descrição.', variant: 'destructive' });
      return;
    }
    setSalvando(true);
    try {
      if (editando) {
        const atualizado = await updateMaterial(editando.id, form);
        setMateriais((prev) => prev.map((m) => (m.id === atualizado.id ? atualizado : m)));
        toast({ title: 'Material atualizado' });
      } else {
        const novo = await createMaterial(donoUserId, form);
        setMateriais((prev) => [...prev, novo]);
        toast({ title: 'Material cadastrado' });
      }
      setModalOpen(false);
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao salvar.', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const materiaisFiltrados = materiais.filter((m) => {
    const q = busca.toLowerCase();
    return m.codigo_material.toLowerCase().includes(q) || m.descricao.toLowerCase().includes(q);
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Materiais</CardTitle>
        <Button size="sm" onClick={abrirNovo}>
          <Plus className="h-4 w-4 mr-1" /> Novo material
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código ou descrição…" className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>UMB</TableHead>
                    <TableHead>Serial.</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {materiaisFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhum material encontrado.</TableCell></TableRow>
              ) : (
                materiaisFiltrados.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-sm">{m.codigo_material}</TableCell>
                    <TableCell>{m.descricao}</TableCell>
                    <TableCell>{m.unidade_medida}</TableCell>
                    <TableCell>{m.serializado ? <Badge variant="secondary">Sim</Badge> : <span className="text-muted-foreground text-sm">Não</span>}</TableCell>
                    <TableCell>{m.ativo ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge> : <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => abrirEditar(m)}><Pencil className="h-4 w-4" /></Button></TableCell>

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
            <DialogTitle>{editando ? 'Editar material' : 'Novo material'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Código *</Label>
                <Input value={form.codigo_material} onChange={(e) =>               setForm((f) => ({ ...f, codigo_material: e.target.value }))} placeholder="Ex: 602946" />
              </div>
             <div className="space-y-1.5">
                <Label>Unidade (UMB) *</Label>
                <Select value={form.unidade_medida} onValueChange={(v) => setForm((f) => ({ ...f, unidade_medida: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {opcoesUmbSelect.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input value={form.descricao} onChange={(e) => handleDescricaoChange(e.target.value)} placeholder="Ex: RECEPTOR HD ZAPPER" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch id="serializado" checked={form.serializado} onCheckedChange={(v) => setForm((f) => ({ ...f, serializado: v }))} />
                <Label htmlFor="serializado">Serializado</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="ativo" checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} />
                <Label htmlFor="ativo">Ativo</Label>
              </div>
            </div>
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
