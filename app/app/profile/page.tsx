import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

async function saveProfile(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const displayName = String(formData.get("display_name") || "").trim();
  const howIShowUp = String(formData.get("how_i_show_up") || "").trim();
  const tag = String(formData.get("region_or_role_tag") || "").trim() || null;
  if (!displayName || !howIShowUp) redirect("/profile?error=1");
  await pool.query(
    `INSERT INTO profiles (user_id, display_name, how_i_show_up, region_or_role_tag)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET display_name = $2, how_i_show_up = $3, region_or_role_tag = $4, changed_at = now()`,
    [uid, displayName, howIShowUp, tag]
  );
  redirect("/");
}

export const instant = false;

async function ProfileBody() {
  await connection();
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const res = await pool.query("SELECT display_name, how_i_show_up, region_or_role_tag FROM profiles WHERE user_id = $1", [uid]);
  const p = res.rows[0];
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">{p ? "Your trust profile" : "Set up your trust profile"}</h1>
      <form action={saveProfile} className="grid gap-3">
        <label>
          Display name
          <input name="display_name" defaultValue={p?.display_name} required className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <label>
          How I show up (one line)
          <input name="how_i_show_up" defaultValue={p?.how_i_show_up} required className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <label>
          Region or role tag (optional)
          <input name="region_or_role_tag" defaultValue={p?.region_or_role_tag ?? ""} className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <button type="submit" className="rounded rounded-lg bg-sky-700 px-4 py-2 text-white hover:bg-sky-800">Save</button>
      </form>
      <p><a className="text-sky-700 underline" href="/">Back home</a></p>
    </>
  );
}

export default async function Page() {
  return (
    <main className="mx-auto max-w-md p-8 font-sans">
      <ProfileBody />
    </main>
  );
}
