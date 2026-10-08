import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { KeyRound } from "lucide-react";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { joinByCode, lookupInvite, type JoinFailure } from "@/lib/invites";
import { LIMITS, MAX, tooLong } from "@/lib/limits";
import { rateLimit } from "@/lib/rate-limit";
import Alert from "../../ui/alert";
import { ButtonLink } from "../../ui/button";
import { Card } from "../../ui/card";
import FormFooter from "../../ui/form-footer";
import PageShell from "../../ui/shell";
import SubmitButton from "../../ui/submit-button";
import { TextField } from "../../ui/field";

export const instant = false;

const failures: Record<JoinFailure, string> = {
  empty: "That link is missing its invite code.",
  invalid: "This invite link does not work, or it has expired. Ask whoever shared it for a new one.",
  full: "This circle has taken everyone it was going to.",
};

/**
 * Sets up the trust profile and takes the seat in one go, so an invitee goes from
 * the link to the circle in a single hop. Nothing here redirects to a query
 * string: Next drops that redirect when the page was reached by a client-side
 * navigation, which is exactly how this page is always reached.
 */
async function acceptInvite(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");

  const code = String(formData.get("code") || "");
  const displayName = String(formData.get("display_name") || "").trim();
  const howIShowUp = String(formData.get("how_i_show_up") || "").trim();
  const tag = String(formData.get("region_or_role_tag") || "").trim() || null;

  const invite = await lookupInvite(code);
  if (!invite.ok) redirect(`/circle?join=${invite.reason}`);

  const over =
    tooLong(displayName, MAX.displayName, "The display name") ||
    tooLong(howIShowUp, MAX.howIShowUp, "How I show up") ||
    tooLong(tag ?? "", MAX.regionTag, "The region or role tag");
  if (over || !displayName || !howIShowUp) {
    redirect(`/circle?join=${"empty"}`);
  }

  const quota = await rateLimit("join", uid, LIMITS.joinCircle);
  if (!quota.ok) {
    redirect(`/circle?join=rate&wait=${quota.retryAfterSeconds}`);
  }

  await pool.query(
    `INSERT INTO profiles (user_id, display_name, how_i_show_up, region_or_role_tag)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
       SET display_name = $2, how_i_show_up = $3, region_or_role_tag = $4, changed_at = now()`,
    [uid, displayName, howIShowUp, tag]
  );

  // Membership is decided and written here, in server code, for the signed-in
  // user id from the session. Nothing the browser sent chooses the circle.
  const result = await joinByCode(code, uid);
  revalidatePath("/");
  if (!result.ok) redirect(`/circle?join=${result.reason}`);
  redirect("/circle");
}

/**
 * `connection()` on purpose. Joining is a write, and it must run for a real
 * navigation and nothing else -- without it a prefetch or a link scanner could
 * quietly add someone to a circle they never opened.
 */
async function JoinGate({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  const { code } = await params;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;

  if (!uid) {
    // Nobody signed in: check the link is worth signing up for before sending them off.
    const invite = await lookupInvite(code);
    return <Body code={code} failure={invite.ok ? null : invite.reason} />;
  }

  const profile = await pool.query("SELECT 1 FROM profiles WHERE user_id = $1", [uid]);
  if (!profile.rows[0]) return <Introduce code={code} />;

  const result = await joinByCode(code, uid);
  if (!result.ok) return <Body code={code} failure={result.reason} />;
  redirect("/circle");
}

/** A brand-new account has no trust profile yet. Ask for it here, once. */
function Introduce({ code }: { code: string }) {
  return (
    <Card className="p-5">
      <p aria-hidden="true" className="flex size-10 items-center justify-center rounded-base bg-brick-soft text-brick">
        <KeyRound className="size-5" />
      </p>
      <p className="read-me mt-3 text-ink">
        One more thing before you are in: the short profile your circle reads about you.
      </p>
      <p className="read-me mt-1.5 text-[0.9375rem] text-body">
        It stays inside the circle. Change it any time.
      </p>
      <form action={acceptInvite} className="mt-5 grid gap-5">
        <input type="hidden" name="code" value={code} />
        <TextField
          name="display_name"
          maxLength={MAX.displayName}
          label="Display name"
          hint="The name your circle sees."
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          required
        />
        <TextField
          name="how_i_show_up"
          maxLength={MAX.howIShowUp}
          label="How I show up"
          hint="One line. “I do the Tuesday night call and I’m the one to call after a death.”"
          enterKeyHint="next"
          required
        />
        <TextField
          name="region_or_role_tag"
          maxLength={MAX.regionTag}
          label="Region or role tag"
          hint="Something like “North side” or “the one with the van”."
          enterKeyHint="go"
        />
        <FormFooter flashTo="/" flashMessage="You’re in the circle." inset="-mx-5 px-5">
          <SubmitButton pendingLabel="Joining…">Join the circle</SubmitButton>
        </FormFooter>
      </form>
    </Card>
  );
}

function Body({ code, failure }: { code: string; failure: JoinFailure | null }) {
  if (failure) {
    return (
      <div className="grid gap-5">
        <Alert tone="danger">{failures[failure]}</Alert>
        <Card className="p-5">
          <p className="read-me text-ink">
            If you already have an account, sign in and paste the code on your circle page instead.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <ButtonLink href="/login" variant="secondary" full>
              Sign in
            </ButtonLink>
            <ButtonLink href="/" variant="ghost" full>
              Back to the start
            </ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  const next = `/join/${encodeURIComponent(code)}`;

  return (
    <Card className="p-5">
      <p aria-hidden="true" className="flex size-10 items-center justify-center rounded-base bg-brick-soft text-brick">
        <KeyRound className="size-5" />
      </p>
      <p className="read-me mt-3 text-ink">
        Someone you trust has invited you to a circle on Common Hearth. Create an account and you will
        be in straight away.
      </p>
      <p className="read-me mt-1.5 text-[0.9375rem] text-body">
        The circle&rsquo;s name and everything inside it stay private. Only the people who join can see
        it.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <ButtonLink href={`/signup?next=${encodeURIComponent(next)}`} full>
          Create account and join
        </ButtonLink>
      </div>
      <p className="mt-4 text-sm text-body">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-medium text-brick underline underline-offset-2"
        >
          Sign in
        </Link>{" "}
        &mdash; you will join as soon as you are in.
      </p>
    </Card>
  );
}

function Waiting() {
  return <div aria-busy="true" className="h-40 animate-pulse rounded-base border border-rule bg-card-2" />;
}

export default function Page({ params }: PageProps<"/join/[code]">) {
  return (
    <PageShell
      title="You&rsquo;ve been invited"
      subtitle="One step from a private circle and its handbook."
      width="md"
    >
      <Suspense fallback={<Waiting />}>
        <JoinGate params={params} />
      </Suspense>
    </PageShell>
  );
}