"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { asset } from "@/lib/basePath";
import { PORTRAIT } from "@/lib/profile";
import { PageBackButton } from "../chrome/PageBackButton";
import { PageCorner } from "../chrome/PageCorner";
import { Paper } from "../chrome/Paper";
import { DrawnText } from "../primitives/DrawnText";
import { HandwrittenText } from "../primitives/HandwrittenText";
import {
  PageAnimateContext,
  usePageAnimate,
} from "../primitives/PageAnimateContext";
import { Sticker } from "../primitives/Sticker";

// Kyle's own words, tidied — not a bio written *about* him. The middle
// paragraph is the career arc as role types only, oldest first; which
// company each of those happened at is the experience page's job, and
// keeping the two apart is what stops the site telling one story twice.
const BODY_PARAGRAPHS = [
  "Grew up in Toronto, 3rd year CS at the University of Waterloo. Obsessed with this era of AI. Basically on Cursor or Claude Code 24/7. Otherwise probably thinking a bit too hard about how to get that Ferrari before 25.",
  "career path so far:\n\u2192 data\n\u2192 full-stack\n\u2192 applied ai\n\u2192 fintech + applied ai\nstill working out what's next. enjoying the detours.",
  "Outside of that: far too much Formula 1 and NBA, badminton (99% chance I get smoked), permanently at the gym, watching the car market more closely than the stock market, reading whatever book swears it'll make me $1M by tomorrow, or booking another flight to Europe for no real reason.",
];

// Photos + slot positions split into two lists so the site can randomly
// assign any photo to any slot on page open — same layout each time,
// fresh placement every mount. After that, the user can drag them
// anywhere (PolaroidFrame owns drag state).
type Photo = {
  src: string;
  caption: string;
  /**
   * Wider rungs of the same photo. The frames paint at ~205px, so 448
   * covers a 2x screen and 768 covers 3x or a zoomed-in browser; handing
   * the browser one fixed file is what made the cover photo look soft.
   */
  srcSetWidths?: number[];
  /** `src` with the width substituted, e.g. "/photos/track-{w}.jpg". */
  srcPattern?: string;
  /** Shown if `src` 404s. Lets a photo be wired up before the image
   *  file exists without ever rendering a broken frame. */
  fallbackSrc?: string;
  /** Caption to use once the fallback is showing. */
  fallbackCaption?: string;
};
type PolaroidSlot = {
  top: number;
  right?: number | string;
  rotation: number;
  width: number;
};

// Journal doodles rather than snapshots — illustrated SVG cards taped
// into the polaroid frames. Swap any `src` for a real photo (any 4:5
// image) and the frame renders it unchanged.
// Three polaroid slots, always filled. When PORTRAIT is set in
// lib/profile.ts the photo takes the first card and the Toronto
// illustration steps aside — keeping the count at three means no slot
// positions have to move, so adding a real photo can't reopen the
// text-overlap problem the slot geometry below is tuned to avoid.
// Photographs, not drawings. Each matches the caption above it: Toronto
// at dusk with the tower lit, an empty circuit corner with the kerbs on
// it, a shuttlecock resting on the strings.
//
// All three are graded down hard — brightness pulled, contrast up a
// little, colour drained a little, a nudge toward blue, then a vignette.
// The amounts differ per photo (badminton needs the most; its wall is
// mid-grey and glowed against a near-black page) but they're tuned to
// land within a few points of the same mean luminance, so three photos
// from two sources read as one wall of pictures rather than a stock
// grab bag.
//
// All CC0 / public domain, so no attribution is required, but the
// sources are recorded here anyway:
//   downtown, late     Wikimedia Commons, CC0
//                      https://commons.wikimedia.org/w/index.php?curid=174480273
//   sunday, lights out rawpixel, CC0 — an empty track, no car
//                      https://www.rawpixel.com/image/8851870
//   best two of three  rawpixel, CC0
//                      https://www.rawpixel.com/image/5914299
const ILLUSTRATIONS: Photo[] = [
  {
    src: "/photos/track-448.jpg",
    srcPattern: "/photos/track-{w}.jpg",
    srcSetWidths: [448, 768],
    caption: "sunday, lights out",
  },
  {
    src: "/photos/badminton-448.jpg",
    srcPattern: "/photos/badminton-{w}.jpg",
    srcSetWidths: [448, 768],
    caption: "best two of three",
  },
  {
    src: "/photos/toronto-448.jpg",
    srcPattern: "/photos/toronto-{w}.jpg",
    srcSetWidths: [448, 768],
    caption: "downtown, late",
  },
];

