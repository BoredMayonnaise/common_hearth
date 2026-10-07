import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import pool from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SignOutButton from "./signout-button";

async function HomeBody() {
  await connection();
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;

  if (!uid) {
    return (
      <>
        <h1 className="text-3xl font-semibold">Private care handbooks with trust profiles; public app, private circles.</h1>
        <p className="mt-4 text-gray-700">
          Small circles keep a shared handbook of how they actually care for one another — so the practice
          survives when the most tired person steps back.
        </p>
        <h2 className="mt-6 text-xl font-semibold">How it works</h2>
        <ol className="mt-2 list-decimal pl-5 text-gray-700 space-y-1">
          <li>Create an account and fill a short trust profile.</li>
          <li>Start a private circle, or join one with an invite code.</li>
          <li>Write practice notes and assign a carrier.</li>
          <li>Mark handoffs received — the knowledge stays, the burden moves.</li>
        </ol>
        <div className="mt-6 flex gap-4">
          <a className="rounded bg-sky-700 px-4 py-2 text-white no-underline" href="/signup">Create account</a>
          <a className="rounded border border-sky-700 px-4 py-2 text-sky-700 no-underline" href="/signup?join=1">Join with a code</a>
        </div>
        <p className="mt-6 text-sm text-gray-600">Circles are private. Profiles are only visible to people in your circle.</p>
        <p className="mt-4 text-sm text-gray-700">Want to look around first? Join the demo circle with code <code className="rounded bg-gray-100 px-2 py-1 font-mono">demo-hearth</code> after signing up.</p>
        <p className="mt-2 text-sm text-gray-600">Already have an account? <a className="text-sky-700 underline" href="/login">Sign in</a>.</p>
      </>
    );
  }

  const res = await pool.query(
    "SELECT display_name, how_i_show_up, region_or_role_tag FROM profiles WHERE user_id = $1",
    [uid]
  );
  const p = res.rows[0];
  if (!p) {
    redirect("/profile");
  }
  return (
    <section>
      <p>Signed in as <strong>{session?.user?.email}</strong></p>
      <p>
        Profile: <strong>{p.display_name}</strong> — {p.how_i_show_up}
        {p.region_or_role_tag ? ` (${p.region_or_role_tag})` : ""}
      </p>
      <p>
        <a className="text-sky-700 underline" href="/circle">Your circle</a> ·{" "}
        <a className="text-sky-700 underline" href="/notes">Practice notes</a> ·{" "}
        <a className="text-sky-700 underline" href="/profile">Edit profile</a> ·{" "}
        <SignOutButton />
      </p>
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8 font-sans">
      <Suspense fallback={<p>Loading…</p>}>
        <HomeBody />
      </Suspense>
    </main>
  );
}
