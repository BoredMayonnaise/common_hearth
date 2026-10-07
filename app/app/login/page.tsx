"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: data.get("email"),
      password: data.get("password"),
      redirect: false,
    });
    if (res?.ok) window.location.href = "/";
    else setError(true);
  }
  return (
    <main className="mx-auto max-w-md p-8 font-sans">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      {error && <p role="alert" className="text-red-600">That email or password did not work.</p>}
      <form onSubmit={onSubmit} className="grid gap-3">
        <label>
          Email
          <input name="email" type="email" required className="mt-1 block w-full rounded border border-gray-300 p-2" />
        </label>
        <label>
          Password
          <input name="password" type="password" required className="mt-1 block w-full rounded border border-gray-300 p-2" />
        </label>
        <button type="submit" className="rounded bg-sky-700 px-4 py-2 text-white">Sign in</button>
      </form>
      <p><a className="text-sky-700 underline" href="/signup">Need an account? Create one</a></p>
    </main>
  );
}
