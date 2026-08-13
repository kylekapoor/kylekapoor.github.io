"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Wraps a child in a slow, weightless drift — the cover's "floating in
 * space" motion.
 *
 * Amplitudes are deliberately small (single-digit pixels, sub-degree
 * rotation). The effect should register as "this isn't quite nailed
 * down" rather than as an animation the eye tracks. Give siblings
 * different `durationS` / `delayS` values so a group of floating
 * elements never moves as one rigid slab.
 *
 * The wrapper only ever sets `transform`, so children keep their own
 * transforms (rotation on a sticky note, say) intact.
 */
export function Float({
  children,
  y = -10,
  x = 0,
  rotate = 0,
  durationS = 9,
  delayS = 0,
  style,
}: {
  children: ReactNode;
  /** Vertical drift at the midpoint of the cycle, px. */
  y?: number;
  /** Horizontal drift at the midpoint, px. */
  x?: number;
  /** Rotation at the midpoint, degrees. */
  rotate?: number;
  durationS?: number;
  delayS?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={
        {
          "--float-y": `${y}px`,
          "--float-x": `${x}px`,
          "--float-rot": `${rotate}deg`,
          animation: `spaceFloat ${durationS}s ease-in-out ${delayS}s infinite`,
          // Promote to its own layer: these run for the whole time the
          // cover is on screen, and without the hint the compositor
          // repaints the drawn-name SVG underneath on every frame.
          willChange: "transform",
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
