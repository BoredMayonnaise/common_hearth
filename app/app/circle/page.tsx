import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

export const instant = false;

async function CircleBody() {
  await connection();
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const profile = await pool.query("SELECT display_name FROM profiles WHERE user_id = $1", [uid]);
  if (!profile.rows[0]) redirect("/profile");
  const res = await pool.query("SELECT circle_id FROM memberships WHERE user_id = $1", [uid]);
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Your circle</h1>
      {res.rows.length === 0 ? (
        <p>No circle yet. Start a circle or join with a code. (Creating circles lands on Day 5.)</p>
      ) : (
        <p>You are a member of {res.rows.length} circle(s).</p>
      )}
      <p><a className="text-sky-700 underline" href="/">Back home</a></p>
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
