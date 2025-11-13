import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Package, Zap, Trophy, Medal, Award } from "lucide-react";
import { useOptimizationCounts } from "@/hooks/useOptimizationCounts";
import { ServiceOrder } from "@/types";
import { ProtectedCard } from "@/components/common/ProtectedCard";
import { useMemo } from "react";

interface OptimizationCountCardProps {
  serviceOrders: ServiceOrder[];
}

export function OptimizationCountCard({ serviceOrders }: OptimizationCountCardProps) {
  const formatBRL = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Log simples comparativo
  const ordersApplicable = serviceOrders.filter(order => {
    return (
      (order.tipo_servico === "Ponto Principal" && order.motivo === "Individual") ||
      (order.tipo_servico === "Instalação" && order.motivo === "Individual") ||
      order.motivo === "Reinstalacao Novo Endereco"
    );
  });
  const applicableWithoutMaterials = ordersApplicable.filter(o => !o.materiais || o.materiais.length === 0);
  
  console.log('🔍 [OTIMIZAÇÃO]', {
    totalOSs: serviceOrders.length,
    aplicaveis: ordersApplicable.length,
    aplicaveisSemMateriais: applicableWithoutMaterials.length,
    aplicaveisComMateriais: ordersApplicable.length - applicableWithoutMaterials.length
  });

  const {
    volumeOS,
    economiaAntena,
    economiaLnbs,
    volumeConsumoAntena,
    volumeConsumoLnbs,
    percentualEconomiaAntena,
    percentualEconomiaLnbs
  } = useOptimizationCounts(serviceOrders);


  // Calcular ranking de técnicos
  const technicianRanking = useMemo(() => {
    const technicianStats = new Map<string, {
      nome: string;
      volumeOS: number;
      consumoAntena: number;
      consumoLnbfs: number;
      percentualConsAntena: number;
      percentualConsLnbfs: number;
      score: number;
    }>();

    // Primeiro, deduplicar as OSs usando apenas codigo_os (mesma lógica do hook)
    const uniqueOrders = serviceOrders.reduce((acc, order) => {
      if (!acc.has(order.codigo_os)) {
        acc.set(order.codigo_os, order);
      }
      return acc;
    }, new Map<string, ServiceOrder>());
    
    const deduplicatedOrders = Array.from(uniqueOrders.values());

    // Filtrar apenas OSs aplicáveis para otimização (mesma lógica do card)
    const osAplicaveis = deduplicatedOrders.filter(order => {
      return (
        (order.tipo_servico === "Ponto Principal" && order.motivo === "Individual") ||
        (order.tipo_servico === "Instalação" && order.motivo === "Individual") ||
        order.motivo === "Reinstalacao Novo Endereco"
      );
    });


    // Processar apenas as OSs aplicáveis
    osAplicaveis.forEach(order => {
      if (!order.nome_tecnico) return;

      const tech = order.nome_tecnico;
      if (!technicianStats.has(tech)) {
        technicianStats.set(tech, {
          nome: tech,
          volumeOS: 0,
          consumoAntena: 0,
          consumoLnbfs: 0,
          percentualConsAntena: 0,
          percentualConsLnbfs: 0,
          score: 0
        });
      }

      const stats = technicianStats.get(tech)!;
      stats.volumeOS++; // Contar apenas OSs aplicáveis

      // Buscar materiais de otimização (ordens podem não ter materiais)
      const materiais = order.materiais || [];
      // Buscar todas as antenas
      const antena150 = materiais.find(m => m.nome === "ANTENA 150 CM C/ KIT FIXACAO");
      const antena75 = materiais.find(m => m.nome === "ANTENA 75 CM");
      const antena90 = materiais.find(m => m.nome === "ANTENA 90CM C/ KIT FIXACAO");
      const antena60 = materiais.find(m => m.nome === "ANTENA DE 60 CM C/ KIT FIXACAO");
      const lnbfSimples = materiais.find(m => m.nome === "LNBF SIMPLES ANTENA 45/60/90 CM");
      const lnbfDuplo = materiais.find(m => m.nome === "LNBF DUPLO ANTENA 45/60/90 CM");

      // Contar consumo de antenas (soma > 0)
      const somaAntenas = (antena150?.quantidade || 0) + 
                          (antena75?.quantidade || 0) + 
                          (antena90?.quantidade || 0) + 
                          (antena60?.quantidade || 0);
      if (somaAntenas > 0) {
        stats.consumoAntena++;
      }

      // LNBFs: se qualquer um tiver quantidade > 0, conta como consumo
      if ((lnbfSimples && lnbfSimples.quantidade > 0) || (lnbfDuplo && lnbfDuplo.quantidade > 0)) {
        stats.consumoLnbfs++;
      }
    });


    // Calcular percentuais e scores
    const ranking = Array.from(technicianStats.values()).map(tech => {
      // Percentuais baseados no volume de OSs aplicáveis (não total)
      tech.percentualConsAntena = tech.volumeOS > 0 ? (tech.consumoAntena / tech.volumeOS) * 100 : 0;
      tech.percentualConsLnbfs = tech.volumeOS > 0 ? (tech.consumoLnbfs / tech.volumeOS) * 100 : 0;
      
      // Score: média de consumo (menor = melhor)
      tech.score = (tech.percentualConsAntena + tech.percentualConsLnbfs) / 2;

      return tech;
    });

    // Ordenar por score (menor = melhor)
    const rankingFinal = ranking.sort((a, b) => a.score - b.score);


    return rankingFinal;
  }, [serviceOrders, volumeOS]);

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="pb-3 border-b border-gray-200">
        <CardTitle className="text-lg">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <span>Otimização de Consumo</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-3">
        {/* Layout ultra compacto para 3 colunas */}
        <div className="space-y-1.5">
          {/* Volume de OS */}
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-900">Volume OS</span>
            </div>
            <Badge className="bg-blue-600 text-white text-sm px-2.5 py-0.5 font-bold shadow-sm">
              {volumeOS}
            </Badge>
          </div>

          {/* Grid 2x2 para economia e consumo */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* Economia Antena */}
            <div className="flex items-center justify-between p-1.5 bg-green-50 rounded-lg border border-green-200 shadow-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-semibold text-green-900 leading-tight">
                  Econ.<br />Antena
                </span>
              </div>
              <Badge className="bg-green-600 text-white text-xs px-1.5 py-0 font-bold shadow-sm">
                {economiaAntena}
              </Badge>
            </div>

            {/* Economia LNBFs */}
            <div className="flex items-center justify-between p-1.5 bg-green-50 rounded-lg border border-green-200 shadow-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-semibold text-green-900 leading-tight">
                  Econ.<br />LNBFs
                </span>
              </div>
              <Badge className="bg-green-600 text-white text-xs px-1.5 py-0 font-bold shadow-sm">
                {economiaLnbs}
              </Badge>
            </div>

            {/* Consumo Antena */}
            <div className="flex items-center justify-between p-1.5 bg-orange-50 rounded-lg border border-orange-200 shadow-sm">
              <div className="flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5 text-orange-600" />
                <span className="text-xs font-semibold text-orange-900 leading-tight">
                  Cons.<br />Antena
                </span>
              </div>
              <Badge className="bg-orange-600 text-white text-xs px-1.5 py-0 font-bold shadow-sm">
                {volumeConsumoAntena}
              </Badge>
            </div>

            {/* Consumo LNBFs */}
            <div className="flex items-center justify-between p-1.5 bg-orange-50 rounded-lg border border-orange-200 shadow-sm">
              <div className="flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5 text-orange-600" />
                <span className="text-xs font-semibold text-orange-900 leading-tight">
                  Cons.<br />LNBFs
                </span>
              </div>
              <Badge className="bg-orange-600 text-white text-xs px-1.5 py-0 font-bold shadow-sm">
                {volumeConsumoLnbs}
              </Badge>
            </div>
          </div>
        </div>


        {/* Quadro de Gatilho de Consumo */}
        <div className="mt-1.5 p-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h4 className="text-xs font-semibold text-gray-700 mb-1.5 text-center">Gatilho de Consumo</h4>
          <div className="grid grid-cols-2 gap-1.5">
            {/* Gatilho Antena */}
            <div className="text-center p-1.5 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs font-semibold text-blue-900 mb-1">Gatilho Antena</div>
              <div className="text-xs font-bold text-blue-600">86.13%</div>
            </div>

            {/* Gatilho LNBFs */}
            <div className="text-center p-1.5 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs font-semibold text-blue-900 mb-1">Gatilho LNBFs</div>
              <div className="text-xs font-bold text-blue-600">88.63%</div>
            </div>
          </div>
        </div>

        {/* Quadro de Percentuais de Consumo */}
        <div className="mt-1.5 p-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h4 className="text-xs font-semibold text-gray-700 mb-1.5 text-center">Percentuais de Consumo</h4>
          <div className="grid grid-cols-2 gap-1.5">
            {/* Percentual Consumo Antena */}
            <div className="text-center p-1.5 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-xs font-semibold text-orange-900 mb-1">Cons. Antena</div>
              <div className={`text-sm font-bold mb-0.5 ${
                ((volumeConsumoAntena / volumeOS) * 100) > 86.13 ? 'text-red-600' :
                ((volumeConsumoAntena / volumeOS) * 100) > 50.00 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {((volumeConsumoAntena / volumeOS) * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mb-1">
                {((volumeConsumoAntena / volumeOS) * 100) > 86.13 ? '🔴' :
                 ((volumeConsumoAntena / volumeOS) * 100) > 50.00 ? '🟡' :
                 '🟢'}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                ({volumeConsumoAntena} ÷ {volumeOS}) × 100
              </div>
              <div className="text-[10px] text-gray-500">
                Consumo Real ÷ Volume OS
              </div>
            </div>

            {/* Percentual Consumo LNBFs */}
            <div className="text-center p-1.5 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-xs font-semibold text-orange-900 mb-1">Cons. LNBFs</div>
              <div className={`text-sm font-bold mb-0.5 ${
                ((volumeConsumoLnbs / volumeOS) * 100) > 88.63 ? 'text-red-600' :
                ((volumeConsumoLnbs / volumeOS) * 100) > 50.00 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {((volumeConsumoLnbs / volumeOS) * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mb-1">
                {((volumeConsumoLnbs / volumeOS) * 100) > 88.63 ? '🔴' :
                 ((volumeConsumoLnbs / volumeOS) * 100) > 50.00 ? '🟡' :
                 '🟢'}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                ({volumeConsumoLnbs} ÷ {volumeOS}) × 100
              </div>
              <div className="text-[10px] text-gray-500">
                Consumo Real ÷ Volume OS
              </div>
            </div>
          </div>
        </div>

        {/* Quadro de Volume Consumo Gatilho Redução */}
        <div className="mt-1.5 p-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h4 className="text-xs font-semibold text-gray-700 mb-1.5 text-center">Volume Consumo Gatilho Redução</h4>
          <div className="grid grid-cols-2 gap-1.5">
            {/* Volume Gatilho Antena */}
            <div className="text-center p-1.5 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-xs font-semibold text-purple-900 mb-1">Gatilho Antena</div>
              <div className="text-sm font-bold text-purple-600 mb-1">
                {Math.round(86.13 * volumeOS / 100)}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                86.13% × {volumeOS}
              </div>
              <div className="text-[10px] text-gray-500">
                Gatilho × Volume OS
              </div>
            </div>

            {/* Volume Gatilho LNBFs */}
            <div className="text-center p-1.5 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-xs font-semibold text-purple-900 mb-1">Gatilho LNBFs</div>
              <div className="text-sm font-bold text-purple-600 mb-1">
                {Math.round(88.63 * volumeOS / 100)}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                88.63% × {volumeOS}
              </div>
              <div className="text-[10px] text-gray-500">
                Gatilho × Volume OS
              </div>
            </div>
          </div>
        </div>

        {/* Quadro de Qtde Redução Validada */}
        <div className="mt-1.5 p-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h4 className="text-xs font-semibold text-gray-700 mb-1.5 text-center">Qtde Redução Validada</h4>
          <div className="grid grid-cols-2 gap-1.5">
            {/* Redução Validada Antena */}
            <div className="text-center p-1.5 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="text-xs font-semibold text-indigo-900 mb-1">Redução Antena</div>
              <div className="text-sm font-bold text-indigo-600 mb-1">
                {Math.round(86.13 * volumeOS / 100) - volumeConsumoAntena}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {Math.round(86.13 * volumeOS / 100)} - {volumeConsumoAntena}
              </div>
              <div className="text-[10px] text-gray-500">
                Gatilho - Consumo Real
              </div>
            </div>

            {/* Redução Validada LNBFs */}
            <div className="text-center p-1.5 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="text-xs font-semibold text-indigo-900 mb-1">Redução LNBFs</div>
              <div className="text-sm font-bold text-indigo-600 mb-1">
                {Math.round(88.63 * volumeOS / 100) - volumeConsumoLnbs}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {Math.round(88.63 * volumeOS / 100)} - {volumeConsumoLnbs}
              </div>
              <div className="text-[10px] text-gray-500">
                Gatilho - Consumo Real
              </div>
            </div>
          </div>
        </div>

        {/* Quadro Unificado de Valores - Protegido */}
        <ProtectedCard 
          title="Valores e Total"
          storageKey="valores-economia"
          className="mt-1.5"
        >
          <div className="p-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Valores por Item */}
            <div className="mb-2">
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5 text-center">Valores por Item</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {/* Valor Antena */}
                <div className="text-center p-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-xs font-semibold text-emerald-900 mb-1">Valor Antena</div>
                  <div className="text-sm font-bold text-emerald-600 mb-1">
                    {formatBRL((Math.round(86.13 * volumeOS / 100) - volumeConsumoAntena) * 42)}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {Math.round(86.13 * volumeOS / 100) - volumeConsumoAntena} × R$ 42,00
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Redução × Valor Unitário
                  </div>
                </div>

                {/* Valor LNBFs */}
                <div className="text-center p-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-xs font-semibold text-emerald-900 mb-1">Valor LNBFs</div>
                  <div className="text-sm font-bold text-emerald-600 mb-1">
                    {formatBRL((Math.round(88.63 * volumeOS / 100) - volumeConsumoLnbs) * 8)}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {Math.round(88.63 * volumeOS / 100) - volumeConsumoLnbs} × R$ 8,00
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Redução × Valor Unitário
                  </div>
                </div>
              </div>
            </div>

            {/* Valor Total */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5 text-center">Valor Total</h4>
              <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm font-bold text-green-600">
                  {formatBRL(((Math.round(86.13 * volumeOS / 100) - volumeConsumoAntena) * 42) + ((Math.round(88.63 * volumeOS / 100) - volumeConsumoLnbs) * 8))}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Valor Antena + Valor LNBFs
                </div>
              </div>
            </div>
          </div>
        </ProtectedCard>
          </TabsContent>
          
          <TabsContent value="ranking" className="mt-3">
            <div className="space-y-2">

              {/* Tabela de Ranking Compacta */}
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50 h-8">
                      <TableHead className="w-8 text-xs px-2 font-semibold text-gray-700">Pos</TableHead>
                      <TableHead className="min-w-[100px] text-xs px-2 font-semibold text-gray-700">Técnico</TableHead>
                      <TableHead className="text-center w-12 text-xs px-2 font-semibold text-gray-700">Volume</TableHead>
                      <TableHead className="text-center w-20 text-xs px-2 font-semibold text-gray-700">Cons Antena</TableHead>
                      <TableHead className="text-center w-20 text-xs px-2 font-semibold text-gray-700">Cons LNBFs</TableHead>
                      <TableHead className="text-center w-12 text-xs px-2 font-semibold text-gray-700">Média Consumo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {technicianRanking.map((tech, index) => (
                      <TableRow 
                        key={tech.nome} 
                        className={`h-8 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-gray-100 transition-colors`}
                      >
                        <TableCell className="text-center text-xs px-2">
                          {index < 2 ? ['🥇', '🥈'][index] : `${index + 1}º`}
                        </TableCell>
                        <TableCell className="font-semibold text-xs px-2 truncate max-w-[100px]" title={tech.nome}>
                          {tech.nome}
                        </TableCell>
                        <TableCell className="text-center text-xs px-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-1.5 py-0 font-semibold">
                            {tech.volumeOS}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs px-2">
                          <div className={`font-bold text-xs ${
                            tech.percentualConsAntena <= 30 ? 'text-green-600' : 
                            tech.percentualConsAntena <= 50 ? 'text-yellow-600' : 
                            'text-red-600'
                          }`}>
                            {tech.consumoAntena}
                            <br/>
                            <span className="text-xs font-normal">({tech.percentualConsAntena.toFixed(2)}%)</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs px-2">
                          <div className={`font-bold text-xs ${
                            tech.percentualConsLnbfs <= 30 ? 'text-green-600' : 
                            tech.percentualConsLnbfs <= 50 ? 'text-yellow-600' : 
                            'text-red-600'
                          }`}>
                            {tech.consumoLnbfs}
                            <br/>
                            <span className="text-xs font-normal">({tech.percentualConsLnbfs.toFixed(2)}%)</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs px-2">
                          <div className={`font-bold text-xs ${
                            tech.score <= 30 ? 'text-green-600' : 
                            tech.score <= 50 ? 'text-yellow-600' : 
                            'text-red-600'
                          }`}>
                            {tech.consumoAntena + tech.consumoLnbfs}
                            <br/>
                            <span className="text-xs font-normal">({tech.score.toFixed(2)}%)</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {technicianRanking.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">Nenhum técnico encontrado com dados de otimização</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

