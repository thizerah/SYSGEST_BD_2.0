/**
 * Componente reutilizável para barras de progresso com labels
 * Usado para exibir percentuais e distribuições de dados
 */

import React from 'react';
import { cn } from "@/lib/utils";
import { useProgressData } from '@/hooks/useProgressData';

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  showPercentage?: boolean;
  showValue?: boolean;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles = {
  default: {
    bar: 'bg-blue-400',
    background: 'bg-blue-100'
  },
  success: {
    bar: 'bg-green-500',
    background: 'bg-green-100'
  },
  warning: {
    bar: 'bg-amber-500',
    background: 'bg-amber-100'
  },
  danger: {
    bar: 'bg-red-500',
    background: 'bg-red-100'
  },
  info: {
    bar: 'bg-blue-500',
    background: 'bg-blue-100'
  }
};

const sizeStyles = {
  sm: {
    height: 'h-1',
    text: 'text-xs',
    spacing: 'space-y-1'
  },
  md: {
    height: 'h-2',
    text: 'text-sm',
    spacing: 'space-y-2'
  },
  lg: {
    height: 'h-3',
    text: 'text-base',
    spacing: 'space-y-3'
  }
};

export function ProgressBar({
  label,
  value,
  max = 100,
  showPercentage = true,
  showValue = false,
  subtitle,
  variant = 'default',
  size = 'md',
  className
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const styles = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  
  return (
    <div className={cn(sizeStyle.spacing, "w-full", className)}>
      <div className="flex justify-between items-center w-full">
        <span className={cn("font-medium", sizeStyle.text)}>{label.toUpperCase()}</span>
        <div className={cn("flex items-center space-x-2", sizeStyle.text)}>
          {showValue && <span>{value} unidades</span>}
          {showPercentage && <span>{percentage.toFixed(1)}%</span>}
        </div>
      </div>
      
      <div className={cn(styles.background, "rounded-full overflow-hidden w-full", sizeStyle.height)}>
        <div 
          className={cn(styles.bar, "h-full rounded-full transition-all duration-300")} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {subtitle && (
        <div className={cn("text-muted-foreground", sizeStyle.text)}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

/**
 * Componente para múltiplas barras de progresso
 */
interface MultiProgressBarProps {
  title?: string;
  items: Array<{
    label: string;
    value: number;
    variant?: ProgressBarProps['variant'];
  }>;
  max?: number;
  showPercentages?: boolean;
  showValues?: boolean;
  size?: ProgressBarProps['size'];
  className?: string;
}

export function MultiProgressBar({
  title,
  items,
  max,
  showPercentages = true,
  showValues = false,
  size = 'md',
  className
}: MultiProgressBarProps) {
  // Calcular o máximo se não fornecido
  const calculatedMax = max || Math.max(...items.map(item => item.value));
  
  return (
    <div className={cn("space-y-4 w-full", className)}>
      {title && (
        <h4 className="font-semibold text-sm">{title}</h4>
      )}
      <div className="space-y-3">
        {items.map((item, index) => (
          <ProgressBar
            key={index}
            label={item.label}
            value={item.value}
            max={calculatedMax}
            variant={item.variant}
            showPercentage={showPercentages}
            showValue={showValues}
            size={size}
          />
        ))}
      </div>
    </div>
  );
} 