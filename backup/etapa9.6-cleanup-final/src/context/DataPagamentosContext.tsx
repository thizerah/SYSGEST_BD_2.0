import React, { createContext, useContext, useMemo } from 'react';
import { PrimeiroPagamento, Venda, PermanenciaMetrics } from '@/types';

// Interface para o contexto de pagamentos
interface DataPagamentosContextType {
  // Dados
  primeirosPagamentos: PrimeiroPagamento[];
  vendas: Venda[]; // Necessário para calcular permanência e relacionar com pagamentos

  // Métodos de cálculo
  calculatePermanenciaMetrics: () => PermanenciaMetrics;
  processarInclusoes: () => PrimeiroPagamento[];
  
  // Estados
  loading: boolean;
  
  // Método de importação
  importPrimeirosPagamentos: (pagamentos: PrimeiroPagamento[], append?: boolean) => void;
}

// Interface para props do provider
interface DataPagamentosProviderProps {
  children: React.ReactNode;
  primeirosPagamentos: PrimeiroPagamento[];
  vendas: Venda[];
  loading: boolean;
  importPrimeirosPagamentos: (pagamentos: PrimeiroPagamento[], append?: boolean) => void;
}

// Criar o contexto
const DataPagamentosContext = createContext<DataPagamentosContextType | undefined>(undefined);

// Provider que recebe dados via props (props injection)
export const DataPagamentosProvider: React.FC<DataPagamentosProviderProps> = ({ 
  children,
  primeirosPagamentos,
  vendas,
  loading,
  importPrimeirosPagamentos
}) => {

  // Função para processar inclusões (vendas BL-DGO sem pagamento correspondente)
  const processarInclusoes = useMemo((): PrimeiroPagamento[] => {
    // Se não houver vendas, não há como processar inclusões
    if (vendas.length === 0) {
      return [];
    }
    
    // Criar um conjunto com as propostas que já têm pagamento registrado
    const propostasComPagamento = new Set(primeirosPagamentos.map(p => p.proposta));
    
    // Identificar vendas BL-DGO sem pagamento correspondente
    const vendasBLDGOSemPagamento = vendas.filter(venda => {
      // Verificar se é BL-DGO
      const ehBLDGO = venda.agrupamento_produto?.includes('BL-DGO') || venda.produto_principal?.includes('BL-DGO');
      
      // Verificar se não tem pagamento correspondente
      const naoTemPagamento = !propostasComPagamento.has(venda.numero_proposta);
      
      return ehBLDGO && naoTemPagamento;
    });
    
    // Gerar registros de pagamento para cada inclusão
    const inclusoes: PrimeiroPagamento[] = vendasBLDGOSemPagamento.map(venda => {
      // Corrigir a inversão da data (se a data estiver no formato mm/dd/yyyy)
      let dataHabilitacaoCorrigida = new Date(venda.data_habilitacao);
      
      // Verificar se a data parece estar invertida (mes maior que 12)
      try {
        const partes = venda.data_habilitacao.split('T')[0].split('-');
        if (partes.length === 3) {
          const ano = parseInt(partes[0]);
          const mes = parseInt(partes[1]);
          const dia = parseInt(partes[2]);
          
          // Se o mês for maior que 12, provavelmente está invertido
          if (mes > 12) {
            // Trocar mes e dia
            dataHabilitacaoCorrigida = new Date(ano, dia - 1, mes);
          }
        }
      } catch (e) {
        console.error(`Erro ao processar data para venda ${venda.numero_proposta}:`, e);
      }
      
      // Calcular vencimento (data de habilitação + 30 dias)
      const dataVencimento = new Date(dataHabilitacaoCorrigida);
      dataVencimento.setDate(dataVencimento.getDate() + 30);
      
      return {
        proposta: venda.numero_proposta,
        passo: "0", // Passo 0 para inclusões
        data_passo_cobranca: "", // Sem cobrança ainda
        vencimento_fatura: dataVencimento.toISOString(),
        status_pacote: "NC", // NC de Não Cobrança (anteriormente I de Inclusão)
        data_importacao: new Date().toISOString() // Data atual como data de importação
      };
    });
    
    return inclusoes;
  }, [vendas, primeirosPagamentos]);

  // Função para calcular métricas de permanência
  const calculatePermanenciaMetrics = useMemo((): PermanenciaMetrics => {
    // Se não houver dados, retornar métricas vazias
    if (vendas.length === 0) {
      return {
        total_clientes: 0,
        adimplentes: 0,
        inadimplentes: 0,
        cancelados: 0,
        percentual_adimplentes: 0,
        percentual_inadimplentes: 0,
        percentual_cancelados: 0
      };
    }
    
    // Mapear vendas por número de proposta
    const vendasMap = new Map<string, Venda>();
    vendas.forEach(venda => {
      vendasMap.set(venda.numero_proposta, venda);
    });
    
    // Contar clientes por categoria
    let adimplentes = 0;
    let inadimplentes = 0;
    let cancelados = 0;
    
    // Processar pagamentos e classificar clientes
    primeirosPagamentos.forEach(pagamento => {
      const venda = vendasMap.get(pagamento.proposta);
      
      if (venda) {
        // Nova lógica de classificação conforme regras definidas
        if (pagamento.status_pacote === 'C') {
          cancelados++;
        } else if (pagamento.status_pacote === 'S') {
          inadimplentes++;
        } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
          adimplentes++;
        } else if (pagamento.passo === '0' || pagamento.passo === '1') {
          adimplentes++;
        } else if (pagamento.status_pacote === 'NC') {
          // Considerar "Não Cobrança" como clientes ativos (adimplentes)
          adimplentes++;
        } else {
          inadimplentes++;
        }
      }
    });
    
    // Adicionar inclusões como adimplentes
    adimplentes += processarInclusoes.length;
    
    const total_clientes = adimplentes + inadimplentes + cancelados;
    
    return {
      total_clientes,
      adimplentes,
      inadimplentes,
      cancelados,
      percentual_adimplentes: total_clientes > 0 ? (adimplentes / total_clientes) * 100 : 0,
      percentual_inadimplentes: total_clientes > 0 ? (inadimplentes / total_clientes) * 100 : 0,
      percentual_cancelados: total_clientes > 0 ? (cancelados / total_clientes) * 100 : 0
    };
  }, [vendas, primeirosPagamentos, processarInclusoes]);

  // Valor do contexto
  const contextValue: DataPagamentosContextType = {
    // Dados
    primeirosPagamentos,
    vendas,
    
    // Métodos de cálculo
    calculatePermanenciaMetrics: () => calculatePermanenciaMetrics,
    processarInclusoes: () => processarInclusoes,
    
    // Estados
    loading,
    
    // Método de importação
    importPrimeirosPagamentos
  };

  return (
    <DataPagamentosContext.Provider value={contextValue}>
      {children}
    </DataPagamentosContext.Provider>
  );
};

// Hook para usar o contexto (uso interno apenas)
const useDataPagamentos = (): DataPagamentosContextType => {
  const context = useContext(DataPagamentosContext);
  if (!context) {
    throw new Error('useDataPagamentos deve ser usado dentro de um DataPagamentosProvider');
  }
  return context;
};

// Hook exportado através do arquivo usePagamentosData.ts
export default useDataPagamentos; 