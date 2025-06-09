import React, { useMemo } from 'react';
import { MapIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import useData from '@/context/useData';
import type { Venda } from '@/types';

interface VendasInstaladasPorCidadeProps {
  vendasFiltradas: Venda[];
}

export function VendasInstaladasPorCidade({ vendasFiltradas }: VendasInstaladasPorCidadeProps) {
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

  // Processar dados por cidade usando vendas filtradas
  const dadosPorCidade = useMemo(() => {
    const cidadesMap = new Map();
    
    vendasFiltradas.forEach(venda => {
      const cidade = venda.cidade || 'Não informado';
      const sigla = getSigla(venda);
      
      if (!sigla) return; // Ignorar vendas sem sigla
      
      if (!cidadesMap.has(cidade)) {
        cidadesMap.set(cidade, {
          nome: cidade,
          total: 0,
          pos: 0,
          fibra: 0,
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
      
      // Contar por sigla
      if (sigla === 'POS') {
        dadosCidade.pos++;
      } else if (sigla === 'FIBRA') {
        dadosCidade.fibra++;
      }
      
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
        // Sem pagamento = considerado Normal para FIBRA (inclusão)
        dadosCidade.status.N++;
      }
    });
    
    // Converter para array e ordenar por total decrescente
    return Array.from(cidadesMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 cidades
  }, [vendasFiltradas, pagamentosPorProposta]);

  // Calcular total geral para percentuais
  const totalGeral = useMemo(() => {
    return vendasFiltradas.filter(venda => getSigla(venda) !== '').length;
  }, [vendasFiltradas]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          <div className="flex items-center">
            <MapIcon className="mr-2 h-4 w-4" />
            Vendas Instaladas por Cidade
          </div>
        </CardTitle>
        <CardDescription className="text-xs">
          Top 10 cidades por volume de vendas instaladas
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-1">
          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-9 gap-0.5 text-xs font-medium border-b pb-1">
            <div className="col-span-2">Cidade</div>
            <div className="text-center">Total</div>
            <div className="text-center">POS</div>
            <div className="text-center">FIBRA</div>
            <div className="text-center">N</div>
            <div className="text-center">S</div>
            <div className="text-center">C</div>
            <div className="text-center">%</div>
          </div>
          
          {/* Dados das cidades */}
          {dadosPorCidade.map((cidade) => {
            const percentual = totalGeral > 0 ? (cidade.total / totalGeral) * 100 : 0;
            return (
              <div key={cidade.nome} className="grid grid-cols-9 gap-0.5 text-xs py-0.5 hover:bg-slate-50">
                <div className="col-span-2 truncate" title={cidade.nome}>
                  {cidade.nome}
                </div>
                <div className="text-center font-medium">{cidade.total}</div>
                <div className="text-center">{cidade.pos}</div>
                <div className="text-center">{cidade.fibra}</div>
                <div className="text-center text-green-600">{cidade.status.N}</div>
                <div className="text-center text-yellow-600">{cidade.status.S}</div>
                <div className="text-center text-red-600">{cidade.status.C}</div>
                <div className="text-center text-blue-600 font-medium">{percentual.toFixed(1)}%</div>
              </div>
            );
          })}
          
          {dadosPorCidade.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-4">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 