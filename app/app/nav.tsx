import { getServerSession } from "next-auth";
import { connection } from "next/server";
import { authOptions } from "@/lib/auth";
import SignOutButton from "./signout-button";
import { Home, Users, NotebookPen, UserRound, LogIn, UserPlus } from "lucide-react";

export default async function Nav() {
  await connection();
  const session = await getServerSession(authOptions);
  const signedIn = Boolean((session?.user as { id?: string } | undefined)?.id);
  return (
    <header className="border-b border-stone-200 bg-white/70">
      <nav className="mx-auto flex max-w-2xl items-center gap-4 p-4 text-sm">
        <a className="font-semibold hover:underline flex items-center gap-1" href="/">
          <Home size={16} /> Common Hearth
        </a>
        {signedIn ? (
          <>
            <a className="hover:underline flex items-center gap-1" href="/circle"><Users size={16} /> Circle</a>
            <a className="hover:underline flex items-center gap-1" href="/notes"><NotebookPen size={16} /> Notes</a>
            <a className="hover:underline flex items-center gap-1" href="/profile"><UserRound size={16} /> Profile</a>
            <span className="ml-auto"><SignOutButton /></span>
          </>
        ) : (
          <span className="ml-auto flex gap-4">
            <a className="hover:underline flex items-center gap-1" href="/login"><LogIn size={16} /> Sign in</a>
            <a className="hover:underline flex items-center gap-1" href="/signup"><UserPlus size={16} /> Create account</a>
          </span>
        )}
      </nav>
    </header>
  );
}
