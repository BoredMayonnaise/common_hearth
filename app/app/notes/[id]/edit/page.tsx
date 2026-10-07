import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { membershipsForUser } from "@/lib/membership";

export const instant = false;

async function editNote(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const noteId = String(formData.get("note_id"));
  const note = await pool.query("SELECT circle_id FROM notes WHERE id = $1", [noteId]);
  if (!note.rows[0]) redirect("/notes?error=notfound");
  const isMember = await pool.query(
    "SELECT 1 FROM memberships WHERE circle_id = $1 AND user_id = $2",
    [note.rows[0].circle_id, uid]
  );
  if (!isMember.rows[0]) redirect("/notes?error=forbidden");
  const title = String(formData.get("title") || "").trim();
  const situation = String(formData.get("situation") || "").trim();
  const steps = String(formData.get("steps") || "").trim();
  const neverPromise = String(formData.get("never_promise") || "").trim();
  if (!title || !situation || !steps || !neverPromise) redirect(`/notes/${noteId}/edit?error=1`);
  await pool.query(
    `UPDATE notes SET title=$2, situation=$3, steps=$4, never_promise=$5,
       access_notes=$6, contact=$7, carrier_id=$8, handoff_on=$9, changed_at=now()
     WHERE id=$1`,
    [
      noteId, title, situation, steps, neverPromise,
      String(formData.get("access_notes") || "").trim() || null,
      String(formData.get("contact") || "").trim() || null,
      String(formData.get("carrier_id") || "") || null,
      String(formData.get("handoff_on") || "") || null,
    ]
  );
  redirect("/notes");
}

async function archiveNote(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const noteId = String(formData.get("note_id"));
  const note = await pool.query("SELECT circle_id FROM notes WHERE id = $1", [noteId]);
  if (!note.rows[0]) redirect("/notes?error=notfound");
  const isMember = await pool.query(
    "SELECT 1 FROM memberships WHERE circle_id = $1 AND user_id = $2",
    [note.rows[0].circle_id, uid]
  );
  if (!isMember.rows[0]) redirect("/notes?error=forbidden");
  await pool.query("UPDATE notes SET archived_at = now(), changed_at = now() WHERE id = $1", [noteId]);
  redirect("/notes");
}

async function EditBody({ id }: { id: string }) {
  await connection();
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const note = await pool.query(
    `SELECT n.* FROM notes n
     WHERE n.id = $1 AND n.circle_id IN (SELECT circle_id FROM memberships WHERE user_id = $2) AND n.archived_at IS NULL`,
    [id, uid]
  );
  const n = note.rows[0];
  if (!n) redirect("/notes");
  const memberships = await membershipsForUser(uid);
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Edit note</h1>
      <form action={editNote} className="grid gap-3">
        <input type="hidden" name="note_id" value={n.id} />
        <label>Title
          <input name="title" defaultValue={n.title} required className="mt-1 block w-full rounded border border-gray-300 p-2 text-base" />
        </label>
        <label>Situation
          <textarea name="situation" defaultValue={n.situation} required rows={3} className="mt-1 block w-full rounded border border-gray-300 p-2 text-base" />
        </label>
        <label>Steps
          <textarea name="steps" defaultValue={n.steps} required rows={5} className="mt-1 block w-full rounded border border-gray-300 p-2 text-base" />
        </label>
        <label>Never promise
          <textarea name="never_promise" defaultValue={n.never_promise} required rows={2} className="mt-1 block w-full rounded border border-gray-300 p-2 text-base" />
        </label>
        <label>Access notes
          <textarea name="access_notes" defaultValue={n.access_notes ?? ""} rows={2} className="mt-1 block w-full rounded border border-gray-300 p-2 text-base" />
        </label>
        <label>Contact
          <input name="contact" defaultValue={n.contact ?? ""} className="mt-1 block w-full rounded border border-gray-300 p-2 text-base" />
        </label>
        <label>Carrier
          <select name="carrier_id" defaultValue={n.carrier_id ?? ""} className="mt-1 block w-full rounded border border-gray-300 p-2 text-base">
            <option value="">Unassigned</option>
            {memberships.map((m) => (
              <option key={m.id} value={m.id}>{m.display_name} — {m.circle_name}</option>
            ))}
          </select>
        </label>
        <label>Handoff date
          <input name="handoff_on" type="date" defaultValue={n.handoff_on ? n.handoff_on.toISOString().slice(0, 10) : ""} className="mt-1 block w-full rounded border border-gray-300 p-2 text-base" />
        </label>
        <button type="submit" className="rounded bg-sky-700 px-4 py-2 text-white">Save changes</button>
      </form>
      <form action={archiveNote} className="mt-4">
        <input type="hidden" name="note_id" value={n.id} />
        <button type="submit" className="rounded border border-red-700 px-4 py-2 text-red-700">Archive this note</button>
      </form>
      <p className="mt-4"><a className="text-sky-700 underline" href="/notes">Back to notes</a></p>
    </>
  );
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-2xl p-8 font-sans">
      <EditBody id={id} />
    </main>
  );
}
