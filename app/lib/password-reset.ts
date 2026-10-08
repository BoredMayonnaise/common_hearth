import { randomBytes, createHash } from "crypto";
import pool from "./db";

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Password reset tokens are hashed before storage so a database leak does not
 * expose usable tokens. The raw token is shown to the user once and never
 * stored.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Create a password reset token for a user. Returns the raw token (to be shown
 * to the user) or null if the user does not exist.
 *
 * Always returns a token-shaped response for existing users. For non-existing
 * users, we still do a dummy hash to avoid timing attacks that reveal which
 * emails are registered.
 */
export async function createPasswordResetToken(
  email: string
): Promise<{ token: string | null; devLink: string | null }> {
  const normalized = email.toLowerCase().trim();
  const res = await pool.query("SELECT id FROM users WHERE email = $1", [normalized]);
  const user = res.rows[0];

  // Spend the same time hashing whether or not the user exists.
  const rawToken = randomBytes(32).toString("hex");
  hashToken(rawToken);

  if (!user) {
    return { token: null, devLink: null };
  }

  const tokenHash = hashToken(rawToken);
  await pool.query(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + make_interval(secs => $3))",
    [user.id, tokenHash, TOKEN_TTL_MS / 1000]
  );

  const base = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
  const devLink = `${base}/reset-password?token=${rawToken}`;

  return { token: rawToken, devLink };
}

/**
 * Verify a reset token and return the user_id if valid. Marks the token as used
 * so it cannot be replayed.
 */
export async function consumePasswordResetToken(
  token: string
): Promise<{ ok: true; userId: string } | { ok: false }> {
  if (!token || token.length < 32) return { ok: false };

  const tokenHash = hashToken(token);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       FOR UPDATE`,
      [tokenHash]
    );
    const row = res.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return { ok: false };
    }

    await client.query(
      "UPDATE password_reset_tokens SET used_at = now() WHERE id = $1",
      [row.id]
    );
    await client.query("COMMIT");
    return { ok: true, userId: row.user_id };
  } catch (e) {
    await client.query("ROLLBACK");
    return { ok: false };
  } finally {
    client.release();
  }
}

/**
 * Clean up expired tokens. Called occasionally on a timer.
 */
export async function cleanupExpiredTokens(): Promise<void> {
  await pool.query(
    "DELETE FROM password_reset_tokens WHERE expires_at < now() - interval '7 days'"
  );
}
