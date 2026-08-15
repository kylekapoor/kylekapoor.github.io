import type { NextConfig } from "next";

/**
 * Two build targets from one codebase.
 *
 * Default (`npm run build`) — a normal Next server build. /api/chat
 * exists, so the chat can be pointed at Claude, OpenAI, GitHub Models or
 * Ollama by setting LLM_PROVIDER, and requests get Upstash rate limiting
 * and logging. This is what Vercel deploys.
 *
 * Static (`npm run build:static`) — a fully static `out/` directory for
 * GitHub Pages, which serves files and cannot run a server. The chat
 * still works: its default provider never needed one (see
 * lib/chat/staticTransport). What's dropped is the API route, and with
 * it the option of a model-backed provider.
 */
const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

/** "" at a domain root, "/kk-portfolio" under a project-pages subpath. */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Ensure the markdown corpus files are bundled into the /api/chat
  // serverless function on Vercel. Without this, fs.readFileSync()
  // at request time would fail to find the files.
  outputFileTracingIncludes: {
    "/api/chat": ["./content/corpus/**/*"],
  },

  ...(isStatic
    ? {
        output: "export" as const,

        // `output: "export"` refuses to build a POST route handler —
        // correctly, since there'd be nothing to run it. app/api is moved
        // out of the tree for the duration of the build and put back
        // afterwards; scripts/build-static.mjs owns that, which is why
        // the static build has its own npm script rather than just an
        // environment variable.

        // Emit out/about/index.html rather than out/about.html. Both work
        // on Pages, but directory-style URLs survive being served from a
        // subpath and keep relative links honest.
        trailingSlash: true,

        // No image optimiser on a static host; next/image isn't used
        // here, but this keeps the door open without a build failure.
        images: { unoptimized: true },

        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
      }
    : {}),
};

export default nextConfig;
