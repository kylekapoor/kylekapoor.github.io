"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { asset } from "@/lib/basePath";
import { PROJECTS, type Project } from "@/lib/profile";
import { PageBackButton } from "../chrome/PageBackButton";
import { PageCorner } from "../chrome/PageCorner";
import { Paper } from "../chrome/Paper";
import {
  PageAnimateContext,
  usePageAnimate,
} from "../primitives/PageAnimateContext";

/**
 * Projects — a stacked-card carousel. The prev/next arrows step through
 * one project at a time and clicking the card's artwork opens that
 * project's GitHub repo in a new tab.
 *
 * Card data lives in lib/profile.ts so the chatbot and this page can
 * never disagree about what Kyle has built.
 */

const CARD_WIDTH = 400;
const CARD_HEIGHT = 460;
// Mobile: card sized to leave room for prev/next arrows + breathing room.
const MOBILE_CARD_WIDTH = 240;
const MOBILE_CARD_HEIGHT = 300;
const SWIPE_THRESHOLD_PX = 60;

// Fade-in choreography: each card appears in place, strictly one at a
// time, back-to-front with a left-then-right tiebreak within each depth.
const CARD_FADE_MS = 400;
const CARD_STAGGER_MS = 150;

function cardFadeDelay(offset: number): number {
  // Slot by depth (deepest first), left before right within a depth:
  //   offset=-2 → 0ms      offset=+2 → 150ms
  //   offset=-1 → 300ms    offset=+1 → 450ms
  //   offset= 0 → 600ms
  const absOff = Math.abs(offset);
  const base = (2 - Math.min(absOff, 2)) * CARD_STAGGER_MS * 2;
  const sideBump = absOff > 0 && offset > 0 ? CARD_STAGGER_MS : 0;
  return base + sideBump;
}

