import pool from "./db";

/**
 * Server-side rate limiting, kept in Postgres so every process on the box shares
 * one allowance and a restart cannot hand someone a fresh budget. Without this,
 * `/api/signup` and the credentials sign-in are open credential-stuffing targets:
 * both are cheap to call and both are unauthenticated.
 *
 * Fixed window: one row per (bucket, window). The upsert is atomic, so two
 * concurrent requests cannot both slip past the last remaining slot.
 */

export type Limit = { max: number; windowMs: number };

export type Verdict = { ok: true; remaining: number } | { ok: false; retryAfterSeconds: number };

/** The address a request came from, as nginx reports it. */
export function clientIp(
  headers: { get(name: string): string | null } | Record<string, unknown> | undefined
) {
  if (!headers) return "unknown";
  const get = (headers as { get?: unknown }).get;
  const read = (name: string) =>
    typeof get === "function"
      ? (get as (n: string) => string | null).call(headers, name)
      : (headers as Record<string, unknown>)[name] ?? null;

  const forwarded = read("x-forwarded-for");
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64);
  const real = read("x-real-ip");
  return (typeof real === "string" && real ? real : "unknown").slice(0, 64);
}

export async function rateLimit(bucket: string, subject: string, limit: Limit): Promise<Verdict> {
  const key = `${bucket}:${subject}`;

  const res = await pool.query(
    `INSERT INTO auth_throttle (key, hits, window_start)
     VALUES ($1, 1, now())
     ON CONFLICT (key) DO UPDATE SET
       hits = CASE
               WHEN auth_throttle.window_start < now() - make_interval(secs => $2) THEN 1
               ELSE auth_throttle.hits + 1
             END,
       window_start = CASE
               WHEN auth_throttle.window_start < now() - make_interval(secs => $2) THEN now()
               ELSE auth_throttle.window_start
             END
     RETURNING hits, window_start`,
    [key, limit.windowMs / 1000]
  );

  const row = res.rows[0];
  const hits: number = row.hits;
  const elapsed = (Date.now() - new Date(row.window_start).getTime()) / 1000;

  if (hits <= limit.max) {
    return { ok: true, remaining: limit.max - hits };
  }

  // Sweep expired rows occasionally. Doing it on a timer would mean another
  // process to keep alive; a 2% chance per call is plenty for a table this size.
  if (Math.random() < 0.02) {
    void pool
      .query("DELETE FROM auth_throttle WHERE window_start < now() - interval '1 day'")
      .catch(() => {});
  }

  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(limit.windowMs / 1000 - elapsed)) };
}

/** "Try again in 3 minutes." / "in 45 seconds." */
export function retryAfterPhrase(seconds: number) {
  if (seconds < 60) return `in ${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `in ${hours} hour${hours === 1 ? "" : "s"}`;
}