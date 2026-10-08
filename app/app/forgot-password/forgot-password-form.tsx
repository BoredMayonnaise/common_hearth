"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "../ui/alert";
import { Card } from "../ui/card";
import PageShell from "../ui/shell";
import SubmitButton from "../ui/submit-button";
import { TextField } from "../ui/field";

export default function ForgotPasswordForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email") }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Something went wrong. Try again.");
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (body.devLink) setDevLink(body.devLink);
      setSent(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <PageShell title="Check your email" width="md">
        <Card className="p-5">
          <p className="read-me text-[0.9375rem] leading-relaxed text-body">
            If an account exists for that address, we have sent a link to reset your password. It
            expires in 15 minutes.
          </p>
          {devLink ? (
            <p className="read-me mt-3 rounded-base border border-rule bg-card-2 p-3 text-sm text-body">
              Dev mode:{" "}
              <a href={devLink} className="text-brick underline underline-offset-2">
                click here to reset
              </a>
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => router.replace(next)}
            className="mt-4 inline-flex min-h-11 items-center rounded-base bg-brick px-4 text-sm font-medium text-card transition-colors hover:bg-brick-dark"
          >
            Continue
          </button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Reset your password" width="md">
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
            enterKeyHint="go"
            required
          />
          <SubmitButton pending={pending} pendingLabel="Sending…">
            Send reset link
          </SubmitButton>
        </form>
      </Card>
    </PageShell>
  );
}
