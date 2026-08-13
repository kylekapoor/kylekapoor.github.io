import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kyle Kapoor",
    short_name: "Kyle Kapoor",
    description:
      "Kyle Kapoor's portfolio, rendered as a journal floating in space.",
    start_url: "/",
    display: "standalone",
    background_color: "rgb(13, 14, 20)",
    theme_color: "rgb(13, 14, 20)",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
