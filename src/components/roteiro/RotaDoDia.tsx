import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
import { useAuth } from '@/context/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MapPin, 
  Calendar as CalendarIcon, 
  Clock, 
  Package, 
  Car, 
  CheckCircle2, 
  Circle, 
  XCircle,
  RefreshCw,
  User,
  Menu,
  Trash2,
  ArrowRightLeft,
  ArrowLeft,
  ListOrdered,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RotaOS, StatusRotaOS } from '@/types';
import { cn } from '@/lib/utils';
import { obterHistoricoCliente, extrairMotivoDasObservacoes } from '@/lib/roteiroHistorico';

export function RotaDoDia() {
  const { osRotas, tecnicos, atualizarOS, buscarOSPorTecnico, removerOS, removerAtribuicao, atribuirTecnico, obterMediaTempoPorTipo, atualizarMediaTempo, recarregarDados, ultimaAtualizacao } = useRotas();
  const { authExtras } = useAuth();
  const { toast } = useToast();
  const isTecnico = authExtras?.papelCodigo === 'tecnico' && !!authExtras?.equipeId;
  const equipeId = authExtras?.equipeId ?? null;
  const osRotasRoteiro = isTecnico && equipeId ? osRotas.filter((os) => os.tecnico_id === equipeId) : osRotas;
  const tecnicosRoteiro = isTecnico && equipeId ? tecnicos.filter((t) => t.id === equipeId) : tecnicos;

  // Estado para controlar o loading do refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Função para fazer refresh dos dados
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await recarregarDados();
      toast({
        title: 'Dados atualizados',
        description: 'As informações do roteiro foram atualizadas.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar os dados. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [recarregarDados, toast]);

  // Formatar hora da última atualização
  const formatarUltimaAtualizacao = useCallback(() => {
    if (!ultimaAtualizacao) return 'Nunca';
    return ultimaAtualizacao.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [ultimaAtualizacao]);

  const [tecnicoSelecionado, setTecnicoSelecionado] = useState<string>('');
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [popoverCalendarioAberto, setPopoverCalendarioAberto] = useState(false);
  const [osSelecionada, setOsSelecionada] = useState<RotaOS | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [statusEditado, setStatusEditado] = useState<StatusRotaOS>('pendente');
  const [statusEmAndamento, setStatusEmAndamento] = useState(false);
  const [statusFinalizada, setStatusFinalizada] = useState(false);
  const [statusReagendada, setStatusReagendada] = useState(false);
  const [statusCancelada, setStatusCancelada] = useState(false);
  const [horarioEntrada, setHorarioEntrada] = useState('');
  const [horarioSaida, setHorarioSaida] = useState('');
  const [observacoesEditado, setObservacoesEditado] = useState('');
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [motivoReagendamento, setMotivoReagendamento] = useState('');
  const [servicoPago, setServicoPago] = useState(false);
  const [valorPago, setValorPago] = useState<number | undefined>(undefined);
  const [formaPagamento, setFormaPagamento] = useState<string>('');
  const [dialogTransferirAberto, setDialogTransferirAberto] = useState(false);
  const [tecnicoTransferir, setTecnicoTransferir] = useState<string>('');
  const [modoEdicaoOrdem, setModoEdicaoOrdem] = useState(false);
  const [ordemTemporaria, setOrdemTemporaria] = useState<Record<string, number>>({});
  const [filtroTecnicoId, setFiltroTecnicoId] = useState<string>('__todos__');

  const historicoCliente = useMemo(() => {
    if (!osSelecionada?.codigo_cliente) return [];
    const dataRef = osSelecionada.data_agendada || format(new Date(), 'yyyy-MM-dd');
    return obterHistoricoCliente(osRotas, osSelecionada.codigo_cliente, dataRef);
  }, [osRotas, osSelecionada?.codigo_cliente, osSelecionada?.data_agendada]);

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

  // Função para extrair motivo das observações (busca sempre o mais recente)
  const extrairMotivoDasObservacoes = (observacoes: string | undefined, tipo: 'cancelamento' | 'reagendamento'): string => {
    if (!observacoes) return 'Não informado';
    
    const prefixo = tipo === 'cancelamento' ? 'Motivo do cancelamento:' : 'Motivo do reagendamento:';
    
    // Buscar a última ocorrência do prefixo (motivo mais recente)
    const indice = observacoes.lastIndexOf(prefixo);
    
    if (indice === -1) return 'Não informado';
    
    // Extrair o texto após a última ocorrência do prefixo
    const textoAposPrefixo = observacoes.substring(indice + prefixo.length).trim();
    
    // Pegar apenas a primeira linha do motivo (até a próxima quebra de linha ou fim do texto)
    // Se houver outro prefixo na frente, parar antes dele
    const proximoPrefixo = tipo === 'cancelamento' ? 'Motivo do reagendamento:' : 'Motivo do cancelamento:';
    const indiceProximoPrefixo = textoAposPrefixo.indexOf(proximoPrefixo);
    
    if (indiceProximoPrefixo !== -1) {
      // Se encontrou outro tipo de motivo, pegar apenas até ele
      const motivo = textoAposPrefixo.substring(0, indiceProximoPrefixo).trim();
      return motivo.split('\n')[0].trim() || 'Não informado';
    }
    
    // Caso contrário, pegar apenas a primeira linha
    return textoAposPrefixo.split('\n')[0].trim() || 'Não informado';
  };

  // Função para gerar mensagem por status
  const gerarMensagemPorStatus = (os: RotaOS): string => {
    const assinante = os.nome_cliente || 'Cliente';
    const endereco = os.endereco || 'Não informado';
    const tipoServico = os.tipo_servico || '';
    const razao = os.motivo || '';
    const valor = os.valor;

    if (os.status === 'cancelada') {
      const motivoCancelamento = extrairMotivoDasObservacoes(os.observacoes, 'cancelamento');
      
      // Montar linhas de detalhes dinamicamente
      const linhasDetalhes = [
        `* Assinante: ${assinante.toUpperCase()}`,
        `* Endereço: ${endereco.toUpperCase()}`,
        tipoServico ? `* Tipo de serviço: ${tipoServico}` : null,
        razao ? `* Razão: ${razao}` : null,
        valor ? `* Valor: ${formatarValorParaMensagem(valor)}` : null,
      ].filter(Boolean);
      
      return `Olá, ${assinante.toUpperCase()}.

Estamos entrando em contato para informar sobre o cancelamento do serviço.

📋 Detalhes do serviço:
${linhasDetalhes.join('\n')}

❌ Motivo do cancelamento:
${motivoCancelamento}

Caso tenha qualquer dúvida ou queira reagendar, estamos à disposição.`;
    }

    if (os.status === 'reagendada') {
      const motivoReagendamento = extrairMotivoDasObservacoes(os.observacoes, 'reagendamento');
      
      // Montar linhas de detalhes dinamicamente
      const linhasDetalhes = [
        `* Assinante: ${assinante.toUpperCase()}`,
        `* Endereço: ${endereco.toUpperCase()}`,
        tipoServico ? `* Tipo de serviço: ${tipoServico}` : null,
        razao ? `* Razão: ${razao}` : null,
        valor ? `* Valor: ${formatarValorParaMensagem(valor)}` : null,
      ].filter(Boolean);
      
      return `Olá, ${assinante.toUpperCase()}! 👋

Seu serviço foi reagendado conforme alinhado.

📋 Detalhes do serviço:
${linhasDetalhes.join('\n')}

🔄 Motivo do reagendamento:
${motivoReagendamento}

Em breve entraremos em contato para confirmar a nova data e horário.`;
    }

    if (os.status === 'finalizada') {
      const nomeTecnico = os.tecnico_nome || 'Não informado';
      const horarioEntrada = os.registro_tempo?.chegada || 'Não informado';
      const horarioSaida = os.registro_tempo?.saida || 'Não informado';
      
      // Montar linhas de detalhes dinamicamente
      const linhasDetalhes = [
        `* Assinante: ${assinante.toUpperCase()}`,
        `* Endereço: ${endereco.toUpperCase()}`,
        tipoServico ? `* Tipo de serviço: ${tipoServico}` : null,
        razao ? `* Razão: ${razao}` : null,
        valor ? `* Valor: ${formatarValorParaMensagem(valor)}` : null,
      ].filter(Boolean);
      
      return `Olá, ${assinante.toUpperCase()}! 😊

Seu serviço foi finalizado com sucesso. Agradecemos pela confiança!

📋 Resumo do atendimento:
${linhasDetalhes.join('\n')}

👨‍🔧 Técnico responsável: ${nomeTecnico.toUpperCase()}
⏰ Entrada: ${horarioEntrada}
⏰ Saída: ${horarioSaida}

Gostaríamos muito de saber:
👉 Você ficou satisfeito com o serviço realizado?
👉 O Técnico usou a ANTENA e o LNB novos?
(LNB é a peça que fica na ponta da antena)

Seu feedback é muito importante para nós. Obrigado! 🙏`;
    }

    // Mensagem padrão para outros status (pendente, em_andamento)
    const linhasDetalhes = [
      `* Assinante: ${assinante.toUpperCase()}`,
      `* Endereço: ${endereco.toUpperCase()}`,
      tipoServico ? `* Tipo de serviço: ${tipoServico}` : null,
      razao ? `* Razão: ${razao}` : null,
      valor ? `* Valor: ${formatarValorParaMensagem(valor)}` : null,
    ].filter(Boolean);

    return `Olá, ${assinante.toUpperCase()}! 👋

Somos da equipe técnica e estamos entrando em contato sobre o seu serviço.

📋 Detalhes do serviço:
${linhasDetalhes.join('\n')}

Em breve entraremos em contato para mais informações.`;
  };

  // Calcular resumo por técnico para a data selecionada
  const resumosPorTecnico = useMemo(() => {
    if (!dataSelecionada) return [];
    
    const dataStr = format(dataSelecionada, 'yyyy-MM-dd');
    
    // Agrupar OSs por técnico
    const ossPorTecnico = new Map<string, RotaOS[]>();
    
    osRotasRoteiro.forEach((os) => {
      if (!os.data_agendada || !os.tecnico_id) return;
      const osData = os.data_agendada.split('T')[0];
      if (osData !== dataStr || os.status === 'pendente') return;
      if (!ossPorTecnico.has(os.tecnico_id)) ossPorTecnico.set(os.tecnico_id, []);
      ossPorTecnico.get(os.tecnico_id)!.push(os);
    });

    return Array.from(ossPorTecnico.entries()).map(([tecnicoId, oss]) => {
      const tecnico = tecnicosRoteiro.find((t) => t.id === tecnicoId);
      const tiposServico = [...new Set(oss.map(os => os.tipo_servico).filter(Boolean))];
      const prioridades = [...new Set(oss.map(os => os.prioridade).filter(Boolean))];
      
      // Contar status
      const statusCount: Record<StatusRotaOS, number> = {
        pendente: 0,
        atribuida: 0,
        em_andamento: 0,
        pre_finalizada: 0,
        finalizada: 0,
        reagendada: 0,
        cancelada: 0,
      };
      
      oss.forEach(os => {
        statusCount[os.status] = (statusCount[os.status] || 0) + 1;
      });

    return {
        tecnicoId,
        tecnicoNome: tecnico?.nome || 'Técnico não encontrado',
        quantidadeOS: oss.length,
        tiposServico,
        prioridades,
        statusCount,
        oss,
      };
    }).sort((a, b) => a.tecnicoNome.localeCompare(b.tecnicoNome));
  }, [dataSelecionada, osRotasRoteiro, tecnicosRoteiro]);

  // Filtrar por técnico selecionado na listagem (apenas técnicos com rota atribuída)
  const resumosFiltrados = useMemo(() => {
    if (!filtroTecnicoId || filtroTecnicoId === '__todos__') return resumosPorTecnico;
    return resumosPorTecnico.filter((r) => r.tecnicoId === filtroTecnicoId);
  }, [resumosPorTecnico, filtroTecnicoId]);

  // Calcular resumo geral agregado de todos os técnicos filtrados
  const resumoGeral = useMemo(() => {
    if (resumosFiltrados.length === 0) {
      return {
        totalOSs: 0,
        motivosContagem: [] as Array<{ motivo: string; quantidade: number }>,
        prioridades: { Alta: 0, Média: 0, Baixa: 0 },
        status: {
          Aguardando: 0,
          'Em Andamento': 0,
          Finalizado: 0,
          Reagendada: 0,
          Cancelada: 0
        },
        totalAReceber: 0,
        totalRecebido: 0
      };
    }

    let totalOSs = 0;
    const motivosMap = new Map<string, number>();
    const prioridades = { Alta: 0, Média: 0, Baixa: 0 };
    const status = {
      Aguardando: 0,
      'Em Andamento': 0,
      Finalizado: 0,
      Reagendada: 0,
      Cancelada: 0
    };
    let totalAReceber = 0;
    let totalRecebido = 0;

    resumosFiltrados.forEach((resumo) => {
      totalOSs += resumo.quantidadeOS;

      // Contar motivos
      resumo.oss.forEach(os => {
        if (os.motivo) {
          motivosMap.set(os.motivo, (motivosMap.get(os.motivo) || 0) + 1);
        }
      });

      // Contar prioridades
      resumo.oss.forEach(os => {
        if (os.prioridade === 'Alta') prioridades.Alta++;
        else if (os.prioridade === 'Média') prioridades.Média++;
        else if (os.prioridade === 'Baixa') prioridades.Baixa++;
      });

      // Contar status (mapeando para nomes completos)
      Object.entries(resumo.statusCount).forEach(([st, count]) => {
        if (st === 'pendente' || st === 'atribuida') {
          status.Aguardando += count;
        } else if (st === 'em_andamento' || st === 'pre_finalizada') {
          status['Em Andamento'] += count;
        } else if (st === 'finalizada') {
          status.Finalizado += count;
        } else if (st === 'reagendada') {
          status.Reagendada += count;
        } else if (st === 'cancelada') {
          status.Cancelada += count;
        }
      });

      // Calcular valores
      const cobradas = resumo.oss.filter((os) => os.servico_cobrado && os.valor && os.status === 'finalizada');
      const total = cobradas.reduce((s, os) => s + (os.valor ?? 0), 0);
      const recebido = cobradas
        .filter((os) => os.servico_pago)
        .reduce((s, os) => s + (os.valor_pago ?? os.valor ?? 0), 0);
      totalAReceber += total - recebido;
      totalRecebido += recebido;
    });

    // Converter motivos para array e ordenar por quantidade (decrescente)
    const motivosContagem = Array.from(motivosMap.entries())
      .map(([motivo, quantidade]) => ({ motivo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);

    return {
      totalOSs,
      motivosContagem,
      prioridades,
      status,
      totalAReceber,
      totalRecebido
    };
  }, [resumosFiltrados]);

  // Tempo estimado total para um resumo (médias por tipo de serviço)
  const calcularTempoEstimadoResumo = (oss: RotaOS[]) => {
    let totalHoras = 0;
    oss.forEach((os) => {
      totalHoras += obterMediaTempoPorTipo(os.tipo_servico);
    });
    const horas = Math.floor(totalHoras);
    const minutos = Math.round((totalHoras - horas) * 60);
    if (totalHoras === 0) return '0h00';
    return `${horas}h${minutos.toString().padStart(2, '0')}`;
  };

  // Tempo trabalhado total (soma chegada→saída das OS)
  const calcularTempoTrabalhadoResumo = (oss: RotaOS[]) => {
    let totalMinutos = 0;
    oss.forEach((os) => {
      const ts = calcularTempoServico(os.registro_tempo?.chegada, os.registro_tempo?.saida);
      if (ts) {
        const m = ts.match(/(\d+)h(\d+)min/);
        if (m) totalMinutos += parseInt(m[1]) * 60 + parseInt(m[2]);
      }
    });
    if (totalMinutos === 0) return '0h00';
    const h = Math.floor(totalMinutos / 60);
    const min = totalMinutos % 60;
    return `${h}h${min.toString().padStart(2, '0')}`;
  };

  // Siglas como na guia Pendentes
  const siglaTipo = (tipo: string) =>
    tipo === 'Instalação' ? 'INS' : tipo.includes('Assistência Técnica') ? 'AT' : tipo;
  const siglaPrioridade = (p: string) =>
    p === 'Alta' ? 'A' : p === 'Média' ? 'M' : p;

  // Siglas para status (compacto: mais espaço para Est./Trab./A rec./Rec.)
  const siglaStatus = (status: StatusRotaOS): string => {
    const map: Record<StatusRotaOS, string> = {
      pendente: 'AG',
      atribuida: 'AG',
      em_andamento: 'EM',
      pre_finalizada: 'EM',
      finalizada: 'FI',
      reagendada: 'RE',
      cancelada: 'CA',
    };
    return map[status] ?? status;
  };

  // Serviços cobrados: a receber e recebido (finalizadas, servico_cobrado + valor)
  const servicosCobradosResumo = (oss: RotaOS[]) => {
    const cobradas = oss.filter((os) => os.servico_cobrado && os.valor && os.status === 'finalizada');
    const total = cobradas.reduce((s, os) => s + (os.valor ?? 0), 0);
    const recebido = cobradas
      .filter((os) => os.servico_pago)
      .reduce((s, os) => s + (os.valor_pago ?? os.valor ?? 0), 0);
    return { aReceber: total - recebido, recebido, temCobranca: cobradas.length > 0 };
  };

  // Filtrar OSs por técnico e data (quando um técnico é selecionado)
  const ossFiltradas = useMemo(() => {
    if (!tecnicoSelecionado || !dataSelecionada) return [];
    
    const resumo = resumosPorTecnico.find(r => r.tecnicoId === tecnicoSelecionado);
    if (!resumo) return [];
    
    return resumo.oss.sort((a, b) => {
      // Priorizar ordem_sequencia se existir
      if (a.ordem_sequencia !== undefined && b.ordem_sequencia !== undefined) {
        return a.ordem_sequencia - b.ordem_sequencia;
      }
      if (a.ordem_sequencia !== undefined) return -1;
      if (b.ordem_sequencia !== undefined) return 1;
      
      // Fallback: ordenar por hora de chegada ou data de atribuição
      const horaA = a.registro_tempo?.chegada || a.data_atribuicao || '';
      const horaB = b.registro_tempo?.chegada || b.data_atribuicao || '';
      return horaA.localeCompare(horaB);
    });
  }, [tecnicoSelecionado, dataSelecionada, resumosPorTecnico]);


  // Mapear status do sistema para visual
  const getStatusVisual = (status: StatusRotaOS) => {
    const map: Record<StatusRotaOS, { label: string; color: string; icon: React.ReactNode }> = {
      'pendente': { label: 'Aguardando', color: 'gray', icon: <Circle className="w-4 h-4" /> },
      'atribuida': { label: 'Aguardando', color: 'gray', icon: <Circle className="w-4 h-4" /> },
      'em_andamento': { label: 'Em andamento', color: 'blue', icon: <RefreshCw className="w-4 h-4" /> },
      'pre_finalizada': { label: 'Em andamento', color: 'blue', icon: <RefreshCw className="w-4 h-4" /> },
      'finalizada': { label: 'Finalizado', color: 'green', icon: <CheckCircle2 className="w-4 h-4" /> },
      'reagendada': { label: 'Reagendada', color: 'purple', icon: <CheckCircle2 className="w-4 h-4" /> },
      'cancelada': { label: 'Cancelada', color: 'red', icon: <XCircle className="w-4 h-4" /> },
    };
    return map[status] || map['pendente'];
  };

  // Cores para badges
  const getStatusBadgeClass = (color: string) => {
    const classes = {
      gray: 'bg-gray-100 text-gray-700 border-gray-300',
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      green: 'bg-green-100 text-green-700 border-green-300',
      purple: 'bg-purple-100 text-purple-700 border-purple-300',
      red: 'bg-red-100 text-red-700 border-red-300',
    };
    return classes[color as keyof typeof classes] || classes.gray;
  };

  // Cores para círculos da timeline
  const getStatusCircleClass = (color: string) => {
    const classes = {
      gray: 'bg-gray-400 border-gray-500',
      blue: 'bg-blue-500 border-blue-600',
      green: 'bg-green-500 border-green-600',
      purple: 'bg-purple-500 border-purple-600',
      red: 'bg-red-500 border-red-600',
    };
    return classes[color as keyof typeof classes] || classes.gray;
  };

  // Abrir dialog para editar OS
  const handleAbrirEdicao = (os: RotaOS) => {
    setOsSelecionada(os);
    setStatusEditado(os.status);
    
    // Inicializar checkboxes baseado no status atual
    const statusAtual = os.status;
    setStatusEmAndamento(statusAtual === 'em_andamento' || statusAtual === 'pre_finalizada');
    setStatusFinalizada(statusAtual === 'finalizada');
    setStatusReagendada(statusAtual === 'reagendada');
    setStatusCancelada(statusAtual === 'cancelada');
    
    setHorarioEntrada(os.registro_tempo?.chegada || '');
    setHorarioSaida(os.registro_tempo?.saida || '');
    setObservacoesEditado(os.observacoes || '');
    setMotivoCancelamento('');
    setMotivoReagendamento('');
    setServicoPago(os.servico_pago || false);
    setValorPago(os.valor_pago);
    setFormaPagamento(os.forma_pagamento || '');
    setDialogAberto(true);
  };

  // Voltar OS para pendentes
  const handleVoltarPendente = (osId: string) => {
    removerAtribuicao(osId);
    toast({
      title: 'OS voltou para pendentes',
      description: 'A OS foi removida da rota e voltou para pendentes.',
    });
    setDialogAberto(false);
  };

  // Transferir OS para outro técnico
  const handleTransferir = () => {
    if (!osSelecionada || !tecnicoTransferir) {
      toast({
        title: 'Erro',
        description: 'Selecione um técnico para transferir.',
        variant: 'destructive',
      });
      return;
    }

    atribuirTecnico(osSelecionada.id, tecnicoTransferir);
    toast({
      title: 'OS transferida',
      description: `OS transferida para ${tecnicosRoteiro.find((t) => t.id === tecnicoTransferir)?.nome ?? 'novo técnico'}.`,
    });
    setDialogTransferirAberto(false);
    setTecnicoTransferir('');
    setDialogAberto(false);
  };

  // Remover OS
  const handleRemover = (osId: string) => {
    removerOS(osId);
    toast({
      title: 'OS removida',
      description: 'A OS foi removida do sistema.',
    });
    setDialogAberto(false);
  };

  // Reabrir OS cancelada
  const handleReabrirOS = (osId: string) => {
    const os = osRotas.find(o => o.id === osId);
    atualizarOS(osId, {
      status: 'pendente',
      historico_status: 'cancelada',
      historico_tecnico: os?.tecnico_nome, // Salvar histórico do técnico
      tecnico_id: undefined,
      tecnico_nome: undefined,
      data_atribuicao: undefined,
      registro_tempo: undefined, // Limpar horários para nova visita
      valor: undefined, // Limpar valor do serviço
      servico_cobrado: false, // Limpar serviço cobrado
      servico_pago: false, // Limpar serviço pago
      valor_pago: undefined, // Limpar valor pago
      forma_pagamento: undefined, // Limpar forma de pagamento
    });
    removerAtribuicao(osId);
    toast({
      title: 'OS reaberta',
      description: 'A OS foi reaberta e voltou para pendentes.',
    });
    setDialogAberto(false);
  };

  // Reabrir OS finalizada
  const handleReabrirOSFinalizada = (osId: string) => {
    const os = osRotas.find(o => o.id === osId);
    atualizarOS(osId, {
      status: 'pendente',
      historico_status: 'finalizada',
      historico_tecnico: os?.tecnico_nome, // Salvar histórico do técnico
      tecnico_id: undefined,
      tecnico_nome: undefined,
      data_atribuicao: undefined,
      registro_tempo: undefined, // Limpar horários para nova visita
      valor: undefined, // Limpar valor do serviço
      servico_cobrado: false, // Limpar serviço cobrado
      servico_pago: false, // Limpar serviço pago
      valor_pago: undefined, // Limpar valor pago
      forma_pagamento: undefined, // Limpar forma de pagamento
    });
    removerAtribuicao(osId);
    toast({
      title: 'OS reaberta',
      description: 'A OS foi reaberta e voltou para pendentes. Você pode agendar uma nova visita.',
    });
    setDialogAberto(false);
  };

  // Iniciar modo de edição de ordem
  const handleIniciarEdicaoOrdem = () => {
    // Inicializar vazio - usuário escolhe a ordem
    const ordemInicial: Record<string, number> = {};
    ossFiltradas.forEach((os) => {
      // Só preencher se já tiver ordem definida, senão deixar vazio
      if (os.ordem_sequencia) {
        ordemInicial[os.id] = os.ordem_sequencia;
      }
    });
    setOrdemTemporaria(ordemInicial);
    setModoEdicaoOrdem(true);
  };

  // Atualizar ordem temporária quando o usuário digita
  const handleAtualizarOrdemTemporaria = (osId: string, novaOrdem: number) => {
    setOrdemTemporaria(prev => ({
      ...prev,
      [osId]: novaOrdem
    }));
  };

  // Cancelar edição de ordem
  const handleCancelarEdicaoOrdem = () => {
    setModoEdicaoOrdem(false);
    setOrdemTemporaria({});
  };

  // Salvar ordem final
  const handleSalvarOrdem = () => {
    const osIds = Object.keys(ordemTemporaria);
    
    // Validar se há ordens duplicadas
    const ordens = Object.values(ordemTemporaria);
    const ordensUnicas = new Set(ordens);
    if (ordens.length !== ordensUnicas.size) {
      toast({
        title: 'Erro',
        description: 'Não é possível ter duas OSs com a mesma ordem. Verifique os números.',
        variant: 'destructive',
      });
      return;
    }

    // Atualizar todas as OSs com a nova ordem (ou limpar se não foi selecionada)
    ossFiltradas.forEach((os) => {
      if (ordemTemporaria[os.id]) {
        // Atualizar com a ordem selecionada
        atualizarOS(os.id, { ordem_sequencia: ordemTemporaria[os.id] });
      } else {
        // Limpar ordem se não foi selecionada
        atualizarOS(os.id, { ordem_sequencia: undefined });
      }
    });

    const quantidadeComOrdem = osIds.length;
    toast({
      title: 'Ordem salva',
      description: quantidadeComOrdem > 0 
        ? `A ordem de ${quantidadeComOrdem} OS(s) foi atualizada com sucesso.`
        : 'Ordem atualizada com sucesso.',
    });

    setModoEdicaoOrdem(false);
    setOrdemTemporaria({});
  };

  // Salvar alterações da OS
  const handleSalvarOS = () => {
    if (!osSelecionada) return;

    // Validações
    if (statusReagendada && !motivoReagendamento.trim()) {
      toast({
        title: 'Erro',
        description: 'É obrigatório informar o motivo do reagendamento.',
        variant: 'destructive',
      });
      return;
    }

    if (statusCancelada && !motivoCancelamento.trim()) {
      toast({
        title: 'Erro',
        description: 'É obrigatório informar o motivo do cancelamento.',
        variant: 'destructive',
      });
      return;
    }

    // Validar que hora de saída não é menor que hora de entrada
    if (horarioEntrada && horarioSaida) {
      const [horaEntrada, minutoEntrada] = horarioEntrada.split(':').map(Number);
      const [horaSaida, minutoSaida] = horarioSaida.split(':').map(Number);
      const minutosEntrada = horaEntrada * 60 + minutoEntrada;
      const minutosSaida = horaSaida * 60 + minutoSaida;
      
      if (minutosSaida < minutosEntrada) {
        toast({
          title: 'Erro',
          description: 'A hora de saída não pode ser menor que a hora de entrada.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Determinar status baseado nos checkboxes
    let novoStatus: StatusRotaOS = statusEditado;
    const agora = new Date();
    const horasAgora = String(agora.getHours()).padStart(2, '0');
    const minutosAgora = String(agora.getMinutes()).padStart(2, '0');
    const horarioAgora = `${horasAgora}:${minutosAgora}`;

    let registroTempo = osSelecionada.registro_tempo || { chegada: '', saida: '' };

    if (statusFinalizada) {
      novoStatus = 'finalizada';
      // Preencher hora de saída automaticamente se não tiver
      if (!horarioSaida) {
        setHorarioSaida(horarioAgora);
        registroTempo.saida = horarioAgora;
      } else {
        registroTempo.saida = horarioSaida;
      }
      registroTempo.chegada = horarioEntrada || registroTempo.chegada || '';
    } else if (statusReagendada) {
      // Quando reagendada, manter na rota do técnico
      novoStatus = 'reagendada';
      // Preencher hora de saída automaticamente se não estiver preenchida
      if (!registroTempo.saida && !horarioSaida) {
        const agora = new Date();
        const horas = String(agora.getHours()).padStart(2, '0');
        const minutos = String(agora.getMinutes()).padStart(2, '0');
        registroTempo.saida = `${horas}:${minutos}`;
      } else {
        registroTempo.saida = horarioSaida || registroTempo.saida || '';
      }
      // Manter horário de entrada se já existir
      registroTempo.chegada = horarioEntrada || registroTempo.chegada || '';
    } else if (statusCancelada) {
      novoStatus = 'cancelada';
      // Preencher hora de saída automaticamente (mas não entrada)
      if (!horarioSaida) {
        setHorarioSaida(horarioAgora);
        registroTempo.saida = horarioAgora;
      } else {
        registroTempo.saida = horarioSaida;
      }
      // Não preencher entrada se cancelada antes de iniciar
      if (!horarioEntrada) {
        registroTempo.chegada = '';
      } else {
        registroTempo.chegada = horarioEntrada;
      }
    } else if (statusEmAndamento) {
      novoStatus = 'em_andamento';
      // Preencher hora de entrada automaticamente se não tiver
      if (!horarioEntrada) {
        setHorarioEntrada(horarioAgora);
        registroTempo.chegada = horarioAgora;
      } else {
        registroTempo.chegada = horarioEntrada;
      }
      registroTempo.saida = horarioSaida || registroTempo.saida || '';
    }

    const atualizacoes: Partial<RotaOS> = {
      status: novoStatus,
      observacoes: observacoesEditado,
      registro_tempo: registroTempo,
      servico_pago: servicoPago,
      valor_pago: servicoPago ? valorPago : undefined,
      forma_pagamento: servicoPago ? formaPagamento : undefined,
    };

    // Se reagendada, manter na rota do técnico e apenas atualizar status
    if (statusReagendada) {
      atualizacoes.historico_status = 'reagendada';
      
      // Adicionar motivo do reagendamento nas observações
      if (motivoReagendamento) {
        const observacoesComMotivo = osSelecionada.observacoes 
          ? `${osSelecionada.observacoes}\n\nMotivo do reagendamento: ${motivoReagendamento}`
          : `Motivo do reagendamento: ${motivoReagendamento}`;
        atualizacoes.observacoes = observacoesComMotivo;
      }
    }

    // Se cancelada, adicionar motivo nas observações
    if (statusCancelada && motivoCancelamento) {
      const observacoesComMotivo = osSelecionada.observacoes 
        ? `${osSelecionada.observacoes}\n\nMotivo do cancelamento: ${motivoCancelamento}`
        : `Motivo do cancelamento: ${motivoCancelamento}`;
      atualizacoes.observacoes = observacoesComMotivo;
    }

    atualizarOS(osSelecionada.id, atualizacoes);

    // Se finalizada, atualizar média de tempo
    if (statusFinalizada || novoStatus === 'finalizada') {
      const osAtualizada = {
        ...osSelecionada,
        ...atualizacoes,
        status: 'finalizada' as StatusRotaOS,
        data_finalizacao: osSelecionada.data_finalizacao || new Date().toISOString(),
      };
      atualizarMediaTempo(osAtualizada);
    }

    // Mensagem de sucesso
    if (statusReagendada) {
      toast({
        title: 'OS reagendada',
        description: 'A OS foi marcada como reagendada e permanece na rota do técnico.',
      });
    } else {
      toast({
        title: 'OS atualizada',
        description: 'Status, horários e observações foram atualizados com sucesso.',
      });
    }

    setDialogAberto(false);
    setOsSelecionada(null);
    setStatusEditado('pendente');
    setStatusEmAndamento(false);
    setStatusFinalizada(false);
    setStatusReagendada(false);
    setStatusCancelada(false);
    setHorarioEntrada('');
    setHorarioSaida('');
    setObservacoesEditado('');
    setMotivoCancelamento('');
    setMotivoReagendamento('');
    setServicoPago(false);
    setValorPago(undefined);
    setFormaPagamento('');
  };

  // Obter horário previsto (pode vir de periodo ou ser estimado)
  const getHorarioPrevisto = (os: RotaOS, index: number) => {
    if (os.periodo === 'Manhã') {
      const hora = 8 + (index * 0.5);
      return `${Math.floor(hora).toString().padStart(2, '0')}:${((hora % 1) * 60).toFixed(0).padStart(2, '0')}`;
    } else if (os.periodo === 'Tarde') {
      const hora = 13 + (index * 0.5);
      return `${Math.floor(hora).toString().padStart(2, '0')}:${((hora % 1) * 60).toFixed(0).padStart(2, '0')}`;
    }
    // Estimativa baseada na ordem
    const hora = 8 + (index * 0.5);
    return `${Math.floor(hora).toString().padStart(2, '0')}:${((hora % 1) * 60).toFixed(0).padStart(2, '0')}`;
  };

  // Calcular tempo dentro do serviço (em minutos)
  const calcularTempoServico = (chegada: string | undefined, saida: string | undefined): string | null => {
    if (!chegada || !saida) return null;
    
    try {
      const [horaChegada, minutoChegada] = chegada.split(':').map(Number);
      const [horaSaida, minutoSaida] = saida.split(':').map(Number);
      
      const minutosChegada = horaChegada * 60 + minutoChegada;
      const minutosSaida = horaSaida * 60 + minutoSaida;
      
      const diferencaMinutos = minutosSaida - minutosChegada;
      
      if (diferencaMinutos < 0) return null; // Horário inválido
      
      const horas = Math.floor(diferencaMinutos / 60);
      const minutos = diferencaMinutos % 60;
      
      return `${horas}h${minutos.toString().padStart(2, '0')}min`;
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com filtro de data apenas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="text-2xl font-bold">Rota do Dia</h2>
          </div>
          {/* Botão de Refresh com última atualização */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Última atualização: {formatarUltimaAtualizacao()}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Popover open={popoverCalendarioAberto} onOpenChange={setPopoverCalendarioAberto}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataSelecionada ? format(dataSelecionada, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dataSelecionada}
                onSelect={(date) => {
                  if (date) {
                    setDataSelecionada(date);
                    setTecnicoSelecionado('');
                    setFiltroTecnicoId('__todos__');
                    setPopoverCalendarioAberto(false);
                  }
                }}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {dataSelecionada ? (
        <>
          {/* Tabela de Resumos por Técnico */}
          {resumosPorTecnico.length > 0 ? (
            <div className="space-y-4">
              {/* Filtro: caixa de listagem com técnicos que têm rota atribuída */}
              <div className="flex items-center gap-2">
                <Label htmlFor="filtro-tecnico" className="text-sm font-medium whitespace-nowrap">
                  Técnico:
                </Label>
                <Select
                  value={filtroTecnicoId}
                  onValueChange={setFiltroTecnicoId}
                >
                  <SelectTrigger id="filtro-tecnico" className="w-[280px]">
                    <SelectValue placeholder="Todos os técnicos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos os técnicos</SelectItem>
                    {resumosPorTecnico.map((r) => (
                      <SelectItem key={r.tecnicoId} value={r.tecnicoId}>
                        {r.tecnicoNome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resumo Geral do Dia */}
              {resumosFiltrados.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Resumo Geral do Dia
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Linha 1: Cards menores e compactos */}
                    <Card className="border-t-4 border-t-blue-500">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <ListOrdered className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-foreground">Total de Ordens de Serviço</span>
                        </div>
                        <div className="text-sm font-semibold">{resumoGeral.totalOSs}</div>
                        <p className="text-xs text-muted-foreground">
                          {resumosFiltrados.length} técnico{resumosFiltrados.length !== 1 ? 's' : ''} com rota
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-orange-500">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-foreground">Distribuição de Prioridades</span>
                        </div>
                        <div className="text-sm font-semibold mb-1.5">
                          {resumoGeral.prioridades.Alta + resumoGeral.prioridades.Média + resumoGeral.prioridades.Baixa} OSs
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {resumoGeral.prioridades.Alta > 0 && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-[10px] py-0 px-1.5">
                              Alta: {resumoGeral.prioridades.Alta}
                            </Badge>
                          )}
                          {resumoGeral.prioridades.Média > 0 && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-[10px] py-0 px-1.5">
                              Média: {resumoGeral.prioridades.Média}
                            </Badge>
                          )}
                          {resumoGeral.prioridades.Baixa > 0 && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-[10px] py-0 px-1.5">
                              Baixa: {resumoGeral.prioridades.Baixa}
                            </Badge>
                          )}
                          {resumoGeral.prioridades.Alta === 0 && resumoGeral.prioridades.Média === 0 && resumoGeral.prioridades.Baixa === 0 && (
                            <span className="text-xs text-muted-foreground">Sem prioridades definidas</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-yellow-500">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-foreground">Valor a Receber</span>
                        </div>
                        <div className="text-sm font-semibold">
                          R$ {resumoGeral.totalAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Serviços finalizados não pagos
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-emerald-500">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-medium text-foreground">Valor Recebido</span>
                        </div>
                        <div className="text-sm font-semibold">
                          R$ {resumoGeral.totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Pagamentos confirmados
                        </p>
                      </CardContent>
                    </Card>

                    {/* Linha 2: Motivos (ocupa 3 colunas) */}
                    <Card className="border-t-4 border-t-purple-500 lg:col-span-3">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <MessageCircle className="h-5 w-5 text-purple-600" />
                          <span className="text-sm font-medium text-muted-foreground">Motivos</span>
                        </div>
                        <div className="text-3xl font-bold mb-3">{resumoGeral.motivosContagem.length} motivos distintos</div>
                        {resumoGeral.motivosContagem.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">
                            {resumoGeral.motivosContagem.map(({ motivo, quantidade }) => (
                              <div key={motivo} className="flex items-start justify-between text-xs gap-2 py-1">
                                <span className="text-muted-foreground flex-1 leading-tight">• {motivo}</span>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 shrink-0 h-5">
                                  {quantidade}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum motivo registrado</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Status (embaixo de Valor Recebido - 1 coluna) */}
                    <Card className="border-t-4 border-t-green-500 lg:col-span-1">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-muted-foreground">Distribuição de Status</span>
                        </div>
                        <div className="text-3xl font-bold mb-3">{resumoGeral.totalOSs} OSs</div>
                        <div className="space-y-2">
                          {resumoGeral.status.Aguardando > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Aguardando:</span>
                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 ml-1">
                                {resumoGeral.status.Aguardando}
                              </Badge>
                            </div>
                          )}
                          {resumoGeral.status['Em Andamento'] > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Em Andamento:</span>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 ml-1">
                                {resumoGeral.status['Em Andamento']}
                              </Badge>
                            </div>
                          )}
                          {resumoGeral.status.Finalizado > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Finalizado:</span>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 ml-1">
                                {resumoGeral.status.Finalizado}
                              </Badge>
                            </div>
                          )}
                          {resumoGeral.status.Reagendada > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Reagendada:</span>
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 ml-1">
                                {resumoGeral.status.Reagendada}
                              </Badge>
                            </div>
                          )}
                          {resumoGeral.status.Cancelada > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Cancelada:</span>
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 ml-1">
                                {resumoGeral.status.Cancelada}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs py-2 px-2">Técnico</TableHead>
                      <TableHead className="text-xs py-2 px-2 w-12">OS</TableHead>
                      <TableHead className="text-xs py-2 px-2">Tipos de Serviço</TableHead>
                      <TableHead className="text-xs py-2 px-2">Prioridades</TableHead>
                      <TableHead className="text-xs py-2 px-2">Status</TableHead>
                      <TableHead className="text-xs py-2 px-2 w-16">Estimado</TableHead>
                      <TableHead className="text-xs py-2 px-2 w-16">Trabalhado</TableHead>
                      <TableHead className="text-xs py-2 px-2 w-20">A receber</TableHead>
                      <TableHead className="text-xs py-2 px-2 w-20">Recebido</TableHead>
                      <TableHead className="text-xs py-2 px-2 w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumosFiltrados.map((resumo) => {
                      const isExpanded = tecnicoSelecionado === resumo.tecnicoId;
                      const cobranca = servicosCobradosResumo(resumo.oss);
                      return (
                        <TableRow
                          key={resumo.tecnicoId}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isExpanded && "bg-blue-100 hover:bg-blue-200"
                          )}
                          onClick={() => {
                            setTecnicoSelecionado(
                              isExpanded ? '' : resumo.tecnicoId
                            );
                          }}
                        >
                          <TableCell className="text-xs py-2 px-2">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="font-semibold">{resumo.tecnicoNome}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2 px-2 tabular-nums text-muted-foreground">
                            {resumo.quantidadeOS} OS{resumo.quantidadeOS !== 1 ? 's' : ''}
                          </TableCell>
                          <TableCell className="text-xs py-2 px-2">
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const tiposCount = resumo.oss.reduce<Record<string, number>>((acc, os) => {
                                  const t = os.tipo_servico || '';
                                  if (!t) return acc;
                                  acc[t] = (acc[t] ?? 0) + 1;
                                  return acc;
                                }, {});
                                const entradas = Object.entries(tiposCount).filter(([, c]) => c > 0);
                                if (entradas.length === 0) return <span className="text-muted-foreground">—</span>;
                                return entradas.map(([tipo, count]) => (
                                  <Badge
                                    key={tipo}
                                    variant="outline"
                                    title={tipo}
                                    className={cn(
                                      "text-[11px] font-medium py-0 px-1.5",
                                      tipo === 'Instalação'
                                        ? 'bg-green-50 text-green-700 border-green-300'
                                        : 'bg-blue-50 text-blue-700 border-blue-300'
                                    )}
                                  >
                                    {siglaTipo(tipo)}: {count}
                                  </Badge>
                                ));
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2 px-2">
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const prioridadesCount = resumo.oss.reduce<Record<string, number>>((acc, os) => {
                                  const p = os.prioridade || '';
                                  if (!p) return acc;
                                  acc[p] = (acc[p] ?? 0) + 1;
                                  return acc;
                                }, {});
                                const entradas = Object.entries(prioridadesCount).filter(([, c]) => c > 0);
                                if (entradas.length === 0) return <span className="text-muted-foreground">—</span>;
                                return entradas.map(([prioridade, count]) => (
                                  <Badge
                                    key={prioridade}
                                    variant="outline"
                                    title={prioridade}
                                    className={cn(
                                      "text-[11px] font-semibold py-0 px-1.5",
                                      prioridade === 'Alta'
                                        ? 'bg-red-50 text-red-700 border-red-300'
                                        : 'bg-yellow-50 text-yellow-700 border-yellow-300'
                                    )}
                                  >
                                    {siglaPrioridade(prioridade)}: {count}
                                  </Badge>
                                ));
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2 px-2">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(resumo.statusCount)
                                .filter(([_, count]) => count > 0)
                                .map(([status, count]) => {
                                  const visual = getStatusVisual(status as StatusRotaOS);
                                  return (
                                    <Badge
                                      key={status}
                                      variant="outline"
                                      title={visual.label}
                                      className={cn("text-[11px] font-medium py-0 px-1.5", getStatusBadgeClass(visual.color))}
                                    >
                                      {siglaStatus(status as StatusRotaOS)}: {count}
                                    </Badge>
                                  );
                                })}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2 px-2 tabular-nums text-muted-foreground">
                            {calcularTempoEstimadoResumo(resumo.oss)}
                          </TableCell>
                          <TableCell className="text-xs py-2 px-2 tabular-nums text-muted-foreground">
                            {calcularTempoTrabalhadoResumo(resumo.oss)}
                          </TableCell>
                          <TableCell className="text-xs py-2 px-2 tabular-nums">
                            {!cobranca.temCobranca ? (
                              <span className="text-muted-foreground">—</span>
                            ) : cobranca.aReceber === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span className="text-amber-700">
                                R$ {cobranca.aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 px-2 tabular-nums">
                            {!cobranca.temCobranca ? (
                              <span className="text-muted-foreground">—</span>
                            ) : cobranca.recebido === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span className="text-green-700">
                                R$ {cobranca.recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 px-2">
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhuma rota encontrada para esta data.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Visualização Detalhada da Rota (quando técnico selecionado) */}
          {tecnicoSelecionado && ossFiltradas.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">
                  Rota Detalhada - {resumosPorTecnico.find(r => r.tecnicoId === tecnicoSelecionado)?.tecnicoNome}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTecnicoSelecionado('')}
                >
                  Fechar
                </Button>
              </div>

        <div className="space-y-4">
            {/* Resumo da Rota - compacto e moderno */}
            {(() => {
              let totalHorasEst = 0;
              ossFiltradas.forEach((os) => {
                totalHorasEst += obterMediaTempoPorTipo(os.tipo_servico);
              });
              const estHoras = Math.floor(totalHorasEst);
              const estMin = Math.round((totalHorasEst - estHoras) * 60);
              const estimadoStr = totalHorasEst === 0 ? '0h00' : `${estHoras}h${estMin.toString().padStart(2, '0')}`;

              let totalMinTrab = 0;
              ossFiltradas.forEach((os) => {
                const ts = calcularTempoServico(os.registro_tempo?.chegada, os.registro_tempo?.saida);
                if (ts) {
                  const m = ts.match(/(\d+)h(\d+)min/);
                  if (m) totalMinTrab += parseInt(m[1]) * 60 + parseInt(m[2]);
                }
              });
              const trabHoras = Math.floor(totalMinTrab / 60);
              const trabMin = totalMinTrab % 60;
              const trabalhadoStr = totalMinTrab === 0 ? '0h00' : `${trabHoras}h${trabMin.toString().padStart(2, '0')}`;

              const servicosCobrados = ossFiltradas.filter((os) => os.servico_cobrado && os.valor && os.status === 'finalizada');
              const valorTotal = servicosCobrados.reduce((s, os) => s + (os.valor ?? 0), 0);
              const valorRecebido = servicosCobrados
                .filter((os) => os.servico_pago)
                .reduce((s, os) => s + (os.valor_pago ?? os.valor ?? 0), 0);
              const bairrosStr = [...new Set(ossFiltradas.map((os) => os.bairro).filter(Boolean))].join(' → ') || 'Nenhum';

              return (
                <Card className="border-l-2 border-l-primary/60 overflow-hidden">
                  <CardHeader className="py-2 px-4 pb-1">
                    <CardTitle className="text-base font-semibold">Resumo da Rota</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium text-foreground">Bairros:</span>
                      <span className="truncate">{bairrosStr}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="inline-flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1.5">
                        <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-base font-bold tabular-nums">{ossFiltradas.length}</span>
                        <span className="text-xs text-muted-foreground">OS</span>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1.5">
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-base font-bold tabular-nums">{estimadoStr}</span>
                        <span className="text-xs text-muted-foreground">Estimado</span>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1.5">
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-base font-bold tabular-nums">{trabalhadoStr}</span>
                        <span className="text-xs text-muted-foreground">Trabalhado</span>
                      </div>
                    </div>
                    {servicosCobrados.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                        <span className="text-xs font-medium text-muted-foreground mr-1">Cobrados:</span>
                        <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 border border-emerald-200 dark:border-emerald-800/50">
                          <span className="text-base font-bold tabular-nums">{servicosCobrados.length}</span>
                          <span className="text-xs text-muted-foreground">serv.</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1.5">
                          <span className="text-base font-bold tabular-nums">
                            R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-muted-foreground">total</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 border border-emerald-200 dark:border-emerald-800/50">
                          <span className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                            R$ {valorRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-muted-foreground">recebido</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Timeline de OSs - compacta (linha + círculos + badges) */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Ordens de Serviço</CardTitle>
                  {ossFiltradas.length > 0 && !isTecnico && (
                    <div className="flex items-center gap-2">
                      {modoEdicaoOrdem ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelarEdicaoOrdem}
                            className="flex items-center gap-2"
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSalvarOrdem}
                            className="flex items-center gap-2"
                          >
                            Confirmar Ordem
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleIniciarEdicaoOrdem}
                          className="flex items-center gap-2"
                        >
                          <ListOrdered className="w-4 h-4" />
                          Definir Ordem
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-3">
                    {ossFiltradas.map((os) => {
                      const statusVisual = getStatusVisual(os.status);
                      const isAgora = os.status === 'em_andamento' || os.status === 'pre_finalizada';
                      const horarioReal = os.registro_tempo?.chegada || null;
                      const tempoServico = calcularTempoServico(os.registro_tempo?.chegada, os.registro_tempo?.saida);
                      return (
                        <div key={os.id} className="relative flex items-start gap-3">
                          <div
                            className={cn(
                              "relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                              getStatusCircleClass(statusVisual.color)
                            )}
                          >
                            {statusVisual.icon && (
                              <div className="text-white [&>svg]:w-3 [&>svg]:h-3">
                                {statusVisual.icon}
                              </div>
                            )}
                          </div>
                          <div
                            className={cn(
                              "flex-1 min-w-0 border border-transparent p-2 rounded-lg transition-all duration-200",
                              modoEdicaoOrdem
                                ? "hover:bg-muted/50"
                                : "cursor-pointer hover:bg-primary/10 hover:border-primary/20"
                            )}
                            onClick={modoEdicaoOrdem ? undefined : () => handleAbrirEdicao(os)}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {modoEdicaoOrdem ? (
                                <Select
                                  value={ordemTemporaria[os.id]?.toString() || ''}
                                  onValueChange={(value) => {
                                    if (value) handleAtualizarOrdemTemporaria(os.id, parseInt(value));
                                    else
                                      setOrdemTemporaria((prev) => {
                                        const n = { ...prev };
                                        delete n[os.id];
                                        return n;
                                      });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SelectTrigger className="w-16 h-7 text-xs">
                                    <SelectValue placeholder="-" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: ossFiltradas.length }, (_, i) => i + 1).map((num) => (
                                      <SelectItem key={num} value={num.toString()}>
                                        {num}ª
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : os.ordem_sequencia ? (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                                  {os.ordem_sequencia}ª
                                </Badge>
                              ) : null}
                              <Badge className={cn("text-[10px] py-0 px-1.5", getStatusBadgeClass(statusVisual.color))}>
                                <span className="flex items-center gap-1">
                                  {statusVisual.icon && <span className="[&>svg]:w-2.5 [&>svg]:h-2.5">{statusVisual.icon}</span>}
                                  {statusVisual.label}
                                </span>
                              </Badge>
                              {isAgora && horarioReal && (
                                <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                                  Agora • {horarioReal}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
                              <span className="font-semibold text-gray-600">OS {os.codigo_os}</span>
                              <span className="font-semibold text-gray-900">{os.nome_cliente.toUpperCase()}</span>
                              {(os.bairro || os.cidade) && (
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  {[os.bairro, os.cidade].filter(Boolean).join(' • ')}
                                </span>
                              )}
                              {(horarioReal || os.registro_tempo?.saida || tempoServico || (os.servico_cobrado && os.valor)) && (
                                <>
                                  {horarioReal && <span className="text-blue-600 font-medium">Chegada: {horarioReal}</span>}
                                  {os.registro_tempo?.saida && (
                                    <span className="text-green-600 font-medium">Saída: {os.registro_tempo.saida}</span>
                                  )}
                                  {tempoServico && <span className="text-purple-600 font-medium">Tempo: {tempoServico}</span>}
                                  {os.servico_cobrado && os.valor && (
                                    <span className="text-green-700 font-semibold">
                                      R$ {os.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            {(os.tipo_servico || os.motivo) && (
                              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                {os.tipo_servico && (
                                  <span>
                                    Tipo: {os.tipo_servico}
                                    {os.subtipo_servico && ` • ${os.subtipo_servico}`}
                                  </span>
                                )}
                                {os.motivo && <span>Motivo: {os.motivo}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legenda de Status */}
            <div className="flex flex-wrap gap-2">
              {[
                { status: 'pendente' as StatusRotaOS, label: 'Aguardando' },
                { status: 'em_andamento' as StatusRotaOS, label: 'Em Andamento' },
                { status: 'finalizada' as StatusRotaOS, label: 'Finalizada' },
                { status: 'reagendada' as StatusRotaOS, label: 'Reagendada' },
                { status: 'cancelada' as StatusRotaOS, label: 'Cancelada' },
              ].map(({ status, label }) => {
                const visual = getStatusVisual(status);
                return (
                  <Badge key={status} variant="outline" className={getStatusBadgeClass(visual.color)}>
                    <div className="flex items-center gap-1">
                      <div className={cn("w-2 h-2 rounded-full", getStatusCircleClass(visual.color).replace('border-2', ''))} />
                      {label}
                    </div>
                  </Badge>
                );
              })}
            </div>
        </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Selecione uma data para visualizar as rotas do dia.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog para editar OS */}
      <Dialog open={dialogAberto} onOpenChange={(open) => {
        setDialogAberto(open);
        if (!open) {
          // Resetar estados ao fechar
          setOsSelecionada(null);
          setStatusEditado('pendente');
          setStatusEmAndamento(false);
          setStatusFinalizada(false);
          setStatusReagendada(false);
          setStatusCancelada(false);
          setHorarioEntrada('');
          setHorarioSaida('');
          setObservacoesEditado('');
          setMotivoCancelamento('');
          setMotivoReagendamento('');
          setServicoPago(false);
          setValorPago(undefined);
          setFormaPagamento('');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header com fundo azul */}
          <div className="bg-primary text-primary-foreground px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  Detalhe OS - {osSelecionada?.codigo_os}
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/80 mt-1">
                  Visualize e atualize as informações da ordem de serviço
            </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className={cn("grid w-full mb-6", historicoCliente.length > 0 ? "grid-cols-4" : "grid-cols-3")}>
                <TabsTrigger value="info">Info. da Conta</TabsTrigger>
                <TabsTrigger value="servico">Dados da OS</TabsTrigger>
                <TabsTrigger value="atualizar">Finalização</TabsTrigger>
                {historicoCliente.length > 0 && (
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="info" className="space-y-6">
                {/* Informações do Cliente */}
                {osSelecionada && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Assinante</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Assinante:</span>
                        <p className="text-gray-900 mt-1">{osSelecionada.nome_cliente}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Código Cliente:</span>
                        <p className="text-gray-900 mt-1">{osSelecionada.codigo_cliente || '-'}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Tel. Cel.:</span>
                        <p className="text-gray-900 mt-1">{osSelecionada.telefone || '-'}</p>
                      </div>
                      {osSelecionada.telefone_comercial && (
                        <div>
                          <span className="font-semibold text-gray-700">Tel. Com.:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.telefone_comercial}</p>
                        </div>
                      )}
                      {osSelecionada.telefone_residencial && (
                        <div>
                          <span className="font-semibold text-gray-700">Tel. Res.:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.telefone_residencial}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Informações de Endereço */}
                {osSelecionada && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Endereço</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="col-span-2">
                        <span className="font-semibold text-gray-700">End.:</span>
                        <p className="text-gray-900 mt-1">{osSelecionada.endereco}</p>
                      </div>
                      {osSelecionada.complemento && (
                        <div>
                          <span className="font-semibold text-gray-700">Complemento:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.complemento}</p>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-gray-700">Bairro:</span>
                        <p className="text-gray-900 mt-1">{osSelecionada.bairro}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Cidade.:</span>
                        <p className="text-gray-900 mt-1">{osSelecionada.cidade}{osSelecionada.uf ? `/${osSelecionada.uf}` : ''}</p>
                      </div>
                      {osSelecionada.cep && (
                        <div>
                          <span className="font-semibold text-gray-700">Cep.:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.cep}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="servico" className="space-y-6">
                {/* Informações do Serviço */}
                {osSelecionada && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Informações do Serviço</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Tipo de Serviço:</span>
                        <p className="text-gray-900 mt-1">{osSelecionada.tipo_servico}</p>
                      </div>
                      {osSelecionada.subtipo_servico && (
                        <div>
                          <span className="font-semibold text-gray-700">SubTipo:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.subtipo_servico}</p>
                        </div>
                      )}
                      {osSelecionada.motivo && (
                        <div>
                          <span className="font-semibold text-gray-700">Razão:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.motivo}</p>
                        </div>
                      )}
                      {osSelecionada.pacote && (
                        <div>
                          <span className="font-semibold text-gray-700">Pacote:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.pacote}</p>
                        </div>
                      )}
                      {osSelecionada.codigo_item && (
                        <div>
                          <span className="font-semibold text-gray-700">Código Item:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.codigo_item}</p>
                        </div>
                      )}
                      {osSelecionada.acao_tomada && (
                        <div className="col-span-2">
                          <span className="font-semibold text-gray-700">Ação tomada:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.acao_tomada}</p>
                        </div>
                      )}
                      {osSelecionada.periodo && (
                        <div>
                          <span className="font-semibold text-gray-700">Período:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.periodo}</p>
                        </div>
                      )}
                      {osSelecionada.prioridade && (
                        <div>
                          <span className="font-semibold text-gray-700">Prioridade:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.prioridade}</p>
                        </div>
                      )}
                      {osSelecionada.servico_cobrado && osSelecionada.valor && (
                        <div>
                          <span className="font-semibold text-gray-700">Valor:</span>
                          <p className="text-gray-900 mt-1">
                            R$ {osSelecionada.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {osSelecionada.sigla_tecnico && (
                        <div>
                          <span className="font-semibold text-gray-700">Sigla Técnico:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.sigla_tecnico}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Seção adicional para manter altura igual à tab Info. da Conta */}
                {osSelecionada && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Informações Adicionais</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Status Atual:</span>
                        <p className="text-gray-900 mt-1">
                          {osSelecionada.status === 'pendente' ? 'Aguardando' :
                           osSelecionada.status === 'atribuida' ? 'Atribuída' :
                           osSelecionada.status === 'em_andamento' ? 'Em Andamento' :
                           osSelecionada.status === 'finalizada' ? 'Finalizada' :
                           osSelecionada.status === 'reagendada' ? 'Reagendada' :
                           osSelecionada.status === 'cancelada' ? 'Cancelada' : osSelecionada.status}
                        </p>
                      </div>
                      {osSelecionada.data_agendada && (
                        <div>
                          <span className="font-semibold text-gray-700">Data Agendada:</span>
                          <p className="text-gray-900 mt-1">
                            {(() => {
                              const [ano, mes, dia] = osSelecionada.data_agendada.split('-');
                              return ano && mes && dia ? `${dia}/${mes}/${ano}` : osSelecionada.data_agendada;
                            })()}
                          </p>
                        </div>
                      )}
                      {osSelecionada.tecnico_nome && (
                        <div>
                          <span className="font-semibold text-gray-700">Técnico:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.tecnico_nome}</p>
                        </div>
                      )}
                      {osSelecionada.observacoes && (
                        <div className="col-span-2">
                          <span className="font-semibold text-gray-700">Observações:</span>
                          <p className="text-gray-900 mt-1">{osSelecionada.observacoes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="atualizar" className="space-y-6">

                {/* Campos Editáveis */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Atualizar Informações</h3>
                  
                  <div className="space-y-3">
                    <Label className="font-semibold">Status</Label>
            <div className="space-y-2">
                      {/* Em Andamento - só disponível se status for atribuida ou pendente */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="status_em_andamento"
                          checked={statusEmAndamento}
                          disabled={
                            statusFinalizada || 
                            statusReagendada || 
                            statusCancelada ||
                            (osSelecionada?.status === 'finalizada' || 
                             osSelecionada?.status === 'reagendada' || 
                             osSelecionada?.status === 'cancelada')
                          }
                          onCheckedChange={(checked) => {
                            setStatusEmAndamento(checked as boolean);
                            if (checked) {
                              setStatusFinalizada(false);
                              setStatusReagendada(false);
                              setStatusCancelada(false);
                              setStatusEditado('em_andamento');
                              // Preencher hora de entrada automaticamente
                              if (!horarioEntrada) {
                                const agora = new Date();
                                const horas = String(agora.getHours()).padStart(2, '0');
                                const minutos = String(agora.getMinutes()).padStart(2, '0');
                                setHorarioEntrada(`${horas}:${minutos}`);
                              }
                            } else {
                              setStatusEditado(osSelecionada?.status || 'atribuida');
                            }
                          }}
                        />
                        <Label htmlFor="status_em_andamento" className="cursor-pointer">
                          Em Andamento
                        </Label>
            </div>

                      {/* Finalizada - só disponível se estiver em andamento */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="status_finalizada"
                          checked={statusFinalizada}
                          disabled={
                            (!statusEmAndamento && 
                             osSelecionada?.status !== 'em_andamento' && 
                             osSelecionada?.status !== 'pre_finalizada') ||
                            statusReagendada ||
                            (osSelecionada?.status === 'finalizada' && !statusEmAndamento && osSelecionada?.status !== 'em_andamento')
                          }
                          onCheckedChange={(checked) => {
                            setStatusFinalizada(checked as boolean);
                            if (checked) {
                              setStatusReagendada(false);
                              setStatusCancelada(false);
                              setStatusEditado('finalizada');
                              // Preencher hora de saída automaticamente
                              if (!horarioSaida) {
                                const agora = new Date();
                                const horas = String(agora.getHours()).padStart(2, '0');
                                const minutos = String(agora.getMinutes()).padStart(2, '0');
                                setHorarioSaida(`${horas}:${minutos}`);
                              }
                            }
                          }}
                        />
                        <Label htmlFor="status_finalizada" className="cursor-pointer">
                          Finalizada
                        </Label>
                      </div>

                      {/* Reagendada - sempre disponível (exceto se finalizada) */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="status_reagendada"
                          checked={statusReagendada}
                          disabled={
                            statusFinalizada ||
                            osSelecionada?.status === 'finalizada'
                          }
                          onCheckedChange={(checked) => {
                            setStatusReagendada(checked as boolean);
                            if (checked) {
                              setStatusFinalizada(false);
                              setStatusCancelada(false);
                              setStatusEditado('reagendada');
                              const agora = new Date();
                              const horas = String(agora.getHours()).padStart(2, '0');
                              const minutos = String(agora.getMinutes()).padStart(2, '0');
                              const h = `${horas}:${minutos}`;
                              if (!horarioEntrada) setHorarioEntrada(h);
                              if (!horarioSaida) setHorarioSaida(h);
                            }
                          }}
                        />
                        <Label htmlFor="status_reagendada" className="cursor-pointer">
                          Reagendada
                        </Label>
                      </div>

                      {/* Cancelada - só disponível se status for atribuida ou pendente */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="status_cancelada"
                          checked={statusCancelada}
                          disabled={
                            statusEmAndamento || 
                            osSelecionada?.status === 'em_andamento' || 
                            osSelecionada?.status === 'pre_finalizada' ||
                            statusFinalizada ||
                            statusReagendada
                          }
                          onCheckedChange={(checked) => {
                            setStatusCancelada(checked as boolean);
                            if (checked) {
                              setStatusEmAndamento(false);
                              setStatusFinalizada(false);
                              setStatusReagendada(false);
                              setStatusEditado('cancelada');
                              const agora = new Date();
                              const horas = String(agora.getHours()).padStart(2, '0');
                              const minutos = String(agora.getMinutes()).padStart(2, '0');
                              const h = `${horas}:${minutos}`;
                              if (!horarioEntrada) setHorarioEntrada(h);
                              if (!horarioSaida) setHorarioSaida(h);
                            }
                          }}
                        />
                        <Label htmlFor="status_cancelada" className="cursor-pointer">
                          Cancelada
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Campo condicional para Reagendada */}
                  {statusReagendada && (
                    <div className="space-y-2 border-t pt-4">
                      <Label className="font-semibold">Motivo do Reagendamento *</Label>
                      <Textarea
                        value={motivoReagendamento}
                        onChange={(e) => setMotivoReagendamento(e.target.value)}
                        placeholder="Informe o motivo do reagendamento..."
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Campo condicional para Cancelada */}
                  {statusCancelada && (
                    <div className="space-y-2 border-t pt-4">
                      <Label className="font-semibold">Motivo do Cancelamento *</Label>
                      <Textarea
                        value={motivoCancelamento}
                        onChange={(e) => setMotivoCancelamento(e.target.value)}
                        placeholder="Informe o motivo do cancelamento..."
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Horários - com regras de bloqueio */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                      <Label className="font-semibold">Horário de Entrada</Label>
                <Input
                  type="time"
                  value={horarioEntrada}
                  onChange={(e) => setHorarioEntrada(e.target.value)}
                  placeholder="HH:MM"
                        disabled={
                          // Se OS já está finalizada, sempre bloqueado
                          osSelecionada?.status === 'finalizada' ||
                          // Se nenhum checkbox relevante está marcado, bloqueado
                          (!statusEmAndamento && !statusFinalizada && !statusReagendada &&
                           osSelecionada?.status !== 'em_andamento' &&
                           osSelecionada?.status !== 'pre_finalizada' &&
                           osSelecionada?.status !== 'reagendada')
                        }
                />
              </div>
              <div className="space-y-2">
                      <Label className="font-semibold">Horário de Saída</Label>
                <Input
                  type="time"
                  value={horarioSaida}
                  onChange={(e) => setHorarioSaida(e.target.value)}
                  placeholder="HH:MM"
                        disabled={
                          // Se OS já está finalizada, sempre bloqueado
                          osSelecionada?.status === 'finalizada' ||
                          // Se nenhum checkbox relevante está marcado, bloqueado
                          (!statusFinalizada && !statusReagendada && !statusCancelada &&
                           osSelecionada?.status !== 'finalizada' &&
                           osSelecionada?.status !== 'reagendada' &&
                           osSelecionada?.status !== 'cancelada')
                        }
                />
              </div>
            </div>

                  <div className="space-y-2">
                    <Label className="font-semibold">Observações</Label>
                    <Textarea
                      value={observacoesEditado}
                      onChange={(e) => setObservacoesEditado(e.target.value)}
                      placeholder="Adicione observações sobre a OS..."
                      rows={4}
                      disabled={statusFinalizada && osSelecionada?.status === 'finalizada'}
                    />
                  </div>

                  {/* Checkbox Serviço Pago - só aparece se tiver serviço cobrado */}
                  {osSelecionada?.servico_cobrado && osSelecionada?.valor && (
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="servico_pago"
                          checked={servicoPago}
                          onCheckedChange={(checked) => {
                            setServicoPago(checked as boolean);
                            // Se desmarcar, limpar valor pago e forma de pagamento
                            if (!checked) {
                              setValorPago(undefined);
                              setFormaPagamento('');
                            } else {
                              // Se marcar, definir valor pago como o valor cobrado por padrão
                              if (!valorPago) {
                                setValorPago(osSelecionada.valor);
                              }
                            }
                          }}
                          disabled={statusFinalizada && osSelecionada?.status === 'finalizada'}
                        />
                        <Label htmlFor="servico_pago" className="font-semibold cursor-pointer">
                          Serviço Pago
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Valor cobrado: R$ {osSelecionada.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      
                      {/* Campos de pagamento - só aparecem se serviço pago estiver marcado */}
                      {servicoPago && (
                        <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                          <div className="space-y-2">
                            <Label htmlFor="valor_pago" className="text-sm font-medium flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Valor Pago (R$)
                            </Label>
                            <Input
                              id="valor_pago"
                              type="number"
                              step="0.01"
                              min="0"
                              value={valorPago || ''}
                              onChange={(e) => {
                                const valor = e.target.value ? parseFloat(e.target.value) : undefined;
                                setValorPago(valor);
                              }}
                              placeholder={`${osSelecionada.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              disabled={statusFinalizada && osSelecionada?.status === 'finalizada'}
                              className="max-w-[200px]"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="forma_pagamento" className="text-sm font-medium">
                              Forma de Pagamento
                            </Label>
                            <Select
                              value={formaPagamento}
                              onValueChange={setFormaPagamento}
                              disabled={statusFinalizada && osSelecionada?.status === 'finalizada'}
                            >
                              <SelectTrigger className="max-w-[200px]">
                                <SelectValue placeholder="Selecione a forma de pagamento" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="PIX">PIX</SelectItem>
                                <SelectItem value="CC">Cartão de Crédito</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
              </div>
            )}
                </div>

                {/* Ações — apenas controlador; técnico só vê Status e horários */}
                {!isTecnico && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg text-gray-900">Ações</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDialogTransferirAberto(true);
                      }}
                      className="flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-white"
                      disabled={osSelecionada?.status === 'finalizada' || osSelecionada?.status === 'cancelada'}
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      Transferir
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => osSelecionada && handleVoltarPendente(osSelecionada.id)}
                      className="flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-white"
                      disabled={osSelecionada?.status === 'finalizada' || osSelecionada?.status === 'cancelada'}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar para Pendentes
                    </Button>
                    {osSelecionada?.telefone ? (
                      <a
                        href={gerarLinkWhatsApp(osSelecionada.telefone, gerarMensagemPorStatus(osSelecionada))}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 border-green-500 hover:border-green-600 text-white"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </Button>
                      </a>
                    ) : (
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 opacity-50 cursor-not-allowed"
                        disabled
                        title="Telefone não disponível"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </Button>
                    )}
                  </div>
                  
                  {/* Botão para reabrir OS cancelada — somente controlador */}
                  {osSelecionada?.status === 'cancelada' && (
                    <div className="space-y-2 border-t pt-4">
                      <h4 className="font-semibold text-md text-gray-900">Reabrir OS</h4>
                      <Button
                        variant="outline"
                        onClick={() => osSelecionada && handleReabrirOS(osSelecionada.id)}
                        className="flex items-center gap-2 border-green-600 text-green-600 hover:bg-green-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reabrir OS (Voltar para Pendentes)
                      </Button>
                    </div>
                  )}

                  {/* Botão para reabrir OS finalizada — somente controlador */}
                  {osSelecionada?.status === 'finalizada' && (
                    <div className="space-y-2 border-t pt-4">
                      <h4 className="font-semibold text-md text-gray-900">Reabrir OS</h4>
                      <Button
                        variant="outline"
                        onClick={() => osSelecionada && handleReabrirOSFinalizada(osSelecionada.id)}
                        className="flex items-center gap-2 border-green-600 text-green-600 hover:bg-green-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reabrir OS (Voltar para Pendentes)
                      </Button>
                    </div>
                  )}
                </div>
                )}
              </TabsContent>

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
                          const v = getStatusVisual(os.status);
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
                              <TableCell className="text-xs py-2 px-2">
                                {os.tipo_servico === 'Retirada' ? 'RET' : (os.tipo_servico || '—')}
                              </TableCell>
                              <TableCell className="text-xs py-2 px-2">
                                <Badge variant="outline" className={cn("text-[11px] py-0 px-1.5", getStatusBadgeClass(v.color))}>
                                  {v.label}
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
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50">
            <Button variant="outline" onClick={() => {
              setDialogAberto(false);
              setOsSelecionada(null);
              setStatusEditado('pendente');
              setStatusEmAndamento(false);
              setStatusFinalizada(false);
              setStatusReagendada(false);
              setStatusCancelada(false);
              setHorarioEntrada('');
              setHorarioSaida('');
              setObservacoesEditado('');
              setMotivoCancelamento('');
              setMotivoReagendamento('');
              setServicoPago(false);
              setValorPago(undefined);
              setFormaPagamento('');
            }}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarOS} className="bg-primary hover:bg-primary/90">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para transferir OS */}
      <Dialog open={dialogTransferirAberto} onOpenChange={setDialogTransferirAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir OS {osSelecionada?.codigo_os}</DialogTitle>
            <DialogDescription>
              Selecione o técnico para o qual deseja transferir esta OS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Técnico</Label>
              <Select value={tecnicoTransferir} onValueChange={setTecnicoTransferir}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o técnico" />
                </SelectTrigger>
                <SelectContent>
                  {tecnicosRoteiro
                    .filter((t) => t.id !== osSelecionada?.tecnico_id)
                    .map((tecnico) => (
                      <SelectItem key={tecnico.id} value={tecnico.id}>
                        {tecnico.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTransferirAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTransferir} disabled={!tecnicoTransferir}>
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
