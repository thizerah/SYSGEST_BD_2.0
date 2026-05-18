/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** UUID do dono dos registros em `materiais` quando o catálogo é único entre empresas. Opcional. */
  readonly VITE_MATERIAIS_CATALOG_OWNER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Declarações para PWA
declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: Error) => void
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>
}
