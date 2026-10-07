import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

export const instant = false;

async function markReceived(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const noteId = String(formData.get("note_id"));
  const note = await pool.query("SELECT circle_id FROM notes WHERE id = $1", [noteId]);
  if (!note.rows[0]) redirect("/notes?error=notfound");
  const mine = await pool.query(
    "SELECT id FROM memberships WHERE circle_id = $1 AND user_id = $2",
    [note.rows[0].circle_id, uid]
  );
  if (!mine.rows[0]) redirect("/notes?error=forbidden");
  await pool.query(
    "UPDATE notes SET received_at = now(), carrier_id = $2, changed_at = now() WHERE id = $1",
    [noteId, mine.rows[0].id]
  );
  redirect("/notes");
}

async function NotesBody() {
  await connection();
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const profile = await pool.query("SELECT display_name FROM profiles WHERE user_id = $1", [uid]);
  if (!profile.rows[0]) redirect("/profile");
  const notes = await pool.query(
    `SELECT n.id, n.title, n.handoff_on, n.received_at, n.archived_at,
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
  const carrying = notes.rows.filter((n) => !n.received_at);
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Practice notes</h1>
      <p className="mb-4"><a className="rounded rounded-lg bg-sky-700 px-4 py-2 text-white hover:bg-sky-800 no-underline" href="/notes/new">Write a note</a></p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Who is carrying what</h2>
      {carrying.length === 0 ? (
        <p className="text-sm text-stone-600">Nothing is currently handed off.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {carrying.map((n) => (
            <li key={n.id} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
              <strong>{n.title}</strong> — {n.carrier_name ?? "unassigned"}
              {n.handoff_on ? ` (handoff ${new Date(n.handoff_on).toLocaleDateString()})` : ""}
              <span className="text-sm text-stone-500"> · {n.circle_name}</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-xl font-semibold mb-2">All notes</h2>
      {notes.rows.length === 0 ? (
        <p>Write the thing only you remember.</p>
      ) : (
        <ul className="space-y-3">
          {notes.rows.map((n) => (
            <li key={n.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold">{n.title}</h3>
              <p className="text-sm text-stone-600">
                {n.circle_name} · carrier: {n.carrier_name ?? "unassigned"} · handoff:{" "}
                {n.handoff_on ? new Date(n.handoff_on).toLocaleDateString() : "none"} ·{" "}
                {n.received_at ? `received ${new Date(n.received_at).toLocaleDateString()}` : "not received"}
              </p>
              <p className="mt-2"><a className="text-sky-700 underline" href={`/notes/${n.id}/edit`}>Edit</a></p>
              {!n.received_at && (
                <form action={markReceived} className="mt-2">
                  <input type="hidden" name="note_id" value={n.id} />
                  <button type="submit" className="rounded border border-sky-700 px-3 py-1 text-sky-700">
                    Mark handoff received
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4"><a className="text-sky-700 underline" href="/">Back home</a></p>
    </>
  );
}

export default async function Page() {
  return (
    <main className="mx-auto max-w-2xl p-8 font-sans">
      <NotesBody />
    </main>
  );
}
