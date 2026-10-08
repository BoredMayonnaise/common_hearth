import type { ReactNode } from "react";
import { cx } from "./cx";

const widths = {
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

export default function PageShell({
  title,
  subtitle,
  meta,
  actions,
  width = "lg",
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  width?: keyof typeof widths;
  children: ReactNode;
}) {
  return (
    <main id="main" className={cx("mx-auto w-full safe-x sm:px-8", widths[width])}>
      <div className="clear-tabbar py-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-3 border-b border-ink pb-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            {meta ? <div className="mb-1.5">{meta}</div> : null}
            <h1 className="read-me text-[1.75rem] leading-tight font-normal tracking-tight text-ink sm:text-[2rem]">
              {title}
            </h1>
            {subtitle ? (
              <div className="read-me mt-1.5 max-w-prose text-[0.9375rem] text-body">{subtitle}</div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-col gap-2 min-[420px]:flex-row">{actions}</div>
          ) : null}
        </div>
        {children}
      </div>
    </main>
  );
}
