"use client";

import { useEffect, useState } from "react";

/**
 * Paper edge shadow on the right + handwritten date top-left.
 * Sits above the paper but below interactive content.
 */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function PageChrome({ showDate = true }: { showDate?: boolean }) {
  /**
   * Filled in after mount, deliberately — never during render.
   *
   * These pages are prerendered, and on a static host the HTML is
   * generated once at deploy time. Computing the date while rendering
   * therefore bakes the *build date* into the file: the cover kept
   * showing the day the site was last deployed, and drifted further
   * every day after. It also broke hydration (React #418, text content
   * mismatch) the moment a visitor arrived on a later day than the
   * build.
   *
   * Reading the clock in an effect means the server emits no date at
   * all and the browser fills in today's, so it is always correct and
   * there is nothing for hydration to disagree with. The fade-in covers
   * the one frame where it's absent.
   */
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const d = new Date();
    setNow(`${MONTHS[d.getMonth()]} ${d.getDate()}`);
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 3,
      }}
    >
      {/* Right-edge shadow — makes the page feel like a sheet sitting on
          something. */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 40,
          background:
            "linear-gradient(to left, rgba(0,0,0,0.08), transparent)",
          opacity: 0.7,
        }}
      />

      {showDate && now && (
        <div
          style={{
            position: "absolute",
            top: 28,
            left: "max(90px, 8%)",
            fontFamily: "var(--font-script)",
            fontSize: "var(--fs-script)",
            color: "var(--color-ink)",
            opacity: 0.45,
            transform: "rotate(-2deg)",
            animation: "fadeIn 0.8s ease 0.6s both",
          }}
        >
          {now}
        </div>
      )}
    </div>
  );
}
