"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { cx } from "./ui/cx";
import { toast } from "./ui/toast";

async function writeToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  const holder = document.createElement("textarea");
  holder.value = text;
  holder.setAttribute("readonly", "");
  holder.style.position = "fixed";
  holder.style.top = "0";
  holder.style.opacity = "0";
  document.body.appendChild(holder);
  holder.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(holder);
  return copied;
}

const control =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-base border border-rule bg-card px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink-3 hover:bg-card-2";

function neverChanges() {
  return () => {};
}

/**
 * Shares the invite as a link, not as a code to retype. The link carries the code
 * in its path, so opening it either joins you straight away or walks you through
 * signing up first -- see `app/join/[code]/page.tsx`.
 */
export default function ShareInvite({
  link,
  code,
  circleName,
}: {
  link: string;
  code: string;
  circleName: string;
}) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(
    neverChanges,
    () => typeof navigator.share === "function",
    () => false
  );

  async function onCopy() {
    const ok = await writeToClipboard(link);
    if (ok) {
      setCopied(true);
      toast("Invite link copied.", "success");
      window.setTimeout(() => setCopied(false), 2400);
    } else {
      toast("Copy failed — press and hold the link to select it.", "danger");
    }
  }

  async function onShare() {
    try {
      await navigator.share({
        title: `Join ${circleName} on Common Hearth`,
        text: `Join ${circleName} on Common Hearth — open this link to come in:`,
        url: link,
      });
    } catch {
      // Sheet dismissed: nothing to report.
    }
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-base border border-ink/70 bg-card p-3 shadow-[0_0_0_3px_var(--color-card),0_0_0_4px_var(--color-rule)]">
        <p className="flex items-center gap-1.5 text-xs text-body-subtle">
          <Link2 aria-hidden="true" className="size-3.5" />
          Invite link to share
        </p>
        <p className="mt-1.5 break-all text-[0.9375rem] leading-snug font-medium text-ink">
          {link}
        </p>
      </div>

      <div className={cx(canShare && "grid grid-cols-2 gap-2")}>
        <button type="button" onClick={onCopy} className={control}>
          {copied ? (
            <>
              <Check aria-hidden="true" className="size-4 text-pine" />
              Copied
            </>
          ) : (
            <>
              <Link2 aria-hidden="true" className="size-4" />
              Copy link
            </>
          )}
        </button>
        {canShare ? (
          <button type="button" onClick={onShare} className={control}>
            <Share2 aria-hidden="true" className="size-4" />
            Share
          </button>
        ) : null}
      </div>

      <p className="text-sm leading-snug text-body-subtle">
        Reading it out instead? The code is{" "}
        <span className="tabnum font-semibold tracking-[0.12em] text-ink-2 uppercase">{code}</span>.
      </p>
    </div>
  );
}