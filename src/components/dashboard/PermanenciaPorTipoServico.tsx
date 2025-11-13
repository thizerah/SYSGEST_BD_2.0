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
  
  // Obter inclusões (específicas para a sigla do card)
  const obterInclusoes = () => {
    return vendasOriginais.filter(venda => {
      // Verificar se pertence à sigla específica do card
      const agrupamento = venda.agrupamento_produto || '';
      const produto = venda.produto_principal || '';
      const pertenceASigla = agrupamento.includes(sigla) || produto.includes(sigla);
      
      // Verificar se não tem pagamento correspondente
      const naoTemPagamento = !primeirosPagamentos.some(p => p.proposta === venda.numero_proposta);
      
      // Só incluir se for da sigla específica E não tiver pagamento
      return pertenceASigla && naoTemPagamento;
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
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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

    // Contar oportunidades por tipo
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
    <div className="space-y-5">
      {/* Resumo Principal */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm flex flex-col items-center justify-center">
          <div className="text-xs font-medium text-green-700 mb-3 uppercase tracking-wide">Adimplentes</div>
          <div className="mb-3">
            <Badge className="bg-green-600 text-white text-3xl font-bold px-4 py-2 h-auto border-0 shadow-md">
              {dados.percentual_adimplentes.toFixed(2)}%
            </Badge>
          </div>
          <div className="text-lg font-bold text-green-700">{dados.adimplentes}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200 shadow-sm flex flex-col items-center justify-center">
          <div className="text-xs font-medium text-amber-700 mb-3 uppercase tracking-wide">Inadimplentes</div>
          <div className="mb-3">
            <Badge className="bg-amber-600 text-white text-3xl font-bold px-4 py-2 h-auto border-0 shadow-md">
              {dados.percentual_inadimplentes.toFixed(2)}%
            </Badge>
          </div>
          <div className="text-lg font-bold text-amber-700">{dados.inadimplentes}</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm flex flex-col items-center justify-center">
          <div className="text-xs font-medium text-red-700 mb-3 uppercase tracking-wide">Cancelados</div>
          <div className="mb-3">
            <Badge className="bg-red-600 text-white text-3xl font-bold px-4 py-2 h-auto border-0 shadow-md">
              {dados.percentual_cancelados.toFixed(2)}%
            </Badge>
          </div>
          <div className="text-lg font-bold text-red-700">{dados.cancelados}</div>
        </div>
      </div>

      {/* Total de Clientes */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-blue-900">Total de Clientes</span>
          <span className="text-xl font-bold text-blue-700">{dados.total}</span>
        </div>
      </div>

      {/* Seção de Metas e Oportunidades - apenas para POS */}
      {sigla === "POS" && (
        <div className="mt-5 space-y-4 pt-4 border-t border-gray-200">
          {/* Metas de Adimplência */}
          <div>
            <div className="flex items-center mb-3">
              <div className="p-1.5 bg-blue-100 rounded-lg mr-2">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Metas de Adimplência</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border-2 shadow-sm ${
                dados.metaAtingida55 ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">Meta 55%</span>
                  {dados.metaAtingida55 && (
                    <Badge variant="secondary" className="bg-green-200 text-green-800 text-xs px-2 py-0">
                      ✓ Atingida
                    </Badge>
                  )}
                </div>
                {dados.metaAtingida55 ? (
                  <div className="text-xs text-green-700 font-medium">Meta alcançada!</div>
                ) : (
                  <div className="text-sm font-bold text-amber-700">{dados.clientesParaMeta55} clientes</div>
                )}
              </div>
              
              <div className={`p-3 rounded-lg border-2 shadow-sm ${
                dados.metaAtingida70 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">Meta 70%</span>
                  {dados.metaAtingida70 && (
                    <Badge variant="secondary" className="bg-green-200 text-green-800 text-xs px-2 py-0">
                      ✓ Atingida
                    </Badge>
                  )}
                </div>
                {dados.metaAtingida70 ? (
                  <div className="text-xs text-green-700 font-medium">Meta alcançada!</div>
                ) : (
                  <div className="text-sm font-bold text-red-700">{dados.clientesParaMeta70} clientes</div>
                )}
              </div>
            </div>
          </div>

          {/* Oportunidades FIXAS */}
          <div>
            <div className="flex items-center mb-3">
              <div className="p-1.5 bg-orange-100 rounded-lg mr-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Oportunidades Globais</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border-2 border-yellow-300 shadow-sm">
                <div className="text-xs font-semibold text-yellow-700 mb-1">OURO</div>
                <div className="text-xl font-bold text-yellow-800">{oportunidades.ouro}</div>
                <div className="text-[10px] text-yellow-600 mt-1">Passos 2-3</div>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border-2 border-orange-300 shadow-sm">
                <div className="text-xs font-semibold text-orange-700 mb-1">BRONZE</div>
                <div className="text-xl font-bold text-orange-800">{oportunidades.bronze}</div>
                <div className="text-[10px] text-orange-600 mt-1">Passo 4</div>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-300 shadow-sm">
                <div className="text-xs font-semibold text-blue-700 mb-1">TOTAL</div>
                <div className="text-xl font-bold text-blue-800">{oportunidades.total}</div>
                <div className="text-[10px] text-blue-600 mt-1">91-120 dias</div>
              </div>
            </div>
            
            <div className="text-[10px] text-gray-500 mt-2 italic">
              * Oportunidades: POS + Status "S" + 91-120 dias corridos
            </div>
          </div>
        </div>
      )}
      
      {((datasHabilitacaoFiltradas && datasHabilitacaoFiltradas.length > 0) || vendasFiltradas) && (
        <div className="text-xs text-blue-600 mt-2">
          * Dados de permanência filtrados pelos critérios selecionados
        </div>
      )}
    </div>
  );
} 