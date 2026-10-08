import type { ReactNode } from "react";
import { cx } from "./cx";

type Tone = "danger" | "warning" | "info" | "success";

const tones: Record<Tone, { edge: string; text: string }> = {
  danger: { edge: "border-l-brick", text: "text-brick" },
  warning: { edge: "border-l-warning", text: "text-fg-warning" },
  info: { edge: "border-l-ink-3", text: "text-ink-2" },
  success: { edge: "border-l-pine", text: "text-pine" },
};

export default function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { edge, text } = tones[tone];
  const role = tone === "danger" || tone === "warning" ? "alert" : "status";
  return (
    <div
      role={role}
      className={cx("border-l-2 border-y border-r border-rule bg-card px-4 py-3", edge, className)}
    >
      {title ? (
        <p className={cx("text-sm font-semibold", text)}>
          {title}
          {children ? <span className="sr-only">:</span> : null}
        </p>
      ) : null}
      {children ? (
        <div
          className={cx(
            "read-me text-[0.9375rem] prose-note",
            title ? "mt-0.5 text-ink-2" : "text-ink"
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
