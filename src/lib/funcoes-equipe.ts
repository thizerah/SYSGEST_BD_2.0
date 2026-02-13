/**
 * Funções (cargos) da equipe — Cadastro de Usuários.
 * Usado no dropdown de função ao adicionar/editar pessoa.
 */

export const FUNCOES_EQUIPE = [
  { codigo: 'tecnico', nome: 'Técnico' },
  { codigo: 'controlador', nome: 'Controlador' },
  { codigo: 'backoffice', nome: 'Backoffice' },
  { codigo: 'estoquista', nome: 'Estoquista' },
  { codigo: 'vendedor', nome: 'Vendedor' },
  { codigo: 'gerente_operacional', nome: 'Gerente Operacional' },
  { codigo: 'gerente_comercial', nome: 'Gerente Comercial' },
  { codigo: 'gerente_geral', nome: 'Gerente Geral' },
  { codigo: 'supervisor_operacional', nome: 'Supervisor Operacional' },
  { codigo: 'supervisor_comercial', nome: 'Supervisor Comercial' },
  { codigo: 'supervisor', nome: 'Supervisor' },
] as const;

export type FuncaoEquipeCodigo = (typeof FUNCOES_EQUIPE)[number]['codigo'];

const byCodigo = new Map(FUNCOES_EQUIPE.map((f) => [f.codigo, f.nome]));

export function nomeFuncao(codigo: string): string {
  return byCodigo.get(codigo) ?? codigo;
}
