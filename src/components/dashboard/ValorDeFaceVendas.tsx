import { BarChart2, Calculator } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useData from "@/context/useData";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Venda } from "@/types";
import { ProtectedCard } from "@/components/common/ProtectedCard";

interface ValorDeFaceVendasProps {
  vendasFiltradas?: Venda[];
}

export function ValorDeFaceVendas({ vendasFiltradas }: ValorDeFaceVendasProps) {
  const data = useData();
  const { vendas: todasVendas, primeirosPagamentos, vendasMeta } = data;
  
  // Usar vendas filtradas se fornecidas, senão usar todas as vendas
  const vendas = vendasFiltradas || todasVendas;
  
  // Estados para os dropdowns
  const [bateuMetaPOS, setBateuMetaPOS] = useState<"sim" | "nao">("nao");
  const [metaVolumePOS, setMetaVolumePOS] = useState<string>("0-99.99");
  const [metaVolumeFIBRA, setMetaVolumeFIBRA] = useState<string>("0-99.99");
  
  const dadosPOS = useMemo(() => {
    // Filtrar vendas pela sigla POS
    const vendasFiltradas = vendas.filter(venda => {
      const agrupamento = venda.agrupamento_produto || '';
      const produto = venda.produto_principal || '';
      return agrupamento.includes('POS') || produto.includes('POS');
    });
    
    // Mapear vendas por número de proposta
    const vendasMap = new Map();
    vendasFiltradas.forEach(venda => {
      vendasMap.set(venda.numero_proposta, venda);
    });
    
    // Filtrar pagamentos que correspondem às vendas da sigla
    const pagamentosFiltrados = primeirosPagamentos.filter(pagamento => 
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
      } else if (pagamento.status_pacote === 'I') {
        adimplentes++;
      } else {
        inadimplentes++;
      }
    });
    
    const total = adimplentes + inadimplentes + cancelados;
    const percentualAdimplencia = total > 0 ? (adimplentes / total) * 100 : 0;
    
    return {
      adimplentes,
      total,
      percentualAdimplencia
    };
  }, [vendas, primeirosPagamentos]);
  
  // Função para calcular o valor de face com base na porcentagem de adimplência
  const valorDeFace = useMemo(() => {
    const percentual = dadosPOS.percentualAdimplencia;
    
    if (percentual < 20) return 20;
    if (percentual < 30) return 40;
    if (percentual < 45) return 70;
    if (percentual < 55) return 110;
    if (percentual < 70) return 120;
    return 140;
  }, [dadosPOS.percentualAdimplencia]);
  
  // Determinar a classe de cor com base no valor de face
  const valorDeFaceColor = useMemo(() => {
    if (valorDeFace === 20) return "text-red-600";
    if (valorDeFace === 40) return "text-orange-500";
    if (valorDeFace === 70) return "text-yellow-500";
    if (valorDeFace === 110) return "text-lime-600";
    if (valorDeFace === 120) return "text-green-600";
    return "text-emerald-600";
  }, [valorDeFace]);
  
  // Cálculo do bônus meta POS
  const bonusMetaPOS = useMemo(() => {
    // Se não bateu meta, retorna 0%
    if (bateuMetaPOS === "nao") return 0;
    
    const percentualAdimplencia = dadosPOS.percentualAdimplencia;
    
    // Se permanência for entre 45% e 54.99%, bônus fixo de 10%
    if (percentualAdimplencia >= 45 && percentualAdimplencia < 55) return 10;
    
    // Se permanência >= 55%, usar tabela progressiva
    if (percentualAdimplencia >= 55) {
      switch (metaVolumePOS) {
        case "0-99.99": return 0;
        case "100-109.99": return 10;
        case "110-119.99": return 15;
        case "120-129.99": return 20;
        case "130+": return 30;
        default: return 0;
      }
    }
    
    return 0;
  }, [bateuMetaPOS, metaVolumePOS, dadosPOS.percentualAdimplencia]);
  
  // Verificar se o bônus é fixo (quando permanência está entre 45% e 54.99%)
  const bonusFixoPOS = useMemo(() => {
    return bateuMetaPOS === "sim" && 
           dadosPOS.percentualAdimplencia >= 45 && 
           dadosPOS.percentualAdimplencia < 55;
  }, [bateuMetaPOS, dadosPOS.percentualAdimplencia]);
  
  // Cálculo do bônus meta FIBRA
  const bonusMetaFIBRA = useMemo(() => {
    switch (metaVolumeFIBRA) {
      case "0-99.99": return 0;
      case "100-109.99": return 15;
      case "110-119.99": return 25;
      case "120-129.99": return 35;
      case "130+": return 45;
      default: return 0;
    }
  }, [metaVolumeFIBRA]);
  
  // Determinar a classe de cor com base no valor do bônus
  const getBonusColor = (bonus: number) => {
    if (bonus === 0) return "text-red-600";
    return "text-green-600"; // Verde para qualquer valor acima de 0%
  };

  // Buscar valores de POS e FIBRA usando a fonte correta conforme o período
  const valoresMetas = useMemo(() => {
    const mesAtual = new Date().getMonth() + 1;
    const anoAtual = new Date().getFullYear();
    
    // Verificar se estamos calculando permanência para o mês atual
    // Na aba Indicadores, quando selecionamos "Junho", estamos buscando vendas que geram permanência em junho
    // Isso significa vendas de Fevereiro (junho - 4 meses)
    // Então, se temos vendas filtradas, calculamos qual mês de permanência elas representam
    const mesPermanciaCalculado = vendas.length > 0 && vendas[0].data_habilitacao ? (() => {
      const dataHabilitacao = new Date(vendas[0].data_habilitacao);
      dataHabilitacao.setMonth(dataHabilitacao.getMonth() + 4); // Adiciona 4 meses para calcular permanência
      return {
        mes: dataHabilitacao.getMonth() + 1,
        ano: dataHabilitacao.getFullYear()
      };
    })() : null;
    
    const temVendasMesAtual = mesPermanciaCalculado && 
      mesPermanciaCalculado.mes === mesAtual && 
      mesPermanciaCalculado.ano === anoAtual;
    
    if (temVendasMesAtual) {
      // Usar dados da aba Metas para o mês atual
      const vendasDoMesAtual = vendasMeta.filter(venda => 
        venda.mes === mesAtual && venda.ano === anoAtual
      );
      
      // Mapear categorias (mesma lógica da guia Metas)
      const mapearCategoriaMeta = (categoria: string): string => {
        if (categoria.includes('PÓS-PAGO') || categoria.includes('POS')) return 'POS';
        if (categoria.includes('FIBRA') || categoria.includes('BL-DGO')) return 'FIBRA';
        return 'OUTROS';
      };
      
      // Agrupar valores por produto
      const valoresPorProduto = vendasDoMesAtual.reduce((acc, venda) => {
        const produto = mapearCategoriaMeta(venda.categoria);
        if (produto === 'POS' || produto === 'FIBRA') {
          acc[produto] = (acc[produto] || 0) + (venda.valor || 0);
        }
        return acc;
      }, {} as Record<string, number>);
      
      return {
        valorPOS: valoresPorProduto.POS || 0,
        valorFIBRA: valoresPorProduto.FIBRA || 0,
        fonte: 'metas' as const
      };
    } else {
      // Usar dados de vendas de permanência para meses anteriores
      const vendasParaCalculo = vendas.filter(venda => {
        const agrupamento = venda.agrupamento_produto || '';
        const produto = venda.produto_principal || '';
        return (
          agrupamento.includes('POS') || 
          agrupamento.includes('BL-DGO') ||
          produto.includes('POS') || 
          produto.includes('BL-DGO')
        );
      });
      
      // Mapear categorias
      const mapearCategoria = (agrupamento: string): string => {
        if (agrupamento.includes('POS')) return 'POS';
        if (agrupamento.includes('BL-DGO')) return 'FIBRA';
        return 'OUTROS';
      };
      
      // Agrupar valores por produto
      const valoresPorProduto = vendasParaCalculo.reduce((acc, venda) => {
        const produto = mapearCategoria(venda.agrupamento_produto || '');
        if (produto === 'POS' || produto === 'FIBRA') {
          acc[produto] = (acc[produto] || 0) + (venda.valor || 0);
        }
        return acc;
      }, {} as Record<string, number>);
      
      return {
        valorPOS: valoresPorProduto.POS || 0,
        valorFIBRA: valoresPorProduto.FIBRA || 0,
        fonte: 'permanencia' as const
      };
    }
  }, [vendas, vendasMeta]);

  // Calcular bonificações finais
  const bonificacoesPOS = useMemo(() => {
    const valorBase = valoresMetas?.valorPOS || 0;
    if (valorBase === 0) return { 
      valorBase: 0, 
      valorComPermanencia: 0, 
      valorFinal: 0, 
      bonusPermanencia: 0, 
      bonusMeta: 0 
    };
    
    // Aplicar permanência: Valor base + percentual de permanência
    // Se permanência é 110%, o valor fica: valor base + 10% (pois 110% = 100% + 10%)
    const bonusPermanencia = valorBase * ((valorDeFace - 100) / 100);
    const valorComPermanencia = valorBase + bonusPermanencia;
    
    // Aplicar bônus meta sobre o valor com permanência
    const bonusMeta = valorComPermanencia * (bonusMetaPOS / 100);
    const valorFinal = valorComPermanencia + bonusMeta;
    
    return {
      valorBase,
      valorComPermanencia,
      valorFinal,
      bonusPermanencia,
      bonusMeta
    };
  }, [valoresMetas?.valorPOS, valorDeFace, bonusMetaPOS]);

  const bonificacoesFIBRA = useMemo(() => {
    const valorBase = valoresMetas?.valorFIBRA || 0;
    if (valorBase === 0) return { valorBase: 0, valorFinal: 0, bonusMeta: 0 };
    
    // FIBRA não tem permanência, só bônus meta
    const bonusMeta = valorBase * (bonusMetaFIBRA / 100);
    const valorFinal = valorBase + bonusMeta;
    
    return {
      valorBase,
      valorFinal,
      bonusMeta
    };
  }, [valoresMetas?.valorFIBRA, bonusMetaFIBRA]);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          <div className="flex items-center">
            <BarChart2 className="mr-2 h-5 w-5" />
            Faixas de Desempenho e Bonificações - Vendas
          </div>
        </CardTitle>
        <CardDescription>
          Valor de face baseado na taxa de adimplência de vendas POS
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Verificar se há dados para exibir */}
        {(!valoresMetas || (valoresMetas.valorPOS === 0 && valoresMetas.valorFIBRA === 0)) ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-gray-400 mb-2">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado encontrado</h3>
              <p className="text-sm text-gray-500">
                Não há vendas para o período selecionado.
              </p>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda: 3 Quadros Menores */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {/* Quadro 1: Valor de Face */}
              <div className="border rounded-md p-4 bg-slate-50 flex flex-col items-center justify-center">
                <div className="text-center mb-2">
                  <h4 className="text-xs font-medium mb-1">Permanência POS</h4>
                  <div className="flex flex-col text-xs">
                    <span>Adimplentes: {dadosPOS.adimplentes} de {dadosPOS.total}</span>
                    <span className="font-bold">({dadosPOS.percentualAdimplencia.toFixed(2)}%)</span>
                  </div>
                </div>
                
                <div className="text-xs mb-1 text-center">Valor de Face:</div>
                <div className={`text-2xl font-bold text-center ${valorDeFaceColor}`}>
                  {valorDeFace}%
                </div>
                <div className="mt-1 text-xs text-center text-slate-500">
                  Taxa de adimplência
                </div>
              </div>
              
              {/* Quadro 2: Bônus Meta - POS */}
              <div className="border rounded-md p-3 bg-slate-50 flex flex-col">
                <h4 className="font-medium text-xs mb-2 text-center">Bônus Meta - POS</h4>
                
                <div className="space-y-2 mb-3">
                  <div>
                    <label className="text-xs mb-1 block">Bateu Meta?</label>
                    <Select 
                      value={bateuMetaPOS} 
                      onValueChange={(value) => setBateuMetaPOS(value as "sim" | "nao")}
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-xs mb-1 block">Meta de Volume (%):</label>
                    <Select 
                      value={metaVolumePOS} 
                      onValueChange={setMetaVolumePOS}
                      disabled={bateuMetaPOS === "nao" || bonusFixoPOS}
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-99.99">0% a 99,99%</SelectItem>
                        <SelectItem value="100-109.99">100% a 109,99%</SelectItem>
                        <SelectItem value="110-119.99">110% a 119,99%</SelectItem>
                        <SelectItem value="120-129.99">120% a 129,99%</SelectItem>
                        <SelectItem value="130+">≥ 130%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {bonusFixoPOS && (
                    <div className="text-xs text-blue-600 bg-blue-50 p-1 rounded">
                      Bônus fixo de 10% (permanência 45-54,99%)
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <div className="text-xs mb-1">Bônus:</div>
                  <div className={`text-xl font-bold ${getBonusColor(bonusMetaPOS)}`}>
                    {bonusMetaPOS}%
                  </div>
                </div>
              </div>
              
              {/* Quadro 3: Bônus Meta - FIBRA */}
              <div className="border rounded-md p-3 bg-slate-50 flex flex-col">
                <h4 className="font-medium text-xs mb-2 text-center">Bônus Meta - FIBRA</h4>
                
                <div className="space-y-2 mb-3">
                  <div>
                    <label className="text-xs mb-1 block">Meta de Volume (%):</label>
                    <Select 
                      value={metaVolumeFIBRA} 
                      onValueChange={setMetaVolumeFIBRA}
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-99.99">0% a 99,99%</SelectItem>
                        <SelectItem value="100-109.99">100% a 109,99%</SelectItem>
                        <SelectItem value="110-119.99">110% a 119,99%</SelectItem>
                        <SelectItem value="120-129.99">120% a 129,99%</SelectItem>
                        <SelectItem value="130+">≥ 130%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs mb-1">Bônus:</div>
                  <div className={`text-xl font-bold ${getBonusColor(bonusMetaFIBRA)}`}>
                    {bonusMetaFIBRA}%
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Coluna Direita: Quadro de Cálculo de Bonificações */}
          <ProtectedCard 
            title="Cálculo de Bonificações" 
            storageKey="indicadores_calculo_bonificacoes"
            className="border-l pl-6"
          >
            <div className="border-l pl-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Calculator className="mr-2 h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Cálculo de Bonificações</h3>
                </div>
                <div className="text-sm text-gray-600">
                  Fonte: {valoresMetas?.fonte === 'metas' ? 'Aba Metas (mês atual)' : 'Vendas Permanência (mês anterior)'} | POS: {(valoresMetas?.valorPOS || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | FIBRA: {(valoresMetas?.valorFIBRA || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bonificações POS */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold text-blue-800 mb-3">Bonificações POS</h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span>Valor Base (Vendas):</span>
                    <span className="font-semibold">
                      {(bonificacoesPOS?.valorBase || 0).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>+ Permanência ({valorDeFace}%):</span>
                    <span className="font-semibold text-green-600">
                      {(bonificacoesPOS?.bonusPermanencia || 0).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>= Valor com Permanência:</span>
                    <span className="font-semibold text-blue-600">
                      {(bonificacoesPOS?.valorComPermanencia || 0).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>+ Bônus Meta ({bonusMetaPOS}%):</span>
                    <span className="font-semibold text-green-600">
                      {(bonificacoesPOS?.bonusMeta || 0).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                  
                  <div className="border-t pt-2 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">VALOR FINAL:</span>
                      <span className="font-bold text-lg text-blue-800">
                        {(bonificacoesPOS?.valorFinal || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bonificações FIBRA */}
              <div className="border rounded-lg p-4 bg-green-50">
                <h4 className="font-semibold text-green-800 mb-3">Bonificações FIBRA</h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span>Valor Base (Vendas):</span>
                    <span className="font-semibold">
                      {(bonificacoesFIBRA?.valorBase || 0).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-gray-500">
                    <span>+ Permanência:</span>
                    <span className="text-xs">N/A para FIBRA</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>+ Bônus Meta ({bonusMetaFIBRA}%):</span>
                    <span className="font-semibold text-green-600">
                      {(bonificacoesFIBRA?.bonusMeta || 0).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                  
                  <div className="border-t pt-2 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">VALOR FINAL:</span>
                      <span className="font-bold text-lg text-green-800">
                        {(bonificacoesFIBRA?.valorFinal || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Total Geral */}
            <div className="mt-4 border rounded-lg p-4 bg-purple-50">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-purple-800">TOTAL GERAL (POS + FIBRA):</span>
                <span className="text-2xl font-bold text-purple-800">
                  {((bonificacoesPOS?.valorFinal || 0) + (bonificacoesFIBRA?.valorFinal || 0)).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </span>
              </div>
            </div>
            </div>
          </ProtectedCard>
        </div>
        )}
      </CardContent>
    </Card>
  );
} 