import { Suspense } from "react";
import { connection } from "next/server";
import pool from "@/lib/db";

async function DbStatus() {
  await connection();
  let dbStatus = "unknown";
  try {
    const res = await pool.query("SELECT 1 AS ok");
    dbStatus = res.rows[0].ok === 1 ? "connected" : "error";
  } catch {
    dbStatus = "error";
  }
  return <p>Database: {dbStatus}</p>;
}

export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Common Hearth is up.</h1>
      <Suspense fallback={<p>Database: checking…</p>}>
        <DbStatus />
      </Suspense>
    </main>
  );
}
