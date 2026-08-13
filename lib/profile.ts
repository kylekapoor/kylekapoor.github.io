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
  location: "Toronto, Ontario",
  /** What he does, as a standalone sentence. Composed with the school
   *  and location by callers, so it deliberately doesn't repeat either. */
  tagline: "I build things that model messy systems.",
  /** The short self-introduction, for when there's room for one line. */
  elevator: "CS @ Waterloo. I build things that model messy systems.",
  status: "Seeking 2026 & 2027 internships.",
} as const;

export const CONTACT = {
  email: "kylekapoor411@gmail.com",
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
 * `blurb` is the ONE LINE the bot is allowed to say about an entry —
 * it never elaborates past this, never invents metrics, and never
 * reconstructs "resume bullets" that aren't written here. If you want
 * the bot to say more about a role, lengthen the blurb; don't expect it
 * to fill gaps on its own.
 *
 * To add a real internship: copy an entry, keep the same field shape.
 * `logoText` renders as initials in a sticker frame when there's no
 * logo image to point at.
 */
export type ExperienceEntry = {
  org: string;
  title: string;
  dates: string;
  location?: string;
  /** The single line the bot may repeat. Keep it true and keep it short. */
  blurb: string;
  logoText: string;
  logoRotation: number;
  stickerBg?: string;
  url?: string;
};

export const EXPERIENCE: ExperienceEntry[] = [
  {
    org: "University of Waterloo",
    title: "Computer Science",
    dates: "Present",
    location: "Waterloo",
    blurb:
      "CS undergrad — algorithms, systems, and a standing habit of turning coursework into side projects.",
    logoText: "UW",
    logoRotation: -4,
    stickerBg: "#2a2118",
    url: "https://uwaterloo.ca/",
  },
  {
    org: "drift-stream",
    title: "Streaming ML Infrastructure",
    dates: "2026",
    blurb:
      "Real-time streaming inference pipeline with PSI drift detection and automatic retraining.",
    logoText: "DS",
    logoRotation: 5,
    url: "https://github.com/kylekapoor/drift-stream",
  },
  {
    org: "f1-tyre-strategy",
    title: "Race Strategy Modelling",
    dates: "2026",
    blurb:
      "Tyre degradation modelling and Monte Carlo pit-stop strategy optimisation for Formula 1.",
    logoText: "F1",
    logoRotation: -3,
    stickerBg: "#2b1a1a",
    url: "https://github.com/kylekapoor/f1-tyre-strategy",
  },
  {
    org: "redteam-sandbox",
    title: "LLM Safety Research",
    dates: "2026",
    blurb:
      "Genetic-algorithm adversarial red-teaming harness that stress-tests layered LLM guardrails.",
    logoText: "RT",
    logoRotation: 4,
    url: "https://github.com/kylekapoor/redteam-sandbox",
  },
  {
    org: "bl-robo-advisor",
    title: "Quantitative Portfolio Tooling",
    dates: "2026",
    blurb:
      "Black-Litterman portfolio optimiser driven by LLM-generated, schema-enforced market views.",
    logoText: "BL",
    logoRotation: -5,
    url: "https://github.com/kylekapoor/bl-robo-advisor",
  },
];

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
  {
    name: "PII-Data-RAG-Pipeline",
    repo: "https://github.com/kylekapoor/PII-Data-RAG-Pipeline",
    cover: "/projects/pii-rag.svg",
    caption: "retrieval that keeps secrets",
    blurb:
      "A retrieval pipeline built around handling personally identifiable data carefully.",
    stack: "Jupyter",
    rotation: -2,
  },
  {
    name: "LLM-Reasoning-Agent",
    repo: "https://github.com/kylekapoor/LLM-Reasoning-Agent",
    cover: "/projects/llm-reasoning-agent.svg",
    caption: "making a model show its work",
    blurb: "An agent harness for experimenting with LLM reasoning strategies.",
    stack: "Jupyter",
    rotation: 3,
  },
];

/**
 * The human layer. Kept short on purpose — the bot pulls from this for
 * "what's he actually like" questions and nothing here should be a
 * claim that could embarrass anyone if quoted back verbatim.
 */
export const INTERESTS = {
  cars:
    "Formula 1 is the big one — race strategy, tyre models, the engineering side more than the drama. Cars generally.",
  badminton: "Badminton. Plays properly, not the backyard version.",
  gym: "Gym is the non-negotiable part of the week.",
  basketball: "NBA fan — watches more of it than is strictly reasonable.",
  coffee: "Coffee, in quantity, mostly while waiting for a build to finish.",
  city: "Toronto — walks downtown, watches the traffic, thinks about systems.",
} as const;
