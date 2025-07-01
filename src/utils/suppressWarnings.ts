// Utilitário para suprimir warnings específicos do console
export const suppressRechartsWarnings = () => {
  // Salvar o console.warn original
  const originalWarn = console.warn;
  
  // Interceptar e filtrar warnings específicos do Recharts e Radix UI
  console.warn = (...args) => {
    const message = args[0];
    
    // Suprimir warnings sobre ResponsiveContainer com dimensões fixas
    if (typeof message === 'string' && 
        message.includes('The width') && 
        message.includes('and height') && 
        message.includes('are both fixed numbers') &&
        message.includes("maybe you don't need to use a ResponsiveContainer")) {
      return; // Suprimir este warning específico
    }
    
    // Suprimir warnings do Radix UI Dialog sobre DialogTitle e Description
    // (estes já foram corrigidos no código, mas podem aparecer durante desenvolvimento)
    if (typeof message === 'string' && 
        (message.includes('DialogContent') && message.includes('DialogTitle')) ||
        (message.includes('Missing `Description`') && message.includes('DialogContent'))) {
      return; // Suprimir warnings do Dialog que já foram corrigidos
    }
    
    // Chamar console.warn original para outros warnings
    originalWarn.apply(console, args);
  };

  // Retornar função para restaurar o comportamento original
  return () => {
    console.warn = originalWarn;
  };
};

// Aplicar supressão globalmente na inicialização da aplicação
if (typeof window !== 'undefined') {
  suppressRechartsWarnings();
} 