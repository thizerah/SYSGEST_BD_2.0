import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import { insertVendaNovaParabolica } from '@/lib/cadastro-comercial';
import { formatarCPF, formatarTelefone } from '@/utils/mascaras';
import {
  sanitizarPrecoInput,
  formatarPrecoParaExibicao,
  parsePrecoFormatado,
  precoFormatadoParaEdicao,
} from '@/utils/moeda';

const FORMA_PAGAMENTO_OPCOES = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_CREDITO', label: 'Cartão Crédito' },
  { value: 'DEBITO', label: 'Débito' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
];

const STATUS_OPCOES = ['Aguardando', 'Habilitado', 'Finalizado', 'Aguardando Habilitação', 'Aguardando Pagamento', 'Pagamento Confirmado'];

export function CadastroNovaParabolica() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const vendedorNome = user?.name || user?.username || user?.email?.split('@')[0] || '';

  const [loading, setLoading] = useState(false);
  const [numeroProposta, setNumeroProposta] = useState('');
  const [valor, setValor] = useState('');
  const [valorRecarga, setValorRecarga] = useState('');
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0]);
  const [nomeProprietario, setNomeProprietario] = useState('');
  const [cpf, setCpf] = useState('');
  const [cidade, setCidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [telefoneCelular, setTelefoneCelular] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [cartaoCondicao, setCartaoCondicao] = useState<'a_vista' | 'parcelado'>('a_vista');
  const [parcelas, setParcelas] = useState('');
  const [statusProposta, setStatusProposta] = useState('Aguardando');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donoUserId) {
      toast({ title: 'Erro', description: 'Usuário não autenticado.', variant: 'destructive' });
      return;
    }
    if (!numeroProposta.trim()) {
      toast({ title: 'Erro', description: 'Número da proposta é obrigatório.', variant: 'destructive' });
      return;
    }
    const valorNum = parsePrecoFormatado(valor) ?? 0;
    if (valorNum <= 0) {
      toast({ title: 'Erro', description: 'Informe um valor válido.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const valorRecargaNum = parsePrecoFormatado(valorRecarga);
      await insertVendaNovaParabolica(donoUserId, {
        numero_proposta: numeroProposta.trim(),
        valor: valorNum,
        valor_recarga: valorRecargaNum,
        data_venda: dataVenda || new Date().toISOString().split('T')[0],
        vendedor: vendedorNome,
        nome_proprietario: nomeProprietario.trim() || vendedorNome,
        cidade: cidade || undefined,
        bairro: bairro || undefined,
        cpf: cpf ? cpf.replace(/\D/g, '') : undefined,
        telefone_celular: telefoneCelular ? telefoneCelular.replace(/\D/g, '') : undefined,
        forma_pagamento:
          formaPagamento === 'CARTAO_CREDITO'
            ? cartaoCondicao === 'a_vista'
              ? 'CARTAO CREDITO - À VISTA'
              : parcelas ? `CARTAO CREDITO - ${parcelas}x` : 'CARTAO CREDITO - Parcelado'
            : formaPagamento || undefined,
        cartao_condicao: formaPagamento === 'CARTAO_CREDITO' ? cartaoCondicao : undefined,
        parcelas: formaPagamento === 'CARTAO_CREDITO' && parcelas ? parseInt(parcelas, 10) : undefined,
        status_proposta: statusProposta || 'Aguardando',
      });
      toast({ title: 'Sucesso', description: 'Venda Nova Parabólica cadastrada.' });
      setNumeroProposta('');
      setValor('');
      setValorRecarga('');
      setNomeProprietario('');
      setCpf('');
      setCidade('');
      setBairro('');
      setTelefoneCelular('');
      setFormaPagamento('');
      setCartaoCondicao('a_vista');
      setParcelas('');
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao cadastrar.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastro Nova Parabólica</CardTitle>
        <CardDescription>
          Preencha os dados da venda para registrar no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numero_proposta">Número da proposta *</Label>
              <Input
                id="numero_proposta"
                value={numeroProposta}
                onChange={(e) => setNumeroProposta(e.target.value)}
                placeholder="Ex: 5100621246"
                required
              />
            </div>
            <div>
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="text"
                value={valor}
                onChange={(e) => setValor(sanitizarPrecoInput(e.target.value))}
                onFocus={() => {
                  if (valor && valor.startsWith('R$')) {
                    setValor(precoFormatadoParaEdicao(valor));
                  }
                }}
                onBlur={() => {
                  if (valor) {
                    setValor(formatarPrecoParaExibicao(valor));
                  }
                }}
                placeholder="R$ 0,00"
                required
              />
            </div>
            <div>
              <Label htmlFor="valor_recarga">Valor da recarga (R$)</Label>
              <Input
                id="valor_recarga"
                type="text"
                value={valorRecarga}
                onChange={(e) => setValorRecarga(sanitizarPrecoInput(e.target.value))}
                onFocus={() => {
                  if (valorRecarga && valorRecarga.startsWith('R$')) {
                    setValorRecarga(precoFormatadoParaEdicao(valorRecarga));
                  }
                }}
                onBlur={() => {
                  if (valorRecarga) {
                    setValorRecarga(formatarPrecoParaExibicao(valorRecarga));
                  }
                }}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label htmlFor="data_venda">Data da venda</Label>
              <Input
                id="data_venda"
                type="date"
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status_proposta">Status da proposta</Label>
              <Select value={statusProposta} onValueChange={setStatusProposta}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPCOES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nome_proprietario">Nome do proprietário</Label>
              <Input
                id="nome_proprietario"
                value={nomeProprietario}
                onChange={(e) => setNomeProprietario(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(formatarCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefoneCelular}
                onChange={(e) => setTelefoneCelular(formatarTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
            <div>
              <Label htmlFor="forma_pagamento">Forma de pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {FORMA_PAGAMENTO_OPCOES.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formaPagamento === 'CARTAO_CREDITO' && (
                <div className="mt-3 space-y-3 pl-0">
                  <div>
                    <Label>Condição</Label>
                    <Select
                      value={cartaoCondicao}
                      onValueChange={(v: 'a_vista' | 'parcelado') => setCartaoCondicao(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a_vista">À vista</SelectItem>
                        <SelectItem value="parcelado">Parcelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {cartaoCondicao === 'parcelado' && (
                    <div>
                      <Label htmlFor="parcelas">Quantas parcelas</Label>
                      <Input
                        id="parcelas"
                        type="number"
                        min={2}
                        max={24}
                        value={parcelas}
                        onChange={(e) => setParcelas(e.target.value)}
                        placeholder="Ex: 3"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade"
              />
            </div>
            <div>
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Bairro"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando…' : 'Cadastrar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
