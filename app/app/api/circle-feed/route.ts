import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

/**
 * A cheap change-detector for the pages that show notes. It only ever returns
 * circles the signed-in user is a member of -- the membership join is the whole
 * authorisation, so there is no path here that reports a circle's activity to
 * someone outside it.
 *
 * One row per circle: how many live notes, how many are still being carried, the
 * newest note's timestamp, and who wrote it. The client compares one poll against
 * the last to decide whether anything moved.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ me: null, circles: [] }, { headers: NO_STORE });

  const res = await pool.query(
    `SELECT c.id,
            c.name,
            count(n.id)::int AS notes,
            count(n.id) FILTER (WHERE n.received_at IS NULL AND n.carrier_id IS NOT NULL)::int
              AS handoffs,
            max(n.changed_at) AS rev,
            (array_agg(ap.display_name ORDER BY n.changed_at DESC))[1] AS latest_by,
            (array_agg(n.title ORDER BY n.changed_at DESC))[1] AS latest_title,
            (array_agg(n.author_id ORDER BY n.changed_at DESC))[1] AS latest_author
     FROM circles c
     JOIN memberships mine ON mine.circle_id = c.id AND mine.user_id = $1
     LEFT JOIN notes n ON n.circle_id = c.id AND n.archived_at IS NULL
     LEFT JOIN profiles ap ON ap.user_id = n.author_id
     GROUP BY c.id, c.name
     ORDER BY c.name`,
    [uid]
  );

  return NextResponse.json(
    {
      me: uid,
      circles: res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        notes: r.notes,
        handoffs: r.handoffs,
        rev: r.rev ? new Date(r.rev).toISOString() : null,
        latestBy: r.latest_by,
        latestTitle: r.latest_title,
        latestAuthor: r.latest_author,
      })),
    },
    { headers: NO_STORE }
  );
}

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };