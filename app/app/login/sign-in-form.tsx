"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "../ui/alert";
import { Card } from "../ui/card";
import PageShell from "../ui/shell";
import SubmitButton from "../ui/submit-button";
import { TextField } from "../ui/field";

export default function SignInForm({ next, changed }: { next: string; changed?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const data = new FormData(e.currentTarget);
    try {
      const res = await signIn("credentials", {
        email: data.get("email"),
        password: data.get("password"),
        redirect: false,
      });
      if (res?.ok) {
        router.replace(next);
        router.refresh();
        return;
      }
      setError("That email and password did not match an account.");
    } catch {
      setError("Something went wrong signing you in. Try again.");
    } finally {
      setPending(false);
    }
  }

  const signUpHref = next === "/" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`;

  return (
    <PageShell title="Sign in" width="md">
      <Card className="p-5">
        {changed && !error ? (
          <Alert tone="success" className="mb-4">
            Password changed. Sign in with the new one — every other session has been ended.
          </Alert>
        ) : null}
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
            type="password"
            autoComplete="current-password"
            enterKeyHint="go"
            required
          />
          <SubmitButton pending={pending} pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>
      </Card>
      <p className="mt-5 text-sm text-body">
        Need an account?{" "}
        <Link href={signUpHref} className="font-medium text-brick underline underline-offset-2">
          Create one
        </Link>
      </p>
      <p className="mt-2 text-sm text-body-subtle">
        <Link href="/forgot-password" className="text-body underline underline-offset-2 hover:text-ink">
          Forgot your password?
        </Link>
      </p>
    </PageShell>
  );
}