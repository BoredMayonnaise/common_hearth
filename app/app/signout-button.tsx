"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sky-700 underline"
      type="button"
    >
      Sign out
    </button>
  );
}
