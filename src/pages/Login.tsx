import { Link } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Shield } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background - Neutral Gray */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-neutral-50 to-gray-50"></div>
      
      {/* Animated decorative elements */}
      <div className="absolute top-10 left-10 opacity-[0.07] animate-pulse">
        <BarChart3 size={120} className="text-gray-600" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-[0.07] animate-pulse delay-1000">
        <TrendingUp size={100} className="text-gray-600" />
      </div>
      <div className="absolute top-1/3 right-20 opacity-[0.05]">
        <Users size={80} className="text-gray-600" />
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
                <div className="p-2 bg-gray-800 rounded-xl shadow-lg">
                  <BarChart3 className="text-white" size={32} />
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="text-gray-700" size={28} />
                  <span className="text-3xl font-bold text-gray-800">
                    Sysnex
                  </span>
                </div>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold leading-snug">
                <span className="text-gray-800">Bem-vindo ao</span>
                <br />
                <span className="text-gray-800">
                  sistema inteligente de gestão operacional, comercial e indicadores
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 max-w-lg leading-relaxed">
                Centralize vendas, serviços, equipe e indicadores em um único lugar, com insights em tempo real para decisões mais rápidas.
              </p>
            </div>
            
            <div className="space-y-4 bg-white/70 backdrop-blur-md rounded-2xl p-8 border-2 border-gray-200 shadow-xl">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Por que escolher o Sysnex?
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4 group">
                  <div className="w-3 h-3 bg-gray-600 rounded-full shadow-md group-hover:scale-125 transition-transform"></div>
                  <span className="text-gray-700 text-lg font-medium">Gestão integrada de vendas, serviços, equipe e indicadores</span>
                </div>
                <div className="flex items-center space-x-4 group">
                  <div className="w-3 h-3 bg-gray-600 rounded-full shadow-md group-hover:scale-125 transition-transform"></div>
                  <span className="text-gray-700 text-lg font-medium">Operação em tempo real com visão do status de ordens de serviço e metas</span>
                </div>
                <div className="flex items-center space-x-4 group">
                  <div className="w-3 h-3 bg-gray-600 rounded-full shadow-md group-hover:scale-125 transition-transform"></div>
                  <span className="text-gray-700 text-lg font-medium">Relatórios inteligentes para decisões comerciais, operacionais e financeiras</span>
                </div>
                <div className="flex items-center space-x-4 group">
                  <div className="w-3 h-3 bg-gray-600 rounded-full shadow-md group-hover:scale-125 transition-transform"></div>
                  <span className="text-gray-700 text-lg font-medium">Controle de equipe com papéis, permissões e produtividade acompanhados de perto</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 pt-4 leading-relaxed">
                Do primeiro contato de venda ao fechamento da ordem de serviço e análise de resultados, o Sysnex acompanha todo o ciclo da sua operação.
              </p>
            </div>
            
            <div className="text-sm text-gray-500 italic pt-4">
              "Desenvolvido por Thiago Nascimento @ direitos reservados"
            </div>
          </div>
          
          {/* Right side - Login form */}
          <div className="w-full max-w-md mx-auto">
            <div className="mb-8 text-center md:hidden">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="p-2 bg-gray-800 rounded-xl shadow-lg">
                  <BarChart3 className="text-white" size={24} />
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="text-gray-700" size={24} />
                  <span className="text-2xl font-bold text-gray-800">
                    Sysnex
                  </span>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800">Sysnex</h1>
              <p className="text-gray-600 mt-2 text-lg">Sistema inteligente de gestão operacional, comercial e indicadores</p>
            </div>
            
            <Card className="w-full shadow-2xl border-2 border-gray-200 bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden">
              <CardHeader className="text-center space-y-3 pb-6 pt-8 bg-gradient-to-r from-gray-50 to-neutral-50 border-b-2 border-gray-200">
                <CardTitle className="text-3xl font-bold text-gray-800">
                  Acesse seu painel
                </CardTitle>
                <CardDescription className="text-gray-600 text-base">
                  Use suas credenciais para acessar o painel completo de gestão da sua empresa.
                </CardDescription>
              </CardHeader>
              <LoginForm />
            </Card>
            
            <div className="mt-6 text-center">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border-2 border-gray-200 shadow-lg">
                <p className="text-sm text-gray-700 flex items-center justify-center space-x-2">
                  <span className="text-2xl">💡</span>
                  <span>
                    <strong className="text-gray-800">Dica:</strong> Fale com o administrador da sua empresa para criar usuários, ajustar permissões ou obter suporte.
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
