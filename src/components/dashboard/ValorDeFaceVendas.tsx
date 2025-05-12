import { BarChart2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useData from "@/context/useData";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ValorDeFaceVendas() {
  const { vendas, primeirosPagamentos } = useData();
  
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
        <div className="flex flex-col items-center space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {/* Quadro 1: Valor de Face */}
            <div className="border rounded-md p-6 bg-slate-50 flex flex-col items-center justify-center">
              <div className="text-center mb-3">
                <h4 className="text-sm font-medium mb-1">Permanência POS</h4>
                <div className="flex space-x-2 justify-center">
                  <span>Adimplentes: {dadosPOS.adimplentes} de {dadosPOS.total}</span>
                  <span className="font-bold">({dadosPOS.percentualAdimplencia.toFixed(2)}%)</span>
                </div>
              </div>
              
              <div className="text-sm mb-1">Valor de Face Aplicado:</div>
              <div className={`text-4xl font-bold ${valorDeFaceColor}`}>
                {valorDeFace}%
              </div>
              <div className="mt-2 text-xs text-center text-slate-500">
                Com base na taxa de adimplência acima
              </div>
            </div>
            
            {/* Quadro 2: Bônus Meta - POS */}
            <div className="border rounded-md p-4 bg-slate-50 flex flex-col">
              <h4 className="font-medium text-sm mb-3 text-center">Bônus Meta - POS</h4>
              
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs mb-1 block">Bateu Meta?</label>
                  <Select 
                    value={bateuMetaPOS} 
                    onValueChange={(value) => setBateuMetaPOS(value as "sim" | "nao")}
                  >
                    <SelectTrigger className="w-full">
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
                    <SelectTrigger className="w-full">
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
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    Com permanência entre 45% e 54,99%, o bônus é fixo em 10% independente da meta de volume.
                  </div>
                )}
              </div>
              
              <div className="mt-auto pt-2 text-center">
                <div className="text-sm mb-1">Indicador de Bônus:</div>
                <div className={`text-3xl font-bold ${getBonusColor(bonusMetaPOS)}`}>
                  {bonusMetaPOS}%
                </div>
              </div>
            </div>
            
            {/* Quadro 3: Bônus Meta - FIBRA */}
            <div className="border rounded-md p-4 bg-slate-50 flex flex-col">
              <h4 className="font-medium text-sm mb-3 text-center">Bônus Meta - FIBRA</h4>
              
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs mb-1 block">Meta de Volume (%):</label>
                  <Select 
                    value={metaVolumeFIBRA} 
                    onValueChange={setMetaVolumeFIBRA}
                  >
                    <SelectTrigger className="w-full">
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
              
              <div className="mt-auto pt-2 text-center">
                <div className="text-sm mb-1">Indicador de Bônus:</div>
                <div className={`text-3xl font-bold ${getBonusColor(bonusMetaFIBRA)}`}>
                  {bonusMetaFIBRA}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 