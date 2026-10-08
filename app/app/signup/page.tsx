import { connection } from "next/server";
import { safeNext } from "@/lib/invites";
import SignUpForm from "./sign-up-form";

export const instant = false;

async function SignUp({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await connection();
  const sp = await searchParams;
  return <SignUpForm next={safeNext(sp?.next)} />;
}

export default function Page({ searchParams }: PageProps<"/signup">) {
  return <SignUp searchParams={searchParams} />;
}