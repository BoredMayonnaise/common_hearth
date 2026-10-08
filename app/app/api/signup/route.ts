import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { clientIp, rateLimit, retryAfterPhrase } from "@/lib/rate-limit";
import { LIMITS, MAX } from "@/lib/limits";

export async function POST(req: Request) {
  const ip = clientIp(req.headers);

  // Counted before anything is parsed, so a flood of junk still costs one row.
  const byIp = await rateLimit("signup:ip", ip, LIMITS.signupPerIp);
  if (!byIp.ok) {
    return NextResponse.json(
      { error: "rate", message: `Too many sign-ups from here. Try again ${retryAfterPhrase(byIp.retryAfterSeconds)}.` },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");

  if (!email || email.length > MAX.email) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (password.length < MAX.passwordMin || password.length > MAX.password) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // A second bucket on the address itself: one attacker cannot burn the whole
  // network's allowance, and cannot hammer one victim from rotating IPs either.
  const byEmail = await rateLimit("signup:email", email, LIMITS.signupPerEmail);
  if (!byEmail.ok) {
    return NextResponse.json(
      { error: "rate", message: `Too many attempts for that address. Try again ${retryAfterPhrase(byEmail.retryAfterSeconds)}.` },
      { status: 429, headers: { "Retry-After": String(byEmail.retryAfterSeconds) } }
    );
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    await pool.query("INSERT INTO users (email, password_hash) VALUES ($1, $2)", [email, hash]);
  } catch (e: unknown) {
    // Only a unique violation means "already registered". Any other error
    // (DB down, connection lost) should not tell the user their email is taken.
    const code = (e as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json({ error: "exists" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "unavailable", message: "Could not create your account right now. Try again in a moment." },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true });
}