import React, { useMemo } from 'react';
import { MapIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          <div className="flex items-center">
            <MapIcon className="mr-2 h-5 w-5" />
            {titulo}
          </div>
        </CardTitle>
        <CardDescription className="text-sm">
          Top 10 cidades por volume de vendas instaladas
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-2">
          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-9 gap-1 text-sm font-semibold border-b-2 border-slate-200 pb-2 bg-slate-50 px-2 py-1 rounded-t-md">
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
          {dadosPorCidade.map((cidade, index) => {
            const percentual = totalGeral > 0 ? (cidade.total / totalGeral) * 100 : 0;
            return (
              <div 
                key={cidade.nome} 
                className={`grid grid-cols-9 gap-1 text-sm py-2 px-2 rounded-md transition-colors hover:bg-slate-100 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-slate-25'
                } border-b border-slate-100`}
              >
                <div className="col-span-2 truncate font-medium" title={cidade.nome}>
                  {cidade.nome}
                </div>
                <div className="text-center font-semibold text-slate-800">{cidade.total}</div>
                <div className="text-center text-slate-700">{cidade.pos}</div>
                <div className="text-center text-slate-700">{cidade.fibra}</div>
                <div className="text-center text-green-700 font-medium">{cidade.status.N}</div>
                <div className="text-center text-amber-600 font-medium">{cidade.status.S}</div>
                <div className="text-center text-red-600 font-medium">{cidade.status.C}</div>
                <div className="text-center text-blue-700 font-semibold">{percentual.toFixed(2)}%</div>
              </div>
            );
          })}
          
          {dadosPorCidade.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8 bg-slate-50 rounded-md">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 