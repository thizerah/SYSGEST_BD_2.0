/**
 * Componente reutilizável para cards de métricas
 * Usado para exibir valores, percentuais e indicadores de forma consistente
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LucideIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  description?: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  progress?: {
    value: number;
    max?: number;
    showBar?: boolean;
  };
  className?: string;
  compact?: boolean;
}

const variantStyles = {
  default: {
    card: '',
    value: 'text-2xl font-bold',
    icon: 'text-muted-foreground'
  },
  success: {
    card: 'bg-green-50 border-green-200',
    value: 'text-2xl font-bold text-green-700',
    icon: 'text-green-600'
  },
  warning: {
    card: 'bg-amber-50 border-amber-200',
    value: 'text-2xl font-bold text-amber-700',
    icon: 'text-amber-600'
  },
  danger: {
    card: 'bg-red-50 border-red-200',
    value: 'text-2xl font-bold text-red-700',
    icon: 'text-red-600'
  },
  info: {
    card: 'bg-blue-50 border-blue-200',
    value: 'text-2xl font-bold text-blue-700',
    icon: 'text-blue-600'
  }
};

export function MetricCard({
  title,
  description,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  progress,
  className,
  compact = false
}: MetricCardProps) {
  const styles = variantStyles[variant];
  
  return (
    <Card className={cn(styles.card, className)}>
      <CardHeader className={cn(compact ? "pb-1 py-2" : "pb-2")}>
        <CardTitle className={cn(
          compact ? "text-xs font-medium" : "text-sm font-medium",
          "flex items-center"
        )}>
          {Icon && <Icon className={cn("mr-2", compact ? "h-3 w-3" : "h-4 w-4", styles.icon)} />}
          {title}
        </CardTitle>
        {description && (
          <CardDescription className={compact ? "text-xs" : undefined}>
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={compact ? "py-1" : undefined}>
        <div className={styles.value}>
          {value}
          {subtitle && (
            <span className={cn(
              compact ? "text-xs" : "text-base",
              "font-normal text-muted-foreground ml-2"
            )}>
              {subtitle}
            </span>
          )}
        </div>
        {progress?.showBar && (
          <Progress 
            value={progress.value} 
            max={progress.max} 
            className={cn("mt-2", compact ? "h-1" : "h-2")} 
          />
        )}
      </CardContent>
    </Card>
  );
} 