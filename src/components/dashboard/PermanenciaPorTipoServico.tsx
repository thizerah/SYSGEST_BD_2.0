import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp } from "lucide-react";
import useData from "@/context/useData";
import { useMemo } from "react";
import { Venda } from "@/types";

interface PermanenciaPorTipoServicoProps {
  sigla: "POS" | "BL-DGO";
  datasHabilitacaoFiltradas?: string[];
  vendasFiltradas?: Venda[];
}

export function PermanenciaPorTipoServico({ sigla, datasHabilitacaoFiltradas, vendasFiltradas }: PermanenciaPorTipoServicoProps) {
  const { vendas: vendasOriginais, primeirosPagamentos } = useData();
  
  // Obter inclusões (mesmo cálculo da tabela principal)
  const obterInclusoes = () => {
    return vendasOriginais.filter(venda => {
      // Verificar se é BL-DGO
      const agrupamento = venda.agrupamento_produto || '';
      const produto = venda.produto_principal || '';
      const ehBLDGO = agrupamento.includes('BL-DGO') || produto.includes('BL-DGO');
      
      // Verificar se não tem pagamento correspondente
      const naoTemPagamento = !primeirosPagamentos.some(p => p.proposta === venda.numero_proposta);
      
      return ehBLDGO && naoTemPagamento;
    }).map(venda => ({
      proposta: venda.numero_proposta,
      passo: "0",
      data_passo_cobranca: "", // Sem cobrança ainda
      vencimento_fatura: "",
      status_pacote: "N", // Considerado como não inadimplente
      data_importacao: ""
    }));
  };

  // Todos os pagamentos (incluindo inclusões) - igual à tabela principal
  const todosPagamentos = [...primeirosPagamentos, ...obterInclusoes()];
  
  // Usar vendas filtradas se fornecidas, caso contrário usar vendas originais
  const vendasParaUsar = vendasFiltradas || vendasOriginais;

  const calcularDiasCorridos = (dataHabilitacao: string): number => {
    const hoje = new Date();
    const dataHab = new Date(dataHabilitacao);
    const diffTime = hoje.getTime() - dataHab.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const verificarDiasDentroFaixa = (dias: number, faixa: string): boolean => {
    if (faixa === ">121") return dias > 121;
    
    const [min, max] = faixa.split("-").map(Number);
    return dias >= min && dias <= max;
  };

  const dados = useMemo(() => {
    // Filtrar vendas pela sigla (e pelas datas de habilitação, se fornecidas)
    const vendasFiltradasPorSigla = vendasParaUsar.filter(venda => {
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
    vendasFiltradasPorSigla.forEach(venda => {
      vendasMap.set(venda.numero_proposta, venda);
    });
    
    // Filtrar pagamentos que correspondem às vendas da sigla (usando todosPagamentos)
    const pagamentosFiltrados = todosPagamentos.filter(pagamento => 
      vendasMap.has(pagamento.proposta)
    );
    
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
    
    const total = adimplentes + inadimplentes + cancelados;
    const percentualAtual = total > 0 ? (adimplentes / total) * 100 : 0;

    // Calcular quantos clientes precisam para atingir metas (baseado nos dados filtrados)
    const clientesParaMeta55 = Math.max(0, Math.ceil((total * 0.55) - adimplentes));
    const clientesParaMeta70 = Math.max(0, Math.ceil((total * 0.70) - adimplentes));
    
    return {
      total,
      adimplentes,
      inadimplentes,
      cancelados,
      percentual_adimplentes: percentualAtual,
      percentual_inadimplentes: total > 0 ? (inadimplentes / total) * 100 : 0,
      percentual_cancelados: total > 0 ? (cancelados / total) * 100 : 0,
      // Metas baseadas nos dados filtrados
      clientesParaMeta55,
      clientesParaMeta70,
      metaAtingida55: percentualAtual >= 55,
      metaAtingida70: percentualAtual >= 70
    };
  }, [sigla, vendasParaUsar, todosPagamentos, datasHabilitacaoFiltradas]);

  // Calcular oportunidades FIXAS (replicando exatamente a lógica da tabela) - apenas para POS
  const oportunidades = useMemo(() => {
    if (sigla !== "POS") return { ouro: 0, bronze: 0, total: 0 };

    // PASSO 1: Usar vendas já filtradas pelos filtros de mês/ano de permanência
    // Se vendasFiltradas foi fornecida, usar ela (já considera filtros de permanência)
    // Caso contrário, usar vendas originais
    const vendasBase = vendasFiltradas || vendasOriginais;
    
    const todasPropostas = vendasBase.filter(venda => {
      const agrupamento = venda.agrupamento_produto || '';
      const produto = venda.produto_principal || '';
      
      return (
        agrupamento.includes('POS') || 
        agrupamento.includes('BL-DGO') ||
        produto.includes('POS') || 
        produto.includes('BL-DGO')
      );
    });

    // PASSO 2: Criar mapa de pagamentos priorizando o MAIS RECENTE por data_importacao
    const pagamentosPorProposta = new Map<string, any>();
    
    // Ordenar pagamentos por data_importacao (mais recentes primeiro)
    const pagamentosOrdenados = [...todosPagamentos].sort((a, b) => {
      const dataA = new Date(a.data_importacao || '1900-01-01');
      const dataB = new Date(b.data_importacao || '1900-01-01');
      return dataB.getTime() - dataA.getTime(); // Mais recentes primeiro
    });
    
    pagamentosOrdenados.forEach(pagamento => {
      if (!pagamentosPorProposta.has(pagamento.proposta)) {
        pagamentosPorProposta.set(pagamento.proposta, pagamento);
      }
      // Se já existe, mantém o mais recente (que já foi adicionado)
    });

    // PASSO 3: Aplicar filtros específicos das oportunidades
    const oportunidadesEncontradas = todasPropostas.filter(venda => {
      // Verificar se é POS (critério da oportunidade)
      const agrupamento = venda.agrupamento_produto || '';
      const produto = venda.produto_principal || '';
      const ehPOS = agrupamento.includes('POS') || produto.includes('POS');
      
      if (!ehPOS || !venda.data_habilitacao) return false;
      
      // Verificar se tem pagamento correspondente
      const pagamento = pagamentosPorProposta.get(venda.numero_proposta);
      if (!pagamento) return false;
      
      // Verificar critérios de oportunidade
      const diasCorridos = calcularDiasCorridos(venda.data_habilitacao);
      const dentroFaixa91_120 = verificarDiasDentroFaixa(diasCorridos, '91-120');
      const statusS = pagamento.status_pacote === 'S';
      const passoValido = ['2', '3', '4'].includes(pagamento.passo);
      
      return dentroFaixa91_120 && statusS && passoValido;
    });

    // PASSO 4: Contar oportunidades por tipo
    let ouro = 0;
    let bronze = 0;

    oportunidadesEncontradas.forEach(venda => {
      const pagamento = pagamentosPorProposta.get(venda.numero_proposta);
      if (pagamento) {
        if (['2', '3'].includes(pagamento.passo)) {
          ouro++;
        } else if (pagamento.passo === '4') {
          bronze++;
        }
      }
    });


    return {
      ouro,
      bronze,
      total: oportunidadesEncontradas.length
    };
  }, [sigla, vendasOriginais, vendasFiltradas, todosPagamentos]);

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

      {/* Seção de Metas e Oportunidades - apenas para POS */}
      {sigla === "POS" && (
        <div className="mt-4 space-y-3">
          {/* Metas de Adimplência */}
          <div className="border-t pt-3">
            <div className="flex items-center mb-2">
              <Target className="mr-1 h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Metas de Adimplência</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2 rounded text-xs border-l-4 ${
                dados.metaAtingida55 ? 'bg-green-50 border-green-400' : 'bg-amber-50 border-amber-400'
              }`}>
                <div className="font-medium">Meta 55%</div>
                {dados.metaAtingida55 ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs mt-1">
                    Atingida ✓
                  </Badge>
                ) : (
                  <div className="text-amber-700 mt-1">Faltam {dados.clientesParaMeta55} clientes</div>
                )}
              </div>
              
              <div className={`p-2 rounded text-xs border-l-4 ${
                dados.metaAtingida70 ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
              }`}>
                <div className="font-medium">Meta 70%</div>
                {dados.metaAtingida70 ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs mt-1">
                    Atingida ✓
                  </Badge>
                ) : (
                  <div className="text-red-700 mt-1">Faltam {dados.clientesParaMeta70} clientes</div>
                )}
              </div>
            </div>
          </div>

          {/* Oportunidades FIXAS */}
          <div className="border-t pt-3">
            <div className="flex items-center mb-2">
              <TrendingUp className="mr-1 h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Oportunidades Globais</span>
            </div>
            
            <div className="grid grid-cols-3 gap-1">
              <div className="p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                <div className="text-xs text-yellow-700 font-medium">OURO</div>
                <div className="text-sm font-bold text-yellow-800">{oportunidades.ouro}</div>
                <div className="text-xs text-yellow-600">Passos 2-3</div>
              </div>
              
              <div className="p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                <div className="text-xs text-orange-700 font-medium">BRONZE</div>
                <div className="text-sm font-bold text-orange-800">{oportunidades.bronze}</div>
                <div className="text-xs text-orange-600">Passo 4</div>
              </div>
              
              <div className="p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                <div className="text-xs text-blue-700 font-medium">TOTAL</div>
                <div className="text-sm font-bold text-blue-800">{oportunidades.total}</div>
                <div className="text-xs text-blue-600">91-120 dias</div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground mt-2">
              * Oportunidades: POS + Status "S" + 91-120 dias corridos
            </div>
          </div>
        </div>
      )}
      
      {(datasHabilitacaoFiltradas && datasHabilitacaoFiltradas.length > 0) || vendasFiltradas && (
        <div className="text-xs text-blue-600 mt-2">
          * Dados de permanência filtrados pelos critérios selecionados
        </div>
      )}
    </div>
  );
} 