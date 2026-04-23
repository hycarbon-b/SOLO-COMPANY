/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENCLAW_GATEWAY_URL?: string;
  readonly VITE_OPENCLAW_GATEWAY_KEY?: string;
  readonly VITE_OPENCLAW_WS_URL?: string;
  readonly VITE_OPENCLAW_GATEWAY_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}