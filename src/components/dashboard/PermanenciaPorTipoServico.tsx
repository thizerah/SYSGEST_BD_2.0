import { Progress } from "@/components/ui/progress";
import useData from "@/context/useData";
import { useMemo } from "react";
import { Venda } from "@/types";

interface PermanenciaPorTipoServicoProps {
  sigla: "POS" | "BL-DGO";
  datasHabilitacaoFiltradas?: string[];
}

export function PermanenciaPorTipoServico({ sigla, datasHabilitacaoFiltradas }: PermanenciaPorTipoServicoProps) {
  const { vendas, primeirosPagamentos } = useData();

  const dados = useMemo(() => {
    // Filtrar vendas pela sigla (e pelas datas de habilitação, se fornecidas)
    const vendasFiltradas = vendas.filter(venda => {
      const agrupamento = venda.agrupamento_produto || '';
      const produto = venda.produto_principal || '';
      const pertenceSigla = agrupamento.includes(sigla) || produto.includes(sigla);
      
      // Verificar filtro de data de habilitação, se fornecido
      if (datasHabilitacaoFiltradas && datasHabilitacaoFiltradas.length > 0 && venda.data_habilitacao) {
        // Normalizar a data para o formato YYYY-MM-DD
        const dataHabilitacao = new Date(venda.data_habilitacao);
        const dataFormatada = dataHabilitacao.toISOString().split('T')[0];
        return pertenceSigla && datasHabilitacaoFiltradas.includes(dataFormatada);
      }
      
      return pertenceSigla;
    });
    
    // Mapear vendas por número de proposta
    const vendasMap = new Map<string, Venda>();
    vendasFiltradas.forEach(venda => {
      vendasMap.set(venda.numero_proposta, venda);
    });
    
    // Filtrar pagamentos que correspondem às vendas da sigla
    const pagamentosFiltrados = primeirosPagamentos.filter(pagamento => 
      vendasMap.has(pagamento.proposta)
    );
    
    // Processar vendas BL-DGO sem pagamento correspondente
    const inclusoes = vendas.filter(venda => {
      // Verificar se é BL-DGO da sigla correta
      const ehSiglaCorreta = (venda.agrupamento_produto?.includes(sigla) || venda.produto_principal?.includes(sigla));
      
      // Verificar se não tem pagamento correspondente
      const naoTemPagamento = !primeirosPagamentos.some(p => p.proposta === venda.numero_proposta);
      
      // Verificar filtro de data de habilitação, se fornecido
      let atendeFiltroData = true;
      if (datasHabilitacaoFiltradas && datasHabilitacaoFiltradas.length > 0 && venda.data_habilitacao) {
        // Normalizar a data para o formato YYYY-MM-DD
        const dataHabilitacao = new Date(venda.data_habilitacao);
        const dataFormatada = dataHabilitacao.toISOString().split('T')[0];
        atendeFiltroData = datasHabilitacaoFiltradas.includes(dataFormatada);
      }
      
      return sigla === "BL-DGO" && ehSiglaCorreta && naoTemPagamento && atendeFiltroData;
    });
    
    // Contar clientes por categoria
    let adimplentes = 0;
    let inadimplentes = 0;
    let cancelados = 0;
    
    // Processar pagamentos e classificar clientes
    pagamentosFiltrados.forEach(pagamento => {
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
        adimplentes++;
      } else {
        inadimplentes++;
      }
    });
    
    // Adicionar inclusões como adimplentes
    adimplentes += inclusoes.length;
    
    const total = adimplentes + inadimplentes + cancelados;
    
    return {
      total,
      adimplentes,
      inadimplentes,
      cancelados,
      percentual_adimplentes: total > 0 ? (adimplentes / total) * 100 : 0,
      percentual_inadimplentes: total > 0 ? (inadimplentes / total) * 100 : 0,
      percentual_cancelados: total > 0 ? (cancelados / total) * 100 : 0
    };
  }, [sigla, vendas, primeirosPagamentos, datasHabilitacaoFiltradas]);

  return (
    <div className="p-2">
      <h3 className="font-semibold text-lg mb-3">{sigla === "BL-DGO" ? "Fibra" : "POS"}</h3>
      
      <div className="space-y-4">
        <div>
          <Progress value={dados.percentual_adimplentes} className="h-3 bg-green-100" />
          <div className="flex justify-between text-sm mt-2">
            <span>Adimplentes: {dados.adimplentes}</span>
            <span className="font-bold text-green-600 text-base">{dados.percentual_adimplentes.toFixed(2)}%</span>
          </div>
        </div>
        
        <div>
          <Progress value={dados.percentual_inadimplentes} className="h-3 mt-2 bg-amber-100" />
          <div className="flex justify-between text-sm mt-2">
            <span>Inadimplentes: {dados.inadimplentes}</span>
            <span className="font-bold text-amber-600 text-base">{dados.percentual_inadimplentes.toFixed(2)}%</span>
          </div>
        </div>
        
        <div>
          <Progress value={dados.percentual_cancelados} className="h-3 mt-2 bg-red-100" />
          <div className="flex justify-between text-sm mt-2">
            <span>Cancelados: {dados.cancelados}</span>
            <span className="font-bold text-red-600 text-base">{dados.percentual_cancelados.toFixed(2)}%</span>
          </div>
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground mt-4 font-medium">
        Total de clientes: {dados.total}
      </div>
      
      {datasHabilitacaoFiltradas && datasHabilitacaoFiltradas.length > 0 && (
        <div className="text-xs text-blue-600 mt-2">
          * Filtrado por data(s) de habilitação selecionada(s)
        </div>
      )}
    </div>
  );
} 