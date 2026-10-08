/**
 * Minimal structured request logger. Writes one line per request to stdout,
 * which Docker captures and `docker logs` shows. Not a replacement for a
 * full logging stack, but enough to see who accessed what and when —
 * especially failed access attempts.
 *
 * Usage: call at the start of middleware or API routes.
 */
export function logRequest(
  method: string,
  path: string,
  status: number,
  uid: string | null,
  durationMs: number
) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    method,
    path,
    status,
    uid: uid ?? undefined,
    ms: Math.round(durationMs),
  });
  // stdout is captured by Docker; stderr would be for errors only.
  console.log(line);
}


