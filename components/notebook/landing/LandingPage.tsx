"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DrawnText } from "../primitives/DrawnText";
import { FitToWidth } from "../primitives/FitToWidth";
import { Float } from "../primitives/Float";
import { RoleCycler } from "../primitives/RoleCycler";
import { CornerPeel } from "./CornerPeel";
import { Scraps } from "./Scraps";
import { ScrollCue } from "./ScrollCue";
import { Starfield } from "./Starfield";

// Drawn one at a time, ~4s each, so the order is the real decision:
// most visitors scroll before the second word finishes.
const ROLES = ["Engineer", "Student", "Builder", "Developer"];
const INK = "var(--color-ink)";
const INK_DIM = "var(--color-ink-faint)";
const INTRO_DURATION = 2.5;

/**
 * Routes prefetched while the landing animation is playing. Warm
 * during the ~3s the user spends on the cover so the first open of
 * any content page has its JS chunk + data already cached — page
 * flip can kick in without a network round-trip pause.
 */
const PREFETCH_ROUTES = [
  "/home",
  "/about",
  "/experience",
  "/projects",
  "/contact",
];

export function LandingPage({ onAdvance }: { onAdvance: () => void }) {
  const router = useRouter();

  // Warm up the content-route bundles during the landing animation.
  // Each router.prefetch triggers Next to download the route chunk +
  // any data dependencies without actually mounting the component —
  // so by the time the user opens /about, React already has the code
  // and only has to render. Cuts first-open jank noticeably on cold
  // sessions.
  useEffect(() => {
    for (const path of PREFETCH_ROUTES) {
      router.prefetch(path);
    }
  }, [router]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        zIndex: 2,
      }}
    >
      {/* Night sky behind everything on the cover. It sits at z-index 0
          and every sibling below carries an explicit z-index above it,
          so a shooting star always passes *under* whatever it crosses.
          Painting order would mostly do this on its own — the layer is
          first in the DOM — but "mostly" is how a streak ends up drawn
          over the name the next time something is reordered. */}
      <Starfield />

      {/* Kicker — "journal". Each floating element below gets its own
          drift duration and phase, so the group breathes independently
          rather than sliding as one block. */}
      <Float
        y={-6}
        x={3}
        rotate={-0.3}
        durationS={11}
        delayS={0.4}
        style={{ zIndex: 3 }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-input)",
            fontWeight: 500,
            letterSpacing: "0.35em",
            color: "var(--color-ink-faint)",
            textTransform: "uppercase",
            marginBottom: 16,
            opacity: 0,
            animation: "fadeIn 0.6s ease-out 0.3s forwards",
          }}
        >
          journal
        </div>
      </Float>

      {/* Drawn name — the main floating object. Slowest cycle of the
          group so it reads as the heaviest thing on the page. */}
      <Float
        y={-14}
        x={6}
        rotate={-0.5}
        durationS={14}
        style={{ width: "min(88vw, 820px)", flex: "none", zIndex: 3 }}
      >
        <FitToWidth>
          <DrawnText
            text="Kyle Kapoor"
            fontFamily="Caveat"
            fontSize={140}
            fontWeight={500}
            color={INK}
            duration={INTRO_DURATION * 0.85}
            fillAfter
            fillDelay={0.1}
            strokeWidth={1.4}
          />
        </FitToWidth>
      </Float>

      {/* Role cycler */}
      <Float
        y={-9}
        x={-4}
        rotate={0.4}
        durationS={10}
        delayS={1.2}
        style={{ zIndex: 3 }}
      >
        <RoleCycler
          roles={ROLES}
          color={INK_DIM}
          fontFamily="Caveat"
          fontSize={42}
          fontWeight={500}
          startAt={INTRO_DURATION * 1000 + 300}
        />
      </Float>

      {/* Scraps and annotations */}
      <Scraps variant="landing" />

      {/* Scroll cue — right-pointing chevrons bobbing horizontally */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 3,
        }}
      >
        <ScrollCue delay={INTRO_DURATION * 1000 + 1000} />
      </div>

      {/* Corner peel — primary advance affordance */}
      <CornerPeel onClick={onAdvance} />
    </div>
  );
}
