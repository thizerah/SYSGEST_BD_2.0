import type { RotaOS } from '@/types';

/** Normaliza string para busca: minúsculas, sem acentos, trim. */
export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Retorna só dígitos do telefone. */
export function normalizeTelefone(s: string): string {
  return (s || '').replace(/\D/g, '');
}

/** Busca OSs por nome do cliente (partial match, ignora acentos). */
export function buscarOSPorNome(oss: RotaOS[], termo: string): RotaOS[] {
  const t = normalizeForSearch(termo);
  if (!t) return [];
  return oss.filter((os) => normalizeForSearch(os.nome_cliente || '').includes(t));
}

/** Busca OSs por telefone (qualquer um dos campos). Normaliza e exige que o número do OS contenha os dígitos informados. */
export function buscarOSPorTelefone(oss: RotaOS[], termo: string): RotaOS[] {
  const digits = normalizeTelefone(termo);
  if (digits.length < 4) return [];
  const fields = (os: RotaOS) =>
    [os.telefone, os.telefone_comercial, os.telefone_residencial]
      .filter(Boolean)
      .map(normalizeTelefone);
  return oss.filter((os) =>
    fields(os).some((num) => num.length >= digits.length && num.includes(digits))
  );
}

/** Ordena por data_agendada desc e retorna a primeira (último serviço). */
export function obterUltimaOS(oss: RotaOS[]): RotaOS | undefined {
  if (oss.length === 0) return undefined;
  const sorted = [...oss].sort((a, b) => {
    const da = a.data_agendada || '';
    const db = b.data_agendada || '';
    return db.localeCompare(da);
  });
  return sorted[0];
}

/** Histórico do cliente: mesmo codigo_cliente, data_agendada < dataRef, ordenado por data desc.
 * Exclui OSs pendentes e sem data (são OSs novas/posteriores).
 * dataRef: use data_agendada da OS atual ou, se vazia, hoje (yyyy-MM-dd) para mostrar histórico mesmo sem data. */
export function obterHistoricoCliente(
  oss: RotaOS[],
  codigoCliente: string,
  dataRef: string
): RotaOS[] {
  if (!codigoCliente) return [];
  const ref = dataRef || new Date().toISOString().slice(0, 10);
  return oss
    .filter(
      (os) =>
        os.codigo_cliente === codigoCliente &&
        !!os.data_agendada &&
        os.data_agendada < ref &&
        os.status !== 'pendente'
    )
    .sort((a, b) => (b.data_agendada || '').localeCompare(a.data_agendada || ''));
}

/** Gera código OS no formato OSC + 8 dígitos (ex.: OSC12345678). */
export function gerarCodigoOSC(): string {
  const n = Date.now().toString().slice(-8);
  return `OSC${n}`;
}

/** Extrai motivo do cancelamento ou reagendamento das observações (última ocorrência). */
export function extrairMotivoDasObservacoes(
  observacoes: string | undefined,
  tipo: 'cancelamento' | 'reagendamento'
): string {
  if (!observacoes) return 'Não informado';
  const prefixo = tipo === 'cancelamento' ? 'Motivo do cancelamento:' : 'Motivo do reagendamento:';
  const indice = observacoes.lastIndexOf(prefixo);
  if (indice === -1) return 'Não informado';
  const textoAposPrefixo = observacoes.substring(indice + prefixo.length).trim();
  const proximoPrefixo = tipo === 'cancelamento' ? 'Motivo do reagendamento:' : 'Motivo do cancelamento:';
  const indiceProximoPrefixo = textoAposPrefixo.indexOf(proximoPrefixo);
  if (indiceProximoPrefixo !== -1) {
    const motivo = textoAposPrefixo.substring(0, indiceProximoPrefixo).trim();
    return motivo.split('\n')[0].trim() || 'Não informado';
  }
  return textoAposPrefixo.split('\n')[0].trim() || 'Não informado';
}
