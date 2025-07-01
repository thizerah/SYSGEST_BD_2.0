// Script para criar dados de teste com aba BASE
// Execute este script no console do navegador para baixar um arquivo Excel de teste

const XLSX = window.XLSX || require('xlsx');

// Dados de exemplo para a aba BASE
const dadosBase = [
  { "MÊS": "Janeiro", "BASE TV": 1500, "BASE FIBRA": 2300, "ALIANCA": 800 },
  { "MÊS": "Fevereiro", "BASE TV": 1520, "BASE FIBRA": 2350, "ALIANCA": 820 },
  { "MÊS": "Março", "BASE TV": 1480, "BASE FIBRA": 2400, "ALIANCA": 850 },
  { "MÊS": "Abril", "BASE TV": 1550, "BASE FIBRA": 2450, "ALIANCA": 880 },
  { "MÊS": "Maio", "BASE TV": 1600, "BASE FIBRA": 2500, "ALIANCA": 900 }
];

// Dados de exemplo para a aba Serviços (simplificado)
const dadosServicos = [
  {
    "Código OS": "OS001",
    "Criação": "01/01/2025 08:00",
    "Finalização": "01/01/2025 10:30",
    "Status": "Finalizada",
    "Subtipo do Serviço": "Assistência Técnica TV",
    "Motivo": "Problema no sinal",
    "Nome do Técnico": "João Silva",
    "Cidade": "São Paulo",
    "Bairro": "Centro"
  },
  {
    "Código OS": "OS002", 
    "Criação": "01/01/2025 09:00",
    "Finalização": "01/01/2025 11:00",
    "Status": "Finalizada",
    "Subtipo do Serviço": "Assistência Técnica FIBRA",
    "Motivo": "Lentidão na internet",
    "Nome do Técnico": "Maria Santos",
    "Cidade": "São Paulo", 
    "Bairro": "Vila Madalena"
  }
];

// Criar workbook
const wb = XLSX.utils.book_new();

// Adicionar aba BASE
const wsBase = XLSX.utils.json_to_sheet(dadosBase);
XLSX.utils.book_append_sheet(wb, wsBase, "BASE");

// Adicionar aba Serviços
const wsServicos = XLSX.utils.json_to_sheet(dadosServicos);
XLSX.utils.book_append_sheet(wb, wsServicos, "Serviços");

// Baixar arquivo
XLSX.writeFile(wb, "teste-base-dados.xlsx");

console.log("Arquivo teste-base-dados.xlsx criado com sucesso!");
console.log("Abas criadas: BASE, Serviços");
console.log("Dados BASE:", dadosBase); 