/**
 * Mapeamentos de campos para importação de dados
 * Centralização de todos os mapeamentos espalhados pelo projeto
 */

// Mapeamento de campos de ordens de serviço (Excel → Interface)
export const SERVICE_ORDER_FIELD_MAPPING = {
  "Código OS": "codigo_os",
  "ID Técnico": "id_tecnico",
  "Técnico": "nome_tecnico",
  "SGL": "sigla_tecnico",
  "Tipo de serviço": "tipo_servico",
  "Sub-Tipo de serviço": "subtipo_servico",
  "Motivo": "motivo",
  "Código Cliente": "codigo_cliente",
  "Cliente": "nome_cliente",
  "Status": "status",
  "Criação": "data_criacao",
  "Finalização": "data_finalizacao",
  "FInalização": "data_finalizacao", // Tratamento para typo comum
  "Info: ponto_de_ref": "info_ponto_de_referencia",
  "Info: info_cto": "info_cto",
  "Info: info_porta": "info_porta",
  "Info: info_endereco_completo": "info_endereco_completo",
  "Info: info_empresa_parceira": "info_empresa_parceira",
  "Endereço": "endereco",
  "Bairro": "bairro",
  "Complemento": "complemento",
  "CEP": "cep",
  "Cidade": "cidade",
  "UF": "uf",
  "Pacote": "pacote",
  "Tel. Cel": "telefone_celular",
  "Tel. Com": "telefone_comercial",
  "Total IRD": "total_ird",
  "Código Item (não permita duplicacao)": "codigo_item",
  "Ação Tomada": "acao_tomada"
} as const;

// Mapeamento de campos de vendas (Excel → Interface)
export const SALES_FIELD_MAPPING = {
  "Número da proposta": "numero_proposta",
  "ID do vendedor": "id_vendedor",
  "Nome proprietário": "nome_proprietario",
  "CPF": "cpf",
  "Nome fantasia": "nome_fantasia",
  "Agrupamento do produto": "agrupamento_produto",
  "Produto principal": "produto_principal",
  "Valor": "valor",
  "Status da proposta": "status_proposta",
  "Data de habilitação": "data_habilitacao",
  "Telefone celular": "telefone_celular"
} as const;

// Mapeamento de campos de pagamentos (Excel → Interface)
export const PAYMENT_FIELD_MAPPING = {
  "Proposta": "proposta",
  "Passo": "passo",
  "Data passo cobrança": "data_passo_cobranca",
  "Vencimento fatura": "vencimento_fatura",
  "Status pacote": "status_pacote"
} as const;

// Nomes alternativos possíveis para campos de vendas
export const SALES_FIELD_ALTERNATIVES = {
  numero_proposta: [
    "Número da proposta",
    "Numero da proposta", 
    "Proposta",
    "N° Proposta",
    "Num Proposta"
  ],
  id_vendedor: [
    "ID do vendedor",
    "Id do vendedor",
    "ID Vendedor",
    "Vendedor ID",
    "Código Vendedor"
  ],
  nome_proprietario: [
    "Nome proprietário",
    "Nome proprietario",
    "Proprietário",
    "Proprietario",
    "Nome do proprietário"
  ],
  cpf: [
    "CPF",
    "Cpf",
    "CPF Cliente",
    "CPF do Cliente"
  ],
  nome_fantasia: [
    "Nome fantasia",
    "Nome Fantasia",
    "Razão Social",
    "Razao Social"
  ],
  agrupamento_produto: [
    "Agrupamento do produto",
    "Agrupamento produto",
    "Grupo Produto",
    "Tipo Produto"
  ],
  produto_principal: [
    "Produto principal",
    "Produto Principal",
    "Produto",
    "Nome Produto"
  ],
  valor: [
    "Valor",
    "Valor Produto",
    "Preço",
    "Preco",
    "Valor Total"
  ],
  status_proposta: [
    "Status da proposta",
    "Status proposta",
    "Status",
    "Situação",
    "Situacao"
  ],
  data_habilitacao: [
    "Data de habilitação",
    "Data habilitação",
    "Data de habilitacao",
    "Data habilitacao",
    "Data Ativação",
    "Data Ativacao"
  ],
  telefone_celular: [
    "Telefone celular",
    "Tel. Celular",
    "Celular",
    "Telefone"
  ]
} as const;

// Nomes alternativos possíveis para campos de pagamentos
export const PAYMENT_FIELD_ALTERNATIVES = {
  proposta: [
    "Proposta",
    "Número da proposta",
    "N° Proposta"
  ],
  passo: [
    "Passo",
    "Etapa",
    "Status"
  ],
  data_passo_cobranca: [
    "Data passo cobrança",
    "Data passo cobranca",
    "Data cobrança",
    "Data cobranca",
    "Data do passo"
  ],
  vencimento_fatura: [
    "Vencimento fatura",
    "Vencimento",
    "Data vencimento",
    "Venc. Fatura"
  ],
  status_pacote: [
    "Status pacote",
    "Status do pacote",
    "Situação pacote",
    "Situacao pacote"
  ]
} as const;

// Validação de tipos para os mapeamentos
export type ServiceOrderFieldKey = keyof typeof SERVICE_ORDER_FIELD_MAPPING;
export type SalesFieldKey = keyof typeof SALES_FIELD_MAPPING;
export type PaymentFieldKey = keyof typeof PAYMENT_FIELD_MAPPING; 