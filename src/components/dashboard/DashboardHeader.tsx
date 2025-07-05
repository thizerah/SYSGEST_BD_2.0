import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Menu } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { LocalStorageMonitor } from "./LocalStorageMonitor";
import { StorageCleaner } from "./StorageCleaner";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { DataMigrationPanel } from './DataMigrationPanel';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger 
} from '@/components/ui/dialog';
import { CloudDownload } from 'lucide-react';

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const { getSetting, reloadSettings } = useSystemSettings();
  const headerMessage = getSetting('header_message', '⚠️ Novas atualizações em breve');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Recarrega as configurações a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      reloadSettings();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [reloadSettings]);

  return (
    <header className="bg-sysgest-blue text-white">
      <div className="flex flex-col w-full">
        {/* Mensagem de atualização */}
        <div className="bg-[#fff3cd] px-2 sm:px-4 py-1 sm:py-1.5 text-center border-b border-[#ffeeba]">
          <span className="mobile-text-ultra-compact sm:text-sm font-medium text-[#856404]">{headerMessage}</span>
        </div>

        {/* Header principal */}
        <div className="px-1 sm:px-2 md:px-4 py-1 sm:py-2 flex justify-between items-center">
          {/* Left side - Logo and title */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="bg-yellow-400 p-1 sm:p-1.5 rounded-lg">
              <Settings size={16} className="text-sysgest-blue" />
            </div>
            <div>
              <h1 className="mobile-heading-compact sm:text-base font-bold">SysGest Insight Metrics</h1>
              <p className="mobile-text-ultra-compact hidden sm:block opacity-90">Sistema de gestão de métricas e insights</p>
            </div>
          </div>
          
          {/* Right side - User info compact */}
          <div className="flex items-center space-x-0.5 sm:space-x-2">
            {/* Desktop - User info inline */}
            <div className="hidden md:flex items-center space-x-2 mobile-text-ultra-compact">
              <span>👤 {user?.name || 'Thiago Nascimento'}</span>
              <span>🏢 {user?.empresa || 'SYSTEC'}</span>
              <span>🔒 {user?.role === 'admin' ? 'Admin' : 'User'}</span>
              <span>📅 {new Date().toLocaleDateString('pt-BR')}</span>
            </div>

            {/* Storage controls - always visible but smaller on mobile */}
            <div className="flex items-center space-x-0.5">
              <LocalStorageMonitor />
              <StorageCleaner variant="button" size="sm" showLabel={false} />
            </div>

            {/* Mobile menu */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden text-white p-1 sm:p-1.5">
                  <Menu className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-[400px] bg-sysgest-blue text-white">
                <SheetHeader>
                  <SheetTitle className="text-white mobile-heading-compact">Menu do Usuário</SheetTitle>
                  <SheetDescription className="text-gray-200 mobile-text-ultra-compact">
                    Informações do usuário e opções de conta
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col space-y-2 sm:space-y-3 mt-3 sm:mt-4">
                  <div className="space-y-0.5 sm:space-y-1">
                    <h3 className="mobile-heading-compact">👤 {user?.name || 'Thiago Nascimento'}</h3>
                    <p className="mobile-text-ultra-compact">🏢 {user?.empresa || 'SYSTEC'}</p>
                    <p className="mobile-text-ultra-compact">🔒 {user?.role === 'admin' ? 'Admin' : 'User'}</p>
                    <p className="mobile-text-ultra-compact">📅 {new Date().toLocaleDateString('pt-BR')}</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    className="mt-2 sm:mt-3 text-xs"
                    onClick={() => {
                      setIsMenuOpen(false);
                      logout();
                    }}
                  >
                    <LogOut className="h-3 w-3 mr-1" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop logout button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden md:flex text-white hover:bg-sysgest-teal px-1.5 sm:px-2 py-0.5 text-xs"
              onClick={logout}
            >
              Sair
            </Button>

            {/* Botão de Migração para Supabase */}
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-sysgest-teal border border-white/20 hover:border-sysgest-teal px-1.5 sm:px-2 py-0.5"
                >
                  <CloudDownload className="h-3 w-3 mr-0.5 sm:mr-1" />
                  <span className="hidden md:block mobile-text-ultra-compact">Migrar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle className="mobile-heading-compact">Migração de Dados para a Nuvem</DialogTitle>
                  <DialogDescription className="mobile-text-ultra-compact">
                    Transfira seus dados do localStorage para o Supabase de forma segura
                  </DialogDescription>
                </DialogHeader>
                <DataMigrationPanel />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  );
}
