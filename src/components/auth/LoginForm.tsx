import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneCall, ShieldAlert, AlertCircle, Mail, Lock, LogIn, Shield } from "lucide-react";
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
        description: "Bem-vindo ao InsightPro"
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
    <CardContent className="space-y-6 px-8 pb-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {renderErrorAlert()}
        
        <div className="space-y-3">
          <Label htmlFor="email" className="text-gray-700 font-semibold text-sm">Email</Label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
              <Mail className="text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            </div>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="pl-12 h-14 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl transition-all duration-200 bg-gray-50/50 hover:bg-white hover:border-gray-300"
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="password" className="text-gray-700 font-semibold text-sm">Senha</Label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
              <Lock className="text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="pl-12 h-14 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl transition-all duration-200 bg-gray-50/50 hover:bg-white hover:border-gray-300"
            />
          </div>
        </div>
        
        <Button 
          type="submit" 
          className="w-full h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 hover:from-teal-500 hover:via-indigo-600 hover:to-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center space-x-3 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
              <span>Autenticando...</span>
            </>
          ) : (
            <>
              <LogIn size={20} className="mr-1" />
              <span>Entrar no Sistema</span>
              <span className="text-xl">→</span>
            </>
          )}
        </Button>
      </form>
      
      <div className="text-center pt-4 border-t-2 border-gray-100">
        <p className="text-xs text-gray-500 flex items-center justify-center space-x-2">
          <Shield className="text-gray-400" size={14} />
          <span>Acesso seguro e protegido por criptografia</span>
        </p>
      </div>
    </CardContent>
  );
}
