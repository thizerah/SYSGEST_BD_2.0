import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import { insertVendaNovaParabolica } from '@/lib/cadastro-comercial';
import { fetchEquipeById } from '@/lib/equipe';
import { INFO_RECARGA_OPCOES } from '@/constants/infoRecarga';
import type { InfoRecargaTipo } from '@/types';
import { formatarCPF, formatarTelefone, normalizarNome } from '@/utils/mascaras';
import { formatarCEP, buscarCEP } from '@/utils/viacep';
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

const STATUS_OPCOES = ['Aguardando', 'Finalizado', 'Aguardando Habilitação', 'Aguardando Pagamento', 'Pagamento Confirmado'];

function gerarNumeroPropostaSomenteRecarga(): string {
  const digitos = Math.floor(100000000 + Math.random() * 900000000);
  return `SR-${digitos}`;
}

export function CadastroNovaParabolica() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const [equipeVendedor, setEquipeVendedor] = useState<{ nome: string; idVendedor: string | null } | null>(null);

  const [loading, setLoading] = useState(false);
  const [numeroProposta, setNumeroProposta] = useState('');
  const [valor, setValor] = useState('');
  const [valorRecarga, setValorRecarga] = useState('');
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0]);
  const [nomeProprietario, setNomeProprietario] = useState('');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [cidade, setCidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [estado, setEstado] = useState('');
  const [complemento, setComplemento] = useState('');
  const [referencia, setReferencia] = useState('');
  const [telefoneCelular, setTelefoneCelular] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [cartaoCondicao, setCartaoCondicao] = useState<'a_vista' | 'parcelado'>('a_vista');
  const [parcelas, setParcelas] = useState('');
  const [statusProposta, setStatusProposta] = useState('Aguardando');
  const [infoRecarga, setInfoRecarga] = useState<InfoRecargaTipo | ''>('');

  const isSomenteRecarga = infoRecarga === 'RECARGA_SEM_APARELHO';

  useEffect(() => {
    const equipeId = authExtras?.equipeId ?? null;
    if (equipeId) {
      fetchEquipeById(equipeId).then((eq) => {
        if (eq) setEquipeVendedor({ nome: eq.nome_completo, idVendedor: eq.id_vendedor ?? null });
        else setEquipeVendedor(null);
      }).catch(() => setEquipeVendedor(null));
    } else {
      const nome = user?.name || user?.username || user?.email?.split('@')[0] || '';
      setEquipeVendedor(nome ? { nome, idVendedor: null } : null);
    }
  }, [authExtras?.equipeId, user?.name, user?.username, user?.email]);

  const handleCepBlur = async () => {
    if (!cep || cep.replace(/\D/g, '').length !== 8) return;
    try {
      const data = await buscarCEP(cep);
      if (data) {
        setEndereco(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setEstado(data.uf || '');
        if (data.logradouro) toast({ title: 'CEP encontrado', description: 'Endereço preenchido.' });
      } else {
        toast({ title: 'CEP não encontrado', description: 'Verifique e tente novamente.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erro ao buscar CEP', variant: 'destructive' });
    }
  };

  const handleInfoRecargaChange = (v: InfoRecargaTipo | '') => {
    const newVal = v as InfoRecargaTipo | '';
    setInfoRecarga(newVal);
    if (newVal === 'RECARGA_SEM_APARELHO') {
      setNumeroProposta(gerarNumeroPropostaSomenteRecarga());
      setValor('');
      setValorRecarga('');
      setNomeProprietario('');
      setCpf('');
      setCep('');
      setEndereco('');
      setNumero('');
      setCidade('');
      setBairro('');
      setEstado('');
      setComplemento('');
      setReferencia('');
      setTelefoneCelular('');
      setFormaPagamento('');
    } else if (numeroProposta.startsWith('SR-')) {
      setNumeroProposta('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donoUserId) {
      toast({ title: 'Erro', description: 'Usuário não autenticado.', variant: 'destructive' });
      return;
    }
    if (!infoRecarga) {
      toast({ title: 'Erro', description: 'Selecione o tipo de info recarga.', variant: 'destructive' });
      return;
    }

    if (isSomenteRecarga) {
      const valorRecargaNum = parsePrecoFormatado(valorRecarga) ?? 0;
      if (valorRecargaNum <= 0) {
        toast({ title: 'Erro', description: 'Informe o valor da recarga.', variant: 'destructive' });
        return;
      }
    } else {
      if (!numeroProposta.trim()) {
        toast({ title: 'Erro', description: 'Número da proposta é obrigatório.', variant: 'destructive' });
        return;
      }
      if (!nomeProprietario.trim()) {
        toast({ title: 'Erro', description: 'Nome completo é obrigatório.', variant: 'destructive' });
        return;
      }
      const valorNum = parsePrecoFormatado(valor) ?? 0;
      if (valorNum <= 0) {
        toast({ title: 'Erro', description: 'Informe um valor válido.', variant: 'destructive' });
        return;
      }
    }

    setLoading(true);
    try {
      const valorRecargaNum = parsePrecoFormatado(valorRecarga);
      const valorNum = parsePrecoFormatado(valor) ?? 0;

      const vendedorNome = equipeVendedor?.nome || user?.name || user?.username || user?.email?.split('@')[0] || '';
      const payload = {
        numero_proposta: isSomenteRecarga ? numeroProposta.trim() : numeroProposta.trim(),
        valor: isSomenteRecarga ? (valorRecargaNum ?? 0) : valorNum,
        valor_recarga: valorRecargaNum,
        data_venda: dataVenda || new Date().toISOString().split('T')[0],
        vendedor: vendedorNome,
        id_vendedor: equipeVendedor?.idVendedor ?? null,
        nome_proprietario: isSomenteRecarga ? vendedorNome : normalizarNome(nomeProprietario),
        cep: isSomenteRecarga ? undefined : (cep ? cep.replace(/\D/g, '') : undefined),
        endereco: isSomenteRecarga ? undefined : (endereco || undefined),
        numero: isSomenteRecarga ? undefined : (numero || undefined),
        cidade: isSomenteRecarga ? undefined : (cidade || undefined),
        bairro: isSomenteRecarga ? undefined : (bairro || undefined),
        estado: isSomenteRecarga ? undefined : (estado || undefined),
        complemento: isSomenteRecarga ? undefined : (complemento || undefined),
        referencia: isSomenteRecarga ? undefined : (referencia || undefined),
        cpf: isSomenteRecarga ? undefined : (cpf ? cpf.replace(/\D/g, '') : undefined),
        telefone_celular: isSomenteRecarga ? undefined : (telefoneCelular ? telefoneCelular.replace(/\D/g, '') : undefined),
        forma_pagamento: isSomenteRecarga
          ? undefined
          : formaPagamento === 'CARTAO_CREDITO'
            ? cartaoCondicao === 'a_vista'
              ? 'CARTAO CREDITO - À VISTA'
              : parcelas ? `CARTAO CREDITO - ${parcelas}x` : 'CARTAO CREDITO - Parcelado'
            : formaPagamento || undefined,
        cartao_condicao: isSomenteRecarga ? undefined : (formaPagamento === 'CARTAO_CREDITO' ? cartaoCondicao : undefined),
        parcelas: isSomenteRecarga ? undefined : (formaPagamento === 'CARTAO_CREDITO' && parcelas ? parseInt(parcelas, 10) : undefined),
        status_proposta: isSomenteRecarga ? 'Finalizado' : (statusProposta || 'Aguardando'),
        info_recarga: infoRecarga,
      };

      await insertVendaNovaParabolica(donoUserId, payload);
      toast({ title: 'Sucesso', description: isSomenteRecarga ? 'Recarga cadastrada.' : 'Venda Nova Parabólica cadastrada.' });
      setNumeroProposta('');
      setValor('');
      setValorRecarga('');
      setNomeProprietario('');
      setCpf('');
      setCep('');
      setEndereco('');
      setNumero('');
      setCidade('');
      setBairro('');
      setEstado('');
      setComplemento('');
      setReferencia('');
      setTelefoneCelular('');
      setFormaPagamento('');
      setCartaoCondicao('a_vista');
      setParcelas('');
      setInfoRecarga('');
      setStatusProposta('Aguardando');
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
            {/* Info recarga sempre primeiro */}
            <div>
              <Label htmlFor="info_recarga">Info recarga *</Label>
              <Select
                value={infoRecarga}
                onValueChange={handleInfoRecargaChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {INFO_RECARGA_OPCOES.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isSomenteRecarga ? (
              /* Somente recarga: número auto, valor recarga, data */
              <>
                <div>
                  <Label htmlFor="numero_proposta">Número da proposta</Label>
                  <Input
                    id="numero_proposta"
                    value={numeroProposta}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="valor_recarga">Valor da recarga (R$) *</Label>
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
                  <Label htmlFor="data_venda">Data</Label>
                  <Input
                    id="data_venda"
                    type="date"
                    value={dataVenda}
                    onChange={(e) => setDataVenda(e.target.value)}
                  />
                </div>
              </>
            ) : (
              /* Recarga estoque ou Recarga + aparelho novo: formulário completo - ordem: Info, Nº proposta, Nome, CPF, Telefone, CEP, Endereço, Cidade, Bairro, Estado, Complemento, Referência, Valor, Valor recarga, Forma pagamento */
              <>
                <div>
                  <Label htmlFor="numero_proposta">Número da proposta *</Label>
                  <Input
                    id="numero_proposta"
                    value={numeroProposta}
                    onChange={(e) => setNumeroProposta(e.target.value)}
                    placeholder="Ex: 5100621246"
                  />
                </div>
                <div>
                  <Label htmlFor="nome_proprietario">Nome completo *</Label>
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
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={cep}
                    onChange={(e) => setCep(formatarCEP(e.target.value))}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                  />
                </div>
                <div>
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Preenchido via CEP"
                  />
                </div>
                <div>
                  <Label htmlFor="numero_endereco">Número</Label>
                  <Input
                    id="numero_endereco"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Nº"
                  />
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
                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    placeholder="UF"
                  />
                </div>
                <div>
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Complemento"
                  />
                </div>
                <div>
                  <Label htmlFor="referencia">Referência</Label>
                  <Input
                    id="referencia"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Referência"
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
              </>
            )}
          </div>
          {infoRecarga && (
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando…' : isSomenteRecarga ? 'Cadastrar recarga' : 'Cadastrar'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
