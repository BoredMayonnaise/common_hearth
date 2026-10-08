import pool from "./db";

/**
 * The invite code is the whole door: there is no way to find a circle, and no
 * request path runs a join without one. Both entry points -- the shared link and
 * the manual code form -- go through `joinByCode` so they cannot drift apart.
 */

export type JoinFailure = "empty" | "invalid" | "full";

export type JoinResult =
  | { ok: true; circleId: string; circleName: string; alreadyMember: boolean }
  | { ok: false; reason: JoinFailure };

type InviteRow = {
  circle_id: string;
  name: string;
  max_uses: number | null;
  expires_at: Date | null;
};

const SELECT_INVITE = `
  SELECT i.circle_id, i.max_uses, i.expires_at, c.name
  FROM invite_codes i
  JOIN circles c ON c.id = i.circle_id
  WHERE i.code = $1
`;

function normalize(code: string) {
  return code.trim().toLowerCase();
}

function unusable(row: InviteRow | undefined): JoinFailure | null {
  if (!row) return "invalid";
  if (row.expires_at && new Date(row.expires_at) < new Date()) return "invalid";
  return null;
}

/**
 * Is this link still good? Read only -- safe to call for someone who is not
 * signed in, so a dead link can say so before anyone is sent to sign up.
 */
export async function lookupInvite(code: string): Promise<
  { ok: true; circleName: string } | { ok: false; reason: JoinFailure }
> {
  const code_ = normalize(code);
  if (!code_) return { ok: false, reason: "empty" };
  const res = await pool.query(SELECT_INVITE, [code_]);
  const row = res.rows[0] as InviteRow | undefined;
  const bad = unusable(row);
  if (bad || !row) return { ok: false, reason: bad ?? "invalid" };
  return { ok: true, circleName: row.name };
}

/**
 * Writes the membership. Server side only, always for the signed-in user id taken
 * from the session -- never from the form. Idempotent: re-opening an invite link
 * for a circle you are already in is a no-op, not an error.
 */
export async function joinByCode(code: string, userId: string): Promise<JoinResult> {
  const code_ = normalize(code);
  if (!code_) return { ok: false, reason: "empty" };

  const res = await pool.query(SELECT_INVITE, [code_]);
  const row = res.rows[0] as InviteRow | undefined;
  const bad = unusable(row);
  if (bad || !row) return { ok: false, reason: bad ?? "invalid" };

  // Wrap the max_uses check and INSERT in a transaction with SELECT ... FOR UPDATE
  // on the circle row. Without this, two concurrent requests can both read count=4,
  // both pass the check, and both insert — exceeding the limit.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Lock the circle row so concurrent joins serialize on it.
    await client.query("SELECT id FROM circles WHERE id = $1 FOR UPDATE", [row.circle_id]);

    const existing = await client.query(
      "SELECT 1 FROM memberships WHERE circle_id = $1 AND user_id = $2",
      [row.circle_id, userId]
    );
    const alreadyMember = existing.rows.length > 0;

    // A capped invite still lets an existing member back in; it only stops new ones.
    if (!alreadyMember && row.max_uses) {
      const count = await client.query(
        "SELECT count(*)::int AS n FROM memberships WHERE circle_id = $1",
        [row.circle_id]
      );
      if (count.rows[0].n >= row.max_uses) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "full" };
      }
    }

    await client.query(
      "INSERT INTO memberships (circle_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING",
      [row.circle_id, userId]
    );
    await client.query("COMMIT");
    return { ok: true, circleId: row.circle_id, circleName: row.name, alreadyMember };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** The shareable form of an invite: a link that carries the code, not the code itself. */
export function inviteUrl(code: string) {
  const base = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/join/${encodeURIComponent(normalize(code))}`;
}

/**
 * Only same-site absolute paths, so a `?next=` can never bounce someone to another
 * host after they sign in.
 */
export function safeNext(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  const path = typeof raw === "string" ? raw.trim() : "";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "/";
  return path;
}