import { Link } from "react-router-dom";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from "@/components/ui/card";

export default function Register() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-sysgest-blue">SysGest Insight Metrics</h1>
          <p className="text-gray-600 mt-2">Crie sua conta para acessar a plataforma</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Registro de Usuário</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para criar sua conta
            </CardDescription>
          </CardHeader>
          
          <RegisterForm />
          
          <div className="px-6 pb-6 text-center">
            <p className="text-sm text-gray-600">
              Já possui uma conta?{" "}
              <Link 
                to="/login" 
                className="text-sysgest-blue hover:text-sysgest-teal font-medium"
              >
                Faça login
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
} 