export function ProjectsPage({
  onClose,
  active = true,
  animate = true,
  sessionKey = 0,
}: {
  onClose: () => void;
  /** True only while this is the page the user is looking at. Gates the
   *  window-level arrow-key listener — see the effect below. */
  active?: boolean;
  animate?: boolean;
  sessionKey?: number;
}) {
  const isMobile = useIsMobile();
  const [index, setIndex] = useState(0);
  const cardWidth = isMobile ? MOBILE_CARD_WIDTH : CARD_WIDTH;
  const cardHeight = isMobile ? MOBILE_CARD_HEIGHT : CARD_HEIGHT;

  const next = useCallback(
    () => setIndex((i) => (i + 1) % PROJECTS.length),
    [],
  );
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + PROJECTS.length) % PROJECTS.length),
    [],
  );

  // Arrow-key carousel control. Gated on `active`: this page stays
  // mounted after it's been visited, so an ungated window listener would
  // steal ArrowLeft/ArrowRight from whatever page the user flipped to and
  // silently advance the carousel behind their back.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, prev]);

  // Touch swipe — horizontal swipe past SWIPE_THRESHOLD_PX advances the
  // carousel. Bound to the carousel container only.
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    if (!t) return;
    swipeStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) next();
    else prev();
  };

  const current = PROJECTS[index];

  return (
    <PageAnimateContext.Provider value={{ animate, sessionKey }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <Paper ruled={false} marginRule={false} />

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
            display: "flex",
            flexDirection: "column",
            // Ruled lines travel with the content on scroll.
            backgroundImage: "var(--rule-background)",
            backgroundAttachment: "local",
          }}
        >
          <PageBackButton onClose={onClose} />

          {/* Page label */}
          <div
            style={{
              position: "absolute",
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
            journal · projects
          </div>

          {/* Page title */}
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
            projects
          </h1>

          {/* Subline */}
          <p
            style={{
              fontFamily: "var(--font-script)",
              fontSize: "var(--fs-script)",
              color: "var(--color-ink-soft)",
              opacity: 0.75,
              margin: 0,
              // A full rule of clearance, not a fraction: the title is
              // set at --fs-display, and the descenders on "projects"
              // reach into the line below it. A whole --line keeps the
              // subline on the baseline grid.
              marginTop: "var(--line)",
              marginBottom: "var(--line)",
              lineHeight: "var(--line)",
              maxWidth: 560,
            }}
          >
            arrows step through them — click a card to open the repo on
            GitHub.
          </p>

          {/* Stacked card carousel */}
          <div
            onTouchStart={isMobile ? onTouchStart : undefined}
            onTouchEnd={isMobile ? onTouchEnd : undefined}
            style={{
              position: "relative",
              height: isMobile
                ? "calc(var(--line) * 12)"
                : "calc(var(--line) * 15)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isMobile ? 8 : 60,
            }}
          >
            <NavArrow direction="prev" onClick={prev} compact={isMobile} />

            <div
              style={{
                position: "relative",
                width: cardWidth,
                height: cardHeight,
                perspective: "1800px",
                flexShrink: 0,
              }}
            >
              {PROJECTS.map((project, i) => {
                const offset = computeOffset(i, index, PROJECTS.length);
                const absOff = Math.abs(offset);
                const fadeDelay = cardFadeDelay(offset);
                // z-index lives on the wrapper: its opacity animation
                // creates a stacking context while playing, which would
                // otherwise trap the card's own z-index inside.
                return (
                  <CardFadeWrapper
                    key={`${sessionKey}-${project.repo}`}
                    delayMs={fadeDelay}
                    zIndex={10 - absOff}
                  >
                    <ProjectCard
                      project={project}
                      offset={offset}
                      compact={isMobile}
                      onClick={() => {
                        // Clicking a card behind the top one brings it to
                        // the front rather than navigating — feels like
                        // "flipping to it" instead of a misfire.
                        if (i !== index) {
                          setIndex(i);
                          return false;
                        }
                        return true;
                      }}
                    />
                  </CardFadeWrapper>
                );
              })}
            </div>

            <NavArrow direction="next" onClick={next} compact={isMobile} />
          </div>

          {/* Current project's one-liner, under the stack. */}
          <div
            style={{
              fontFamily: "var(--font-script)",
              fontSize: "var(--fs-script)",
              color: "var(--color-ink)",
              opacity: 0.85,
              textAlign: "center",
              marginTop: "var(--line)",
              lineHeight: "var(--line)",
              maxWidth: 620,
              alignSelf: "center",
              // Balance the two lines instead of letting a stray word
              // ("...for Formula / 1.") sit alone on the second one.
              textWrap: "balance",
            }}
          >
            {current.blurb}
          </div>

          {/* Position indicator */}
          <div
            style={{
              fontFamily: "var(--font-script)",
              fontSize: "var(--fs-script)",
              color: "var(--color-ink-soft)",
              opacity: 0.7,
              textAlign: "center",
              marginTop: "calc(var(--line) * 0.5)",
              lineHeight: "var(--line)",
            }}
          >
            {index + 1} / {PROJECTS.length}
            <span style={{ marginLeft: 16, opacity: 0.75 }}>
              {isMobile ? "swipe to flip" : "← → to flip"}
            </span>
          </div>
        </div>

        <PageCorner pageNumber="03" />
      </div>
    </PageAnimateContext.Provider>
  );
}

// ── Card fade wrapper ─────────────────────────────────────────────────

/** Absolute-positioned wrapper that fades a card in at its final stacked
 *  position on mount. Pauses while the host page is held via
 *  PageAnimateContext; resumes once the flip-in lands.
 *
 *  Animation properties are longhand rather than the `animation`
 *  shorthand — mixing the shorthand with `animationPlayState` makes React
 *  warn about conflicting style updates. */
function CardFadeWrapper({
  delayMs,
  zIndex,
  children,
}: {
  delayMs: number;
  zIndex: number;
  children: React.ReactNode;
}) {
  const pageAnimate = usePageAnimate();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex,
        animationName: "linkedinCardDrop",
        animationDuration: `${CARD_FADE_MS}ms`,
        animationTimingFunction: "ease-out",
        animationDelay: `${delayMs}ms`,
        animationFillMode: "both",
        animationPlayState: pageAnimate ? "running" : "paused",
      }}
    >
      {children}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Signed offset from the current card. Positive = ahead of current;
 * negative = behind. Wraparound prefers the shorter direction so the
 * stack feels circular.
 */
function computeOffset(i: number, current: number, total: number): number {
  let d = i - current;
  if (d > total / 2) d -= total;
  if (d < -total / 2) d += total;
  return d;
}

// ── Project card ──────────────────────────────────────────────────────

