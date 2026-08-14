"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether an image failed to load, so a caller can render a
 * fallback instead of a broken frame.
 *
 * An `onError` handler alone is not enough on these pages. They're
 * server-rendered, so the browser starts fetching the image while
 * parsing the HTML — a 404 fires its error event *before* React hydrates
 * and attaches the handler, and the event never replays. The mount check
 * covers that case: a decoded image has a non-zero naturalWidth, so
 * `complete` with naturalWidth 0 means it already failed.
 *
 * This is what lets the site name an asset (a portrait, a company logo)
 * before the file exists — the page renders its fallback until someone
 * drops the real file in, with no code change.
 */
export function useImageFallback() {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  return { failed, ref, onError: () => setFailed(true) };
}
