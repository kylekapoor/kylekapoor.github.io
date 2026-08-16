"use client";

import { useMemo } from "react";

/**
 * The cover's night sky: a drifting, twinkling star field in mixed
 * colours, with shooting stars crossing it every few seconds.
 *
 * Determinism matters here. Star positions are generated from a seeded
 * PRNG rather than Math.random() so the server render and the client
 * hydration produce byte-identical markup — Math.random() would give
 * every star a different position on each pass and React would flag a
 * hydration mismatch on the whole layer.
 *
 * Everything animates in CSS (see the star keyframes in globals.css),
 * so once mounted this component does no work per frame and never
 * re-renders.
 */

const STAR_COUNT = 150;
// Enough streaks, on short enough cycles, that one is nearly always
// crossing the cover somewhere — the brief was "often", not "if you
// wait long enough".
const SHOOTING_STAR_COUNT = 10;

/** Mulberry32 — small, fast, good enough for scattering dots. */
function makeRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Star = {
  top: string;
  left: string;
  size: number;
  min: number;
  max: number;
  durationS: number;
  delayS: number;
  /** A handful of stars get a warm/cool tint instead of plain white. */
  color: string;
  /** Per-star wander, in px, on its own clock — see starDrift. */
  driftX: number;
  driftY: number;
  driftDurationS: number;
  driftDelayS: number;
};

type ShootingStar = {
  top: string;
  left: string;
  /** Travel angle, degrees. Kept shallow so they streak across, not down. */
  angle: number;
  distance: number;
  width: number;
  durationS: number;
  delayS: number;
  /** Base hue for this streak's tail and glow. */
  hue: number;
};

/* Star colours are drawn at random from across the spectrum — blue,
   cyan, green, gold, orange, pink, violet — rather than the near-white
   field a real sky gives you. Saturation is the thing to keep a lid on:
   fully saturated dots read as confetti, whereas pastels at ~70-80%
   lightness still register as *stars* that happen to be coloured.
   Each entry is [hue, saturation%]; lightness is randomised per star. */
const STAR_HUES: Array<[number, number]> = [
  [212, 80], // blue
  [190, 85], // cyan
  [145, 65], // green
  [45, 85], // gold
  [22, 90], // orange
  [330, 75], // pink
  [265, 70], // violet
  [0, 0], // plain white — kept in the mix so the field has an anchor
];

function buildStars(): Star[] {
  const rand = makeRandom(20260813);
  return Array.from({ length: STAR_COUNT }, () => {
    // Weight toward small stars: a field of uniformly-sized dots reads
    // flat, whereas a few big ones among many tiny ones reads as depth.
    const roll = rand();
    const size = roll > 0.94 ? 2.6 : roll > 0.75 ? 1.8 : 1.1;
    const min = 0.12 + rand() * 0.25;
    const [hue, sat] = STAR_HUES[Math.floor(rand() * STAR_HUES.length)];
    // Lightness has to stay under ~90% for the hue to survive at 1-2px:
    // above that every colour converges on white and the field reads as
    // plain dust again. Bigger stars go darker still, because their glow
    // adds brightness back and would otherwise blow out to a white blob.
    const light = size > 1.5 ? 66 + rand() * 12 : 74 + rand() * 14;
    // Direction is free (either sign on both axes) so the field wanders
    // rather than sliding one way as a sheet — that's what the slow
    // layer-wide parallax underneath is already for. Bigger stars move
    // a little further, which reads as them being nearer.
    const amplitude = size > 1.5 ? 5 + rand() * 5 : 3 + rand() * 4;
    const direction = rand() * Math.PI * 2;
    return {
      top: `${(rand() * 100).toFixed(3)}%`,
      left: `${(rand() * 100).toFixed(3)}%`,
      size,
      min,
      max: min + 0.35 + rand() * 0.45,
      durationS: 2.4 + rand() * 4.5,
      delayS: rand() * 6,
      color: `hsl(${hue} ${sat}% ${light.toFixed(0)}%)`,
      driftX: +(Math.cos(direction) * amplitude).toFixed(2),
      driftY: +(Math.sin(direction) * amplitude).toFixed(2),
      // Long, unrelated periods: nothing in the field ever lines up.
      driftDurationS: +(9 + rand() * 13).toFixed(1),
      driftDelayS: +(rand() * 10).toFixed(1),
    };
  });
}

