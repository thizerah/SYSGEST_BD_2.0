/**
 * VendedorPorSiglaTable - Componente especializado para análise por sigla
 * Migrado do MetricsOverview original para usar DataVendasContext
 */

import React, { useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import useVendasData from '@/context/useVendasData';
import usePagamentosData from '@/context/usePagamentosData';
import { Venda, PrimeiroPagamento } from '@/types';

interface MetricasPorSigla {
  POS: {
    adimplentes: number;
    inadimplentes: number;
    cancelados: number;
    total: number;
    percentual_adimplencia: number;
  };
  "BL-DGO": {
    adimplentes: number;
    inadimplentes: number;
    cancelados: number;
    total: number;
    percentual_adimplencia: number;
  };
}

interface VendedorPorSigla {
  id_vendedor: string;
  nome_vendedor: string;
  siglas: MetricasPorSigla;
}

export function VendedorPorSiglaTable() {
  const { vendas } = useVendasData();
  const { primeirosPagamentos } = usePagamentosData();
  
  // Função para identificar a sigla de um produto
  const getSigla = useCallback((venda: Venda): string => {
    const agrupamento = venda.agrupamento_produto || '';
    const produto = venda.produto_principal || '';
    
    if (agrupamento.includes('POS') || produto.includes('POS')) return 'POS';
    if (agrupamento.includes('BL-DGO') || produto.includes('BL-DGO')) return 'BL-DGO';
    
    return '';
  }, []);
  
  // Função para calcular as métricas por vendedor e sigla
  const calcularMetricasPorVendedorESigla = useCallback(() => {
    const vendedoresMap = new Map<string, VendedorPorSigla>();
    
    // Se não há vendas ou pagamentos, retorna array vazio
    if (vendas.length === 0) {
      return [];
    }
    
    // Inicializar mapa de vendedores com estrutura vazia
    vendas.forEach(venda => {
      const id = venda.id_vendedor;
      if (!vendedoresMap.has(id)) {
        vendedoresMap.set(id, {
          id_vendedor: id,
          nome_vendedor: id, // Será atualizado depois
          siglas: {
            POS: {
              adimplentes: 0,
              inadimplentes: 0,
              cancelados: 0,
              total: 0,
              percentual_adimplencia: 0
            },
            "BL-DGO": {
              adimplentes: 0,
              inadimplentes: 0,
              cancelados: 0,
              total: 0,
              percentual_adimplencia: 0
            }
          }
        });
      }
      
      // Atualizar nome se estiver disponível
      const vendedorData = vendedoresMap.get(id)!;
      vendedorData.nome_vendedor = venda.nome_proprietario || id;
    });
    
    // Criar mapa de pagamentos por proposta
    const pagamentosMap = new Map<string, PrimeiroPagamento>();
    primeirosPagamentos.forEach(pagamento => {
      pagamentosMap.set(pagamento.proposta, pagamento);
    });
    
    // Processar todas as vendas para classificar por sigla e status
    vendas.forEach(venda => {
      const sigla = getSigla(venda);
      if (sigla === '') return; // Ignorar vendas sem sigla
      
      const vendedorData = vendedoresMap.get(venda.id_vendedor);
      if (!vendedorData) return; // Skip se não tiver vendedor
      
      const pagamento = pagamentosMap.get(venda.numero_proposta);
      
      // Determinar o status do cliente baseado no pagamento
      if (pagamento) {
        if (pagamento.status_pacote === 'C') {
          vendedorData.siglas[sigla].cancelados++;
        } else if (pagamento.status_pacote === 'S') {
          vendedorData.siglas[sigla].inadimplentes++;
        } else if (pagamento.status_pacote === 'N' && (!pagamento.data_passo_cobranca || pagamento.data_passo_cobranca === '')) {
          vendedorData.siglas[sigla].adimplentes++;
        } else if (pagamento.passo === '0' || pagamento.passo === '1') {
          vendedorData.siglas[sigla].adimplentes++;
        } else if (pagamento.status_pacote === 'I') {
          // Considerar inclusões como clientes ativos (adimplentes)
          vendedorData.siglas[sigla].adimplentes++;
        } else {
          vendedorData.siglas[sigla].inadimplentes++;
        }
      } else if (sigla === 'BL-DGO') {
        // BL-DGO sem pagamento é considerado inclusão (adimplente)
        vendedorData.siglas[sigla].adimplentes++;
      }
    });
    
    // Calcular totais e percentuais
    vendedoresMap.forEach(vendedor => {
      (['POS', 'BL-DGO'] as const).forEach(sigla => {
        const dados = vendedor.siglas[sigla];
        dados.total = dados.adimplentes + dados.inadimplentes + dados.cancelados;
        dados.percentual_adimplencia = dados.total > 0 ? (dados.adimplentes / dados.total) * 100 : 0;
      });
    });
    
    // Converter para array
    return Array.from(vendedoresMap.values());
  }, [vendas, primeirosPagamentos, getSigla]);
  
  // Calcular métricas
  const vendedoresPorSigla = useMemo(() => calcularMetricasPorVendedorESigla(), [calcularMetricasPorVendedorESigla]);
  
  // Função para obter a cor do percentual
  const getPercentualColor = useCallback((percentual: number) => {
    if (percentual <= 45.00) return "text-red-600";
    if (percentual <= 60.00) return "text-amber-600";
    return "text-green-600";
  }, []);

  if (vendas.length === 0) {
    return (
      <div className="mt-4 text-center text-sm text-muted-foreground">
        Importe arquivos de Vendas e Primeiro Pagamento para visualizar os dados por vendedor.
      </div>
    );
  }

  return (
    <>
      {/* Cartão para POS */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            Desempenho POS
          </CardTitle>
          <CardDescription>
            Análise de status de clientes por vendedor para serviços POS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Vendedor</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Adimplentes</TableHead>
                  <TableHead className="text-center">Inadimplentes</TableHead>
                  <TableHead className="text-center">Cancelados</TableHead>
                  <TableHead className="text-center">% Adimplência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedoresPorSigla.length > 0 ? (
                  vendedoresPorSigla.map((vendedor, index) => (
                    <TableRow key={`pos-${index}`}>
                      <TableCell className="font-medium">{vendedor.id_vendedor} - {vendedor.nome_vendedor}</TableCell>
                      <TableCell className="text-center font-medium">
                        {vendedor.siglas.POS.total}
                      </TableCell>
                      <TableCell className="text-center text-green-600 font-medium">
                        {vendedor.siglas.POS.adimplentes}
                      </TableCell>
                      <TableCell className="text-center text-amber-600 font-medium">
                        {vendedor.siglas.POS.inadimplentes}
                      </TableCell>
                      <TableCell className="text-center text-red-600 font-medium">
                        {vendedor.siglas.POS.cancelados}
                      </TableCell>
                      <TableCell className={`text-center font-bold ${getPercentualColor(vendedor.siglas.POS.percentual_adimplencia)}`}>
                        {vendedor.siglas.POS.percentual_adimplencia.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      Nenhum dado de vendedor disponível para POS
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cartão para BL-DGO */}
      <Card>
        <CardHeader>
          <CardTitle>
            Desempenho FIBRA (BL-DGO)
          </CardTitle>
          <CardDescription>
            Análise de status de clientes por vendedor para serviços FIBRA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Vendedor</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Adimplentes</TableHead>
                  <TableHead className="text-center">Inadimplentes</TableHead>
                  <TableHead className="text-center">Cancelados</TableHead>
                  <TableHead className="text-center">% Adimplência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedoresPorSigla.length > 0 ? (
                  vendedoresPorSigla.map((vendedor, index) => (
                    <TableRow key={`bldgo-${index}`}>
                      <TableCell className="font-medium">{vendedor.id_vendedor} - {vendedor.nome_vendedor}</TableCell>
                      <TableCell className="text-center font-medium">
                        {vendedor.siglas["BL-DGO"].total}
                      </TableCell>
                      <TableCell className="text-center text-green-600 font-medium">
                        {vendedor.siglas["BL-DGO"].adimplentes}
                      </TableCell>
                      <TableCell className="text-center text-amber-600 font-medium">
                        {vendedor.siglas["BL-DGO"].inadimplentes}
                      </TableCell>
                      <TableCell className="text-center text-red-600 font-medium">
                        {vendedor.siglas["BL-DGO"].cancelados}
                      </TableCell>
                      <TableCell className={`text-center font-bold ${getPercentualColor(vendedor.siglas["BL-DGO"].percentual_adimplencia)}`}>
                        {vendedor.siglas["BL-DGO"].percentual_adimplencia.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      Nenhum dado de vendedor disponível para FIBRA
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
} 