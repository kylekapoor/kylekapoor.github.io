"use client";

import type { CSSProperties } from "react";

const GRAIN_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>
    <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter>
    <rect width='100%' height='100%' filter='url(%23n)' opacity='0.25'/>
  </svg>`,
);

type PaperProps = {
  /** Show the horizontal ruled lines at 32px pitch. */
  ruled?: boolean;
  /** Show the red left margin rule at 12%. */
  marginRule?: boolean;
  /** Children render above the paper layers. */
  children?: React.ReactNode;
  /** Extra class for the outermost div. */
  className?: string;
  style?: CSSProperties;
};

export function Paper({
  ruled = true,
  marginRule = true,
  children,
  className,
  style,
}: PaperProps) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "var(--color-paper)",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Ambient depth — two faint radials so the dark page isn't a flat
          slab of one colour. Cool at the top-left, warmer bottom-right;
          both barely-there, just enough to catch the eye as paper rather
          than background. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `
            radial-gradient(ellipse at 18% 8%, rgba(120, 150, 235, 0.07), transparent 55%),
            radial-gradient(ellipse at 82% 92%, rgba(255, 165, 120, 0.05), transparent 55%)
          `,
        }}
      />

      {/* Margin rule — the one warm line on an otherwise grey page. It's
          the journal's landmark: everything else on the page is white or
          grey, so this is what makes the left edge read as a margin
          instead of just where the text happens to start. Paired thin
          lines near 12% from the left, brighter than in the light theme
          so it holds its contrast against near-black. */}
      {marginRule && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: `linear-gradient(to right,
              transparent calc(12% - 4px),
              rgba(255, 138, 96, 0.30) calc(12% - 4px),
              rgba(255, 138, 96, 0.30) calc(12% - 3px),
              transparent calc(12% - 3px),
              transparent calc(12% - 1px),
              rgba(255, 138, 96, 0.55) calc(12% - 1px),
              rgba(255, 138, 96, 0.55) 12%,
              transparent 12%
            )`,
          }}
        />
      )}

      {/* Ruled horizontal lines. Formula lives in globals.css as
          --rule-background; the line sits at 0.76 × --line so Caveat body
          text rides it at every viewport. Pages that draw their own
          baseline-aligned rules (e.g. the landing) hide these by setting
          --rule-repeat-opacity: 0 on :root. */}
      {ruled && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: "var(--rule-background)",
            opacity: "var(--rule-repeat-opacity, 1)",
            transition: "opacity 0.3s",
          }}
        />
      )}

      {/* Grain — subtle SVG noise. `multiply` was right on cream paper but
          only muddies a near-black page (dark × noise stays dark), so the
          dark theme blends with `overlay`, which lifts the light parts of
          the noise and leaves the dark parts alone. Opacity is halved to
          compensate for overlay being the more aggressive blend here. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.15,
          mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml;utf8,${GRAIN_SVG}")`,
        }}
      />

      {children}
    </div>
  );
}
