"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "./toast";

/**
 * Watches the signed-in user's own circles for new notes and says so.
 *
 * Polling, not websockets: this is one small JSON query per tab on a single VM,
 * it survives the phone losing signal, and it needs no extra process. The poll
 * stops while the tab is hidden and while the machine is offline, and it never
 * re-renders anything itself -- it calls `router.refresh()` and lets the server
 * decide what changed.
 */

const POLL_MS = 15_000;

type CircleState = {
  id: string;
  name: string;
  notes: number;
  handoffs: number;
  rev: string | null;
  latestBy: string | null;
  latestTitle: string | null;
  latestAuthor: string | null;
};

type Feed = { me: string | null; circles: CircleState[] };

export default function LiveNotes() {
  const router = useRouter();
  const baseline = useRef<Map<string, CircleState> | null>(null);
  const me = useRef<string | null>(null);

  useEffect(() => {
    let timer = 0;
    let stopped = false;

    async function poll() {
      if (stopped || document.hidden || !navigator.onLine) return;
      try {
        const res = await fetch("/api/circle-feed", {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const feed = (await res.json()) as Feed;
        if (stopped) return;

        me.current = feed.me;
        const previous = baseline.current;
        baseline.current = new Map(feed.circles.map((c) => [c.id, c]));

        // First poll only sets the baseline. A toast for what is already on
        // screen would be noise, not news.
        if (!previous) return;

        let moved = false;
        for (const now of feed.circles) {
          const before = previous.get(now.id);
          if (!before) continue;
          if (before.rev === now.rev && before.notes === now.notes && before.handoffs === now.handoffs) {
            continue;
          }
          moved = true;

          // Only an actual new note from someone else is worth interrupting for.
          // Handoffs landing, or your own note coming back from the server, just
          // refresh quietly.
          if (
            now.notes > before.notes &&
            now.latestAuthor &&
            now.latestAuthor !== me.current &&
            now.latestTitle
          ) {
            toast(`${now.latestBy ?? "Someone"} added “${now.latestTitle}” to ${now.name}.`);
          }
        }

        if (moved) router.refresh();
      } catch {
        // Offline, or the server is briefly unhappy. Try again next tick.
      }
    }

    function tick() {
      timer = window.setTimeout(async () => {
        await poll();
        tick();
      }, POLL_MS);
    }

    const onVisible = () => {
      if (!document.hidden) poll();
    };

    poll();
    tick();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [router]);

  return null;
}