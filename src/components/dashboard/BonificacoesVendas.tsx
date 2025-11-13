import { Calculator, TrendingUp, DollarSign, Target, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import useData from "@/context/useData";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Venda } from "@/types";
import { ProtectedCard } from "@/components/common/ProtectedCard";

interface BonificacoesVendasProps {
  vendasFiltradas?: Venda[]; // Para cálculo de valor base (data_habilitacao)
  vendasParaPermanencia?: Venda[]; // Para cálculo de percentual de permanência (mês de permanência)
  isMesAtual?: boolean; // Indica se o período selecionado é o mês atual
}

export function BonificacoesVendas({ vendasFiltradas, vendasParaPermanencia, isMesAtual = false }: BonificacoesVendasProps) {
  const data = useData();
  const { vendas: todasVendas, primeirosPagamentos, vendasMeta } = data;
  
  // Usar vendas filtradas se fornecidas, senão usar todas as vendas (para cálculo de valor base)
  const vendas = vendasFiltradas || todasVendas;
  
  // Para cálculo de permanência, usar vendasParaPermanencia se fornecida, senão usar vendas (mesma fonte)
  const vendasParaCalculoPermanencia = vendasParaPermanencia || vendas;
  
  // Estados para os dropdowns
  const [bateuMetaPOS, setBateuMetaPOS] = useState<"sim" | "nao">("nao");
  const [metaVolumePOS, setMetaVolumePOS] = useState<string>("0-99.99");
  
  // Calcular percentual de adimplência usando vendas de permanência
  const dadosPOS = useMemo(() => {
    // Filtrar vendas pela sigla POS (usar vendas de permanência para o cálculo de percentual)
    const vendasFiltradasPOS = vendasParaCalculoPermanencia.filter(venda => {
      const agrupamento = venda.agrupamento_produto || '';
      const produto = venda.produto_principal || '';
      return agrupamento.includes('POS') || produto.includes('POS');
    });
    
    // Mapear vendas por número de proposta
    const vendasMap = new Map();
    vendasFiltradasPOS.forEach(venda => {
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
  }, [vendasParaCalculoPermanencia, primeirosPagamentos]);
  
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
  
  // Verificar se o bônus é fixo
  const bonusFixoPOS = useMemo(() => {
    return bateuMetaPOS === "sim" && 
           dadosPOS.percentualAdimplencia >= 45 && 
           dadosPOS.percentualAdimplencia < 55;
  }, [bateuMetaPOS, dadosPOS.percentualAdimplencia]);

  // Buscar valores de POS usando a fonte correta conforme o período (para valor base)
  const valoresMetas = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    // Usar a prop isMesAtual para determinar a fonte de dados
    if (isMesAtual) {
      // Usar dados da aba Metas para o mês atual
      const vendasDoMesAtual = vendasMeta.filter(venda => 
        venda.mes === mesAtual && venda.ano === anoAtual
      );
      
      // Mapear categorias
      const mapearCategoriaMeta = (categoria: string): string => {
        if (categoria.includes('PÓS-PAGO') || categoria.includes('POS')) return 'POS';
        return 'OUTROS';
      };
      
      // Agrupar valores por produto
      const valoresPorProduto = vendasDoMesAtual.reduce((acc, venda) => {
        const produto = mapearCategoriaMeta(venda.categoria);
        if (produto === 'POS') {
          acc[produto] = (acc[produto] || 0) + (venda.valor || 0);
        }
        return acc;
      }, {} as Record<string, number>);
      
      return {
        valorPOS: valoresPorProduto.POS || 0,
        fonte: 'metas' as const
      };
    } else {
      // Usar dados de vendas de habilitação para meses anteriores (valor base)
      const vendasParaCalculo = vendas.filter(venda => {
        const agrupamento = venda.agrupamento_produto || '';
        const produto = venda.produto_principal || '';
        return (
          agrupamento.includes('POS') || 
          produto.includes('POS')
        );
      });
      
      // Agrupar valores por produto
      const valoresPorProduto = vendasParaCalculo.reduce((acc, venda) => {
        const produto = 'POS'; // Já filtrado acima
        acc[produto] = (acc[produto] || 0) + (venda.valor || 0);
        return acc;
      }, {} as Record<string, number>);
      
      return {
        valorPOS: valoresPorProduto.POS || 0,
        fonte: 'permanencia' as const
      };
    }
  }, [isMesAtual, vendas, vendasMeta]);

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
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  return (
    <Card className="w-full border-2 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-500 rounded-lg shadow-md">
              <Calculator className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-gray-800">Cálculo de Bonificações - POS</CardTitle>
              <CardDescription className="text-xs mt-0.5 text-gray-600">
                Fonte: {valoresMetas?.fonte === 'metas' ? 'Vendas Meta (mês atual)' : 'Vendas Permanência (mês anterior)'} | 
                Valor Base: <span className="font-semibold">{formatCurrency(valoresMetas?.valorPOS || 0)}</span>
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Layout em 3 colunas: Permanência, Bônus Meta e Cálculo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card de Permanência */}
          <Card className="border-2 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 pb-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base font-bold text-gray-800">Permanência POS</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Adimplentes</span>
                  <Badge className="bg-green-600 text-white font-bold px-3 py-1">
                    {dadosPOS.adimplentes} de {dadosPOS.total}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Percentual</span>
                  <Badge className="bg-blue-600 text-white font-bold px-3 py-1 text-sm">
                    {dadosPOS.percentualAdimplencia.toFixed(2)}%
                  </Badge>
                </div>
                <div className="border-t pt-3 mt-2">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Valor de Face</div>
                    <div className={`text-3xl font-bold ${valorDeFaceColor}`}>
                      {valorDeFace}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Bônus Meta */}
          <Card className="border-2 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 pb-3">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-base font-bold text-gray-800">Bônus Meta - POS</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-2 block">Bateu Meta?</Label>
                <Select 
                  value={bateuMetaPOS} 
                  onValueChange={(value) => setBateuMetaPOS(value as "sim" | "nao")}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-2 block">Meta de Volume (%)</Label>
                <Select 
                  value={metaVolumePOS} 
                  onValueChange={setMetaVolumePOS}
                  disabled={bateuMetaPOS === "nao" || bonusFixoPOS}
                >
                  <SelectTrigger className="w-full h-10">
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
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-2">
                  <p className="text-xs text-blue-800 font-medium">
                    Bônus fixo de 10% (permanência 45-54,99%)
                  </p>
                </div>
              )}
              
              <div className="border-t pt-3 mt-2">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Bônus Aplicado</div>
                  <div className={`text-3xl font-bold ${bonusMetaPOS > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {bonusMetaPOS}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Cálculo de Bonificações */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md">
            <CardHeader className="border-b-2 border-blue-300 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-gray-800">Bonificações POS</CardTitle>
                  <CardDescription className="text-xs text-gray-600 mt-1">
                    Cálculo detalhado das bonificações aplicadas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {/* Valor Base */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-gray-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Valor Base (Vendas)</span>
                </div>
                <span className="text-base font-bold text-gray-900">
                  {formatCurrency(bonificacoesPOS?.valorBase || 0)}
                </span>
              </div>
              
              {/* Permanência */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    + Permanência ({valorDeFace}%)
                  </span>
                </div>
                <span className="text-base font-bold text-green-600">
                  {formatCurrency(bonificacoesPOS?.bonusPermanencia || 0)}
                </span>
              </div>
              
              {/* Valor com Permanência */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-300 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calculator className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">= Valor com Permanência</span>
                </div>
                <span className="text-lg font-bold text-blue-700">
                  {formatCurrency(bonificacoesPOS?.valorComPermanencia || 0)}
                </span>
              </div>
              
              {/* Bônus Meta */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Target className="h-5 w-5 text-orange-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    + Bônus Meta ({bonusMetaPOS}%)
                  </span>
                </div>
                <span className="text-base font-bold text-orange-600">
                  {formatCurrency(bonificacoesPOS?.bonusMeta || 0)}
                </span>
              </div>
              
              {/* Valor Final */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border-2 border-green-400 shadow-md mt-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-green-600 rounded-lg">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-base font-bold text-gray-900">VALOR FINAL</span>
                </div>
                <span className="text-xl font-bold text-green-700">
                  {formatCurrency(bonificacoesPOS?.valorFinal || 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

