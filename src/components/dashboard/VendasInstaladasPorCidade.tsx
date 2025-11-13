import React, { useMemo } from 'react';
import { MapIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import useData from '@/context/useData';
import type { Venda } from '@/types';

interface VendasInstaladasPorCidadeProps {
  vendasFiltradas: Venda[];
  titulo?: string;
}

export function VendasInstaladasPorCidade({ vendasFiltradas, titulo = "Vendas Instaladas por Cidade" }: VendasInstaladasPorCidadeProps) {
  const { primeirosPagamentos } = useData();

  // Função para identificar a sigla de um produto
  const getSigla = (venda: Venda): string => {
    const agrupamento = venda.agrupamento_produto || '';
    const produto = venda.produto_principal || '';
    
    if (agrupamento.includes('POS') || produto.includes('POS')) return 'POS';
    if (agrupamento.includes('BL-DGO') || produto.includes('BL-DGO')) return 'FIBRA';
    
    return '';
  };

  // Mapear pagamentos por proposta
  const pagamentosPorProposta = useMemo(() => {
    const map = new Map();
    primeirosPagamentos.forEach(pagamento => {
      map.set(pagamento.proposta, pagamento);
    });
    return map;
  }, [primeirosPagamentos]);

  // Processar dados por cidade usando vendas filtradas - APENAS POS PAGO
  const dadosPorCidade = useMemo(() => {
    const cidadesMap = new Map();
    
    vendasFiltradas.forEach(venda => {
      const cidade = venda.cidade || 'Não informado';
      const sigla = getSigla(venda);
      
      // Filtrar apenas vendas POS, excluindo FIBRA/BL-DGO
      if (sigla !== 'POS') return;
      
      if (!cidadesMap.has(cidade)) {
        cidadesMap.set(cidade, {
          nome: cidade,
          total: 0,
          pos: 0,
          status: {
            N: 0, // Normal
            S: 0, // Suspenso
            C: 0, // Cancelado
            B: 0, // ?
            NC: 0, // Não Cobrança
          }
        });
      }
      
      const dadosCidade = cidadesMap.get(cidade);
      dadosCidade.total++;
      dadosCidade.pos++;
      
      // Contar por status de pagamento
      const pagamento = pagamentosPorProposta.get(venda.numero_proposta);
      if (pagamento) {
        const status = pagamento.status_pacote || 'N';
        if (Object.prototype.hasOwnProperty.call(dadosCidade.status, status)) {
          dadosCidade.status[status]++;
        } else {
          dadosCidade.status.N++; // Default para Normal
        }
      } else {
        // Sem pagamento = considerado Normal
        dadosCidade.status.N++;
      }
    });
    
    // Converter para array e ordenar por total decrescente
    return Array.from(cidadesMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 cidades
  }, [vendasFiltradas, pagamentosPorProposta]);

  // Calcular total geral para percentuais - APENAS POS PAGO
  const totalGeral = useMemo(() => {
    return vendasFiltradas.filter(venda => getSigla(venda) === 'POS').length;
  }, [vendasFiltradas]);

  return (
    <Card className="w-full shadow-lg border-2">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b-2 pb-4">
        <CardTitle className="text-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <MapIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-gray-800 font-semibold">{titulo}</span>
          </div>
        </CardTitle>
        <CardDescription className="text-sm mt-2 text-gray-600">
          Top 10 cidades por volume de vendas POS instaladas
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-1">
          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-7 gap-2 text-xs font-semibold bg-gray-100 px-3 py-3 rounded-lg border border-gray-200">
            <div className="col-span-2 text-gray-700">Cidade</div>
            <div className="text-center text-gray-700">POS</div>
            <div className="text-center text-green-700">ATIVOS</div>
            <div className="text-center text-amber-600">INADIMPLENTES</div>
            <div className="text-center text-red-600">CANCELADOS</div>
            <div className="text-center text-blue-700">% Permanência</div>
          </div>
          
          {/* Dados das cidades */}
          {dadosPorCidade.map((cidade, index) => {
            // Percentual de permanência = (N / Total) * 100
            const percentualPermanencia = cidade.total > 0 ? (cidade.status.N / cidade.total) * 100 : 0;
            return (
              <div 
                key={cidade.nome} 
                className={`grid grid-cols-7 gap-2 text-sm py-3 px-3 rounded-lg transition-all hover:shadow-md ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                } border border-gray-100`}
              >
                <div className="col-span-2 truncate font-semibold text-gray-900" title={cidade.nome}>
                  {cidade.nome}
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-semibold px-2 py-0.5">
                    {cidade.pos}
                  </Badge>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 font-semibold px-2 py-0.5">
                    {cidade.status.N}
                  </Badge>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-semibold px-2 py-0.5">
                    {cidade.status.S}
                  </Badge>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 font-semibold px-2 py-0.5">
                    {cidade.status.C}
                  </Badge>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-bold px-2 py-0.5">
                    {percentualPermanencia.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            );
          })}
          
          {dadosPorCidade.length === 0 && (
            <div className="text-center text-sm text-gray-500 py-8 bg-gray-50 rounded-lg border border-gray-200">
              <MapIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              Nenhum dado disponível
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 