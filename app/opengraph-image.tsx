import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kyle Kapoor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "rgb(13, 14, 20)";
const INK = "rgb(244, 245, 248)";
const INK_SOFT = "rgb(198, 203, 215)";
const INK_FAINT = "rgb(140, 147, 163)";
const RULE = "rgb(150, 158, 178)";
const RULE_WARM = "rgb(255, 138, 96)";

/* Deterministic star scatter. The OG image is rendered at build/request
   time on the edge, so a fixed table keeps every render identical rather
   than reshuffling per request. */
const STARS: Array<[number, number, number, number]> = [
  // [x, y, radius, opacity]
  [90, 70, 2, 0.7], [210, 40, 3, 0.9], [330, 95, 2, 0.55],
  [470, 55, 2, 0.6], [610, 110, 3, 0.85], [760, 45, 2, 0.5],
  [880, 120, 3, 0.8], [1010, 60, 2, 0.65], [1130, 100, 2, 0.55],
  [150, 250, 2, 0.5], [1080, 250, 3, 0.75], [960, 330, 2, 0.6],
  [1150, 420, 2, 0.55], [1020, 520, 3, 0.8], [880, 570, 2, 0.5],
  [700, 540, 2, 0.6], [520, 585, 3, 0.7], [340, 545, 2, 0.5],
  [180, 590, 2, 0.6], [70, 470, 3, 0.75], [1160, 560, 2, 0.5],
];

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: PAPER,
          display: "flex",
          position: "relative",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Stars */}
        {STARS.map(([x, y, r, o], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: r * 2,
              height: r * 2,
              borderRadius: 9999,
              background: "#ffffff",
              opacity: o,
            }}
          />
        ))}

        {/* Shooting star — tail plus a bright head. */}
        <div
          style={{
            position: "absolute",
            left: 820,
            top: 170,
            width: 240,
            height: 3,
            background:
              "linear-gradient(to right, rgba(160,195,255,0) 0%, rgba(190,215,255,0.75) 60%, rgba(255,255,255,1) 100%)",
            transform: "rotate(22deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 1052,
            top: 253,
            width: 12,
            height: 12,
            borderRadius: 9999,
            background: "#ffffff",
          }}
        />

        {/* Ruled lines — light grey on dark, same as the site's pages. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {Array.from({ length: 19 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 32,
                borderBottom: `1px solid ${RULE}`,
                opacity: 0.1,
              }}
            />
          ))}
        </div>

        {/* Warm margin rule */}
        <div
          style={{
            position: "absolute",
            left: 140,
            top: 0,
            bottom: 0,
            width: 2,
            background: RULE_WARM,
            opacity: 0.6,
          }}
        />

        {/* Spiral binding coils */}
        <div
          style={{
            position: "absolute",
            left: 32,
            top: 60,
            bottom: 60,
            width: 56,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 18,
                height: 18,
                borderRadius: 9999,
                border: `3px solid ${INK_FAINT}`,
                background: PAPER,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 200,
            paddingRight: 80,
            width: "100%",
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: INK_FAINT,
              marginBottom: 24,
              display: "flex",
            }}
          >
            kyle kapoor · journal
          </div>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.05,
              color: INK,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              display: "flex",
            }}
          >
            ask the journal
          </div>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.05,
              color: INK,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              display: "flex",
              marginTop: 8,
            }}
          >
            anything.
          </div>
          <div
            style={{
              fontSize: 32,
              lineHeight: 1.4,
              color: INK_SOFT,
              marginTop: 36,
              maxWidth: 820,
              display: "flex",
            }}
          >
            a portfolio, rendered as a journal floating in space.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
