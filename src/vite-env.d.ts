/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** '1' in e2e builds (`vite build --mode e2e`): enables the ?now= test clock. */
  readonly VITE_E2E?: string
  /** '1' offers the chess course (spec 013); unset in production until F16. */
  readonly VITE_CHESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
