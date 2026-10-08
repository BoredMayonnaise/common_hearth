import Link from "next/link";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { membershipsForUser } from "@/lib/membership";
import { invalidateCircleNotesCache } from "@/lib/notes";
import { LIMITS, MAX, tooLong } from "@/lib/limits";
import { rateLimit } from "@/lib/rate-limit";
import Alert from "../../ui/alert";
import { Card, Fieldset } from "../../ui/card";
import FormFooter from "../../ui/form-footer";
import PageShell from "../../ui/shell";
import SubmitButton from "../../ui/submit-button";
import { SelectField, TextAreaField, TextField } from "../../ui/field";

export const instant = false;

async function createNote(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const carrierId = String(formData.get("carrier_id") || "") || null;
  const circleId = String(formData.get("circle_id"));
  const title = String(formData.get("title") || "").trim();
  const situation = String(formData.get("situation") || "").trim();
  const steps = String(formData.get("steps") || "").trim();
  const neverPromise = String(formData.get("never_promise") || "").trim();
  const accessNotes = String(formData.get("access_notes") || "").trim() || null;
  const contact = String(formData.get("contact") || "").trim() || null;
  const handoffOn = String(formData.get("handoff_on") || "") || null;
  if (!title || !situation || !steps || !neverPromise || !circleId) {
    redirect("/notes/new?error=1");
  }
  const over =
    tooLong(title, MAX.noteTitle, "The title") ||
    tooLong(situation, MAX.noteSituation, "The situation") ||
    tooLong(steps, MAX.noteSteps, "The steps") ||
    tooLong(neverPromise, MAX.noteNeverPromise, "The never promise") ||
    tooLong(accessNotes ?? "", MAX.noteAccess, "The access notes") ||
    tooLong(contact ?? "", MAX.noteContact, "The contact");
  if (over) redirect(`/notes/new?error=${encodeURIComponent(over)}`);

  const quota = await rateLimit("note", uid, LIMITS.createNote);
  if (!quota.ok) redirect(`/notes/new?error=${encodeURIComponent(`You have written a lot of notes in a row. Try again in ${Math.ceil(quota.retryAfterSeconds / 60)} minutes.`)}`);
  const authorship = await pool.query(
    "SELECT id FROM memberships WHERE circle_id = $1 AND user_id = $2",
    [circleId, uid]
  );
  if (!authorship.rows[0]) redirect("/notes?error=forbidden");
  await pool.query(
    `INSERT INTO notes (circle_id, author_id, title, situation, steps, never_promise, access_notes, contact, carrier_id, handoff_on)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [circleId, uid, title, situation, steps, neverPromise, accessNotes, contact, carrierId, handoffOn]
  );
  await invalidateCircleNotesCache(circleId);
  revalidatePath("/notes");
  redirect("/notes");
}

async function NewNoteBody({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; circle?: string }>;
}) {
  await connection();
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const memberships = await membershipsForUser(uid);
  const userCircles = Array.from(
    new Map(memberships.map((m) => [m.circle_id, { id: m.circle_id, name: m.circle_name }])).values()
  );
  const profile = await pool.query("SELECT display_name FROM profiles WHERE user_id = $1", [uid]);
  if (!profile.rows[0]) redirect("/profile");

  // Arriving from a circle card, the circle is already decided. Only honour it
  // when it names a circle this user is actually in.
  const asked = typeof sp?.circle === "string" ? sp.circle : null;
  const chosen = userCircles.some((c) => c.id === asked) ? asked! : userCircles[0]?.id;

  return (
    <PageShell
      title="Write a practice note"
      subtitle="Only your circle sees this. Write it for whoever picks it up when you cannot."
    >
      {sp?.error ? (
        <Alert tone="danger" className="mb-5">
          {sp.error === "1"
            ? "Fill in the circle, title, situation, steps, and never promise."
            : sp.error}
        </Alert>
      ) : null}

      <Card className="p-4 sm:p-6">
        <form action={createNote} className="grid gap-7">
          <SelectField
            name="circle_id"
            label="Circle"
            hint="The handbook this note belongs to."
            defaultValue={chosen}
            required
          >
            {userCircles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>

          <Fieldset legend="The note" description="The four fields every note has to have.">
            <TextField
              name="title"
            maxLength={MAX.noteTitle}
              label="Title"
              hint="Short enough to find later. &ldquo;Where the spare key is.&rdquo;"
              enterKeyHint="next"
              required
            />
            <TextAreaField
              name="situation"
            maxLength={MAX.noteSituation}
              label="Situation"
              hint="When does this come up, and for whom?"
              rows={3}
              required
            />
            <TextAreaField
              name="steps"
            maxLength={MAX.noteSteps}
              label="Steps"
              hint="What actually worked, one per line."
              rows={5}
              enterKeyHint="next"
              required
            />
            <TextAreaField
              name="never_promise"
            maxLength={MAX.noteNeverPromise}
              label="Never promise"
              hint="The limit someone should not cross. &ldquo;I can drop a key off, I can't drive you to hospital.&rdquo;"
              rows={2}
              required
            />
          </Fieldset>

          <Fieldset legend="Access and contact" description="What the next person needs to actually get in.">
            <TextAreaField
              name="access_notes"
            maxLength={MAX.noteAccess}
              label="Access notes"
              hint="Codes, keys, alarm instructions, who else has a copy."
              rows={2}
            />
            <TextField
              name="contact"
            maxLength={MAX.noteContact}
              label="Contact"
              hint="A number or handle for whoever is holding this."
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="done"
            />
          </Fieldset>

          <Fieldset legend="The handoff" description="Who is carrying this, and by when.">
            <SelectField name="carrier_id" label="Carrier">
              <option value="">Unassigned</option>
              {memberships.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name} — {m.circle_name}
                </option>
              ))}
            </SelectField>
            <TextField name="handoff_on" label="Handoff date" type="date" />
          </Fieldset>

          <FormFooter flashTo="/notes" flashMessage="Note saved to the handbook.">
            <SubmitButton pendingLabel="Saving note…">Save note</SubmitButton>
          </FormFooter>
        </form>
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
  searchParams,
}: {
  searchParams: Promise<{ error?: string; circle?: string }>;
}) {
  return <NewNoteBody searchParams={searchParams} />;
}
