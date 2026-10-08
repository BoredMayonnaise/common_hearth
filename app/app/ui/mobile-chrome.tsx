"use client";

import { useEffect } from "react";

const TEXT_ENTRY = /^(input|textarea|select)$/i;
const NON_KEYBOARD_INPUT = /^(checkbox|radio|button|submit|reset|file|range|color)$/i;

function keyboardInset() {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
}

function isTextEntry(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el || !TEXT_ENTRY.test(el.tagName)) return false;
  if (el.tagName === "INPUT" && NON_KEYBOARD_INPUT.test((el as HTMLInputElement).type)) return false;
  return true;
}

/**
 * Nudges a clipped field back into view once the keyboard has settled. Instant,
 * never animated: a scroll running under the finger swallows the next tap.
 */
function reveal(el: HTMLElement) {
  window.setTimeout(() => {
    const box = el.getBoundingClientRect();
    const floor = window.innerHeight - keyboardInset() - 8;
    if (box.top >= 8 && box.bottom <= floor) return;
    el.scrollIntoView({ block: "center", behavior: "auto" });
  }, 150);
}

export default function MobileChrome() {
  useEffect(() => {
    const html = document.documentElement;
    const small = window.matchMedia("(max-width: 639px)");
    const coarse = window.matchMedia("(pointer: coarse)");
    let editing = false;

    /**
     * The tab bar only leaves while the keyboard is measurably there. Tying it to
     * the keyboard's own animation — not to focus/blur — means it never slides
     * back under a finger that is already on its way to a button.
     */
    const paint = () => {
      const kb = small.matches && editing ? keyboardInset() : 0;
      html.classList.toggle("kb-open", kb > 0);
      html.style.setProperty("--kb-inset", `${kb}px`);
      html.style.setProperty("--bar-inset", kb ? `${kb}px` : "");
    };

    const onFocusIn = (e: FocusEvent) => {
      editing = isTextEntry(e.target);
      if (editing && coarse.matches && small.matches) reveal(e.target as HTMLElement);
      paint();
    };

    const onFocusOut = () => {
      window.setTimeout(() => {
        editing = isTextEntry(document.activeElement);
        paint();
      }, 0);
    };

    const onViewport = () => {
      if (editing) paint();
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    small.addEventListener("change", paint);
    window.visualViewport?.addEventListener("resize", onViewport);
    window.visualViewport?.addEventListener("scroll", onViewport);

    paint();

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      small.removeEventListener("change", paint);
      window.visualViewport?.removeEventListener("resize", onViewport);
      window.visualViewport?.removeEventListener("scroll", onViewport);
      html.classList.remove("kb-open");
      html.style.removeProperty("--kb-inset");
      html.style.removeProperty("--bar-inset");
    };
  }, []);

  return null;
}