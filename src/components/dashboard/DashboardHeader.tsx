import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Menu } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { LocalStorageMonitor } from "./LocalStorageMonitor";
import { StorageCleaner } from "./StorageCleaner";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useState } from "react";

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const { getSetting } = useSystemSettings();
  const headerMessage = getSetting('header_message', '⚠️ Novas atualizações em breve');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-sysgest-blue text-white px-4 sm:px-6 py-3 shadow-lg">
      <div className="flex justify-between items-center w-full">
        {/* Left side - Logo and title */}
        <div className="flex items-center space-x-3">
          <div className="bg-yellow-400 p-2 rounded-lg">
            <Settings size={20} className="text-sysgest-blue" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold">SysGest Insight</h1>
            <p className="text-xs opacity-90 hidden sm:block">Sistema de gestão</p>
          </div>
        </div>
        
        {/* Right side - User info compact */}
        <div className="flex items-center space-x-2">
          {/* Desktop - User info inline */}
          <div className="hidden md:flex items-center space-x-3 text-sm">
            <span>👤 Usuário: {user?.name || 'Thiago Nascimento'}</span>
            <span>🏢 Empresa: {user?.empresa || 'SYSTEC'}</span>
            <span>🔒 Nível: {user?.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
            <span>📅 Último acesso: {new Date().toLocaleDateString('pt-BR')}</span>
          </div>

          {/* Storage controls - always visible but smaller on mobile */}
          <div className="flex items-center space-x-1">
            <LocalStorageMonitor />
            <StorageCleaner variant="button" size="sm" showLabel={false} />
          </div>

          {/* Mobile menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden text-white p-2">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] sm:w-[400px] bg-sysgest-blue text-white">
              <SheetHeader>
                <SheetTitle className="text-white">Menu do Usuário</SheetTitle>
                <SheetDescription className="text-gray-200">
                  Informações do usuário e opções de conta
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col space-y-4 mt-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">👤 {user?.name || 'Thiago Nascimento'}</h3>
                  <p className="text-sm">🏢 {user?.empresa || 'SYSTEC'}</p>
                  <p className="text-sm">🔒 {user?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
                  <p className="text-sm">📅 {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
                <Button 
                  variant="destructive" 
                  className="mt-4"
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop logout button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="hidden md:flex text-white hover:bg-sysgest-teal px-3 py-1 text-sm"
            onClick={logout}
          >
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
