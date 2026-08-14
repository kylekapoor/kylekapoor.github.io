"use client";

import type { CSSProperties } from "react";

/**
 * A few CN towers drifting in the empty parts of the cover.
 *
 * The point is atmosphere, not decoration you notice: three of them,
 * small, faint, tilted off-vertical and floating on the same weightless
 * drift as the name and the scraps — so they read as debris in the same
 * space rather than skyline furniture stuck to the page.
 *
 * Placement is hand-picked around the cover's existing furniture (date,
 * taped card, todo list, sticky, annotations, scroll cue) rather than
 * random, because "random" reliably lands one on top of the name.
 * Hidden on phones, where there is no spare whitespace to sit in.
 */

type Tower = {
  /** Position on the cover; only two of the four sides are ever set. */
  pos: CSSProperties;
  size: number;
  /** Base tilt, degrees — none of them are upright. */
  rotate: number;
  opacity: number;
  durationS: number;
  delayS: number;
  floatY: number;
  floatX: number;
};

const TOWERS: Tower[] = [
  // Upper-left gap, below the date and left of the name.
  {
    pos: { left: "21%", top: "15%" },
    size: 25,
    rotate: -14,
    opacity: 0.12,
    durationS: 15,
    delayS: 0.8,
    floatY: -9,
    floatX: 4,
  },
  // Right side, above the "systems, mostly" note and below the card.
  {
    pos: { right: "25%", top: "31%" },
    size: 19,
    rotate: 11,
    opacity: 0.09,
    durationS: 12,
    delayS: 2.4,
    floatY: -7,
    floatX: -5,
  },
  // Lower middle-left, clear of the todo list and the scroll cue.
  {
    pos: { left: "35%", bottom: "17%" },
    size: 22,
    rotate: -7,
    opacity: 0.10,
    durationS: 17,
    delayS: 1.6,
    floatY: -11,
    floatX: 3,
  },
];

export function DriftingTowers({ isMobile = false }: { isMobile?: boolean }) {
  if (isMobile) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        // Above the star field, below the name and the scraps.
        zIndex: 1,
      }}
    >
      {TOWERS.map((t, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...t.pos,
            // The static tilt lives here and the drift on the child, so
            // the animation doesn't overwrite the rotation.
            transform: `rotate(${t.rotate}deg)`,
          }}
        >
          <div
            style={
              {
                "--float-y": `${t.floatY}px`,
                "--float-x": `${t.floatX}px`,
                animation: `fadeIn 1.6s ease ${t.delayS + 1.5}s both, spaceFloat ${t.durationS}s ease-in-out ${t.delayS}s infinite`,
                opacity: t.opacity,
              } as CSSProperties
            }
          >
            <CNTower size={t.size} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * CN tower reduced to the three strokes that make it recognisable: the
 * tapered shaft, the pod, and the antenna. Drawn as outline only — a
 * filled silhouette at this opacity turns into a grey smudge.
 */
function CNTower({ size }: { size: number }) {
  // Native viewBox is 40×120; the aspect ratio is fixed from that.
  const width = size;
  const height = size * 3;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 120"
      fill="none"
      style={{ display: "block", overflow: "visible" }}
    >
      <g
        stroke="var(--color-ink)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Shaft — narrows toward the pod. */}
        <path d="M 16 118 L 18.5 62" />
        <path d="M 24 118 L 21.5 62" />
        {/* Pod. */}
        <path d="M 12 56 L 28 56 L 25 46 L 15 46 Z" />
        {/* Sky pod, smaller, higher up the mast. */}
        <path d="M 17 34 L 23 34 L 22 27 L 18 27 Z" />
        {/* Antenna. */}
        <path d="M 20 46 L 20 2" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
