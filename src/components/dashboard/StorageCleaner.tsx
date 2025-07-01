import React from 'react';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import useData from '@/context/useData';
import { useLocalStorageMonitor } from '@/hooks/useLocalStorageMonitor';
import { 
  Trash2, 
  Database, 
  Settings, 
  AlertTriangle,
  ChevronDown
} from 'lucide-react';

interface StorageCleanerProps {
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
}

export function StorageCleaner({ 
  variant = 'dropdown', 
  size = 'default',
  showLabel = true 
}: StorageCleanerProps) {
  const { clearData } = useData();
  const { refreshStats } = useLocalStorageMonitor();
  const { toast } = useToast();

  // Função para limpar apenas dados do sistema
  const clearSystemData = () => {
    clearData();
    refreshStats();
    toast({
      title: "✅ Dados Limpos",
      description: "Todos os dados das planilhas foram removidos com sucesso.",
      variant: "default"
    });
  };

  // Função para limpar dados específicos por tipo
  const clearDataByType = (type: 'Dados' | 'Cache' | 'Configuração') => {
    let removedCount = 0;
    const keysToRemove: string[] = [];
    
    // Identificar chaves por tipo
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const lowerKey = key.toLowerCase();
        
        if (type === 'Dados' && (
          lowerKey.includes('sysgest_') || 
          lowerKey.includes('vendas') || 
          lowerKey.includes('orders') ||
          lowerKey.includes('metas') ||
          lowerKey.includes('pagamentos')
        )) {
          keysToRemove.push(key);
        } else if (type === 'Cache' && (
          lowerKey.includes('cache') || 
          lowerKey.includes('temp') || 
          lowerKey.includes('tmp')
        )) {
          keysToRemove.push(key);
        } else if (type === 'Configuração' && (
          lowerKey.includes('config') || 
          lowerKey.includes('settings') ||
          lowerKey.includes('preferences')
        )) {
          keysToRemove.push(key);
        }
      }
    }
    
    // Remover as chaves identificadas
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      removedCount++;
    });
    
    refreshStats();
    toast({
      title: `✅ ${type} Removidos`,
      description: `${removedCount} itens do tipo "${type}" foram removidos.`,
      variant: "default"
    });
  };

  // Função para limpar TODO o localStorage (perigosa)
  const clearAllLocalStorage = () => {
    localStorage.clear();
    refreshStats();
    toast({
      title: "⚠️ localStorage Completamente Limpo",
      description: "TODOS os dados foram removidos. Você pode precisar fazer login novamente.",
      variant: "destructive"
    });
  };

  if (variant === 'button') {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost" 
            size={size}
            className="text-white hover:bg-sysgest-teal border border-white/20 hover:border-sysgest-teal"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {showLabel && "Limpar Dados"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Dados das Planilhas</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover todos os dados importados das planilhas. 
              Suas configurações serão preservadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={clearSystemData}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size={size}
          className="text-white hover:bg-sysgest-teal border border-white/20 hover:border-sysgest-teal"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {showLabel && "Limpar Dados"}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Opções de Limpeza</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Limpar dados das planilhas */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Database className="h-4 w-4 mr-2" />
              Dados das Planilhas
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar Dados das Planilhas</AlertDialogTitle>
              <AlertDialogDescription>
                Remove vendas, ordens de serviço, pagamentos e metas importadas. 
                Configurações e autenticação serão preservadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={clearSystemData}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Limpar cache */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Settings className="h-4 w-4 mr-2" />
              Cache e Temporários
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar Cache</AlertDialogTitle>
              <AlertDialogDescription>
                Remove apenas arquivos temporários e cache. 
                Dados importantes serão preservados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => clearDataByType('Cache')}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DropdownMenuSeparator />
        
        {/* Limpar tudo (perigoso) */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Limpar Tudo (Perigoso)
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">
                ⚠️ AÇÃO PERIGOSA ⚠️
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p className="font-semibold text-red-600">
                  Esta ação irá remover TODOS os dados do localStorage!
                </p>
                <ul className="list-disc list-inside text-sm">
                  <li>Dados das planilhas</li>
                  <li>Configurações</li>
                  <li>Tokens de autenticação</li>
                  <li>Preferências</li>
                </ul>
                <p className="text-red-600">
                  Você pode precisar fazer login novamente!
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={clearAllLocalStorage}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirmar - Limpar TUDO
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 