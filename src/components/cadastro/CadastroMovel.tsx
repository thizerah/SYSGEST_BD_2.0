import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import { formatarCEP, buscarCEP } from '@/utils/viacep';
import { formatarCPF, formatarRG, formatarTelefone } from '@/utils/mascaras';
import { fetchPlanosMovel, insertVendaMovel } from '@/lib/cadastro-comercial';
import type { PlanoMovel } from '@/types';

const STATUS_OPCOES = ['Aguardando', 'Habilitado', 'Finalizado', 'Aguardando Habilitação', 'Aguardando Pagamento', 'Pagamento Confirmado'];

export function CadastroMovel() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const vendedorNome = user?.name || user?.username || user?.email?.split('@')[0] || '';

  const [etapa, setEtapa] = useState(1);
  const [loading, setLoading] = useState(false);
  const [planos, setPlanos] = useState<PlanoMovel[]>([]);

  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [diaVencimento, setDiaVencimento] = useState<string>('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [complemento, setComplemento] = useState('');
  const [referencia, setReferencia] = useState('');
  const [esim, setEsim] = useState<string>('');
  const [portabilidade, setPortabilidade] = useState<string>('');
  const [planoId, setPlanoId] = useState('');
  const [statusProposta, setStatusProposta] = useState('Aguardando');

  const DIA_VENCIMENTO_OPCOES = ['5', '10', '15', '20'];

  useEffect(() => {
    if (!donoUserId) return;
    fetchPlanosMovel(donoUserId).then(setPlanos).catch(() => setPlanos([]));
  }, [donoUserId]);

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

  const handleSubmitEtapa1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCompleto.trim() || !cpf.trim() || !email.trim() || !telefone.trim() || !cep.trim() || !numero.trim()) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    if (!esim || !portabilidade) {
      toast({ title: 'Erro', description: 'Informe eSIM e Portabilidade (Sim/Não).', variant: 'destructive' });
      return;
    }
    setEtapa(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donoUserId) {
      toast({ title: 'Erro', description: 'Usuário não autenticado.', variant: 'destructive' });
      return;
    }
    if (!planoId && planos.length > 0) {
      toast({ title: 'Erro', description: 'Selecione um plano.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await insertVendaMovel({
        user_id: donoUserId,
        nome_completo: nomeCompleto.trim(),
        cpf: cpf.replace(/\D/g, '') || undefined,
        rg: rg.replace(/\D/g, '') || undefined,
        data_nascimento: dataNascimento || undefined,
        dia_vencimento: diaVencimento ? parseInt(diaVencimento, 10) : undefined,
        email: email.trim(),
        telefone: telefone.replace(/\D/g, ''),
        whatsapp: whatsapp ? whatsapp.replace(/\D/g, '') : undefined,
        cep: cep.replace(/\D/g, ''),
        endereco: endereco || undefined,
        numero: numero.trim(),
        bairro: bairro || undefined,
        cidade: cidade || undefined,
        estado: estado || undefined,
        complemento: complemento || undefined,
        referencia: referencia || undefined,
        esim: esim === 'sim',
        portabilidade: portabilidade === 'sim',
        vendedor: vendedorNome,
        status_proposta: statusProposta || 'Aguardando',
        plano_movel_id: planoId || undefined,
      });
      toast({ title: 'Sucesso', description: 'Venda MÓVEL cadastrada.' });
      setEtapa(1);
      setNomeCompleto('');
      setCpf('');
      setRg('');
      setDataNascimento('');
      setDiaVencimento('');
      setEmail('');
      setTelefone('');
      setWhatsapp('');
      setCep('');
      setEndereco('');
      setNumero('');
      setBairro('');
      setCidade('');
      setEstado('');
      setComplemento('');
      setReferencia('');
      setEsim('');
      setPortabilidade('');
      setPlanoId('');
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
        <CardTitle>Cadastro MÓVEL</CardTitle>
        <CardDescription>
          {etapa === 1 ? 'Etapa 1: Dados do cliente e endereço' : 'Etapa 2: Escolha do plano'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {etapa === 1 ? (
          <form onSubmit={handleSubmitEtapa1} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome completo *</Label>
                <Input id="nome" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(formatarCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </div>
              <div>
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  value={rg}
                  onChange={(e) => setRg(formatarRG(e.target.value))}
                  placeholder="00.000.000-0"
                  maxLength={12}
                />
              </div>
              <div>
                <Label htmlFor="data_nasc">Data de nascimento</Label>
                <Input id="data_nasc" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dia_vencimento">Dia de vencimento</Label>
                <Select value={diaVencimento} onValueChange={setDiaVencimento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIA_VENCIMENTO_OPCOES.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  required
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatarTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              <div>
                <Label htmlFor="cep">CEP *</Label>
                <Input
                  id="cep"
                  value={cep}
                  onChange={(e) => setCep(formatarCEP(e.target.value))}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  required
                />
              </div>
              <div>
                <Label htmlFor="numero">Número * (aceita &quot;SN&quot;)</Label>
                <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Nº ou SN" required />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Preenchido via CEP" />
              </div>
              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Input id="estado" value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="UF" />
              </div>
              <div>
                <Label htmlFor="complemento">Complemento</Label>
                <Input id="complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="referencia">Referência</Label>
                <Input id="referencia" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Configurações do Serviço Móvel</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="esim">eSIM *</Label>
                  <Select value={esim} onValueChange={setEsim} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sim ou Não" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="portabilidade">Portabilidade *</Label>
                  <Select value={portabilidade} onValueChange={setPortabilidade} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sim ou Não" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Próximo: Escolher plano</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {planos.length > 0 ? (
              <div>
                <Label>Plano MÓVEL *</Label>
                <Select value={planoId} onValueChange={setPlanoId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} {p.dados_gb ? `- ${p.dados_gb} GB` : ''} {p.preco_mensal ? `- R$ ${p.preco_mensal}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-amber-600">Nenhum plano MÓVEL cadastrado. O admin precisa criar planos primeiro.</p>
            )}
            <div>
              <Label>Status da proposta</Label>
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
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEtapa(1)}>Voltar</Button>
              <Button type="submit" disabled={loading || (planos.length > 0 && !planoId)}>
                {loading ? 'Salvando…' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
