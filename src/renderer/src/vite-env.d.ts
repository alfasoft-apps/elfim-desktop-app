/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REST_API_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
