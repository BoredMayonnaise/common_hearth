import Link from "next/link";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { KeyRound, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { LIMITS, MAX, tooLong } from "@/lib/limits";
import { rateLimit, retryAfterPhrase } from "@/lib/rate-limit";
import SignOutButton from "../signout-button";
import Alert from "../ui/alert";
import { ButtonLink } from "../ui/button";
import { Card, Fieldset } from "../ui/card";
import FormFooter from "../ui/form-footer";
import PageShell from "../ui/shell";
import SubmitButton from "../ui/submit-button";
import { TextField } from "../ui/field";

export const instant = false;

async function changePassword(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");

  const quota = await rateLimit("pwchange", uid, LIMITS.changePassword);
  if (!quota.ok) {
    redirect(`/settings?error=${encodeURIComponent(`Too many password changes. Try again ${retryAfterPhrase(quota.retryAfterSeconds)}.`)}`);
  }

  const current = String(formData.get("current_password") || "");
  const next = String(formData.get("new_password") || "");

  if (next.length < MAX.passwordMin) {
    redirect(`/settings?error=${encodeURIComponent(`The new password needs at least ${MAX.passwordMin} characters.`)}`);
  }
  const over = tooLong(next, MAX.password, "That password");
  if (over) redirect(`/settings?error=${encodeURIComponent(over)}`);
  if (next === current) {
    redirect("/settings?error=The%20new%20password%20has%20to%20be%20different.");
  }

  const row = await pool.query(
    "SELECT password_hash, token_version FROM users WHERE id = $1",
    [uid]
  );
  const user = row.rows[0];
  if (!user?.password_hash) redirect("/settings?error=We%20could%20not%20read%20your%20account.");

  const ok = await bcrypt.compare(current, user.password_hash);
  if (!ok) redirect("/settings?error=That%20current%20password%20is%20not%20right.");

  const hash = await bcrypt.hash(next, 10);
  // Bumping the version invalidates every session token minted before this
  // moment, including the one making the request.
  await pool.query(
    "UPDATE users SET password_hash = $2, token_version = token_version + 1 WHERE id = $1",
    [uid, hash]
  );
  revalidatePath("/settings");
  redirect("/login?changed=1");
}

async function SettingsBody({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");

  const res = await pool.query(
    `SELECT u.email, p.display_name, p.region_or_role_tag,
            (SELECT count(*)::int FROM memberships WHERE user_id = u.id) AS circles,
            (SELECT count(*)::int FROM notes WHERE author_id = u.id) AS written
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [uid]
  );
  const me = res.rows[0];

  return (
    <PageShell title="Settings" subtitle="Your account, your security, and how this works." width="lg">
      {sp?.error ? (
        <Alert tone="danger" className="mb-6">
          {sp.error}
        </Alert>
      ) : null}

      <div className="grid gap-5">
        {/* ---------------------------------------------------------- account */}
        <Card className="p-4 sm:p-5">
          <h2 className="read-me flex items-center gap-2 border-b border-ink pb-2 text-[1.125rem] text-ink">
            <UserRound aria-hidden="true" className="size-[1.125rem] text-ink-3" />
            Your account
          </h2>
          <dl className="mt-4 grid gap-3 text-[0.9375rem] sm:grid-cols-2">
            <div>
              <dt className="text-xs text-body-subtle">Name in your circles</dt>
              <dd className="read-me mt-0.5 text-ink">{me?.display_name ?? "Not set yet"}</dd>
            </div>
            <div>
              <dt className="text-xs text-body-subtle">Sign-in address</dt>
              <dd className="read-me mt-0.5 flex items-center gap-1.5 break-all text-ink">
                <Mail aria-hidden="true" className="size-4 flex-none text-ink-3" />
                {me?.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-body-subtle">Circles you are in</dt>
              <dd className="read-me tabnum mt-0.5 text-ink">{me?.circles ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs text-body-subtle">Notes you have written</dt>
              <dd className="read-me tabnum mt-0.5 text-ink">{me?.written ?? 0}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/profile" variant="secondary" size="sm">
              Edit trust profile
            </ButtonLink>
            <ButtonLink href="/circle" variant="ghost" size="sm">
              Your circles
            </ButtonLink>
          </div>
        </Card>

        {/* --------------------------------------------------------- security */}
        <Card className="p-4 sm:p-5">
          <h2 className="read-me flex items-center gap-2 border-b border-ink pb-2 text-[1.125rem] text-ink">
            <ShieldCheck aria-hidden="true" className="size-[1.125rem] text-ink-3" />
            Security
          </h2>

          <form action={changePassword} className="mt-4 grid gap-5">
            <Fieldset
              legend="Change your password"
              description="You will be signed out everywhere afterwards, including this tab."
            >
              <TextField
                name="current_password"
                label="Current password"
                type="password"
                autoComplete="current-password"
                enterKeyHint="next"
                required
              />
              <TextField
                name="new_password"
                label="New password"
                hint={`At least ${MAX.passwordMin} characters. A short phrase you will remember beats a short word.`}
                type="password"
                autoComplete="new-password"
                minLength={MAX.passwordMin}
                maxLength={MAX.password}
                enterKeyHint="go"
                required
              />
            </Fieldset>
            <FormFooter sticky={false} className="border-t-0">
              <SubmitButton pendingLabel="Changing…">Change password</SubmitButton>
            </FormFooter>
          </form>

          <div className="mt-5 rounded-base border border-rule bg-card-2 px-4 py-3">
            <p className="text-sm leading-relaxed text-body">
              Signing in lasts a year so an invite link never bounces you back here. Changing your
              password ends every signed-in session at once, so anyone holding an old one is locked
              out immediately.
            </p>
          </div>
        </Card>

        {/* ---------------------------------------------------------- session */}
        <Card className="p-4 sm:p-5">
          <h2 className="read-me flex items-center gap-2 border-b border-ink pb-2 text-[1.125rem] text-ink">
            <LogOut aria-hidden="true" className="size-[1.125rem] text-ink-3" />
            Signing out
          </h2>
          <p className="read-me mt-3 text-[0.9375rem] text-body">
            Signs out on this device only. To end every session, change your password first.
          </p>
          <div className="mt-4">
            <SignOutButton variant="danger">Sign out of Common Hearth</SignOutButton>
          </div>
        </Card>

        {/* ------------------------------------------------------------ guide */}
        <Card className="p-4 sm:p-5">
          <h2 className="read-me flex items-center gap-2 border-b border-ink pb-2 text-[1.125rem] text-ink">
            <KeyRound aria-hidden="true" className="size-[1.125rem] text-ink-3" />
            How Common Hearth works
          </h2>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <section>
              <h3 className="text-[0.9375rem] font-semibold text-ink">Getting into a circle</h3>
              <p className="read-me mt-1.5 text-[0.9375rem] leading-relaxed text-body">
                Circles are private and there is no search. The only way in is an invite link or an
                invite code from someone already inside. Opening a link either joins you straight
                away or walks you through creating an account first.
              </p>
            </section>

            <section>
              <h3 className="text-[0.9375rem] font-semibold text-ink">What a circle can see</h3>
              <p className="read-me mt-1.5 text-[0.9375rem] leading-relaxed text-body">
                Members see each other&apos;s names, roles and notes, and nothing more. Anyone outside
                the circle cannot read, search or guess its contents — the pages refuse to return
                them rather than hiding them.
              </p>
            </section>

            <section>
              <h3 className="text-[0.9375rem] font-semibold text-ink">The seven fields</h3>
              <p className="read-me mt-1.5 text-[0.9375rem] leading-relaxed text-body">
                Every note needs a situation, steps, and a never promise. The never promise is the
                important one: it is the line the next person should not cross.
              </p>
            </section>

            <section>
              <h3 className="text-[0.9375rem] font-semibold text-ink">Carrying and handoff</h3>
              <p className="read-me mt-1.5 text-[0.9375rem] leading-relaxed text-body">
                A note can be assigned to whoever is holding it. Marking a handoff received moves it
                on, so &ldquo;who is carrying what&rdquo; always tells the truth about where a duty
                actually sits.
              </p>
            </section>

            <section>
              <h3 className="text-[0.9375rem] font-semibold text-ink">When someone writes</h3>
              <p className="read-me mt-1.5 text-[0.9375rem] leading-relaxed text-body">
                The app checks your circles every few seconds and tells you when a new note lands, so
                a change made by a tired neighbour does not sit unnoticed.
              </p>
            </section>

            <section>
              <h3 className="text-[0.9375rem] font-semibold text-ink">What this does not do</h3>
              <p className="read-me mt-1.5 text-[0.9375rem] leading-relaxed text-body">
                No chat, no payments, no public directory, no social feed. A handbook is meant to
                hold what somebody actually did, not what people liked about it.
              </p>
            </section>
          </div>
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

export default async function Page({ searchParams }: PageProps<"/settings">) {
  return <SettingsBody searchParams={searchParams} />;
}