import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function DashboardHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-sysgest-blue text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl md:text-2xl font-bold">SysGest Insight Metrics</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2">
            <User size={20} />
            <span>{user?.name || 'Usuário'}</span>
            <span className="bg-sysgest-teal px-2 py-0.5 text-xs rounded-full">
              {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
            </span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-sysgest-teal"
            onClick={logout}
          >
            <LogOut className="h-5 w-5 mr-1" />
            <span className="hidden md:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
