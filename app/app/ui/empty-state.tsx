import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./cx";

export default function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("rounded-base border border-rule bg-card px-5 py-8", className)}>
      <Icon aria-hidden="true" className="size-5 text-ink-3" />
      <p className="read-me mt-3 text-lg text-ink">{title}</p>
      {children ? (
        <div className="read-me mx-auto mt-1 max-w-prose text-[0.9375rem] text-body">{children}</div>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
