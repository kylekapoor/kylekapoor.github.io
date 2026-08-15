/**
 * Base path for static hosting under a subdirectory.
 *
 * On Vercel (or any Node host) the site lives at the domain root and
 * this is "". On GitHub Pages it depends on the repo:
 *
 *   kylekapoor/kylekapoor.github.io  →  kylekapoor.github.io/       → ""
 *   kylekapoor/kk-portfolio          →  kylekapoor.github.io/kk-portfolio
 *                                        → NEXT_PUBLIC_BASE_PATH=/kk-portfolio
 *
 * Next rewrites its own asset URLs (the /_next/* bundles, CSS, fonts)
 * from `basePath` in next.config.ts automatically, and <Link> hrefs too.
 * What it does NOT rewrite is a hand-written `<img src="/logos/x.png">`
 * — those are opaque strings to the compiler. Every such path in this
 * codebase goes through asset() below so the deploy target stays a
 * one-variable decision instead of a find-and-replace.
 *
 * Read at build time (NEXT_PUBLIC_ is inlined into the bundle), so
 * changing it means rebuilding — which is exactly what the Pages
 * workflow does on every push.
 */

/**
 * True when this bundle was built for a static host with no /api routes.
 *
 * Set by `npm run build:static` and by the Pages workflow. NEXT_PUBLIC_
 * variables are inlined at build time, so this is a constant in the
 * shipped bundle rather than a runtime check.
 */
export const IS_STATIC_BUILD = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Normalised: either "" or "/something" with no trailing slash. */
export const BASE_PATH = raw === "/" ? "" : raw.replace(/\/$/, "");

/**
 * Prefix a root-relative public asset path with the base path.
 *
 * Pass paths exactly as they're written in lib/profile.ts ("/logos/x.png").
 * Absolute URLs and data URIs are returned untouched, so it's safe to
 * call on a value that might already be external.
 */
export function asset(path: string): string {
  if (!BASE_PATH) return path;
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  return `${BASE_PATH}${path.startsWith("/") ? "" : "/"}${path}`;
}
