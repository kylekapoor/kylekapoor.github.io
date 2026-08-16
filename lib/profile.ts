/**
 * Single source of truth for everything the site claims about Kyle.
 *
 * Both the rendered pages AND the chatbot read from here. That's the
 * point: the bot can only say what this file says, so there's exactly
 * one place to edit when something changes and no way for the UI and
 * the chat answers to drift apart.
 *
 * Rule for anything added below: if it isn't verifiably true, it doesn't
 * go in. The bot's grounding layer (lib/llm/local.ts) treats every string
 * here as fact and will happily repeat it.
 */

export const IDENTITY = {
  fullName: "Kyle Kapoor",
  firstName: "Kyle",
  school: "University of Waterloo",
  program: "Computer Science",
  // Just CS — the site never frames it as a joint math degree.
  degree: "Computer Science",
  gradYear: "2028",
  location: "Toronto, Ontario",
  /** What he does, as a standalone sentence. Composed with the school
   *  and location by callers, so it deliberately doesn't repeat either.
   *  Kept in the same register as the /about copy — the bot shouldn't
   *  sound like a different person than the page. */
  tagline: "Deep in this era of AI tooling, and building with it constantly.",
  /** The short self-introduction, for when there's room for one line. */
  elevator: "CS @ Waterloo, grew up in Toronto. Building with AI tooling constantly.",
  status: "Seeking 2027 internships.",
} as const;

export const CONTACT = {
  email: "kyle.kapoor@uwaterloo.ca",
  linkedin: {
    display: "/in/kylekapoor",
    href: "https://www.linkedin.com/in/kylekapoor/",
  },
  github: {
    display: "/kylekapoor",
    href: "https://github.com/kylekapoor",
  },
  instagram: {
    display: "@kyle_kapoor",
    href: "https://www.instagram.com/kyle_kapoor/",
  },
} as const;

/**
 * Experience entries.
 *
 * Deliberately no description field. An entry is the company, the
 * title, the dates and `focus` — the type of engineering — and that is
 * the whole of what the site and the chatbot will say about a role.
 * Nothing here can be expanded into resume bullets because nothing here
 * contains them. If a role needs to say more, the honest fix is a
 * longer `focus`, not a paragraph the bot then has to be trusted with.
 *
 * To add a real internship: copy an entry, keep the same field shape.
 * `logoText` renders as initials in a sticker frame whenever `logoSrc`
 * is absent or its file is missing.
 */
export type ExperienceEntry = {
  org: string;
  title: string;
  /**
   * The kind of SWE work the role actually was — "Applied AI",
   * "Full-Stack", "Data". Rendered as a tag on the experience page.
   */
  focus: string;
  dates: string;
  location?: string;
  /**
   * Official company logo, served from /public/logos. Falls back to
   * `logoText` initials when the file isn't there, so an entry can name
   * a logo before the image exists without rendering a broken tile.
   */
  logoSrc?: string;
  logoText: string;
  logoRotation: number;
  stickerBg?: string;
  url?: string;
};

/** Work only, newest first. School lives in EDUCATION below. */
export const EXPERIENCE: ExperienceEntry[] = [
  {
    org: "Forum Asset Management",
    title: "Software Engineer Intern",
    focus: "FinTech + Applied AI",
    dates: "Jun 2026 – Aug 2026",
    location: "Toronto",
    logoSrc: "/logos/forum.png",
    logoText: "FA",
    logoRotation: -4,
    stickerBg: "#1c2231",
    url: "https://www.forumam.com/",
  },
  {
    org: "IrisGo",
    title: "Software Engineer Intern",
    focus: "Applied AI",
    dates: "Sep 2025 – Dec 2025",
    location: "Palo Alto",
    logoSrc: "/logos/irisgo.png",
    logoText: "IG",
    logoRotation: 5,
    stickerBg: "#16241f",
    url: "https://irisgo.ai/",
  },
  {
    org: "Ontario Power Generation",
    title: "Software Engineer Intern",
    focus: "Full-Stack",
    dates: "Sep 2024 – Dec 2024",
    location: "Toronto",
    logoSrc: "/logos/opg.png",
    logoText: "OPG",
    logoRotation: -3,
    stickerBg: "#12180f",
    url: "https://www.opg.com/",
  },
  {
    org: "Ontario Power Generation",
    title: "Software Engineer Intern",
    focus: "Data",
    dates: "May 2024 – Aug 2024",
    location: "Toronto",
    logoSrc: "/logos/opg.png",
    logoText: "OPG",
    logoRotation: 4,
    stickerBg: "#12180f",
    url: "https://www.opg.com/",
  },
];

/**
 * School. Deliberately NOT an EXPERIENCE entry — that list is work only,
 * so anything that needs the degree or the dates (the chat's "where does
 * he study" answer, mainly) reads them from here rather than assuming
 * education is the last row of the work history.
 */
export const EDUCATION = {
  school: IDENTITY.school,
  degree: IDENTITY.degree,
  dates: "2023 – 2028",
  location: "Waterloo",
} as const;

