"use client";

import { signOut } from "next-auth/react";
import { LogOut, type LucideIcon } from "lucide-react";
import { cx } from "./ui/cx";

const NAV =
  "inline-flex min-h-11 items-center gap-1.5 rounded-base px-2.5 py-2 text-sm font-medium text-body transition-colors hover:bg-card-2 hover:text-ink";
const DANGER =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-base border border-brick/40 bg-card px-3 py-2.5 text-sm font-medium text-brick transition-colors hover:bg-brick-soft";

export default function SignOutButton({
  variant = "nav",
  icon: Icon = LogOut,
  children = "Sign out",
  onDone,
}: {
  variant?: "nav" | "danger";
  icon?: LucideIcon;
  children?: React.ReactNode;
  onDone?: () => void;
}) {
  return (
    <button
      onClick={() => {
        onDone?.();
        signOut({ callbackUrl: "/" });
      }}
      className={cx(variant === "danger" ? DANGER : NAV)}
      type="button"
    >
      <Icon aria-hidden="true" className="size-4" />
      {children}
    </button>
  );
}