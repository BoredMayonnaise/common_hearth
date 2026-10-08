"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Alert from "../ui/alert";
import { Card } from "../ui/card";
import PageShell from "../ui/shell";
import SubmitButton from "../ui/submit-button";
import { TextField } from "../ui/field";

export default function SignUpForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const data = new FormData(e.currentTarget);
    const email = data.get("email");
    const password = data.get("password");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          body.error === "exists"
            ? "That email is already registered. Sign in instead."
            : body.error === "unavailable"
              ? body.message ?? "Could not create your account right now. Try again in a moment."
              : "Use a valid email and a password of at least 8 characters."
        );
        return;
      }
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signInRes?.ok) {
        router.replace(next);
        router.refresh();
        return;
      }
      setError("Your account is ready. Sign in to continue.");
    } catch {
      setError("Something went wrong creating your account. Try again.");
    } finally {
      setPending(false);
    }
  }

  const signInHref = next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return (
    <PageShell title="Create account" width="md">
      <Card className="p-5">
        {error ? (
          <Alert tone="danger" className="mb-4">
            {error}
          </Alert>
        ) : null}
        <form onSubmit={onSubmit} className="grid gap-4">
          <TextField
            name="email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            required
          />
          <TextField
            name="password"
            label="Password"
            hint="At least 8 characters."
            type="password"
            autoComplete="new-password"
            minLength={8}
            enterKeyHint="go"
            required
          />
          <SubmitButton pending={pending} pendingLabel="Creating account…">
            Create account
          </SubmitButton>
        </form>
      </Card>
      <p className="mt-5 text-sm text-body">
        Already have an account?{" "}
        <Link href={signInHref} className="font-medium text-brick underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </PageShell>
  );
}