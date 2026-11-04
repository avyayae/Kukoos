/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** '1' in e2e builds (`vite build --mode e2e`): enables the ?now= test clock. */
  readonly VITE_E2E?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
