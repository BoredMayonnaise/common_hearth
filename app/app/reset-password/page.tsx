import { connection } from "next/server";
import ResetPasswordForm from "./reset-password-form";

export const instant = false;

async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  await connection();
  const sp = await searchParams;
  return <ResetPasswordForm token={sp?.token ?? ""} />;
}

export default function Page({ searchParams }: PageProps<"/reset-password">) {
  return <ResetPassword searchParams={searchParams} />;
}
