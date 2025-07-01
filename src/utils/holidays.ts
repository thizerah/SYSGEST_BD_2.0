// Arquivo para gerenciar os feriados nacionais

// Lista de feriados fixos (mês-dia)
export const feriadosFixos = [
  '01-01', // Ano Novo
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência do Brasil
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '12-25', // Natal
];

// Função para verificar se uma data é um feriado fixo
export function isFeriadoFixo(date: Date): boolean {
  const mesDia = date.toISOString().slice(5, 10);
  return feriadosFixos.includes(mesDia);
}

// Função para calcular a data da Páscoa (Algoritmo de Computus)
export function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(ano, mes - 1, dia);
}

// Função para verificar se uma data é um feriado móvel
export function isFeriadoMovel(date: Date): boolean {
  const ano = date.getFullYear();
  const pascoa = calcularPascoa(ano);

  // Sexta-feira Santa (2 dias antes da Páscoa)
  const sextaSanta = new Date(pascoa);
  sextaSanta.setDate(pascoa.getDate() - 2);

  // Carnaval (47 dias antes da Páscoa)
  const carnaval = new Date(pascoa);
  carnaval.setDate(pascoa.getDate() - 47);
  
  // Terça-feira de Carnaval
  const tercaCarnaval = new Date(pascoa);
  tercaCarnaval.setDate(pascoa.getDate() - 47);

  // Segunda-feira de Carnaval
  const segundaCarnaval = new Date(pascoa);
  segundaCarnaval.setDate(pascoa.getDate() - 48);

  // Corpus Christi (60 dias após a Páscoa)
  const corpusChristi = new Date(pascoa);
  corpusChristi.setDate(pascoa.getDate() + 60);

  // Comparar as datas (apenas mês, dia e ano)
  function isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  return (
    isSameDate(date, pascoa) ||
    isSameDate(date, sextaSanta) ||
    isSameDate(date, carnaval) ||
    isSameDate(date, segundaCarnaval) ||
    isSameDate(date, tercaCarnaval) ||
    isSameDate(date, corpusChristi)
  );
}

// Função para verificar se uma data é um feriado (fixo ou móvel)
export function isFeriado(date: Date): boolean {
  return isFeriadoFixo(date) || isFeriadoMovel(date);
}

// Função para verificar se uma data é um domingo
export function isDomingo(date: Date): boolean {
  return date.getDay() === 0; // 0 = Domingo
}

