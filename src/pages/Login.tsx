import { Link } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-sysgest-blue">SysGest Insight Metrics</h1>
          <p className="text-gray-600 mt-2">Sistema de gestão de métricas e insights</p>
        </div>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema.
            </CardDescription>
          </CardHeader>
          <LoginForm />
          
          <div className="px-6 pb-6 text-center">
            <p className="text-sm text-gray-600">
              Não possui uma conta?{" "}
              <Link 
                to="/register" 
                className="text-sysgest-blue hover:text-sysgest-teal font-medium"
              >
                Registre-se
              </Link>
            </p>
          </div>
        </Card>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Contate o administrador do sistema para obter acesso.
          </p>
        </div>
      </div>
    </div>
  );
}
