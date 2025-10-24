import React, { useState, useEffect } from 'react';
import { Eye, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

interface ProtectedCardProps {
  children: React.ReactNode;
  title: string;
  storageKey: string;
  className?: string;
}

const PROTECTED_PASSWORD = "529200";

export function ProtectedCard({ children, title, storageKey, className = "" }: ProtectedCardProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleUnlock = async () => {
    if (!password.trim()) {
      toast({
        title: "Senha obrigatória",
        description: "Por favor, digite a senha para acessar este conteúdo.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    // Simular delay para melhor UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (password === PROTECTED_PASSWORD) {
      setIsUnlocked(true);
      setShowPasswordModal(false);
      setPassword('');
      toast({
        title: "Acesso liberado",
        description: `Conteúdo "${title}" desbloqueado com sucesso.`,
      });
    } else {
      toast({
        title: "Senha incorreta",
        description: "A senha informada não está correta. Tente novamente.",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  };

  const handleCloseModal = () => {
    setShowPasswordModal(false);
    setPassword('');
  };

  // Resetar estado quando o componente for desmontado (mudança de guia)
  useEffect(() => {
    return () => {
      setIsUnlocked(false);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Overlay de proteção */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-gray-50/95 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 z-10">
          <div className="text-center space-y-4 p-6">
            <div className="flex justify-center">
              <Lock className="h-12 w-12 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Conteúdo Protegido
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Este conteúdo contém informações sensíveis e requer autorização para visualização.
              </p>
            </div>
            <Button 
              onClick={() => setShowPasswordModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              Revelar {title}
            </Button>
          </div>
        </div>
      )}

      {/* Conteúdo original */}
      <div className={isUnlocked ? 'opacity-100' : 'opacity-0'}>
        {children}
      </div>

      {/* Modal de senha */}
      <Dialog open={showPasswordModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Acesso Restrito
            </DialogTitle>
            <DialogDescription>
              Digite a senha para acessar o conteúdo: <strong>{title}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite a senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCloseModal}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUnlock}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Verificando..." : "Acessar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
