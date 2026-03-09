import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { VendaUnificada } from './VisualizarVendasPage';

const STATUS_OPCOES = [
  'Aguardando',
  'Finalizado',
  'Aguardando Habilitação',
  'Aguardando Pagamento',
  'Pagamento Confirmado',
];

const STATUS_FINALIZADO_GROUP = ['FINALIZADA', 'FINALIZADO', 'HABILITADO'];

function getStatusStyle(status: string): string {
  const u = (status || '').toUpperCase();
  if (STATUS_FINALIZADO_GROUP.includes(u) || u === 'FINALIZADO') return 'bg-green-100 text-green-800';
  if (u.includes('CANCELAD') || u.includes('NEGAD') || u.includes('RECUSA')) return 'bg-red-100 text-red-700';
  if (u.includes('AGUARDANDO') || u.includes('PENDENTE')) return 'bg-yellow-100 text-yellow-800';
  if (u.includes('CONFIRMADO') || u.includes('PAGO')) return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

const TIPO_STYLES: Record<string, string> = {
  POS: 'bg-green-100 text-green-800',
  PRE: 'bg-teal-100 text-teal-800',
  'SKY+': 'bg-indigo-100 text-indigo-800',
  FIBRA: 'bg-purple-100 text-purple-800',
  'MÓVEL': 'bg-blue-100 text-blue-800',
  'NOVA PARABÓLICA': 'bg-orange-100 text-orange-800',
};

function formatarData(data: string | undefined | null): string {
  if (!data) return '—';
  try {
    const s = data.split('T')[0];
    const [y, m, d] = s.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return data;
  } catch {
    return data;
  }
}

function Campo({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '' || value === '—') return null;
  const display =
    typeof value === 'boolean'
      ? value ? 'Sim' : 'Não'
      : String(value);
  return (
    <div>
      <dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-800 mt-0.5 font-medium">{display}</dd>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 pb-1 border-b">
        {titulo}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        {children}
      </dl>
    </div>
  );
}

interface DetalheVendaSheetProps {
  venda: VendaUnificada | null;
  onClose: () => void;
  onStatusChange?: (row: VendaUnificada, novoStatus: string) => void;
  savingId?: string | null;
}

export function DetalheVendaSheet({ venda, onClose, onStatusChange, savingId }: DetalheVendaSheetProps) {
  if (!venda) return null;

  const raw = venda._raw ?? {};
  const statusDisplay = STATUS_FINALIZADO_GROUP.includes((venda.status || '').toUpperCase())
    ? 'Finalizado'
    : venda.status;

  return (
    <Sheet open={!!venda} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIPO_STYLES[venda.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
              {venda.tipo}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(venda.status)}`}>
              {statusDisplay}
            </span>
          </div>
          <SheetTitle className="text-base leading-snug mt-1">{venda.cliente}</SheetTitle>
          <p className="text-sm text-muted-foreground">{venda.produto}</p>
        </SheetHeader>

        <div className="space-y-6">

          {/* ── Status editável (FIBRA / MÓVEL / NP) ── */}
          {venda.editavel && onStatusChange && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 flex items-center gap-3">
              <span className="text-xs font-medium text-blue-700 shrink-0">Alterar status:</span>
              <Select
                value={venda.status}
                onValueChange={(v) => onStatusChange(venda, v)}
                disabled={savingId === venda.id}
              >
                <SelectTrigger className="h-8 flex-1 bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPCOES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {savingId === venda.id && <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />}
            </div>
          )}

          {/* ── Dados gerais ── */}
          <Secao titulo="Dados gerais">
            <Campo label="Data" value={formatarData(venda.dataVenda)} />
            <Campo label="Vendedor" value={venda.vendedor} />
            <Campo label="Forma de Pagamento" value={venda.formaPagamento} />
            <Campo label="Seguro" value={venda.temSeguro} />
          </Secao>

          {/* ── POS / PRE / SKY+ (vendas / vendas_meta) ── */}
          {(venda.origem === undefined) && (
            <Secao titulo="Dados da proposta">
              <Campo label="Nº Proposta" value={raw.numero_proposta as string} />
              <Campo label="CPF" value={raw.cpf as string} />
              <Campo label="Telefone" value={raw.telefone_celular as string} />
              <Campo label="Cidade" value={raw.cidade as string} />
              <Campo label="Bairro" value={raw.bairro as string} />
              <Campo label="Produtos Secundários" value={raw.produtos_secundarios as string} />
              <Campo label="Valor" value={raw.valor ? `R$ ${Number(raw.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : undefined} />
            </Secao>
          )}

          {/* ── FIBRA ── */}
          {venda.origem === 'fibra' && (
            <>
              <Secao titulo="Dados do cliente">
                <Campo label="CPF / CNPJ" value={raw.cpf_cnpj as string} />
                <Campo label="Data de Nascimento" value={formatarData(raw.data_nascimento as string)} />
                <Campo label="Telefone" value={raw.telefone as string} />
                <Campo label="WhatsApp" value={raw.whatsapp as string} />
                <Campo label="E-mail" value={raw.email as string} />
              </Secao>
              <Secao titulo="Endereço">
                <Campo label="CEP" value={raw.cep as string} />
                <Campo label="Endereço" value={raw.endereco as string} />
                <Campo label="Número" value={raw.numero as string} />
                <Campo label="Bairro" value={raw.bairro as string} />
                <Campo label="Cidade" value={raw.cidade as string} />
              </Secao>
              <Secao titulo="Dados da venda">
                <Campo label="Plano" value={raw.plano_fibra_nome as string} />
                <Campo label="Data de Cadastro" value={formatarData(raw.data_cadastro as string)} />
                <Campo label="Data de Venda" value={formatarData(raw.data_venda as string)} />
              </Secao>
            </>
          )}

          {/* ── MÓVEL ── */}
          {venda.origem === 'movel' && (
            <>
              <Secao titulo="Dados do cliente">
                <Campo label="CPF" value={raw.cpf as string} />
                <Campo label="RG" value={raw.rg as string} />
                <Campo label="Data de Nascimento" value={formatarData(raw.data_nascimento as string)} />
                <Campo label="Telefone" value={raw.telefone as string} />
                <Campo label="WhatsApp" value={raw.whatsapp as string} />
                <Campo label="E-mail" value={raw.email as string} />
              </Secao>
              <Secao titulo="Endereço">
                <Campo label="CEP" value={raw.cep as string} />
                <Campo label="Endereço" value={raw.endereco as string} />
                <Campo label="Número" value={raw.numero as string} />
                <Campo label="Complemento" value={raw.complemento as string} />
                <Campo label="Referência" value={raw.referencia as string} />
                <Campo label="Bairro" value={raw.bairro as string} />
                <Campo label="Cidade" value={raw.cidade as string} />
                <Campo label="Estado" value={raw.estado as string} />
              </Secao>
              <Secao titulo="Dados da venda">
                <Campo label="Plano" value={raw.plano_movel_nome as string} />
                <Campo label="Portabilidade" value={raw.portabilidade as boolean} />
                <Campo label="eSIM" value={raw.esim as boolean} />
                <Campo label="Dia de Vencimento" value={raw.dia_vencimento as number} />
                <Campo label="Data de Cadastro" value={formatarData(raw.data_cadastro as string)} />
                <Campo label="Data de Venda" value={formatarData(raw.data_venda as string)} />
              </Secao>
            </>
          )}

          {/* ── NOVA PARABÓLICA ── */}
          {venda.origem === 'nova_parabolica' && (
            <>
              <Secao titulo="Dados da proposta">
                <Campo label="Nº Proposta" value={raw.numero_proposta as string} />
                <Campo label="CPF" value={raw.cpf as string} />
                <Campo label="Telefone" value={raw.telefone_celular as string} />
                <Campo label="Valor" value={raw.valor ? `R$ ${Number(raw.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : undefined} />
                <Campo label="Recarga" value={raw.valor_recarga ? `R$ ${Number(raw.valor_recarga).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : undefined} />
                <Campo label="Info Recarga" value={raw.info_recarga as string} />
                <Campo label="Condição Cartão" value={raw.cartao_condicao as string} />
                <Campo label="Parcelas" value={raw.parcelas as number} />
              </Secao>
              <Secao titulo="Endereço">
                <Campo label="CEP" value={raw.cep as string} />
                <Campo label="Endereço" value={raw.endereco as string} />
                <Campo label="Número" value={raw.numero as string} />
                <Campo label="Complemento" value={raw.complemento as string} />
                <Campo label="Referência" value={raw.referencia as string} />
                <Campo label="Bairro" value={raw.bairro as string} />
                <Campo label="Cidade" value={raw.cidade as string} />
                <Campo label="Estado" value={raw.estado as string} />
              </Secao>
            </>
          )}

        </div>
      </SheetContent>
    </Sheet>
  );
}
