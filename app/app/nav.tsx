import { getServerSession } from "next-auth";
import { connection } from "next/server";
import { authOptions } from "@/lib/auth";
import { BottomBar, TopBar } from "./site-nav";

export default async function Nav() {
  await connection();
  const session = await getServerSession(authOptions);
  const signedIn = Boolean((session?.user as { id?: string } | undefined)?.id);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur-sm">
        <TopBar signedIn={signedIn} />
      </header>
      {signedIn ? <BottomBar /> : null}
    </>
  );
}
