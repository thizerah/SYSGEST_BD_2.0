import { useMemo, useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutList,
  PackagePlus,
  History,
  TrendingUp,
  UserCheck,
  Settings,
  ClipboardCheck,
  Wrench,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/useAuth';
import { SaldoEstoque } from './SaldoEstoque';
import { EntradaMaterial } from './EntradaMaterial';
import { HistoricoMovimentacoes } from './HistoricoMovimentacoes';
import { AvancoDeMaterial } from './AvancoDeMaterial';
import { MaterialTecnico } from './MaterialTecnico';
import { CadastroMateriais } from './CadastroMateriais';
import { ConfirmacaoOsEstoque } from './ConfirmacaoOsEstoque';
import { OtimizacaoMaterial } from './OtimizacaoMaterial';
import { SessaoInventario } from './SessaoInventario';

type TabDef = { value: string; label: string; icon: LucideIcon };

/** Subusuário técnico: só visualiza o próprio material (uma única guia). */
const TABS_SOLO_TECNICO: TabDef[] = [{ value: 'tecnico', label: 'Material do Técnico', icon: UserCheck }];

const BASE_TABS: TabDef[] = [
  { value: 'saldo', label: 'Saldo', icon: LayoutList },
  { value: 'entrada', label: 'Entrada', icon: PackagePlus },
  { value: 'avanco', label: 'Avanço de Material', icon: TrendingUp },
  { value: 'tecnico', label: 'Material do Técnico', icon: UserCheck },
  { value: 'movimentacoes', label: 'Histórico de material', icon: History },
];

/**
 * Navegação interna sem Radix Tabs: o dashboard já envolve páginas em outro `<Tabs>`;
 * abas aninhadas quebram o contexto do Radix e podem deixar painéis (ex.: Inventário) em branco.
 */
export function EstoqueMain() {
  const { papelCodigo, hasPermissao, authExtras } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(() =>
    papelCodigo === 'tecnico' ? 'tecnico' : 'saldo'
  );

  const isDono = !authExtras?.isSubUser;
  const podeVerOtimizacao = hasPermissao('estoque');

  const tabs = useMemo(() => {
    if (papelCodigo === 'tecnico') return TABS_SOLO_TECNICO;

    const extras: TabDef[] = [];

    extras.push({ value: 'conferencia-os', label: 'Conferência OS', icon: ClipboardCheck });
    extras.push({ value: 'inventario', label: 'Inventário', icon: ClipboardList });

    if (podeVerOtimizacao) {
      extras.push({ value: 'otimizacao-material', label: 'Otimização de Material', icon: Wrench });
    }

    const base = [...BASE_TABS.slice(0, 4), ...extras, ...BASE_TABS.slice(4)];

    if (isDono) {
      base.push({ value: 'cadastros', label: 'Cadastros', icon: Settings });
    }

    return base;
  }, [papelCodigo, podeVerOtimizacao, isDono]);

  const tabIds = useMemo(() => tabs.map((t) => t.value), [tabs]);

  useEffect(() => {
    if (!tabIds.includes(activeTab)) {
      setActiveTab(tabIds[0] ?? 'saldo');
    }
  }, [tabIds, activeTab]);

  return (
    <div className="w-full space-y-4">
      {tabs.length > 1 && (
        <div
          role="tablist"
          aria-orientation="horizontal"
          className="inline-flex h-auto w-full flex-wrap gap-1 justify-start rounded-md bg-muted p-1 text-muted-foreground"
        >
          {tabs.map(({ value, label, icon: Icon }) => {
            const selected = activeTab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={selected}
                id={`estoque-tab-${value}`}
                onClick={() => setActiveTab(value)}
                className={cn(
                  'inline-flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'disabled:pointer-events-none disabled:opacity-50',
                  selected ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div
        role="tabpanel"
        className={cn(tabs.length > 1 && 'mt-4')}
        aria-labelledby={tabs.length > 1 ? `estoque-tab-${activeTab}` : undefined}
      >
        {activeTab === 'saldo' && <SaldoEstoque />}
        {activeTab === 'entrada' && <EntradaMaterial />}
        {activeTab === 'avanco' && <AvancoDeMaterial />}
        {activeTab === 'tecnico' && <MaterialTecnico />}
        {papelCodigo !== 'tecnico' && activeTab === 'conferencia-os' && <ConfirmacaoOsEstoque />}
        {podeVerOtimizacao && activeTab === 'otimizacao-material' && <OtimizacaoMaterial />}
        {activeTab === 'inventario' && <SessaoInventario />}
        {activeTab === 'movimentacoes' && <HistoricoMovimentacoes />}
        {isDono && activeTab === 'cadastros' && <CadastroMateriais />}
      </div>
    </div>
  );
}
