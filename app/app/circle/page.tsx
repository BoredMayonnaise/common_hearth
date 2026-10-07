import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

export const instant = false;

async function createCircle(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const name = String(formData.get("name") || "").trim();
  const purpose = String(formData.get("purpose") || "").trim() || null;
  if (!name) redirect("/circle?error=1");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const circle = await client.query(
      "INSERT INTO circles (name, purpose, created_by) VALUES ($1, $2, $3) RETURNING id",
      [name, purpose, uid]
    );
    const circleId = circle.rows[0].id;
    await client.query(
      "INSERT INTO memberships (circle_id, user_id, role) VALUES ($1, $2, 'owner')",
      [circleId, uid]
    );
    const code = randomBytes(4).toString("hex");
    await client.query(
      "INSERT INTO invite_codes (code, circle_id) VALUES ($1, $2)",
      [code, circleId]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  redirect("/circle");
}

async function CircleBody() {
  await connection();
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const profile = await pool.query("SELECT display_name FROM profiles WHERE user_id = $1", [uid]);
  if (!profile.rows[0]) redirect("/profile");
  const res = await pool.query(
    `SELECT c.name, c.purpose, m.role,
            (SELECT code FROM invite_codes WHERE circle_id = c.id ORDER BY created_at LIMIT 1) AS code
     FROM memberships m JOIN circles c ON c.id = m.circle_id
     WHERE m.user_id = $1
     ORDER BY m.joined_at`,
    [uid]
  );
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Your circle</h1>
      {res.rows.length === 0 ? (
        <p className="mb-4">No circle yet. Start one below, or join with a code on Day 6.</p>
      ) : (
        <ul className="mb-6 space-y-4">
          {res.rows.map((c) => (
            <li key={c.name} className="rounded border border-gray-200 p-4">
              <h2 className="text-lg font-semibold">{c.name}</h2>
              {c.purpose && <p className="text-sm text-gray-600">{c.purpose}</p>}
              <p className="text-sm">Role: {c.role}</p>
              {c.role === "owner" && c.code && (
                <p className="mt-2">
                  Invite code to share: <code className="rounded bg-gray-100 px-2 py-1 font-mono">{c.code}</code>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <h2 className="text-xl font-semibold mb-2">Start a circle</h2>
      <form action={createCircle} className="grid gap-3">
        <label>
          Circle name
          <input name="name" required className="mt-1 block w-full rounded border border-gray-300 p-2" />
        </label>
        <label>
          One-line purpose (optional)
          <input name="purpose" className="mt-1 block w-full rounded border border-gray-300 p-2" />
        </label>
        <button type="submit" className="rounded bg-sky-700 px-4 py-2 text-white">Start a circle</button>
      </form>
      <p className="mt-4"><a className="text-sky-700 underline" href="/">Back home</a></p>
    </>
  );
}

export default async function Page() {
  return (
    <main className="mx-auto max-w-2xl p-8 font-sans">
      <CircleBody />
    </main>
  );
}
