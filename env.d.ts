/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API: backend Laravel (…/api) o mock de Prism. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
