import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/password-reset";
import { clientIp, rateLimit, retryAfterPhrase } from "@/lib/rate-limit";
import { LIMITS, MAX } from "@/lib/limits";

export async function POST(req: Request) {
  const ip = clientIp(req.headers);

  const byIp = await rateLimit("forgot:ip", ip, LIMITS.forgotPasswordPerIp);
  if (!byIp.ok) {
    return NextResponse.json(
      { error: "rate", message: `Too many attempts. Try again ${retryAfterPhrase(byIp.retryAfterSeconds)}.` },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();

  if (!email || email.length > MAX.email) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const byEmail = await rateLimit("forgot:email", email, LIMITS.forgotPasswordPerEmail);
  if (!byEmail.ok) {
    return NextResponse.json(
      { error: "rate", message: `Too many attempts for that address. Try again ${retryAfterPhrase(byEmail.retryAfterSeconds)}.` },
      { status: 429, headers: { "Retry-After": String(byEmail.retryAfterSeconds) } }
    );
  }

  const { devLink } = await createPasswordResetToken(email);

  // In production, devLink would be emailed. In dev, return it so the flow
  // can be tested without an email server.
  if (process.env.NODE_ENV === "development" && devLink) {
    return NextResponse.json({ ok: true, devLink });
  }

  // Always return ok to avoid revealing which emails are registered.
  return NextResponse.json({ ok: true });
}
