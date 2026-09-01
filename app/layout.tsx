import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { IS_STATIC_BUILD, asset } from "@/lib/basePath";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");


/** Bump when the icon artwork changes — see `icons` below. */
const ICON_VERSION = "3";

const TITLE = "Kyle Kapoor";
const DESCRIPTION =
  "Kyle Kapoor's portfolio, rendered as a journal floating in space. Ask anything.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // `default` (rather than a bare string) so the root tab reads exactly
  // "Kyle Kapoor" while the deep-linked routes keep their own titles.
  title: {
    default: TITLE,
    template: "%s",
  },
  description: DESCRIPTION,
  applicationName: TITLE,
  authors: [{ name: "Kyle Kapoor" }],
  creator: "Kyle Kapoor",
  manifest: asset("/manifest.webmanifest"),
  icons: {
    // SVG first for browsers that take it (it stays crisp at any tab
    // size); app/favicon.ico is picked up automatically by Next as the
    // fallback, and carries its own 16/32/48 renders.
    //
    // ?v= is a cache-buster, and it is not optional. Browsers cache
    // favicons far more aggressively than any other asset — Safari keeps
    // them in a separate store that a hard reload doesn't touch — so
    // changing the file alone leaves the old icon on screen for days.
    // The query makes it a new URL. Bump ICON_VERSION whenever the
    // artwork changes.
    icon: [
      { url: asset(`/favicon.svg?v=${ICON_VERSION}`), type: "image/svg+xml" },
      { url: asset(`/favicon.ico?v=${ICON_VERSION}`), sizes: "16x16 32x32 48x48" },
    ],
    // iOS ignores SVG for home-screen shortcuts — it needs a PNG.
    apple: asset(`/apple-touch-icon.png?v=${ICON_VERSION}`),
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: TITLE,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  // The site is dark in both system themes — there's no light variant to
  // fall back to, so both media entries point at the same near-black.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "rgb(13 14 20)" },
    { media: "(prefers-color-scheme: dark)", color: "rgb(13 14 20)" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Both of these fetch their script from /_vercel/*, which only
            exists on Vercel. On the static Pages build they'd be two
            guaranteed 404s in the console and nothing else. */}
        {!IS_STATIC_BUILD && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
