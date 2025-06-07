/**
 * Aba de Permanência - Placeholder
 * Será implementada em futuras iterações
 */

import React from 'react';
import { AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function PermanenciaTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Aba de Permanência
          </div>
        </CardTitle>
        <CardDescription>
          Esta aba será implementada em futuras versões do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Em Desenvolvimento</h3>
          <p>A aba de análise de permanência será implementada nas próximas iterações.</p>
        </div>
      </CardContent>
    </Card>
  );
} 