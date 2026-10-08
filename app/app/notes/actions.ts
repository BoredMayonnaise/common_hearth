"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { invalidateCircleNotesCache } from "@/lib/notes";

export type MarkReceivedResult = { ok: true } | { ok: false; message: string };

export async function markReceived(noteId: string): Promise<MarkReceivedResult> {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");

  if (!noteId) {
    return { ok: false, message: "Note ID is required." };
  }

  const note = await pool.query("SELECT circle_id FROM notes WHERE id = $1", [noteId]);
  if (!note.rows[0]) {
    return { ok: false, message: "That note no longer exists." };
  }

  const mine = await pool.query(
    "SELECT id FROM memberships WHERE circle_id = $1 AND user_id = $2",
    [note.rows[0].circle_id, uid]
  );
  if (!mine.rows[0]) {
    return { ok: false, message: "You are not a member of this circle." };
  }

  await pool.query(
    "UPDATE notes SET received_at = now(), carrier_id = $2, changed_at = now() WHERE id = $1",
    [noteId, mine.rows[0].id]
  );

  await invalidateCircleNotesCache(note.rows[0].circle_id);
  revalidatePath("/notes");
  return { ok: true };
}
