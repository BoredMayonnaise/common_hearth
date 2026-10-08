import { Pool } from "pg";

/**
 * A small pool on purpose. The app is low-traffic and mostly serial, and Postgres
 * gives every connection its own backend process; ten idle backends cost more
 * memory than they ever save in concurrency here. Idle clients are handed back
 * promptly so the count settles down to what the site actually needs.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", () => {
  // A dropped idle client is normal on a VM that idles overnight. The pool
  // discards it and opens a fresh one on the next query; an unhandled 'error'
  // event here would take the process down.
});

export default pool;