const PHOTOS: Photo[] = PORTRAIT
  ? [
      // The portrait carries the Toronto illustration as its fallback, so
      // this entry is safe to leave wired up whether or not the image
      // file has been added yet — see PolaroidPhoto.
      {
        ...PORTRAIT,
        fallbackSrc: ILLUSTRATIONS[2].src,
        fallbackCaption: ILLUSTRATIONS[2].caption,
      },
      ILLUSTRATIONS[0],
      ILLUSTRATIONS[1],
    ]
  : ILLUSTRATIONS;

// Slots staggered horizontally (right values 325 / 120 / 220) so the
// polaroids don't align on a single vertical line — gives the "someone
// stuck these on the page by hand" feel rather than a neat column.
// Slot 0 is intentionally inset deep (right: 325) so the upper-right
// sticker slot sits at the page edge instead; body text reserves
// matching space on the right to keep clear of slot 0's width.
// Rotations alternate direction for the same reason.
// Vertical spacing ~400px between slots: first two visible on most
// desktops, third tucks below the fold and scrolls into view.
const POLAROID_SLOTS: PolaroidSlot[] = [
  { top: 20, right: 150, rotation: 3, width: 205 },
  { top: 500, right: 120, rotation: -6, width: 195 },
  { top: 900, right: 180, rotation: 4, width: 215 },
];

// Polaroid (Photo × Slot) combined shape used by PolaroidFrame. We
// keep it structurally compatible with the pre-refactor POLAROID
// shape so PolaroidFrame didn't need to change.
type Polaroid = Photo & PolaroidSlot;

// Stickers + slot positions, same split as polaroids: any sticker can
// land in any slot on mount. Each sticker keeps its own visual identity
// (size, rotation, background, icon) — the slot only provides position
// and animation delay.
type StickerData = {
  size: number;
  rotation: number;
  background?: string;
  icon: "coffee" | "shuttlecock" | "racecar" | "dumbbell";
};
type StickerSlot = {
  top: number;
  left?: number | string;
  right?: number | string;
  delayMs: number;
};

// Sticker backgrounds are dark now — a cream sticker on a near-black
// page reads as a hole punched in the paper rather than something stuck
// onto it.
const STICKERS: StickerData[] = [
  { size: 54, rotation: -10, background: "#2a2118", icon: "coffee" },
  { size: 56, rotation: 8, background: "#16241f", icon: "shuttlecock" },
  { size: 58, rotation: -6, background: "#2b1a1a", icon: "racecar" },
  { size: 54, rotation: 12, background: "#1c2231", icon: "dumbbell" },
];

// Sticker slots are positioned explicitly OUTSIDE every polaroid slot's
// bounding box — no overlap possible regardless of which photo lands
// where or which sticker lands where:
//   slot 0: top-left gutter (x=20-74) — left of body text column
//   slot 1: upper-right, to the LEFT of polaroid-slot-0 (right=290 vs
//           polaroid right=60+205=265 left edge)
//   slot 2: between polaroid-slot-1 (ends y=745) and polaroid-slot-2
//           (starts y=900), on the far right edge
//   slot 3: mid-left gutter, below the coffee margin note
const STICKER_SLOTS: StickerSlot[] = [
  { top: 130, left: 20, delayMs: 2200 },
  { top: 100, right: 80, delayMs: 2400 }, // far-right corner (swap target of polaroid slot 0's old position)
  { top: 790, right: 60, delayMs: 2600 },
  { top: 800, left: 40, delayMs: 2800 }, // mid-left, clears the basketball margin note
];

