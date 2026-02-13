import { useMemo } from 'react';
import { ServiceOrder } from '@/types';

export function useOptimizationCounts(serviceOrders: ServiceOrder[]) {
  return useMemo(() => {
    // Deduplicar e consolidar materiais quando há múltiplas OSs com mesmo codigo_os
    // Quando há "Sistema Opcional" e "Ponto Principal" com mesmo codigo_os, unificamos os materiais
    const uniqueOrders = serviceOrders.reduce((acc, order) => {
      if (!acc.has(order.codigo_os)) {
        // Primeira ocorrência: criar uma cópia com materiais
        acc.set(order.codigo_os, {
          ...order,
          materiais: order.materiais ? [...order.materiais] : []
        });
      } else {
        // Consolidar materiais: somar quantidades dos materiais existentes
        const existing = acc.get(order.codigo_os)!;
        const existingMaterials = existing.materiais || [];
        const currentMaterials = order.materiais || [];
        
        // Criar um mapa para consolidar materiais
        const materialsMap = new Map<string, number>();
        
        // Adicionar materiais existentes
        existingMaterials.forEach(m => {
          materialsMap.set(m.nome, (materialsMap.get(m.nome) || 0) + m.quantidade);
        });
        
        // Adicionar materiais da OS atual
        currentMaterials.forEach(m => {
          materialsMap.set(m.nome, (materialsMap.get(m.nome) || 0) + m.quantidade);
        });
        
        // Converter mapa de volta para array
        const consolidatedMaterials = Array.from(materialsMap.entries()).map(([nome, quantidade]) => ({
          nome,
          quantidade
        }));
        
        // Priorizar "Ponto Principal" ou "Instalação" sobre outros tipos
        const shouldUpdateOrder = 
          (order.tipo_servico === "Ponto Principal" || order.tipo_servico === "Instalação") &&
          (existing.tipo_servico !== "Ponto Principal" && existing.tipo_servico !== "Instalação");
        
        // Atualizar a OS consolidada
        acc.set(order.codigo_os, {
          ...(shouldUpdateOrder ? order : existing),
          materiais: consolidatedMaterials
        });
      }
      return acc;
    }, new Map<string, ServiceOrder>());
    
    const deduplicatedOrders = Array.from(uniqueOrders.values());
    
    // Filtrar OS que atendem aos critérios de otimização (excluir Cancelada: só finalizadas entram no indicador)
    const ordersForOptimization = deduplicatedOrders.filter(order => {
      if (order.status === "Cancelada") return false;
      const tipoServico = order.tipo_servico;
      const motivo = order.motivo;
      const isPontoPrincipalIndividual = (tipoServico === "Ponto Principal" || tipoServico === "Instalação") && motivo === "Individual";
      const isReinstalacaoNovoEndereco = motivo === "Reinstalacao Novo Endereco";
      return isPontoPrincipalIndividual || isReinstalacaoNovoEndereco;
    });

    // Analisar materiais
    const ordersWithoutMaterials = ordersForOptimization.filter(o => !o.materiais || o.materiais.length === 0);

    // Calcular economias
    let economiaAntena = 0;
    let economiaLnbs = 0;

    ordersForOptimization.forEach(order => {
      const materiais = order.materiais || [];
      
      // Verificar economia de antena: soma de todas as antenas = 0 → conta como 1
      const antena150 = materiais.find(m => m.nome === "ANTENA 150 CM C/ KIT FIXACAO");
      const antena75 = materiais.find(m => m.nome === "ANTENA 75 CM");
      const antena90 = materiais.find(m => m.nome === "ANTENA 90CM C/ KIT FIXACAO");
      const antena60 = materiais.find(m => m.nome === "ANTENA DE 60 CM C/ KIT FIXACAO");
      const somaAntenas = (antena150?.quantidade || 0) + (antena75?.quantidade || 0) + (antena90?.quantidade || 0) + (antena60?.quantidade || 0);
      
      // Verificar economia de LNBFs: soma dos dois = 0 → conta como 1
      const lnbfSimples = materiais.find(m => m.nome === "LNBF SIMPLES ANTENA 45/60/90 CM");
      const lnbfDuplo = materiais.find(m => m.nome === "LNBF DUPLO ANTENA 45/60/90 CM");
      const somaLnbfs = (lnbfSimples?.quantidade || 0) + (lnbfDuplo?.quantidade || 0);
      
      if (somaAntenas === 0) economiaAntena++;
      if (somaLnbfs === 0) economiaLnbs++;
    });

    const volumeOS = ordersForOptimization.length;
    const volumeConsumoAntena = volumeOS - economiaAntena;
    const volumeConsumoLnbs = volumeOS - economiaLnbs;

    // Log comparativo simples
    console.log('🔍 [HOOK]', {
      recebidas: serviceOrders.length,
      deduplicadas: deduplicatedOrders.length,
      aplicaveis: volumeOS,
      semMateriais: ordersWithoutMaterials.length,
      economiaAntena,
      economiaLnbs,
      consumoAntena: volumeConsumoAntena,
      consumoLnbfs: volumeConsumoLnbs
    });

    return {
      volumeOS,
      economiaAntena,
      economiaLnbs,
      volumeConsumoAntena,
      volumeConsumoLnbs,
      // Percentuais para referência
      percentualEconomiaAntena: volumeOS > 0 ? (economiaAntena / volumeOS) * 100 : 0,
      percentualEconomiaLnbs: volumeOS > 0 ? (economiaLnbs / volumeOS) * 100 : 0
    };
  }, [serviceOrders]);
}
