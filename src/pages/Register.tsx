import { Link } from "react-router-dom";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from "@/components/ui/card";
import { UserPlus, Shield, BarChart3, TrendingUp, Users } from "lucide-react";

export default function Register() {
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
      
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="text-sysgest-blue" size={32} />
            <span className="text-2xl font-bold text-sysgest-blue">SysGest</span>
          </div>
          <h1 className="text-3xl font-bold text-sysgest-blue">Insight Metrics</h1>
          <p className="text-gray-600 mt-2">Crie sua conta para acessar a plataforma</p>
        </div>
        
        <Card className="w-full shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <UserPlus className="text-sysgest-blue" size={24} />
              <CardTitle className="text-2xl font-bold text-sysgest-blue">Criar Conta</CardTitle>
            </div>
            <CardDescription className="text-gray-600">
              Preencha os dados abaixo para criar sua conta
            </CardDescription>
          </CardHeader>
          
          <RegisterForm />
          
          <div className="px-6 pb-6 text-center">
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Já possui uma conta?{" "}
                <Link 
                  to="/login" 
                  className="text-sysgest-blue hover:text-sysgest-teal font-medium transition-colors"
                >
                  Faça login
                </Link>
              </p>
            </div>
          </div>
        </Card>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-blue-100">
            🔒 <strong>Seguro:</strong> Seus dados são protegidos e criptografados.
          </p>
        </div>
      </div>
    </div>
  );
} 