// Fisher-Yates over [0..n-1]. Used to randomize photo/sticker assignment
// on mount. Runs client-side only (via useEffect) so SSR and the first
// client paint agree on the deterministic identity order.
function shuffleIndexes(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Margin notes positioned in --line units (not viewport %) so the gap
// between them stays consistent across viewport heights. Previously at
// 44% / 68% of the scroll div height — at narrower windows those two
// percentages compressed and the notes overlapped.
const MARGIN_NOTES: Array<{
  text: string;
  top: string;
  left?: string;
  right?: string;
  rotate: number;
  delayMs: number;
}> = [
  {
    text: "coffee:\nnon-negotiable",
    top: "calc(var(--line) * 7)",
    left: "3.5%",
    rotate: -7,
    delayMs: 1800,
  },
  {
    text: "gym:\nask me about skipping legs",
    top: "calc(var(--line) * 18)",
    left: "4%",
    rotate: 5,
    delayMs: 2400,
  },
];

// Mobile sticker positions — % offsets relative to the polaroid strip
// container. Calibrated so they cluster around the photo strip without
// covering polaroid faces.
const MOBILE_STICKER_OFFSETS: Array<{
  top: string;
  left?: string;
  right?: string;
  delayMs: number;
}> = [
  { top: "0", right: "8%", delayMs: 2200 },
  { top: "32%", left: "4%", delayMs: 2400 },
  { top: "62%", right: "12%", delayMs: 2600 },
  { top: "88%", left: "8%", delayMs: 2800 },
];

export function AboutPage({
  onClose,
  animate = true,
  sessionKey = 0,
}: {
  onClose: () => void;
  animate?: boolean;
  sessionKey?: number;
}) {
  const isMobile = useIsMobile();
  // Randomize photo → slot and sticker → slot assignment per page open.
  // SSR + initial client paint render the deterministic identity order
  // (photo i in slot i, sticker i in slot i) so hydration matches;
  // useEffect swaps in a Fisher-Yates shuffle post-mount. User drag
  // takes over after that (PolaroidFrame / Sticker own drag state).
  const [photoOrder, setPhotoOrder] = useState<number[]>(() =>
    PHOTOS.map((_, i) => i),
  );
  const [stickerOrder, setStickerOrder] = useState<number[]>(() =>
    STICKERS.map((_, i) => i),
  );
  useEffect(() => {
    // Photos shuffle across slots on each open — except the portrait,
    // which is pinned to slot 0. Slot 2 sits at top: 900, well below the
    // fold, so leaving the portrait in the shuffle meant a coin-flip
    // whether the one photo of an actual person was visible on arrival.
    // Only the illustrations rotate.
    if (PORTRAIT) {
      const rest = shuffleIndexes(PHOTOS.length - 1).map((i) => i + 1);
      setPhotoOrder([0, ...rest]);
    } else {
      setPhotoOrder(shuffleIndexes(PHOTOS.length));
    }
    setStickerOrder(shuffleIndexes(STICKERS.length));
  }, []);

  return (
    <PageAnimateContext.Provider value={{ animate, sessionKey }}>
    <div style={{ position: "absolute", inset: 0 }}>
      <Paper ruled={false} marginRule={false} />

      {/* Scrolling content area */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          paddingTop: "calc(var(--line) * 3)",
          paddingBottom: isMobile
            ? "calc(var(--line) * 3 + 88px + env(safe-area-inset-bottom, 0px))"
            : "calc(var(--line) * 3)",
          paddingLeft: isMobile
            ? "calc(var(--pad-content) + 44px)"
            : "calc(12% + var(--pad-content))",
          paddingRight: isMobile ? "var(--pad-content)" : "8%",
          overflowY: "auto",
          // Ruled lines travel with the content as the user scrolls.
          // background-attachment: local binds the bg to the content, not
          // to the scroll container — without it the rules would stick to
          // the div while text moved past them, making the text drift
          // off-grid visually. Formula in globals.css keeps text baseline
          // on rule at every viewport.
          backgroundImage: "var(--rule-background)",
          backgroundAttachment: "local",
        }}
      >
        {/* Page meta stacked in the top-left gutter: back button + page
            label. Keeps all page chrome on one side, out of the chat's way. */}
        <PageBackButton onClose={onClose} />

        <div
          style={{
            position: "absolute",
            // Baseline floats 0.19 × --line above rule 2 — matches the
            // sender-label offset in chat home.
            top: "calc(var(--line) * 2.57 - var(--fs-meta) * 0.86)",
            left: isMobile
              ? "calc(44px + var(--pad-content))"
              : "calc(3% + var(--pad-chrome))",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-meta)",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color:
              "color-mix(in srgb, var(--color-ink-soft) 55%, transparent)",
            lineHeight: 1,
          }}
        >
          journal · about
        </div>

        {/* Handwritten page title */}
        <h1
          style={{
            fontFamily: "var(--font-script)",
            fontSize: "var(--fs-display)",
            fontWeight: 500,
            color: "var(--color-ink)",
            margin: 0,
            lineHeight: "calc(var(--line) * 3)",
          }}
        >
          about
        </h1>

        {/* Polaroids anchored to the right (desktop only). On mobile, they
            move into a stacked strip below the body text. */}
        {!isMobile &&
          POLAROID_SLOTS.map((slot, slotIdx) => {
            const photo = PHOTOS[photoOrder[slotIdx]];
            return (
              <PolaroidFrame
                key={`${sessionKey}-${slotIdx}`}
                polaroid={{ ...photo, ...slot }}
                delayMs={1200 + slotIdx * 200}
              />
            );
          })}

        {/* Drawn-in greeting. Height locked to 3× the ruler pitch (96px)
            + bottom margin = 32px so the grid stays clean. maxWidth
            reserves space for polaroid slot 0 (right: 325 + width: 205
            = 530 from right) — dropped on mobile where polaroids stack
            below the body. */}
        <div
          style={{
            height: "calc(var(--line) * 3)",
            marginBottom: "var(--line)",
            display: "flex",
            alignItems: "center",
            maxWidth: isMobile ? "100%" : "calc(100% - 420px)",
          }}
        >
          <DrawnText
            text="hi — I'm Kyle"
            fontFamily="Caveat"
            fontSize={isMobile ? 38 : 56}
            fontWeight={500}
            color="var(--color-ink)"
            duration={1.4}
            fillAfter
            fillDelay={0.15}
            strokeWidth={1.1}
          />
        </div>

        {/* Body paragraphs — text wraps to the left of the absolute polaroids
            via max-width on desktop; full-width on mobile. Each paragraph
            stays on the ruler grid. */}
        <div
          style={{
            // Reserve sized for the most-inset polaroid that shares a
            // vertical range with body text. Polaroid slot 0 sits at
            // top=30 (entirely above body text y=334), so it's ignored
            // here. Polaroid slot 2 at right=220 + width=215 = 435 from
            // right is the binding constraint — reserve 360 leaves a
            // small gap (rounded up). Mobile drops the reservation since
            // polaroids stack below.
            maxWidth: isMobile ? "100%" : "calc(100% - 420px)",
            fontFamily: "var(--font-script)",
            fontSize: "var(--fs-body)",
            fontWeight: 400,
            color: "var(--color-ink)",
            lineHeight: "var(--line)",
          }}
        >
          {BODY_PARAGRAPHS.map((text, i) => (
            <RevealOnMount key={i} delayMs={1400 + i * 600}>
              <p
                style={{
                  margin: 0,
                  marginBottom: "var(--line)",
                }}
              >
                <HandwrittenText text={text} charDelayMs={12} />
              </p>
            </RevealOnMount>
          ))}
        </div>

        {/* Mobile-only: polaroid strip below the body, stickers scattered
            around it. Both stay draggable — PolaroidFrame's pointer-event
            drag works on touch as-is. */}
        {isMobile && (
          <div
            style={{
              position: "relative",
              marginTop: "calc(var(--line) * 1.5)",
              marginBottom: "calc(var(--line) * 2)",
              minHeight: 540,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 32,
              }}
            >
              {POLAROID_SLOTS.map((slot, slotIdx) => {
                const photo = PHOTOS[photoOrder[slotIdx]];
                return (
                  <MobilePolaroidFrame
                    key={`${sessionKey}-mob-${slotIdx}`}
                    photo={photo}
                    rotation={slot.rotation}
                    delayMs={1200 + slotIdx * 200}
                  />
                );
              })}
            </div>

            {MOBILE_STICKER_OFFSETS.map((offset, slotIdx) => {
              // Driven by the offsets array (not STICKER_SLOTS, whose
              // positions are desktop-only) and guarded, so the two
              // arrays can drift in length without crashing the page.
              const sticker = STICKERS[stickerOrder[slotIdx]];
              if (!sticker) return null;
              return (
                <Sticker
                  key={`${sessionKey}-mob-stk-${slotIdx}`}
                  size={sticker.size}
                  rotation={sticker.rotation}
                  background={sticker.background}
                  top={offset.top}
                  left={offset.left}
                  right={offset.right}
                  delayMs={offset.delayMs}
                >
                  {sticker.icon === "coffee" && <CoffeeCupIcon />}
                  {sticker.icon === "shuttlecock" && <ShuttlecockIcon />}
                  {sticker.icon === "racecar" && <RaceCarIcon />}
                  {sticker.icon === "dumbbell" && <DumbbellIcon />}
                </Sticker>
              );
            })}
          </div>
        )}

        {/* Margin notes — handwritten asides sitting in the left gutter.
            Hidden on mobile since the gutter doesn't exist. */}
        {!isMobile &&
          MARGIN_NOTES.map((note, i) => (
            <MarginNote key={`${sessionKey}-${i}`} {...note} />
          ))}

        {/* Desktop stickers — all draggable, placed in whitespace so the
            initial positions never cover body text. */}
        {!isMobile &&
          STICKER_SLOTS.map((slot, slotIdx) => {
            const sticker = STICKERS[stickerOrder[slotIdx]];
            return (
              <Sticker
                // sessionKey in the key forces a fresh Sticker mount on
                // every revisit so its fade-in plays again (drag position
                // resets too — acceptable for a decorative element).
                key={`${sessionKey}-${slotIdx}`}
                size={sticker.size}
                rotation={sticker.rotation}
                background={sticker.background}
                top={slot.top}
                left={slot.left}
                right={slot.right}
                delayMs={slot.delayMs}
              >
                {sticker.icon === "coffee" && <CoffeeCupIcon />}
                {sticker.icon === "shuttlecock" && <ShuttlecockIcon />}
                {sticker.icon === "racecar" && <RaceCarIcon />}
                {sticker.icon === "dumbbell" && <DumbbellIcon />}
              </Sticker>
            );
          })}
      </div>

      {/* Dog-eared bottom-right corner — sits outside the scroll area so
          the page bookmark is always visible, not only at the bottom of
          the content. */}
      <PageCorner pageNumber="01" />
    </div>
    </PageAnimateContext.Provider>
  );
}