function ProjectCard({
  project,
  offset,
  compact = false,
  onClick,
}: {
  project: Project;
  offset: number;
  /** Tighter sibling-card offsets when the card itself is small (mobile). */
  compact?: boolean;
  /** Returns true to allow the link navigation, false to intercept. */
  onClick: () => boolean;
}) {
  const isActive = offset === 0;
  const absOff = Math.abs(offset);

  // Cards behind the active one peek out from underneath, rotated and
  // shifted. Anything more than 2 away hides so the stack doesn't feel
  // bottomless.
  const translateX = offset * (compact ? 18 : 28);
  const translateY = absOff * (compact ? 6 : 8);
  const scale = 1 - absOff * 0.04;
  const rotation = isActive ? project.rotation : project.rotation + offset * 2;
  const opacity = absOff > 2 ? 0 : 1 - absOff * 0.18;

  const base: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "block",
    textDecoration: "none",
    color: "inherit",
    transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg) scale(${scale})`,
    transformOrigin: "center center",
    opacity,
    transition:
      "transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 520ms cubic-bezier(0.22, 1, 0.36, 1), filter 260ms ease",
    // Dark-theme lift: a black drop-shadow does nothing against a near-
    // black page, so the active card also gets a faint cool halo.
    filter: isActive
      ? "drop-shadow(0 14px 26px rgba(0,0,0,0.65)) drop-shadow(0 0 12px rgba(140,175,240,0.22))"
      : "drop-shadow(0 8px 16px rgba(0,0,0,0.5))",
    pointerEvents: opacity > 0 ? "auto" : "none",
    zIndex: 10 - absOff,
    cursor: "pointer",
  };

  return (
    <a
      href={project.repo}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${project.name} on GitHub`}
      onClick={(e) => {
        const allowNav = onClick();
        if (!allowNav) e.preventDefault();
      }}
      style={base}
    >
      {/* Polaroid-style frame */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "var(--color-card)",
          padding:
            "var(--pad-chip-wide) var(--pad-chip-wide) 52px var(--pad-chip-wide)",
          border: "1px solid var(--color-card-border)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          position: "relative",
        }}
      >
        {/* Cover art */}
        <div
          style={{
            flex: 1,
            position: "relative",
            background: "var(--color-card-well)",
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset(project.cover)}
            alt={`${project.name} — ${project.blurb}`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
            draggable={false}
          />
        </div>

        {/* Repo name, mono — this is the thing you'd type into GitHub. */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-hint)",
            letterSpacing: "0.08em",
            color: "var(--color-accent)",
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {project.name}
        </div>

        {/* Handwritten caption underneath */}
        <div
          style={{
            fontFamily: "var(--font-script)",
            fontSize: "var(--fs-script)",
            lineHeight: 1.1,
            color: "var(--color-ink)",
            opacity: 0.85,
            textAlign: "center",
          }}
        >
          {project.caption}
        </div>

        {/* Language tag, bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 14,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-kbd)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color:
              "color-mix(in srgb, var(--color-ink-soft) 55%, transparent)",
            pointerEvents: "none",
          }}
        >
          {project.stack}
        </div>

        {/* "github ↗" hint, bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            right: 12,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-kbd)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color:
              "color-mix(in srgb, var(--color-ink-soft) 55%, transparent)",
            pointerEvents: "none",
          }}
        >
          github ↗
        </div>
      </div>

      {/* Tape strip along the top — static; opacity is inherited from the
          CardFadeWrapper's fade so it appears together with its card. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -10,
          left: "50%",
          width: 80,
          height: 20,
          background: "rgba(150, 185, 225, 0.16)",
          border: "1px solid rgba(190, 215, 255, 0.14)",
          backdropFilter: "blur(1px)",
          transform: "translateX(-50%) rotate(-4deg)",
        }}
      />
    </a>
  );
}

// ── Nav arrow ─────────────────────────────────────────────────────────

function NavArrow({
  direction,
  onClick,
  compact = false,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Previous project" : "Next project"}
      style={{
        flexShrink: 0,
        background: "transparent",
        border: "none",
        padding: compact ? 6 : 12,
        cursor: "pointer",
        fontFamily: "var(--font-script)",
        fontSize: compact ? "var(--fs-md)" : "var(--fs-lg)",
        color: "var(--color-ink-soft)",
        opacity: 0.55,
        lineHeight: 1,
        transition: "opacity 180ms ease, transform 180ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.transform =
          direction === "prev" ? "translateX(-2px)" : "translateX(2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.55";
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      {direction === "prev" ? "←" : "→"}
    </button>
  );
}
