"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error === "exists" ? "That email is already registered." : "Please use a valid email and 8+ character password.");
      return;
    }
    const signInRes = await signIn("credentials", {
      email: data.get("email"),
      password: data.get("password"),
      redirect: false,
    });
    if (signInRes?.ok) window.location.href = "/";
    else setError("Account created — please sign in.");
  }
  return (
    <main className="mx-auto max-w-md p-8 font-sans">
      <h1 className="text-2xl font-semibold mb-4">Create account</h1>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <form onSubmit={onSubmit} className="grid gap-3">
        <label>Email
          <input name="email" type="email" required className="mt-1 block w-full rounded-lg border border-stone-300 p-2" />
        </label>
        <label>Password (8+ characters)
          <input name="password" type="password" minLength={8} required className="mt-1 block w-full rounded-lg border border-stone-300 p-2" />
        </label>
        <button type="submit" className="rounded-lg bg-sky-700 px-4 py-2 text-white hover:bg-sky-800">Create account</button>
      </form>
      <p><a className="text-sky-700 underline" href="/login">Already have an account? Sign in</a></p>
    </main>
  );
}
