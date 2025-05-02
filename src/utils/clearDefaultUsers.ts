import { supabase } from "@/lib/supabase";

// Script para remover os usuários padrão do sistema
// Isso deve ser executado manualmente uma vez para limpar os registros

export const clearDefaultUsers = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Usuários padrão a serem removidos (por seus usernames)
    const defaultUsernames = ['admin', 'user'];
    
    // Primeiro, verificar se esses usuários existem
    const { data: existingUsers, error: queryError } = await supabase
      .from('users')
      .select('id, username')
      .in('username', defaultUsernames);
      
    if (queryError) {
      console.error('Erro ao consultar usuários padrão:', queryError);
      return { 
        success: false, 
        message: 'Erro ao consultar usuários padrão: ' + queryError.message 
      };
    }
    
    if (!existingUsers || existingUsers.length === 0) {
      return { 
        success: true, 
        message: 'Nenhum usuário padrão encontrado para remover.' 
      };
    }
    
    // Extrair os IDs dos usuários para remover
    const userIds = existingUsers.map(user => user.id);
    
    // Remover os usuários da tabela personalizada
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .in('id', userIds);
      
    if (deleteError) {
      console.error('Erro ao remover usuários da tabela users:', deleteError);
      return { 
        success: false, 
        message: 'Erro ao remover usuários da tabela users: ' + deleteError.message 
      };
    }
    
    // Se os usuários também existirem no auth, tentar removê-los
    // Note: Isso requer permissões administrativas
    let authMessage = '';
    for (const userId of userIds) {
      try {
        // Verificar se o método de exclusão de administrador existe
        if (supabase.auth.admin && typeof supabase.auth.admin.deleteUser === 'function') {
          const { error: authError } = await supabase.auth.admin.deleteUser(userId);
          if (authError) {
            console.warn(`Aviso: Não foi possível remover usuário ${userId} da autenticação:`, authError);
            authMessage += `Usuário ${userId} não pôde ser removido da autenticação. `;
          }
        } else {
          // Se o método não existir, tentar o método alternativo ou avisar que não é possível remover
          console.warn(`Aviso: Método admin.deleteUser não disponível. Usuários precisarão ser removidos manualmente do Auth.`);
          authMessage += `Usuário ${userId} não foi removido da autenticação (API admin não disponível). `;
        }
      } catch (error) {
        console.warn(`Aviso: Erro ao tentar remover usuário ${userId} da autenticação:`, error);
        authMessage += `Erro ao tentar remover usuário ${userId} da autenticação. `;
      }
    }
    
    return { 
      success: true, 
      message: `${existingUsers.length} usuários padrão removidos com sucesso. ${authMessage}` 
    };
  } catch (error) {
    console.error('Erro inesperado ao remover usuários padrão:', error);
    return { 
      success: false, 
      message: 'Erro inesperado ao remover usuários padrão: ' + (error as Error).message 
    };
  }
};

// Para usar este script:
// 1. Importe-o em algum componente administrativo
// 2. Adicione um botão ou função que o chame
// 3. Execute apenas uma vez para limpar os usuários padrão

/*
Exemplo de uso:

import { clearDefaultUsers } from '@/utils/clearDefaultUsers';

// Em algum componente de administração
const handleClearDefaultUsers = async () => {
  const result = await clearDefaultUsers();
  if (result.success) {
    toast({
      title: "Usuários padrão removidos",
      description: result.message
    });
  } else {
    toast({
      variant: "destructive",
      title: "Erro ao remover usuários padrão",
      description: result.message
    });
  }
};

// <Button onClick={handleClearDefaultUsers}>Remover Usuários Padrão</Button>
*/ 