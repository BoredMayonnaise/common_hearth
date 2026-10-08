import pool from "./db";
import { cacheGet, cacheSet, cacheDelPattern } from "./cache";

const NOTES_LIST_TTL = 30_000; // 30 seconds
const NOTE_DETAIL_TTL = 10_000; // 10 seconds

export type NoteRow = {
  id: string;
  circle_id: string;
  title: string;
  situation: string;
  steps: string;
  never_promise: string;
  access_notes: string | null;
  contact: string | null;
  carrier_id: string | null;
  handoff_on: string | null;
  received_at: string | null;
  archived_at: string | null;
  created_at: string;
  changed_at: string;
  circle_name: string;
  carrier_name: string | null;
};

export async function notesForUser(uid: string): Promise<NoteRow[]> {
  const cacheKey = `notes:list:${uid}`;
  const cached = cacheGet<NoteRow[]>(cacheKey);
  if (cached) return cached;

  const res = await pool.query(
    `SELECT n.id, n.circle_id, n.title, n.situation, n.steps, n.never_promise,
            n.access_notes, n.contact, n.carrier_id, n.handoff_on, n.received_at,
            n.archived_at, n.created_at, n.changed_at,
            c.name AS circle_name, p.display_name AS carrier_name
     FROM notes n
     JOIN circles c ON c.id = n.circle_id
     LEFT JOIN memberships m ON m.id = n.carrier_id
     LEFT JOIN profiles p ON p.user_id = m.user_id
     WHERE n.circle_id IN (SELECT circle_id FROM memberships WHERE user_id = $1)
       AND n.archived_at IS NULL
     ORDER BY n.handoff_on NULLS LAST, n.created_at`,
    [uid]
  );
  const rows = res.rows as NoteRow[];
  cacheSet(cacheKey, rows, NOTES_LIST_TTL);
  return rows;
}

export async function noteById(
  id: string,
  uid: string
): Promise<NoteRow | null> {
  const cacheKey = `notes:detail:${id}:${uid}`;
  const cached = cacheGet<NoteRow>(cacheKey);
  if (cached) return cached;

  const res = await pool.query(
    `SELECT n.id, n.circle_id, n.title, n.situation, n.steps, n.never_promise,
            n.access_notes, n.contact, n.carrier_id, n.handoff_on, n.received_at,
            n.archived_at, n.created_at, n.changed_at,
            c.name AS circle_name, p.display_name AS carrier_name
     FROM notes n
     JOIN circles c ON c.id = n.circle_id
     LEFT JOIN memberships m ON m.id = n.carrier_id
     LEFT JOIN profiles p ON p.user_id = m.user_id
     WHERE n.id = $1
       AND n.circle_id IN (SELECT circle_id FROM memberships WHERE user_id = $2)
       AND n.archived_at IS NULL`,
    [id, uid]
  );
  const row = (res.rows[0] as NoteRow) ?? null;
  if (row) cacheSet(cacheKey, row, NOTE_DETAIL_TTL);
  return row;
}

export async function invalidateNotesCache(uid: string): Promise<void> {
  cacheDelPattern(new RegExp(`^notes:list:${uid}$`));
  cacheDelPattern(new RegExp(`^notes:detail:.*:${uid}$`));
}

/**
 * Every member's list is cached under their own key, so one person writing a note
 * leaves everyone else in the circle looking at a stale handbook until their TTL
 * runs out. With live updates on screen that reads as a broken refresh, so drop
 * every member's copy at the moment the note lands.
 */
export async function invalidateCircleNotesCache(circleId: string): Promise<void> {
  const res = await pool.query(
    "SELECT DISTINCT user_id FROM memberships WHERE circle_id = $1",
    [circleId]
  );
  for (const row of res.rows) await invalidateNotesCache(row.user_id);
}

export type FeedRow = {
  id: string;
  circle_id: string;
  circle_name: string;
  title: string;
  situation: string;
  author_name: string | null;
  carrier_name: string | null;
  received_at: string | null;
  created_at: string;
};

/**
 * The home feed: every live note across the circles this person belongs to, newest
 * first. The membership subquery is the authorisation -- it is the same guard the
 * rest of the app uses, so a note from a circle you are not in cannot be reached
 * by guessing a circle id.
 *
 * Not cached. The circle and carrying filters make the key space large, and this
 * is the page people refresh most; a stale feed would be worse than a query.
 */
export async function feedForUser(
  uid: string,
  opts: { circleId?: string | null; carryingOnly?: boolean; limit: number; offset: number }
): Promise<{ rows: FeedRow[]; total: number }> {
  const where = `
    n.circle_id IN (SELECT circle_id FROM memberships WHERE user_id = $1)
    AND n.archived_at IS NULL
    AND ($2::uuid IS NULL OR n.circle_id = $2)
    AND (NOT ($3::boolean) OR (n.received_at IS NULL AND n.carrier_id IS NOT NULL))
  `;

  const [page, count] = await Promise.all([
    pool.query(
      `SELECT n.id, n.circle_id, c.name AS circle_name, n.title, n.situation,
              n.received_at, n.created_at,
              ap.display_name AS author_name, cp.display_name AS carrier_name
       FROM notes n
       JOIN circles c ON c.id = n.circle_id
       LEFT JOIN memberships m ON m.id = n.carrier_id
       LEFT JOIN profiles cp ON cp.user_id = m.user_id
       LEFT JOIN profiles ap ON ap.user_id = n.author_id
       WHERE ${where}
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT $4 OFFSET $5`,
      [uid, opts.circleId ?? null, Boolean(opts.carryingOnly), opts.limit, opts.offset]
    ),
    pool.query(
      `SELECT count(*)::int AS n FROM notes n WHERE ${where}`,
      [uid, opts.circleId ?? null, Boolean(opts.carryingOnly)]
    ),
  ]);

  return { rows: page.rows as FeedRow[], total: count.rows[0]?.n ?? 0 };
}

/** How many notes in this person's circles are still being carried. */
export async function carryingCountForUser(uid: string) {
  const res = await pool.query(
    `SELECT count(*)::int AS n
     FROM notes n
     WHERE n.archived_at IS NULL
       AND n.received_at IS NULL
       AND n.carrier_id IS NOT NULL
       AND n.circle_id IN (SELECT circle_id FROM memberships WHERE user_id = $1)`,
    [uid]
  );
  return res.rows[0]?.n ?? 0;
}
