import { useMemo, useState, useEffect, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutList,
  PackagePlus,
  History,
  TrendingUp,
  UserCheck,
  ClipboardCheck,
  Wrench,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/useAuth';
import { ESTOQUE_TAB_TO_PERMISSION } from '@/lib/permissoes';
import { SaldoEstoque } from './SaldoEstoque';
import { EntradaMaterial } from './EntradaMaterial';
import { HistoricoMovimentacoes } from './HistoricoMovimentacoes';
import { AvancoDeMaterial } from './AvancoDeMaterial';
import { MaterialTecnico } from './MaterialTecnico';
import { ConfirmacaoOsEstoque } from './ConfirmacaoOsEstoque';
import { OtimizacaoMaterial } from './OtimizacaoMaterial';
import { SessaoInventario } from './SessaoInventario';

type TabDef = { value: string; label: string; icon: LucideIcon };

const TABS_SOLO_TECNICO: TabDef[] = [{ value: 'tecnico', label: 'Material do Técnico', icon: UserCheck }];

/** Ordem de exibição das abas internas da página Estoque. */
const TAB_DEFS_ORDERED: TabDef[] = [
  { value: 'saldo', label: 'Saldo', icon: LayoutList },
  { value: 'entrada', label: 'Entrada', icon: PackagePlus },
  { value: 'avanco', label: 'Avanço de Material', icon: TrendingUp },
  { value: 'tecnico', label: 'Material do Técnico', icon: UserCheck },
  { value: 'conferencia-os', label: 'Conferência OS', icon: ClipboardCheck },
  { value: 'inventario', label: 'Inventário', icon: ClipboardList },
  { value: 'otimizacao-material', label: 'Otimização de Material', icon: Wrench },
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

  const podeVerAba = useCallback(
    (value: string) => {
      if (isDono) return true;
      if (hasPermissao('estoque')) return true;
      const perm = ESTOQUE_TAB_TO_PERMISSION[value];
      return !!perm && hasPermissao(perm);
    },
    [isDono, hasPermissao]
  );

  const tabs = useMemo(() => {
    if (papelCodigo === 'tecnico') {
      return podeVerAba('tecnico') ? TABS_SOLO_TECNICO : [];
    }
    return TAB_DEFS_ORDERED.filter((t) => podeVerAba(t.value));
  }, [papelCodigo, podeVerAba]);

  const podeOtimizacao = podeVerAba('otimizacao-material');

  const tabIds = useMemo(() => tabs.map((t) => t.value), [tabs]);

  useEffect(() => {
    if (!tabIds.includes(activeTab)) {
      setActiveTab(tabIds[0] ?? 'saldo');
    }
  }, [tabIds, activeTab]);

  if (tabs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
        <p className="font-medium">Nenhuma aba de estoque disponível</p>
        <p className="mt-1 text-sm">Solicite ao administrador as permissões correspondentes ao estoque.</p>
      </div>
    );
  }

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
        {podeOtimizacao && activeTab === 'otimizacao-material' && <OtimizacaoMaterial />}
        {activeTab === 'inventario' && <SessaoInventario />}
        {activeTab === 'movimentacoes' && <HistoricoMovimentacoes />}
      </div>
    </div>
  );
}