/**
 * Projects carousel. Each card links straight to the GitHub repo.
 * `cover` points at an SVG in /public/projects.
 */
export type Project = {
  name: string;
  repo: string;
  cover: string;
  /** Handwritten caption under the card. */
  caption: string;
  /** One-line description — also what the bot is allowed to say. */
  blurb: string;
  stack: string;
  rotation: number;
};

export const PROJECTS: Project[] = [
  {
    name: "f1-tyre-strategy",
    repo: "https://github.com/kylekapoor/f1-tyre-strategy",
    cover: "/projects/f1-tyre-strategy.svg",
    caption: "pit lane maths",
    blurb:
      "Tyre degradation modelling and Monte Carlo pit-strategy optimisation for Formula 1.",
    stack: "Python",
    rotation: 2,
  },
  {
    name: "drift-stream",
    repo: "https://github.com/kylekapoor/drift-stream",
    cover: "/projects/drift-stream.svg",
    caption: "models that notice they're wrong",
    blurb:
      "Real-time streaming inference pipeline with PSI drift detection and auto-retraining.",
    stack: "Python",
    rotation: -5,
  },
  {
    name: "redteam-sandbox",
    repo: "https://github.com/kylekapoor/redteam-sandbox",
    cover: "/projects/redteam-sandbox.svg",
    caption: "breaking guardrails on purpose",
    blurb:
      "Genetic-algorithm adversarial red-teaming harness with layered LLM guardrails.",
    stack: "Python",
    rotation: -3,
  },
  {
    name: "bl-robo-advisor",
    repo: "https://github.com/kylekapoor/bl-robo-advisor",
    cover: "/projects/bl-robo-advisor.svg",
    caption: "opinions, but schema-enforced",
    blurb:
      "Black-Litterman portfolio optimiser with LLM-generated, schema-enforced market views.",
    stack: "Python",
    rotation: 4,
  },
];

/**
 * Portrait photo, shown as the top-right polaroid on /about.
 *
 * This is wired up and pointing at `public/photos/kyle.jpg`. **Adding
 * that file is the only step** — no code change needed. Until it exists
 * the frame falls back to the Toronto illustration (see PolaroidPhoto in
 * AboutPage), so the page is complete either way and never shows a
 * broken image.
 *
 * Roughly 4:5 fits the frame best; other ratios are centre-cropped
 * rather than squashed. Set this to `null` to drop the portrait slot
 * entirely and go back to three illustrations.
 */
export const PORTRAIT: { src: string; caption: string } | null = {
  src: "/photos/kyle.jpg",
  caption: "banff, up top",
};

/**
 * The taped photo on the cover, captioned "that's me".
 *
 * Wants a **full-length / zoomed-out** shot — the frame is small and a
 * tight headshot loses its context at 112px wide. Save it as
 * `public/photos/kyle-banff.jpg` and it appears; until then the cover
 * simply doesn't render the scrap (see PhotoScrap in landing/Scraps).
 * Portrait orientation fits best; the frame centre-crops rather than
 * squashing. Set to `null` to drop it from the cover.
 */
export const COVER_PHOTO: { src: string; caption: string } | null = {
  src: "/photos/kyle-banff.jpg",
  caption: "that's me",
};

/**
 * The human layer. Kept short on purpose — the bot pulls from this for
 * "what's he actually like" questions and nothing here should be a
 * claim that could embarrass anyone if quoted back verbatim.
 */
export const INTERESTS = {
  // Watching vs. doing is a real distinction here and the copy should
  // keep it: F1 and the NBA are spectator obsessions, badminton and the
  // gym are what he actually goes out and does.
  f1: "Watches far too much Formula 1 — the strategy and the engineering more than the drama.",
  nba: "Watches a lot of NBA, too.",
  // His own joke, in his own words on /about. The bot may repeat it
  // because he wrote it; it may not invent new ones at his expense.
  badminton: "Plays badminton, and puts his own odds of winning at about 1%.",
  gym: "Permanently at the gym.",
  cars: "Cars — he follows the car market more closely than the stock market, and there is a stated plan to own a Ferrari before 25.",
  chess: "Chess.",
  investing: "Markets, mostly as the thing half his side projects start from.",
  reading: "Reads whatever book claims it'll make him a million dollars by tomorrow.",
  travel: "Flies to Europe on fairly thin excuses.",
  coffee: "Coffee, in quantity, mostly while waiting for a build to finish.",
  tech: "Deep in this era of AI tooling — realistically in Cursor or Claude Code at any hour of the day.",
  city: "Grew up in Toronto. Walks downtown, watches the traffic, thinks about systems.",
} as const;

/**
 * Outside-of-class involvement. Numbers are quoted from Kyle's resume
 * exactly; don't round them or restate them as approximations.
 */
export const ACTIVITIES = [
  "Project Millionaire Canada — 20k+ students across 5 countries, a CPA Ontario partnership, $7.5k+ raised.",
  "Students Overseas Foundation Canada — 205+ students a year, a Chipotle partnership, $5.1k+ funding per quarter.",
] as const;