// ── Photo with fallback ──────────────────────────────────────────────

/**
 * The photo inside a polaroid frame.
 *
 * If `src` fails to load — which is exactly what happens while the
 * portrait is wired up but the image file hasn't been added yet — this
 * silently swaps to `fallbackSrc` instead of showing a broken frame.
 * That's what makes the portrait a drop-the-file-in change with no code
 * edit: present, and it renders; absent, and the page looks precisely as
 * it did before.
 */
function useResolvedPhoto(photo: Photo) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // The onError prop alone is not enough here. This page is
  // server-rendered, so the browser starts fetching the image while
  // parsing the HTML — a 404 fires its error event *before* React
  // hydrates and attaches the handler. The event doesn't replay, so the
  // frame would sit broken forever. Re-check on mount: a decoded image
  // has a non-zero naturalWidth, so `complete` with naturalWidth 0 means
  // it already failed.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  const usingFallback = failed && !!photo.fallbackSrc;
  return {
    // asset() so the path survives a deploy under a subdirectory; it's a
    // no-op at a domain root. Applied here rather than at the <img> so
    // the fallback path gets the same treatment.
    src: asset(usingFallback ? photo.fallbackSrc! : photo.src),
    // The caption is rendered by the frame, not the image, so it has to
    // come from here too — otherwise a fallback shows the Toronto
    // illustration under a caption describing the portrait.
    caption: usingFallback
      ? photo.fallbackCaption ?? photo.caption
      : photo.caption,
    srcSet:
      !usingFallback && photo.srcPattern && photo.srcSetWidths
        ? photo.srcSetWidths
            .map((w) => `${asset(photo.srcPattern!.replace("{w}", String(w)))} ${w}w`)
            .join(", ")
        : undefined,
    imgRef,
    onError: () => setFailed(true),
  };
}

