import { Link } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Shield } from "lucide-react";

export default function Login() {
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
      <div className="absolute top-1/3 right-20 opacity-5">
        <Users size={80} className="text-sysgest-blue" />
      </div>
      
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left side - Welcome content */}
          <div className="hidden md:block space-y-6 text-center md:text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-center md:justify-start space-x-2 mb-4">
                <Shield className="text-sysgest-blue" size={32} />
                <span className="text-2xl font-bold text-sysgest-blue">SysGest</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-sysgest-blue leading-tight">
                Bem-vindo ao Sistema
                <span className="text-sysgest-teal block">Controle de Indicadores</span>
              </h1>
              
              <p className="text-lg text-gray-600 max-w-lg">
                Aqui o acompanhamento do indicador e gestão do negócio é a nossa prioridade.
              </p>
            </div>
            
            <div className="space-y-4 bg-white/50 backdrop-blur-sm rounded-lg p-6 border border-blue-100">
              <h3 className="text-xl font-semibold text-sysgest-blue mb-4">Por que escolher o SysGest?</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-sysgest-teal rounded-full"></div>
                  <span className="text-gray-700">Dashboard intuitivo e fácil de usar</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-sysgest-teal rounded-full"></div>
                  <span className="text-gray-700">Métricas em tempo real</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-sysgest-teal rounded-full"></div>
                  <span className="text-gray-700">Relatórios personalizados</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-sysgest-teal rounded-full"></div>
                  <span className="text-gray-700">Suporte técnico especializado</span>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 italic">
              "Desenvolvido por Thiago Nascimento @ direitos reservados"
            </div>
          </div>
          
          {/* Right side - Login form */}
          <div className="w-full max-w-md mx-auto">
            <div className="mb-8 text-center md:hidden">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Shield className="text-sysgest-blue" size={28} />
                <span className="text-xl font-bold text-sysgest-blue">SysGest</span>
              </div>
              <h1 className="text-2xl font-bold text-sysgest-blue">Insight Metrics</h1>
              <p className="text-gray-600 mt-2">Sistema de gestão de métricas e insights</p>
            </div>
            
            <Card className="w-full shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center space-y-2 pb-4">
                <CardTitle className="text-2xl font-bold text-sysgest-blue">Acesse sua conta</CardTitle>
                <CardDescription className="text-gray-600">
                  Entre com suas credenciais para acessar o sistema
                </CardDescription>
              </CardHeader>
              <LoginForm />
            </Card>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-blue-100">
                💡 <strong>Dica:</strong> Contate o administrador do sistema para obter acesso ou suporte técnico.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
