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
  degree: "Bachelor of Mathematics, Computer Science",
  gradYear: "2028",
  location: "Toronto, Ontario",
  /** What he does, as a standalone sentence. Composed with the school
   *  and location by callers, so it deliberately doesn't repeat either. */
  tagline: "I build things that model messy systems.",
  /** The short self-introduction, for when there's room for one line. */
  elevator: "CS @ Waterloo. I build things that model messy systems.",
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
  /**
   * Resume bullets, rendered on the experience page only. The chatbot
   * never reads these — it answers from `blurb` — so detail can live
   * here for a human reader without the bot paraphrasing a metric into
   * something that isn't quite what the resume says.
   */
  details?: string[];
  logoText: string;
  logoRotation: number;
  stickerBg?: string;
  url?: string;
};

/** Newest first. Education anchors the bottom of the list. */
export const EXPERIENCE: ExperienceEntry[] = [
  {
    org: "Forum Asset Management",
    title: "Software Engineer Intern — FinTech + Applied AI",
    dates: "Jun 2026 – Aug 2026",
    location: "Toronto",
    // Deliberately just the one line: Kyle flagged that the Forum
    // bullets on his resume are still being rewritten, so there is
    // nothing here for the page or the bot to overstate. Add `details`
    // once the real bullets exist.
    blurb:
      "AI infrastructure for the investor relations, private equity, and real estate teams.",
    logoText: "FA",
    logoRotation: -4,
    stickerBg: "#1c2231",
    url: "https://www.forumam.com/",
  },
  {
    org: "IrisGo",
    title: "Software Engineer Intern — Applied AI",
    dates: "Sep 2025 – Dec 2025",
    location: "Palo Alto, CA",
    blurb:
      "Built the RAG stack behind an AI document assistant — cut query latency from 3s to under 500ms.",
    details: [
      "Engineered RAG pipeline with LangChain, ChromaDB, MinIO, FastAPI, reducing query latency from 3s to <500ms",
      "Improved retrieval precision by 25% through multi-query expansion, ColQwen2 reranking, and reciprocal rank fusion",
      "Built document ingestion system using Docling, Pulse, Unstructured parsers with Huey queues for 100-file batches",
      "Implemented a Redis-based semantic cache for storing agent responses, reducing queries sent to LLM by 30%",
      "Developed Electron and React frontend, implementing hotkey triggers and screen-capture OCR for AI interactions",
    ],
    logoText: "IG",
    logoRotation: 5,
    stickerBg: "#16241f",
    url: "https://www.irisgo.ca/",
  },
  {
    org: "Ontario Power Generation",
    title: "Software Engineer Intern — Full-Stack",
    dates: "Sep 2024 – Dec 2024",
    location: "Toronto",
    blurb:
      "Moved legacy MS Access systems onto ASP.NET MVC and Angular, serving 11K+ API requests a day.",
    details: [
      "Migrated legacy MS Access systems to ASP.NET MVC apps using SQL Server and C# LINQ queries in EF Core",
      "Built 25+ Angular and TypeScript UI components with async/await patterns and reactive forms in Agile sprints",
      "Enabled 200+ concurrent PO submissions and eliminated 15+ weekly database lock errors, saving $8K annually",
      "Architected RESTful APIs in .NET Core using DI and OAuth 2.0 authentication, handling 11K+ daily requests",
      "Established Azure DevOps CI/CD pipelines, cutting deployment time by 30mins and reducing failures by 50%",
    ],
    logoText: "OPG",
    logoRotation: -3,
    stickerBg: "#2b1a1a",
    url: "https://www.opg.com/",
  },
  {
    org: "Ontario Power Generation",
    title: "Software Engineer Intern — Data",
    dates: "May 2024 – Aug 2024",
    location: "Toronto",
    blurb:
      "Built the ETL and BI layer for 150+ analysts — dropped critical report runtimes from an hour to two minutes.",
    details: [
      "Built SQL Server to Power BI ETL pipelines integrating Engineering SCR, HIT Tracking, AS9 GDAR systems",
      "Automated data workflows for 150+ analysts across Fuel Handling, Supply Chain, Nuclear Security departments",
      "Optimized 20+ ad-hoc SQL queries and stored procedures via strategic indexing and execution plan refactoring",
      "Reduced critical report runtimes from >60mins to 2mins, enabling faster operational decisions for 75+ stakeholders",
      "Created BI dashboards with row-level security and scheduled refreshes for CNSC reporting and departmental KPIs",
    ],
    logoText: "OPG",
    logoRotation: 4,
    stickerBg: "#2b1a1a",
    url: "https://www.opg.com/",
  },
  {
    org: "University of Waterloo",
    title: "Bachelor of Mathematics, Computer Science",
    dates: "2023 – 2028",
    location: "Waterloo",
    blurb:
      "Math and CS at Waterloo — algorithms, systems, and a standing habit of turning coursework into side projects.",
    logoText: "UW",
    logoRotation: -5,
    stickerBg: "#2a2118",
    url: "https://uwaterloo.ca/",
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
      "Agent workflow over classified documents — 5TB processed into vector embeddings behind a LangChain and Pinecone RAG pipeline.",
    stack: "Python",
    rotation: -2,
  },
  {
    name: "LLM-Reasoning-Agent",
    repo: "https://github.com/kylekapoor/LLM-Reasoning-Agent",
    cover: "/projects/llm-reasoning-agent.svg",
    caption: "making a model show its work",
    blurb:
      "Planner, executor, and evaluator loop with short- and long-term memory over a 10K context.",
    stack: "Python",
    rotation: 3,
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
 * The human layer. Kept short on purpose — the bot pulls from this for
 * "what's he actually like" questions and nothing here should be a
 * claim that could embarrass anyone if quoted back verbatim.
 */
export const INTERESTS = {
  cars:
    "Formula 1 is the big one — race strategy, tyre models, the engineering side more than the drama. Cars generally.",
  badminton: "Badminton. Plays properly, not the backyard version.",
  gym: "Gym and fitness — the non-negotiable part of the week.",
  basketball: "NBA fan — watches more of it than is strictly reasonable.",
  chess: "Chess.",
  investing: "Stocks and investing, which is how half his side projects start.",
  reading: "Reading, and travelling when there's a window for it.",
  coffee: "Coffee, in quantity, mostly while waiting for a build to finish.",
  city: "Toronto — walks downtown, watches the traffic, thinks about systems.",
} as const;

/**
 * Outside-of-class involvement. Numbers are quoted from Kyle's resume
 * exactly; don't round them or restate them as approximations.
 */
export const ACTIVITIES = [
  "Project Millionaire Canada — 20k+ students across 5 countries, a CPA Ontario partnership, $7.5k+ raised.",
  "Students Overseas Foundation Canada — 205+ students a year, a Chipotle partnership, $5.1k+ funding per quarter.",
] as const;
