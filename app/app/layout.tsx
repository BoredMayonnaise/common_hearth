import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Archivo, Newsreader } from "next/font/google";
import "./globals.css";
import Nav from "./nav";
import MobileChrome from "./ui/mobile-chrome";
import InstallModal from "./ui/install-modal";
import LiveNotes from "./ui/live-notes";
import { Toaster } from "./ui/toast";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Common Hearth",
  description: "Private care handbooks with trust profiles; public app, private circles.",
  icons: {
    icon: "/icons/192x192.png",
    shortcut: "/icons/192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e2e5dc",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${newsreader.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" type="image/png" href="/icons/192x192.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/icons/manifest.json" />
      </head>
      <body>
        <Link
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-base focus:bg-brick focus:px-4 focus:py-2.5 focus:text-base focus:text-card focus:no-underline"
        >
          Skip to content
        </Link>
        <Suspense fallback={<div className="h-14 border-b border-rule bg-card" />}>
          <Nav />
        </Suspense>
        {children}
        <MobileChrome />
        <InstallModal />
        <LiveNotes />
        <Toaster />
      </body>
    </html>
  );
}