/** The photo inside a polaroid frame, wired to the resolver above. */
function PolaroidPhoto({
  resolved,
}: {
  resolved: ReturnType<typeof useResolvedPhoto>;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={resolved.imgRef}
      src={resolved.src}
      srcSet={resolved.srcSet}
      // The frames are 195-215px wide; one `sizes` covers all three.
      sizes="205px"
      alt={resolved.caption}
      onError={resolved.onError}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
      draggable={false}
    />
  );
}

// ── Mobile polaroid ──────────────────────────────────────────────────
// Same visuals as the desktop PolaroidFrame, but flow-positioned (block)
// inside the mobile strip instead of absolutely pinned. Drag teleports to
// absolute on commit so users can scatter them around the strip.
//
// Drag has to share the gesture space with page scrolling here, which the
// desktop frame never had to: the strip is ~60% of the viewport width and
// runs ~1000px down the page, so swallowing every touch (touch-action:
// none, what the desktop frame does) turned most of /about into a scroll
// dead zone. Two changes buy scrolling back:
//   1. touch-action: pan-y — the browser keeps vertical panning.
//   2. the drag only COMMITS once the gesture proves horizontal-dominant
//      (see DRAG_INTENT_PX). Committing on pointerdown like the desktop
//      frame does isn't enough to fix on its own — the first ambiguous
//      pointermoves of a vertical swipe would still write `pos` and rip
//      the polaroid out of the flow before the browser claimed the
//      gesture for scrolling.
// A vertical swipe therefore abandons the candidate drag and scrolls; the
// polaroid never moves. Mouse has no scroll conflict, so it commits on
// movement in any direction.
const DRAG_INTENT_PX = 8;

