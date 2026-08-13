"use client";

import { useMemo } from "react";

/**
 * The cover's night sky: a static twinkling star field plus occasional
 * shooting stars.
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
const SHOOTING_STAR_COUNT = 5;

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
};

/* A few stars are tinted so the field doesn't read as uniform pixel
   dust — same trick real skies play on you. */
const STAR_TINTS = [
  "rgb(255,255,255)",
  "rgb(255,255,255)",
  "rgb(255,255,255)",
  "rgb(198,214,255)",
  "rgb(255,226,196)",
];

function buildStars(): Star[] {
  const rand = makeRandom(20260813);
  return Array.from({ length: STAR_COUNT }, () => {
    // Weight toward small stars: a field of uniformly-sized dots reads
    // flat, whereas a few big ones among many tiny ones reads as depth.
    const roll = rand();
    const size = roll > 0.94 ? 2.6 : roll > 0.75 ? 1.8 : 1.1;
    const min = 0.12 + rand() * 0.25;
    return {
      top: `${(rand() * 100).toFixed(3)}%`,
      left: `${(rand() * 100).toFixed(3)}%`,
      size,
      min,
      max: min + 0.35 + rand() * 0.45,
      durationS: 2.4 + rand() * 4.5,
      delayS: rand() * 6,
      color: STAR_TINTS[Math.floor(rand() * STAR_TINTS.length)],
    };
  });
}

function buildShootingStars(): ShootingStar[] {
  const rand = makeRandom(77712);
  // Stagger the cycle lengths with prime-ish spacing so two streaks
  // rarely fire together — "occasional" was the brief, not "meteor
  // shower".
  const cycles = [13, 19, 23, 31, 17];
  return Array.from({ length: SHOOTING_STAR_COUNT }, (_, i) => ({
    // Kept in the upper half — streaks near the bottom edge would cut
    // across the todo list and scroll cue.
    top: `${(rand() * 46).toFixed(2)}%`,
    left: `${(rand() * 55).toFixed(2)}%`,
    angle: 12 + rand() * 26,
    distance: 420 + rand() * 460,
    width: 90 + rand() * 90,
    durationS: cycles[i],
    delayS: 2 + rand() * 14,
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
                animation: `starTwinkle ${star.durationS}s ease-in-out ${star.delayS}s infinite`,
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
                background:
                  "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(190,215,255,0.55) 55%, rgba(255,255,255,0.95) 100%)",
                boxShadow: "0 0 8px rgba(190, 215, 255, 0.7)",
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
