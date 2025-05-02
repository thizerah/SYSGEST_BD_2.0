import { useState } from "react";
import useData from "@/context/useData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  }>({
    technician: "",
    serviceType: "",
    status: "",
    city: "",
    neighborhood: "",
    motivo: ""
  });
  const itemsPerPage = 10;
  
  // Use filteredOrders if provided, otherwise use all serviceOrders
  const baseOrders = filteredOrders || serviceOrders;
  
  // Get unique values for filters from the base orders
  const technicians = Array.from(new Set(baseOrders.map(o => o.nome_tecnico))).filter(Boolean);
  const serviceTypes = Array.from(new Set(baseOrders.map(o => o.subtipo_servico))).filter(Boolean);
  const statuses = Array.from(new Set(baseOrders.map(o => o.status))).filter(Boolean);
  const cities = Array.from(new Set(baseOrders.map(o => o.cidade))).filter(Boolean);
  const neighborhoods = Array.from(new Set(baseOrders.map(o => o.bairro))).filter(Boolean);
  const motivos = Array.from(new Set(baseOrders.map(o => o.motivo))).filter(Boolean);
  
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
      (order.info_endereco_completo && order.info_endereco_completo.toLowerCase().includes(searchTerm));
    
    const matchesTechnician = !filter.technician || filter.technician === "all" || order.nome_tecnico === filter.technician;
    const matchesServiceType = !filter.serviceType || filter.serviceType === "all" || order.subtipo_servico === filter.serviceType;
    const matchesStatus = !filter.status || filter.status === "all" || order.status === filter.status;
    const matchesCity = !filter.city || filter.city === "all" || order.cidade === filter.city;
    const matchesNeighborhood = !filter.neighborhood || filter.neighborhood === "all" || order.bairro === filter.neighborhood;
    const matchesMotivo = !filter.motivo || filter.motivo === "all" || order.motivo === filter.motivo;
    
    return matchesSearch && matchesTechnician && matchesServiceType && matchesStatus && matchesCity && matchesNeighborhood && matchesMotivo;
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
      motivo: ""
    });
    setSearch("");
    setPage(1);
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Ordens de Serviço
          </CardTitle>
          
          <div className="flex flex-col md:flex-row items-end md:items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ordens..."
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center">
                  <Filter className="h-4 w-4 mr-1" />
                  Filtros
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Filtrar por:</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Técnico filter */}
                <div className="p-2">
                  <label className="text-xs font-medium mb-1 block">Técnico</label>
                  <Select 
                    value={filter.technician} 
                    onValueChange={(value) => setFilter({...filter, technician: value})}
                  >
                    <SelectTrigger className="h-8">
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
                
                {/* Tipo de serviço filter */}
                <div className="p-2">
                  <label className="text-xs font-medium mb-1 block">Tipo de Serviço</label>
                  <Select 
                    value={filter.serviceType} 
                    onValueChange={(value) => setFilter({...filter, serviceType: value})}
                  >
                    <SelectTrigger className="h-8">
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
                
                {/* Status filter */}
                <div className="p-2">
                  <label className="text-xs font-medium mb-1 block">Status</label>
                  <Select 
                    value={filter.status} 
                    onValueChange={(value) => setFilter({...filter, status: value})}
                  >
                    <SelectTrigger className="h-8">
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
                
                {/* Cidade filter */}
                <div className="p-2">
                  <label className="text-xs font-medium mb-1 block">Cidade</label>
                  <Select 
                    value={filter.city} 
                    onValueChange={(value) => setFilter({...filter, city: value})}
                  >
                    <SelectTrigger className="h-8">
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
                
                {/* Bairro filter */}
                <div className="p-2">
                  <label className="text-xs font-medium mb-1 block">Bairro</label>
                  <Select 
                    value={filter.neighborhood} 
                    onValueChange={(value) => setFilter({...filter, neighborhood: value})}
                  >
                    <SelectTrigger className="h-8">
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
                
                {/* Motivo filter */}
                <div className="p-2">
                  <label className="text-xs font-medium mb-1 block">Motivo</label>
                  <Select 
                    value={filter.motivo} 
                    onValueChange={(value) => setFilter({...filter, motivo: value})}
                  >
                    <SelectTrigger className="h-8">
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
                
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button variant="secondary" size="sm" onClick={resetFilters} className="w-full">
                    Limpar Filtros
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {(filter.technician || filter.serviceType || filter.status || filter.city || filter.neighborhood || filter.motivo) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {filter.technician && (
              <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                Técnico: {filter.technician}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => setFilter({...filter, technician: ""})}
                />
              </div>
            )}
            {filter.serviceType && (
              <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                Tipo: {filter.serviceType}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => setFilter({...filter, serviceType: ""})}
                />
              </div>
            )}
            {filter.status && (
              <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                Status: {filter.status}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => setFilter({...filter, status: ""})}
                />
              </div>
            )}
            {filter.city && (
              <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                Cidade: {filter.city}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => setFilter({...filter, city: ""})}
                />
              </div>
            )}
            {filter.neighborhood && (
              <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                Bairro: {filter.neighborhood}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => setFilter({...filter, neighborhood: ""})}
                />
              </div>
            )}
            {filter.motivo && (
              <div className="bg-muted text-xs rounded-full px-3 py-1 inline-flex items-center">
                Motivo: {filter.motivo}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer" 
                  onClick={() => setFilter({...filter, motivo: ""})}
                />
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
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
                      <TableCell colSpan={8} className="text-center py-4">
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
                  Mostrando {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, filteredTableOrders.length)} de {filteredTableOrders.length} resultados
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
                  
                  <span className="text-sm">
                    {page} de {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma ordem de serviço disponível.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Importe dados usando o formulário de importação.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