// Função para contar feriados e domingos entre duas datas
export function contarFeriadosEDomingos(dataInicio: Date, dataFim: Date, incluirFeriados: boolean = true, incluirDomingos: boolean = true): number {
  let contador = 0;
  const dataAtual = new Date(dataInicio);

  // Avançar para evitar contar o mesmo dia duas vezes
  dataAtual.setDate(dataAtual.getDate() + 1);

  while (dataAtual < dataFim) {
    const isDataFeriado = incluirFeriados && isFeriado(dataAtual);
    const isDataDomingo = incluirDomingos && isDomingo(dataAtual);

    if (isDataFeriado || isDataDomingo) {
      contador++;
    }

    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  return contador;
}

// Função para ajustar o tempo de atendimento considerando feriados e domingos
export function ajustarTempoAtendimento(
  tempoAtendimentoHoras: number, 
  dataCriacao: Date, 
  dataFinalizacao: Date, 
  tipoAtendimento: string
): number {
  // Verificar se as datas são válidas
  if (!dataCriacao || !dataFinalizacao || isNaN(dataCriacao.getTime()) || isNaN(dataFinalizacao.getTime())) {
    console.warn(`[AVISO] Datas inválidas no cálculo de ajuste: Criação=${dataCriacao}, Finalização=${dataFinalizacao}`);
    return tempoAtendimentoHoras;
  }
  
  // Verificar se a data de finalização é posterior à data de criação
  if (dataFinalizacao < dataCriacao) {
    console.warn(`[AVISO] Data de finalização anterior à data de criação: Criação=${dataCriacao.toLocaleString()}, Finalização=${dataFinalizacao.toLocaleString()}`);
    return tempoAtendimentoHoras;
  }
  
  // Para "Assistência Técnica FIBRA", não fazemos ajustes (consideramos 24 horas corridas)
  if (tipoAtendimento === "Assistência Técnica FIBRA") {
    return tempoAtendimentoHoras;
  }

  // Para os demais tipos de atendimento, desconsideramos domingos e feriados nacionais
  let horasParaDescontar = 0;
  
  // Criar cópia das datas
  const dataInicio = new Date(dataCriacao);
  const dataFim = new Date(dataFinalizacao);
  
  // Normalizar para início do dia (00:00:00)
  const inicioProximoDia = new Date(dataInicio);
  inicioProximoDia.setDate(inicioProximoDia.getDate() + 1);
  inicioProximoDia.setHours(0, 0, 0, 0);
  
  // Normalizar para fim do dia anterior à finalização (23:59:59)
  const fimDiaAnterior = new Date(dataFim);
  fimDiaAnterior.setHours(0, 0, 0, 0);
  
  // Verificar dias completos (de 00:00 a 23:59)
  const dataAtual = new Date(inicioProximoDia);
  
  while (dataAtual < fimDiaAnterior) {
    // Se for domingo ou feriado, adicionar 24h ao contador
    if (isDomingo(dataAtual) || isFeriado(dataAtual)) {
      horasParaDescontar += 24;
    }
    
    // Avançar para o próximo dia
    dataAtual.setDate(dataAtual.getDate() + 1);
  }
  
  // Verificar caso especial: dia da criação é domingo ou feriado
  if (isDomingo(dataInicio) || isFeriado(dataInicio)) {
    // Calcular quantas horas desse dia estão dentro do período
    const horasFimDia = 24 - dataInicio.getHours() - (dataInicio.getMinutes() / 60);
    
    // Se a finalização ocorreu no mesmo dia, apenas descontar o tempo entre criação e finalização
    if (dataInicio.getDate() === dataFim.getDate() && 
        dataInicio.getMonth() === dataFim.getMonth() &&
        dataInicio.getFullYear() === dataFim.getFullYear()) {
      // Não descontar nada, pois o tempo já é apenas as horas efetivas
    } else {
      // Descontar as horas restantes do dia
      horasParaDescontar += horasFimDia;
    }
  }
  
  // Verificar caso especial: dia da finalização é domingo ou feriado
  if (isDomingo(dataFim) || isFeriado(dataFim)) {
    // Calcular quantas horas desse dia estão dentro do período
    const horasInicioDia = dataFim.getHours() + (dataFim.getMinutes() / 60);
    
    // Se a criação ocorreu no mesmo dia, já está tratado acima
    if (!(dataInicio.getDate() === dataFim.getDate() && 
          dataInicio.getMonth() === dataFim.getMonth() &&
          dataInicio.getFullYear() === dataFim.getFullYear())) {
      // Descontar as horas do início do dia até a finalização
      horasParaDescontar += horasInicioDia;
    }
  }
  
  // Subtrair horas para cada dia que deve ser desconsiderado
  const tempoAjustado = Math.max(0, tempoAtendimentoHoras - horasParaDescontar);
  
  // Sistema de logs condicionais
  const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
  const isVerboseDebug = isDevelopment && typeof localStorage !== 'undefined' && localStorage.getItem('sysgest_debug_verbose') === 'true';
  
  // Registrar o ajuste para depuração (apenas em modo verbose)
  if (horasParaDescontar > 0 && isVerboseDebug) {
    console.log(`[DEBUG] Cálculo de Feriados/Domingos - Tipo: ${tipoAtendimento}`);
    console.log(`[DEBUG] Data Criação: ${dataInicio.toLocaleString()}, Data Finalização: ${dataFim.toLocaleString()}`);
    
    // Listar os dias que foram descontados
    const diasDescontados = [];
    const dataTemp = new Date(inicioProximoDia);
    while (dataTemp < fimDiaAnterior) {
      if (isDomingo(dataTemp) || isFeriado(dataTemp)) {
        const tipoDia = isDomingo(dataTemp) ? 'Domingo' : 'Feriado';
        diasDescontados.push(`${tipoDia}: ${dataTemp.toLocaleDateString()}`);
      }
      dataTemp.setDate(dataTemp.getDate() + 1);
    }
    
    // Verificar dias especiais (criação/finalização)
    if (isDomingo(dataInicio) || isFeriado(dataInicio)) {
      const tipoDia = isDomingo(dataInicio) ? 'Domingo' : 'Feriado';
      diasDescontados.push(`${tipoDia} (dia criação): ${dataInicio.toLocaleDateString()}`);
    }
    
    if (isDomingo(dataFim) || isFeriado(dataFim)) {
      const tipoDia = isDomingo(dataFim) ? 'Domingo' : 'Feriado';
      diasDescontados.push(`${tipoDia} (dia finalização): ${dataFim.toLocaleDateString()}`);
    }
    
    if (diasDescontados.length > 0) {
      console.log(`[DEBUG] Dias descontados: ${diasDescontados.join(', ')}`);
    }
    
    console.log(`[DEBUG] Ajuste de tempo: ${horasParaDescontar.toFixed(2)} hora(s) de folga descontada(s) do cálculo.`);
    console.log(`[DEBUG] Tempo original: ${tempoAtendimentoHoras.toFixed(2)}h → Tempo ajustado: ${tempoAjustado.toFixed(2)}h`);
  }
  
  return tempoAjustado;
} 