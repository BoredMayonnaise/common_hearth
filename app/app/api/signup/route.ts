import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");
  if (!email || password.length < 8) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    await pool.query("INSERT INTO users (email, password_hash) VALUES ($1, $2)", [email, hash]);
  } catch {
    return NextResponse.json({ error: "exists" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
