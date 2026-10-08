"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { cx } from "./ui/cx";

/** Replaces the old sign-out control in the top bar. Signing out lives in Settings. */
export function SettingsButton({ active }: { active?: boolean }) {
  return (
    <Link
      href="/settings"
      aria-current={active ? "page" : undefined}
      className={cx(
        "inline-flex min-h-11 items-center gap-1.5 rounded-base px-2.5 py-2 text-sm font-medium no-underline transition-colors",
        active ? "bg-card-2 text-ink" : "text-body hover:bg-card-2 hover:text-ink"
      )}
    >
      <Settings aria-hidden="true" className="size-4" />
      Settings
    </Link>
  );
}
