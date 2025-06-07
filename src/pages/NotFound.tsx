import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Home, Shield, AlertTriangle, BarChart3, TrendingUp } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 opacity-10">
        <BarChart3 size={120} className="text-sysgest-blue" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-10">
        <TrendingUp size={100} className="text-sysgest-teal" />
      </div>
      
      <div className="relative z-10 text-center space-y-6 p-8 max-w-md mx-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Shield className="text-sysgest-blue" size={40} />
            <span className="text-3xl font-bold text-sysgest-blue">SysGest</span>
          </div>
          
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="text-yellow-500" size={80} />
          </div>
          
          <h1 className="text-8xl font-bold text-sysgest-blue">404</h1>
          <h2 className="text-2xl font-semibold text-sysgest-blue">Página não encontrada</h2>
          <p className="text-gray-600 bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-blue-100">
            Ops! A página que você está procurando não existe ou foi removida. 
            Que tal voltar para o início?
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            asChild 
            className="w-full h-12 bg-gradient-to-r from-sysgest-blue to-sysgest-teal hover:from-sysgest-teal hover:to-sysgest-blue text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Link to="/">
              <Home size={18} />
              <span>Voltar para o início</span>
            </Link>
          </Button>
          
          <p className="text-xs text-gray-500">
            Se você acredita que isso é um erro, entre em contato com o suporte.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
