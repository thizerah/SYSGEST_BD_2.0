import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutList, PackagePlus, History, TrendingUp, UserCheck, Settings } from 'lucide-react';
import { SaldoEstoque } from './SaldoEstoque';
import { EntradaMaterial } from './EntradaMaterial';
import { HistoricoMovimentacoes } from './HistoricoMovimentacoes';
import { AvancoDeMaterial } from './AvancoDeMaterial';
import { MaterialTecnico } from './MaterialTecnico';
import { CadastroMateriais } from './CadastroMateriais';

const TABS = [
  { value: 'saldo',         label: 'Saldo',               icon: LayoutList },
  { value: 'entrada',       label: 'Entrada',             icon: PackagePlus },
  { value: 'avanco',        label: 'Avanço de Material',  icon: TrendingUp },
  { value: 'tecnico',       label: 'Material do Técnico', icon: UserCheck },
  { value: 'movimentacoes', label: 'Histórico de material', icon: History },
  { value: 'cadastros',     label: 'Cadastros',           icon: Settings },
] as const;

export function EstoqueMain() {
  const [activeTab, setActiveTab] = useState<string>('saldo');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:w-auto lg:inline-grid">
          {TABS.map(({ value, label, icon: Icon }) => (
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
