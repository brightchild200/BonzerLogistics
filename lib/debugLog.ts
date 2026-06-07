type DebugPayload = {
  sessionId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
  hypothesisId: string;
  runId?: string;
};

const ENDPOINT = 'http://127.0.0.1:7768/ingest/28f4470e-d6d8-4d5b-ad06-29dee592d5d5';
const SESSION_ID = '707f10';
const STORAGE_KEY = 'debug-707f10';

export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = 'pre-fix',
) {
  const payload: DebugPayload = {
    sessionId: SESSION_ID,
    location,
    message,
    data,
    timestamp: Date.now(),
    hypothesisId,
    runId,
  };

  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION_ID },
    body: JSON.stringify(payload),
  }).catch(() => {});

  if (typeof globalThis !== 'undefined') {
    const store = globalThis as typeof globalThis & { __DEBUG_LOGS?: DebugPayload[] };
    store.__DEBUG_LOGS = [...(store.__DEBUG_LOGS ?? []), payload];
  }

  if (typeof sessionStorage !== 'undefined') {
    try {
      const existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]') as DebugPayload[];
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, payload]));
    } catch {
      /* ignore storage errors */
    }
  }
}
