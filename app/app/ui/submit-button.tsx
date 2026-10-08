"use client";

import { useFormStatus } from "react-dom";
import Button from "./button";
import type { Size, Variant } from "./button";
import Spinner from "./spinner";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  pendingLabel?: string;
  pending?: boolean;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  className?: string;
};

export default function SubmitButton({
  children,
  pendingLabel = "Saving…",
  pending,
  variant = "primary",
  size = "md",
  full = true,
  className,
}: Props) {
  const status = useFormStatus();
  const busy = pending ?? status.pending;
  return (
    <Button type="submit" variant={variant} size={size} full={full} disabled={busy} className={className}>
      {busy ? (
        <>
          <Spinner />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
