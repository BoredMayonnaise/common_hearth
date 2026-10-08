import type { ReactNode } from "react";
import { cx } from "./cx";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("rounded-base border border-rule bg-card", className)}>{children}</div>
  );
}

function Punches() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-2 top-4 flex flex-col gap-9"
    >
      <span className="size-2 rounded-full bg-rule/80 ring-1 ring-inset ring-ink/10" />
      <span className="size-2 rounded-full bg-rule/80 ring-1 ring-inset ring-ink/10" />
    </span>
  );
}

export function IndexCard({
  className,
  bodyClassName,
  children,
}: {
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "relative rounded-base border border-rule border-t-2 border-t-brick bg-card",
        className
      )}
    >
      <Punches />
      <div className={cx("py-4 pr-4 pl-9", bodyClassName)}>{children}</div>
    </div>
  );
}

export function Ledger({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-base border border-rule bg-card-2 px-4 py-3",
        "shadow-[inset_0_0_0_1px_var(--color-card)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeading({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-body">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Fieldset({
  legend,
  description,
  children,
}: {
  legend: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="grid gap-4">
      <div className="border-b border-rule pb-1.5">
        <legend className="text-[0.8125rem] font-semibold tracking-[0.04em] text-ink">
          {legend}
        </legend>
        {description ? <p className="mt-0.5 text-sm text-body-subtle">{description}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}
