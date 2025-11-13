import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ServiceOrder, MATERIAIS_PADRAO } from "@/types";
import { Eye, Package, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface MaterialViewerProps {
  order: ServiceOrder;
  isOpen: boolean;
  onClose: () => void;
}

export function MaterialViewer({ order, isOpen, onClose }: MaterialViewerProps) {
  // Verificar otimização de consumo
  const verificarOtimizacao = () => {
    const tipoServico = order.tipo_servico;
    const motivo = order.motivo;
    
    // Condições para verificar otimização
    const isPontoPrincipalIndividual = (tipoServico === "Ponto Principal" || tipoServico === "Instalação") && motivo === "Individual";
    const isReinstalacaoNovoEndereco = motivo === "Reinstalacao Novo Endereco";
    
    if (!isPontoPrincipalIndividual && !isReinstalacaoNovoEndereco) {
      return null; // Não aplicável
    }
    
    // Materiais para verificação de otimização
    const materiaisOtimizacao = [
      "ANTENA 150 CM C/ KIT FIXACAO",
      "ANTENA 75 CM",
      "ANTENA 90CM C/ KIT FIXACAO",
      "ANTENA DE 60 CM C/ KIT FIXACAO",
      "LNBF SIMPLES ANTENA 45/60/90 CM", 
      "LNBF DUPLO ANTENA 45/60/90 CM"
    ];
    
    const materiaisComQuantidade = order.materiais || [];
    
     // Verificar todas as antenas (soma como LNB)
     const antena150 = materiaisComQuantidade.find(m => m.nome === "ANTENA 150 CM C/ KIT FIXACAO");
     const antena75 = materiaisComQuantidade.find(m => m.nome === "ANTENA 75 CM");
     const antena90 = materiaisComQuantidade.find(m => m.nome === "ANTENA 90CM C/ KIT FIXACAO");
     const antena60 = materiaisComQuantidade.find(m => m.nome === "ANTENA DE 60 CM C/ KIT FIXACAO");
     const quantidadeAntena150 = antena150?.quantidade || 0;
     const quantidadeAntena75 = antena75?.quantidade || 0;
     const quantidadeAntena90 = antena90?.quantidade || 0;
     const quantidadeAntena60 = antena60?.quantidade || 0;
     const somaAntenas = quantidadeAntena150 + quantidadeAntena75 + quantidadeAntena90 + quantidadeAntena60;
     const antenasOtimizadas = somaAntenas === 0;
     
     // Verificar LNBFs (tratados como 1 item só)
     const lnbfSimplesEncontrado = materiaisComQuantidade.find(m => m.nome === "LNBF SIMPLES ANTENA 45/60/90 CM");
     const lnbfDuploEncontrado = materiaisComQuantidade.find(m => m.nome === "LNBF DUPLO ANTENA 45/60/90 CM");
     const quantidadeLnbfSimples = lnbfSimplesEncontrado?.quantidade || 0;
     const quantidadeLnbfDuplo = lnbfDuploEncontrado?.quantidade || 0;
     
     // LNBFs são otimizados apenas se AMBOS estiverem com quantidade 0
     const lnbfsOtimizados = quantidadeLnbfSimples === 0 && quantidadeLnbfDuplo === 0;
     
     // Status geral: otimizado se ANTENAS e LNBFs estiverem otimizados
     const todosOtimizados = antenasOtimizadas && lnbfsOtimizados;
     const nenhumOtimizado = !antenasOtimizadas && !lnbfsOtimizados;
     
     // Criar array de status para exibição
     const statusMateriais = [
       {
         nome: "ANTENA 150 CM C/ KIT FIXACAO",
         quantidade: quantidadeAntena150,
         otimizado: antenasOtimizadas // Usa o status conjunto das antenas
       },
       {
         nome: "ANTENA 75 CM",
         quantidade: quantidadeAntena75,
         otimizado: antenasOtimizadas
       },
       {
         nome: "ANTENA 90CM C/ KIT FIXACAO",
         quantidade: quantidadeAntena90,
         otimizado: antenasOtimizadas
       },
       {
         nome: "ANTENA DE 60 CM C/ KIT FIXACAO",
         quantidade: quantidadeAntena60,
         otimizado: antenasOtimizadas
       },
       {
         nome: "LNBF SIMPLES ANTENA 45/60/90 CM",
         quantidade: quantidadeLnbfSimples,
         otimizado: lnbfsOtimizados // Usa o status conjunto dos LNBFs
       },
       {
         nome: "LNBF DUPLO ANTENA 45/60/90 CM",
         quantidade: quantidadeLnbfDuplo,
         otimizado: lnbfsOtimizados // Usa o status conjunto dos LNBFs
       }
     ];
     
     if (todosOtimizados) return { status: "otimizado", cor: "green", materiais: statusMateriais };
     if (nenhumOtimizado) return { status: "nao_otimizado", cor: "red", materiais: statusMateriais };
     return { status: "parcial", cor: "yellow", materiais: statusMateriais };
  };
  
  const statusOtimizacao = verificarOtimizacao();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <span className="text-gray-700">Materiais</span>
              <span className="text-blue-600 font-bold ml-2">OS {order.codigo_os}</span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 py-4 space-y-4">
          {/* Informações da OS */}
          <div className="p-4 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-700 min-w-[70px]">Cliente:</span>
                <span className="text-gray-900">{order.nome_cliente || "N/A"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-700 min-w-[70px]">Técnico:</span>
                <span className="text-gray-900">{order.nome_tecnico || "N/A"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-700 min-w-[70px]">Tipo:</span>
                <span className="text-gray-900">{order.tipo_servico || "N/A"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-700 min-w-[70px]">Motivo:</span>
                <span className="text-gray-900">{order.motivo || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Status de Otimização */}
          {statusOtimizacao && (
            <div className={`p-4 rounded-xl border-2 shadow-md ${
              statusOtimizacao.cor === 'green' 
                ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' :
              statusOtimizacao.cor === 'yellow' 
                ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50' :
              'border-red-300 bg-gradient-to-br from-red-50 to-rose-50'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${
                  statusOtimizacao.cor === 'green' ? 'bg-green-100' :
                  statusOtimizacao.cor === 'yellow' ? 'bg-yellow-100' :
                  'bg-red-100'
                }`}>
                  <AlertCircle className={`h-5 w-5 ${
                    statusOtimizacao.cor === 'green' ? 'text-green-700' :
                    statusOtimizacao.cor === 'yellow' ? 'text-yellow-700' :
                    'text-red-700'
                  }`} />
                </div>
                <h4 className="font-semibold text-base text-gray-800">Status de Otimização</h4>
              </div>
              <div className="flex items-center gap-2 mb-3">
                {statusOtimizacao.status === "otimizado" && (
                  <Badge variant="default" className="bg-green-600 text-white px-4 py-1.5 text-sm font-semibold shadow-sm">
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Otimização completa
                  </Badge>
                )}
                {statusOtimizacao.status === "nao_otimizado" && (
                  <Badge variant="destructive" className="bg-red-600 text-white px-4 py-1.5 text-sm font-semibold shadow-sm">
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Sem otimização
                  </Badge>
                )}
                {statusOtimizacao.status === "parcial" && (
                  <Badge variant="secondary" className="bg-yellow-500 text-white px-4 py-1.5 text-sm font-semibold shadow-sm">
                    <Eye className="h-4 w-4 mr-1.5" />
                    Otimização parcial
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-600 bg-white/60 rounded-md px-3 py-2 border border-gray-200">
                <span className="font-medium">Aplicável para:</span> Ponto Principal/Instalação + Individual ou qualquer tipo + Reinstalacao Novo Endereco
              </p>
            </div>
          )}
          
          {/* Materiais Padrão */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <Package className="h-4 w-4 text-indigo-600" />
              </div>
              <h4 className="font-semibold text-base text-gray-800">Materiais Padrão</h4>
            </div>
            <div className="space-y-2">
              {MATERIAIS_PADRAO.map((material, index) => {
                const materialEncontrado = order.materiais?.find(m => m.nome === material);
                const quantidade = materialEncontrado?.quantidade || 0;
                
                // Verificar se este material é usado para otimização
                const materiaisOtimizacao = [
                  "ANTENA 150 CM C/ KIT FIXACAO",
                  "ANTENA 75 CM",
                  "ANTENA 90CM C/ KIT FIXACAO",
                  "ANTENA DE 60 CM C/ KIT FIXACAO",
                  "LNBF SIMPLES ANTENA 45/60/90 CM",
                  "LNBF DUPLO ANTENA 45/60/90 CM"
                ];
                const isMaterialOtimizacao = materiaisOtimizacao.includes(material);
                
                // Só mostrar badge de otimização se for aplicável para esta OS
                const isAplicavelOtimizacao = statusOtimizacao !== null;
                
                // Lógica especial para Antenas: mostrar apenas as que têm quantidade > 0
                if (isMaterialOtimizacao && material.includes("ANTENA")) {
                  // Mostrar apenas a antena atual se ela tiver quantidade > 0
                  if (quantidade === 0) {
                    return null;
                  }
                }
                
                // Lógica especial para LNBFs: mostrar apenas os que têm quantidade > 0
                if (isMaterialOtimizacao && material.includes("LNBF")) {
                  // Mostrar apenas o LNBF atual se ele tiver quantidade > 0
                  if (quantidade === 0) {
                    return null;
                  }
                }
                
                // Verificar se é uma antena (todas as 4)
                const isAntena = material.includes("ANTENA");
                let isOtimizado = quantidade === 0;
                
                if (isAntena && isAplicavelOtimizacao) {
                  // Soma todas as antenas
                  const antena150 = order.materiais?.find(m => m.nome === "ANTENA 150 CM C/ KIT FIXACAO");
                  const antena75 = order.materiais?.find(m => m.nome === "ANTENA 75 CM");
                  const antena90 = order.materiais?.find(m => m.nome === "ANTENA 90CM C/ KIT FIXACAO");
                  const antena60 = order.materiais?.find(m => m.nome === "ANTENA DE 60 CM C/ KIT FIXACAO");
                  const somaAntenas = (antena150?.quantidade || 0) + 
                                      (antena75?.quantidade || 0) + 
                                      (antena90?.quantidade || 0) + 
                                      (antena60?.quantidade || 0);
                  // Antenas são otimizadas apenas se TODAS estiverem com quantidade 0
                  isOtimizado = somaAntenas === 0;
                } else if (material.includes("LNBF") && isAplicavelOtimizacao) {
                  const lnbfSimplesEncontrado = order.materiais?.find(m => m.nome === "LNBF SIMPLES ANTENA 45/60/90 CM");
                  const lnbfDuploEncontrado = order.materiais?.find(m => m.nome === "LNBF DUPLO ANTENA 45/60/90 CM");
                  const quantidadeLnbfSimples = lnbfSimplesEncontrado?.quantidade || 0;
                  const quantidadeLnbfDuplo = lnbfDuploEncontrado?.quantidade || 0;
                  
                  // LNBFs são otimizados apenas se AMBOS estiverem com quantidade 0
                  isOtimizado = quantidadeLnbfSimples === 0 && quantidadeLnbfDuplo === 0;
                }
                
                return (
                  <div 
                    key={material} 
                    className={`flex justify-between items-center p-3 rounded-lg border transition-all hover:shadow-md ${
                      index % 2 === 0 
                        ? 'bg-white border-gray-200' 
                        : 'bg-gray-50/50 border-gray-200'
                    } ${
                      isMaterialOtimizacao && isAplicavelOtimizacao 
                        ? 'border-l-4 border-l-blue-400' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-medium text-gray-800 flex-1">{material}</span>
                      {isMaterialOtimizacao && isAplicavelOtimizacao && (
                        <Badge 
                          variant={isOtimizado ? "default" : "destructive"}
                          className={`text-xs px-2.5 py-0.5 font-semibold ${
                            isOtimizado 
                              ? 'bg-green-500 text-white border-green-600' 
                              : 'bg-red-500 text-white border-red-600'
                          }`}
                        >
                          {isOtimizado ? '✓ Otimizado' : '✗ Não otimizado'}
                        </Badge>
                      )}
                    </div>
                    <Badge 
                      variant={quantidade > 0 ? "default" : "secondary"}
                      className={`ml-3 px-3 py-1 font-bold text-sm min-w-[45px] text-center ${
                        quantidade > 0 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {quantidade}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Outros Materiais */}
          {order.materiais && order.materiais.filter(m => !MATERIAIS_PADRAO.includes(m.nome as any)).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <Package className="h-4 w-4 text-purple-600" />
                </div>
                <h4 className="font-semibold text-base text-gray-800">Outros Materiais Utilizados</h4>
              </div>
              <div className="space-y-2">
                {order.materiais
                  .filter(m => !MATERIAIS_PADRAO.includes(m.nome as any))
                  .map((material, index) => (
                    <div 
                      key={material.nome} 
                      className={`flex justify-between items-center p-3 rounded-lg border transition-all hover:shadow-md ${
                        index % 2 === 0 
                          ? 'bg-white border-gray-200' 
                          : 'bg-gray-50/50 border-gray-200'
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-800">{material.nome}</span>
                      <Badge 
                        variant="default" 
                        className="ml-3 px-3 py-1 font-bold text-sm bg-purple-600 text-white min-w-[45px] text-center"
                      >
                        {material.quantidade}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Mensagem quando não há materiais */}
          {(!order.materiais || order.materiais.length === 0) && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 font-medium">Nenhum material registrado para esta ordem de serviço</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
