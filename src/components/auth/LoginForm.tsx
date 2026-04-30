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
        description: "Bem-vindo ao Sysnex"
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
        <Alert variant="default" className="bg-gray-50 border-gray-400 text-gray-800">
          <AlertCircle className="h-4 w-4 text-gray-600" />
          <AlertTitle className="text-gray-800 font-bold">Sessão Expirada</AlertTitle>
          <AlertDescription className="text-gray-700">
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
    <CardContent className="space-y-5 px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        {renderErrorAlert()}
        
        <div className="space-y-3">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </Label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
              <Mail className="text-muted-foreground group-focus-within:text-foreground" size={20} />
            </div>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-11 rounded-lg border-input bg-background pl-12 text-base"
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Senha
          </Label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
              <Lock className="text-muted-foreground group-focus-within:text-foreground" size={20} />
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-11 rounded-lg border-input bg-background pl-12 text-base"
            />
          </div>
        </div>
        
        <Button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-800 text-base font-semibold text-white shadow hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="inline-block size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Autenticando...</span>
            </>
          ) : (
            <>
              <LogIn size={18} className="shrink-0" />
              <span>Entrar</span>
            </>
          )}
        </Button>
      </form>
      
      <div className="border-t border-border/60 pt-4 text-center">
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="size-3.5 shrink-0 opacity-70" aria-hidden />
          <span>Acesso seguro por criptografia</span>
        </p>
      </div>
    </CardContent>
  );
}