function MobilePolaroidFrame({
  photo,
  rotation,
  delayMs,
}: {
  photo: Photo;
  rotation: number;
  delayMs: number;
}) {
  const pageAnimate = usePageAnimate();
  const resolved = useResolvedPhoto(photo);
  // `tracking`: a pointer is down and the gesture may become a drag.
  // `dragging`: the gesture committed — drives every visual (scale,
  // shadow, cursor, z-index) and gates writes to `pos`.
  const [tracking, setTracking] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  // Mirrors `dragging` for the move listener, which can't re-subscribe
  // mid-gesture to see fresh state.
  const committedRef = useRef(false);
  const startRef = useRef<{ x: number; y: number; touch: boolean } | null>(
    null,
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (!elRef.current) return;
    // Mouse only: suppresses text selection and the native image drag.
    // On touch it would buy nothing (touch-action governs scrolling) and
    // we want the browser's panning intact until the gesture commits.
    if (e.pointerType === "mouse") e.preventDefault();
    const rect = elRef.current.getBoundingClientRect();
    offsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      touch: e.pointerType !== "mouse",
    };
    committedRef.current = false;
    setTracking(true);
  };

  useEffect(() => {
    if (!tracking) return;

    const stop = () => {
      committedRef.current = false;
      startRef.current = null;
      setTracking(false);
      setDragging(false);
    };

    const onMove = (e: PointerEvent) => {
      const start = startRef.current;
      if (!start) return;

      if (!committedRef.current) {
        const dx = Math.abs(e.clientX - start.x);
        const dy = Math.abs(e.clientY - start.y);
        if (start.touch) {
          // Vertical intent — the browser owns this gesture. Stand down
          // so pan-y scrolls the page and the polaroid stays in flow.
          if (dy > dx && dy > DRAG_INTENT_PX) {
            stop();
            return;
          }
          // Not yet horizontal enough to call it: wait for more movement
          // rather than guessing.
          if (dx <= DRAG_INTENT_PX || dx < dy) return;
        } else if (Math.max(dx, dy) <= DRAG_INTENT_PX) {
          return;
        }
        committedRef.current = true;
        setDragging(true);
      }

      const parent = elRef.current?.offsetParent as HTMLElement | null;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      setPos({
        x: e.clientX - parentRect.left + parent.scrollLeft - offsetRef.current.x,
        y: e.clientY - parentRect.top + parent.scrollTop - offsetRef.current.y,
      });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [tracking]);

  const positionStyle: CSSProperties = pos
    ? { position: "absolute", left: pos.x, top: pos.y }
    : { position: "relative" };

  return (
    <div
      ref={elRef}
      onPointerDown={onPointerDown}
      style={{
        ...positionStyle,
        width: 200,
        transform: `rotate(${rotation}deg) scale(${dragging ? 1.03 : 1})`,
        transition: dragging
          ? "filter 300ms ease"
          : "transform 340ms cubic-bezier(0.22, 1, 0.36, 1), filter 300ms ease",
        filter: dragging
          ? "drop-shadow(8px 14px 22px rgba(0,0,0,0.28))"
          : "drop-shadow(3px 6px 10px rgba(0,0,0,0.18))",
        animationName: "fadeIn",
        animationDuration: "0.8s",
        animationTimingFunction: "ease",
        animationDelay: `${delayMs}ms`,
        animationFillMode: "both",
        animationPlayState: pageAnimate ? "running" : "paused",
        cursor: dragging ? "grabbing" : "grab",
        zIndex: dragging ? 10 : 3,
        userSelect: "none",
        // pan-y, not none — see the gesture note above the component.
        touchAction: "pan-y",
      }}
    >
      <div
        style={{
          background: "var(--color-card)",
          padding: "var(--pad-chip) var(--pad-chip) 36px var(--pad-chip)",
          border: "1px solid var(--color-card-border)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4 / 5",
            overflow: "hidden",
            background: "var(--color-card-well)",
          }}
        >
          <PolaroidPhoto resolved={resolved} />
        </div>
        <div
          style={{
            fontFamily: "var(--font-script)",
            fontSize: "var(--fs-script)",
            color: "var(--color-ink)",
            opacity: 0.75,
            textAlign: "center",
            marginTop: 6,
            lineHeight: 1.1,
          }}
        >
          {resolved.caption}
        </div>
      </div>
      <TapeStrip
        style={{
          top: -10,
          left: "50%",
          transform: "translateX(-50%) rotate(-5deg)",
        }}
      />
    </div>
  );
}

// ── Sticker icons ────────────────────────────────────────────────────

function CoffeeCupIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* steam */}
      <path
        d="M 10 7 q 1.5 -2.5 0 -5"
        stroke="#8a7c5a"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M 15 7 q 1.5 -2.5 0 -5"
        stroke="#8a7c5a"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M 20 7 q 1.5 -2.5 0 -5"
        stroke="#8a7c5a"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* cup body */}
      <path
        d="M 6 11 L 7.5 22 Q 8 24.5 10.5 24.5 L 19.5 24.5 Q 22 24.5 22.5 22 L 24 11 Z"
        fill="#a86938"
        stroke="#4d2a14"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* handle */}
      <path
        d="M 24 13 Q 28 14 27 18 Q 26 21 22.5 20.5"
        stroke="#4d2a14"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      {/* coffee surface */}
      <ellipse cx="15" cy="11" rx="8.5" ry="1.4" fill="#2b160a" />
    </svg>
  );
}

