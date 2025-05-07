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
  ChevronDown
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
import { Label } from "@/components/ui/label";
import { ServiceOrder } from "@/types";

interface ServiceOrderTableProps {
  filteredOrders?: ServiceOrder[];
}

export function ServiceOrderTable({ filteredOrders }: ServiceOrderTableProps) {
  const { serviceOrders } = useData();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<{
    technician: string;
    serviceType: string;
    status: string;
    city: string;
    neighborhood: string;
    motivo: string;
    meta: string;
  }>({
    technician: "",
    serviceType: "",
    status: "",
    city: "",
    neighborhood: "",
    motivo: "",
    meta: ""
  });
  const itemsPerPage = 10;
  
  // Use filteredOrders if provided, otherwise use all serviceOrders
  const baseOrders = filteredOrders || serviceOrders;
  
  // Cria uma lista de ordens filtradas com base nos filtros aplicados
  const ordersAfterFilters = useMemo(() => {
    return baseOrders.filter(order => {
      // Verifica cada filtro individualmente
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesServiceType = !filter.serviceType || filter.serviceType === "all" || order.subtipo_servico === filter.serviceType;
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesCity = !filter.city || filter.city === "all" || order.cidade === filter.city;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || order.bairro === filter.neighborhood;
      const matchesMotivo = !filter.motivo || filter.motivo === "all" || order.motivo === filter.motivo;
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      
      return matchesTechnician && matchesServiceType && matchesStatus && matchesCity && matchesNeighborhood && matchesMotivo && matchesMeta;
    });
  }, [baseOrders, filter]);
  
  // Obtém os valores únicos para cada filtro, considerando apenas as ordens que passaram pelos outros filtros
  // Isso garante que cada filtro só mostre opções compatíveis com os outros filtros selecionados
  const technicians = useMemo(() => {
    // Cria uma lista de ordens filtradas pelos outros filtros (exceto o filtro de técnico)
    const relevantOrders = baseOrders.filter(order => {
      const matchesServiceType = !filter.serviceType || filter.serviceType === "all" || order.subtipo_servico === filter.serviceType;
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesCity = !filter.city || filter.city === "all" || order.cidade === filter.city;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || order.bairro === filter.neighborhood;
      const matchesMotivo = !filter.motivo || filter.motivo === "all" || order.motivo === filter.motivo;
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      
      return matchesServiceType && matchesStatus && matchesCity && matchesNeighborhood && matchesMotivo && matchesMeta;
    });
    
    // Extrai os valores únicos para o filtro
    return Array.from(new Set(relevantOrders.map(o => o.nome_tecnico))).filter(Boolean);
  }, [baseOrders, filter.serviceType, filter.status, filter.city, filter.neighborhood, filter.motivo, filter.meta]);
  
  const serviceTypes = useMemo(() => {
    const relevantOrders = baseOrders.filter(order => {
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesCity = !filter.city || filter.city === "all" || order.cidade === filter.city;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || order.bairro === filter.neighborhood;
      const matchesMotivo = !filter.motivo || filter.motivo === "all" || order.motivo === filter.motivo;
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      
      return matchesTechnician && matchesStatus && matchesCity && matchesNeighborhood && matchesMotivo && matchesMeta;
    });
    
    return Array.from(new Set(relevantOrders.map(o => o.subtipo_servico))).filter(Boolean);
  }, [baseOrders, filter.technician, filter.status, filter.city, filter.neighborhood, filter.motivo, filter.meta]);
  
  const statuses = useMemo(() => {
    const relevantOrders = baseOrders.filter(order => {
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesServiceType = !filter.serviceType || filter.serviceType === "all" || order.subtipo_servico === filter.serviceType;
      const matchesCity = !filter.city || filter.city === "all" || order.cidade === filter.city;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || order.bairro === filter.neighborhood;
      const matchesMotivo = !filter.motivo || filter.motivo === "all" || order.motivo === filter.motivo;
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      
      return matchesTechnician && matchesServiceType && matchesCity && matchesNeighborhood && matchesMotivo && matchesMeta;
    });
    
    return Array.from(new Set(relevantOrders.map(o => o.status))).filter(Boolean);
  }, [baseOrders, filter.technician, filter.serviceType, filter.city, filter.neighborhood, filter.motivo, filter.meta]);
  
  const cities = useMemo(() => {
    const relevantOrders = baseOrders.filter(order => {
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesServiceType = !filter.serviceType || filter.serviceType === "all" || order.subtipo_servico === filter.serviceType;
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || order.bairro === filter.neighborhood;
      const matchesMotivo = !filter.motivo || filter.motivo === "all" || order.motivo === filter.motivo;
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      
      return matchesTechnician && matchesServiceType && matchesStatus && matchesNeighborhood && matchesMotivo && matchesMeta;
    });
    
    return Array.from(new Set(relevantOrders.map(o => o.cidade))).filter(Boolean);
  }, [baseOrders, filter.technician, filter.serviceType, filter.status, filter.neighborhood, filter.motivo, filter.meta]);
  
  const neighborhoods = useMemo(() => {
    const relevantOrders = baseOrders.filter(order => {
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesServiceType = !filter.serviceType || filter.serviceType === "all" || order.subtipo_servico === filter.serviceType;
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesCity = !filter.city || filter.city === "all" || order.cidade === filter.city;
      const matchesMotivo = !filter.motivo || filter.motivo === "all" || order.motivo === filter.motivo;
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      
      return matchesTechnician && matchesServiceType && matchesStatus && matchesCity && matchesMotivo && matchesMeta;
    });
    
    return Array.from(new Set(relevantOrders.map(o => o.bairro))).filter(Boolean);
  }, [baseOrders, filter.technician, filter.serviceType, filter.status, filter.city, filter.motivo, filter.meta]);
  
  const motivos = useMemo(() => {
    const relevantOrders = baseOrders.filter(order => {
      const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
      const matchesServiceType = !filter.serviceType || filter.serviceType === "all" || order.subtipo_servico === filter.serviceType;
      const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
      const matchesCity = !filter.city || filter.city === "all" || order.cidade === filter.city;
      const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || order.bairro === filter.neighborhood;
      const matchesMeta = !filter.meta || filter.meta === "all" || 
        (filter.meta === "atingiu" && order.atingiu_meta === true) ||
        (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
      
      return matchesTechnician && matchesServiceType && matchesStatus && matchesCity && matchesNeighborhood && matchesMeta;
    });
    
    return Array.from(new Set(relevantOrders.map(o => o.motivo))).filter(Boolean);
  }, [baseOrders, filter.technician, filter.serviceType, filter.status, filter.city, filter.neighborhood, filter.meta]);
  
  // Apply search and filters
  const filteredTableOrders = baseOrders.filter(order => {
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
    const matchesServiceType = !filter.serviceType || filter.serviceType === "all" || order.subtipo_servico === filter.serviceType;
    const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
    const matchesCity = !filter.city || filter.city === "all" || order.cidade === filter.city;
    const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || order.bairro === filter.neighborhood;
    const matchesMotivo = !filter.motivo || filter.motivo === "all" || order.motivo === filter.motivo;
    const matchesMeta = !filter.meta || filter.meta === "all" || 
      (filter.meta === "atingiu" && order.atingiu_meta === true) ||
      (filter.meta === "nao_atingiu" && order.atingiu_meta === false);
    
    return matchesSearch && matchesTechnician && matchesServiceType && matchesStatus && matchesCity && matchesNeighborhood && matchesMotivo && matchesMeta;
  });
  
  // Pagination
  const totalPages = Math.ceil(filteredTableOrders.length / itemsPerPage);
  const paginatedOrders = filteredTableOrders.slice(
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
  
  // Reset all filters
  const resetFilters = () => {
    setFilter({
      technician: "",
      serviceType: "",
      status: "",
      city: "",
      neighborhood: "",
      motivo: "",
      meta: ""
    });
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
              <Select 
                value={filter.serviceType} 
                onValueChange={(value) => handleFilterChange('serviceType', value)}
              >
                <SelectTrigger id="service-type-filter" className="w-[180px]">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {serviceTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="reason-filter" className="text-xs mb-1 block">Motivo</Label>
              <Select 
                value={filter.motivo} 
                onValueChange={(value) => handleFilterChange('motivo', value)}
              >
                <SelectTrigger id="reason-filter" className="w-[150px]">
                  <SelectValue placeholder="Todos os motivos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os motivos</SelectItem>
                  {motivos.map(motivo => (
                    <SelectItem key={motivo} value={motivo}>{motivo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <SelectItem key={city} value={city}>{city}</SelectItem>
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
                    <SelectItem key={neighborhood} value={neighborhood}>{neighborhood}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          {(filter.technician || filter.serviceType || filter.status || filter.city || filter.neighborhood || filter.motivo || filter.meta) && (
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
              {filter.serviceType && (
                <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                  Tipo: {filter.serviceType}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('serviceType', "")}
                  />
                </div>
              )}
              {filter.motivo && (
                <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                  Motivo: {filter.motivo}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('motivo', "")}
                  />
                </div>
              )}
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
                  Cidade: {filter.city}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('city', "")}
                  />
                </div>
              )}
              {filter.neighborhood && (
                <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                  Bairro: {filter.neighborhood}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={() => handleFilterChange('neighborhood', "")}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Contador de registros */}
          <div className="flex justify-between items-center mt-2 mb-4">
            <div className="text-sm font-medium">
              Total de registros: <span className="font-bold">{filteredTableOrders.length}</span>
            </div>
            {(filter.technician || filter.serviceType || filter.status || filter.city || filter.neighborhood || filter.motivo || filter.meta || search) && (
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
                    <TableHead>Código OS</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Tipo de Serviço</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Ação Tomada</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead>Data de Finalização</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Meta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-4">
                        Nenhuma ordem de serviço encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedOrders.map(order => (
                      <TableRow key={order.codigo_os}>
                        <TableCell className="font-medium">{order.codigo_os}</TableCell>
                        <TableCell>{order.nome_tecnico || "N/A"}</TableCell>
                        <TableCell>{order.subtipo_servico || "N/A"}</TableCell>
                        <TableCell>{order.motivo || "N/A"}</TableCell>
                        <TableCell>{order.acao_tomada || "N/A"}</TableCell>
                        <TableCell>{order.nome_cliente || "N/A"}</TableCell>
                        <TableCell>{formatDate(order.data_criacao)}</TableCell>
                        <TableCell>{formatDate(order.data_finalizacao)}</TableCell>
                        <TableCell>{displayServiceTime(order)}</TableCell>
                        <TableCell>
                          {order.atingiu_meta ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-red-600" />
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
