import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { membershipsForUser } from "@/lib/membership";

export const instant = false;

async function createNote(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const carrierId = String(formData.get("carrier_id") || "") || null;
  const circleId = String(formData.get("circle_id"));
  const title = String(formData.get("title") || "").trim();
  const situation = String(formData.get("situation") || "").trim();
  const steps = String(formData.get("steps") || "").trim();
  const neverPromise = String(formData.get("never_promise") || "").trim();
  const accessNotes = String(formData.get("access_notes") || "").trim() || null;
  const contact = String(formData.get("contact") || "").trim() || null;
  const handoffOn = String(formData.get("handoff_on") || "") || null;
  if (!title || !situation || !steps || !neverPromise || !circleId) {
    redirect("/notes/new?error=1");
  }
  const isMember = await pool.query(
    "SELECT 1 FROM memberships WHERE circle_id = $1 AND user_id = $2",
    [circleId, uid]
  );
  if (!isMember.rows[0]) redirect("/notes?error=forbidden");
  const authorship = await pool.query(
    "SELECT id FROM memberships WHERE circle_id = $1 AND user_id = $2",
    [circleId, uid]
  );
  await pool.query(
    `INSERT INTO notes (circle_id, author_id, title, situation, steps, never_promise, access_notes, contact, carrier_id, handoff_on)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [circleId, uid, title, situation, steps, neverPromise, accessNotes, contact, carrierId, handoffOn]
  );
  redirect("/notes");
}

async function NewNoteBody({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const memberships = await membershipsForUser(uid);
  const userCircles = Array.from(
    new Map(memberships.map((m) => [m.circle_id, { id: m.circle_id, name: m.circle_name }])).values()
  );
  const profile = await pool.query("SELECT display_name FROM profiles WHERE user_id = $1", [uid]);
  if (!profile.rows[0]) redirect("/profile");
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Write a practice note</h1>
      {sp?.error && <p className="mb-4 text-red-600">Please fill in title, situation, steps, and never promise.</p>}
      <form action={createNote} className="grid gap-3">
        <label>Circle
          <select name="circle_id" required className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600">
            {userCircles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Title
          <input name="title" required className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <label>Situation
          <textarea name="situation" required rows={3} className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <label>Steps
          <textarea name="steps" required rows={5} className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <label>Never promise
          <textarea name="never_promise" required rows={2} className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <label>Access notes
          <textarea name="access_notes" rows={2} className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <label>Contact
          <input name="contact" className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <label>Carrier
          <select name="carrier_id" className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600">
            <option value="">Unassigned</option>
            {memberships.map((m) => (
              <option key={m.id} value={m.id}>{m.display_name} — {m.circle_name}</option>
            ))}
          </select>
        </label>
        <label>Handoff date
          <input name="handoff_on" type="date" className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <button type="submit" className="rounded rounded-lg bg-sky-700 px-4 py-2 text-white hover:bg-sky-800">Save note</button>
      </form>
      <p className="mt-4"><a className="text-sky-700 underline" href="/notes">Back to notes</a></p>
    </>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="mx-auto max-w-2xl p-8 font-sans">
      <NewNoteBody searchParams={searchParams} />
    </main>
  );
}
