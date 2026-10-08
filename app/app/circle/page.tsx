import Link from "next/link";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { ChevronDown, NotebookPen, Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { inviteUrl, joinByCode } from "@/lib/invites";
import { LIMITS, MAX, tooLong } from "@/lib/limits";
import { rateLimit, retryAfterPhrase } from "@/lib/rate-limit";
import { relativeDate } from "@/lib/time";
import ShareInvite from "../share-invite";
import Alert from "../ui/alert";
import Badge from "../ui/badge";
import { ButtonLink } from "../ui/button";
import { Card } from "../ui/card";
import EmptyState from "../ui/empty-state";
import FormFooter from "../ui/form-footer";
import PageShell from "../ui/shell";
import SubmitButton from "../ui/submit-button";
import { Roster, RosterEntry } from "../ui/stamp";
import { TextField } from "../ui/field";

export const instant = false;

async function createCircle(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const name = String(formData.get("name") || "").trim();
  const purpose = String(formData.get("purpose") || "").trim() || null;
  const over = tooLong(name, MAX.circleName, "The circle name") || tooLong(purpose ?? "", MAX.circlePurpose, "The purpose");
  if (over) redirect(`/circle?error=${encodeURIComponent(over)}`);
  if (!name) redirect("/circle?error=1");

  const quota = await rateLimit("circle", uid, LIMITS.createCircle);
  if (!quota.ok) redirect(`/circle?error=${encodeURIComponent(`You have started several circles today. Try again ${retryAfterPhrase(quota.retryAfterSeconds)}.`)}`);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const circle = await client.query(
      "INSERT INTO circles (name, purpose, created_by) VALUES ($1, $2, $3) RETURNING id",
      [name, purpose, uid]
    );
    const circleId = circle.rows[0].id;
    await client.query(
      "INSERT INTO memberships (circle_id, user_id, role) VALUES ($1, $2, 'owner')",
      [circleId, uid]
    );
    const code = randomBytes(4).toString("hex");
    await client.query(
      "INSERT INTO invite_codes (code, circle_id) VALUES ($1, $2)",
      [code, circleId]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    redirect(`/circle?error=${encodeURIComponent("Could not create the circle right now. Try again in a moment.")}`);
  } finally {
    client.release();
  }
  revalidatePath("/circle");
  redirect("/circle");
}

async function joinCircle(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const quota = await rateLimit("join", uid, LIMITS.joinCircle);
  if (!quota.ok) redirect(`/circle?join=rate&wait=${quota.retryAfterSeconds}`);
  const result = await joinByCode(String(formData.get("code") || ""), uid);
  if (!result.ok) redirect(`/circle?join=${result.reason}`);
  revalidatePath("/circle");
  revalidatePath("/notes");
  redirect("/circle");
}

const joinErrors: Record<string, string> = {
  empty: "Enter the invite code you were given.",
  invalid: "That code does not work or has expired.",
  full: "That code has already been used the maximum number of times.",
  rate: "Too many join attempts. Wait a moment and try again.",
};

async function CircleBody({
  searchParams,
}: {
  searchParams: Promise<{ join?: string; error?: string }>;
}) {
  await connection();
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const profile = await pool.query("SELECT display_name FROM profiles WHERE user_id = $1", [uid]);
  if (!profile.rows[0]) redirect("/profile");
  const res = await pool.query(
    `SELECT c.id, c.name, c.purpose, m.role,
            (SELECT code FROM invite_codes WHERE circle_id = c.id ORDER BY created_at LIMIT 1) AS code,
            (SELECT count(*)::int FROM notes n
              WHERE n.circle_id = c.id AND n.archived_at IS NULL) AS note_count,
            (SELECT max(n.changed_at) FROM notes n
              WHERE n.circle_id = c.id AND n.archived_at IS NULL) AS last_note_at
     FROM memberships m JOIN circles c ON c.id = m.circle_id
     WHERE m.user_id = $1
     ORDER BY m.joined_at`,
    [uid]
  );
  const members = await pool.query(
    `SELECT m.circle_id, p.display_name, p.how_i_show_up, p.region_or_role_tag
     FROM memberships m
     JOIN profiles p ON p.user_id = m.user_id
     WHERE m.circle_id IN (SELECT circle_id FROM memberships WHERE user_id = $1)
     ORDER BY p.display_name`,
    [uid]
  );

  const joinError = sp?.join ? joinErrors[sp.join] : undefined;

  return (
    <PageShell
      title="Your circle"
      subtitle="The people you share a handbook with. What they write here is only visible inside the circle."
    >
            {joinError ? (
        <Alert tone="danger" className="mb-5">
          {joinError}
        </Alert>
      ) : null}
      {sp?.error ? (
        <Alert tone="danger" className="mb-5">
          {sp.error === "1" ? "Please give the circle a name." : sp.error}
        </Alert>
      ) : null}

      {res.rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Start a circle, or join one with a link"
          className="mb-8"
        >
          Create a circle to get an invite link you can share, or open the link someone you trust
          sent you. Either way, nobody finds you — the link is the whole door.
        </EmptyState>
      ) : (
        <ul className="mb-8 grid gap-5">
          {res.rows.map((c) => {
            const people = members.rows.filter((mm) => mm.circle_id === c.id);
            return (
              <li key={c.id}>
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 className="read-me text-[1.375rem] leading-snug text-ink">{c.name}</h2>
                    <Badge tone={c.role === "owner" ? "brick" : "neutral"}>
                      {c.role === "owner" ? "You own this" : "Member"}
                    </Badge>
                  </div>
                  {c.purpose ? (
                    <p className="read-me mt-1 max-w-[46rem] text-[0.9375rem] leading-relaxed text-body">
                      {c.purpose}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-body-subtle">
                    <span className="tabnum">
                      {c.note_count === 1 ? "1 note" : `${c.note_count} notes`}
                    </span>
                    {c.last_note_at ? <> · last touched {relativeDate(c.last_note_at)}</> : null}
                  </p>
                  <div className="mt-3">
                    <ButtonLink href={`/notes/new?circle=${c.id}`} variant="secondary" size="sm">
                      <NotebookPen aria-hidden="true" className="size-4" />
                      Write a note
                    </ButtonLink>
                  </div>

                  {c.role === "owner" && c.code ? (
                    <div className="mt-4 max-w-sm">
                      <ShareInvite link={inviteUrl(c.code)} code={c.code} circleName={c.name} />
                    </div>
                  ) : null}

                  <h3 className="mt-5 mb-2 flex items-baseline gap-2 text-[0.8125rem] font-semibold text-ink">
                    Members
                    <span className="tabnum font-normal text-body-subtle">{people.length}</span>
                  </h3>
                  <Roster>
                    {people.map((mm) => (
                      <RosterEntry
                        key={`${mm.circle_id}-${mm.display_name}`}
                        name={mm.display_name}
                        tag={mm.region_or_role_tag}
                        line={mm.how_i_show_up}
                      />
                    ))}
                  </Roster>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h2 className="read-me border-b border-ink pb-2 text-[1.125rem] text-ink">
            Join a circle
          </h2>
          <p className="read-me mt-3 text-[0.9375rem] text-body">
            If someone sent you an invite link, just open it &mdash; you will land back here already
            inside.
          </p>
          <details className="group mt-4">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-base text-sm font-medium text-brick marker:content-none">
              <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-90" />
              Or enter a code
            </summary>
            <form action={joinCircle} className="mt-4 grid gap-4">
              <TextField
                name="code"
                label="Invite code"
                hint="Ask the person who started the circle."
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                enterKeyHint="go"
                className="tabnum tracking-[0.12em] uppercase"
                required
              />
              <FormFooter>
                <SubmitButton pendingLabel="Joining…">Join circle</SubmitButton>
              </FormFooter>
            </form>
          </details>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="read-me border-b border-ink pb-2 text-[1.125rem] text-ink">
            Start a circle
          </h2>
          <form action={createCircle} className="mt-4 grid gap-4">
            <TextField name="name" label="Circle name" maxLength={MAX.circleName} enterKeyHint="next" required />
            <TextField
              name="purpose"
              label="One-line purpose"
              hint="What this circle is for, in a sentence."
              maxLength={MAX.circlePurpose}
              enterKeyHint="go"
            />
            <FormFooter>
              <SubmitButton pendingLabel="Creating…" variant="secondary">
                Start a circle
              </SubmitButton>
            </FormFooter>
          </form>
        </Card>
      </div>

      <p className="mt-8 text-sm text-body">
        <Link href="/" className="text-brick underline underline-offset-2">
          Back home
        </Link>
      </p>
    </PageShell>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ join?: string; error?: string }>;
}) {
  return <CircleBody searchParams={searchParams} />;
}
