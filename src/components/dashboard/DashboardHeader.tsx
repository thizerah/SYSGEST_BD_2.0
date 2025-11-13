import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Menu } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
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
    <header className="bg-sysgest-blue text-white shadow-md border-b border-white/10">
      {/* Header principal */}
      <div className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left side - Logo and title */}
        <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 p-2.5 sm:p-3.5 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <Settings size={22} className="text-sysgest-blue drop-shadow-sm" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold drop-shadow-sm">InsightPro</h1>
            <p className="text-xs sm:text-sm hidden sm:block opacity-80 text-white/90">Sistema de gestão de métricas e insights</p>
          </div>
        </div>

        {/* Center - Mensagem de atualização */}
        <div className="hidden sm:flex bg-[#fff3cd] px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl border border-[#ffeeba] flex-1 max-w-lg mx-2 sm:mx-4 shadow-sm">
          <div className="flex items-center justify-center space-x-2 w-full">
            <span className="text-[#856404] text-xs sm:text-sm font-medium text-center leading-relaxed">{headerMessage}</span>
          </div>
        </div>
        
        {/* Right side - User info card */}
        <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Desktop - User info card */}
            <div className="hidden md:flex bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/30 shadow-lg hover:bg-white/15 transition-all duration-200">
              <div className="flex items-center space-x-4">
                {/* User avatar - melhorado */}
                <div className="w-10 h-10 bg-gradient-to-br from-white/30 to-white/10 rounded-full flex items-center justify-center ring-2 ring-white/20 shadow-md">
                  <span className="text-white text-sm font-bold">
                    {(user?.name || 'T').charAt(0).toUpperCase()}
                  </span>
                </div>
                
                {/* User info - melhor espaçamento */}
                <div className="text-white text-sm flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white/90">Usuário:</span>
                    <span className="text-white">{user?.name || 'Thiago De Matos Do Nascimento'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white/90">Empresa:</span>
                    <span className="text-white/90">{user?.empresa || 'DEALER SYSTEC INSTALACOES LTDA'}</span>
                    <div className="w-px h-4 bg-white/30 mx-1"></div>
                    <button 
                      onClick={logout}
                      className="text-red-300 hover:text-red-100 text-xs font-medium px-2 py-0.5 rounded hover:bg-red-500/20 transition-colors"
                    >
                      Sair
                    </button>
                  </div>
                  <div className="text-xs text-white/70">
                    Último acesso: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Botão Migrar - melhorado */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white hover:bg-white/20 border border-white/30 hover:border-white/50 px-4 py-2 text-xs font-medium shadow-sm hover:shadow-md transition-all"
                    >
                      <CloudDownload className="h-3.5 w-3.5 mr-1.5" />
                      Migrar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-4 border-b-2 border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                          <CloudDownload className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <DialogTitle className="text-2xl font-bold text-gray-800">
                            Migração de Dados para a Nuvem
                          </DialogTitle>
                          <DialogDescription className="text-sm text-gray-600 mt-1">
                            Transfira seus dados do localStorage para o Supabase de forma segura
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    <div className="pt-4">
                      <DataMigrationPanel />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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
        </div>
      </div>
    </header>
  );
}
