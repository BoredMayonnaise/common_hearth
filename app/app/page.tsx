import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowDown, Check, NotebookPen, PackageCheck } from "lucide-react";
import pool from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { carryingCountForUser, feedForUser } from "@/lib/notes";
import { relativeDate } from "@/lib/time";
import { ButtonLink } from "./ui/button";
import { Card } from "./ui/card";
import Badge from "./ui/badge";
import EmptyState from "./ui/empty-state";
import { ConsumeFlash } from "./ui/toast";

const PER_PAGE = 20;

const steps = [
  {
    title: "Fill in a trust profile",
    body: "A display name, one line on how you show up, and an optional region or role tag. Visible only inside your circle.",
  },
  {
    title: "Start or join a circle",
    body: "A circle is private. An invite code from someone you already trust is the only way in, and there is no way to browse for one.",
  },
  {
    title: "Write practice notes",
    body: "Record the situation, the steps that worked, and what you will never promise. This is the part only you remember.",
  },
  {
    title: "Pass it on and mark it received",
    body: "Assign a carrier and a handoff date. Mark it received when it lands. The knowledge stays; the burden moves.",
  },
];

function Landing() {
  return (
    <div className="grid gap-12 sm:gap-16">
      <section className="relative rounded-base border border-rule border-t-2 border-t-brick bg-card pt-7 pr-5 pb-8 pl-10">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-6 flex flex-col gap-11"
        >
          <span className="size-2.5 rounded-full bg-rule shadow-[inset_0_1px_1px_rgba(0,0,0,0.12)]" />
          <span className="size-2.5 rounded-full bg-rule shadow-[inset_0_1px_1px_rgba(0,0,0,0.12)]" />
        </span>

        <h1 className="read-me text-[2rem] leading-[1.15] tracking-tight text-ink sm:text-[2.75rem]">
          A handbook for the people who keep each other going.
        </h1>
        <p className="read-me mt-4 max-w-[34rem] text-[1.0625rem] leading-relaxed text-body">
          Common Hearth keeps the practical knowledge of a small circle — where the spare key is,
          who does the Tuesday call, what you will not promise — in one private place, so it survives
          when the most tired person steps back.
        </p>
        <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row">
          <ButtonLink href="/signup" size="lg">
            Create account
          </ButtonLink>
          <ButtonLink href="/signup?join=1" variant="secondary" size="lg">
            Join with a code
          </ButtonLink>
        </div>
        <p className="mt-5 text-sm text-body">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brick underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </section>

      <section>
        <h2 className="read-me border-b border-ink pb-2 text-[1.375rem] text-ink">
          How a circle uses it
        </h2>
        <ol className="mt-1">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4 border-b border-rule-soft py-4 last:border-b-0">
              <span aria-hidden="true" className="tabnum w-6 shrink-0 pt-1 text-right text-sm text-ink-3">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="read-me text-[1.0625rem] leading-snug text-ink">{step.title}</p>
                <p className="read-me mt-1 max-w-[46rem] text-[0.9375rem] leading-relaxed text-body">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="read-me border-b border-ink pb-2 text-[1.375rem] text-ink">How private it is</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Card className="p-4">
            <p className="read-me text-ink">
              Profiles are visible only to people inside the same circle. There is no public directory
              and no search for people.
            </p>
          </Card>
          <Card className="p-4">
            <p className="read-me text-ink">
              Invite codes are the only way in. Nobody can find your circle unless you give them the
              code.
            </p>
          </Card>
        </div>
        <p className="mt-5 text-sm text-body-subtle">
          Want to look around first? Create an account, then join the demo circle with the code{" "}
          <code className="tabnum rounded-[2px] border border-rule bg-card px-1.5 py-0.5 font-semibold text-ink">
            demo-hearth
          </code>
          .
        </p>
      </section>

      <p className="flex items-center gap-2 text-sm text-body-subtle">
        <ArrowDown aria-hidden="true" className="size-4" />
        Three fields to start: a name, how you show up, and a circle.
      </p>
    </div>
  );
}

