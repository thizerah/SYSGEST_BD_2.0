import { useState, useMemo } from "react";
import useData from "@/context/useData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  X, 
  Search, 
  Calendar,
  Filter,
  ChevronDown,
  MessageCircle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { ServiceOrder } from "@/types";
import { normalizeCityName, normalizeNeighborhoodName } from '@/context/DataUtils';

interface ServiceOrderTableProps {
  filteredOrders?: ServiceOrder[];
}

export function ServiceOrderTable({ filteredOrders }: ServiceOrderTableProps) {
  const { serviceOrders } = useData();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<{
    technician: string;
    status: string;
    city: string;
    neighborhood: string;
    meta: string;
  }>({
    technician: "",
    status: "",
    city: "",
    neighborhood: "",
    meta: ""
  });
  
  // Estados específicos para filtros de múltipla seleção
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  const [selectedMotivos, setSelectedMotivos] = useState<string[]>([]);
  const itemsPerPage = 10;
  
  // Função para formatar data de finalização para exibição
  const formatDateForFilter = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };
  
  // Função para obter data de finalização no formato dd/mm/yyyy
  const getFinalizationDateKey = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return "";
    }
  };
  
  // Use filteredOrders if provided, otherwise use all serviceOrders
  const baseOrders = filteredOrders || serviceOrders;
  
  // Cria uma lista de ordens filtradas com base nos filtros aplicados
  const ordersAfterFilters = useMemo(() => {
    return baseOrders.filter(order => {
      // Verifica cada filtro individualmente
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesServiceType = selectedServiceTypes.length === 0 || selectedServiceTypes.includes(order.subtipo_servico);
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesCity = !filter.city || filter.city === "all" || normalizeCityName(order.cidade) === filter.city;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || normalizeNeighborhoodName(order.bairro) === filter.neighborhood;
      const matchesMotivo = selectedMotivos.length === 0 || selectedMotivos.includes(order.motivo);
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      const matchesFinalizationDate = selectedDates.length === 0 || 
        selectedDates.includes(getFinalizationDateKey(order.data_finalizacao));
      
      return matchesTechnician && matchesServiceType && matchesStatus && matchesCity && matchesNeighborhood && matchesMotivo && matchesMeta && matchesFinalizationDate;
    });
  }, [baseOrders, filter, selectedDates, selectedServiceTypes, selectedMotivos]);
  
  // Obtém os valores únicos para cada filtro, considerando apenas as ordens que passaram pelos outros filtros
  // Isso garante que cada filtro só mostre opções compatíveis com os outros filtros selecionados
  const technicians = useMemo(() => {
    // Cria uma lista de ordens filtradas pelos outros filtros (exceto o filtro de técnico)
    const relevantOrders = baseOrders.filter(order => {
      const matchesServiceType = selectedServiceTypes.length === 0 || selectedServiceTypes.includes(order.subtipo_servico);
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesCity = !filter.city || filter.city === "all" || normalizeCityName(order.cidade) === filter.city;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || normalizeNeighborhoodName(order.bairro) === filter.neighborhood;
      const matchesMotivo = selectedMotivos.length === 0 || selectedMotivos.includes(order.motivo);
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      const matchesFinalizationDate = selectedDates.length === 0 || 
        selectedDates.includes(getFinalizationDateKey(order.data_finalizacao));
      
      return matchesServiceType && matchesStatus && matchesCity && matchesNeighborhood && matchesMotivo && matchesMeta && matchesFinalizationDate;
    });
    
    // Extrai os valores únicos para o filtro
    return Array.from(new Set(relevantOrders.map(o => o.nome_tecnico))).filter(Boolean);
  }, [baseOrders, selectedServiceTypes, filter.status, filter.city, filter.neighborhood, selectedMotivos, filter.meta, selectedDates]);
  
  const serviceTypes = useMemo(() => {
    const relevantOrders = baseOrders.filter(order => {
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesCity = !filter.city || filter.city === "all" || normalizeCityName(order.cidade) === filter.city;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || normalizeNeighborhoodName(order.bairro) === filter.neighborhood;
      const matchesMotivo = selectedMotivos.length === 0 || selectedMotivos.includes(order.motivo);
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      const matchesFinalizationDate = selectedDates.length === 0 || 
        selectedDates.includes(getFinalizationDateKey(order.data_finalizacao));
      
      return matchesTechnician && matchesStatus && matchesCity && matchesNeighborhood && matchesMotivo && matchesMeta && matchesFinalizationDate;
    });
    
    return Array.from(new Set(relevantOrders.map(o => o.subtipo_servico))).filter(Boolean);
  }, [baseOrders, filter.technician, filter.status, filter.city, filter.neighborhood, selectedMotivos, filter.meta, selectedDates]);
  
  const statuses = useMemo(() => {
    const relevantOrders = baseOrders.filter(order => {
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesServiceType = selectedServiceTypes.length === 0 || selectedServiceTypes.includes(order.subtipo_servico);
      const matchesCity = !filter.city || filter.city === "all" || normalizeCityName(order.cidade) === filter.city;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || normalizeNeighborhoodName(order.bairro) === filter.neighborhood;
      const matchesMotivo = selectedMotivos.length === 0 || selectedMotivos.includes(order.motivo);
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      const matchesFinalizationDate = selectedDates.length === 0 || 
        selectedDates.includes(getFinalizationDateKey(order.data_finalizacao));
      
      return matchesTechnician && matchesServiceType && matchesCity && matchesNeighborhood && matchesMotivo && matchesMeta && matchesFinalizationDate;
    });
    
    return Array.from(new Set(relevantOrders.map(o => o.status))).filter(Boolean);
  }, [baseOrders, filter.technician, selectedServiceTypes, filter.city, filter.neighborhood, selectedMotivos, filter.meta, selectedDates]);
  
  const cities = useMemo(() => {
    const relevantOrders = baseOrders.filter(order => {
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesServiceType = selectedServiceTypes.length === 0 || selectedServiceTypes.includes(order.subtipo_servico);
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || order.bairro === filter.neighborhood;
      const matchesMotivo = selectedMotivos.length === 0 || selectedMotivos.includes(order.motivo);
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      const matchesFinalizationDate = selectedDates.length === 0 || 
        selectedDates.includes(getFinalizationDateKey(order.data_finalizacao));
      
      return matchesTechnician && matchesServiceType && matchesStatus && matchesNeighborhood && matchesMotivo && matchesMeta && matchesFinalizationDate;
    });
    
    // Aplicar a normalização aos nomes das cidades
    const normalizedCities = relevantOrders.map(order => {
      return normalizeCityName(order.cidade);
    });
    
    // Retornar cidades únicas e filtrar valores vazios
    return Array.from(new Set(normalizedCities)).filter(Boolean);
  }, [baseOrders, filter.technician, selectedServiceTypes, filter.status, filter.neighborhood, selectedMotivos, filter.meta, selectedDates]);
  
  const neighborhoods = useMemo(() => {
    const relevantOrders = baseOrders.filter(order => {
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesServiceType = selectedServiceTypes.length === 0 || selectedServiceTypes.includes(order.subtipo_servico);
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesCity = !filter.city || filter.city === "all" || normalizeCityName(order.cidade) === filter.city;
      const matchesMotivo = selectedMotivos.length === 0 || selectedMotivos.includes(order.motivo);
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      const matchesFinalizationDate = selectedDates.length === 0 || 
        selectedDates.includes(getFinalizationDateKey(order.data_finalizacao));
      
      return matchesTechnician && matchesServiceType && matchesStatus && matchesCity && matchesMotivo && matchesMeta && matchesFinalizationDate;
    });
    
    // Aplicar a normalização aos nomes dos bairros
    const normalizedNeighborhoods = relevantOrders.map(order => {
      return normalizeNeighborhoodName(order.bairro);
    });
    
    // Retornar bairros únicos e filtrar valores vazios
    return Array.from(new Set(normalizedNeighborhoods)).filter(Boolean);
  }, [baseOrders, filter.technician, selectedServiceTypes, filter.status, filter.city, selectedMotivos, filter.meta, selectedDates]);
  
  const motivos = useMemo(() => {
    const relevantOrders = baseOrders.filter(order => {
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesServiceType = selectedServiceTypes.length === 0 || selectedServiceTypes.includes(order.subtipo_servico);
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesCity = !filter.city || filter.city === "all" || normalizeCityName(order.cidade) === filter.city;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || normalizeNeighborhoodName(order.bairro) === filter.neighborhood;
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      const matchesFinalizationDate = selectedDates.length === 0 || 
        selectedDates.includes(getFinalizationDateKey(order.data_finalizacao));
      
      return matchesTechnician && matchesServiceType && matchesStatus && matchesCity && matchesNeighborhood && matchesMeta && matchesFinalizationDate;
    });
    
    return Array.from(new Set(relevantOrders.map(o => o.motivo))).filter(Boolean);
  }, [baseOrders, filter.technician, selectedServiceTypes, filter.status, filter.city, filter.neighborhood, filter.meta, selectedDates]);

  // Datas de finalização disponíveis (baseado nos outros filtros)
  const availableFinalizationDates = useMemo(() => {
    const relevantOrders = baseOrders.filter(order => {
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesServiceType = selectedServiceTypes.length === 0 || selectedServiceTypes.includes(order.subtipo_servico);
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesCity = !filter.city || filter.city === "all" || normalizeCityName(order.cidade) === filter.city;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || normalizeNeighborhoodName(order.bairro) === filter.neighborhood;
      const matchesMotivo = selectedMotivos.length === 0 || selectedMotivos.includes(order.motivo);
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      
      return matchesTechnician && matchesServiceType && matchesStatus && matchesCity && matchesNeighborhood && matchesMotivo && matchesMeta;
    });
    
    const dates = relevantOrders
      .map(order => getFinalizationDateKey(order.data_finalizacao))
      .filter(Boolean);
    
    // Retornar datas únicas ordenadas (mais antigas primeiro)
    return Array.from(new Set(dates)).sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });
  }, [baseOrders, filter.technician, selectedServiceTypes, filter.status, filter.city, filter.neighborhood, selectedMotivos, filter.meta]);
  
  // Apply search and filters
  const filteredTableOrders = useMemo(() => {
    // Usar useMemo para este filtro também
    return baseOrders.filter(order => {
      const searchTerm = search.toLowerCase();
      const matchesSearch = 
        order.codigo_os.toLowerCase().includes(searchTerm) ||
        (order.nome_tecnico && order.nome_tecnico.toLowerCase().includes(searchTerm)) ||
        (order.tipo_servico && order.tipo_servico.toLowerCase().includes(searchTerm)) ||
        (order.subtipo_servico && order.subtipo_servico.toLowerCase().includes(searchTerm)) ||
        (order.nome_cliente && order.nome_cliente.toLowerCase().includes(searchTerm)) ||
        (order.motivo && order.motivo.toLowerCase().includes(searchTerm)) ||
        (order.acao_tomada && order.acao_tomada.toLowerCase().includes(searchTerm)) ||
        (order.info_endereco_completo && order.info_endereco_completo.toLowerCase().includes(searchTerm));
      
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesServiceType = selectedServiceTypes.length === 0 || selectedServiceTypes.includes(order.subtipo_servico);
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesCity = !filter.city || filter.city === "all" || normalizeCityName(order.cidade) === filter.city;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || normalizeNeighborhoodName(order.bairro) === filter.neighborhood;
      const matchesMotivo = selectedMotivos.length === 0 || selectedMotivos.includes(order.motivo);
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      const matchesFinalizationDate = selectedDates.length === 0 || 
        selectedDates.includes(getFinalizationDateKey(order.data_finalizacao));
      
      return matchesSearch && matchesTechnician && matchesServiceType && matchesStatus && matchesCity && matchesNeighborhood && matchesMotivo && matchesMeta && matchesFinalizationDate;
    });
  }, [baseOrders, filter, search, selectedDates, selectedServiceTypes, selectedMotivos]);
  
  // Garantir que não existam ordens duplicadas
  const uniqueFilteredOrders = useMemo(() => {
    // Usar um Map para garantir um único registro por código de OS
    const ordersMap = new Map();
    
    filteredTableOrders.forEach(order => {
      // Se ainda não existe uma ordem com este código, adicionar ao Map
      if (!ordersMap.has(order.codigo_os)) {
        ordersMap.set(order.codigo_os, order);
      }
    });
    
    // Converter o Map de volta para um array
    return Array.from(ordersMap.values());
  }, [filteredTableOrders]);
  
  // Pagination
  const totalPages = Math.ceil(uniqueFilteredOrders.length / itemsPerPage);
  const paginatedOrders = uniqueFilteredOrders.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  
  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return "Data inválida";
    }
  };

  // Calculate service time
  const displayServiceTime = (order: ServiceOrder) => {
    // Se tempo_atendimento já estiver calculado, use-o diretamente
    if (order.tempo_atendimento !== undefined && order.tempo_atendimento !== null) {
      return `${order.tempo_atendimento} horas`;
    }
    
    // Caso não esteja calculado (raramente deve ocorrer), faça um cálculo básico
    if (!order.data_criacao || !order.data_finalizacao) return "N/A";
    
    try {
      const start = new Date(order.data_criacao);
      const end = new Date(order.data_finalizacao);
      const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;
      return `${hours} horas`;
    } catch (error) {
      return "Erro no cálculo";
    }
  };
  
  // Formatar a exibição da ação tomada
  const displayAcaoTomada = (order: ServiceOrder) => {
    // Se a ordem estiver finalizada e não tiver ação tomada, exibir "Concluída"
    if (order.status === "Finalizada" && (!order.acao_tomada || order.acao_tomada.trim() === "")) {
      return "Concluída";
    }
    
    // Caso contrário, exibir a ação tomada ou "N/A" se não existir
    return order.acao_tomada || "N/A";
  };
  
  // Reset all filters
  const resetFilters = () => {
    setFilter({
      technician: "",
      status: "",
      city: "",
      neighborhood: "",
      meta: ""
    });
    setSelectedDates([]);
    setSelectedServiceTypes([]);
    setSelectedMotivos([]);
    setSearch("");
    setPage(1);
  };

  // Verificar se um filtro tem apenas uma opção disponível
  const handleFilterChange = (field: string, value: string) => {
    // Atualiza o filtro selecionado
    setFilter(prev => ({...prev, [field]: value}));
    
    // Reset para a primeira página quando mudar qualquer filtro
    setPage(1);
  };

  // Funções para manipular seleção de datas
  const handleDateToggle = (date: string) => {
    setSelectedDates(prev => {
      if (prev.includes(date)) {
        return prev.filter(d => d !== date);
      } else {
        return [...prev, date];
      }
    });
    setPage(1);
  };

  const handleSelectAllDates = () => {
    if (selectedDates.length === availableFinalizationDates.length) {
      setSelectedDates([]);
    } else {
      setSelectedDates([...availableFinalizationDates]);
    }
    setPage(1);
  };

  const removeDateFilter = (date: string) => {
    setSelectedDates(prev => prev.filter(d => d !== date));
    setPage(1);
  };

  // Funções para manipular seleção de tipos de serviço
  const handleServiceTypeToggle = (serviceType: string) => {
    setSelectedServiceTypes(prev => {
      if (prev.includes(serviceType)) {
        return prev.filter(st => st !== serviceType);
      } else {
        return [...prev, serviceType];
      }
    });
    setPage(1);
  };

  const handleSelectAllServiceTypes = () => {
    if (selectedServiceTypes.length === serviceTypes.length) {
      setSelectedServiceTypes([]);
    } else {
      setSelectedServiceTypes([...serviceTypes]);
    }
    setPage(1);
  };

  const removeServiceTypeFilter = (serviceType: string) => {
    setSelectedServiceTypes(prev => prev.filter(st => st !== serviceType));
    setPage(1);
  };

  // Funções para manipular seleção de motivos
  const handleMotivoToggle = (motivo: string) => {
    setSelectedMotivos(prev => {
      if (prev.includes(motivo)) {
        return prev.filter(m => m !== motivo);
      } else {
        return [...prev, motivo];
      }
    });
    setPage(1);
  };

  const handleSelectAllMotivos = () => {
    if (selectedMotivos.length === motivos.length) {
      setSelectedMotivos([]);
    } else {
      setSelectedMotivos([...motivos]);
    }
    setPage(1);
  };

  const removeMotivoFilter = (motivo: string) => {
    setSelectedMotivos(prev => prev.filter(m => m !== motivo));
    setPage(1);
  };

  // Função para gerar link do WhatsApp com a mensagem personalizada
  const gerarLinkWhatsApp = (telefone: string | null | undefined, nomeCliente: string, tipoServico: string, codigoOS: string) => {
    // Verificar se o telefone é válido
    if (!telefone || typeof telefone !== 'string') {
      return '';
    }
    
    // Limpar telefone para conter apenas números
    const telefoneLimpo = telefone.replace(/\D/g, '');
    
    // Verificar se o telefone tem pelo menos 10 dígitos (DDD + número)
    if (telefoneLimpo.length < 10) {
      return '';
    }
    
    // Montar a mensagem personalizada
    const mensagem = `Olá ${nomeCliente}!\nPassando para confirmar se está tudo certo com o atendimento da SKY que fizemos aí, referente a ${tipoServico} – OS ${codigoOS}.\n\nQualquer coisa é só chamar por aqui! Estamos sempre pela área!\n\nObrigado e um ótimo dia!\n#SKY #Qualidade #Excelência`;
    
    // Codificar a mensagem para URL
    const mensagemCodificada = encodeURIComponent(mensagem);
    
    // Montar o link com o código do país (55)
    return `https://api.whatsapp.com/send?phone=55${telefoneLimpo}&text=${mensagemCodificada}`;
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center">
          <Calendar className="mr-2 h-5 w-5" />
          Ordens de Serviço
        </CardTitle>
        <CardDescription>
          Lista de ordens de serviço com detalhes de tempo e informações técnicas
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Filtros em linha, similar ao componente PermanenciaTabContent */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative">
              <Label htmlFor="search" className="text-xs mb-1 block">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar ordens..."
                  className="pl-8 w-[200px]"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="technician-filter" className="text-xs mb-1 block">Técnico</Label>
              <Select 
                value={filter.technician} 
                onValueChange={(value) => handleFilterChange('technician', value)}
              >
                <SelectTrigger id="technician-filter" className="w-[160px]">
                  <SelectValue placeholder="Todos os técnicos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os técnicos</SelectItem>
                  {technicians.map(tech => (
                    <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="service-type-filter" className="text-xs mb-1 block">Tipo de Serviço</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-[180px] h-10 justify-between"
                    id="service-type-filter"
                  >
                    {selectedServiceTypes.length === 0 
                      ? "Todos os tipos" 
                      : selectedServiceTypes.length === 1 
                        ? selectedServiceTypes[0]
                        : `${selectedServiceTypes.length} tipos selecionados`
                    }
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-3" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Selecionar Tipos</Label>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSelectAllServiceTypes}
                        className="h-7 text-xs"
                      >
                        {selectedServiceTypes.length === serviceTypes.length ? 'Desmarcar' : 'Selecionar'} Todos
                      </Button>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {serviceTypes.map(serviceType => (
                        <div key={serviceType} className="flex items-center space-x-2">
                          <Checkbox
                            id={`serviceType-${serviceType}`}
                            checked={selectedServiceTypes.includes(serviceType)}
                            onCheckedChange={() => handleServiceTypeToggle(serviceType)}
                          />
                          <Label 
                            htmlFor={`serviceType-${serviceType}`} 
                            className="text-sm cursor-pointer flex-1"
                          >
                            {serviceType}
                          </Label>
                        </div>
                      ))}
                      {serviceTypes.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-2">
                          Nenhum tipo disponível
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label htmlFor="reason-filter" className="text-xs mb-1 block">Motivo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-[150px] h-10 justify-between"
                    id="reason-filter"
                  >
                    {selectedMotivos.length === 0 
                      ? "Todos os motivos" 
                      : selectedMotivos.length === 1 
                        ? selectedMotivos[0]
                        : `${selectedMotivos.length} motivos selecionados`
                    }
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-3" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Selecionar Motivos</Label>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSelectAllMotivos}
                        className="h-7 text-xs"
                      >
                        {selectedMotivos.length === motivos.length ? 'Desmarcar' : 'Selecionar'} Todos
                      </Button>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {motivos.map(motivo => (
                        <div key={motivo} className="flex items-center space-x-2">
                          <Checkbox
                            id={`motivo-${motivo}`}
                            checked={selectedMotivos.includes(motivo)}
                            onCheckedChange={() => handleMotivoToggle(motivo)}
                          />
                          <Label 
                            htmlFor={`motivo-${motivo}`} 
                            className="text-sm cursor-pointer flex-1"
                          >
                            {motivo}
                          </Label>
                        </div>
                      ))}
                      {motivos.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-2">
                          Nenhum motivo disponível
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label htmlFor="status-filter" className="text-xs mb-1 block">Status</Label>
              <Select 
                value={filter.status} 
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger id="status-filter" className="w-[150px]">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="meta-filter" className="text-xs mb-1 block">Meta</Label>
              <Select 
                value={filter.meta} 
                onValueChange={(value) => handleFilterChange('meta', value)}
              >
                <SelectTrigger id="meta-filter" className="w-[150px]">
                  <SelectValue placeholder="Todas as metas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as metas</SelectItem>
                  <SelectItem value="atingiu">Atingiu meta</SelectItem>
                  <SelectItem value="nao_atingiu">Não atingiu meta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="city-filter" className="text-xs mb-1 block">Cidade</Label>
              <Select 
                value={filter.city} 
                onValueChange={(value) => handleFilterChange('city', value)}
              >
                <SelectTrigger id="city-filter" className="w-[150px]">
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cidades</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>{city.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="neighborhood-filter" className="text-xs mb-1 block">Bairro</Label>
              <Select 
                value={filter.neighborhood} 
                onValueChange={(value) => handleFilterChange('neighborhood', value)}
              >
                <SelectTrigger id="neighborhood-filter" className="w-[150px]">
                  <SelectValue placeholder="Todos os bairros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os bairros</SelectItem>
                  {neighborhoods.map(neighborhood => (
                    <SelectItem key={neighborhood} value={neighborhood}>{neighborhood.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="date-filter" className="text-xs mb-1 block">Data de Finalização</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-[180px] h-10 justify-between"
                    id="date-filter"
                  >
                    {selectedDates.length === 0 
                      ? "Todas as datas" 
                      : selectedDates.length === 1 
                        ? selectedDates[0]
                        : `${selectedDates.length} datas selecionadas`
                    }
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-3" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Selecionar Datas</Label>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSelectAllDates}
                        className="h-7 text-xs"
                      >
                        {selectedDates.length === availableFinalizationDates.length ? 'Desmarcar' : 'Selecionar'} Todas
                      </Button>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {availableFinalizationDates.map(date => (
                        <div key={date} className="flex items-center space-x-2">
                          <Checkbox
                            id={`date-${date}`}
                            checked={selectedDates.includes(date)}
                            onCheckedChange={() => handleDateToggle(date)}
                          />
                          <Label 
                            htmlFor={`date-${date}`} 
                            className="text-sm cursor-pointer flex-1"
                          >
                            {date}
                          </Label>
                        </div>
                      ))}
                      {availableFinalizationDates.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-2">
                          Nenhuma data disponível
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetFilters} 
                className="h-10"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          {/* Tags de filtros ativos */}
          {(filter.technician || selectedServiceTypes.length > 0 || filter.status || filter.city || filter.neighborhood || selectedMotivos.length > 0 || filter.meta || selectedDates.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-2 mb-2">
              {filter.technician && (
                <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                  Técnico: {filter.technician}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('technician', "")}
                  />
                </div>
              )}
              {selectedServiceTypes.map(serviceType => (
                <div key={serviceType} className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                  Tipo: {serviceType}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => removeServiceTypeFilter(serviceType)}
                  />
                </div>
              ))}
              {selectedMotivos.map(motivo => (
                <div key={motivo} className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                  Motivo: {motivo}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => removeMotivoFilter(motivo)}
                  />
                </div>
              ))}
              {filter.status && (
                <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                  Status: {filter.status}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('status', "")}
                  />
                </div>
              )}
              {filter.meta && (
                <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                  Meta: {filter.meta === "atingiu" ? "Atingiu" : "Não atingiu"}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('meta', "")}
                  />
                </div>
              )}
              {filter.city && (
                <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                  Cidade: {filter.city.toUpperCase()}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('city', "")}
                  />
                </div>
              )}
              {filter.neighborhood && (
                <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                  Bairro: {filter.neighborhood.toUpperCase()}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('neighborhood', "")}
                  />
                </div>
              )}
              {selectedDates.map(date => (
                <div key={date} className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                  Data: {date}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => removeDateFilter(date)}
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Contador de registros */}
          <div className="flex justify-between items-center mt-2 mb-4">
            <div className="text-sm font-medium">
              Total de registros: <span className="font-bold">{uniqueFilteredOrders.length}</span>
            </div>
            {(filter.technician || selectedServiceTypes.length > 0 || filter.status || filter.city || filter.neighborhood || selectedMotivos.length > 0 || filter.meta || search || selectedDates.length > 0) && (
              <div className="text-xs text-muted-foreground">
                * Filtros aplicados
              </div>
            )}
          </div>
        </div>

        {serviceOrders.length > 0 ? (
          <>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs p-2">Código OS</TableHead>
                    <TableHead className="text-xs p-2">Técnico</TableHead>
                    <TableHead className="text-xs p-2">Tipo de Serviço</TableHead>
                    <TableHead className="text-xs p-2">Motivo</TableHead>
                    <TableHead className="text-xs p-2">Ação Tomada</TableHead>
                    <TableHead className="text-xs p-2">Cliente</TableHead>
                    <TableHead className="text-xs p-2">Telefone</TableHead>
                    <TableHead className="text-xs p-2">Data de Criação</TableHead>
                    <TableHead className="text-xs p-2">Data de Finalização</TableHead>
                    <TableHead className="text-xs p-2">Tempo</TableHead>
                    <TableHead className="text-xs p-2">Meta</TableHead>
                    <TableHead className="text-xs p-2">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-4">
                        Nenhuma ordem de serviço encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedOrders.map(order => (
                      <TableRow key={order.codigo_os}>
                        <TableCell className="text-xs p-2 font-medium">{order.codigo_os}</TableCell>
                        <TableCell className="text-xs p-2">{order.nome_tecnico || "N/A"}</TableCell>
                        <TableCell className="text-xs p-2">{order.subtipo_servico || "N/A"}</TableCell>
                        <TableCell className="text-xs p-2">{order.motivo || "N/A"}</TableCell>
                        <TableCell className="text-xs p-2">{displayAcaoTomada(order)}</TableCell>
                        <TableCell className="text-xs p-2">{order.nome_cliente || "N/A"}</TableCell>
                        <TableCell className="text-xs p-2">{order.telefone_celular || "N/A"}</TableCell>
                        <TableCell className="text-xs p-2">{formatDate(order.data_criacao)}</TableCell>
                        <TableCell className="text-xs p-2">{formatDate(order.data_finalizacao)}</TableCell>
                        <TableCell className="text-xs p-2">{displayServiceTime(order)}</TableCell>
                        <TableCell className="text-xs p-2">
                          {order.atingiu_meta ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs p-2">
                          {order.telefone_celular ? (
                            <a
                              href={gerarLinkWhatsApp(
                                order.telefone_celular, 
                                order.nome_cliente || "Cliente", 
                                order.subtipo_servico || "Serviço", 
                                order.codigo_os
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 bg-green-500 hover:bg-green-600 border-green-500 hover:border-green-600"
                                title="Enviar mensagem WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3 text-white" />
                              </Button>
                            </a>
                          ) : (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 opacity-50 cursor-not-allowed"
                              disabled
                              title="Telefone não disponível"
                            >
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {Math.min(filteredTableOrders.length, (page - 1) * itemsPerPage + 1)}-{Math.min(filteredTableOrders.length, page * itemsPerPage)} de {filteredTableOrders.length}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      // Se há 5 páginas ou menos, mostra todas
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      // Se está nas primeiras páginas, mostra 1-5
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      // Se está nas últimas páginas, mostra as últimas 5
                      pageNum = totalPages - 4 + i;
                    } else {
                      // Se está no meio, mostra 2 antes e 2 depois da atual
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum dado disponível</h3>
            <p className="text-muted-foreground">
              Importe ordens de serviço para visualizá-las aqui.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