function ShuttlecockIcon() {
  // Feathered skirt over a cork base, angled as though mid-flight.
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      aria-hidden
      style={{ display: "block" }}
    >
      <g transform="rotate(20 17 17)">
        {/* skirt */}
        <path
          d="M 12 19 L 22 19 L 27 5 L 7 5 Z"
          fill="#f4f5f8"
          stroke="#8c93a3"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        {/* feather separations */}
        <g stroke="#8c93a3" strokeWidth="0.8">
          <line x1="15" y1="19" x2="12.5" y2="5.4" />
          <line x1="19" y1="19" x2="21.5" y2="5.4" />
          <line x1="17" y1="19" x2="17" y2="5" />
        </g>
        {/* binding thread */}
        <line
          x1="10.4"
          y1="12"
          x2="23.6"
          y2="12"
          stroke="#8c93a3"
          strokeWidth="0.8"
        />
        {/* cork base */}
        <ellipse
          cx="17"
          cy="21.5"
          rx="5.6"
          ry="4.6"
          fill="#ff8a60"
          stroke="#a34a28"
          strokeWidth="0.9"
        />
      </g>
    </svg>
  );
}

function RaceCarIcon() {
  // Open-wheel car in profile — front and rear wings, airbox, big tyres.
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* body */}
      <path
        d="M 3 20 L 8 20 L 11 16 L 20 15.5 L 24 17 L 31 17.5 L 31 20 L 3 20 Z"
        fill="#ff5b5b"
        stroke="#7a1f14"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* cockpit + halo */}
      <path
        d="M 14 15.5 Q 16.5 12 19.5 13.5"
        stroke="#f4f5f8"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      {/* airbox */}
      <path d="M 20 15.5 L 21.5 11.5 L 23.5 15.5 Z" fill="#c83a1d" />
      {/* front wing */}
      <rect x="1.5" y="20" width="7" height="2" rx="0.8" fill="#c6cbd7" />
      {/* rear wing */}
      <rect x="28" y="11.5" width="5" height="2" rx="0.8" fill="#c6cbd7" />
      <line
        x1="30.5"
        y1="13.5"
        x2="30.5"
        y2="17.5"
        stroke="#c6cbd7"
        strokeWidth="1.2"
      />
      {/* tyres */}
      <circle cx="10" cy="23" r="4.6" fill="#15171d" stroke="#4f5666" strokeWidth="1" />
      <circle cx="10" cy="23" r="1.6" fill="#8c93a3" />
      <circle cx="25" cy="23" r="4.6" fill="#15171d" stroke="#4f5666" strokeWidth="1" />
      <circle cx="25" cy="23" r="1.6" fill="#8c93a3" />
    </svg>
  );
}

function DumbbellIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      aria-hidden
      style={{ display: "block" }}
    >
      <g transform="rotate(-20 17 17)">
        {/* bar */}
        <rect x="10" y="15.6" width="14" height="2.8" rx="1.2" fill="#8c93a3" />
        {/* inner plates */}
        <rect x="7" y="11" width="4" height="12" rx="1.4" fill="#c6cbd7" />
        <rect x="23" y="11" width="4" height="12" rx="1.4" fill="#c6cbd7" />
        {/* outer plates */}
        <rect x="3.5" y="13" width="3.5" height="8" rx="1.2" fill="#5ad1ff" />
        <rect x="27" y="13" width="3.5" height="8" rx="1.2" fill="#5ad1ff" />
      </g>
    </svg>
  );
}

// ── Polaroid ─────────────────────────────────────────────────────────

