import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
