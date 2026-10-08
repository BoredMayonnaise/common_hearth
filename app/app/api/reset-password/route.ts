import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { clientIp, rateLimit, retryAfterPhrase } from "@/lib/rate-limit";
import { LIMITS, MAX } from "@/lib/limits";

export async function POST(req: Request) {
  const ip = clientIp(req.headers);

  const byIp = await rateLimit("reset:ip", ip, LIMITS.resetPasswordPerIp);
  if (!byIp.ok) {
    return NextResponse.json(
      { error: "rate", message: `Too many attempts. Try again ${retryAfterPhrase(byIp.retryAfterSeconds)}.` },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "");
  const password = String(body.password || "");

  if (password.length < MAX.passwordMin || password.length > MAX.password) {
    return NextResponse.json(
      { error: "invalid", message: `Password must be between ${MAX.passwordMin} and ${MAX.password} characters.` },
      { status: 400 }
    );
  }

  const result = await consumePasswordResetToken(token);
  if (!result.ok) {
    return NextResponse.json(
      { error: "invalid", message: "This reset link has expired or already been used. Request a new one." },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    "UPDATE users SET password_hash = $2, token_version = token_version + 1 WHERE id = $1",
    [result.userId, hash]
  );

  return NextResponse.json({ ok: true });
}