function PolaroidFrame({
  polaroid,
  delayMs,
}: {
  polaroid: Polaroid;
  delayMs: number;
}) {
  const pageAnimate = usePageAnimate();
  const resolved = useResolvedPhoto(polaroid);
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Null until the user drags → then absolute (x, y) in the content
  // panel's coordinate space. Stays put on release; resets on reload.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const elRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (!elRef.current) return;
    e.preventDefault();
    const rect = elRef.current.getBoundingClientRect();
    offsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const parent = elRef.current?.offsetParent as HTMLElement | null;
      if (!parent) return;
      // e.clientX/Y are viewport coords; parentRect.left/top are the
      // scroll container's viewport position. Subtracting gives pointer
      // position inside the VISIBLE area of the container — but we're
      // about to write pos into CSS left/top, which is interpreted in
      // CONTENT coords (scroll-offset-aware). Add scrollLeft/scrollTop
      // to convert visible coords → content coords. Without this, a
      // polaroid picked up while the page is scrolled jumps up by
      // `scrollTop` pixels.
      const parentRect = parent.getBoundingClientRect();
      setPos({
        x: e.clientX - parentRect.left + parent.scrollLeft - offsetRef.current.x,
        y: e.clientY - parentRect.top + parent.scrollTop - offsetRef.current.y,
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging]);

  const positionStyle: CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto" }
    : { top: polaroid.top, right: polaroid.right };

  return (
    <div
      ref={elRef}
      onPointerDown={onPointerDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "absolute",
        ...positionStyle,
        width: polaroid.width,
        transform: `rotate(${polaroid.rotation}deg) scale(${
          hover || dragging ? 1.03 : 1
        })`,
        // Kill the transform transition while dragging so the polaroid
        // tracks the cursor 1:1 instead of lagging.
        transition: dragging
          ? "filter 300ms ease"
          : "transform 340ms cubic-bezier(0.22, 1, 0.36, 1), filter 300ms ease",
        filter:
          hover || dragging
            ? "drop-shadow(8px 14px 22px rgba(0,0,0,0.28))"
            : "drop-shadow(3px 6px 10px rgba(0,0,0,0.18))",
        // Longhand props so animationPlayState can gate the fade on
        // pageAnimate without mixing with the `animation` shorthand.
        animationName: "fadeIn",
        animationDuration: "0.8s",
        animationTimingFunction: "ease",
        animationDelay: `${delayMs}ms`,
        animationFillMode: "both",
        animationPlayState: pageAnimate ? "running" : "paused",
        cursor: dragging ? "grabbing" : "grab",
        zIndex: dragging ? 10 : 3,
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {/* White polaroid frame */}
      <div
        style={{
          background: "var(--color-card)",
          padding: "var(--pad-chip) var(--pad-chip) 44px var(--pad-chip)",
          border: "1px solid var(--color-card-border)",
        }}
      >
        {/* Photo */}
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4 / 5",
            overflow: "hidden",
            background: "var(--color-card-well)",
          }}
        >
          <PolaroidPhoto resolved={resolved} />
        </div>
        {/* Handwritten caption */}
        <div
          style={{
            fontFamily: "var(--font-script)",
            fontSize: "var(--fs-script)",
            color: "var(--color-ink)",
            opacity: 0.75,
            textAlign: "center",
            marginTop: 8,
            lineHeight: 1.1,
          }}
        >
          {resolved.caption}
        </div>
      </div>
      {/* Tape strip at top */}
      <TapeStrip
        style={{
          top: -10,
          left: "50%",
          transform: "translateX(-50%) rotate(-5deg)",
        }}
      />
    </div>
  );
}

function TapeStrip({ style }: { style: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        width: 68,
        height: 20,
        background: "rgba(200, 230, 240, 0.5)",
        border: "1px solid rgba(0, 80, 120, 0.08)",
        backdropFilter: "blur(1px)",
        ...style,
      }}
    />
  );
}

// ── Margin note ──────────────────────────────────────────────────────

function MarginNote({
  text,
  top,
  left,
  right,
  rotate,
  delayMs,
}: {
  text: string;
  top: string;
  left?: string;
  right?: string;
  rotate: number;
  delayMs: number;
}) {
  const pageAnimate = usePageAnimate();
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top,
        left,
        right,
        transform: `rotate(${rotate}deg)`,
        fontFamily: "var(--font-script)",
        fontSize: "var(--fs-chip)",
        color: "var(--color-ink)",
        opacity: 0.55,
        lineHeight: 1.15,
        whiteSpace: "pre-line",
        pointerEvents: "none",
        maxWidth: 120,
        animationName: "fadeIn",
        animationDuration: "0.9s",
        animationTimingFunction: "ease",
        animationDelay: `${delayMs}ms`,
        animationFillMode: "both",
        animationPlayState: pageAnimate ? "running" : "paused",
        zIndex: 2,
      }}
    >
      {text}
    </div>
  );
}

// ── RevealOnMount ────────────────────────────────────────────────────

/**
 * Defers rendering its child until `delayMs` has elapsed so paragraphs
 * start their HandwrittenText reveal sequentially instead of all at once.
 */
function RevealOnMount({
  delayMs,
  children,
}: {
  delayMs: number;
  children: React.ReactNode;
}) {
  // Hold at opening frame (don't render children) until the host page
  // is ready — i.e., its flip-in has landed. When `pageAnimate` flips
  // to true, start the delay timer and reveal. When it flips back to
  // false (user navigates away), reset so the next revisit plays the
  // reveal again from scratch.
  const pageAnimate = usePageAnimate();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!pageAnimate) {
      setShown(false);
      return;
    }
    if (shown) return;
    const t = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs, shown, pageAnimate]);

  return <>{shown ? children : null}</>;
}
