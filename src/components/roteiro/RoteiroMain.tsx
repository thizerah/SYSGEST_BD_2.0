import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Upload, MapPin, List, DollarSign, Clock } from 'lucide-react';
import { useAuth } from '@/context/useAuth';
import { ROTEIRO_TAB_TO_PERMISSION } from '@/lib/permissoes';
import { ImportacaoRoteiro } from './ImportacaoRoteiro';
import { RotaDoDia } from './RotaDoDia';
import { ListaOSsPendentes } from './ListaOSsPendentes';
import { BaixaPagamento } from './BaixaPagamento';
import { ControleSaida } from './ControleSaida';

const TABS: { value: string; label: string; icon: typeof MapPin }[] = [
  { value: 'calendario', label: 'Rota do Dia', icon: MapPin },
  { value: 'pendentes', label: 'OSs Pendentes', icon: List },
  { value: 'baixa', label: 'Baixa de Pagamento', icon: DollarSign },
  { value: 'controle', label: 'Controle de Saída', icon: Clock },
  { value: 'importacao', label: 'Importar OSs', icon: Upload },
];

export function RoteiroMain() {
  const { hasPermissao } = useAuth();
  const [activeTab, setActiveTab] = useState('calendario');

  const allowedTabs = useMemo(() => {
    return TABS.filter((t) => {
      const perm = ROTEIRO_TAB_TO_PERMISSION[t.value];
      return perm ? hasPermissao(perm) : true;
    });
  }, [hasPermissao]);

  useEffect(() => {
    const allowed = allowedTabs.map((t) => t.value);
    if (allowed.length && !allowed.includes(activeTab)) {
      setActiveTab(allowed[0]);
    }
  }, [allowedTabs, activeTab]);

  if (allowedTabs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
        <p className="font-medium">Nenhuma aba disponível</p>
        <p className="mt-1 text-sm">Solicite ao administrador as permissões de Rotas (Rota do Dia, OSs Pendentes, etc.).</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 lg:w-auto lg:inline-grid">
          {allowedTabs.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="calendario" className="mt-4 space-y-4">
          <RotaDoDia />
        </TabsContent>

        <TabsContent value="pendentes" className="mt-4 space-y-4">
          <ListaOSsPendentes />
        </TabsContent>

        <TabsContent value="baixa" className="mt-4 space-y-4">
          <BaixaPagamento />
        </TabsContent>

        <TabsContent value="controle" className="mt-4 space-y-4">
          <ControleSaida />
        </TabsContent>

        <TabsContent value="importacao" className="mt-4 space-y-4">
          <ImportacaoRoteiro />
        </TabsContent>
      </Tabs>
    </div>
  );
}
