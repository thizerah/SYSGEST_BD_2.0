/**
 * UserManagement - Componente dedicado para gestão de usuários
 * Etapa 9.4: Extraído do MetricsOverview para melhor modularidade
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, Pencil, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { clearDefaultUsers } from '@/utils/clearDefaultUsers';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { User } from '@/types';

interface UserManagementProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = React.memo(({ 
  isOpen = true, 
  onClose 
}) => {
  const { toast } = useToast();
  
  // Estados do componente
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados do formulário de edição
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Carregar usuários
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Carregar usuários ao montar o componente
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filtrar usuários baseado no termo de busca
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    
    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      user.name?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.phone?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  // Salvar usuário editado
  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso",
        duration: 3000,
      });

      setShowEditDialog(false);
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Abrir diálogo de edição
  const handleEditUser = (selectedUser: User) => {
    setEditingUser(selectedUser);
    setEditForm({
      name: selectedUser.name || '',
      email: selectedUser.email || '',
      phone: selectedUser.phone || ''
    });
    setShowEditDialog(true);
  };

  // Limpar usuários padrão
  const handleClearDefaultUsers = async () => {
    try {
      await clearDefaultUsers();
      toast({
        title: "Sucesso",
        description: "Usuários padrão removidos com sucesso",
        duration: 3000,
      });
      loadUsers();
    } catch (error) {
      console.error('Erro ao remover usuários padrão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover os usuários padrão",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Cabeçalho com ações */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Usuários</h2>
          <p className="text-gray-600">Gerencie usuários do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowRegisterDialog(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Adicionar Usuário
          </Button>
          <Button 
            variant="outline"
            onClick={handleClearDefaultUsers}
          >
            Limpar Usuários Padrão
          </Button>
        </div>
      </div>

      {/* Barra de busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar usuários por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <Card>
        <CardHeader>
          <CardTitle>
            Usuários ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Carregando usuários...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm ? 'Nenhum usuário encontrado para a busca.' : 'Nenhum usuário cadastrado.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        className="flex items-center gap-1"
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de registro */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário</DialogTitle>
            <DialogDescription>
              Cadastre um novo usuário no sistema
            </DialogDescription>
          </DialogHeader>
          <RegisterForm 
            onRegisterSuccess={() => {
              setShowRegisterDialog(false);
              loadUsers();
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo de edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere as informações do usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Se for usado como um modal/diálogo
  if (onClose) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-auto">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  // Se for usado como componente standalone
  return content;
});

UserManagement.displayName = 'UserManagement'; 