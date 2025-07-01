// Script para adicionar dados BASE de teste no localStorage
// Execute este comando no console do navegador para testar a funcionalidade

const dadosBaseTeste = [
  {
    mes: "Janeiro",
    base_tv: 9200,
    base_fibra: 380,
    alianca: 4.1
  },
  {
    mes: "Fevereiro", 
    base_tv: 9300,
    base_fibra: 390,
    alianca: 4.2
  },
  {
    mes: "Março",
    base_tv: 9500,
    base_fibra: 410, 
    alianca: 4.3
  },
  {
    mes: "Abril",
    base_tv: 9630,
    base_fibra: 441,
    alianca: 4.7
  },
  {
    mes: "Maio",
    base_tv: 9742,
    base_fibra: 417,
    alianca: 4.27
  },
  {
    mes: "Junho",
    base_tv: 9850,
    base_fibra: 450,
    alianca: 4.5
  }
];

// Salvar no localStorage
localStorage.setItem('sysgest_base_data', JSON.stringify(dadosBaseTeste));

console.log('✅ Dados BASE de teste adicionados!');
console.log('📊 Recarregue a página para ver as seções BASE funcionando');
console.log('🎯 Verifique os cards de Assistência Técnica TV/FIBRA'); 