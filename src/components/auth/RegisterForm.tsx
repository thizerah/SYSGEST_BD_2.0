import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { type AuthErrorType } from "@/utils/AuthService";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RegisterFormProps {
  onRegisterSuccess?: () => void;
}

export function RegisterForm({ onRegisterSuccess }: RegisterFormProps) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { register, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validações básicas
    if (!name || !username || !email || !empresa || !password || !confirmPassword) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor, insira um endereço de email válido");
      return;
    }

    // Validar confirmação de senha
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    // Validar complexidade da senha
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    // Dados do usuário
    const userData = {
      name,
      username,
      email,
      empresa,
      role
    };

    // Tentar registrar o usuário
    const result = await register(email, password, userData);
    
    if (!result.success) {
      if (result.errorType === 'user_not_found') {
        setError("Não foi possível criar o usuário. Tente novamente.");
      } else {
        setError("Ocorreu um erro durante o cadastro. Verifique os dados e tente novamente.");
      }
      
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: "Não foi possível concluir o cadastro do usuário."
      });
    } else {
      setSuccess(true);
      toast({
        title: "Cadastro realizado com sucesso",
        description: "Sua conta foi criada. Você já pode fazer login."
      });
      
      // Chamar callback de sucesso, se fornecido
      if (onRegisterSuccess) {
        onRegisterSuccess();
      }
      
      // Se estivermos na rota de registro, redirecionar para login
      if (window.location.pathname === "/register") {
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    }
  };

  const renderErrorAlert = () => {
    if (!error) return null;
    
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  };

  const renderSuccessAlert = () => {
    if (!success) return null;
    
    return (
      <Alert variant="default" className="bg-green-50 border-green-500 text-green-800">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800 font-bold">Cadastro Realizado</AlertTitle>
        <AlertDescription className="text-green-700">
          Sua conta foi criada com sucesso! Redirecionando para a página de login...
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <CardContent>
      <form onSubmit={handleSubmit} className="space-y-4">
        {renderErrorAlert()}
        {renderSuccessAlert()}
        
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo</Label>
          <Input
            id="name"
            type="text"
            placeholder="Digite seu nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading || success}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="username">Nome de Usuário</Label>
          <Input
            id="username"
            type="text"
            placeholder="Escolha um nome de usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading || success}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Digite seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || success}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="empresa">Empresa</Label>
          <Input
            id="empresa"
            type="text"
            placeholder="Digite o nome da sua empresa"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            disabled={loading || success}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="role">Tipo de Usuário</Label>
          <Select
            value={role}
            onValueChange={(value) => setRole(value as "admin" | "user")}
            disabled={loading || success}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Selecione o tipo de usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="Crie uma senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || success}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar Senha</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Confirme sua senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading || success}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-sysgest-blue hover:bg-sysgest-teal"
          disabled={loading || success}
        >
          {loading ? "Processando..." : "Criar Conta"}
        </Button>
      </form>
    </CardContent>
  );
} 