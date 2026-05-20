/** Renderer ↔ main HTTP proxy (CORS-sız). */

export type HttpIpcRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | null;
};

export type HttpIpcResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  data: unknown;
  headers: Record<string, string>;
};
