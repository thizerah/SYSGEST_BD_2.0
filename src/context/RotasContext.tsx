import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { RotaOS, Rota, TecnicoRota, SugestaoTecnico, StatusRotaOS, RegistroTempo, MaterialRota, FotoOS } from '@/types';
import { useAuth } from './auth';
import { useToast } from '@/components/ui/use-toast';
import { fetchEquipe } from '@/lib/equipe';
import {
  fetchRoteiroOs,
  fetchRotas,
  fetchMediasTempo,
  insertRoteiroOs,
  updateRoteiroOs,
  deleteRoteiroOs,
  insertRota,
  updateRota,
  deleteRota,
  upsertMediasTempo,
  deleteAllRoteiroOs,
  deleteAllRotas,
  deleteAllMediasTempo,
} from '@/lib/roteiro';

interface RotasContextData {
  // Estado
  rotas: Rota[];
  osRotas: RotaOS[];
  tecnicos: TecnicoRota[];
  loading: boolean;
  ultimaAtualizacao: Date | null;

  // Refresh
  recarregarDados: () => Promise<void>;

  // CRUD de OSs
  adicionarOS: (os: Omit<RotaOS, 'id' | 'status' | 'data_importacao' | 'user_id'>) => void;
  adicionarOSEmLote: (oss: Omit<RotaOS, 'id' | 'status' | 'data_importacao' | 'user_id'>[]) => void;
  atualizarOS: (id: string, dados: Partial<RotaOS>) => void;
  removerOS: (id: string) => void;
  buscarOSPorId: (id: string) => RotaOS | undefined;
  buscarOSPorData: (data: string) => RotaOS[];
  buscarOSPorTecnico: (tecnicoId: string) => RotaOS[];
  buscarOSPorStatus: (status: StatusRotaOS) => RotaOS[];

  // Atribuição de técnicos
  atribuirTecnico: (osId: string, tecnicoId: string) => void;
  atribuirTecnicoEmLote: (osIds: string[], tecnicoId: string, data: string) => void;
  removerAtribuicao: (osId: string) => void;
  obterSugestoesTecnico: (osId: string) => SugestaoTecnico[];

  // Gerenciamento de rotas
  criarRota: (tecnicoId: string, data: string, osIds: string[]) => Rota | null;
  buscarRotaPorId: (id: string) => Rota | undefined;
  buscarRotasPorData: (data: string) => Rota[];
  buscarRotasPorTecnico: (tecnicoId: string) => Rota[];
  removerRota: (id: string) => void;

  // Execução do serviço (técnico em campo)
  registrarChegada: (osId: string) => void;
  registrarSaida: (osId: string) => void;
  adicionarMaterial: (osId: string, material: MaterialRota) => void;
  removerMaterial: (osId: string, materialNome: string) => void;
  adicionarFoto: (osId: string, foto: FotoOS) => void;
  registrarAssinatura: (osId: string, assinatura: string) => void;
  preFinalizar: (osId: string, observacoes?: string) => void;

  // Torre de controle
  confirmarFinalizacao: (osId: string) => void;
  cancelarOS: (osId: string, motivo: string) => void;
  reagendarOS: (osId: string, novaData: string) => void;

  // Técnicos
  adicionarTecnico: (tecnico: Omit<TecnicoRota, 'id'>) => void;
  atualizarTecnico: (id: string, dados: Partial<TecnicoRota>) => void;
  removerTecnico: (id: string) => void;

  // Utilidades
  limparDados: () => void;
  exportarDados: () => string;
  importarDados: (dados: string) => void;

  // Médias de tempo
  obterMediaTempoPorTipo: (tipoServico: string) => number;
  atualizarMediaTempo: (os: RotaOS) => void;
}

const RotasContext = createContext<RotasContextData | undefined>(undefined);

// Interface para médias de tempo por tipo de serviço (estado local, espelha Supabase)
interface MediaTempoPorTipo {
  tipo_servico: string;
  tempos: number[];
  ultima_atualizacao: string;
}

interface RotasProviderProps {
  children: ReactNode;
}

function formatDateYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function RotasProvider({ children }: RotasProviderProps) {
  const { user, authExtras } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;

  const [osRotas, setOsRotas] = useState<RotaOS[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [tecnicos, setTecnicos] = useState<TecnicoRota[]>([]);
  const [mediasTempo, setMediasTempo] = useState<MediaTempoPorTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const userId = user?.id ?? '';

  // Função para carregar/recarregar dados
  const carregarDados = useCallback(async () => {
    if (!donoUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [os, rt, medias, equipe] = await Promise.all([
        fetchRoteiroOs(donoUserId),
        fetchRotas(donoUserId),
        fetchMediasTempo(donoUserId),
        fetchEquipe(donoUserId),
      ]);
      setOsRotas(os);
      setRotas(rt);
      setMediasTempo(
        medias.map((m) => ({
          tipo_servico: m.tipo_servico,
          tempos: (Array.isArray(m.tempos) ? m.tempos : []) as number[],
          ultima_atualizacao: m.ultima_atualizacao ?? new Date().toISOString(),
        }))
      );
      const apenasTecnicos = equipe.filter((e) =>
        (e.funcao ?? '').toLowerCase().replace(/\s/g, '') === 'tecnico' ||
        (e.funcao ?? '').toLowerCase().replace(/\s/g, '') === 'técnico'
      );
      setTecnicos(apenasTecnicos.map((e) => ({ id: e.id, nome: e.nome_completo })));
      setUltimaAtualizacao(new Date());
    } catch (err) {
      console.error('Erro ao carregar roteiro:', err);
      toast({
        title: 'Erro ao carregar roteiro',
        description: err instanceof Error ? err.message : 'Não foi possível carregar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [donoUserId, toast]);

  // Função exposta para recarregar dados manualmente
  const recarregarDados = useCallback(async () => {
    await carregarDados();
  }, [carregarDados]);

  // Carregar roteiro (OSs, rotas, médias) e técnicos do Supabase
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // ============================================
  // CRUD DE OSs
  // ============================================

  const adicionarOS = useCallback(
    (os: Omit<RotaOS, 'id' | 'status' | 'data_importacao' | 'user_id'>) => {
      if (!donoUserId || !userId) return;
      const uid = userId;
      insertRoteiroOs(donoUserId, uid, { ...os, data_agendada: os.data_agendada ?? formatDateYMD(new Date()) })
        .then((novaOS) => {
          setOsRotas((prev) => [...prev, novaOS]);
        })
        .catch((err) => {
          toast({
            title: 'Erro ao adicionar OS',
            description: err instanceof Error ? err.message : 'Tente novamente.',
            variant: 'destructive',
          });
        });
    },
    [donoUserId, userId, toast]
  );

  const adicionarOSEmLote = useCallback(
    (oss: Omit<RotaOS, 'id' | 'status' | 'data_importacao' | 'user_id'>[]) => {
      if (!donoUserId || !userId) return;
      const uid = userId;
      const run = async () => {
        const inserted: RotaOS[] = [];
        for (const os of oss) {
          try {
            const novaOS = await insertRoteiroOs(donoUserId!, uid, {
              ...os,
              data_agendada: os.data_agendada ?? formatDateYMD(new Date()),
            });
            inserted.push(novaOS);
          } catch (e) {
            toast({
              title: 'Erro ao importar OSs',
              description: e instanceof Error ? e.message : 'Falha ao inserir.',
              variant: 'destructive',
            });
            break;
          }
        }
        if (inserted.length > 0) {
          setOsRotas((prev) => [...prev, ...inserted]);
          toast({
            title: 'OSs importadas',
            description: `${inserted.length} ordem(ns) de serviço foram adicionadas.`,
          });
        }
      };
      run();
    },
    [donoUserId, userId, toast]
  );

  const atualizarOS = useCallback(
    (id: string, dados: Partial<RotaOS>) => {
      setOsRotas((prev) =>
        prev.map((os) => (os.id === id ? { ...os, ...dados } : os))
      );
      updateRoteiroOs(id, dados).catch((err) => {
        toast({
          title: 'Erro ao atualizar OS',
          description: err instanceof Error ? err.message : 'Tente novamente.',
          variant: 'destructive',
        });
      });
    },
    [toast]
  );

  const removerOS = useCallback(
    (id: string) => {
      const rotaAffected = rotas.find((r) => r.os_ids.includes(id));
      setOsRotas((prev) => prev.filter((os) => os.id !== id));
      setRotas((prev) =>
        prev.map((r) => ({
          ...r,
          os_ids: r.os_ids.filter((osId) => osId !== id),
        }))
      );
      deleteRoteiroOs(id).catch((err) => {
        toast({
          title: 'Erro ao remover OS',
          description: err instanceof Error ? err.message : 'Tente novamente.',
          variant: 'destructive',
        });
      });
      if (rotaAffected) {
        const nextIds = rotaAffected.os_ids.filter((osId) => osId !== id);
        if (nextIds.length === 0) {
          deleteRota(rotaAffected.id).catch(() => {});
        } else {
          updateRota(rotaAffected.id, { os_ids: nextIds }).catch(() => {});
        }
      }
    },
    [rotas, toast]
  );

  const buscarOSPorId = useCallback((id: string) => {
    return osRotas.find(os => os.id === id);
  }, [osRotas]);

  const buscarOSPorData = useCallback((data: string) => {
    return osRotas.filter(os => os.data_agendada === data);
  }, [osRotas]);

  const buscarOSPorTecnico = useCallback((tecnicoId: string) => {
    return osRotas.filter(os => os.tecnico_id === tecnicoId);
  }, [osRotas]);

  const buscarOSPorStatus = useCallback((status: StatusRotaOS) => {
    return osRotas.filter(os => os.status === status);
  }, [osRotas]);

  // ============================================
  // ATRIBUIÇÃO DE TÉCNICOS
  // ============================================

  const atribuirTecnico = useCallback(
    (osId: string, tecnicoId: string) => {
      const tecnico = tecnicos.find((t) => t.id === tecnicoId);
      if (!tecnico) {
        toast({
          title: 'Erro',
          description: 'Técnico não encontrado. Verifique se está em Cadastro de Usuários.',
          variant: 'destructive',
        });
        return;
      }
      const patch = {
        tecnico_id: tecnicoId,
        tecnico_nome: tecnico.nome,
        status: 'atribuida' as const,
        data_atribuicao: new Date().toISOString(),
      };
      setOsRotas((prev) =>
        prev.map((os) =>
          os.id === osId ? { ...os, ...patch } : os
        )
      );
      updateRoteiroOs(osId, patch).catch((err) => {
        toast({
          title: 'Erro ao atribuir técnico',
          description: err instanceof Error ? err.message : 'Tente novamente.',
          variant: 'destructive',
        });
      });
    },
    [tecnicos, toast]
  );

  const atribuirTecnicoEmLote = useCallback(
    (osIds: string[], tecnicoId: string, data: string) => {
      const tecnico = tecnicos.find((t) => t.id === tecnicoId);
      if (!tecnico) {
        toast({
          title: 'Erro',
          description: 'Técnico não encontrado.',
          variant: 'destructive',
        });
        return;
      }
      if (!donoUserId || !userId) return;
      const patch = {
        tecnico_id: tecnicoId,
        tecnico_nome: tecnico.nome,
        data_agendada: data,
        status: 'atribuida' as const,
        data_atribuicao: new Date().toISOString(),
      };
      setOsRotas((prev) =>
        prev.map((os) =>
          osIds.includes(os.id) ? { ...os, ...patch } : os
        )
      );
      Promise.all(
        osIds.map((osId) => updateRoteiroOs(osId, patch))
      ).catch((err) => {
        toast({
          title: 'Erro ao atribuir',
          description: err instanceof Error ? err.message : 'Tente novamente.',
          variant: 'destructive',
        });
      });

      const rotaExistente = rotas.find(
        (r) => r.tecnico_id === tecnicoId && r.data === data
      );
      const mergedIds = rotaExistente
        ? [...new Set([...rotaExistente.os_ids, ...osIds])]
        : osIds;

      if (rotaExistente) {
        setRotas((prev) =>
          prev.map((r) =>
            r.id === rotaExistente.id ? { ...r, os_ids: mergedIds } : r
          )
        );
        updateRota(rotaExistente.id, { os_ids: mergedIds }).catch(() => {});
      } else {
        const novaRota: Rota = {
          id: `rota_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          tecnico_id: tecnicoId,
          tecnico_nome: tecnico.nome,
          data,
          os_ids: osIds,
          criada_em: new Date().toISOString(),
          criada_por: userId,
        };
        setRotas((prev) => [...prev, novaRota]);
        insertRota(donoUserId, userId, { ...novaRota, os_ids: mergedIds }).catch(
          (err) => {
            toast({
              title: 'Erro ao criar rota',
              description: err instanceof Error ? err.message : 'Tente novamente.',
              variant: 'destructive',
            });
          }
        );
      }

      toast({
        title: 'Rota criada',
        description: `${osIds.length} OS(s) atribuídas a ${tecnico.nome} para ${new Date(data).toLocaleDateString('pt-BR')}`,
      });
    },
    [tecnicos, rotas, donoUserId, userId, toast]
  );

  const removerAtribuicao = useCallback(
    (osId: string) => {
      const os = osRotas.find((o) => o.id === osId);
      if (!os) return;

      const ossDoGrupo = osRotas.filter(
        (o) =>
          o.codigo_cliente === os.codigo_cliente &&
          !!o.codigo_cliente &&
          o.status !== 'pendente'
      );
      const idsDoGrupo = ossDoGrupo.map((o) => o.id);
      const temGrupo = idsDoGrupo.length > 1;

      const patch = {
        tecnico_id: undefined,
        tecnico_nome: undefined,
        status: 'pendente' as const,
        data_atribuicao: undefined,
      };

      setOsRotas((prev) =>
        prev.map((osItem) =>
          idsDoGrupo.includes(osItem.id) ? { ...osItem, ...patch } : osItem
        )
      );
      idsDoGrupo.forEach((id) =>
        updateRoteiroOs(id, patch).catch(() => {})
      );

      const rotasAfetadas = rotas.filter((r) =>
        r.os_ids.some((id) => idsDoGrupo.includes(id))
      );
      setRotas((prev) =>
        prev.map((r) => ({
          ...r,
          os_ids: r.os_ids.filter((id) => !idsDoGrupo.includes(id)),
        }))
      );
      for (const r of rotasAfetadas) {
        const next = r.os_ids.filter((id) => !idsDoGrupo.includes(id));
        if (next.length === 0) deleteRota(r.id).catch(() => {});
        else updateRota(r.id, { os_ids: next }).catch(() => {});
      }

      if (temGrupo) {
        toast({
          title: 'OSs movidas para pendentes',
          description: `${idsDoGrupo.length} OS(s) do mesmo cliente foram movidas para pendentes.`,
        });
      }
    },
    [osRotas, rotas, toast]
  );

  const obterSugestoesTecnico = useCallback((osId: string): SugestaoTecnico[] => {
    const os = osRotas.find(o => o.id === osId);
    if (!os) return [];

    const sugestoes: SugestaoTecnico[] = [];
    const idsIncluidos = new Set<string>();

    // 1. Adicionar último técnico como primeira sugestão (prioridade)
    if (os.historico_tecnico) {
      const ultimoTecnico = tecnicos.find(t => t.nome === os.historico_tecnico);
      if (ultimoTecnico && !idsIncluidos.has(ultimoTecnico.id)) {
        sugestoes.push({
          tecnico_id: ultimoTecnico.id,
          tecnico_nome: ultimoTecnico.nome,
          confianca: 100,
          motivo: 'Último técnico que atendeu esta OS',
        });
        idsIncluidos.add(ultimoTecnico.id);
      }
    }

    // 2. Analisar histórico de OSs finalizadas para sugerir técnicos por bairro/cidade
    const osFinalizadas = osRotas.filter(
      o => o.status === 'finalizada' && (o.bairro === os.bairro || o.cidade === os.cidade)
    );

    const contagemPorTecnico: Record<string, { nome: string; count: number; bairro: number; cidade: number }> = {};

    osFinalizadas.forEach(osf => {
      if (osf.tecnico_id && osf.tecnico_nome) {
        if (!contagemPorTecnico[osf.tecnico_id]) {
          contagemPorTecnico[osf.tecnico_id] = {
            nome: osf.tecnico_nome,
            count: 0,
            bairro: 0,
            cidade: 0,
          };
        }
        contagemPorTecnico[osf.tecnico_id].count++;
        if (osf.bairro === os.bairro) contagemPorTecnico[osf.tecnico_id].bairro++;
        if (osf.cidade === os.cidade) contagemPorTecnico[osf.tecnico_id].cidade++;
      }
    });

    const sugestoesPorHistorico: SugestaoTecnico[] = Object.entries(contagemPorTecnico)
      .filter(([id]) => !idsIncluidos.has(id)) // Evitar duplicatas
      .map(([id, dados]) => {
        const confianca = Math.min(100, (dados.count / Math.max(osFinalizadas.length, 1)) * 100);
        const motivo =
          dados.bairro > 0
            ? `Atendeu ${dados.bairro} OS(s) no bairro ${os.bairro}`
            : `Atendeu ${dados.cidade} OS(s) na cidade ${os.cidade}`;

        return {
          tecnico_id: id,
          tecnico_nome: dados.nome,
          confianca: Math.round(confianca),
          motivo,
        };
      })
      .sort((a, b) => b.confianca - a.confianca);

    // Adicionar sugestões por histórico (até completar 3 no total)
    const slotsRestantes = 3 - sugestoes.length;
    sugestoes.push(...sugestoesPorHistorico.slice(0, slotsRestantes));

    return sugestoes;
  }, [osRotas, tecnicos]);

  // ============================================
  // GERENCIAMENTO DE ROTAS
  // ============================================

  const criarRota = useCallback(
    (tecnicoId: string, data: string, osIds: string[]): Rota | null => {
      const tecnico = tecnicos.find((t) => t.id === tecnicoId);
      if (!tecnico) {
        toast({
          title: 'Erro',
          description: 'Técnico não encontrado.',
          variant: 'destructive',
        });
        return null;
      }
      if (!donoUserId || !userId) return null;

      const novaRota: Rota = {
        id: `rota_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        tecnico_id: tecnicoId,
        tecnico_nome: tecnico.nome,
        data,
        os_ids: osIds,
        criada_em: new Date().toISOString(),
        criada_por: userId,
      };
      setRotas((prev) => [...prev, novaRota]);
      insertRota(donoUserId, userId, novaRota).catch((err) => {
        toast({
          title: 'Erro ao criar rota',
          description: err instanceof Error ? err.message : 'Tente novamente.',
          variant: 'destructive',
        });
      });
      return novaRota;
    },
    [tecnicos, donoUserId, userId, toast]
  );

  const buscarRotaPorId = useCallback((id: string) => {
    return rotas.find(r => r.id === id);
  }, [rotas]);

  const buscarRotasPorData = useCallback((data: string) => {
    return rotas.filter(r => r.data === data);
  }, [rotas]);

  const buscarRotasPorTecnico = useCallback((tecnicoId: string) => {
    return rotas.filter(r => r.tecnico_id === tecnicoId);
  }, [rotas]);

  const removerRota = useCallback(
    (id: string) => {
      setRotas((prev) => prev.filter((r) => r.id !== id));
      deleteRota(id).catch((err) => {
        toast({
          title: 'Erro ao remover rota',
          description: err instanceof Error ? err.message : 'Tente novamente.',
          variant: 'destructive',
        });
      });
    },
    [toast]
  );

  // ============================================
  // EXECUÇÃO DO SERVIÇO
  // ============================================

  const registrarChegada = useCallback(
    (osId: string) => {
      const os = osRotas.find((o) => o.id === osId);
      const reg = { ...os?.registro_tempo, chegada: new Date().toISOString() };
      setOsRotas((prev) =>
        prev.map((o) =>
          o.id === osId
            ? { ...o, status: 'em_andamento' as const, registro_tempo: reg }
            : o
        )
      );
      updateRoteiroOs(osId, {
        status: 'em_andamento',
        registro_tempo: reg as RegistroTempo,
      }).catch(() => {});
      toast({
        title: 'Chegada registrada',
        description: 'Horário de chegada registrado com sucesso.',
      });
    },
    [osRotas, toast]
  );

  const registrarSaida = useCallback(
    (osId: string) => {
      const os = osRotas.find((o) => o.id === osId);
      const reg = { ...os?.registro_tempo, saida: new Date().toISOString() };
      setOsRotas((prev) =>
        prev.map((o) =>
          o.id === osId ? { ...o, registro_tempo: reg } : o
        )
      );
      updateRoteiroOs(osId, { registro_tempo: reg as RegistroTempo }).catch(
        () => {}
      );
      toast({
        title: 'Saída registrada',
        description: 'Horário de saída registrado com sucesso.',
      });
    },
    [osRotas, toast]
  );

  const adicionarMaterial = useCallback((osId: string, material: MaterialRota) => {
    setOsRotas((prev) => {
      const next = prev.map((os) => {
        if (os.id !== osId) return os;
        const materiaisAtuais = os.materiais_utilizados || [];
        const existente = materiaisAtuais.find((m) => m.nome === material.nome);
        const materiais_utilizados = existente
          ? materiaisAtuais.map((m) =>
              m.nome === material.nome
                ? { ...m, quantidade: m.quantidade + material.quantidade }
                : m
            )
          : [...materiaisAtuais, material];
        return { ...os, materiais_utilizados };
      });
      const o = next.find((x) => x.id === osId);
      if (o)
        updateRoteiroOs(osId, { materiais_utilizados: o.materiais_utilizados }).catch(() => {});
      return next;
    });
  }, []);

  const removerMaterial = useCallback((osId: string, materialNome: string) => {
    setOsRotas((prev) => {
      const next = prev.map((os) =>
        os.id === osId
          ? {
              ...os,
              materiais_utilizados: (os.materiais_utilizados || []).filter(
                (m) => m.nome !== materialNome
              ),
            }
          : os
      );
      const o = next.find((x) => x.id === osId);
      if (o)
        updateRoteiroOs(osId, { materiais_utilizados: o.materiais_utilizados }).catch(() => {});
      return next;
    });
  }, []);

  const adicionarFoto = useCallback((osId: string, foto: FotoOS) => {
    setOsRotas((prev) => {
      const next = prev.map((os) =>
        os.id === osId
          ? { ...os, fotos: [...(os.fotos || []), foto] }
          : os
      );
      const o = next.find((x) => x.id === osId);
      if (o) updateRoteiroOs(osId, { fotos: o.fotos }).catch(() => {});
      return next;
    });
  }, []);

  const registrarAssinatura = useCallback(
    (osId: string, assinatura: string) => {
      setOsRotas((prev) =>
        prev.map((os) =>
          os.id === osId ? { ...os, assinatura_cliente: assinatura } : os
        )
      );
      updateRoteiroOs(osId, { assinatura_cliente: assinatura }).catch(() => {});
      toast({
        title: 'Assinatura registrada',
        description: 'Assinatura do cliente salva com sucesso.',
      });
    },
    [toast]
  );

  const preFinalizar = useCallback(
    (osId: string, observacoes?: string) => {
      const patch = {
        status: 'pre_finalizada' as const,
        observacoes_tecnico: observacoes,
      };
      setOsRotas((prev) =>
        prev.map((os) => (os.id === osId ? { ...os, ...patch } : os))
      );
      updateRoteiroOs(osId, patch).catch(() => {});
      toast({
        title: 'OS pré-finalizada',
        description: 'Aguardando confirmação da torre de controle.',
      });
    },
    [toast]
  );

  // ============================================
  // SISTEMA DE MÉDIAS DE TEMPO
  // ============================================

  // Calcular tempo de uma OS finalizada
  const calcularTempoOS = useCallback((os: RotaOS): number | null => {
    // Prioridade: usar registro_tempo (chegada/saída) se disponível
    if (os.registro_tempo?.chegada && os.registro_tempo?.saida) {
      try {
        // Converter horários "HH:MM" para minutos
        const [horaChegada, minutoChegada] = os.registro_tempo.chegada.split(':').map(Number);
        const [horaSaida, minutoSaida] = os.registro_tempo.saida.split(':').map(Number);
        
        const minutosChegada = horaChegada * 60 + minutoChegada;
        const minutosSaida = horaSaida * 60 + minutoSaida;
        
        const diferencaMinutos = minutosSaida - minutosChegada;
        
        // Validar: tempo entre 6min e 8h (480min) - limite razoável
        if (diferencaMinutos >= 6 && diferencaMinutos <= 480) {
          const tempoHoras = diferencaMinutos / 60;
          return tempoHoras;
        }
      } catch (error) {
        console.error('Erro ao calcular tempo de chegada/saída:', error);
      }
    }
    
    // Fallback: usar data_atribuicao e data_finalizacao
    if (os.data_atribuicao && os.data_finalizacao) {
      try {
        const inicio = new Date(os.data_atribuicao);
        const fim = new Date(os.data_finalizacao);
        const tempoHoras = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);
        
        // Validar: tempo entre 0.1h e 24h (pode ser de um dia para outro)
        if (tempoHoras >= 0.1 && tempoHoras <= 24) {
          return tempoHoras;
        }
      } catch (error) {
        console.error('Erro ao calcular tempo por data_atribuicao/data_finalizacao:', error);
      }
    }
    
    return null;
  }, []);

  const atualizarMediaTempo = useCallback(
    (os: RotaOS) => {
      const tempo = calcularTempoOS(os);
      if (!tempo || !os.tipo_servico || !donoUserId) return;
      setMediasTempo((prev) => {
        const existente = prev.find((m) => m.tipo_servico === os.tipo_servico);
        const now = new Date().toISOString();
        let tempos: number[];
        if (!existente) {
          tempos = [tempo];
        } else {
          tempos = [...existente.tempos, tempo];
          if (tempos.length > 200) tempos = tempos.slice(-200);
        }
        upsertMediasTempo(donoUserId, os.tipo_servico, tempos, now).catch(() => {});
        const next = existente
          ? prev.map((m) =>
              m.tipo_servico === os.tipo_servico
                ? { ...m, tempos, ultima_atualizacao: now }
                : m
            )
          : [...prev, { tipo_servico: os.tipo_servico, tempos, ultima_atualizacao: now }];
        return next;
      });
    },
    [calcularTempoOS, donoUserId]
  );

  const obterMediaTempoPorTipo = useCallback((tipoServico: string): number => {
    const media = mediasTempo.find((m) => m.tipo_servico === tipoServico);
    if (!media || media.tempos.length === 0) return 0;
    const sorted = [...media.tempos].sort((a, b) => a - b);
    const meio = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) return (sorted[meio - 1]! + sorted[meio]!) / 2;
    return sorted[meio] ?? 0;
  }, [mediasTempo]);

  // ============================================
  // TORRE DE CONTROLE
  // ============================================

  const confirmarFinalizacao = useCallback(
    (osId: string) => {
      const os = osRotas.find((o) => o.id === osId);
      const patch = {
        status: 'finalizada' as const,
        data_finalizacao: new Date().toISOString(),
      };
      if (os) {
        const osComStatusFinalizado = { ...os, ...patch };
        atualizarMediaTempo(osComStatusFinalizado);
      }
      setOsRotas((prev) =>
        prev.map((o) => (o.id === osId ? { ...o, ...patch } : o))
      );
      updateRoteiroOs(osId, patch).catch(() => {});
      toast({
        title: 'OS finalizada',
        description: 'Ordem de serviço confirmada e finalizada.',
      });
    },
    [osRotas, toast, atualizarMediaTempo]
  );

  const cancelarOS = useCallback(
    (osId: string, motivo: string) => {
      const patch = {
        status: 'cancelada' as const,
        observacoes: motivo,
        data_finalizacao: new Date().toISOString(),
      };
      setOsRotas((prev) =>
        prev.map((os) => (os.id === osId ? { ...os, ...patch } : os))
      );
      updateRoteiroOs(osId, patch).catch(() => {});
      toast({
        title: 'OS cancelada',
        description: 'Ordem de serviço foi cancelada.',
      });
    },
    [toast]
  );

  const reagendarOS = useCallback(
    (osId: string, novaData: string) => {
      const patch = {
        status: 'pendente' as const,
        data_agendada: novaData,
        reagendada: true,
        tecnico_id: undefined,
        tecnico_nome: undefined,
        data_atribuicao: undefined,
      };
      setOsRotas((prev) =>
        prev.map((os) => (os.id === osId ? { ...os, ...patch } : os))
      );
      updateRoteiroOs(osId, patch).catch(() => {});
      toast({
        title: 'OS reagendada',
        description: `Ordem de serviço reagendada para ${new Date(novaData).toLocaleDateString('pt-BR')} e voltou para pendente.`,
      });
    },
    [toast]
  );

  // ============================================
  // TÉCNICOS
  // ============================================

  const adicionarTecnico = useCallback((tecnico: Omit<TecnicoRota, 'id'>) => {
    const novoTecnico: TecnicoRota = {
      ...tecnico,
      id: `tec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setTecnicos(prev => [...prev, novoTecnico]);

    toast({
      title: 'Técnico adicionado',
      description: `${tecnico.nome} foi adicionado com sucesso.`,
    });
  }, [toast]);

  const atualizarTecnico = useCallback((id: string, dados: Partial<TecnicoRota>) => {
    setTecnicos(prev => prev.map(tec => (tec.id === id ? { ...tec, ...dados } : tec)));
  }, []);

  const removerTecnico = useCallback((id: string) => {
    setTecnicos(prev => prev.filter(tec => tec.id !== id));
    
    toast({
      title: 'Técnico removido',
      description: 'Técnico foi removido do sistema.',
    });
  }, [toast]);

  // ============================================
  // UTILIDADES
  // ============================================

  const limparDados = useCallback(() => {
    if (!donoUserId) return;
    setOsRotas([]);
    setRotas([]);
    setMediasTempo([]);
    Promise.all([
      deleteAllRoteiroOs(donoUserId),
      deleteAllRotas(donoUserId),
      deleteAllMediasTempo(donoUserId),
    ]).catch((err) => {
      toast({
        title: 'Erro ao limpar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    });
    toast({
      title: 'Dados limpos',
      description: 'Todos os dados de rotas foram removidos.',
    });
  }, [donoUserId, toast]);

  const exportarDados = useCallback(() => {
    const dados = {
      osRotas,
      rotas,
      tecnicos,
      exportadoEm: new Date().toISOString(),
    };
    return JSON.stringify(dados, null, 2);
  }, [osRotas, rotas, tecnicos]);

  const importarDados = useCallback(
    (dadosJson: string) => {
      if (!donoUserId || !userId) return;
      try {
        const dados = JSON.parse(dadosJson) as {
          osRotas?: RotaOS[];
          rotas?: Rota[];
          tecnicos?: TecnicoRota[];
        };
        const importOs = dados.osRotas ?? [];
        const importRotas = dados.rotas ?? [];
        const run = async () => {
          const inserted: RotaOS[] = [];
          for (const os of importOs) {
            try {
              const created = await insertRoteiroOs(donoUserId!, userId, {
                ...os,
                id: os.id,
                status: os.status,
                data_importacao: os.data_importacao,
                user_id: os.user_id,
              });
              inserted.push(created);
            } catch (e) {
              toast({
                title: 'Erro ao importar OSs',
                description: e instanceof Error ? e.message : 'Falha ao inserir.',
                variant: 'destructive',
              });
              return;
            }
          }
          const rotasAdded: Rota[] = [];
          for (const r of importRotas) {
            try {
              const created = await insertRota(donoUserId!, userId, { ...r });
              rotasAdded.push(created);
            } catch (e) {
              toast({
                title: 'Erro ao importar rotas',
                description: e instanceof Error ? e.message : 'Falha ao inserir.',
                variant: 'destructive',
              });
            }
          }
          if (inserted.length > 0) setOsRotas((prev) => [...prev, ...inserted]);
          if (rotasAdded.length > 0) setRotas((prev) => [...prev, ...rotasAdded]);
          if (dados.tecnicos && dados.tecnicos.length > 0) setTecnicos(dados.tecnicos);
          toast({
            title: 'Dados importados',
            description: 'Dados importados com sucesso.',
          });
        };
        run();
      } catch {
        toast({
          title: 'Erro ao importar',
          description: 'Formato de dados inválido.',
          variant: 'destructive',
        });
      }
    },
    [donoUserId, userId, toast]
  );

  const value: RotasContextData = {
    // Estado
    rotas,
    osRotas,
    tecnicos,
    loading,
    ultimaAtualizacao,

    // Refresh
    recarregarDados,

    // CRUD de OSs
    adicionarOS,
    adicionarOSEmLote,
    atualizarOS,
    removerOS,
    buscarOSPorId,
    buscarOSPorData,
    buscarOSPorTecnico,
    buscarOSPorStatus,

    // Atribuição
    atribuirTecnico,
    atribuirTecnicoEmLote,
    removerAtribuicao,
    obterSugestoesTecnico,

    // Rotas
    criarRota,
    buscarRotaPorId,
    buscarRotasPorData,
    buscarRotasPorTecnico,
    removerRota,

    // Execução
    registrarChegada,
    registrarSaida,
    adicionarMaterial,
    removerMaterial,
    adicionarFoto,
    registrarAssinatura,
    preFinalizar,

    // Torre de controle
    confirmarFinalizacao,
    cancelarOS,
    reagendarOS,

    // Técnicos
    adicionarTecnico,
    atualizarTecnico,
    removerTecnico,

    // Utilidades
    limparDados,
    exportarDados,
    importarDados,

    // Médias de tempo
    obterMediaTempoPorTipo,
    atualizarMediaTempo,
  };

  return <RotasContext.Provider value={value}>{children}</RotasContext.Provider>;
}

export function useRotas() {
  const context = useContext(RotasContext);
  if (!context) {
    throw new Error('useRotas must be used within a RotasProvider');
  }
  return context;
}
