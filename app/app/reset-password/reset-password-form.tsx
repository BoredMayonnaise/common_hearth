"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "../ui/alert";
import { Card } from "../ui/card";
import PageShell from "../ui/shell";
import SubmitButton from "../ui/submit-button";
import { TextField } from "../ui/field";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const data = new FormData(e.currentTarget);
    const password = data.get("password") as string;
    const confirm = data.get("confirm_password") as string;
    if (password !== confirm) {
      setError("The passwords do not match.");
      setPending(false);
      return;
    }
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Something went wrong. Try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <PageShell title="Password updated" width="md">
        <Card className="p-5">
          <p className="read-me text-[0.9375rem] leading-relaxed text-body">
            Your password has been updated. Every other session has been signed out.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/login?changed=1")}
            className="mt-4 inline-flex min-h-11 items-center rounded-base bg-brick px-4 text-sm font-medium text-card transition-colors hover:bg-brick-dark"
          >
            Sign in
          </button>
        </Card>
      </PageShell>
    );
  }

  if (!token) {
    return (
      <PageShell title="Invalid reset link" width="md">
        <Card className="p-5">
          <p className="read-me text-[0.9375rem] leading-relaxed text-body">
            This password reset link is missing its token. Ask for a new one from the sign-in page.
          </p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Choose a new password" width="md">
      <Card className="p-5">
        {error ? (
          <Alert tone="danger" className="mb-4">
            {error}
          </Alert>
        ) : null}
        <form onSubmit={onSubmit} className="grid gap-4">
          <TextField
            name="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={200}
            enterKeyHint="next"
            required
          />
          <TextField
            name="confirm_password"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={200}
            enterKeyHint="go"
            required
          />
          <SubmitButton pending={pending} pendingLabel="Updating…">
            Update password
          </SubmitButton>
        </form>
      </Card>
    </PageShell>
  );
}
