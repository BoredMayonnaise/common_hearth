"use client";

import type { ReactNode } from "react";
import { cx } from "./cx";
import { flashAfterRedirect } from "./toast";

/**
 * Mobile: pins the form's submit row to the bottom of the screen — above the tab
 * bar, or above the keyboard when a field has focus. Desktop: a plain static row.
 * The button itself is untouched, so there is still only one submit control.
 */
export default function FormFooter({
  flashTo,
  flashMessage,
  sticky = true,
  inset = "-mx-4 px-4",
  className,
  children,
}: {
  /** Page the submit redirects to, and the toast to show once it gets there. */
  flashTo?: string;
  flashMessage?: string;
  sticky?: boolean;
  /** Cancel-out classes so the strip lines up with the Card padding it sits in. */
  inset?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      onClickCapture={
        flashTo && flashMessage ? () => flashAfterRedirect(flashTo, flashMessage) : undefined
      }
      className={cx(
        "z-30 border-t border-rule bg-card/97 py-2.5 backdrop-blur-sm",
        "sm:border-t-0 sm:bg-transparent sm:py-0 sm:backdrop-blur-none",
        sticky ? "sticky bottom-[var(--bar-inset)] sm:static" : "static",
        inset,
        className
      )}
    >
      {children}
    </div>
  );
}