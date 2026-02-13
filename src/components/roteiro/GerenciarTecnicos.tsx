import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRotas } from '@/context/RotasContext';
import { UserPlus, Trash2, Settings } from 'lucide-react';
import { TecnicoRota } from '@/types';

export function GerenciarTecnicos() {
  const { tecnicos, adicionarTecnico, removerTecnico } = useRotas();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [sigla, setSigla] = useState('');
  const [telefone, setTelefone] = useState('');

  const handleAdicionar = () => {
    if (!nome.trim()) return;

    const novoTecnico: Omit<TecnicoRota, 'id'> = {
      nome: nome.trim(),
      sigla: sigla.trim() || undefined,
      telefone: telefone.trim() || undefined,
      areasAtuacao: [],
    };

    adicionarTecnico(novoTecnico);
    
    // Limpar form
    setNome('');
    setSigla('');
    setTelefone('');
    setDialogAberto(false);
  };

  return (
    <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Gerenciar Técnicos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Técnicos</DialogTitle>
          <DialogDescription>
            Adicione ou remova técnicos do sistema de rotas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulário de adição */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sigla">Sigla</Label>
              <Input
                id="sigla"
                placeholder="Ex: JNS"
                value={sigla}
                onChange={e => setSigla(e.target.value)}
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(11) 98765-4321"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
              />
            </div>
            <div className="sm:col-span-3">
              <Button onClick={handleAdicionar} disabled={!nome.trim()} className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar Técnico
              </Button>
            </div>
          </div>

          {/* Lista de técnicos */}
          <div className="border rounded-lg">
            {tecnicos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum técnico cadastrado</p>
                <p className="text-sm">Adicione técnicos para começar a criar rotas</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Sigla</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tecnicos.map(tecnico => (
                    <TableRow key={tecnico.id}>
                      <TableCell className="font-medium">{tecnico.nome}</TableCell>
                      <TableCell>
                        {tecnico.sigla && (
                          <Badge variant="secondary">{tecnico.sigla}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tecnico.telefone || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerTecnico(tecnico.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogAberto(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
