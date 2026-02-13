import { supabase } from '@/lib/supabase';
import { fetchPapelIdByCodigo, fetchPermissaoIdsByCodigos } from './papeis-permissoes';
import { updateEquipe } from './equipe';

/** Subusuário com papel e permissões, indexado por equipe_id. */
export interface SubuserByEquipe {
  usuario_empresa_id: string;
  equipe_id: string;
  papel_codigo: string;
  permissoes_codigos: string[];
}

export async function fetchSubusuariosByDono(donoUserId: string): Promise<SubuserByEquipe[]> {
  const { data: ueList, error: ueErr } = await supabase
    .from('usuarios_empresa')
    .select('id, equipe_id, papeis(codigo)')
    .eq('dono_user_id', donoUserId)
    .eq('ativo', true);

  if (ueErr || !ueList) return [];

  const ids = (ueList as { id: string; equipe_id: string | null; papeis: { codigo?: string } | null }[])
    .filter((u) => u.equipe_id)
    .map((u) => u.id);

  if (ids.length === 0) return [];

  const { data: perms } = await supabase
    .from('usuario_permissoes')
    .select('usuario_empresa_id, permissoes(codigo)')
    .in('usuario_empresa_id', ids);

  const permsByUe = new Map<string, string[]>();
  for (const row of perms ?? []) {
    const r = row as { usuario_empresa_id: string; permissoes: { codigo?: string } | null };
    const c = r.permissoes?.codigo;
    if (!c) continue;
    const arr = permsByUe.get(r.usuario_empresa_id) ?? [];
    arr.push(c);
    permsByUe.set(r.usuario_empresa_id, arr);
  }

  return (ueList as { id: string; equipe_id: string | null; papeis: { codigo?: string } | null }[])
    .filter((u): u is { id: string; equipe_id: string; papeis: { codigo?: string } | null } => !!u.equipe_id)
    .map((u) => ({
      usuario_empresa_id: u.id,
      equipe_id: u.equipe_id,
      papel_codigo: (u.papeis?.codigo as string) ?? '',
      permissoes_codigos: permsByUe.get(u.id) ?? [],
    }));
}

export async function updateUsuarioEmpresaPapel(usuarioEmpresaId: string, papelCodigo: string): Promise<void> {
  const papelId = await fetchPapelIdByCodigo(papelCodigo);
  if (!papelId) throw new Error(`Papel "${papelCodigo}" não encontrado.`);
  const { error } = await supabase
    .from('usuarios_empresa')
    .update({ papel_id: papelId })
    .eq('id', usuarioEmpresaId);
  if (error) throw error;
}

export async function replaceUsuarioPermissoes(usuarioEmpresaId: string, codigos: string[]): Promise<void> {
  const { error: delErr } = await supabase.from('usuario_permissoes').delete().eq('usuario_empresa_id', usuarioEmpresaId);
  if (delErr) throw delErr;

  if (codigos.length === 0) return;
  const permMap = await fetchPermissaoIdsByCodigos(codigos);
  const rows = codigos
    .map((c) => permMap.get(c))
    .filter((id): id is string => !!id)
    .map((permissao_id) => ({ usuario_empresa_id: usuarioEmpresaId, permissao_id }));
  if (rows.length === 0) return;
  const { error: insErr } = await supabase.from('usuario_permissoes').insert(rows);
  if (insErr) throw insErr;
}

export interface CreateSubUserPayload {
  email: string;
  password: string;
  name?: string;
  papelCodigo: string;
  equipeId?: string | null;
  permissoesCodigos: string[];
}

export async function createSubUser(
  donoUserId: string,
  payload: CreateSubUserPayload
): Promise<{ userId: string }> {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: { name: payload.name ?? payload.email },
    },
  });

  if (signUpError) throw signUpError;
  if (!signUpData.user) throw new Error('Usuário não foi criado na autenticação.');

  const userId = signUpData.user.id;
  const papelId = await fetchPapelIdByCodigo(payload.papelCodigo);
  if (!papelId) throw new Error(`Papel "${payload.papelCodigo}" não encontrado.`);

  const { data: ue, error: ueError } = await supabase
    .from('usuarios_empresa')
    .insert({
      user_id: userId,
      dono_user_id: donoUserId,
      papel_id: papelId,
      equipe_id: payload.equipeId ?? null,
      ativo: true,
      email: payload.email,
      nome: payload.name ?? null,
    })
    .select('id')
    .single();

  if (ueError) throw ueError;
  if (!ue) throw new Error('Falha ao criar vínculo em usuarios_empresa.');

  if (payload.permissoesCodigos.length > 0) {
    const permMap = await fetchPermissaoIdsByCodigos(payload.permissoesCodigos);
    const rows = payload.permissoesCodigos
      .map((c) => permMap.get(c))
      .filter((id): id is string => !!id)
      .map((permissao_id) => ({ usuario_empresa_id: ue.id, permissao_id }));
    if (rows.length > 0) {
      const { error: permsError } = await supabase.from('usuario_permissoes').insert(rows);
      if (permsError) throw permsError;
    }
  }

  if (payload.equipeId) {
    await updateEquipe(payload.equipeId, { user_id: userId });
  }

  return { userId };
}

