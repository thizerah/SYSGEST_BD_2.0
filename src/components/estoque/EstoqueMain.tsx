import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutList, PackagePlus, History, TrendingUp, UserCheck, Settings, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/context/useAuth';
import { SaldoEstoque } from './SaldoEstoque';
import { EntradaMaterial } from './EntradaMaterial';
import { HistoricoMovimentacoes } from './HistoricoMovimentacoes';
import { AvancoDeMaterial } from './AvancoDeMaterial';
import { MaterialTecnico } from './MaterialTecnico';
import { CadastroMateriais } from './CadastroMateriais';
import { ConfirmacaoOsEstoque } from './ConfirmacaoOsEstoque';

type TabDef = { value: string; label: string; icon: LucideIcon };

const BASE_TABS: TabDef[] = [
  { value: 'saldo', label: 'Saldo', icon: LayoutList },
  { value: 'entrada', label: 'Entrada', icon: PackagePlus },
  { value: 'avanco', label: 'Avanço de Material', icon: TrendingUp },
  { value: 'tecnico', label: 'Material do Técnico', icon: UserCheck },
  { value: 'movimentacoes', label: 'Histórico de material', icon: History },
  { value: 'cadastros', label: 'Cadastros', icon: Settings },
];

export function EstoqueMain() {
  const { papelCodigo } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('saldo');

  const tabs = useMemo(() => {
    if (papelCodigo === 'tecnico') return BASE_TABS;
    const conferencia: TabDef = {
      value: 'conferencia-os',
      label: 'Conferência OS',
      icon: ClipboardCheck,
    };
    return [...BASE_TABS.slice(0, 4), conferencia, ...BASE_TABS.slice(4)];
  }, [papelCodigo]);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 justify-start">
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="saldo" className="mt-4">
          <SaldoEstoque />
        </TabsContent>

        <TabsContent value="entrada" className="mt-4">
          <EntradaMaterial />
        </TabsContent>

        <TabsContent value="avanco" className="mt-4">
          <AvancoDeMaterial />
        </TabsContent>

        <TabsContent value="tecnico" className="mt-4">
          <MaterialTecnico />
        </TabsContent>

        {papelCodigo !== 'tecnico' && (
          <TabsContent value="conferencia-os" className="mt-4">
            <ConfirmacaoOsEstoque />
          </TabsContent>
        )}

        <TabsContent value="movimentacoes" className="mt-4">
          <HistoricoMovimentacoes />
        </TabsContent>

        <TabsContent value="cadastros" className="mt-4">
          <CadastroMateriais />
        </TabsContent>
      </Tabs>
    </div>
  );
}
