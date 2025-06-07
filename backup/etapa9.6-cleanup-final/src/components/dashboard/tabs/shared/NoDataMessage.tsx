/**
 * Componente de mensagem quando não há dados para exibir
 * Usa componentes da Etapa 3 (EmptyState)
 */

import React from 'react';
import { NoDataState } from '@/components/common';

export function NoDataMessage() {
  return (
    <NoDataState 
      title="Selecione um período"
      description="Escolha um mês e ano nos filtros acima para visualizar os dados."
    />
  );
} 