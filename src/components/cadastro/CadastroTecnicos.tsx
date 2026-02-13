import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { UserPlus, Trash2, Search, Pencil } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import {
  fetchEquipe,
  createEquipe,
  updateEquipe,
  deleteEquipe,
  type EquipeRow,
} from '@/lib/equipe';
import { fetchPapeis, fetchPermissoes, type PapelRow, type PermissaoRow } from '@/lib/papeis-permissoes';
import { fetchSubusuariosByDono, updateUsuarioEmpresaPapel, replaceUsuarioPermissoes } from '@/lib/subusuarios';
import { FUNCOES_EQUIPE, nomeFuncao } from '@/lib/funcoes-equipe';
import { ModalEditarUsuario } from './ModalEditarUsuario';

export interface CadastroTecnicosProps {
  onNavigateToCadastroAcesso?: (equipeId?: string) => void;
}

export function CadastroTecnicos({ onNavigateToCadastroAcesso }: CadastroTecnicosProps) {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const [equipe, setEquipe] = useState<EquipeRow[]>([]);
  const [subusuarios, setSubusuarios] = useState<Awaited<ReturnType<typeof fetchSubusuariosByDono>>>([]);
  const [papeis, setPapeis] = useState<PapelRow[]>([]);
  const [permissoes, setPermissoes] = useState<PermissaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState('');
  const [editingRow, setEditingRow] = useState<EquipeRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!donoUserId) return;
    setLoading(true);
    try {
      const [eq, sub, pa, perm] = await Promise.all([
        fetchEquipe(donoUserId),
        fetchSubusuariosByDono(donoUserId),
        fetchPapeis(),
        fetchPermissoes(),
      ]);
      setEquipe(eq);
      setSubusuarios(sub);
      setPapeis(pa);
      setPermissoes(perm);
    } catch (e) {
      toast({
        title: 'Erro',
        description: e instanceof Error ? e.message : 'Falha ao carregar.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [donoUserId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdicionar = async () => {
    if (!nome.trim() || !funcao) {
      toast({ title: 'Erro', description: 'Preencha o nome e a função.', variant: 'destructive' });
      return;
    }
    if (!donoUserId) return;
    setLoading(true);
    try {
      await createEquipe(donoUserId, {
        nome_completo: nome.trim(),
        funcao,
      });
      toast({ title: 'Adicionado', description: `${nome} foi cadastrado na equipe.` });
      setNome('');
      setFuncao('');
      load();
    } catch (e) {
      toast({
        title: 'Erro',
        description: e instanceof Error ? e.message : 'Falha ao adicionar.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemover = async (id: string) => {
    setLoading(true);
    try {
      await deleteEquipe(id);
      toast({ title: 'Removido', description: 'Pessoa foi removida da equipe.' });
      load();
    } catch (e) {
      toast({
        title: 'Erro',
        description: e instanceof Error ? e.message : 'Falha ao remover.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (row: EquipeRow) => {
    setEditingRow(row);
    setModalOpen(true);
  };

  const handleSaveEdicao = async (payload: {
    nome: string;
    funcao: string;
    papelCodigo?: string;
    permissoesCodigos?: string[];
  }) => {
    if (!editingRow) return;
    setLoading(true);
    try {
      await updateEquipe(editingRow.id, {
        nome_completo: payload.nome,
        funcao: payload.funcao,
      });
      const sub = subusuarios.find((s) => s.equipe_id === editingRow.id);
      if (sub && payload.papelCodigo != null) {
        await updateUsuarioEmpresaPapel(sub.usuario_empresa_id, payload.papelCodigo);
      }
      if (sub && payload.permissoesCodigos != null) {
        await replaceUsuarioPermissoes(sub.usuario_empresa_id, payload.permissoesCodigos);
      }
      toast({ title: 'Salvo', description: 'Alterações aplicadas.' });
      load();
      setModalOpen(false);
      setEditingRow(null);
    } catch (e) {
      toast({
        title: 'Erro',
        description: e instanceof Error ? e.message : 'Falha ao salvar.',
        variant: 'destructive',
      });
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const filtrados = equipe.filter(
    (e) =>
      e.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
      (e.funcao && e.funcao.toLowerCase().includes(busca.toLowerCase()))
  );

  const subuserByEquipeId = new Map(subusuarios.map((s) => [s.equipe_id, s]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Cadastro de Usuários
          </CardTitle>
          <CardDescription>
            Gerencie a equipe (nome completo e função). O vínculo com login é feito ao criar acesso em Cadastro de
            Acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted p-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo *</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdicionar()}
              />
            </div>
            <div className="space-y-2">
              <Label>Função *</Label>
              <Select value={funcao} onValueChange={setFuncao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {FUNCOES_EQUIPE.map((f) => (
                    <SelectItem key={f.codigo} value={f.codigo}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button
                onClick={handleAdicionar}
                disabled={loading || !nome.trim() || !funcao}
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou função..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="rounded-lg border">
            {filtrados.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <UserPlus className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="text-lg font-medium">
                  {equipe.length === 0 ? 'Nenhuma pessoa na equipe' : 'Nenhum resultado'}
                </p>
                <p className="text-sm">
                  {equipe.length === 0 ? 'Adicione usando o formulário acima.' : 'Tente outro termo.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome completo</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="w-32 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.nome_completo}</TableCell>
                      <TableCell>{nomeFuncao(e.funcao)}</TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditar(e)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover da equipe</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remover <strong>{e.nome_completo}</strong>? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemover(e.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {equipe.length > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Total: <strong className="text-foreground">{equipe.length}</strong>
              </span>
              {busca && (
                <span>
                  Mostrando: <strong className="text-foreground">{filtrados.length}</strong>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ModalEditarUsuario
        open={modalOpen}
        onOpenChange={setModalOpen}
        equipeRow={editingRow}
        subuser={editingRow ? subuserByEquipeId.get(editingRow.id) ?? null : null}
        papeis={papeis}
        permissoes={permissoes}
        loading={loading}
        onSave={handleSaveEdicao}
        onNavigateToCadastroAcesso={onNavigateToCadastroAcesso}
      />
    </div>
  );
}
