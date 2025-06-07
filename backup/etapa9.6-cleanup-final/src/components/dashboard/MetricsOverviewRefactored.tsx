/**
 * MetricsOverview Refatorado - Etapa 7 Completa
 * Todas as 9 abas implementadas com hooks customizados e componentes modulares
 */

import React from 'react';
import { useAuth } from '@/context/auth';
import { useMetricsDashboard } from '@/hooks';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Clock, 
  Repeat, 
  AlertTriangle, 
  Users, 
  BarChart2, 
  UserCog, 
  CreditCard, 
  FileUp 
} from "lucide-react";

// Componentes modulares das abas
import { TimeMetricsTab } from './tabs/TimeMetricsTab';
import { ReopeningMetricsTab } from './tabs/ReopeningMetricsTab';
import { TechniciansTab } from './tabs/TechniciansTab';
import { IndicatorsTab } from './tabs/IndicatorsTab';
import { PermanenciaTab } from './tabs/PermanenciaTab';
import { UsersManagementTab } from './tabs/UsersManagementTab';
import { VendedorTab } from './tabs/VendedorTab';
import { PaymentsManagementTab } from './tabs/PaymentsManagementTab';
import { ImportDataTab } from './tabs/ImportDataTab';

// Componente principal refatorado
export function MetricsOverviewRefactored() {
  const { user } = useAuth();
  
  // Hook composto que gerencia todo o estado e lógica
  const dashboard = useMetricsDashboard({
    defaultTab: "time",
    filterDelay: 500
  });

  return (
    <>
      <Tabs 
        defaultValue="time" 
        className="space-y-4 w-full" 
        onValueChange={dashboard.setActiveTab}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Indicadores de Desempenho</h2>
          <TabsList>
            <TabsTrigger value="time" className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Tempos
            </TabsTrigger>
            <TabsTrigger value="reopening" className="flex items-center">
              <Repeat className="mr-2 h-4 w-4" />
              Reaberturas
            </TabsTrigger>
            <TabsTrigger value="permanencia" className="flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Permanência
            </TabsTrigger>
            <TabsTrigger value="technicians" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Técnicos
            </TabsTrigger>
            <TabsTrigger value="vendedor" className="flex items-center">
              <BarChart2 className="mr-2 h-4 w-4" />
              Vendedor
            </TabsTrigger>
            <TabsTrigger value="indicadores" className="flex items-center">
              <BarChart2 className="mr-2 h-4 w-4" />
              Indicadores
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center">
              <UserCog className="mr-2 h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center">
              <CreditCard className="mr-2 h-4 w-4" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center">
              <FileUp className="mr-2 h-4 w-4" />
              Importação
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Aba de Métricas de Tempo - IMPLEMENTADA */}
        <TabsContent value="time" className="space-y-4">
          <TimeMetricsTab dashboard={dashboard} />
        </TabsContent>

        {/* Aba de Métricas de Reabertura - IMPLEMENTADA */}
        <TabsContent value="reopening" className="space-y-4">
          <ReopeningMetricsTab dashboard={dashboard} />
        </TabsContent>

        {/* Aba de Permanência - IMPLEMENTADA */}
        <TabsContent value="permanencia" className="space-y-4">
          <PermanenciaTab />
        </TabsContent>

        {/* Aba de Técnicos - IMPLEMENTADA */}
        <TabsContent value="technicians" className="space-y-4">
          <TechniciansTab dashboard={dashboard} />
        </TabsContent>

        {/* Aba de Vendedores - IMPLEMENTADA (Etapa 7) */}
        <TabsContent value="vendedor" className="space-y-4">
          <VendedorTab dashboard={dashboard} />
        </TabsContent>

        {/* Aba de Indicadores - IMPLEMENTADA */}
        <TabsContent value="indicadores" className="space-y-4">
          <IndicatorsTab dashboard={dashboard} />
        </TabsContent>

        {/* Aba de Usuários - IMPLEMENTADA */}
        <TabsContent value="users" className="space-y-4">
          <UsersManagementTab />
        </TabsContent>

        {/* Aba de Pagamentos - IMPLEMENTADA (Etapa 7) */}
        <TabsContent value="payments" className="space-y-4">
          <PaymentsManagementTab dashboard={dashboard} />
        </TabsContent>

        {/* Aba de Importação - IMPLEMENTADA (Etapa 7) */}
        <TabsContent value="import" className="space-y-4">
          <ImportDataTab dashboard={dashboard} />
        </TabsContent>
      </Tabs>
    </>
  );
} 