// Este é um arquivo temporário apenas para mostrar a correção necessária

/* 
O problema está nesta parte do arquivo MetricsOverview.tsx:

Linha aproximada ~2990:
```
  // Filtrar propostas com base nos critérios selecionados
  const propostasFiltradas = useMemo(() => {
    ...
    return filtradas.sort((a, b) => {
      const pagamentoA = pagamentosPorProposta.get(a.numero_proposta);  // <-- ERRO: pagamentosPorProposta é usado aqui
      ...
    });
  }, [vendas, ..., pagamentosPorProposta]);  // <-- ERRO: pagamentosPorProposta é usado aqui antes de ser declarado
  
  // Mapear pagamentos por número de proposta para facilitar acesso
  const pagamentosPorProposta = useMemo(() => {  // <-- ERRO: declarado depois do uso
    ...
  }, [primeirosPagamentos]);
```

A correção é simples: mover a declaração de pagamentosPorProposta para antes de propostasFiltradas:

```
  // Mapear pagamentos por número de proposta para facilitar acesso
  const pagamentosPorProposta = useMemo(() => {  
    const map = new Map<string, PrimeiroPagamento>();
    primeirosPagamentos.forEach(pagamento => {
      map.set(pagamento.proposta, pagamento);
    });
    return map;
  }, [primeirosPagamentos]);
  
  // Filtrar propostas com base nos critérios selecionados
  const propostasFiltradas = useMemo(() => {
    ...
    return filtradas.sort((a, b) => {
      const pagamentoA = pagamentosPorProposta.get(a.numero_proposta);  // Agora está correto
      ...
    });
  }, [vendas, ..., pagamentosPorProposta]); // Agora está correto
```

Além disso, também há outra variável duplicada que precisa ser removida:
- Remover a variável `propostasOrdenadasPorDataImportacao` que também está causando problemas

Ao fazer essas alterações, o código ficará correto e os erros serão resolvidos.
*/ 