function buildShootingStars(): ShootingStar[] {
  const rand = makeRandom(77712);
  // Prime-ish cycle lengths, none of them shared: the streaks drift out
  // of phase with each other and never settle into a visible rhythm.
  // Short enough that something is crossing the sky every few seconds,
  // spread enough that they don't arrive as a volley.
  const cycles = [7, 11, 13, 9, 17, 8, 19, 12, 23, 10];
  return Array.from({ length: SHOOTING_STAR_COUNT }, (_, i) => ({
    // Anywhere on the cover, top to bottom. They pass behind the
    // handwriting (this whole layer sits at z-index 0) so a streak
    // crossing the todo list reads as depth rather than clutter.
    top: `${(rand() * 88).toFixed(2)}%`,
    left: `${(rand() * 78).toFixed(2)}%`,
    // Mostly shallow downward streaks, with a few running the other way
    // so the sky doesn't look like it's raining in one direction.
    angle: rand() > 0.78 ? -(8 + rand() * 20) : 12 + rand() * 26,
    distance: 420 + rand() * 460,
    width: 90 + rand() * 90,
    durationS: cycles[i],
    // Offsets are spread across the full cycle length so the first
    // minute isn't front-loaded and the streaks stay interleaved after.
    delayS: +(rand() * cycles[i]).toFixed(1),
    // Full spectrum, one hue per streak — each pass is a different
    // colour rather than the usual white.
    hue: Math.floor(rand() * 360),
  }));
}

export function Starfield() {
  const stars = useMemo(buildStars, []);
  const shooting = useMemo(buildShootingStars, []);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {/* Deep-space wash. Two very soft radials give the flat backdrop a
          sense of nebula depth without ever getting bright enough to
          compete with the handwriting on top. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 55% at 22% 18%, rgba(72, 92, 168, 0.18), transparent 60%),
            radial-gradient(ellipse 60% 50% at 82% 78%, rgba(128, 78, 168, 0.14), transparent 62%),
            radial-gradient(ellipse 90% 70% at 50% 50%, rgba(10, 12, 22, 0), rgba(4, 5, 9, 0.75) 85%)
          `,
        }}
      />

      {/* Star layer. Oversized and offset so the slow parallax drift
          never exposes an empty edge as it moves. */}
      <div
        style={{
          position: "absolute",
          top: "-4%",
          left: "-4%",
          width: "108%",
          height: "108%",
          animation: "starFieldDrift 120s ease-in-out infinite alternate",
        }}
      >
        {stars.map((star, i) => (
          <span
            key={i}
            style={
              {
                position: "absolute",
                top: star.top,
                left: star.left,
                width: star.size,
                height: star.size,
                borderRadius: "50%",
                background: star.color,
                // Bigger stars get a glow; the 1.1px ones stay crisp
                // points so the field keeps some fine grain.
                boxShadow:
                  star.size > 1.5
                    ? `0 0 ${star.size * 3}px ${star.color}`
                    : "none",
                "--twinkle-min": star.min,
                "--twinkle-max": star.max,
                "--drift-x": `${star.driftX}px`,
                "--drift-y": `${star.driftY}px`,
                animation:
                  `starTwinkle ${star.durationS}s ease-in-out ${star.delayS}s infinite, ` +
                  `starDrift ${star.driftDurationS}s ease-in-out ${star.driftDelayS}s infinite`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Shooting stars. The wrapper owns the travel angle so the
          keyframe only has to push along +X — rotating inside the
          keyframe instead would make the streak pivot mid-flight. */}
      {shooting.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            transform: `rotate(${s.angle}deg)`,
            transformOrigin: "left center",
          }}
        >
          <div
            style={
              {
                width: s.width,
                height: 2,
                borderRadius: 2,
                // Head at the right end, tail fading back to nothing.
                // The tail carries this streak's hue while the head
                // stays white-hot — a fully coloured head reads as a
                // flying dot rather than something burning up.
                background: `linear-gradient(to right, hsl(${s.hue} 90% 70% / 0) 0%, hsl(${s.hue} 90% 72% / 0.6) 55%, hsl(${s.hue} 100% 96% / 0.95) 100%)`,
                boxShadow: `0 0 8px hsl(${s.hue} 90% 70% / 0.75)`,
                transformOrigin: "left center",
                "--shoot-distance": `${s.distance}px`,
                animation: `shootingStar ${s.durationS}s linear ${s.delayS}s infinite`,
                opacity: 0,
              } as React.CSSProperties
            }
          />
        </div>
      ))}
    </div>
  );
}
