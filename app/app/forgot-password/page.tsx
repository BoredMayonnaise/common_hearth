import { connection } from "next/server";
import { safeNext } from "@/lib/invites";
import ForgotPasswordForm from "./forgot-password-form";

export const instant = false;

async function ForgotPassword({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await connection();
  const sp = await searchParams;
  return <ForgotPasswordForm next={safeNext(sp?.next)} />;
}

export default function Page({ searchParams }: PageProps<"/forgot-password">) {
  return <ForgotPassword searchParams={searchParams} />;
}
