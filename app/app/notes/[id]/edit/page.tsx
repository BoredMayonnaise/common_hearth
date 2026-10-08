import Link from "next/link";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { membershipsForUser } from "@/lib/membership";
import { noteById, invalidateCircleNotesCache } from "@/lib/notes";
import Alert from "../../../ui/alert";
import { Card, Fieldset } from "../../../ui/card";
import FormFooter from "../../../ui/form-footer";
import PageShell from "../../../ui/shell";
import SubmitButton from "../../../ui/submit-button";
import { SelectField, TextAreaField, TextField } from "../../../ui/field";

export const instant = false;

async function editNote(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const noteId = String(formData.get("note_id"));
  const note = await pool.query("SELECT circle_id FROM notes WHERE id = $1", [noteId]);
  if (!note.rows[0]) redirect("/notes?error=notfound");
  const isMember = await pool.query(
    "SELECT 1 FROM memberships WHERE circle_id = $1 AND user_id = $2",
    [note.rows[0].circle_id, uid]
  );
  if (!isMember.rows[0]) redirect("/notes?error=forbidden");
  const title = String(formData.get("title") || "").trim();
  const situation = String(formData.get("situation") || "").trim();
  const steps = String(formData.get("steps") || "").trim();
  const neverPromise = String(formData.get("never_promise") || "").trim();
  if (!title || !situation || !steps || !neverPromise) redirect(`/notes/${noteId}/edit?error=1`);
  await pool.query(
    `UPDATE notes SET title=$2, situation=$3, steps=$4, never_promise=$5,
       access_notes=$6, contact=$7, carrier_id=$8, handoff_on=$9, changed_at=now()
     WHERE id=$1`,
    [
      noteId, title, situation, steps, neverPromise,
      String(formData.get("access_notes") || "").trim() || null,
      String(formData.get("contact") || "").trim() || null,
      String(formData.get("carrier_id") || "") || null,
      String(formData.get("handoff_on") || "") || null,
    ]
  );
  await invalidateCircleNotesCache(note.rows[0].circle_id);
  revalidatePath("/notes");
  redirect("/notes");
}

async function archiveNote(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const noteId = String(formData.get("note_id"));
  const note = await pool.query("SELECT circle_id FROM notes WHERE id = $1", [noteId]);
  if (!note.rows[0]) redirect("/notes?error=notfound");
  const isMember = await pool.query(
    "SELECT 1 FROM memberships WHERE circle_id = $1 AND user_id = $2",
    [note.rows[0].circle_id, uid]
  );
  if (!isMember.rows[0]) redirect("/notes?error=forbidden");
  await pool.query("UPDATE notes SET archived_at = now(), changed_at = now() WHERE id = $1", [noteId]);
  await invalidateCircleNotesCache(note.rows[0].circle_id);
  revalidatePath("/notes");
  redirect("/notes");
}

function toDateInput(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value as string).toISOString().slice(0, 10);
}

async function EditBody({
  id,
  searchParams,
}: {
  id: string;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const n = await noteById(id, uid);
  if (!n) redirect("/notes");
  const memberships = await membershipsForUser(uid);

  return (
    <PageShell
      title="Edit note"
      meta={<span className="text-sm text-body-subtle">{n.circle_name}</span>}
    >
      {sp?.error ? (
        <Alert tone="danger" className="mb-5">
          Fill in the title, situation, steps, and never promise.
        </Alert>
      ) : null}

      <Card className="p-4 sm:p-6">
        <form action={editNote} className="grid gap-7">
          <input type="hidden" name="note_id" value={n.id} />

          <Fieldset legend="The note">
            <TextField
              name="title"
              label="Title"
              defaultValue={n.title}
              enterKeyHint="next"
              required
            />
            <TextAreaField name="situation" label="Situation" rows={3} defaultValue={n.situation} required />
            <TextAreaField name="steps" label="Steps" rows={5} defaultValue={n.steps} required />
            <TextAreaField
              name="never_promise"
              label="Never promise"
              rows={2}
              defaultValue={n.never_promise}
              required
            />
          </Fieldset>

          <Fieldset legend="Access and contact">
            <TextAreaField
              name="access_notes"
              label="Access notes"
              rows={2}
              defaultValue={n.access_notes ?? ""}
            />
            <TextField
              name="contact"
              label="Contact"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={n.contact ?? ""}
              enterKeyHint="done"
            />
          </Fieldset>

          <Fieldset legend="The handoff">
            <SelectField name="carrier_id" label="Carrier" defaultValue={n.carrier_id ?? ""}>
              <option value="">Unassigned</option>
              {memberships.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name} — {m.circle_name}
                </option>
              ))}
            </SelectField>
            <TextField
              name="handoff_on"
              label="Handoff date"
              type="date"
              defaultValue={toDateInput(n.handoff_on)}
            />
          </Fieldset>

          <FormFooter flashTo="/notes" flashMessage="Changes saved.">
            <SubmitButton pendingLabel="Saving changes…">Save changes</SubmitButton>
          </FormFooter>
        </form>
      </Card>

      <Card className="mt-6 border-l-2 border-l-brick p-4 sm:p-5">
        <h2 className="read-me border-b border-ink pb-2 text-[1.125rem] text-ink">
          Archive this note
        </h2>
        <p className="read-me mt-2 max-w-[44rem] text-[0.9375rem] leading-relaxed text-body">
          Archiving takes it out of the handbook for everyone in the circle. The note is kept, but
          it stops appearing in the list and cannot be found by search.
        </p>
        <FormFooter
          sticky={false}
          flashTo="/notes"
          flashMessage="Note archived. It is out of the handbook now."
          inset="-mx-4 px-4"
          className="mt-4"
        >
          <form action={archiveNote}>
            <input type="hidden" name="note_id" value={n.id} />
            <SubmitButton variant="danger" pendingLabel="Archiving…">
              Archive this note
            </SubmitButton>
          </form>
        </FormFooter>
      </Card>

      <p className="mt-6 text-sm text-body">
        <Link href="/notes" className="text-brick underline underline-offset-2">
          Back to notes
        </Link>
      </p>
    </PageShell>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  return <EditBody id={id} searchParams={searchParams} />;
}
