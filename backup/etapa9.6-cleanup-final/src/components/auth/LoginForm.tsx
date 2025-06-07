import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneCall, ShieldAlert, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { type AuthErrorType } from "@/utils/AuthService";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<AuthErrorType | null>(null);
  const { login, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorType(null);

    if (!email || !password) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor, insira um endereço de email válido");
      return;
    }

    const result = await login(email, password);
    
    if (!result.success) {
      setErrorType(result.errorType || 'invalid_credentials');
      
      if (result.errorType === 'access_suspended') {
        setError("Seu acesso está temporariamente suspenso devido a pendências no pagamento.");
        toast({
          variant: "destructive",
          title: "Acesso Suspenso",
          description: "Entre em contato com o administrador para regularizar seu acesso."
        });
      } else if (result.errorType === 'user_not_found') {
        setError("Usuário não encontrado. Verifique suas credenciais.");
        toast({
          variant: "destructive",
          title: "Erro de autenticação",
          description: "Usuário não encontrado no sistema."
        });
      } else if (result.errorType === 'session_expired') {
        setError("Sua sessão expirou. Faça login novamente.");
        toast({
          title: "Sessão expirada",
          description: "Por favor, faça login novamente para continuar."
        });
      } else {
        setError("Credenciais inválidas. Tente novamente.");
        toast({
          variant: "destructive",
          title: "Erro de autenticação",
          description: "Verifique seu email e senha."
        });
      }
    } else {
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo ao SysGest Insight Metrics"
      });
      navigate("/dashboard");
    }
  };

  const renderErrorAlert = () => {
    if (!error) return null;
    
    if (errorType === 'access_suspended') {
      return (
        <Alert variant="destructive" className="bg-yellow-50 border-yellow-500 text-yellow-800">
          <ShieldAlert className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800 font-bold">Acesso Suspenso</AlertTitle>
          <AlertDescription className="text-yellow-700">
            {error}
            <div className="mt-2 font-medium flex items-center">
              <PhoneCall className="h-4 w-4 mr-1" />
              Entre em contato com o administrador para regularizar sua situação.
            </div>
          </AlertDescription>
        </Alert>
      );
    } else if (errorType === 'session_expired') {
      return (
        <Alert variant="default" className="bg-blue-50 border-blue-500 text-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 font-bold">Sessão Expirada</AlertTitle>
          <AlertDescription className="text-blue-700">
            {error}
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  };

  return (
    <CardContent>
      <form onSubmit={handleSubmit} className="space-y-4">
        {renderErrorAlert()}
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Insira seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="Insira sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-sysgest-blue hover:bg-sysgest-teal"
          disabled={loading}
        >
          {loading ? "Autenticando..." : "Entrar"}
        </Button>
      </form>
    </CardContent>
  );
}
