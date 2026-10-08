"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Share, Smartphone, X } from "lucide-react";
import Button from "./button";
import { toast } from "./toast";

/**
 * Install sheet. Chromium fires `beforeinstallprompt` once the app is
 * installable, and `prompt()` on the stashed event opens the real system install
 * dialog -- the only way to install without hunting through the browser menu.
 * Safari on iOS fires no such event and offers no scriptable equivalent, so
 * there the sheet can only point at the Share button.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "hearth:install-dismissed";
const DISMISSED_TTL = 30 * 24 * 60 * 60 * 1000;
const SW_URL = "/sw.js";
/** Let the page settle before an install sheet drops on top of it. */
const SHOW_DELAY = 1200;
const INSTALLED_MESSAGE = "Installed — Common Hearth now opens from your home screen.";

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISSED_TTL;
  } catch {
    // Storage blocked (private mode, blocked cookies): better to ask than to hide.
    return false;
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // Nothing to do -- the sheet simply offers itself again next visit.
  }
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function InstallModal() {
  const [open, setOpen] = useState(false);
  const [native, setNative] = useState(false);
  const [busy, setBusy] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const timer = useRef(0);

  const close = useCallback(() => {
    setOpen(false);
    restoreFocus.current?.focus();
    restoreFocus.current = null;
  }, []);

  const reveal = useCallback((withNativePrompt: boolean) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => {
        setNative(withNativePrompt);
        setOpen(true);
      },
      withNativePrompt ? SHOW_DELAY : 0
    );
  }, []);

  useEffect(() => {
    if (isInstalled() || dismissedRecently()) return;

    let cancelled = false;

    const onBeforeInstall = (event: Event) => {
      // Chrome offers the event once. Hold on to it.
      event.preventDefault();
      deferred.current = event as BeforeInstallPromptEvent;
      if (!cancelled) reveal(true);
    };

    const onInstalled = () => {
      deferred.current = null;
      setOpen(false);
      toast(INSTALLED_MESSAGE, "success");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Chromium holds `beforeinstallprompt` back until a service worker is in
    // control of the page. Registering it is what makes the event arrive.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(SW_URL, { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // No service worker, no install dialog. The site itself is unaffected.
        });
    }

    // iOS will never fire the event, so its path goes up straight away.
    if (isIOS()) reveal(false);

    return () => {
      cancelled = true;
      window.clearTimeout(timer.current);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [reveal]);

  // Hold focus inside the sheet while it is up; Escape closes it.
  useEffect(() => {
    if (!open) return;

    restoreFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const node = dialog.current;
    node?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !node) return;

      const stops = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled")
      );
      if (stops.length === 0) return;

      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !node.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // Hold the page still behind the sheet.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const install = useCallback(async () => {
    const event = deferred.current;
    if (!event) return;
    setBusy(true);
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      deferred.current = null;
      if (outcome === "dismissed") {
        rememberDismissed();
      } else {
        // `appinstalled` normally gets here first and toasts the same line; toast()
        // collapses an identical repeat, so this only shows if it never arrived.
        toast(INSTALLED_MESSAGE, "success");
      }
      close();
    } catch {
      toast("Could not open the install dialog. Try again from the browser menu.", "danger");
    } finally {
      setBusy(false);
    }
  }, [close]);

  const dismiss = useCallback(() => {
    rememberDismissed();
    close();
  }, [close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-[var(--bar-inset)] sm:items-center sm:p-6">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={dismiss}
        className="absolute inset-0 -z-10 cursor-default bg-ink/45"
      />

      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        aria-describedby="install-body"
        className="animate-[toast-in_180ms_ease-out] w-full max-w-md rounded-t-lg border border-rule border-b-0 bg-card px-5 pb-5 pt-4 shadow-[0_-8px_32px_rgba(38,42,36,0.22)] sm:rounded-base sm:border-b sm:pb-5 sm:shadow-[0_18px_48px_rgba(38,42,36,0.28)]"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-9 flex-none items-center justify-center rounded-base bg-brick-soft text-brick"
          >
            <Smartphone className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="install-title" className="read-me text-[1.0625rem] leading-snug text-ink">
              Add Common Hearth to your home screen
            </h2>
            <p id="install-body" className="read-me mt-1 text-[0.9375rem] text-body">
              {native
                ? "It opens full screen, lands straight on your circle, and keeps working on a patchy signal."
                : "It opens full screen and keeps working on a patchy signal."}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Not now"
            className="-mr-2 -mt-2.5 flex size-11 flex-none items-center justify-center rounded-base text-ink-3 transition-colors hover:bg-card-2 hover:text-ink"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {native ? (
          <div className="mt-4 flex flex-col-reverse gap-2 min-[420px]:flex-row">
            <Button variant="secondary" onClick={dismiss} full className="sm:w-auto">
              Not now
            </Button>
            <Button onClick={install} disabled={busy} full data-autofocus className="sm:w-auto">
              {busy ? "Installing…" : "Install app"}
            </Button>
          </div>
        ) : (
<div className="mt-4 flex flex-col gap-2.5">
              <p className="read-me flex items-start gap-2 text-[0.9375rem] text-body">
                <Share aria-hidden="true" className="mt-1 size-4 flex-none text-ink-3" />
                <span>
                  Tap the Share button, then{" "}
                  <strong className="font-medium text-ink">Add to Home Screen</strong>.
                </span>
              </p>
              <Button variant="secondary" onClick={dismiss} full data-autofocus className="sm:w-auto">
                Got it
              </Button>
            </div>
        )}
      </div>
    </div>
  );
}