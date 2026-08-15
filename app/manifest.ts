import type { MetadataRoute } from "next";
import { BASE_PATH, asset } from "@/lib/basePath";

// The manifest is the same bytes for every visitor, so it can be
// generated once at build time. Required for `output: "export"`, which
// won't emit a metadata route that hasn't opted in to being static.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kyle Kapoor",
    short_name: "Kyle Kapoor",
    description:
      "Kyle Kapoor's portfolio, rendered as a journal floating in space.",
    start_url: `${BASE_PATH}/`,
    display: "standalone",
    background_color: "rgb(13, 14, 20)",
    theme_color: "rgb(13, 14, 20)",
    orientation: "portrait",
    icons: [
      {
        src: asset("/favicon.svg"),
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
