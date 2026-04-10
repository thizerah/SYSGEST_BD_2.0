/** Mensagem legível para erros do Supabase/PostgREST (nem sempre instanceof Error). */
export function getSupabaseErrorMessage(err: unknown): string {
  if (err == null) return 'Tente novamente.';
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return 'Tente novamente.';
}
