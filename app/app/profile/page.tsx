import Link from "next/link";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { MAX, tooLong } from "@/lib/limits";
import Alert from "../ui/alert";
import { Card } from "../ui/card";
import FormFooter from "../ui/form-footer";
import PageShell from "../ui/shell";
import SubmitButton from "../ui/submit-button";
import { TextField } from "../ui/field";

async function saveProfile(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const displayName = String(formData.get("display_name") || "").trim();
  const howIShowUp = String(formData.get("how_i_show_up") || "").trim();
  const tag = String(formData.get("region_or_role_tag") || "").trim() || null;
  const over =
    tooLong(displayName, MAX.displayName, "The display name") ||
    tooLong(howIShowUp, MAX.howIShowUp, "How I show up") ||
    tooLong(tag ?? "", MAX.regionTag, "The region or role tag");
  if (over) redirect(`/profile?error=${encodeURIComponent(over)}`);
  if (!displayName || !howIShowUp) redirect("/profile?error=1");
  await pool.query(
    `INSERT INTO profiles (user_id, display_name, how_i_show_up, region_or_role_tag)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET display_name = $2, how_i_show_up = $3, region_or_role_tag = $4, changed_at = now()`,
    [uid, displayName, howIShowUp, tag]
  );
  revalidatePath("/");
  redirect("/");
}

export const instant = false;

async function ProfileBody({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");
  const res = await pool.query(
    "SELECT display_name, how_i_show_up, region_or_role_tag FROM profiles WHERE user_id = $1",
    [uid]
  );
  const p = res.rows[0];

  return (
    <PageShell
      title={p ? "Your trust profile" : "Set up your trust profile"}
      subtitle="Only people inside your circle see this. Keep it short and honest."
      width="md"
    >
      {sp?.error ? (
        <Alert tone="danger" className="mb-5">
          {sp?.error === "1"
            ? "Add a display name and a line on how you show up."
            : sp?.error}
        </Alert>
      ) : null}
      <Card className="p-5">
        <form action={saveProfile} className="grid gap-5">
          <TextField
            name="display_name"
            maxLength={MAX.displayName}
            label="Display name"
            hint="The name your circle sees."
            defaultValue={p?.display_name ?? ""}
            required
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
          />
          <TextField
            name="how_i_show_up"
            maxLength={MAX.howIShowUp}
            label="How I show up"
            hint="One line. “I do the Tuesday night call and I'm the one to call after a death.”"
            defaultValue={p?.how_i_show_up ?? ""}
            enterKeyHint="next"
            required
          />
          <TextField
            name="region_or_role_tag"
            maxLength={MAX.regionTag}
            label="Region or role tag"
            hint="Something like “North side” or “the one with the van”."
            defaultValue={p?.region_or_role_tag ?? ""}
            enterKeyHint="go"
          />
          <FormFooter flashTo="/" flashMessage="Trust profile saved." inset="-mx-5 px-5">
            <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
          </FormFooter>
        </form>
      </Card>
      <p className="mt-5 text-sm text-body">
        <Link href="/" className="text-brick underline underline-offset-2">
          Back home
        </Link>
      </p>
    </PageShell>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <ProfileBody searchParams={searchParams} />;
}
