"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Check, CircleAlert, Info } from "lucide-react";
import { cx } from "./cx";

type Tone = "neutral" | "success" | "danger";

type ToastItem = { id: number; message: string; tone: Tone };

const EMPTY: ToastItem[] = [];

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function set(next: ToastItem[]) {
  items = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return items;
}

function getServerSnapshot() {
  return EMPTY;
}

export function toast(message: string, tone: Tone = "neutral") {
  const last = items[items.length - 1];
  if (last && last.message === message && last.tone === tone) return;
  const id = ++seq;
  set([...items, { id, message, tone }]);
  window.setTimeout(() => set(items.filter((t) => t.id !== id)), 2800);
}

const icons: Record<Tone, typeof Check> = {
  neutral: Info,
  success: Check,
  danger: CircleAlert,
};

const accents: Record<Tone, string> = {
  neutral: "text-ink-3",
  success: "text-pine",
  danger: "text-brick",
};

export function Toaster() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (list.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col-reverse items-center gap-2 px-4 pb-[calc(var(--bar-inset)+0.75rem)] sm:items-end sm:pr-6 sm:pb-6"
    >
      {list.map((t) => {
        const Icon = icons[t.tone];
        return (
          <p
            key={t.id}
            role="status"
            className="pointer-events-auto flex max-w-sm animate-[toast-in_160ms_ease-out] items-start gap-2 rounded-base border border-ink/15 bg-card px-3 py-2.5 text-sm text-ink shadow-[0_6px_20px_rgba(38,42,36,0.18)]"
          >
            <Icon aria-hidden="true" className={cx("mt-px size-4 shrink-0", accents[t.tone])} />
            <span className="read-me leading-snug">{t.message}</span>
          </p>
        );
      })}
    </div>
  );
}

const FLASH_PREFIX = "hearth:flash:";
const FLASH_TTL = 60_000;

type Flash = { message: string; tone: Tone; at: number };

/** Queues a toast for the page a redirect lands on. Ignored if it is not read quickly. */
export function flashAfterRedirect(path: string, message: string, tone: Tone = "success") {
  try {
    const payload: Flash = { message, tone, at: Date.now() };
    sessionStorage.setItem(FLASH_PREFIX + path, JSON.stringify(payload));
  } catch {
    // Storage blocked: the redirect still happens, the toast is just skipped.
  }
}

export function ConsumeFlash({ path }: { path: string }) {
  useEffect(() => {
    const key = FLASH_PREFIX + path;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(key);
      if (raw) sessionStorage.removeItem(key);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const flash = JSON.parse(raw) as Flash;
      if (Date.now() - flash.at > FLASH_TTL) return;
      toast(flash.message, flash.tone);
    } catch {
      // Ignore anything unreadable.
    }
  }, [path]);
  return null;
}