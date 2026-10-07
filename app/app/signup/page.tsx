import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

async function signUp(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "");
  if (!email || password.length < 8) redirect("/signup?error=1");
  const hash = await bcrypt.hash(password, 10);
  try {
    await pool.query("INSERT INTO users (email, password_hash) VALUES ($1, $2)", [email, hash]);
  } catch {
    redirect("/signup?error=exists");
  }
  redirect("/login?created=1");
}

export default function SignUpPage() {
  return (
    <main className="mx-auto max-w-md p-8 font-sans">
      <h1 className="text-2xl font-semibold mb-4">Create account</h1>
      <form action={signUp} className="grid gap-3">
        <label>
          Email
          <input name="email" type="email" required className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <label>
          Password (8+ characters)
          <input name="password" type="password" minLength={8} required className="mt-1 block w-full rounded border border-stone-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600" />
        </label>
        <button type="submit" className="rounded rounded-lg bg-sky-700 px-4 py-2 text-white hover:bg-sky-800">Create account</button>
      </form>
      <p><a className="text-sky-700 underline" href="/login">Already have an account? Sign in</a></p>
    </main>
  );
}
