import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/useAuth';
import { formatarCEP, buscarCEP } from '@/utils/viacep';
import { formatarCPF, formatarTelefone, normalizarNome } from '@/utils/mascaras';
import { fetchPlanosFibra, insertVendaFibra } from '@/lib/cadastro-comercial';
import { fetchEquipeById } from '@/lib/equipe';
import type { PlanoFibra } from '@/types';

const STATUS_OPCOES = ['Aguardando', 'Finalizado', 'Aguardando Habilitação', 'Aguardando Pagamento', 'Pagamento Confirmado'];

export function CadastroFibra() {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;
  const [equipeVendedor, setEquipeVendedor] = useState<{ nome: string; idVendedor: string | null } | null>(null);

  const [etapa, setEtapa] = useState(1);
  const [loading, setLoading] = useState(false);
  const [planos, setPlanos] = useState<PlanoFibra[]>([]);

  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [planoId, setPlanoId] = useState('');
  const [statusProposta, setStatusProposta] = useState('Aguardando');
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!donoUserId) return;
    fetchPlanosFibra(donoUserId).then(setPlanos).catch(() => setPlanos([]));
  }, [donoUserId]);

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
    if (!nomeCompleto.trim() || !cpfCnpj.trim() || !telefone.trim() || !email.trim() || !cep.trim() || !numero.trim()) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
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
      await insertVendaFibra({
        user_id: donoUserId,
        nome_completo: normalizarNome(nomeCompleto),
        cpf_cnpj: cpfCnpj.replace(/\D/g, ''),
        data_nascimento: dataNascimento || undefined,
        telefone: telefone.replace(/\D/g, ''),
        whatsapp: whatsapp ? whatsapp.replace(/\D/g, '') : undefined,
        email: email.trim(),
        cep: cep.replace(/\D/g, ''),
        endereco: endereco || undefined,
        numero: numero.trim(),
        bairro: bairro || undefined,
        cidade: cidade || undefined,
        vendedor: equipeVendedor?.nome || user?.name || user?.username || user?.email?.split('@')[0] || '',
        id_vendedor: equipeVendedor?.idVendedor ?? null,
        data_venda: dataVenda || undefined,
        status_proposta: statusProposta || 'Aguardando',
        plano_fibra_id: planoId || undefined,
        plano_fibra_nome: planoId ? planos.find((p) => p.id === planoId)?.nome : undefined,
      });
      toast({ title: 'Sucesso', description: 'Venda FIBRA cadastrada.' });
      setEtapa(1);
      setNomeCompleto('');
      setCpfCnpj('');
      setDataNascimento('');
      setTelefone('');
      setWhatsapp('');
      setEmail('');
      setCep('');
      setEndereco('');
      setNumero('');
      setBairro('');
      setCidade('');
      setPlanoId('');
      setDataVenda(new Date().toISOString().split('T')[0]);
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
        <CardTitle>Cadastro FIBRA</CardTitle>
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
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatarCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </div>
              <div>
                <Label htmlFor="data_nasc">Data de nascimento</Label>
                <Input id="data_nasc" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
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
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
                <Label htmlFor="numero">Número *</Label>
                <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Nº" required />
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
            </div>
            <div className="flex gap-2">
              <Button type="submit">Próximo: Escolher plano</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {planos.length > 0 ? (
              <div>
                <Label>Plano FIBRA *</Label>
                <Select value={planoId} onValueChange={setPlanoId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} {p.velocidade ? `- ${p.velocidade} Mbps` : ''} {p.preco_mensal ? `- R$ ${p.preco_mensal}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-amber-600">Nenhum plano FIBRA cadastrado. O admin precisa criar planos primeiro.</p>
            )}
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
