import type { ReactNode } from "react";
import { cx } from "./cx";

type Tone = "neutral" | "brick" | "pine" | "warning";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-3",
  brick: "bg-brick",
  pine: "bg-pine",
  warning: "bg-brick",
};

export default function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cx("inline-flex max-w-full items-center gap-1.5 text-xs text-ink-2", className)}>
      <span aria-hidden="true" className={cx("size-1.5 shrink-0 rounded-[1px]", tones[tone])} />
      <span className="truncate">{children}</span>
    </span>
  );
}
