import { useState, useEffect } from 'react';
import { ServiceOrder } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  User, 
  Wrench, 
  MessageSquare, 
  FileText,
  MapPin,
  Phone,
  Calendar,
  Hash,
  UserCircle,
  Building2,
  AlertCircle
} from 'lucide-react';
import useData from '@/context/useData';

interface EditServiceOrderModalProps {
  order: ServiceOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedOrder: ServiceOrder) => Promise<void>;
}

export function EditServiceOrderModal({ 
  order, 
  open, 
  onOpenChange,
  onSave 
}: EditServiceOrderModalProps) {
  const { serviceOrders } = useData();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<ServiceOrder>>({});

  // Carregar dados da OS quando o modal abrir
  useEffect(() => {
    if (order && open) {
      setFormData({
        ...order,
        // Garantir que datas estejam no formato correto para input[type="datetime-local"]
        data_criacao: order.data_criacao ? formatDateTimeForInput(order.data_criacao) : '',
        data_finalizacao: order.data_finalizacao ? formatDateTimeForInput(order.data_finalizacao) : '',
      });
    }
  }, [order, open]);

  // Formatar data para input datetime-local (YYYY-MM-DDTHH:mm)
  const formatDateTimeForInput = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Formato: YYYY-MM-DDTHH:mm
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  // Formatar data de volta para ISO string
  const formatDateTimeFromInput = (inputValue: string): string => {
    if (!inputValue) return '';
    try {
      return new Date(inputValue).toISOString();
    } catch {
      return '';
    }
  };

  const handleSave = async () => {
    if (!order) return;

    setSaving(true);
    try {
      // Criar objeto atualizado mantendo campos read-only
      const updatedOrder: ServiceOrder = {
        ...order, // Manter todos os campos originais
        // Atualizar apenas campos editáveis
        status: formData.status || order.status,
        id_tecnico: formData.id_tecnico || order.id_tecnico,
        nome_tecnico: formData.nome_tecnico || order.nome_tecnico,
        sigla_tecnico: formData.sigla_tecnico || order.sigla_tecnico,
        subtipo_servico: formData.subtipo_servico || order.subtipo_servico,
        motivo: formData.motivo || order.motivo,
        acao_tomada: formData.acao_tomada || order.acao_tomada || null,
        codigo_cliente: formData.codigo_cliente || order.codigo_cliente,
        nome_cliente: formData.nome_cliente || order.nome_cliente,
        telefone_celular: formData.telefone_celular || order.telefone_celular || null,
        cidade: formData.cidade || order.cidade,
        bairro: formData.bairro || order.bairro,
        data_criacao: formData.data_criacao 
          ? formatDateTimeFromInput(formData.data_criacao) 
          : order.data_criacao,
        data_finalizacao: formData.data_finalizacao 
          ? formatDateTimeFromInput(formData.data_finalizacao) 
          : order.data_finalizacao,
      };

      await onSave(updatedOrder);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar OS:', error);
    } finally {
      setSaving(false);
    }
  };

  // Extrair lista de técnicos únicos por NOME (filtrar vazios e duplicatas)
  const uniqueTechnicians = (() => {
    const techMap = new Map<string, { id: string; nome: string; sigla: string }>();
    
    serviceOrders
      .filter(o => o.nome_tecnico && o.nome_tecnico.trim() !== '' && o.id_tecnico && o.id_tecnico.trim() !== '')
      .forEach(o => {
        const nome = o.nome_tecnico.trim();
        // Adicionar apenas se o nome ainda não existe no Map
        if (!techMap.has(nome)) {
          techMap.set(nome, {
            id: o.id_tecnico,
            nome: o.nome_tecnico,
            sigla: o.sigla_tecnico
          });
        }
      });
    
    // Retornar array ordenado por nome
    return Array.from(techMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  })();

  // Extrair lista de tipos de serviço únicos (filtrar vazios)
  const uniqueServiceTypes = Array.from(
    new Set(
      serviceOrders
        .map(o => o.subtipo_servico)
        .filter(type => type && type.trim() !== '') // Filtrar strings vazias
    )
  );

  // Extrair lista de status únicos (filtrar vazios)
  const uniqueStatuses = Array.from(
    new Set(
      serviceOrders
        .map(o => o.status)
        .filter(status => status && status.trim() !== '') // Filtrar strings vazias
    )
  );

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Editar Ordem de Serviço
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Atualize as informações da ordem de serviço
              </p>
            </div>
            <Badge 
              variant={formData.status?.toLowerCase().includes('finalizada') ? 'default' : 'secondary'}
              className="text-xs px-3 py-1"
            >
              {formData.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seção: Identificação (Read-Only) */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800">Identificação</h3>
              <Badge variant="outline" className="text-xs">Somente leitura</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5" />
                  Código OS
                </Label>
                <Input 
                  value={order.codigo_os} 
                  disabled 
                  className="bg-white border-gray-300 cursor-not-allowed font-mono text-sm"
                />
              </div>
              
              {order.codigo_item && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5" />
                    Código Item
                  </Label>
                  <Input 
                    value={order.codigo_item} 
                    disabled 
                    className="bg-white border-gray-300 cursor-not-allowed font-mono text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Seção: Status e Técnico */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Status e Responsável</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  Status *
                </Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status" className="bg-white border-blue-300 hover:border-blue-400 transition-colors">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tecnico" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-blue-600" />
                  Técnico *
                </Label>
                <Select 
                  value={formData.nome_tecnico} 
                  onValueChange={(value) => {
                    const tech = uniqueTechnicians.find(t => t.nome === value);
                    if (tech) {
                      setFormData({ 
                        ...formData, 
                        id_tecnico: tech.id,
                        nome_tecnico: tech.nome,
                        sigla_tecnico: tech.sigla
                      });
                    }
                  }}
                >
                  <SelectTrigger id="tecnico" className="bg-white border-blue-300 hover:border-blue-400 transition-colors">
                    <SelectValue placeholder="Selecione o técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueTechnicians.map(tech => (
                      <SelectItem key={tech.nome} value={tech.nome}>
                        {tech.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção: Serviço */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-800">Detalhes do Serviço</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_servico" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-purple-600" />
                  Tipo de Serviço *
                </Label>
                <Select 
                  value={formData.subtipo_servico} 
                  onValueChange={(value) => setFormData({ ...formData, subtipo_servico: value })}
                >
                  <SelectTrigger id="tipo_servico" className="bg-white border-purple-300 hover:border-purple-400 transition-colors">
                    <SelectValue placeholder="Selecione o tipo de serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueServiceTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                  Motivo *
                </Label>
                <Input
                  id="motivo"
                  value={formData.motivo || ''}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  placeholder="Motivo da OS"
                  className="bg-white border-purple-300 hover:border-purple-400 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acao_tomada" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Ação Tomada
                </Label>
                <Textarea
                  id="acao_tomada"
                  value={formData.acao_tomada || ''}
                  onChange={(e) => setFormData({ ...formData, acao_tomada: e.target.value })}
                  placeholder="Descreva a ação tomada"
                  rows={3}
                  className="bg-white border-purple-300 hover:border-purple-400 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Seção: Cliente */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Informações do Cliente</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo_cliente" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-green-600" />
                    Código Cliente *
                  </Label>
                  <Input
                    id="codigo_cliente"
                    value={formData.codigo_cliente || ''}
                    onChange={(e) => setFormData({ ...formData, codigo_cliente: e.target.value })}
                    placeholder="Código do cliente"
                    className="bg-white border-green-300 hover:border-green-400 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome_cliente" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-green-600" />
                    Nome Cliente *
                  </Label>
                  <Input
                    id="nome_cliente"
                    value={formData.nome_cliente || ''}
                    onChange={(e) => setFormData({ ...formData, nome_cliente: e.target.value })}
                    placeholder="Nome do cliente"
                    className="bg-white border-green-300 hover:border-green-400 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-600" />
                  Telefone
                </Label>
                <Input
                  id="telefone"
                  value={formData.telefone_celular || ''}
                  onChange={(e) => setFormData({ ...formData, telefone_celular: e.target.value })}
                  placeholder="Telefone do cliente"
                  className="bg-white border-green-300 hover:border-green-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Seção: Localização */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-800">Localização</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-orange-600" />
                  Cidade *
                </Label>
                <Input
                  id="cidade"
                  value={formData.cidade || ''}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Cidade"
                  className="bg-white border-orange-300 hover:border-orange-400 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairro" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  Bairro *
                </Label>
                <Input
                  id="bairro"
                  value={formData.bairro || ''}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  placeholder="Bairro"
                  className="bg-white border-orange-300 hover:border-orange-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Seção: Datas */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-cyan-600" />
              <h3 className="text-lg font-semibold text-gray-800">Datas</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_criacao" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cyan-600" />
                  Data de Criação *
                </Label>
                <Input
                  id="data_criacao"
                  type="datetime-local"
                  value={formData.data_criacao || ''}
                  onChange={(e) => setFormData({ ...formData, data_criacao: e.target.value })}
                  className="bg-white border-cyan-300 hover:border-cyan-400 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_finalizacao" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cyan-600" />
                  Data de Finalização
                </Label>
                <Input
                  id="data_finalizacao"
                  type="datetime-local"
                  value={formData.data_finalizacao || ''}
                  onChange={(e) => setFormData({ ...formData, data_finalizacao: e.target.value })}
                  className="bg-white border-cyan-300 hover:border-cyan-400 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