/** One builder for every filter link, so chips and pager never disagree. */
function feedHref(opts: { circle?: string | null; carrying?: boolean; page?: number }) {
  const q = new URLSearchParams();
  if (opts.circle) q.set("circle", opts.circle);
  if (opts.carrying) q.set("carrying", "1");
  if (opts.page && opts.page > 1) q.set("page", String(opts.page));
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

const chipBase =
  "inline-flex min-h-11 items-center gap-1.5 rounded-base border px-3 text-sm font-medium transition-colors";
const chipOff = `${chipBase} border-rule bg-card text-body hover:border-ink-3 hover:text-ink`;
const chipOn = `${chipBase} border-brick bg-brick text-card`;

function Chip({ href, on, children }: { href: string; on: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={on ? "true" : undefined}
      className={on ? chipOn : chipOff}
    >
      {on ? <Check aria-hidden="true" className="size-3.5" /> : null}
      {children}
    </Link>
  );
}

/**
 * Filters are links rather than a form. A form here looked right and silently did
 * nothing when the <form> went missing, and a checkbox also picks up Chrome's
 * restored form state on a back navigation, leaving a tick on a filter that is off.
 * A chip per option is one tap, works without JavaScript, and always matches the URL.
 */
function Filters({
  circles,
  circleId,
  carryingOnly,
  total,
  carryingTotal,
}: {
  circles: { id: string; name: string }[];
  circleId: string | null;
  carryingOnly: boolean;
  total: number;
  carryingTotal: number;
}) {
  if (circles.length === 0) return null;

  const view = carryingOnly ? "carrying" : "everything";

  return (
    <div className="grid gap-3 rounded-base border border-rule bg-card-2 p-3">
      <div>
        <p className="mb-1.5 text-[0.8125rem] font-medium text-ink">Show</p>
        <div className="flex flex-wrap gap-2">
          {/* Clears both dimensions. Wanting "this circle, everything in it" is
              what tapping that circle's chip already does. */}
          <Chip href="/" on={view === "everything" && !circleId}>
            Everything
          </Chip>
          <Chip href={feedHref({ circle: circleId, carrying: true })} on={view === "carrying"}>
            Being carried
          </Chip>
        </div>
      </div>

      {circles.length > 1 ? (
        <div>
          <p className="mb-1.5 text-[0.8125rem] font-medium text-ink">Circle</p>
          <div className="flex flex-wrap gap-2">
            <Chip href={feedHref({ carrying: carryingOnly })} on={!circleId}>
              All circles
            </Chip>
            {circles.map((c) => (
              <Chip
                key={c.id}
                href={feedHref({ circle: c.id, carrying: carryingOnly })}
                on={circleId === c.id}
              >
                {c.name}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-sm text-body-subtle">
        <span className="tabnum">{total}</span> {total === 1 ? "note" : "notes"}
        {carryingTotal > 0 ? (
          <>
            {" · "}
            <span className="tabnum">{carryingTotal}</span> being carried
          </>
        ) : null}
        {circleId || carryingOnly ? (
          <>
            {" · "}
            <Link href="/" className="text-brick underline underline-offset-2">
              Show everything
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}

async function Feed({
  uid,
  displayName,
  circleId,
  carryingOnly,
  page,
}: {
  uid: string;
  displayName: string;
  circleId: string | null;
  carryingOnly: boolean;
  page: number;
}) {
  const circlesRes = await pool.query(
    `SELECT c.id, c.name FROM memberships m JOIN circles c ON c.id = m.circle_id
     WHERE m.user_id = $1 ORDER BY c.name`,
    [uid]
  );
  const circles = circlesRes.rows;
  const carryingTotal = await carryingCountForUser(uid);

  // A circle filter naming a circle you are not in is ignored rather than obeyed.
  const safeCircle = circles.some((c) => c.id === circleId) ? circleId : null;

  const { rows, total } = await feedForUser(uid, {
    circleId: safeCircle,
    carryingOnly,
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
  });

  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="grid gap-6">
      <section className="relative rounded-base border border-rule border-t-2 border-t-brick bg-card pt-5 pr-4 pb-5 pl-9">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2 top-4 flex flex-col gap-9"
        >
          <span className="size-2 rounded-full bg-rule shadow-[inset_0_1px_1px_rgba(0,0,0,0.12)]" />
        </span>
        <h1 className="read-me text-[1.75rem] leading-tight tracking-tight text-ink sm:text-[2rem]">
          Hello, {displayName}.
        </h1>
        <p className="read-me mt-1 max-w-[34rem] text-[0.9375rem] text-body">
          Everything your circles have written, newest first.
        </p>
        <div className="mt-4 flex flex-col gap-2 min-[420px]:flex-row">
          <ButtonLink href="/notes/new">
            <NotebookPen aria-hidden="true" className="size-4" />
            Write a note
          </ButtonLink>
          <ButtonLink href="/notes" variant="secondary">
            <PackageCheck aria-hidden="true" className="size-4" />
            Who is carrying what
          </ButtonLink>
        </div>
      </section>

      {circles.length === 0 ? (
        <EmptyState icon={NotebookPen} title="No circles yet">
          A circle is the whole door. Start one and share the invite link, or join with a code
          someone you trust gave you.
        </EmptyState>
      ) : (
        <>
          <Filters
            circles={circles}
            circleId={safeCircle}
            carryingOnly={carryingOnly}
            total={total}
            carryingTotal={carryingTotal}
          />

          {rows.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title={carryingOnly ? "Nothing is being carried" : "No notes yet"}
            >
              {carryingOnly
                ? "Nothing in this view is waiting on someone. Clear the filter to see the whole handbook."
                : "The handbook is empty until someone writes the first thing they actually did."}
            </EmptyState>
          ) : (
            <>
              <ul className="grid gap-3">
                {rows.map((n) => (
                  <li key={n.id}>
                    <article className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className={
                          n.received_at
                            ? "w-1 shrink-0 rounded-[1px] bg-rule"
                            : "w-1 shrink-0 rounded-[1px] bg-brick"
                        }
                      />
                      <div className="min-w-0 flex-1 rounded-base border border-rule bg-card px-4 py-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <h3 className="read-me min-w-0 text-[1.0625rem] leading-snug text-ink">
                            <Link
                              href={`/notes/${n.id}/edit`}
                              className="text-ink underline-offset-2 hover:underline"
                            >
                              {n.title}
                            </Link>
                          </h3>
                          <Badge tone="neutral">{n.circle_name}</Badge>
                        </div>
                        {n.situation ? (
                          <p className="read-me mt-1 line-clamp-2 text-[0.9375rem] leading-snug text-body">
                            {n.situation}
                          </p>
                        ) : null}
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-body-subtle">
                          <span>{n.author_name ?? "Someone"}</span>
                          <span aria-hidden="true">·</span>
                          <span title={new Date(n.created_at).toUTCString()}>
                            {relativeDate(n.created_at)}
                          </span>
                          {n.carrier_name && !n.received_at ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-brick">{n.carrier_name} is carrying</span>
                            </>
                          ) : null}
                          {n.received_at ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-pine">Received</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>

              {lastPage > 1 ? (
                <nav aria-label="Feed pages" className="flex items-center justify-between gap-3">
                  {page > 1 ? (
                    <Link
                      href={feedHref({ circle: safeCircle, carrying: carryingOnly, page: page - 1 })}
                      className="inline-flex min-h-11 items-center rounded-base text-sm font-medium text-brick underline underline-offset-2"
                    >
                      ← Newer
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="tabnum text-sm text-body-subtle">
                    Page {page} of {lastPage}
                  </span>
                  {page < lastPage ? (
                    <Link
                      href={feedHref({ circle: safeCircle, carrying: carryingOnly, page: page + 1 })}
                      className="inline-flex min-h-11 items-center rounded-base text-sm font-medium text-brick underline underline-offset-2"
                    >
                      Older →
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}

async function HomeBody({
  searchParams,
}: {
  searchParams: Promise<{ circle?: string; carrying?: string; page?: string }>;
}) {
  await connection();
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;

  if (!uid) return <Landing />;

  const res = await pool.query(
    "SELECT display_name FROM profiles WHERE user_id = $1",
    [uid]
  );
  const p = res.rows[0];
  if (!p) redirect("/profile");

  const rawPage = Number(sp?.page);
  const page = Number.isFinite(rawPage) && rawPage > 1 ? Math.floor(rawPage) : 1;

  return (
    <Feed
      uid={uid}
      displayName={p.display_name}
      circleId={sp?.circle || null}
      carryingOnly={sp?.carrying === "1"}
      page={page}
    />
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main id="main" className="mx-auto w-full max-w-2xl safe-x sm:px-8">
      <div className="clear-tabbar py-6 sm:py-10">
        <ConsumeFlash path="/" />
        <Suspense fallback={null}>
          <HomeBody searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}