import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "./cx";

export type Variant = "primary" | "secondary" | "ghost" | "danger";
export type Size = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-base font-medium no-underline " +
  "transition-colors duration-100 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-brick text-card hover:bg-brick-dark",
  secondary: "border border-rule bg-card text-ink hover:border-ink-3 hover:bg-card-2",
  ghost: "text-ink-2 hover:bg-card-2 hover:text-ink",
  danger: "border border-brick/40 bg-card text-brick hover:bg-brick-soft",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-3.5 text-sm sm:min-h-8 sm:px-3",
  md: "min-h-11 px-4 text-[0.9375rem]",
  lg: "min-h-12 px-5 text-base",
};

type SharedProps = {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  className?: string;
  children: ReactNode;
};

export function buttonClass({
  variant = "primary",
  size = "md",
  full = false,
  className,
}: Omit<SharedProps, "children"> = {}) {
  return cx(base, variants[variant], sizes[size], full && "w-full sm:w-auto", className);
}

type ButtonRest = Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;
type LinkRest = Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children">;

export default function Button({
  variant,
  size,
  full,
  className,
  children,
  type = "button",
  ...rest
}: SharedProps & ButtonRest) {
  return (
    <button type={type} className={buttonClass({ variant, size, full, className })} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  full,
  className,
  children,
  ...rest
}: SharedProps & LinkRest) {
  return (
    <Link className={buttonClass({ variant, size, full, className })} {...rest}>
      {children}
    </Link>
  );
}
