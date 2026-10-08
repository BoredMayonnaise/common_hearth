import Link from "next/link";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NotebookPen, PencilLine } from "lucide-react";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { notesForUser } from "@/lib/notes";
import { ButtonLink } from "../ui/button";
import { IndexCard } from "../ui/card";
import EmptyState from "../ui/empty-state";
import Alert from "../ui/alert";
import Badge from "../ui/badge";
import PageShell from "../ui/shell";
import MarkReceivedButton from "./mark-received-button";
import { ConsumeFlash } from "../ui/toast";

export const instant = false;

const listErrors: Record<string, string> = {
  notfound: "That note no longer exists.",
  forbidden: "You are not a member of this circle.",
};

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function NotesBody({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const profile = await pool.query("SELECT display_name FROM profiles WHERE user_id = $1", [uid]);
  if (!profile.rows[0]) redirect("/profile");
  const notes = await notesForUser(uid);
  const carrying = notes.filter((n) => !n.received_at && n.carrier_name);
  const listError = sp?.error ? listErrors[sp.error] : undefined;

  return (
    <>
      <ConsumeFlash path="/notes" />
      <PageShell
      title="Practice notes"
      subtitle="The living handbook your circle keeps for each other."
      actions={
        <ButtonLink href="/notes/new">
          <NotebookPen aria-hidden="true" className="size-4" />
          Write a note
        </ButtonLink>
      }
    >
      {listError ? (
        <Alert tone="danger" className="mb-6">
          {listError}
        </Alert>
      ) : null}

      <section aria-labelledby="carrying-heading">
        <h2
          id="carrying-heading"
          className="read-me border-b border-ink pb-2 text-[1.25rem] text-ink"
        >
          Who is carrying what
        </h2>
        {carrying.length === 0 ? (
          <p className="read-me mt-3 text-[0.9375rem] text-body">
            Nothing is handed off right now. Every note has landed with its carrier.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {carrying.map((n) => (
              <li key={n.id}>
                <div className="flex items-stretch gap-3">
                  <span aria-hidden="true" className="w-1 shrink-0 rounded-[1px] bg-brick" />
                  <div className="min-w-0 flex-1 rounded-base border border-rule bg-card px-4 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="read-me text-[1.0625rem] leading-snug text-ink">{n.title}</p>
                      <Badge tone="brick">{n.carrier_name} is carrying</Badge>
                    </div>
                    <p className="mt-1 text-sm text-body">
                      {n.handoff_on ? `Handoff on ${formatDate(n.handoff_on)}` : "No handoff date set"}
                      <span className="text-body-subtle"> · {n.circle_name}</span>
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="all-notes-heading" className="mt-10">
        <h2
          id="all-notes-heading"
          className="read-me border-b border-ink pb-2 text-[1.25rem] text-ink"
        >
          All notes
        </h2>
        {notes.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title="Write the thing only you remember."
            className="mt-4"
            action={
              <ButtonLink href="/notes/new" variant="secondary" full={false}>
                <NotebookPen aria-hidden="true" className="size-4" />
                Write a note
              </ButtonLink>
            }
          />
        ) : (
          <ul className="mt-4 grid gap-4">
            {notes.map((n) => {
              const stepLines = String(n.steps || "")
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 3);
              return (
                <li key={n.id}>
                  <IndexCard bodyClassName="py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="read-me text-[1.25rem] leading-snug text-ink">{n.title}</h3>
                      <Badge tone={n.received_at ? "pine" : "brick"}>
                        {n.received_at ? `Received ${formatDate(n.received_at)}` : "Not received"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-body">
                      <span>{n.circle_name}</span>
                      <span>
                        {n.carrier_name ? `Carried by ${n.carrier_name}` : "No carrier"}
                      </span>
                      <span className="text-body-subtle">
                        {n.handoff_on ? `Handoff ${formatDate(n.handoff_on)}` : "No handoff date"}
                      </span>
                    </div>

                    {n.situation ? (
                      <p className="read-me prose-note mt-3 max-w-[46rem] text-[0.9375rem] leading-relaxed text-body">
                        {n.situation}
                      </p>
                    ) : null}

                    {stepLines.length > 0 ? (
                      <ol className="mt-3 border-t border-rule-soft pt-3">
                        {stepLines.map((s, i) => (
                          <li key={i} className="flex gap-3 py-1">
                            <span aria-hidden="true" className="tabnum w-4 shrink-0 text-right text-sm text-ink-3">
                              {i + 1}
                            </span>
                            <span className="read-me min-w-0 flex-1 text-[0.9375rem] leading-snug text-ink">
                              {s}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : null}

                    <div className="mt-4 flex flex-col gap-2 border-t border-rule-soft pt-3 min-[420px]:flex-row">
                      <ButtonLink href={`/notes/${n.id}/edit`} variant="secondary" size="sm">
                        <PencilLine aria-hidden="true" className="size-4" />
                        Edit
                      </ButtonLink>
                      {!n.received_at ? (
                        <MarkReceivedButton noteId={n.id} />
                      ) : null}
                    </div>
                  </IndexCard>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-8 text-sm text-body">
        <Link href="/" className="text-brick underline underline-offset-2">
          Back home
        </Link>
      </p>
    </PageShell>
    </>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <NotesBody searchParams={searchParams} />;
}