/** Linha da tabela de acessos cadastrados (Cadastro de Acesso). */
export interface AcessoCadastrado {
  id: string;
  user_id: string;
  email: string | null;
  nome: string | null;
  papel_nome: string;
  papel_codigo: string;
  equipe_id: string | null;
  vinculado_a: string | null;
  permissoes_nomes: string[];
  ativo: boolean;
  created_at: string | null;
}

export async function fetchAcessosCadastrados(donoUserId: string): Promise<AcessoCadastrado[]> {
  const { data: ueList, error: ueErr } = await supabase
    .from('usuarios_empresa')
    .select('id, user_id, email, nome, ativo, created_at, papeis(nome, codigo), equipe(id, nome_completo, funcao)')
    .eq('dono_user_id', donoUserId)
    .order('created_at', { ascending: false });

  if (ueErr || !ueList || ueList.length === 0) return [];

  const ids = (ueList as { id: string }[]).map((u) => u.id);
  const { data: perms } = await supabase
    .from('usuario_permissoes')
    .select('usuario_empresa_id, permissoes(nome)')
    .in('usuario_empresa_id', ids);

  const permsByUe = new Map<string, string[]>();
  for (const row of perms ?? []) {
    const r = row as { usuario_empresa_id: string; permissoes: { nome?: string } | null };
    const nome = r.permissoes?.nome;
    if (!nome) continue;
    const arr = permsByUe.get(r.usuario_empresa_id) ?? [];
    arr.push(nome);
    permsByUe.set(r.usuario_empresa_id, arr);
  }

  return (ueList as Array<{
    id: string;
    user_id: string;
    email: string | null;
    nome: string | null;
    ativo: boolean;
    created_at: string | null;
    papeis: { nome?: string; codigo?: string } | null;
    equipe: { id?: string; nome_completo?: string; funcao?: string } | null;
  }>).map((u) => {
    const eq = u.equipe;
    const vinculado_a =
      eq?.nome_completo && eq?.funcao ? `${eq.nome_completo} — ${eq.funcao}` : eq?.nome_completo ?? null;
    return {
      id: u.id,
      user_id: u.user_id,
      email: u.email ?? null,
      nome: u.nome ?? null,
      papel_nome: u.papeis?.nome ?? '—',
      papel_codigo: u.papeis?.codigo ?? '',
      equipe_id: eq?.id ?? null,
      vinculado_a,
      permissoes_nomes: permsByUe.get(u.id) ?? [],
      ativo: u.ativo,
      created_at: u.created_at ?? null,
    };
  });
}

export async function updateUsuarioEmpresaAtivo(usuarioEmpresaId: string, ativo: boolean): Promise<void> {
  const { error } = await supabase
    .from('usuarios_empresa')
    .update({ ativo, updated_at: new Date().toISOString() })
    .eq('id', usuarioEmpresaId);
  if (error) throw error;
}

export async function updateUsuarioEmpresaEquipe(usuarioEmpresaId: string, equipeId: string | null): Promise<void> {
  const { data: ue } = await supabase
    .from('usuarios_empresa')
    .select('user_id, equipe_id')
    .eq('id', usuarioEmpresaId)
    .single();
  if (!ue) throw new Error('Registro não encontrado.');

  const { error: upErr } = await supabase
    .from('usuarios_empresa')
    .update({ equipe_id: equipeId, updated_at: new Date().toISOString() })
    .eq('id', usuarioEmpresaId);
  if (upErr) throw upErr;

  const userId = (ue as { user_id: string }).user_id;
  const oldEquipeId = (ue as { equipe_id: string | null }).equipe_id;
  if (oldEquipeId) {
    await supabase.from('equipe').update({ user_id: null, updated_at: new Date().toISOString() }).eq('id', oldEquipeId);
  }
  if (equipeId) {
    await updateEquipe(equipeId, { user_id: userId });
  }
}
