import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cx } from "./cx";

const control =
  "block w-full min-w-0 rounded-base border border-rule bg-card px-3 py-2.5 text-base " +
  "text-ink transition-[border-color,box-shadow] " +
  "placeholder:text-ink-3/70 " +
  "focus:border-brick focus:outline-none focus:ring-2 focus:ring-brick/20 " +
  "aria-invalid:border-brick aria-invalid:ring-brick/20";

type ControlAttrs = {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
};

type ShellProps = {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  required: boolean | undefined;
  children: ReactNode | ((attrs: ControlAttrs) => ReactNode);
};

function FieldShell({ name, label, hint, error, required, children }: ShellProps) {
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[0.8125rem] font-medium text-ink">
        {label}
        {!required ? <span className="font-normal text-body-subtle"> (optional)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm leading-snug text-body-subtle">
          {hint}
        </p>
      ) : null}
      {typeof children === "function"
        ? children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })
        : children}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-brick">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id"> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ name, label, hint, error, className, ...rest }: TextFieldProps) {
  return (
    <FieldShell name={name} label={label} hint={hint} error={error} required={rest.required}>
      {(attrs) => <input name={name} className={cx(control, className)} {...attrs} {...rest} />}
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "id"> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
};

export function TextAreaField({ name, label, hint, error, className, ...rest }: TextAreaFieldProps) {
  return (
    <FieldShell name={name} label={label} hint={hint} error={error} required={rest.required}>
      {(attrs) => (
        <textarea name={name} className={cx(control, "resize-y", className)} {...attrs} {...rest} />
      )}
    </FieldShell>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "name" | "id"> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
};

export function SelectField({ name, label, hint, error, className, children, ...rest }: SelectFieldProps) {
  return (
    <FieldShell name={name} label={label} hint={hint} error={error} required={rest.required}>
      {(attrs) => (
        <select
          name={name}
          className={cx(control, "cursor-pointer pr-10", className)}
          {...attrs}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}
