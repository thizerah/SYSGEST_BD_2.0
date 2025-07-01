import React from 'react';
import { useLocalStorageMonitor } from '@/hooks/useLocalStorageMonitor';
import { Database } from 'lucide-react';

interface StorageBadgeProps {
  className?: string;
  showText?: boolean;
}

export function StorageBadge({ className = '', showText = true }: StorageBadgeProps) {
  const { stats } = useLocalStorageMonitor();

  const getBadgeColor = () => {
    if (stats.usagePercentage > 80) return 'bg-red-500';
    if (stats.usagePercentage > 60) return 'bg-yellow-500';
    if (stats.usagePercentage > 40) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (stats.usagePercentage > 80) return 'text-red-600';
    if (stats.usagePercentage > 60) return 'text-yellow-600';
    if (stats.usagePercentage > 40) return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative">
        <Database className="h-4 w-4 text-gray-600" />
        <div 
          className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${getBadgeColor()}`}
          title={`Storage: ${stats.usagePercentage.toFixed(1)}% - Performance: ${stats.performanceImpact}`}
        />
      </div>
      {showText && (
        <span className={`text-xs font-medium ${getTextColor()}`}>
          {stats.usagePercentage.toFixed(1)}%
        </span>
      )}
    </div>
  );
} 