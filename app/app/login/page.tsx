import { connection } from "next/server";
import { safeNext } from "@/lib/invites";
import SignInForm from "./sign-in-form";

export const instant = false;

async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; changed?: string }>;
}) {
  await connection();
  const sp = await searchParams;
  return <SignInForm next={safeNext(sp?.next)} changed={Boolean(sp?.changed)} />;
}

export default function Page({ searchParams }: PageProps<"/login">) {
  return <SignIn searchParams={searchParams} />;
}