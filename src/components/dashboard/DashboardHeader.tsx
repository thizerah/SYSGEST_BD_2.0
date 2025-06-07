import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const { getSetting } = useSystemSettings();
  const headerMessage = getSetting('header_message', '⚠️ Novas atualizações em breve');

  return (
    <header className="bg-sysgest-blue text-white px-6 py-3 shadow-lg">
      <div className="flex justify-between items-center w-full">
        {/* Left side - Logo and title */}
        <div className="flex items-center space-x-3">
          <div className="bg-yellow-400 p-2 rounded-lg">
            <Settings size={24} className="text-sysgest-blue" />
          </div>
          <div>
            <h1 className="text-xl font-bold">SysGest Insight Metrics</h1>
            <p className="text-sm opacity-90">Sistema de gestão de métricas e insights</p>
          </div>
        </div>
        
        {/* Center - Alert/Notice area */}
        <div className="hidden md:flex items-center bg-yellow-400 text-sysgest-blue px-4 py-2 rounded-lg">
          <span className="text-sm font-medium">{headerMessage}</span>
        </div>
        
        {/* Right side - User info and logout */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:block text-right">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">👤 Usuário: {user?.name || 'Thiago Nascimento'}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-sysgest-teal px-2 py-1 h-auto"
                onClick={logout}
              >
                <span className="text-xs">Sair</span>
              </Button>
            </div>
            <div className="text-xs opacity-90 mt-1">
              <p>🏢 Empresa: STARTEC INSTALACOES</p>
              <p>👔 Nível: {user?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
              <p>📅 Último acesso: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          
          {/* Mobile logout button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden text-white hover:bg-sysgest-teal"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
