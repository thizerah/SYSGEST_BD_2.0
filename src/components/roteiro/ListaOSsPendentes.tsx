import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useRotas } from '@/context/RotasContext';
import { List, UserPlus, Search, Calendar as CalendarIcon, MapPin, Lightbulb, Trash2, Plus, Pencil, X, Wrench, FileText, MessageCircle, Link2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RotaOS } from '@/types';
import {
  obterHistoricoCliente,
  buscarOSPorNome,
  buscarOSPorTelefone,
  obterUltimaOS,
  gerarCodigoOSC,
  extrairMotivoDasObservacoes,
} from '@/lib/roteiroHistorico';

// Função para normalizar cidade (remove acentos e converte para minúsculas)
const normalizarCidade = (cidade: string): string => {
  return cidade
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();
};

export function ListaOSsPendentes() {
  const {
    osRotas,
    tecnicos,
    atribuirTecnico,
    atribuirTecnicoEmLote,
    obterSugestoesTecnico,
    removerOS,
    atualizarOS,
    adicionarOS,
  } = useRotas();
  const { toast } = useToast();

  const [busca, setBusca] = useState('');
  const [filtroCidade, setFiltroCidade] = useState<string>('todas');
  const [filtroBairro, setFiltroBairro] = useState<string>('todos');
  const [filtroTipoServico, setFiltroTipoServico] = useState<string>('todos');
  const [filtroRazao, setFiltroRazao] = useState<string>('todas');
  const [ossSelecionadas, setOssSelecionadas] = useState<string[]>([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState('');
  
  // Estados para nova OS
  const [dialogNovaOSAberto, setDialogNovaOSAberto] = useState(false);
  const [valorFormatado, setValorFormatado] = useState('');
  const [novaOS, setNovaOS] = useState({
    codigo_os: '',
    codigo_cliente: '',
    nome_cliente: '',
    telefone: '',
    telefone_comercial: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    tipo_servico: '',
    motivo: '',
    observacoes: '',
    servico_cobrado: false,
    valor: undefined as number | undefined,
    periodo: '',
    prioridade: '',
  });
  
  // Estados para edição inline de tipo e data
  const [osEditandoTipo, setOsEditandoTipo] = useState<string | null>(null);
  const [osEditandoData, setOsEditandoData] = useState<string | null>(null);
  const [popoverDataAberto, setPopoverDataAberto] = useState<string | null>(null);
  
  // Estados para modal de edição
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [osEditandoModal, setOsEditandoModal] = useState<string | null>(null);
  const [tipoServicoEditado, setTipoServicoEditado] = useState<string>('');
  const [periodoEditado, setPeriodoEditado] = useState<string>('');
  const [prioridadeEditada, setPrioridadeEditada] = useState<string>('');
  const [valorEditado, setValorEditado] = useState<string>('');
  const [servicoCobradoEditado, setServicoCobradoEditado] = useState<boolean>(false);

  // Estados para modal de detalhes
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [osDetalhes, setOsDetalhes] = useState<RotaOS | null>(null);

  const historicoCliente = useMemo(() => {
    if (!osDetalhes?.codigo_cliente) return [];
    const dataRef = osDetalhes.data_agendada || format(new Date(), 'yyyy-MM-dd');
    return obterHistoricoCliente(osRotas, osDetalhes.codigo_cliente, dataRef);
  }, [osRotas, osDetalhes?.codigo_cliente, osDetalhes?.data_agendada]);

  // Buscar cliente (atendimento / reabrir OS)
  const [dialogBuscarClienteAberto, setDialogBuscarClienteAberto] = useState(false);
  const [buscaModo, setBuscaModo] = useState<'nome' | 'telefone'>('nome');
  const [buscaTermo, setBuscaTermo] = useState('');
  const [buscaResultados, setBuscaResultados] = useState<Array<{ codigo_cliente: string; nome_cliente: string; ultimaOS: RotaOS }>>([]);
  const [buscaIndiceSelecionado, setBuscaIndiceSelecionado] = useState(0);
  const [buscaVerOutros, setBuscaVerOutros] = useState(false);
  const [buscaExecutada, setBuscaExecutada] = useState(false);

  const handleBuscarCliente = () => {
    const termo = buscaTermo.trim();
    if (!termo) return;
    const oss = buscaModo === 'nome' ? buscarOSPorNome(osRotas, termo) : buscarOSPorTelefone(osRotas, termo);
    const porCliente = new Map<string, RotaOS[]>();
    oss.forEach((os) => {
      const k = os.codigo_cliente || os.nome_cliente || '';
      if (!k) return;
      if (!porCliente.has(k)) porCliente.set(k, []);
      porCliente.get(k)!.push(os);
    });
    const lista = Array.from(porCliente.entries()).map(([cod, list]) => {
      const ultima = obterUltimaOS(list);
      return {
        codigo_cliente: cod,
        nome_cliente: ultima?.nome_cliente ?? '',
        ultimaOS: ultima!,
      };
    }).filter((x) => x.ultimaOS);
    lista.sort((a, b) => (b.ultimaOS.data_agendada || '').localeCompare(a.ultimaOS.data_agendada || ''));
    setBuscaResultados(lista);
    setBuscaIndiceSelecionado(0);
    setBuscaVerOutros(false);
    setBuscaExecutada(true);
  };

  const handleAbrirNovaOSDesdeBusca = () => {
    const sel = buscaResultados[buscaIndiceSelecionado];
    if (!sel) return;
    const os = sel.ultimaOS;
    const codigoOS = gerarCodigoOSC();
    adicionarOS({
      codigo_os: codigoOS,
      codigo_cliente: os.codigo_cliente,
      nome_cliente: os.nome_cliente,
      telefone: os.telefone,
      telefone_comercial: os.telefone_comercial,
      telefone_residencial: os.telefone_residencial,
      endereco: os.endereco,
      complemento: os.complemento,
      bairro: os.bairro,
      cidade: os.cidade,
      cep: os.cep,
      uf: os.uf,
      tipo_servico: os.tipo_servico,
      subtipo_servico: os.subtipo_servico,
      motivo: os.motivo,
      observacoes: os.observacoes,
      servico_cobrado: os.servico_cobrado,
      valor: os.valor,
      periodo: os.periodo,
      prioridade: os.prioridade,
      pacote: os.pacote,
      codigo_item: os.codigo_item,
      data_agendada: '',
    });
    toast({
      title: 'Nova OS criada',
      description: `OS ${codigoOS} criada a partir do último serviço.`,
    });
    setDialogBuscarClienteAberto(false);
    setBuscaTermo('');
    setBuscaResultados([]);
  };

  const handleCriarOSNovaDesdeBusca = () => {
    setDialogBuscarClienteAberto(false);
    setBuscaTermo('');
    setBuscaResultados([]);
    setNovaOS({
      codigo_os: '',
      codigo_cliente: '',
      nome_cliente: '',
      telefone: '',
      telefone_comercial: '',
      cep: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      tipo_servico: '',
      motivo: '',
      observacoes: '',
      servico_cobrado: false,
      valor: undefined,
      periodo: '',
      prioridade: '',
    });
    setValorFormatado('');
    setDialogNovaOSAberto(true);
  };

  // Função para formatar telefone celular
  // Função para formatar valor monetário
  const formatarValor = (valor: string): string => {
    // Remove tudo que não é número
    const apenasNumeros = valor.replace(/\D/g, '');
    if (!apenasNumeros) return '';
    
    // Converte para número e divide por 100 para ter centavos
    const valorNumerico = parseFloat(apenasNumeros) / 100;
    
    // Formata como moeda brasileira
    return valorNumerico.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Função para converter valor formatado para número
  const converterValorParaNumero = (valorFormatado: string): number | undefined => {
    if (!valorFormatado) return undefined;
    const apenasNumeros = valorFormatado.replace(/\D/g, '');
    if (!apenasNumeros) return undefined;
    return parseFloat(apenasNumeros) / 100;
  };

  // Função para formatar CEP (XXXXX-XXX)
  const formatarCEP = (cep: string): string => {
    const apenasNumeros = cep.replace(/\D/g, '').slice(0, 8);
    if (apenasNumeros.length <= 5) {
      return apenasNumeros;
    }
    return `${apenasNumeros.slice(0, 5)}-${apenasNumeros.slice(5)}`;
  };

  // Função para buscar CEP na API ViaCEP
  const buscarCEP = async (cep: string) => {
    const apenasNumeros = cep.replace(/\D/g, '');
    
    // Só busca se tiver 8 dígitos
    if (apenasNumeros.length !== 8) {
      return;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${apenasNumeros}/json/`);
      const data = await response.json();
      
      // Verifica se não há erro
      if (data.erro) {
        toast({
          title: 'CEP não encontrado',
          description: 'O CEP informado não foi encontrado. Por favor, verifique e tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      // Preenche os campos automaticamente (sem UF)
      setNovaOS(prev => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
      }));

      // Mostra toast de sucesso
      if (data.logradouro) {
        toast({
          title: 'CEP encontrado',
          description: 'Endereço preenchido automaticamente.',
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: 'Erro ao buscar CEP',
        description: 'Não foi possível buscar o CEP. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Função para formatar valor para mensagem
  const formatarValorParaMensagem = (valor?: number): string => {
    if (!valor) return 'Não informado';
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Função para gerar link WhatsApp
  const gerarLinkWhatsApp = (telefone: string | undefined, mensagem: string): string => {
    if (!telefone) return '';
    
    // Limpar telefone para conter apenas números
    const telefoneLimpo = telefone.replace(/\D/g, '');
    
    // Verificar se o telefone tem pelo menos 10 dígitos (DDD + número)
    if (telefoneLimpo.length < 10) {
      return '';
    }
    
    // Codificar a mensagem para URL
    const mensagemCodificada = encodeURIComponent(mensagem);
    
    // Montar o link com o código do país (55)
    return `https://api.whatsapp.com/send?phone=55${telefoneLimpo}&text=${mensagemCodificada}`;
  };

  // Função para gerar mensagem de agendamento (OS Pendente)
  const gerarMensagemAgendamento = (os: RotaOS): string => {
    const assinante = os.nome_cliente || 'Cliente';
    const endereco = os.endereco || 'Não informado';
    const tipoServico = os.tipo_servico || '';
    const razao = os.motivo || '';
    const valor = os.valor;

    // Montar linhas de detalhes dinamicamente
    const linhasDetalhes = [
      `* Assinante: ${assinante.toUpperCase()}`,
      `* Endereço: ${endereco.toUpperCase()}`,
      tipoServico ? `* Tipo de serviço: ${tipoServico}` : null,
      razao ? `* Razão: ${razao}` : null,
      valor ? `* Valor: ${formatarValorParaMensagem(valor)}` : null,
    ].filter(Boolean);

    return `Olá, ${assinante.toLowerCase()}! 👋
Somos da equipe técnica e estamos entrando em contato para realizar o agendamento do seu serviço.

📋 Detalhes do serviço:
${linhasDetalhes.join('\n')}

📅 Por favor, nos informe o melhor dia e horário para realizarmos o atendimento.

❓ Aproveitando, você já possui em sua residência ANTENA e LNB?
(LNB é a peça que fica na ponta da antena.)

Ficamos no aguardo.
Obrigado! 😊`;
  };

  // Filtrar OSs pendentes
  const osPendentes = useMemo(() => {
    return osRotas.filter(os => os.status === 'pendente');
  }, [osRotas]);

  // Obter lista única de cidades para o filtro (normalizada)
  const cidadesUnicas = useMemo(() => {
    const mapaCidades = new Map<string, string>(); // normalizada -> original
    
    osPendentes.forEach(os => {
      if (os.cidade && os.cidade.trim() !== '') {
        const normalizada = normalizarCidade(os.cidade);
        // Se ainda não existe ou se a versão atual tem mais caracteres (mais completa)
        if (!mapaCidades.has(normalizada) || 
            os.cidade.length > mapaCidades.get(normalizada)!.length) {
          mapaCidades.set(normalizada, os.cidade);
        }
      }
    });
    
    // Retornar array de objetos com normalizada e original
    return Array.from(mapaCidades.entries())
      .map(([normalizada, original]) => ({ normalizada, original }))
      .sort((a, b) => a.original.localeCompare(b.original, 'pt-BR'));
  }, [osPendentes]);

  // Mapeamento bairro -> cidade (para dependência)
  const mapeamentoBairroCidade = useMemo(() => {
    const mapa = new Map<string, string>(); // bairro normalizado -> cidade original
    
    osPendentes.forEach(os => {
      if (os.bairro && os.bairro.trim() !== '' && os.cidade && os.cidade.trim() !== '') {
        const bairroNormalizado = normalizarCidade(os.bairro);
        // Se já existe, manter a versão mais completa da cidade
        if (!mapa.has(bairroNormalizado)) {
          mapa.set(bairroNormalizado, os.cidade);
        } else {
          const cidadeAtual = mapa.get(bairroNormalizado)!;
          // Se a nova cidade é mais completa, atualizar
          if (os.cidade.length > cidadeAtual.length) {
            mapa.set(bairroNormalizado, os.cidade);
          }
        }
      }
    });
    
    return mapa;
  }, [osPendentes]);

  // Obter lista única de bairros para o filtro (normalizada e filtrada por cidade)
  const bairrosUnicos = useMemo(() => {
    const mapaBairros = new Map<string, string>(); // normalizada -> original
    
    // Filtrar apenas OSs da cidade selecionada (se houver)
    const ossParaBairros = filtroCidade && filtroCidade !== 'todas'
      ? osPendentes.filter(os => 
          os.cidade && normalizarCidade(os.cidade) === normalizarCidade(filtroCidade)
        )
      : osPendentes;
    
    ossParaBairros.forEach(os => {
      if (os.bairro && os.bairro.trim() !== '') {
        const normalizada = normalizarCidade(os.bairro);
        // Se ainda não existe ou se a versão atual tem mais caracteres (mais completa)
        if (!mapaBairros.has(normalizada) || 
            os.bairro.length > mapaBairros.get(normalizada)!.length) {
          mapaBairros.set(normalizada, os.bairro);
        }
      }
    });
    
    // Retornar array de objetos com normalizada e original
    return Array.from(mapaBairros.entries())
      .map(([normalizada, original]) => ({ normalizada, original }))
      .sort((a, b) => a.original.localeCompare(b.original, 'pt-BR'));
  }, [osPendentes, filtroCidade]);

  // Obter lista única de tipos de serviço
  const tiposServicoUnicos = useMemo(() => {
    const tipos = osPendentes
      .map(os => os.tipo_servico)
      .filter((tipo): tipo is string => !!tipo && tipo.trim() !== '');
    return Array.from(new Set(tipos)).sort();
  }, [osPendentes]);

  // Obter lista única de razões (normalizada e filtrada por tipo de serviço)
  const razoesUnicas = useMemo(() => {
    const mapaRazoes = new Map<string, string>(); // normalizada -> original
    
    // Filtrar apenas OSs do tipo de serviço selecionado (se houver)
    const ossParaRazoes = filtroTipoServico && filtroTipoServico !== 'todos'
      ? osPendentes.filter(os => os.tipo_servico === filtroTipoServico)
      : osPendentes;
    
    ossParaRazoes.forEach(os => {
      if (os.motivo && os.motivo.trim() !== '') {
        const normalizada = normalizarCidade(os.motivo);
        // Se ainda não existe ou se a versão atual tem mais caracteres (mais completa)
        if (!mapaRazoes.has(normalizada) || 
            os.motivo.length > mapaRazoes.get(normalizada)!.length) {
          mapaRazoes.set(normalizada, os.motivo);
        }
      }
    });
    
    // Retornar array de objetos com normalizada e original
    return Array.from(mapaRazoes.entries())
      .map(([normalizada, original]) => ({ normalizada, original }))
      .sort((a, b) => a.original.localeCompare(b.original, 'pt-BR'));
  }, [osPendentes, filtroTipoServico]);

  // Aplicar busca e filtros de cidade, bairro, tipo de serviço e razão
  const osFiltradas = useMemo(() => {
    let filtradas = osPendentes;

    // Filtro de cidade (usando normalização)
    if (filtroCidade && filtroCidade !== 'todas') {
      const cidadeNormalizada = normalizarCidade(filtroCidade);
      filtradas = filtradas.filter(os => 
        os.cidade && normalizarCidade(os.cidade) === cidadeNormalizada
      );
    }

    // Filtro de bairro (usando normalização)
    if (filtroBairro && filtroBairro !== 'todos') {
      const bairroNormalizado = normalizarCidade(filtroBairro);
      filtradas = filtradas.filter(os => 
        os.bairro && normalizarCidade(os.bairro) === bairroNormalizado
      );
    }

    // Filtro de tipo de serviço
    if (filtroTipoServico && filtroTipoServico !== 'todos') {
      filtradas = filtradas.filter(os => 
        os.tipo_servico === filtroTipoServico
      );
    }

    // Filtro de razão (usando normalização)
    if (filtroRazao && filtroRazao !== 'todas') {
      const razaoNormalizada = normalizarCidade(filtroRazao);
      filtradas = filtradas.filter(os => 
        os.motivo && normalizarCidade(os.motivo) === razaoNormalizada
      );
    }

    // Busca
    if (busca) {
      const buscaLower = busca.toLowerCase();
      filtradas = filtradas.filter(
        os =>
          os.codigo_os.toLowerCase().includes(buscaLower) ||
          os.nome_cliente.toLowerCase().includes(buscaLower) ||
          (os.bairro && os.bairro.toLowerCase().includes(buscaLower)) ||
          (os.cidade && os.cidade.toLowerCase().includes(buscaLower))
      );
    }

    return filtradas;
  }, [osPendentes, busca, filtroCidade, filtroBairro, filtroTipoServico, filtroRazao]);

  // Função helper para obter todas as OSs do mesmo grupo (mesmo codigo_cliente)
  const obterOSsDoGrupo = useCallback((osId: string): string[] => {
    const os = osPendentes.find(o => o.id === osId);
    if (!os || !os.codigo_cliente) return [osId];
    
    // Buscar todas as OSs pendentes com o mesmo codigo_cliente
    const ossDoGrupo = osPendentes
      .filter(o => o.codigo_cliente === os.codigo_cliente && o.status === 'pendente')
      .map(o => o.id);
    
    return ossDoGrupo.length > 1 ? ossDoGrupo : [osId];
  }, [osPendentes]);

  // Função helper para verificar se uma OS faz parte de um grupo
  const fazParteDeGrupo = useCallback((osId: string): boolean => {
    const os = osPendentes.find(o => o.id === osId);
    if (!os || !os.codigo_cliente) return false;
    
    const quantidadeNoGrupo = osPendentes.filter(
      o => o.codigo_cliente === os.codigo_cliente && o.status === 'pendente'
    ).length;
    
    return quantidadeNoGrupo > 1;
  }, [osPendentes]);

  // Função helper para obter quantidade de OSs no grupo
  const quantidadeNoGrupo = useCallback((osId: string): number => {
    const os = osPendentes.find(o => o.id === osId);
    if (!os || !os.codigo_cliente) return 1;
    
    return osPendentes.filter(
      o => o.codigo_cliente === os.codigo_cliente && o.status === 'pendente'
    ).length;
  }, [osPendentes]);

  const toggleSelecionarOS = (osId: string) => {
    setOssSelecionadas(prev => {
      const ossDoGrupo = obterOSsDoGrupo(osId);
      const todasSelecionadas = ossDoGrupo.every(id => prev.includes(id));
      
      if (todasSelecionadas) {
        // Desmarcar todas do grupo
        return prev.filter(id => !ossDoGrupo.includes(id));
      } else {
        // Marcar todas do grupo
        const novasSelecionadas = [...prev];
        ossDoGrupo.forEach(id => {
          if (!novasSelecionadas.includes(id)) {
            novasSelecionadas.push(id);
          }
        });
        return novasSelecionadas;
      }
    });
  };

  const selecionarTodas = () => {
    if (ossSelecionadas.length === osFiltradas.length) {
      setOssSelecionadas([]);
    } else {
      setOssSelecionadas(osFiltradas.map(os => os.id));
    }
  };

  // Handler para mudança de cidade
  const handleCidadeChange = (cidade: string) => {
    setFiltroCidade(cidade);
    // Se mudou a cidade, limpar o filtro de bairro para evitar inconsistências
    if (cidade === 'todas') {
      setFiltroBairro('todos');
    } else {
      // Verificar se o bairro atual ainda é válido para a nova cidade
      if (filtroBairro && filtroBairro !== 'todos') {
        const bairroNormalizado = normalizarCidade(filtroBairro);
        const cidadeDoBairro = mapeamentoBairroCidade.get(bairroNormalizado);
        if (!cidadeDoBairro || normalizarCidade(cidadeDoBairro) !== normalizarCidade(cidade)) {
          setFiltroBairro('todos');
        }
      }
    }
  };

  // Handler para mudança de bairro
  const handleBairroChange = (bairro: string) => {
    setFiltroBairro(bairro);
    // Se selecionou um bairro, selecionar automaticamente a cidade correspondente
    if (bairro && bairro !== 'todos') {
      const bairroNormalizado = normalizarCidade(bairro);
      const cidadeDoBairro = mapeamentoBairroCidade.get(bairroNormalizado);
      
      if (cidadeDoBairro) {
        // Encontrar a versão exata da cidade que está na lista de cidades únicas
        const cidadeNormalizada = normalizarCidade(cidadeDoBairro);
        const cidadeEncontrada = cidadesUnicas.find(
          ({ normalizada }) => normalizada === cidadeNormalizada
        );
        
        if (cidadeEncontrada) {
          // Usar a versão original da cidade que está na lista
          setFiltroCidade(cidadeEncontrada.original);
        } else {
          // Fallback: buscar diretamente nas OSs para encontrar a cidade exata
          const osComBairro = osPendentes.find(os => 
            os.bairro && normalizarCidade(os.bairro) === bairroNormalizado &&
            os.cidade && os.cidade.trim() !== ''
          );
          
          if (osComBairro && osComBairro.cidade) {
            // Encontrar essa cidade na lista de cidades únicas
            const cidadeOSNormalizada = normalizarCidade(osComBairro.cidade);
            const cidadeNaLista = cidadesUnicas.find(
              ({ normalizada }) => normalizada === cidadeOSNormalizada
            );
            
            if (cidadeNaLista) {
              setFiltroCidade(cidadeNaLista.original);
            } else {
              setFiltroCidade(osComBairro.cidade);
            }
          } else {
            setFiltroCidade(cidadeDoBairro);
          }
        }
      }
    }
  };

  // Handler para mudança de tipo de serviço
  const handleTipoServicoChange = (tipo: string) => {
    setFiltroTipoServico(tipo);
    // Se mudou o tipo, limpar o filtro de razão para evitar inconsistências
    if (tipo === 'todos') {
      setFiltroRazao('todas');
    } else {
      // Verificar se a razão atual ainda é válida para o novo tipo
      if (filtroRazao && filtroRazao !== 'todas') {
        const razaoNormalizada = normalizarCidade(filtroRazao);
        const ossComRazao = osPendentes.filter(os => 
          os.tipo_servico === tipo &&
          os.motivo && normalizarCidade(os.motivo) === razaoNormalizada
        );
        if (ossComRazao.length === 0) {
          setFiltroRazao('todas');
        }
      }
    }
  };

  // Handler para limpar filtros
  const handleLimparFiltros = () => {
    setFiltroCidade('todas');
    setFiltroBairro('todos');
    setFiltroTipoServico('todos');
    setFiltroRazao('todas');
  };

  // Handler para abrir modal de edição
  const handleAbrirModalEdicao = (osId: string) => {
    const os = osFiltradas.find(o => o.id === osId);
    if (!os) return;
    
    setOsEditandoModal(osId);
    setTipoServicoEditado(os.tipo_servico || '');
    setPeriodoEditado(os.periodo || '');
    setPrioridadeEditada(os.prioridade || '');
    setValorEditado(os.valor ? os.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    setServicoCobradoEditado(os.servico_cobrado || false);
    setModalEdicaoAberto(true);
  };

  // Handler para salvar alterações do modal
  const handleSalvarEdicaoModal = () => {
    if (!osEditandoModal) return;

    const atualizacoes: Partial<RotaOS> = {};
    
    // Processar tipo de serviço
    if (tipoServicoEditado) {
      atualizacoes.tipo_servico = tipoServicoEditado;
    }
    
    // Processar período
    const periodoFinal = periodoEditado === '__limpar__' ? undefined : (periodoEditado || undefined);
    if (periodoFinal !== undefined) {
      atualizacoes.periodo = periodoFinal;
    }
    
    // Processar prioridade
    const prioridadeFinal = prioridadeEditada === '__limpar__' ? undefined : (prioridadeEditada || undefined);
    if (prioridadeFinal !== undefined) {
      atualizacoes.prioridade = prioridadeFinal;
    }
    
    // Processar valor
    if (servicoCobradoEditado) {
      const apenasNumeros = valorEditado.replace(/\D/g, '');
      const valorNumerico = apenasNumeros ? parseFloat(apenasNumeros) / 100 : undefined;
      atualizacoes.valor = valorNumerico;
      atualizacoes.servico_cobrado = true;
    } else {
      atualizacoes.valor = undefined;
      atualizacoes.servico_cobrado = false;
    }

    // Se há OSs selecionadas, aplicar a todas
    if (ossSelecionadas.length > 0 && ossSelecionadas.includes(osEditandoModal)) {
      ossSelecionadas.forEach(osId => {
        atualizarOS(osId, atualizacoes);
      });
      toast({
        title: 'OSs atualizadas',
        description: `${ossSelecionadas.length} OS(s) atualizada(s) com sucesso.`,
      });
    } else {
      // Aplicar apenas à OS atual
      atualizarOS(osEditandoModal, atualizacoes);
      toast({
        title: 'OS atualizada',
        description: 'Informações da OS foram atualizadas com sucesso.',
      });
    }

    // Fechar modal e limpar estados
    setModalEdicaoAberto(false);
    setOsEditandoModal(null);
    setTipoServicoEditado('');
    setPeriodoEditado('');
    setPrioridadeEditada('');
    setValorEditado('');
    setServicoCobradoEditado(false);
  };

  const handleAtribuir = () => {
    if (!tecnicoSelecionado) {
      toast({
        title: 'Erro',
        description: 'Selecione um técnico para atribuir.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se todas as OSs têm data agendada
    const ossSemData = ossSelecionadas.filter(osId => {
      const os = osPendentes.find(o => o.id === osId);
      if (!os || !os.data_agendada) return true;
      // Verificar se a data está no formato correto (YYYY-MM-DD)
      const partes = os.data_agendada.split('-');
      return partes.length !== 3 || !partes[0] || !partes[1] || !partes[2];
    });

    if (ossSemData.length > 0) {
      toast({
        title: 'Erro',
        description: `Algumas OSs não possuem data agendada. Defina a data antes de atribuir o técnico.`,
        variant: 'destructive',
      });
      return;
    }

    // Atribuir técnico a todas as OSs (já verificamos que todas têm data)
    const quantidadeAtribuida = ossSelecionadas.length;
    
    ossSelecionadas.forEach((osId) => {
      atribuirTecnico(osId, tecnicoSelecionado);
    });

    // Resetar estado
    setOssSelecionadas([]);
    setTecnicoSelecionado('');
    setDialogAberto(false);
    
    toast({
      title: 'Técnico atribuído',
      description: `${quantidadeAtribuida} OS(s) atribuída(s) com sucesso.`,
    });
  };

  const handleExcluirSelecionadas = () => {
    if (ossSelecionadas.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhuma OS selecionada para excluir.',
        variant: 'destructive',
      });
      return;
    }

    const quantidadeExcluida = ossSelecionadas.length;
    
    ossSelecionadas.forEach((osId) => {
      removerOS(osId);
    });

    // Resetar seleções
    setOssSelecionadas([]);
    
    toast({
      title: 'OSs excluídas',
      description: `${quantidadeExcluida} OS(s) excluída(s) com sucesso.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <List className="w-5 h-5" />
              OSs Pendentes de Atribuição
            </CardTitle>
            <CardDescription>
              {osPendentes.length} ordem(ns) de serviço aguardando atribuição de técnico
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Busca e ações */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por OS, cliente, bairro ou cidade..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={filtroCidade} onValueChange={handleCidadeChange}>
            <SelectTrigger className="w-[200px]">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as cidades</SelectItem>
              {cidadesUnicas.map(({ normalizada, original }) => (
                <SelectItem key={normalizada} value={original}>
                  {original}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={filtroBairro} 
            onValueChange={handleBairroChange}
            disabled={filtroCidade === 'todas'}
          >
            <SelectTrigger className="w-[200px]">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder={filtroCidade === 'todas' ? 'Selecione uma cidade primeiro' : 'Filtrar por bairro'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os bairros</SelectItem>
              {bairrosUnicos.map(({ normalizada, original }) => (
                <SelectItem key={normalizada} value={original}>
                  {original}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroTipoServico} onValueChange={handleTipoServicoChange}>
            <SelectTrigger className="w-[200px]">
              <Wrench className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tiposServicoUnicos.map(tipo => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={filtroRazao} 
            onValueChange={setFiltroRazao}
            disabled={filtroTipoServico === 'todos'}
          >
            <SelectTrigger className="w-[200px]">
              <FileText className="w-4 h-4 mr-2" />
              <SelectValue placeholder={filtroTipoServico === 'todos' ? 'Selecione um tipo primeiro' : 'Filtrar por razão'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as razões</SelectItem>
              {razoesUnicas.map(({ normalizada, original }) => (
                <SelectItem key={normalizada} value={original}>
                  {original}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleLimparFiltros}
            disabled={filtroCidade === 'todas' && filtroBairro === 'todos' && filtroTipoServico === 'todos' && filtroRazao === 'todas'}
            title="Limpar filtros"
            className="h-10 w-10 bg-white hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex gap-2">
            <Dialog open={dialogNovaOSAberto} onOpenChange={setDialogNovaOSAberto}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  title="Nova OS"
                  className="bg-yellow-500 hover:bg-yellow-600 border-yellow-500 hover:border-yellow-600 text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                {/* Header com fundo azul */}
                <div className="bg-primary text-primary-foreground px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-xl font-bold text-white">
                        Nova Ordem de Serviço
                      </DialogTitle>
                      <DialogDescription className="text-primary-foreground/80 mt-1">
                        Preencha os dados da nova ordem de serviço
                      </DialogDescription>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-6">
                    {/* Campos Código OS e Código Cliente */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="codigo_os" className="font-semibold">Código OS *</Label>
                        <Input
                          id="codigo_os"
                          value={novaOS.codigo_os}
                          onChange={(e) => setNovaOS({ ...novaOS, codigo_os: e.target.value })}
                          placeholder="Ex: OS001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="codigo_cliente" className="font-semibold">Código Cliente</Label>
                        <Input
                          id="codigo_cliente"
                          value={novaOS.codigo_cliente}
                          onChange={(e) => setNovaOS({ ...novaOS, codigo_cliente: e.target.value })}
                          placeholder="Ex: CLI001"
                        />
                      </div>
                    </div>

                    {/* Seção: Dados do Cliente */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Dados do Cliente</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nome_cliente" className="font-semibold">Cliente *</Label>
                          <Input
                            id="nome_cliente"
                            value={novaOS.nome_cliente}
                            onChange={(e) => setNovaOS({ ...novaOS, nome_cliente: e.target.value })}
                            placeholder="Nome completo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefone" className="font-semibold">Tel. Cel</Label>
                          <Input
                            id="telefone"
                            type="tel"
                            value={novaOS.telefone}
                            onChange={(e) => {
                              // Permitir apenas números e limitar a 11 caracteres
                              const apenasNumeros = e.target.value.replace(/\D/g, '').slice(0, 11);
                              setNovaOS({ ...novaOS, telefone: apenasNumeros });
                            }}
                            placeholder="00000000000"
                            maxLength={11}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefone_comercial" className="font-semibold">Tel. Com</Label>
                          <Input
                            id="telefone_comercial"
                            type="tel"
                            value={novaOS.telefone_comercial}
                            onChange={(e) => {
                              // Permitir apenas números e limitar a 11 caracteres
                              const apenasNumeros = e.target.value.replace(/\D/g, '').slice(0, 11);
                              setNovaOS({ ...novaOS, telefone_comercial: apenasNumeros });
                            }}
                            placeholder="00000000000"
                            maxLength={11}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Seção: Endereço */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Endereço</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cep" className="font-semibold">CEP</Label>
                          <Input
                            id="cep"
                            value={novaOS.cep}
                            onChange={(e) => {
                              const cepFormatado = formatarCEP(e.target.value);
                              setNovaOS({ ...novaOS, cep: cepFormatado });
                              
                              // Busca automaticamente quando tiver 8 dígitos
                              const apenasNumeros = cepFormatado.replace(/\D/g, '');
                              if (apenasNumeros.length === 8) {
                                buscarCEP(cepFormatado);
                              }
                            }}
                            placeholder="00000-000"
                            maxLength={9}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endereco" className="font-semibold">Rua *</Label>
                          <Input
                            id="endereco"
                            value={novaOS.endereco}
                            onChange={(e) => setNovaOS({ ...novaOS, endereco: e.target.value })}
                            placeholder="Nome da rua"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="numero" className="font-semibold">Número</Label>
                          <Input
                            id="numero"
                            value={novaOS.numero}
                            onChange={(e) => setNovaOS({ ...novaOS, numero: e.target.value })}
                            placeholder="123"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bairro" className="font-semibold">Bairro</Label>
                          <Input
                            id="bairro"
                            value={novaOS.bairro}
                            onChange={(e) => setNovaOS({ ...novaOS, bairro: e.target.value })}
                            placeholder="Nome do bairro"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="complemento" className="font-semibold">Complemento</Label>
                          <Input
                            id="complemento"
                            value={novaOS.complemento}
                            onChange={(e) => setNovaOS({ ...novaOS, complemento: e.target.value })}
                            placeholder="Apto, Bloco, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cidade" className="font-semibold">Cidade</Label>
                          <Input
                            id="cidade"
                            value={novaOS.cidade}
                            onChange={(e) => setNovaOS({ ...novaOS, cidade: e.target.value })}
                            placeholder="Nome da cidade"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Seção: Informações de Serviço */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Informações de Serviço</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tipo_servico" className="font-semibold">Tipo de Serviço *</Label>
                          <Select value={novaOS.tipo_servico} onValueChange={(value) => setNovaOS({ ...novaOS, tipo_servico: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Assistência Técnica">Assistência Técnica</SelectItem>
                              <SelectItem value="Instalação">Instalação</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="motivo" className="font-semibold">Motivo</Label>
                          <Input
                            id="motivo"
                            value={novaOS.motivo}
                            onChange={(e) => setNovaOS({ ...novaOS, motivo: e.target.value })}
                            placeholder="Motivo do serviço"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="periodo" className="font-semibold">Período</Label>
                          <Select
                            value={novaOS.periodo}
                            onValueChange={(value) => setNovaOS({ ...novaOS, periodo: value })}
                          >
                            <SelectTrigger id="periodo">
                              <SelectValue placeholder="Selecione o período" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Manhã">Manhã</SelectItem>
                              <SelectItem value="Tarde">Tarde</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="prioridade" className="font-semibold">Prioridade</Label>
                          <Select
                            value={novaOS.prioridade}
                            onValueChange={(value) => setNovaOS({ ...novaOS, prioridade: value })}
                          >
                            <SelectTrigger id="prioridade">
                              <SelectValue placeholder="Selecione a prioridade" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Alta">Alta</SelectItem>
                              <SelectItem value="Média">Média</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Seção: Valor do Serviço */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Valor do Serviço</h3>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="servico_cobrado"
                          checked={novaOS.servico_cobrado}
                          onCheckedChange={(checked) => {
                            setNovaOS({ ...novaOS, servico_cobrado: checked as boolean, valor: checked ? novaOS.valor : undefined });
                            if (!checked) {
                              setValorFormatado('');
                            }
                          }}
                        />
                        <Label htmlFor="servico_cobrado" className="cursor-pointer font-semibold">
                          Serviço Cobrado
                        </Label>
                      </div>
                      {novaOS.servico_cobrado && (
                        <div className="space-y-2">
                          <Label htmlFor="valor" className="font-semibold">Valor (R$)</Label>
                          <Input
                            id="valor"
                            type="text"
                            value={valorFormatado}
                            onChange={(e) => {
                              const formatado = formatarValor(e.target.value);
                              setValorFormatado(formatado);
                              const valorNumerico = converterValorParaNumero(formatado);
                              setNovaOS({ ...novaOS, valor: valorNumerico });
                            }}
                            placeholder="R$ 0,00"
                            className="font-mono"
                          />
                        </div>
                      )}
                    </div>

                    {/* Seção: Observações */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Observações</h3>
                      <div className="space-y-2">
                        <Textarea
                          id="observacoes"
                          value={novaOS.observacoes}
                          onChange={(e) => setNovaOS({ ...novaOS, observacoes: e.target.value })}
                          placeholder="Observações adicionais sobre a OS..."
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-gray-50">
                  <Button variant="outline" onClick={() => {
                    setDialogNovaOSAberto(false);
                    setNovaOS({
                      codigo_os: '',
                      codigo_cliente: '',
                      nome_cliente: '',
                      telefone: '',
                      telefone_comercial: '',
                      cep: '',
                      endereco: '',
                      numero: '',
                      complemento: '',
                      bairro: '',
                      cidade: '',
                      tipo_servico: '',
                      motivo: '',
                      observacoes: '',
                      servico_cobrado: false,
                      valor: undefined,
                      periodo: '',
                      prioridade: '',
                    });
                    setValorFormatado('');
                  }}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      if (!novaOS.codigo_os || !novaOS.nome_cliente || !novaOS.endereco || !novaOS.tipo_servico) {
                        toast({
                          title: 'Erro',
                          description: 'Preencha todos os campos obrigatórios (Código OS, Cliente, Endereço e Tipo de Serviço).',
                          variant: 'destructive',
                        });
                        return;
                      }
                      adicionarOS({
                        ...novaOS,
                        endereco: (() => {
                          let enderecoCompleto = novaOS.endereco;
                          
                          // Adiciona número se existir
                          if (novaOS.numero) {
                            enderecoCompleto += ` ${novaOS.numero}`;
                          }
                          
                          // Adiciona complemento se existir
                          if (novaOS.complemento) {
                            enderecoCompleto += ` ${novaOS.complemento}`;
                          }
                          
                          return enderecoCompleto.trim();
                        })(),
                        data_agendada: '',
                      });
                      toast({
                        title: 'OS adicionada',
                        description: 'Ordem de serviço foi adicionada com sucesso.',
                      });
                      setDialogNovaOSAberto(false);
                      setNovaOS({
                        codigo_os: '',
                        codigo_cliente: '',
                        nome_cliente: '',
                        telefone: '',
                        telefone_comercial: '',
                        cep: '',
                        endereco: '',
                        numero: '',
                        complemento: '',
                        bairro: '',
                        cidade: '',
                        tipo_servico: '',
                        motivo: '',
                        observacoes: '',
                        servico_cobrado: false,
                        valor: undefined,
                        periodo: '',
                        prioridade: '',
                      });
                      setValorFormatado('');
                    }}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Adicionar OS
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  size="icon"
                  disabled={ossSelecionadas.length === 0}
                  title={`Excluir ${ossSelecionadas.length} OS(s) selecionada(s)`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir {ossSelecionadas.length} OS(s) selecionada(s)?
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleExcluirSelecionadas}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog 
              open={dialogAberto} 
              onOpenChange={(open) => {
                setDialogAberto(open);
                if (!open) {
                  // Limpar seleções ao fechar
                  setTecnicoSelecionado('');
                }
              }}
            >
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  size="icon"
                  disabled={ossSelecionadas.length === 0}
                  onClick={() => setDialogAberto(true)}
                  title={`Atribuir técnico para ${ossSelecionadas.length} OS(s) selecionada(s)`}
                  className="bg-blue-500 hover:bg-blue-600 border-blue-500 hover:border-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Atribuir Técnico</DialogTitle>
                <DialogDescription>
                  Atribua um técnico para {ossSelecionadas.length} OS(s) selecionada(s). 
                  Certifique-se de que todas as OSs possuem data agendada definida.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Seleção de técnico */}
                <div className="space-y-2">
                  <Label>Técnico *</Label>
                  <Select value={tecnicoSelecionado} onValueChange={setTecnicoSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um técnico" />
                    </SelectTrigger>
                    <SelectContent>
                      {tecnicos.map((tec) => (
                        <SelectItem 
                          key={tec.id} 
                          value={tec.id}
                          className="data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors duration-150"
                        >
                          {tec.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {tecnicos.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Nenhum técnico. Cadastre em Cadastro de Usuários.
                    </p>
                  )}
                </div>

                {/* Aviso sobre data */}
                {ossSelecionadas.length > 0 && (
                  <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                    <p className="font-medium mb-1">OSs selecionadas:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {ossSelecionadas.map(osId => {
                        const os = osPendentes.find(o => o.id === osId);
                        const temData = os && os.data_agendada;
                        const dataFormatada = temData ? (() => {
                          const [ano, mes, dia] = os.data_agendada.split('-');
                          if (ano && mes && dia) {
                            return `${dia}/${mes}/${ano}`;
                          }
                          return '';
                        })() : '';
                        
                        return (
                          <li key={osId} className={temData && dataFormatada ? 'text-green-700' : 'text-red-700'}>
                            {os?.codigo_os} - {os?.nome_cliente}
                            {temData && dataFormatada ? (
                              <span className="ml-2">✓ Data: {dataFormatada}</span>
                            ) : (
                              <span className="ml-2">⚠ Sem data agendada</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Sugestões de técnico (apenas para OS única) */}
                {ossSelecionadas.length === 1 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                      Sugestões baseadas em histórico
                    </Label>
                    <div className="space-y-2">
                      {obterSugestoesTecnico(ossSelecionadas[0]).map(sugestao => (
                        <div
                          key={sugestao.tecnico_id}
                          className="flex items-center justify-between p-2 bg-muted rounded-md"
                        >
                          <div>
                            <p className="text-sm font-medium">{sugestao.tecnico_nome}</p>
                            <p className="text-xs text-muted-foreground">{sugestao.motivo}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTecnicoSelecionado(sugestao.tecnico_id)}
                          >
                            Selecionar
                          </Button>
                        </div>
                      ))}
                      {obterSugestoesTecnico(ossSelecionadas[0]).length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma sugestão disponível
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDialogAberto(false);
                    setTecnicoSelecionado('');
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAtribuir}
                  disabled={!tecnicoSelecionado}
                >
                  Confirmar Atribuição
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setDialogBuscarClienteAberto(true)}
            title="Buscar cliente (nome ou telefone)"
            className="text-amber-700 border-amber-300 hover:bg-amber-50 hover:border-amber-400"
          >
            <Search className="w-4 h-4" />
          </Button>
          </div>
        </div>

        {/* Dialog Buscar cliente */}
        <Dialog
          open={dialogBuscarClienteAberto}
          onOpenChange={(open) => {
            setDialogBuscarClienteAberto(open);
            if (!open) {
              setBuscaTermo('');
              setBuscaResultados([]);
              setBuscaVerOutros(false);
              setBuscaExecutada(false);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Buscar cliente</DialogTitle>
              <DialogDescription>
                Busque por nome ou telefone para localizar o último serviço. Use &quot;Abrir nova OS&quot; para criar uma OS a partir do último atendimento ou &quot;Criar OS nova&quot; para formulário em branco.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap gap-2">
                <div className="flex rounded-md border p-1 gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setBuscaModo('nome')}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded transition-colors',
                      buscaModo === 'nome' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}
                  >
                    Nome
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuscaModo('telefone')}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded transition-colors',
                      buscaModo === 'telefone' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}
                  >
                    Telefone
                  </button>
                </div>
                <Input
                  placeholder={buscaModo === 'nome' ? 'Digite o nome do cliente...' : 'Digite o telefone...'}
                  value={buscaTermo}
                  onChange={(e) => setBuscaTermo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscarCliente()}
                  className="flex-1"
                />
                <Button onClick={handleBuscarCliente} disabled={!buscaTermo.trim()}>
                  Buscar
                </Button>
              </div>

              {buscaResultados.length === 0 && (
                <div className="rounded-lg border bg-muted/30 p-6 text-center">
                  {buscaExecutada ? (
                    <>
                      <p className="text-muted-foreground mb-4">Nenhum cliente encontrado.</p>
                      <Button onClick={handleCriarOSNovaDesdeBusca} variant="outline">
                        Criar OS nova
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Digite e busque para continuar.</p>
                  )}
                </div>
              )}

              {buscaResultados.length > 0 && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    {(() => {
                      const sel = buscaResultados[buscaIndiceSelecionado];
                      if (!sel) return null;
                      const os = sel.ultimaOS;
                      const dataStr = os.data_agendada
                        ? format(new Date(os.data_agendada + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                        : '—';
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">Último serviço</h4>
                            <span className="text-xs text-muted-foreground">{os.codigo_os} • {dataStr}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Cliente:</span>
                              <p className="font-medium">{os.nome_cliente}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tipo:</span>
                              <p className="font-medium">{os.tipo_servico || '—'}</p>
                            </div>
                            {(os.tecnico_nome || os.historico_tecnico) && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Último técnico:</span>
                                <p className="font-medium">{os.tecnico_nome || os.historico_tecnico}</p>
                              </div>
                            )}
                          </div>
                          <div className="border-t pt-3">
                            <span className="text-xs font-medium text-muted-foreground">Endereço para confirmar</span>
                            <p className="font-medium mt-1">{os.endereco}</p>
                            {(os.bairro || os.cidade) && (
                              <p className="text-sm text-muted-foreground">
                                {[os.bairro, os.cidade].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {buscaResultados.length > 1 && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setBuscaVerOutros((v) => !v)}
                        className="text-sm text-primary hover:underline"
                      >
                        {buscaVerOutros ? 'Ocultar outros' : `Ver outros (${buscaResultados.length - 1})`}
                      </button>
                      {buscaVerOutros && (
                        <div className="flex flex-wrap gap-2">
                          {buscaResultados.map((r, idx) => (
                            <button
                              key={r.codigo_cliente}
                              type="button"
                              onClick={() => {
                                setBuscaIndiceSelecionado(idx);
                                setBuscaVerOutros(false);
                              }}
                              className={cn(
                                'text-xs px-2 py-1 rounded border transition-colors',
                                idx === buscaIndiceSelecionado
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'hover:bg-muted'
                              )}
                            >
                              {r.nome_cliente}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleAbrirNovaOSDesdeBusca}>
                      Abrir nova OS
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Tabela de OSs */}
        {osFiltradas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma OS pendente</p>
            <p className="text-sm">
              {osPendentes.length === 0
                ? 'Importe OSs para começar a criar rotas'
                : 'Nenhuma OS encontrada com os filtros aplicados'}
            </p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-xs p-3 font-semibold text-gray-700">
                    <Checkbox
                      checked={ossSelecionadas.length === osFiltradas.length && osFiltradas.length > 0}
                      onCheckedChange={selecionarTodas}
                    />
                  </TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Código OS</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Cliente</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Telefone</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Endereço</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Bairro/Cidade</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Tipo Serviço</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Razão</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">PER</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">PRI</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Valor</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Data Agendada</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Hist. de Técnico</TableHead>
                  <TableHead className="text-xs p-3 font-semibold text-gray-700">Hist. de Status</TableHead>
                  <TableHead className="w-20 text-center text-xs p-3 font-semibold text-gray-700">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {osFiltradas.map(os => {
                  const ehGrupo = fazParteDeGrupo(os.id);
                  const qtdGrupo = quantidadeNoGrupo(os.id);
                  
                  return (
                  <TableRow 
                    key={os.id}
                    className={cn(
                      "cursor-pointer hover:bg-yellow-50/50",
                      ehGrupo && "border-l-4 border-l-blue-500 bg-blue-50/30"
                    )}
                    onClick={() => {
                      setOsDetalhes(os);
                      setModalDetalhesAberto(true);
                    }}
                  >
                    <TableCell 
                      className="text-xs p-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={ossSelecionadas.includes(os.id)}
                        onCheckedChange={() => toggleSelecionarOS(os.id)}
                      />
                    </TableCell>
                    <TableCell className="text-xs p-3 font-semibold text-gray-900">{os.codigo_os}</TableCell>
                    <TableCell className="text-xs p-3">{os.nome_cliente}</TableCell>
                    <TableCell className="text-xs p-3">{os.telefone || '-'}</TableCell>
                    <TableCell className="text-xs p-3 max-w-[200px] truncate">{os.endereco}</TableCell>
                    <TableCell className="text-xs p-3">
                      <div className="flex flex-col gap-1">
                        <span>{os.bairro}</span>
                        <span className="text-muted-foreground">{os.cidade}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs p-3">
                      <div className="flex items-center gap-2">
                        {os.tipo_servico ? (
                          <Badge 
                            variant="outline"
                            className={
                              os.tipo_servico === 'Instalação'
                                ? 'bg-green-50 text-green-700 border-green-300'
                                : 'bg-blue-50 text-blue-700 border-blue-300'
                            }
                            title={os.tipo_servico}
                          >
                            {os.tipo_servico === 'Instalação'
                              ? 'INS'
                              : os.tipo_servico === 'Assistência Técnica'
                              ? 'AT'
                              : os.tipo_servico === 'Retirada'
                              ? 'RET'
                              : os.tipo_servico}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {ehGrupo && (
                          <Badge 
                            variant="outline"
                            className="bg-purple-50 text-purple-700 border-purple-300 flex items-center gap-1"
                            title={`Esta OS faz parte de um grupo de ${qtdGrupo} serviço(s) para o mesmo cliente`}
                          >
                            <Link2 className="h-3 w-3" />
                            <span className="text-[10px]">{qtdGrupo}</span>
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs p-3 max-w-[200px] truncate" title={os.motivo || ''}>
                      {os.motivo || '-'}
                    </TableCell>
                    <TableCell className="text-xs p-3">
                      {os.periodo ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700" title={os.periodo}>
                          {os.periodo === 'Manhã' ? 'M' : os.periodo === 'Tarde' ? 'T' : os.periodo}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs p-3">
                      {os.prioridade ? (
                        <Badge 
                          variant="outline" 
                          className={os.prioridade === 'Alta' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}
                          title={os.prioridade}
                        >
                          {os.prioridade === 'Alta' ? 'A' : os.prioridade === 'Média' ? 'M' : os.prioridade}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs p-3">
                      {os.servico_cobrado && os.valor ? (
                        <span className="text-green-700">
                          {os.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell 
                      className="text-xs p-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {popoverDataAberto === os.id ? (
                        <Popover open={true} onOpenChange={(open) => {
                          if (!open) {
                            setPopoverDataAberto(null);
                          }
                        }}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-32 justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {os.data_agendada ? (() => {
                                // Parsear a data sem problemas de timezone
                                const [ano, mes, dia] = os.data_agendada.split('-');
                                if (ano && mes && dia) {
                                  return `${dia}/${mes}/${ano}`;
                                }
                                return 'Selecione';
                              })() : 'Selecione'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <div className="space-y-2">
                              <Calendar
                                mode="single"
                                selected={os.data_agendada ? (() => {
                                  // Parsear a data sem problemas de timezone
                                  const [ano, mes, dia] = os.data_agendada.split('-');
                                  if (ano && mes && dia) {
                                    return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
                                  }
                                  return undefined;
                                })() : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    // Criar string de data sem problemas de timezone
                                    const ano = date.getFullYear();
                                    const mes = String(date.getMonth() + 1).padStart(2, '0');
                                    const dia = String(date.getDate()).padStart(2, '0');
                                    const dataFormatada = `${ano}-${mes}-${dia}`;
                                    
                                    // Se há OSs selecionadas, aplicar a todas
                                    if (ossSelecionadas.length > 0 && ossSelecionadas.includes(os.id)) {
                                      ossSelecionadas.forEach(osId => {
                                        atualizarOS(osId, { data_agendada: dataFormatada });
                                      });
                                      setPopoverDataAberto(null);
                                      toast({
                                        title: 'Data atualizada',
                                        description: `Data agendada atualizada para ${ossSelecionadas.length} OS(s) selecionada(s).`,
                                      });
                                    } else {
                                      // Aplicar apenas à OS atual
                                      atualizarOS(os.id, { data_agendada: dataFormatada });
                                      setPopoverDataAberto(null);
                                      toast({
                                        title: 'Data atualizada',
                                        description: 'Data agendada foi atualizada com sucesso.',
                                      });
                                    }
                                  }
                                }}
                                initialFocus
                                locale={ptBR}
                              />
                              {os.data_agendada && (
                                <div className="p-2 border-t">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                      // Se há OSs selecionadas, aplicar a todas
                                      if (ossSelecionadas.length > 0 && ossSelecionadas.includes(os.id)) {
                                        ossSelecionadas.forEach(osId => {
                                          atualizarOS(osId, { data_agendada: '' });
                                        });
                                        setPopoverDataAberto(null);
                                        toast({
                                          title: 'Data removida',
                                          description: `Data agendada removida de ${ossSelecionadas.length} OS(s) selecionada(s).`,
                                        });
                                      } else {
                                        // Aplicar apenas à OS atual
                                        atualizarOS(os.id, { data_agendada: '' });
                                        setPopoverDataAberto(null);
                                        toast({
                                          title: 'Data removida',
                                          description: 'Data agendada foi removida.',
                                        });
                                      }
                                    }}
                                  >
                                    Limpar Data
                                  </Button>
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>
                            {os.data_agendada ? (() => {
                              // Parsear a data sem problemas de timezone
                              const [ano, mes, dia] = os.data_agendada.split('-');
                              if (ano && mes && dia) {
                                return `${dia}/${mes}/${ano}`;
                              }
                              return '-';
                            })() : '-'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setPopoverDataAberto(os.id)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs p-3">
                      {os.historico_tecnico ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {os.historico_tecnico}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs p-3">
                      {os.historico_status ? (
                        <Badge 
                          variant="outline" 
                          className={
                            os.historico_status === 'finalizada' 
                              ? 'bg-green-50 text-green-700 border-green-300'
                              : os.historico_status === 'cancelada'
                              ? 'bg-red-50 text-red-700 border-red-300'
                              : os.historico_status === 'reagendada'
                              ? 'bg-purple-50 text-purple-700 border-purple-300'
                              : 'bg-gray-50 text-gray-700 border-gray-300'
                          }
                        >
                          {os.historico_status === 'finalizada' ? 'Finalizada' :
                           os.historico_status === 'cancelada' ? 'Cancelada' :
                           os.historico_status === 'reagendada' ? 'Reagendada' :
                           os.historico_status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell 
                      className="text-center text-xs p-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleAbrirModalEdicao(os.id)}
                          title="Editar informações"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {os.telefone ? (
                          <a
                            href={gerarLinkWhatsApp(os.telefone, gerarMensagemAgendamento(os))}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 border-green-500 hover:border-green-600 transition-colors"
                              title="Enviar mensagem WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4 text-white" />
                            </Button>
                          </a>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-50 cursor-not-allowed"
                            disabled
                            title="Telefone não disponível"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Modal de Edição */}
      <Dialog open={modalEdicaoAberto} onOpenChange={setModalEdicaoAberto}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {ossSelecionadas.length > 1 && ossSelecionadas.includes(osEditandoModal || '')
                ? `Editar OSs: ${ossSelecionadas
                    .map(id => osFiltradas.find(o => o.id === id)?.codigo_os)
                    .filter(Boolean)
                    .join(', ')}`
                : `Editar OS: ${osEditandoModal ? osFiltradas.find(o => o.id === osEditandoModal)?.codigo_os : ''}`}
            </DialogTitle>
            <DialogDescription>
              {ossSelecionadas.length > 0 && ossSelecionadas.includes(osEditandoModal || '') 
                ? `Alterações serão aplicadas a ${ossSelecionadas.length} OS(s) selecionada(s).`
                : 'Edite as informações da ordem de serviço.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Tipo de Serviço */}
            <div className="space-y-2">
              <Label htmlFor="tipoServico">Tipo de Serviço</Label>
              <Select value={tipoServicoEditado} onValueChange={setTipoServicoEditado}>
                <SelectTrigger id="tipoServico">
                  <SelectValue placeholder="Selecione o tipo de serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Assistência Técnica">Assistência Técnica</SelectItem>
                  <SelectItem value="Instalação">Instalação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Período */}
            <div className="space-y-2">
              <Label htmlFor="periodo">Período</Label>
              <Select value={periodoEditado} onValueChange={setPeriodoEditado}>
                <SelectTrigger id="periodo">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__limpar__">Limpar</SelectItem>
                  <SelectItem value="Manhã">Manhã</SelectItem>
                  <SelectItem value="Tarde">Tarde</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Prioridade */}
            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select value={prioridadeEditada} onValueChange={setPrioridadeEditada}>
                <SelectTrigger id="prioridade">
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__limpar__">Limpar</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="servicoCobrado"
                  checked={servicoCobradoEditado}
                  onCheckedChange={(checked) => {
                    setServicoCobradoEditado(checked as boolean);
                    if (!checked) {
                      setValorEditado('');
                    }
                  }}
                />
                <Label htmlFor="servicoCobrado" className="cursor-pointer">
                  Serviço Cobrado
                </Label>
              </div>
              {servicoCobradoEditado && (
                <div className="space-y-2">
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input
                    id="valor"
                    type="text"
                    value={valorEditado}
                    onChange={(e) => {
                      const formatado = formatarValor(e.target.value);
                      setValorEditado(formatado);
                    }}
                    placeholder="0,00"
                    className="font-mono"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalEdicaoAberto(false);
                setOsEditandoModal(null);
                setTipoServicoEditado('');
                setPeriodoEditado('');
                setPrioridadeEditada('');
                setValorEditado('');
                setServicoCobradoEditado(false);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvarEdicaoModal}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes da OS */}
      <Dialog open={modalDetalhesAberto} onOpenChange={(open) => {
        setModalDetalhesAberto(open);
        if (!open) {
          setOsDetalhes(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header com fundo amarelo */}
          <div className="bg-yellow-500 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  Detalhe OS - {osDetalhes?.codigo_os}
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  Visualize as informações da ordem de serviço
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {osDetalhes && (
              <Tabs defaultValue="info" className="w-full">
                <TabsList className={cn(
                  "grid w-full mb-6",
                  (() => {
                    const temFinalizacao = !!(osDetalhes.historico_status || osDetalhes.historico_tecnico);
                    const temHistorico = historicoCliente.length > 0;
                    const cols = 2 + (temFinalizacao ? 1 : 0) + (temHistorico ? 1 : 0);
                    return cols === 4 ? 'grid-cols-4' : cols === 3 ? 'grid-cols-3' : 'grid-cols-2';
                  })()
                )}>
                  <TabsTrigger value="info">Info. da Conta</TabsTrigger>
                  <TabsTrigger value="servico">Dados da OS</TabsTrigger>
                  {(osDetalhes.historico_status || osDetalhes.historico_tecnico) && (
                    <TabsTrigger value="finalizacao">Finalização</TabsTrigger>
                  )}
                  {historicoCliente.length > 0 && (
                    <TabsTrigger value="historico">Histórico</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="info" className="space-y-6">
                  {/* Informações do Cliente */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Assinante</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Assinante:</span>
                        <p className="text-gray-900 mt-1">{osDetalhes.nome_cliente}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Código Cliente:</span>
                        <p className="text-gray-900 mt-1">{osDetalhes.codigo_cliente || '-'}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Tel. Cel.:</span>
                        <p className="text-gray-900 mt-1">{osDetalhes.telefone || '-'}</p>
                      </div>
                      {osDetalhes.telefone_comercial && (
                        <div>
                          <span className="font-semibold text-gray-700">Tel. Com.:</span>
                          <p className="text-gray-900 mt-1">{osDetalhes.telefone_comercial}</p>
                        </div>
                      )}
                      {osDetalhes.telefone_residencial && (
                        <div>
                          <span className="font-semibold text-gray-700">Tel. Res.:</span>
                          <p className="text-gray-900 mt-1">{osDetalhes.telefone_residencial}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informações de Endereço */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Endereço</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="col-span-2">
                        <span className="font-semibold text-gray-700">End.:</span>
                        <p className="text-gray-900 mt-1">{osDetalhes.endereco}</p>
                      </div>
                      {osDetalhes.complemento && (
                        <div>
                          <span className="font-semibold text-gray-700">Complemento:</span>
                          <p className="text-gray-900 mt-1">{osDetalhes.complemento}</p>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-gray-700">Bairro:</span>
                        <p className="text-gray-900 mt-1">{osDetalhes.bairro}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Cidade:</span>
                        <p className="text-gray-900 mt-1">{osDetalhes.cidade}</p>
                      </div>
                      {osDetalhes.cep && (
                        <div>
                          <span className="font-semibold text-gray-700">CEP:</span>
                          <p className="text-gray-900 mt-1">{osDetalhes.cep}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="servico" className="space-y-6">
                  {/* Informações do Serviço */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Informações do Serviço</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Tipo de Serviço:</span>
                        <p className="text-gray-900 mt-1">{osDetalhes.tipo_servico}</p>
                      </div>
                      {osDetalhes.subtipo_servico && (
                        <div>
                          <span className="font-semibold text-gray-700">SubTipo:</span>
                          <p className="text-gray-900 mt-1">{osDetalhes.subtipo_servico}</p>
                        </div>
                      )}
                      {osDetalhes.motivo && (
                        <div>
                          <span className="font-semibold text-gray-700">Razão:</span>
                          <p className="text-gray-900 mt-1">{osDetalhes.motivo}</p>
                        </div>
                      )}
                      {osDetalhes.pacote && (
                        <div>
                          <span className="font-semibold text-gray-700">Pacote:</span>
                          <p className="text-gray-900 mt-1">{osDetalhes.pacote}</p>
                        </div>
                      )}
                      {osDetalhes.codigo_item && (
                        <div>
                          <span className="font-semibold text-gray-700">Código Item:</span>
                          <p className="text-gray-900 mt-1">{osDetalhes.codigo_item}</p>
                        </div>
                      )}
                      {osDetalhes.acao_tomada && (
                        <div className="col-span-2">
                          <span className="font-semibold text-gray-700">Ação tomada:</span>
                          <p className="text-gray-900 mt-1">{osDetalhes.acao_tomada}</p>
                        </div>
                      )}
                      {osDetalhes.periodo && (
                        <div>
                          <span className="font-semibold text-gray-700">Período:</span>
                          <p className="text-gray-900 mt-1">{osDetalhes.periodo}</p>
                        </div>
                      )}
                      {osDetalhes.prioridade && (
                        <div>
                          <span className="font-semibold text-gray-700">Prioridade:</span>
                          <p className="text-gray-900 mt-1">{osDetalhes.prioridade}</p>
                        </div>
                      )}
                      {osDetalhes.servico_cobrado && osDetalhes.valor && (
                        <div>
                          <span className="font-semibold text-gray-700">Valor:</span>
                          <p className="text-gray-900 mt-1">
                            R$ {osDetalhes.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {osDetalhes.sigla_tecnico && (
                        <div>
                          <span className="font-semibold text-gray-700">Sigla Técnico:</span>
                          <p className="text-gray-900 mt-1">{osDetalhes.sigla_tecnico}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seção adicional para manter altura igual à tab Info. da Conta */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Informações Adicionais</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Status Atual:</span>
                        <p className="text-gray-900 mt-1">
                          {osDetalhes.status === 'pendente' ? 'Aguardando' :
                           osDetalhes.status === 'atribuida' ? 'Atribuída' :
                           osDetalhes.status === 'em_andamento' ? 'Em Andamento' :
                           osDetalhes.status === 'finalizada' ? 'Finalizada' :
                           osDetalhes.status === 'reagendada' ? 'Reagendada' :
                           osDetalhes.status === 'cancelada' ? 'Cancelada' : osDetalhes.status}
                        </p>
                      </div>
                      {osDetalhes.data_agendada && (
                        <div>
                          <span className="font-semibold text-gray-700">Data Agendada:</span>
                          <p className="text-gray-900 mt-1">
                            {(() => {
                              const [ano, mes, dia] = osDetalhes.data_agendada.split('-');
                              return ano && mes && dia ? `${dia}/${mes}/${ano}` : osDetalhes.data_agendada;
                            })()}
                          </p>
                        </div>
                      )}
                      {osDetalhes.historico_tecnico && (
                        <div>
                          <span className="font-semibold text-gray-700">Hist. de Técnico:</span>
                          <p className="text-gray-900 mt-1">{osDetalhes.historico_tecnico}</p>
                        </div>
                      )}
                      {osDetalhes.historico_status && (
                        <div>
                          <span className="font-semibold text-gray-700">Hist. de Status:</span>
                          <p className="text-gray-900 mt-1">
                            {osDetalhes.historico_status === 'finalizada' ? 'Finalizada' :
                             osDetalhes.historico_status === 'cancelada' ? 'Cancelada' :
                             osDetalhes.historico_status === 'reagendada' ? 'Reagendada' :
                             osDetalhes.historico_status}
                          </p>
                        </div>
                      )}
                      {osDetalhes.observacoes && (
                        <div className="col-span-2">
                          <span className="font-semibold text-gray-700">Observações:</span>
                          <p className="text-gray-900 mt-1 whitespace-pre-wrap">{osDetalhes.observacoes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Guia Finalização - só aparece se tiver histórico */}
                {(osDetalhes.historico_status || osDetalhes.historico_tecnico) && (
                  <TabsContent value="finalizacao" className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Histórico de Finalização</h3>
                      <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800 border border-yellow-200">
                        <p className="font-medium mb-2">Esta OS possui histórico de execução anterior.</p>
                        <p className="text-yellow-700">As informações abaixo são apenas para visualização.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {osDetalhes.historico_status && (
                          <div>
                            <span className="font-semibold text-gray-700">Status Anterior:</span>
                            <p className="text-gray-900 mt-1">
                              {osDetalhes.historico_status === 'finalizada' ? 'Finalizada' :
                               osDetalhes.historico_status === 'cancelada' ? 'Cancelada' :
                               osDetalhes.historico_status === 'reagendada' ? 'Reagendada' :
                               osDetalhes.historico_status}
                            </p>
                          </div>
                        )}
                        {osDetalhes.historico_tecnico && (
                          <div>
                            <span className="font-semibold text-gray-700">Técnico Anterior:</span>
                            <p className="text-gray-900 mt-1">{osDetalhes.historico_tecnico}</p>
                          </div>
                        )}
                        {osDetalhes.registro_tempo?.chegada && (
                          <div>
                            <span className="font-semibold text-gray-700">Horário de Entrada:</span>
                            <p className="text-gray-900 mt-1">{osDetalhes.registro_tempo.chegada}</p>
                          </div>
                        )}
                        {osDetalhes.registro_tempo?.saida && (
                          <div>
                            <span className="font-semibold text-gray-700">Horário de Saída:</span>
                            <p className="text-gray-900 mt-1">{osDetalhes.registro_tempo.saida}</p>
                          </div>
                        )}
                        {osDetalhes.servico_cobrado && osDetalhes.valor && (
                          <div>
                            <span className="font-semibold text-gray-700">Valor Cobrado:</span>
                            <p className="text-gray-900 mt-1">
                              R$ {osDetalhes.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                        {osDetalhes.servico_pago !== undefined && (
                          <div>
                            <span className="font-semibold text-gray-700">Serviço Pago:</span>
                            <p className="text-gray-900 mt-1">{osDetalhes.servico_pago ? 'Sim' : 'Não'}</p>
                          </div>
                        )}
                        {osDetalhes.valor_pago && (
                          <div>
                            <span className="font-semibold text-gray-700">Valor Pago:</span>
                            <p className="text-gray-900 mt-1">
                              R$ {osDetalhes.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                        {osDetalhes.forma_pagamento && (
                          <div>
                            <span className="font-semibold text-gray-700">Forma de Pagamento:</span>
                            <p className="text-gray-900 mt-1">{osDetalhes.forma_pagamento}</p>
                          </div>
                        )}
                        {osDetalhes.data_finalizacao && (
                          <div>
                            <span className="font-semibold text-gray-700">Data de Finalização:</span>
                            <p className="text-gray-900 mt-1">
                              {(() => {
                                try {
                                  const data = new Date(osDetalhes.data_finalizacao);
                                  return format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                                } catch {
                                  return osDetalhes.data_finalizacao;
                                }
                              })()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Extrair e mostrar motivos das observações */}
                      {osDetalhes.observacoes && (
                        <div className="space-y-2 border-t pt-4">
                          {osDetalhes.observacoes.includes('Motivo do cancelamento:') && (
                            <div>
                              <Label className="font-semibold text-gray-700">Motivo do Cancelamento:</Label>
                              <p className="text-gray-900 mt-1">
                                {osDetalhes.observacoes
                                  .split('Motivo do cancelamento:')[1]
                                  ?.split('\n')[0]
                                  ?.trim() || 'Não informado'}
                              </p>
                            </div>
                          )}
                          {osDetalhes.observacoes.includes('Motivo do reagendamento:') && (
                            <div>
                              <Label className="font-semibold text-gray-700">Motivo do Reagendamento:</Label>
                              <p className="text-gray-900 mt-1">
                                {osDetalhes.observacoes
                                  .split('Motivo do reagendamento:')[1]
                                  ?.split('\n')[0]
                                  ?.trim() || 'Não informado'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )}

                {historicoCliente.length > 0 && (
                  <TabsContent value="historico" className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Histórico do cliente</h3>
                    <p className="text-sm text-muted-foreground">
                      OSs anteriores do mesmo cliente (data anterior à desta OS).
                    </p>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs py-2 px-2">OS</TableHead>
                            <TableHead className="text-xs py-2 px-2">Data</TableHead>
                            <TableHead className="text-xs py-2 px-2">Tipo</TableHead>
                            <TableHead className="text-xs py-2 px-2">Status</TableHead>
                            <TableHead className="text-xs py-2 px-2">Técnico</TableHead>
                            <TableHead className="text-xs py-2 px-2">Motivo</TableHead>
                            <TableHead className="text-xs py-2 px-2">Endereço</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historicoCliente.map((os) => {
                            const statusLabels: Record<string, string> = {
                              pendente: 'Aguardando',
                              atribuida: 'Aguardando',
                              em_andamento: 'Em andamento',
                              pre_finalizada: 'Em andamento',
                              finalizada: 'Finalizada',
                              reagendada: 'Reagendada',
                              cancelada: 'Cancelada',
                            };
                            const statusColors: Record<string, string> = {
                              pendente: 'bg-gray-100 text-gray-700 border-gray-300',
                              atribuida: 'bg-gray-100 text-gray-700 border-gray-300',
                              em_andamento: 'bg-blue-100 text-blue-700 border-blue-300',
                              pre_finalizada: 'bg-blue-100 text-blue-700 border-blue-300',
                              finalizada: 'bg-green-100 text-green-700 border-green-300',
                              reagendada: 'bg-purple-100 text-purple-700 border-purple-300',
                              cancelada: 'bg-red-100 text-red-700 border-red-300',
                            };
                            const label = statusLabels[os.status] ?? os.status;
                            const badgeClass = statusColors[os.status] ?? 'bg-gray-100 text-gray-700 border-gray-300';
                            const dataStr = os.data_agendada
                              ? format(new Date(os.data_agendada + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                              : '—';
                            const tecnico = os.tecnico_nome || os.historico_tecnico || '—';
                            const motivo = os.status === 'reagendada'
                              ? extrairMotivoDasObservacoes(os.observacoes, 'reagendamento')
                              : os.status === 'cancelada'
                                ? extrairMotivoDasObservacoes(os.observacoes, 'cancelamento')
                                : '—';
                            return (
                              <TableRow key={os.id}>
                                <TableCell className="text-xs py-2 px-2 font-medium">{os.codigo_os}</TableCell>
                                <TableCell className="text-xs py-2 px-2 tabular-nums">{dataStr}</TableCell>
                                <TableCell className="text-xs py-2 px-2">{os.tipo_servico || '—'}</TableCell>
                                <TableCell className="text-xs py-2 px-2">
                                  <Badge variant="outline" className={cn('text-[11px] py-0 px-1.5', badgeClass)}>
                                    {label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs py-2 px-2">{tecnico}</TableCell>
                                <TableCell className="text-xs py-2 px-2 text-muted-foreground max-w-[180px] truncate" title={motivo !== '—' ? motivo : undefined}>
                                  {motivo}
                                </TableCell>
                                <TableCell className="text-xs py-2 px-2 text-muted-foreground max-w-[200px] truncate" title={os.endereco}>
                                  {os.endereco || '—'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50">
            <Button variant="outline" onClick={() => setModalDetalhesAberto(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
