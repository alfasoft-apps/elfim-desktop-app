const MAX_PREVIEW = 12_000;

function payloadPreview(payload: unknown): string {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload.slice(0, MAX_PREVIEW);
  try {
    const s = JSON.stringify(payload, (_key, value) => {
      if (Array.isArray(value) && value.length > 30) {
        return `[Array length=${value.length}]`;
      }
      return value as unknown;
    });
    return s.length > MAX_PREVIEW ? `${s.slice(0, MAX_PREVIEW)}…` : s;
  } catch {
    return '[unserializable]';
  }
}

/** Parse / format xətalarını `api-parse-error.log` faylına yazır. */
export function logParseError(
  context: string,
  message: string,
  payload: unknown,
  url?: string,
): void {
  if (typeof window === 'undefined' || typeof window.elfim?.appendParseErrorLog !== 'function') {
    return;
  }
  void window.elfim.appendParseErrorLog({
    context,
    url,
    message,
    payloadPreview: payloadPreview(payload),
  });
}
