"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, NotebookPen, UserRound, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SettingsButton } from "./settings-button";
import { cx } from "./ui/cx";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const items: NavItem[] = [
  { href: "/", label: "Home", icon: House, exact: true },
  { href: "/circle", label: "Circle", icon: Users },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function TopBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex w-full max-w-4xl items-center gap-3 safe-x sm:gap-5 sm:px-6">
      <Link
        href="/"
        className="flex min-w-0 items-center gap-2 py-3 text-[0.9375rem] font-semibold tracking-tight text-ink no-underline"
      >
        <img
          src="/logo-mark-64x64.png"
          alt=""
          className="inline h-[1.125rem] w-auto flex-shrink-0"
          width={18}
          height={18}
        />
        <span className="truncate">Common Hearth</span>
      </Link>

      {signedIn ? (
        <>
          <ul className="ml-1 hidden items-center gap-1 sm:flex">
            {items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "relative inline-flex items-center gap-1.5 rounded-base px-2.5 py-2 text-sm no-underline transition-colors",
                      active ? "text-ink" : "text-body hover:bg-card-2 hover:text-ink"
                    )}
                  >
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-2.5 -bottom-[13px] h-0.5 bg-brick"
                      />
                    ) : null}
                    <item.icon aria-hidden="true" className="size-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="ml-auto shrink-0">
            <SettingsButton active={pathname.startsWith("/settings")} />
          </div>
        </>
      ) : (
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Link
            href="/login"
            className="inline-flex min-h-9 items-center rounded-base px-2.5 py-2 text-sm font-medium text-body no-underline transition-colors hover:bg-card-2 hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-9 items-center rounded-base bg-brick px-3 py-2 text-sm font-medium text-card no-underline transition-colors hover:bg-brick-dark max-sm:hidden"
          >
            Create account
          </Link>
        </div>
      )}
    </div>
  );
}

export function BottomBar() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = Math.max(0, window.scrollY);
        const delta = y - last;
        if (Math.abs(delta) < 5) return;
        last = y;
        setHidden(delta > 0 && y > 120);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav
      aria-label="Primary"
      data-tabbar=""
      aria-hidden={hidden ? true : undefined}
      onFocusCapture={() => setHidden(false)}
      className={cx(
        "fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-card/97 backdrop-blur-sm sm:hidden",
        "transition-[transform,opacity] duration-200 ease-out",
        hidden && "translate-y-full opacity-0"
      )}
    >
      <ul className="tabbar-inset mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex min-h-13 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs no-underline transition-colors",
                  active ? "font-medium text-ink" : "text-body-subtle"
                )}
              >
                {active ? (
                  <span aria-hidden="true" className="absolute inset-x-3 top-0 h-0.5 bg-brick" />
                ) : null}
                <item.icon aria-hidden="true" className="size-[1.125rem]" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
