/**
 * DataVendasContext - Contexto especializado para Vendas e Vendedores
 * Etapa 8.3: Segundo contexto extraído do DataContext monolítico
 */

import React, { createContext, useState, useMemo } from 'react';
import { Venda, PrimeiroPagamento, VendedorMetrics } from '@/types';

interface DataVendasContextType {
  // Estados
  vendas: Venda[];
  loading: boolean;
  vendedores: string[];
  
  // Métodos de dados
  importVendas: (vendas: Venda[], append?: boolean) => void;
  
  // Métodos de cálculo
  calculateVendedorMetrics: () => VendedorMetrics[];
}

const DataVendasContext = createContext<DataVendasContextType | undefined>(undefined);

interface DataVendasProviderProps {
  children: React.ReactNode;
  primeirosPagamentos?: PrimeiroPagamento[]; // Injeção de dependência para cálculos
}

export const DataVendasProvider: React.FC<DataVendasProviderProps> = ({ 
  children, 
  primeirosPagamentos = [] 
}) => {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);

  const importVendas = (novasVendas: Venda[], append: boolean = false) => {
    setLoading(true);
    
    // Processar as vendas
    const processedVendas = novasVendas.map(venda => {
      // Calcular dias corridos desde a habilitação
      const dataHabilitacao = new Date(venda.data_habilitacao);
      const hoje = new Date();
      const diffTime = Math.abs(hoje.getTime() - dataHabilitacao.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...venda,
        dias_corridos: diffDays
      };
    });
    
    if (append) {
      // Verificar duplicidades baseado no número da proposta
      const existingPropostas = new Set(vendas.map(v => v.numero_proposta));
      const novaVendasFiltradas = processedVendas.filter(v => !existingPropostas.has(v.numero_proposta));
      
      setVendas(prevVendas => [...prevVendas, ...novaVendasFiltradas]);
      console.log(`Adicionadas ${novaVendasFiltradas.length} novas vendas (${processedVendas.length - novaVendasFiltradas.length} duplicadas ignoradas)`);
    } else {
      setVendas(processedVendas);
      console.log(`Importadas ${processedVendas.length} vendas`);
    }
    
    setLoading(false);
  };

  const calculateVendedorMetrics = (): VendedorMetrics[] => {
    // Se não houver dados, retornar array vazio
    if (vendas.length === 0) {
      return [];
    }
    
    // Mapear vendas por vendedor
    const vendedoresMap = new Map<string, {
      id_vendedor: string;
      nome_vendedor: string;
      total_vendas: number;
      total_propostas: number;
      clientes_por_status: {
        adimplentes: number;
        inadimplentes: number;
        cancelados: number;
      };
      propostas: Set<string>;
    }>();
    
    // Agrupar vendas por vendedor
    vendas.forEach(venda => {
      const id = venda.id_vendedor;
      
      if (!vendedoresMap.has(id)) {
        vendedoresMap.set(id, {
          id_vendedor: id,
          nome_vendedor: '',  // Será atualizado ao processar as vendas
          total_vendas: 0,
          total_propostas: 0,
          clientes_por_status: {
            adimplentes: 0,
            inadimplentes: 0,
            cancelados: 0
          },
          propostas: new Set<string>()
        });
      }
      
      const vendedorData = vendedoresMap.get(id)!;
      vendedorData.nome_vendedor = vendedorData.nome_vendedor || id; // Usar ID como nome se não houver nome
      vendedorData.total_propostas++;
      vendedorData.propostas.add(venda.numero_proposta);
      
      // Contar como venda se o status for de venda concluída
      if (venda.status_proposta.toLowerCase().includes('habilitada') || 
          venda.status_proposta.toLowerCase().includes('finalizada')) {
        vendedorData.total_vendas++;
      }
    });
    
    // Mapear primeiro pagamento por proposta
    const pagamentosMap = new Map<string, PrimeiroPagamento>();
    primeirosPagamentos.forEach(pagamento => {
      pagamentosMap.set(pagamento.proposta, pagamento);
    });
    
    // Processar status dos clientes para cada vendedor
    vendedoresMap.forEach((vendedorData, id) => {
      vendedorData.propostas.forEach(proposta => {
        const pagamento = pagamentosMap.get(proposta);
        
        if (pagamento) {
          // Nova lógica de classificação conforme regras definidas
          if (pagamento.status_pacote === 'C') {
            vendedorData.clientes_por_status.cancelados++;
          } else if (pagamento.status_pacote === 'S') {
            vendedorData.clientes_por_status.inadimplentes++;
          } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
            vendedorData.clientes_por_status.adimplentes++;
          } else if (pagamento.passo === '0' || pagamento.passo === '1') {
            vendedorData.clientes_por_status.adimplentes++;
          } else if (pagamento.status_pacote === 'NC') {
            // Considerar "Não Cobrança" como clientes ativos (adimplentes)
            vendedorData.clientes_por_status.adimplentes++;
          } else {
            vendedorData.clientes_por_status.inadimplentes++;
          }
        }
      });
    });
    
    // Converter o Map para array de métricas de vendedor
    return Array.from(vendedoresMap.values()).map(data => {
      const total_clientes = data.clientes_por_status.adimplentes +
                            data.clientes_por_status.inadimplentes +
                            data.clientes_por_status.cancelados;
                            
      return {
        id_vendedor: data.id_vendedor,
        nome_vendedor: data.nome_vendedor,
        total_vendas: data.total_vendas,
        total_propostas: data.total_propostas,
        taxa_conversao: data.total_propostas > 0 ? (data.total_vendas / data.total_propostas) * 100 : 0,
        clientes_adimplentes: data.clientes_por_status.adimplentes,
        clientes_inadimplentes: data.clientes_por_status.inadimplentes,
        clientes_cancelados: data.clientes_por_status.cancelados,
        percentual_adimplentes: total_clientes > 0 ? (data.clientes_por_status.adimplentes / total_clientes) * 100 : 0,
        percentual_inadimplentes: total_clientes > 0 ? (data.clientes_por_status.inadimplentes / total_clientes) * 100 : 0,
        percentual_cancelados: total_clientes > 0 ? (data.clientes_por_status.cancelados / total_clientes) * 100 : 0
      };
    });
  };

  // Lista de vendedores únicos
  const vendedores = useMemo(() => {
    return Array.from(
      new Set(vendas.map(venda => venda.id_vendedor))
    );
  }, [vendas]);

  return (
    <DataVendasContext.Provider value={{ 
      vendas,
      loading,
      vendedores,
      importVendas,
      calculateVendedorMetrics
    }}>
      {children}
    </DataVendasContext.Provider>
  );
};

export { DataVendasContext }; 