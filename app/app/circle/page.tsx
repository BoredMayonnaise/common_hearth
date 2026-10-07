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

async function joinCircle(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const code = String(formData.get("code") || "").trim().toLowerCase();
  if (!code) redirect("/circle?join=empty");
  const res = await pool.query(
    "SELECT circle_id, max_uses, expires_at FROM invite_codes WHERE code = $1",
    [code]
  );
  const invite = res.rows[0];
  if (!invite || (invite.expires_at && new Date(invite.expires_at) < new Date())) {
    redirect("/circle?join=invalid");
  }
  if (invite.max_uses) {
    const count = await pool.query(
      "SELECT count(*)::int AS n FROM memberships WHERE circle_id = $1",
      [invite.circle_id]
    );
    if (count.rows[0].n >= invite.max_uses) redirect("/circle?join=full");
  }
  await pool.query(
    "INSERT INTO memberships (circle_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING",
    [invite.circle_id, uid]
  );
  redirect("/circle");
}

async function CircleBody({ searchParams }: { searchParams: Promise<{ join?: string; error?: string }> }) {
  await connection();
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const profile = await pool.query("SELECT display_name FROM profiles WHERE user_id = $1", [uid]);
  if (!profile.rows[0]) redirect("/profile");
  const res = await pool.query(
    `SELECT c.id, c.name, c.purpose, m.role,
            (SELECT code FROM invite_codes WHERE circle_id = c.id ORDER BY created_at LIMIT 1) AS code
     FROM memberships m JOIN circles c ON c.id = m.circle_id
     WHERE m.user_id = $1
     ORDER BY m.joined_at`,
    [uid]
  );
  const members = await pool.query(
    `SELECT m.circle_id, p.display_name, p.how_i_show_up, p.region_or_role_tag
     FROM memberships m
     JOIN profiles p ON p.user_id = m.user_id
     WHERE m.circle_id IN (SELECT circle_id FROM memberships WHERE user_id = $1)`,
    [uid]
  );
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Your circle</h1>
      {typeof sp?.join === "string" && sp.join !== "" && (
        <p className="mb-4 text-red-600">That code does not work or has expired.</p>
      )}
      {sp?.error && <p className="mb-4 text-red-600">Please give the circle a name.</p>}
      {res.rows.length === 0 ? (
        <p className="mb-4">No circle yet. Start one below, or join with a code on Day 6.</p>
      ) : (
        <ul className="mb-6 space-y-4">
          {res.rows.map((c) => (
            <li key={c.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">{c.name}</h2>
              {c.purpose && <p className="text-sm text-stone-600">{c.purpose}</p>}
              <p className="text-sm">Role: {c.role}</p>
              {c.role === "owner" && c.code && (
                <p className="mt-2">
                  Invite code to share: <code className="rounded bg-stone-100 px-2 py-1 font-mono">{c.code}</code>
                </p>
              )}
              <h3 className="mt-3 font-semibold">Members</h3>
              <ul className="list-disc pl-5 text-sm">
                {members.rows
                  .filter((mm) => mm.circle_id === c.id)
                  .map((mm) => (
                    <li key={mm.display_name}>
                      <strong>{mm.display_name}</strong> — {mm.how_i_show_up}
                      {mm.region_or_role_tag ? ` (${mm.region_or_role_tag})` : ""}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <h2 className="text-xl font-semibold mb-2">Join with a code</h2>
      <form action={joinCircle} className="grid gap-3 mb-6">
        <label>
          Invite code
          <input name="code" required className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <button type="submit" className="rounded rounded-lg bg-sky-700 px-4 py-2 text-white hover:bg-sky-800">Join</button>
      </form>
      <h2 className="text-xl font-semibold mb-2">Start a circle</h2>
      <form action={createCircle} className="grid gap-3">
        <label>
          Circle name
          <input name="name" required className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <label>
          One-line purpose (optional)
          <input name="purpose" className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <button type="submit" className="rounded rounded-lg bg-sky-700 px-4 py-2 text-white hover:bg-sky-800">Start a circle</button>
      </form>
      <p className="mt-4"><a className="text-sky-700 underline" href="/">Back home</a></p>
    </>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ join?: string; error?: string }> }) {
  return (
    <main className="mx-auto max-w-2xl p-8 font-sans">
      <CircleBody searchParams={searchParams} />
    </main>
  );
}
