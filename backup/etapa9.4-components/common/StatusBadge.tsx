/**
 * Componente reutilizável para badges de status
 * Usado para exibir status, ações tomadas e estados de forma consistente
 */

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusVariant = 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info' 
  | 'neutral' 
  | 'completed'
  | 'cancelled'
  | 'pending'
  | 'not-applicable';

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: StatusVariant;
  className?: string;
}

const variantStyles = {
  success: "bg-green-100 text-green-700 border-green-300",
  warning: "bg-amber-100 text-amber-700 border-amber-300", 
  danger: "bg-red-100 text-red-700 border-red-300",
  info: "bg-blue-100 text-blue-700 border-blue-300",
  neutral: "bg-gray-100 text-gray-600 border-gray-300",
  completed: "bg-green-100 text-green-700 border-green-300",
  cancelled: "bg-red-100 text-red-700 border-red-300",
  pending: "bg-purple-100 text-purple-700 border-purple-300",
  'not-applicable': "bg-gray-100 text-gray-600 border-gray-300"
};

export function StatusBadge({ 
  children, 
  variant = 'neutral', 
  className 
}: StatusBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={cn(variantStyles[variant], className)}
    >
      {children}
    </Badge>
  );
}

/**
 * Função para determinar automaticamente o variant baseado no conteúdo
 */
export function getStatusVariant(content: string | null | undefined): StatusVariant {
  if (!content || content === "N/A") return 'not-applicable';
  
  const lowerContent = content.toLowerCase();
  
  // Status de conclusão
  if (lowerContent.includes("concluí") || lowerContent.includes("finalizada")) {
    return 'completed';
  }
  
  // Status de cancelamento
  if (lowerContent.includes("cancelad")) {
    return 'cancelled';
  }
  
  // Status de cliente cancelamento
  if (lowerContent.includes("cliente cancelou")) {
    return 'warning';
  }
  
  // Status de problemas ou impedimentos
  if (lowerContent.includes("não") || lowerContent.includes("nao") || lowerContent.includes("problema")) {
    return 'info';
  }
  
  return 'neutral';
}

/**
 * Componente especializado para ação tomada em ordens de serviço
 */
interface ActionTakenBadgeProps {
  acaoTomada: string | null;
  orderStatus?: string;
  className?: string;
}

export function ActionTakenBadge({ 
  acaoTomada, 
  orderStatus = "", 
  className 
}: ActionTakenBadgeProps) {
  // Se ação tomada estiver vazia e o status for Finalizada, mostrar "Concluída"
  if ((!acaoTomada || acaoTomada === "N/A") && orderStatus.toUpperCase() === "FINALIZADA") {
    return <StatusBadge variant="completed" className={className}>Concluída</StatusBadge>;
  }
  
  // Se ação tomada estiver vazia para outros status
  if (!acaoTomada || acaoTomada === "N/A") {
    return <StatusBadge variant="not-applicable" className={className}>N/A</StatusBadge>;
  }
  
  // Casos específicos
  if (acaoTomada === "Cancelada via CCS") {
    return <StatusBadge variant="cancelled" className={className}>Cancelada via CCS</StatusBadge>;
  }
  
  if (acaoTomada === "Cliente Cancelou via SAC") {
    return <StatusBadge variant="warning" className={className}>Cliente Cancelou via SAC</StatusBadge>;
  }
  
  // Determinar variant automaticamente
  const variant = getStatusVariant(acaoTomada);
  return <StatusBadge variant={variant} className={className}>{acaoTomada}</StatusBadge>;
} 