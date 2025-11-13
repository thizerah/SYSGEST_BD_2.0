import { Link } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Shield } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background with enhanced gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50"></div>
      
      {/* Animated decorative elements */}
      <div className="absolute top-10 left-10 opacity-10 animate-pulse">
        <BarChart3 size={120} className="text-blue-600" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-10 animate-pulse delay-1000">
        <TrendingUp size={100} className="text-teal-500" />
      </div>
      <div className="absolute top-1/3 right-20 opacity-5">
        <Users size={80} className="text-indigo-500" />
      </div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px),
                          linear-gradient(to bottom, #000 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>
      
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left side - Welcome content */}
          <div className="hidden md:block space-y-8 text-center md:text-left">
            <div className="space-y-6">
              <div className="flex items-center justify-center md:justify-start space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <BarChart3 className="text-white" size={32} />
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="text-blue-600" size={28} />
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    InsightPro
                  </span>
                </div>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                <span className="text-gray-800">Bem-vindo ao</span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 bg-clip-text text-transparent">
                  Sistema
                </span>
                <br />
                <span className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent">
                  Acompanhamento de Indicadores
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 max-w-lg leading-relaxed">
                Aqui o acompanhamento do indicador e gestão do negócio é a nossa prioridade.
              </p>
            </div>
            
            <div className="space-y-4 bg-white/70 backdrop-blur-md rounded-2xl p-8 border-2 border-blue-100/50 shadow-xl">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
                Por que escolher o InsightPro?
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4 group">
                  <div className="w-3 h-3 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full shadow-md group-hover:scale-125 transition-transform"></div>
                  <span className="text-gray-700 text-lg font-medium">Dashboard intuitivo e fácil de usar</span>
                </div>
                <div className="flex items-center space-x-4 group">
                  <div className="w-3 h-3 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full shadow-md group-hover:scale-125 transition-transform"></div>
                  <span className="text-gray-700 text-lg font-medium">Métricas em tempo real</span>
                </div>
                <div className="flex items-center space-x-4 group">
                  <div className="w-3 h-3 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full shadow-md group-hover:scale-125 transition-transform"></div>
                  <span className="text-gray-700 text-lg font-medium">Relatórios personalizados</span>
                </div>
                <div className="flex items-center space-x-4 group">
                  <div className="w-3 h-3 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full shadow-md group-hover:scale-125 transition-transform"></div>
                  <span className="text-gray-700 text-lg font-medium">Suporte técnico especializado</span>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 italic pt-4">
              "Desenvolvido por Thiago Nascimento @ direitos reservados"
            </div>
          </div>
          
          {/* Right side - Login form */}
          <div className="w-full max-w-md mx-auto">
            <div className="mb-8 text-center md:hidden">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <BarChart3 className="text-white" size={24} />
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="text-blue-600" size={24} />
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    InsightPro
                  </span>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800">InsightPro</h1>
              <p className="text-gray-600 mt-2 text-lg">Sistema de gestão de métricas e insights</p>
            </div>
            
            <Card className="w-full shadow-2xl border-2 border-gray-100 bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden">
              <CardHeader className="text-center space-y-3 pb-6 pt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-gray-100">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Acesse sua conta
                </CardTitle>
                <CardDescription className="text-gray-600 text-base">
                  Entre com suas credenciais para acessar o sistema
                </CardDescription>
              </CardHeader>
              <LoginForm />
            </Card>
            
            <div className="mt-6 text-center">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border-2 border-blue-100 shadow-lg">
                <p className="text-sm text-gray-700 flex items-center justify-center space-x-2">
                  <span className="text-2xl">💡</span>
                  <span>
                    <strong className="text-gray-800">Dica:</strong> Contate o administrador do sistema para obter acesso ou suporte técnico.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
