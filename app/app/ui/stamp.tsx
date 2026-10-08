import type { ReactNode } from "react";
import { cx } from "./cx";

export function Stamp({ code, label }: { code: string; label: string }) {
  return (
    <div className="rounded-base border border-ink/70 bg-card p-3 shadow-[0_0_0_3px_var(--color-card),0_0_0_4px_var(--color-rule)]">
      <p className="text-center text-xs text-body-subtle">{label}</p>
      <p
        className={cx(
          "tabnum mt-1.5 text-center font-semibold tracking-[0.22em] text-ink",
          "text-[1.375rem] leading-none"
        )}
      >
        {code}
      </p>
    </div>
  );
}

export function Roster({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul
      className={cx(
        "divide-y divide-rule-soft rounded-base border border-rule bg-card-2",
        className
      )}
    >
      {children}
    </ul>
  );
}

export function RosterEntry({
  name,
  tag,
  line,
}: {
  name: string;
  tag?: string | null;
  line: string;
}) {
  return (
    <li className="px-4 py-3">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="read-me text-[1.0625rem] leading-snug text-ink">{name}</span>
        {tag ? <span className="text-xs text-body-subtle">{tag}</span> : null}
      </p>
      <p className="read-me mt-0.5 text-[0.9375rem] leading-snug text-body">{line}</p>
    </li>
  );
}
