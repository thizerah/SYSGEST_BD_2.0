import React, { useState } from 'react';
import { useLocalStorageMonitor } from '@/hooks/useLocalStorageMonitor';
import useData from '@/context/useData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImportDataAnalyzer } from './ImportDataAnalyzer';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
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
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  HardDrive, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Info,
  Trash2,
  AlertCircle
} from 'lucide-react';

export function LocalStorageMonitor() {
  const { stats, refreshStats } = useLocalStorageMonitor();
  const { clearData } = useData();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Função para limpar apenas dados do sistema
  const clearSystemData = () => {
    clearData(); // Usa a função do contexto que já limpa localStorage + estado
    refreshStats();
    toast({
      title: "Dados do Sistema Limpos",
      description: "Todos os dados das planilhas foram removidos com sucesso.",
      variant: "default"
    });
  };

  // Função para limpar dados específicos por tipo
  const clearDataByType = (type: 'Dados' | 'Cache' | 'Configuração') => {
    const itemsToRemove = stats.items.filter(item => item.type === type);
    
    itemsToRemove.forEach(item => {
      localStorage.removeItem(item.key);
    });
    
    refreshStats();
    toast({
      title: `${type} Removidos`,
      description: `${itemsToRemove.length} itens do tipo "${type}" foram removidos.`,
      variant: "default"
    });
  };

  // Função para limpar TODO o localStorage (perigosa)
  const clearAllLocalStorage = () => {
    localStorage.clear();
    refreshStats();
    toast({
      title: "localStorage Completamente Limpo",
      description: "TODOS os dados foram removidos. Você pode precisar fazer login novamente.",
      variant: "destructive"
    });
  };

  // Função para remover item específico
  const removeSpecificItem = (key: string) => {
    localStorage.removeItem(key);
    refreshStats();
    toast({
      title: "Item Removido",
      description: `Item "${key}" foi removido com sucesso.`,
      variant: "default"
    });
  };

  const getPerformanceColor = (impact: string) => {
    switch (impact) {
      case 'Alta': return 'text-green-600';
      case 'Média': return 'text-yellow-600';
      case 'Baixa': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPerformanceIcon = (impact: string) => {
    switch (impact) {
      case 'Alta': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Média': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'Baixa': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRenewalColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 font-bold';
    if (percentage >= 75) return 'text-yellow-600 font-semibold';
    if (percentage >= 50) return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white hover:bg-sysgest-teal px-3 py-1 h-auto flex items-center space-x-2"
        >
          <Database className="h-4 w-4" />
          <div className="text-xs">
            <div className="hidden md:block">
              <div className="flex items-center space-x-1">
                <span>Storage:</span>
                <span className={stats.usagePercentage > 70 ? 'text-yellow-300 font-bold' : 'text-white'}>
                  {stats.usagePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center space-x-1">
                              <span>Performance:</span>
              <span className={
                stats.performanceImpact === 'Alta' ? 'text-green-300' :
                stats.performanceImpact === 'Média' ? 'text-yellow-300' :
                stats.performanceImpact === 'Baixa' ? 'text-red-300' : 'text-white'
              }>
                {stats.performanceImpact}
              </span>
              </div>
            </div>
            <div className="md:hidden">
              <span className={stats.usagePercentage > 70 ? 'text-yellow-300 font-bold' : 'text-white'}>
                {stats.usagePercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Monitor de Armazenamento Local</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshStats}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo Geral */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Uso do Storage</p>
                    <p className="text-2xl font-bold">{stats.usagePercentage.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">
                      {(stats.usedSize / 1024 / 1024).toFixed(2)} MB de {(stats.totalSize / 1024 / 1024).toFixed(0)} MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  {getPerformanceIcon(stats.performanceImpact)}
                  <div>
                    <p className="text-sm font-medium">Performance</p>
                    <p className={`text-2xl font-bold ${getPerformanceColor(stats.performanceImpact)}`}>
                      {stats.performanceImpact}
                    </p>
                    <p className="text-xs text-muted-foreground">Impacto no sistema</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Renovação</p>
                    <p className={`text-2xl font-bold ${getRenewalColor(stats.renewalSuggestion)}`}>
                      {stats.renewalSuggestion > 0 ? `${stats.renewalSuggestion}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stats.renewalSuggestion > 0 ? 'Sugestão' : 'Sem necessidade'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uso do Armazenamento</span>
              <span>{stats.usagePercentage.toFixed(1)}%</span>
            </div>
            <Progress 
              value={stats.usagePercentage} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Recomendações */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center space-x-2">
                <Info className="h-4 w-4" />
                <span>Recomendações</span>
              </h3>
              <div className="space-y-2">
                {stats.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-sm">{recommendation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detalhes dos Arquivos */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Arquivos por Tamanho</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {stats.items.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.key}</p>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{item.sizeFormatted}</p>
                        <p className="text-xs text-muted-foreground">
                          {((item.size / stats.usedSize) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Item</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover o item "{item.key}"?
                              <br />
                              <span className="text-sm text-muted-foreground">
                                Tamanho: {item.sizeFormatted} • Tipo: {item.type}
                              </span>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => removeSpecificItem(item.key)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
                {stats.items.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    ... e mais {stats.items.length - 10} arquivos
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Distribuição por Tipo */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Distribuição por Tipo</h3>
              <div className="space-y-3">
                {['Dados', 'Configuração', 'Cache', 'Outros'].map(type => {
                  const typeItems = stats.items.filter(item => item.type === type);
                  const typeSize = typeItems.reduce((acc, item) => acc + item.size, 0);
                  const typePercentage = stats.usedSize > 0 ? (typeSize / stats.usedSize) * 100 : 0;
                  
                  if (typeItems.length === 0) return null;
                  
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{type} ({typeItems.length} arquivos)</span>
                        <span className="font-semibold">
                          {(typeSize / 1024 / 1024).toFixed(2)} MB ({typePercentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={typePercentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Ações de Limpeza */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center space-x-2">
                <Trash2 className="h-4 w-4 text-red-600" />
                <span>Ações de Limpeza</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Limpar apenas dados do sistema */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <Database className="h-4 w-4 mr-2" />
                      Limpar Dados das Planilhas
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <span>Limpar Dados das Planilhas</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá remover todos os dados importados das planilhas (vendas, ordens de serviço, pagamentos, metas). 
                        Suas configurações e tokens de autenticação serão preservados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={clearSystemData} className="bg-orange-600 hover:bg-orange-700">
                        Confirmar Limpeza
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Limpar dados por tipo */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <Info className="h-4 w-4 mr-2" />
                      Limpar Cache/Temporários
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar Dados Temporários</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá remover apenas dados de cache e arquivos temporários, 
                        mantendo seus dados importantes e configurações.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => clearDataByType('Cache')}>
                        Limpar Cache
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Limpar TUDO (perigoso) */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="justify-start">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Limpar Tudo (Perigoso)
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center space-x-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        <span>⚠️ AÇÃO PERIGOSA ⚠️</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p className="font-semibold text-red-600">
                          Esta ação irá remover TODOS os dados do localStorage, incluindo:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>Todos os dados das planilhas</li>
                          <li>Configurações do sistema</li>
                          <li>Tokens de autenticação</li>
                          <li>Preferências do usuário</li>
                        </ul>
                        <p className="text-red-600 font-semibold">
                          Você pode precisar fazer login novamente!
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={clearAllLocalStorage} 
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Confirmar - Limpar TUDO
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Botão de atualização rápida */}
                <Button 
                  variant="outline" 
                  onClick={refreshStats}
                  className="justify-start"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar Monitor
                </Button>
              </div>

              {/* Informações sobre os tipos de dados */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 Informações:</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>Dados das Planilhas:</strong> Remove vendas, OS, pagamentos, metas (recomendado para limpeza)</p>
                  <p><strong>Cache/Temporários:</strong> Remove apenas arquivos temporários (seguro)</p>
                  <p><strong>Limpar Tudo:</strong> Remove absolutamente tudo (use com cuidado)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Análise dos Dados Importados */}
          <ImportDataAnalyzer />
        </div>
      </DialogContent>
    </Dialog>
  );
} 