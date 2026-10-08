import { NextResponse } from "next/server";
import pool from "@/lib/db";

/**
 * Health check for monitoring and uptime checks. Returns 200 when the app and
 * database are reachable, 503 otherwise. No authentication required.
 */
export async function GET() {
  try {
    await pool.query("SELECT 1");
    return NextResponse.json({ ok: true, uptime: process.uptime() });
  } catch {
    return NextResponse.json(
      { ok: false, error: "database unreachable" },
      { status: 503 }
    );
  }
}
