/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** '1' in e2e builds (`vite build --mode e2e`): enables the ?now= test clock. */
  readonly VITE_E2E?: string
  /** '1' in dev and e2e builds: offers the Spanish course before it ships (spec 018). */
  readonly VITE_SPANISH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
