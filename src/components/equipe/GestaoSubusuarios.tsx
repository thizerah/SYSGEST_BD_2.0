import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { fetchPapeis, fetchPermissoes, type PapelRow, type PermissaoRow } from '@/lib/papeis-permissoes';
import { fetchEquipe, type EquipeRow } from '@/lib/equipe';
import {
  createSubUser,
  fetchAcessosCadastrados,
  updateUsuarioEmpresaAtivo,
  updateUsuarioEmpresaPapel,
  replaceUsuarioPermissoes,
  updateUsuarioEmpresaEquipe,
  type AcessoCadastrado,
} from '@/lib/subusuarios';
import { ModalPermissoes } from './ModalPermissoes';
import { ModalEditarAcesso } from './ModalEditarAcesso';
import { UserPlus, Pencil, Power, PowerOff, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function GestaoSubusuarios() {
  const { user, authExtras, logout } = useAuth();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [papeis, setPapeis] = useState<PapelRow[]>([]);
  const [permissoes, setPermissoes] = useState<PermissaoRow[]>([]);
  const [equipe, setEquipe] = useState<EquipeRow[]>([]);
  const [acessos, setAcessos] = useState<AcessoCadastrado[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAcessos, setLoadingAcessos] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAcesso, setEditingAcesso] = useState<AcessoCadastrado | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [papelCodigo, setPapelCodigo] = useState<string>('');
  const [equipeId, setEquipeId] = useState<string>('__none__');
  const [permissoesSelected, setPermissoesSelected] = useState<string[]>([]);

  const loadAcessos = useCallback(async () => {
    if (!donoUserId) return;
    setLoadingAcessos(true);
    try {
      const list = await fetchAcessosCadastrados(donoUserId);
      setAcessos(list);
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao carregar acessos.', variant: 'destructive' });
    } finally {
      setLoadingAcessos(false);
    }
  }, [donoUserId, toast]);

  useEffect(() => {
    if (!donoUserId) return;
    Promise.all([fetchPapeis(), fetchPermissoes(), fetchEquipe(donoUserId)])
      .then(([p, perm, eq]) => {
        setPapeis(p);
        setPermissoes(perm);
        setEquipe(eq);
      })
      .catch((e) => {
        toast({ title: 'Erro', description: e?.message ?? 'Falha ao carregar dados.', variant: 'destructive' });
      });
    loadAcessos();
  }, [donoUserId, toast, loadAcessos]);

  const runCreate = async (codigos: string[]): Promise<boolean> => {
    if (!donoUserId) return false;
    setLoading(true);
    try {
      await createSubUser(donoUserId, {
        email,
        password,
        name: name.trim() || undefined,
        papelCodigo,
        equipeId: equipeId && equipeId !== '__none__' ? equipeId : null,
        permissoesCodigos: codigos,
      });
      toast({
        title: 'Subusuário criado',
        description: `${email} pode fazer login com a senha definida. Faça login novamente com sua conta.`,
      });
      setEmail('');
      setPassword('');
      setName('');
      setPapelCodigo('');
      setEquipeId('__none__');
      setPermissoesSelected([]);
      await logout();
      navigate('/login', { replace: true });
      return true;
    } catch (e) {
      toast({
        title: 'Erro ao criar subusuário',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleCriar = () => {
    if (!email.trim() || !password || !papelCodigo) {
      toast({ title: 'Preencha email, senha e papel.', variant: 'destructive' });
      return;
    }
    setModalOpen(true);
  };

  const handleConfirmPermissoes = async (codigos: string[]) => {
    const ok = await runCreate(codigos);
    if (ok) setModalOpen(false);
  };

  const handleEditar = (acesso: AcessoCadastrado) => {
    setEditingAcesso(acesso);
    setEditModalOpen(true);
  };

  const handleSaveEditar = async (
    novoPapelCodigo: string,
    novoEquipeId: string | null,
    novosCodigos: string[]
  ) => {
    if (!editingAcesso) return;
    setSavingEdit(true);
    try {
      await updateUsuarioEmpresaPapel(editingAcesso.id, novoPapelCodigo);
      await replaceUsuarioPermissoes(editingAcesso.id, novosCodigos);
      await updateUsuarioEmpresaEquipe(editingAcesso.id, novoEquipeId);
      toast({ title: 'Acesso atualizado', description: 'Papel, vínculo e permissões foram salvos.' });
      setEditModalOpen(false);
      setEditingAcesso(null);
      await loadAcessos();
    } catch (e) {
      toast({
        title: 'Erro ao atualizar',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleAtivo = async (acesso: AcessoCadastrado) => {
    try {
      await updateUsuarioEmpresaAtivo(acesso.id, !acesso.ativo);
      toast({
        title: acesso.ativo ? 'Acesso desativado' : 'Acesso ativado',
        description: acesso.email ?? '—',
      });
      await loadAcessos();
    } catch (e) {
      toast({
        title: 'Erro',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Cadastro de Acesso
          </CardTitle>
          <CardDescription>
            Crie acessos para sua equipe. Cada um terá login próprio (email e senha) e poderá ver apenas o que você permitir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sub-email">Email *</Label>
              <Input
                id="sub-email"
                type="email"
                placeholder="exemplo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-password">Senha *</Label>
              <Input
                id="sub-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-name">Nome (opcional)</Label>
              <Input
                id="sub-name"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Papel *</Label>
              <Select value={papelCodigo} onValueChange={setPapelCodigo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  {papeis.map((p) => (
                    <SelectItem key={p.id} value={p.codigo}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Vincular à pessoa da equipe (opcional)</Label>
              <Select value={equipeId} onValueChange={setEquipeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {equipe.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_completo} — {e.funcao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleCriar} disabled={loading}>
            {loading ? 'Criando…' : 'Criar subusuário'}
          </Button>
        </CardContent>
      </Card>

      <ModalPermissoes
        open={modalOpen}
        onOpenChange={setModalOpen}
        permissoes={permissoes}
        selected={permissoesSelected}
        papelCodigo={papelCodigo}
        onConfirm={handleConfirmPermissoes}
        loading={loading}
      />

      <ModalEditarAcesso
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        acesso={editingAcesso}
        papeis={papeis}
        permissoes={permissoes}
        equipe={equipe}
        onSave={handleSaveEditar}
        loading={savingEdit}
      />

      <Card>
        <CardHeader>
          <CardTitle>Acessos cadastrados</CardTitle>
          <CardDescription>
            Lista de logins criados para sua equipe. Edite papel, vínculo e permissões ou ative/desative o acesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAcessos ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : acessos.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">Nenhum acesso cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Vinculado a</TableHead>
                    <TableHead>Permissões</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acessos.map((acesso) => (
                    <TableRow key={acesso.id}>
                      <TableCell className="font-medium">{acesso.email ?? '—'}</TableCell>
                      <TableCell className="min-w-[140px] max-w-[280px] text-center align-middle">
                        {acesso.vinculado_a ? (() => {
                          const parts = acesso.vinculado_a.split(' — ');
                          const nome = parts[0] ?? '';
                          const funcao = parts[1] ?? '';
                          return (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="font-medium">{nome}</span>
                              {funcao ? <span className="text-muted-foreground text-xs">{funcao}</span> : null}
                            </div>
                          );
                        })() : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 min-w-[180px] max-h-[3.25rem] overflow-hidden content-start leading-tight">
                          {acesso.permissoes_nomes.length === 0 ? (
                            <span className="text-muted-foreground text-xs">Nenhuma</span>
                          ) : (
                            acesso.permissoes_nomes.map((n, i) => {
                              const colors = [
                                'bg-blue-100 text-blue-800 border-blue-200',
                                'bg-emerald-100 text-emerald-800 border-emerald-200',
                                'bg-violet-100 text-violet-800 border-violet-200',
                                'bg-amber-100 text-amber-800 border-amber-200',
                                'bg-rose-100 text-rose-800 border-rose-200',
                                'bg-cyan-100 text-cyan-800 border-cyan-200',
                                'bg-orange-100 text-orange-800 border-orange-200',
                                'bg-teal-100 text-teal-800 border-teal-200',
                              ];
                              const cls = colors[i % colors.length];
                              return (
                                <Badge
                                  key={n}
                                  variant="outline"
                                  className={`text-[10px] font-medium border px-1.5 py-0 ${cls}`}
                                >
                                  {n}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={acesso.ativo ? 'default' : 'secondary'}>
                          {acesso.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {acesso.created_at
                          ? format(new Date(acesso.created_at), 'dd/MM/yyyy HH:mm')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditar(acesso)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleAtivo(acesso)}
                            title={acesso.ativo ? 'Desativar' : 'Ativar'}
                          >
                            {acesso.ativo ? (
                              <PowerOff className="h-4 w-4 text-destructive" />
                            ) : (
                              <Power className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
