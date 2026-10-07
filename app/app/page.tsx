import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import pool from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SignOutButton from "./signout-button";

async function DbStatus() {
  await connection();
  let dbStatus = "unknown";
  try {
    const res = await pool.query("SELECT 1 AS ok");
    dbStatus = res.rows[0].ok === 1 ? "connected" : "error";
  } catch {
    dbStatus = "error";
  }
  return <p className="text-sm text-green-700">Database: {dbStatus}</p>;
}

async function Account() {
  await connection();
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) {
    return (
      <p>
        <a className="text-sky-700 underline" href="/signup">Create account</a> or{" "}
        <a className="text-sky-700 underline" href="/login">sign in</a>.
      </p>
    );
  }
  const res = await pool.query(
    "SELECT display_name, how_i_show_up, region_or_role_tag FROM profiles WHERE user_id = $1",
    [uid]
  );
  const p = res.rows[0];
  if (!p) redirect("/profile");
  return (
    <section>
      <p>Signed in as <strong>{session?.user?.email}</strong></p>
      {p ? (
        <p>
          Profile: <strong>{p.display_name}</strong> — {p.how_i_show_up}
          {p.region_or_role_tag ? ` (${p.region_or_role_tag})` : ""}
        </p>
      ) : (
        <p><a className="text-sky-700 underline" href="/profile">Set up your trust profile</a> to continue.</p>
      )}
      <p>
        <a className="text-sky-700 underline" href="/circle">Your circle</a> ·{" "}
        <a className="text-sky-700 underline" href="/profile">Edit profile</a> ·{" "}
        <SignOutButton />
      </p>
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8 font-sans">
      <h1 className="text-3xl font-semibold">Common Hearth is up.</h1>
      <Suspense fallback={<p>Database: checking…</p>}>
        <DbStatus />
      </Suspense>
      <Suspense fallback={<p>Loading account…</p>}>
        <Account />
      </Suspense>
    </main>
  );
}
