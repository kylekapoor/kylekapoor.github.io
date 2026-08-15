#!/usr/bin/env node
/**
 * Build the fully static `out/` directory for GitHub Pages.
 *
 *   npm run build:static
 *   NEXT_PUBLIC_BASE_PATH=/kk-portfolio npm run build:static   # subpath
 *
 * Next's `output: "export"` refuses to build a POST route handler,
 * which is correct — a static host has nothing to run it on. The chat
 * doesn't need it (see lib/chat/staticTransport), but the file still
 * has to be out of the tree while the exporter walks app/, so this
 * moves app/api aside and puts it back afterwards.
 *
 * The restore runs in a `finally` and on SIGINT/SIGTERM, so a failed or
 * interrupted build leaves the working tree exactly as it found it. If
 * something truly catastrophic happens, app/api is sitting in
 * `.static-build-backup/` — move it back by hand, nothing is deleted.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "app", "api");
const stash = path.join(root, ".static-build-backup", "api");

let moved = false;

function hide() {
  if (!fs.existsSync(apiDir)) return;
  fs.mkdirSync(path.dirname(stash), { recursive: true });
  if (fs.existsSync(stash)) {
    throw new Error(
      `${stash} already exists — a previous build was interrupted. ` +
        `Move it back to app/api before rebuilding.`
    );
  }
  fs.renameSync(apiDir, stash);
  moved = true;
  console.log("[build:static] app/api moved aside for the export");
}

function restore() {
  if (!moved) return;
  moved = false;
  fs.renameSync(stash, apiDir);
  fs.rmSync(path.dirname(stash), { recursive: true, force: true });
  console.log("[build:static] app/api restored");
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    restore();
    process.exit(1);
  });
}

try {
  hide();
  const result = spawnSync("npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_STATIC_EXPORT: "1" },
  });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
  restore();
}

if (process.exitCode) process.exit(process.exitCode);

// GitHub Pages' legacy branch-based publishing runs Jekyll, which skips
// any directory starting with an underscore — that would silently drop
// every file in _next/, i.e. the entire app. The Actions-based flow this
// repo uses doesn't run Jekyll at all, but the marker costs one empty
// file and makes the output safe to publish either way.
const out = path.join(root, "out");
fs.writeFileSync(path.join(out, ".nojekyll"), "");
console.log("[build:static] wrote out/.nojekyll");

/*
 * Give the social card a real file extension.
 *
 * Next's opengraph-image convention emits the PNG to out/opengraph-image
 * — no extension — and points the meta tags at `/opengraph-image?<hash>`.
 * A static host serves files by extension, so that URL comes back as
 * application/octet-stream, and several link scrapers drop a card whose
 * content type isn't an image.
 *
 * The file convention takes precedence over anything `metadata.openGraph`
 * declares, so this can't be fixed from layout.tsx. Instead: copy the PNG
 * to a real .png and repoint the emitted tags at it. A literal string
 * swap over generated output, not HTML parsing — and the extensionless
 * original is left in place so the old URL keeps resolving.
 */
const ogSource = path.join(out, "opengraph-image");
if (fs.existsSync(ogSource)) {
  fs.copyFileSync(ogSource, path.join(out, "opengraph-image.png"));

  let patched = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".html")) {
        const before = fs.readFileSync(full, "utf8");
        const after = before.replace(
          /\/opengraph-image\?[0-9a-f]+/g,
          "/opengraph-image.png"
        );
        if (after !== before) {
          fs.writeFileSync(full, after);
          patched++;
        }
      }
    }
  };
  walk(out);
  console.log(
    `[build:static] wrote out/opengraph-image.png (repointed ${patched} pages)`
  );
}
