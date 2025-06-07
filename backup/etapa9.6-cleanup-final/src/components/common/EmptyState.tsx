/**
 * Componente reutilizável para estados vazios, carregamento e mensagens informativas
 * Usado quando não há dados para exibir ou durante carregamentos
 */

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, Loader2, Calendar, AlertCircle, Info } from 'lucide-react';
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'loading' | 'error' | 'info';
  className?: string;
  children?: React.ReactNode;
}

const defaultIcons = {
  default: Calendar,
  loading: Loader2,
  error: AlertCircle,
  info: Info
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  variant = 'default',
  className,
  children
}: EmptyStateProps) {
  const DefaultIcon = Icon || defaultIcons[variant];
  
  return (
    <Card className={cn("w-full h-64", className)}>
      <CardContent className="flex items-center justify-center h-full">
        <div className="text-center">
          <DefaultIcon 
            className={cn(
              "mx-auto h-10 w-10 mb-4",
              variant === 'loading' ? "text-primary animate-spin" : "text-muted-foreground"
            )} 
          />
          <h3 className="text-lg font-medium">{title}</h3>
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {description}
            </p>
          )}
          {children && (
            <div className="mt-4">
              {children}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Componente especializado para estados de carregamento
 */
interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ 
  message = "Carregando...", 
  className 
}: LoadingStateProps) {
  return (
    <EmptyState
      variant="loading"
      title={message}
      description="Aguarde enquanto processamos os dados."
      className={className}
    />
  );
}

/**
 * Componente especializado para filtros sem resultados
 */
interface NoDataStateProps {
  title?: string;
  description?: string;
  className?: string;
  onClearFilters?: () => void;
}

export function NoDataState({ 
  title = "Selecione um período",
  description = "Escolha o mês e o ano para visualizar os dados.",
  className,
  onClearFilters
}: NoDataStateProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      className={className}
    >
      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="mt-2 text-sm text-primary hover:underline"
        >
          Limpar filtros
        </button>
      )}
    </EmptyState>
  );
}

/**
 * Componente especializado para acesso restrito
 */
interface AccessRestrictedProps {
  title?: string;
  description?: string;
  className?: string;
}

export function AccessRestricted({ 
  title = "Acesso Restrito",
  description = "Você não tem permissão para acessar esta área.",
  className
}: AccessRestrictedProps) {
  return (
    <EmptyState
      variant="error"
      title={title}
      description={description}
      className={className}
    />
  );
} 