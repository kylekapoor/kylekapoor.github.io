/**
 * Local, grounded responder — the chatbot's default brain.
 *
 * Why this exists: every other provider in this directory needs an API
 * key, and a portfolio that answers "GITHUB_TOKEN not set" when a
 * recruiter types a question is worse than having no chatbot at all.
 * This provider needs no key, no network call, and no credit — it
 * answers from lib/profile.ts directly.
 *
 * The accuracy guarantee is the point. Every sentence it can produce is
 * either written in this file or copied verbatim from lib/profile.ts, so
 * it cannot invent an employer, inflate a metric, or say something
 * unflattering. When a question falls outside what it knows, it says so
 * and routes the user somewhere useful rather than guessing.
 *
 * For experience questions it names the company, the role type and the
 * dates, and stops. There is no description field in the profile for it
 * to read, so there is nothing to expand, paraphrase, or quietly turn
 * into a resume bullet.
 *
 * It speaks the AI SDK v4 data-stream protocol (via formatDataStreamPart)
 * so `useChat` on the client treats it exactly like a model-backed
 * provider, including tool calls that navigate the journal.
 */

import { createDataStreamResponse, formatDataStreamPart } from "ai";
import {
  CONTACT,
  EDUCATION,
  EXPERIENCE,
  IDENTITY,
  INTERESTS,
  PROJECTS,
} from "@/lib/profile";
import type { ToolName } from "@/lib/tools";
import type { ChatMessage } from "./index";

/** An answer the bot can give: some text, optionally opening a page. */
type Answer = {
  text: string;
  tool?: ToolName;
};

type Rule = {
  /** Matched against the lowercased user message. */
  test: RegExp;
  answer: () => Answer;
};

// ── Composed answer fragments ─────────────────────────────────────────

function experienceLines(): string {
  // Company, role type, dates. The profile holds nothing else about a
  // role, which is what makes this answer safe by construction.
  return EXPERIENCE.map(
    (e) => `• ${e.org} — ${e.focus} (${e.dates})`,
  ).join("\n");
}

function projectLines(): string {
  return PROJECTS.map((p) => `• ${p.name} — ${p.blurb}`).join("\n");
}

const ABOUT_TEXT =
  `3rd year ${IDENTITY.program} at the ${IDENTITY.school}, grew up in Toronto. ` +
  `${IDENTITY.tagline} ${IDENTITY.status}`;

const CONTACT_TEXT =
  `Email is the fastest: ${CONTACT.email}. ` +
  `LinkedIn ${CONTACT.linkedin.display}, GitHub ${CONTACT.github.display}, ` +
  `Instagram ${CONTACT.instagram.display}.`;

/**
 * Extra search terms per project, so "the F1 one" or "the drift thing"
 * resolves to a single project rather than dumping the whole list. Keyed
 * by the repo name in lib/profile.ts.
 */
const PROJECT_KEYWORDS: Record<string, RegExp> = {
  "f1-tyre-strategy": /\b(f1|formula\s*1|tyres?|tires?|pit|race\s*strateg|degradation|stint)\b/i,
  "drift-stream": /\b(drift|streaming|psi|retrain|inference\s*pipeline|fraud|card\s*transactions?|kafka)\b/i,
  "redteam-sandbox": /\b(red[\s-]?team|adversarial|guardrails?|jailbreak|genetic|password|prompt\s*injection)\b/i,
  "bl-robo-advisor": /\b(black[\s-]?litterman|portfolio|robo[\s-]?advisor|quant|market\s*views?|sec\s*filings?|stock\s*pick)\b/i,
};

/**
 * Terms that can only mean the project. `PROJECT_KEYWORDS` above needs
 * the word "project" nearby to fire, because "F1" and "fraud" are also
 * things Kyle is simply interested in. These are not ambiguous — nobody
 * types "robo advisor" or "Black-Litterman" meaning a hobby — so they
 * name the project on their own. Without this, "what's the robo
 * advisor" got the shrug.
 */
const PROJECT_STRONG_KEYWORDS: Record<string, RegExp> = {
  "f1-tyre-strategy": /\b((tyre|tire)\s*(deg\w*|strateg\w*|model)|pit\s*strateg\w*)\b/i,
  "drift-stream": /\b(drift[\s-]?stream|model\s*drift|data\s*drift)\b/i,
  "redteam-sandbox": /\b(red[\s-]?team\w*|jailbreak\w*|prompt\s*injection|guardrails?)\b/i,
  "bl-robo-advisor": /\b(robo[\s-]?advisor|black[\s-]?litterman)\b/i,
};

/**
 * A question naming one specific project. Checked before the general
 * projects rule so "tell me about the F1 project" gets that project's
 * line instead of the whole catalogue — and before the cars rule, so
 * "the f1 project" isn't answered as a hobby question.
 */
function specificProjectAnswer(message: string): Answer | null {
  // Some signal that the user means a *project*, not the hobby. Without
  // this, "do you like F1" would return a repo description. A strong
  // keyword or the repo name itself is signal enough on its own.
  const projectContext =
    /\b(project|repo|repositor|code|built|build|github|working\s+on|made)\b/i;
  const hasContext = projectContext.test(message);

  for (const project of PROJECTS) {
    const byName = message.toLowerCase().includes(project.name.toLowerCase());
    const strong = PROJECT_STRONG_KEYWORDS[project.name]?.test(message) ?? false;
    const named =
      byName ||
      strong ||
      (hasContext && (PROJECT_KEYWORDS[project.name]?.test(message) ?? false));
    if (!named) continue;
    return {
      text: `${project.name} — ${project.blurb} It's on GitHub: ${project.repo}`,
      tool: "showProjects",
    };
  }
  return null;
}

/**
 * Ways a user might name an employer. Keyed by `org` in lib/profile.ts.
 *
 * The University of Waterloo is deliberately absent — the dedicated
 * school rule below answers that one and adds his status, which is more
 * useful than the bare education line.
 */
const ORG_KEYWORDS: Record<string, RegExp> = {
  "Forum Asset Management": /\bforum(\s+asset)?\b/i,
  IrisGo: /\biris\s?go\b/i,
  "Ontario Power Generation": /\b(opg|ontario\s+power)\b/i,
};

/**
 * A question about one named employer — "what did he do at IrisGo".
 *
 * Answers with the role's title, type and dates. What the work actually
 * involved isn't published anywhere on the site, so the honest answer to
 * "what did he do there" is the type of engineering it was — a fuller
 * one would have to be invented. Both OPG terms match the same keyword,
 * so asking about OPG returns both rows rather than silently picking
 * one.
 */
function specificRoleAnswer(message: string): Answer | null {
  const matches = EXPERIENCE.filter((role) =>
    ORG_KEYWORDS[role.org]?.test(message),
  );
  if (matches.length === 0) return null;

  const lines = matches
    .map(
      (r) =>
        `${r.org} — ${r.title} (${r.focus}), ${r.dates}${r.location ? ` · ${r.location}` : ""}`,
    )
    .join("\n");
  return {
    text: lines,
    tool: "showExperience",
  };
}


// ── Topic answers ─────────────────────────────────────────────────────
//
// Named rather than inlined into the rules because the fuzzy matcher at
// the bottom of this file needs to reach the same answers. One question
// should get one answer whether it arrived by exact keyword or by a
// misspelling.

function schoolAnswer(): Answer {
  return {
    text: `${EDUCATION.degree} at the ${EDUCATION.school}, ${EDUCATION.dates}. ${IDENTITY.status}`,
    tool: "showExperience",
  };
}

function experienceAnswer(): Answer {
  return {
    text: `Here's the short version:\n${experienceLines()}`,
    tool: "showExperience",
  };
}

function projectsAnswer(): Answer {
  return {
    text: `Here's what he's built:\n${projectLines()}\n\nEvery card on the projects page opens the repo on GitHub.`,
    tool: "showProjects",
  };
}

function contactAnswer(): Answer {
  return { text: CONTACT_TEXT, tool: "showContact" };
}

function skillsAnswer(): Answer {
  return {
    text:
      `What the site publishes: the stack on each project — ${PROJECTS.map(
        (p) => `${p.name} (${p.stack})`,
      ).join(", ")} — and the kind of work each role was: ${[
        ...new Set(EXPERIENCE.map((e) => e.focus)),
      ].join(", ")}. ` +
      `The repos are public if you want the detail, and email him for anything past that — ${CONTACT.email}.`,
    tool: "showProjects",
  };
}

function hobbiesAnswer(): Answer {
  // A third-person read of the "Currently:" line on /about, in the same
  // order. When that copy changes this has to change with it, or the bot
  // starts describing a version of him the site no longer shows.
  return {
    text: `Too much F1 and NBA, losing at badminton, the gym more consistently than lectures, refreshing car listings like the prices are going to change, and the occasional evening lost to a LeetCode question he should have skipped.`,
  };
}

function locationAnswer(): Answer {
  return { text: `${IDENTITY.location}. ${INTERESTS.city}` };
}

function aboutAnswer(): Answer {
  return { text: ABOUT_TEXT, tool: "showAbout" };
}

/**
 * Rules are checked in order, so the specific ones go first. A question
 * mentioning both "projects" and "experience" should open projects,
 * because that's the narrower ask.
 */
const RULES: Rule[] = [
  // ── Greetings and small talk ────────────────────────────────────────
  {
    test: /^\s*(hi|hey|hello|yo|sup|howdy|good (morning|afternoon|evening))\b/i,
    answer: () => ({
      text: `Hey — I'm Kyle's journal. Ask me about his background, his projects, or how to reach him. The slash commands jump straight to a page.`,
    }),
  },
  {
    test: /\b(thanks|thank you|ty|appreciate it|cheers)\b/i,
    answer: () => ({ text: `Anytime. Anything else you want to dig into?` }),
  },

  // Availability sits above experience and contact deliberately: "is he
  // looking for work" contains "work", which the experience rule would
  // otherwise swallow and answer with a timeline.
  //
  // The bare word "internship" used to live here, and that was wrong in
  // both directions: "what was his last internship" and "how many
  // internships has he done" are work-history questions, and answering
  // them with "seeking 2027 internships" reads like the bot didn't
  // listen. Availability now needs a forward-looking phrase — looking
  // for, open to, available — and everything else about internships
  // falls through to the experience rule.
  {
    test: /\b(available|availability|looking\s+for\s+(work|a\s+role|a\s+job|an?\s+internships?)|open\s+to|opportunit(y|ies)|job\s+search|is\s+he\s+(free|open))\b/i,
    answer: () => ({
      text: `${IDENTITY.status} Best route is email — ${CONTACT.email}.`,
      tool: "showContact",
    }),
  },

  // ── Meta ────────────────────────────────────────────────────────────
  // Above skills and projects on purpose: both of these questions
  // are about the site, and both contain words ("made", "built")
  // that the projects rule claims — asked lower down they came back
  // with a list of repos.
  {
    // "what tech is this built on" and "why is this site a chatbot" are
    // both suggestion chips, so both have to land here rather than in
    // the fallback — a chip that answers "that's not on the site" makes
    // the whole chat look broken.
    test: /\b(this\s+(site|page)\s+(is\s+)?built|what\s+tech(nology)?\s+(is|was)\s+this|what\s+is\s+this\s+(site|built)|how\s+(was|did)\s+(this|you)\s+(site\s+)?(made|built)|who\s+(made|built|wrote)\s+(this|the\s+site)|framework|next\.?js|why\s+(is|does)\s+this\s+(site|page|thing)|why\s+a\s+chat|chat\s*bot)\b/i,
    answer: () => ({
      text: `Next.js 15 and the Vercel AI SDK, rendered as a spiral-bound journal. This chat answers from a single profile file, so it can't make things up about him.`,
    }),
  },
  {
    test: /\b(who\s+(are|r)\s+(you|u)|are\s+you\s+(a\s+)?(bot|ai|real|human)|is\s+this\s+(a\s+)?(bot|ai))\b/i,
    answer: () => ({
      text: `A small bot that only knows what's written on Kyle's profile page. For anything past that, email him — ${CONTACT.email}.`,
    }),
  },
  // Skills. Sits above the projects rule because "does he know PyTorch"
  // names no project and would otherwise fall through — which is exactly
  // what it used to do. The answer is assembled from published facts
  // only: the stack printed on each project card and the type of each
  // role. It deliberately does not claim a proficiency level for
  // anything, because the site doesn't state one.
  {
    test: /\b(skills?|skillset|tech|techs|technolog(y|ies)|tech\s*stack|stack|languages?|frameworks?|tools?|good\s+at|strengths?|know\s+(how\s+to\s+)?\w+|familiar|proficien\w*|experienced\s+(in|with)|front[\s-]?end|back[\s-]?end|full[\s-]?stack|machine\s+learning|\bml\b|\bai\b|artificial\s+intelligence|deep\s+learning|\bnlp\b|llms?|data\s+science|coding|python|pytorch|tensorflow|langchain|kafka|docker|sql|react|typescript)\b/i,
    answer: skillsAnswer,
  },

  // ── Navigation-ish topics ───────────────────────────────────────────
  {
    test: /\b(projects?|repos?|repositories|github|source\s*code|side\s*projects?|buil[dt]|building|made|working\s+on|portfolio\s+pieces?)\b/i,
    answer: projectsAnswer,
  },
  {
    test: /\b(contact|email|reach\s*(out|him|you)?|get\s+in\s+touch|dm|socials?|social\s*media|handles?|instagram|linkedin|twitter|hire|hiring|recruit|find\s+(him|he|you))\b/i,
    answer: contactAnswer,
  },
  // School sits above work history: "where does he go to school"
  // matches the experience rule's `where does he ...` clause, so asked
  // in the other order it came back with a list of internships.
  {
    // "is he in cs" lands here too, and the answer says Math — the site
    // said CS for a while, so someone who saw the old copy (or assumed
    // it) gets corrected rather than a shrug.
    test: /\b(school|university|uni|college|waterloo|degree|stud(y|ies|ying|ent)|major|program(me)?|classes|course|what\s+year|graduat(e|es|ing|ion)|grad\s+year|cs|comp\s*sci|computer\s+science|math(s|ematics)?)\b/i,
    answer: schoolAnswer,
  },
  {
    // Sits above the work history because that rule claims every
    // "where does he ..." phrasing, which sent "where does he live" to
    // a list of internships.
    test: /\bwhere\s+(does|do|did|is|was)\s+(he|you)\s+(live|living|stay|based|from|reside)\b/i,
    answer: locationAnswer,
  },
  {
    test: /\b(experience|background|resume|cv|work(s|ed|ing)?|work\s*history|employ(er|ed|ment)|compan(y|ies)|jobs?|career|intern(ed|ing|ships?)?|roles?|positions?|titles?|swe|software\s+engineer(ing)?|what\s+kind\s+of\s+(engineer|developer|dev)|where\s+(has|have|did|does|do)\s+(he|you))\b/i,
    // Company, type of work, dates — nothing about what the work was.
    // Kyle's resume bullets are not on the site and the bot has no copy
    // of them to misquote.
    answer: experienceAnswer,
  },

  // ── Personality ─────────────────────────────────────────────────────
  {
    test: /\b(f1|formula\s*1|racing|race|car|cars|motorsport|driving|tyres?|tires?)\b/i,
    answer: () => ({
      text: `${INTERESTS.f1} ${INTERESTS.cars} It also leaked into the code — one of his projects is a tyre-degradation and pit-strategy model.`,
    }),
  },
  {
    test: /\b(badminton|shuttle(cock)?|racket|racquet)\b/i,
    answer: () => ({ text: `${INTERESTS.badminton} Bring a racket anyway.` }),
  },
  {
    test: /\b(gym|lift(ing)?|workout|training|fitness|weights)\b/i,
    answer: () => ({ text: INTERESTS.gym }),
  },
  {
    test: /\b(basketball|nba|hoops|ball)\b/i,
    answer: () => ({ text: INTERESTS.nba }),
  },
  {
    test: /\b(coffee|caffeine|espresso|latte)\b/i,
    answer: () => ({ text: INTERESTS.coffee }),
  },
  {
    test: /\b(cursor|claude\s*code|copilot|ai\s*tool(ing|s)?|editor|ide|vibe\s*cod)\b/i,
    answer: () => ({ text: INTERESTS.tech }),
  },
  {
    test: /\b(chess)\b/i,
    answer: () => ({ text: INTERESTS.chess }),
  },
  {
    test: /\b(stocks?|investing|markets?|trading|finance|portfolio\s+theory)\b/i,
    answer: () => ({ text: INTERESTS.investing }),
  },
  {
    test: /\b(read(s|ing)?|books?)\b/i,
    answer: () => ({ text: INTERESTS.reading }),
  },
  {
    test: /\b(travel(ling|ing)?|trips?|europe|flights?|holiday|vacation)\b/i,
    answer: () => ({ text: INTERESTS.travel }),
  },
  {
    test: /\b(toronto|based|live|located|location|city|where\s+(is|are)\s+(he|you))\b/i,
    answer: locationAnswer,
  },
  {
    test: /\b(hobb(y|ies)|fun|weekend|free\s*time|outside\s+of\s+work|interests?|into|sports?|likes\b|enjoys\b|(?:does|do|did)\s+(?:he|you)\s+(?:like|enjoy)|for\s+fun|what\s+do\s+you\s+do\s+when)\b/i,
    answer: hobbiesAnswer,
  },
  // "what does he do" — the most common question about a person, and it
  // contains no topic word at all. Two placement constraints: below the
  // hobbies rule, because "what does he do for fun" is a hobbies
  // question, and as a rule rather than a fuzzy keyword, because "do" in
  // the vocabulary answered "does he have a girlfriend" with his bio.
  {
    test: /\bwhat\s+(do|does|is)\s+(he|kyle|you)\s+(do|doing)\b/i,
    answer: aboutAnswer,
  },

];

/**
 * "Who is this person" phrasings, checked AFTER the fuzzy pass rather
 * than as the last rule.
 *
 * The reason is "tell me about his experiance": as a rule this pattern
 * matched on "tell me about" and answered with his bio, and the typo
 * never got the chance to reach the experience topic. Sitting below the
 * fuzzy pass, a misspelled topic resolves to that topic and only a
 * genuinely topicless question — "what's he like" — lands here.
 */
const ABOUT_CATCHALL =
  /\b(about\s+(you|him|yourself)|tell\s+me\s+about|who\s+(is|are)\s+(he|this\s+guy)|what('?s| is)\s+(his|the)\s+deal|what('?s| is)\s+he\s+like|your\s+story|his\s+story|bio|introduce)\b/i;


// ── Fuzzy last chance ─────────────────────────────────────────────────

/**
 * Damerau-Levenshtein distance, abandoned once it exceeds `max`.
 *
 * Transpositions count as one edit, not two, which matters because they
 * are the most common way a real person mistypes a word: "stuyd" for
 * "study" is one swapped pair, and plain Levenshtein would score it 2 —
 * the same as a word that shares only its stem.
 */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  let prevPrev: number[] = [];
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        v = Math.min(v, prevPrev[j - 2] + 1);
      }
      row.push(v);
      best = Math.min(best, v);
    }
    if (best > max) return max + 1;
    prevPrev = prev;
    prev = row;
  }
  return prev[b.length];
}

/**
 * Topic vocabularies for the last-chance pass. Order is significance
 * order: on a tie the earlier topic wins, so "what program is he in"
 * resolves to school rather than to the about catch-all.
 */
const FUZZY_TOPICS: Array<{ words: string[]; answer: () => Answer }> = [
  {
    words: [
      "school", "university", "college", "waterloo", "degree", "program",
      "programme", "major", "study", "studies", "studying", "student",
      "course", "courses", "class", "classes", "graduate", "graduation",
      "math", "maths", "mathematics",
    ],
    answer: schoolAnswer,
  },
  {
    words: [
      "experience", "background", "resume", "cv", "work", "works", "worked",
      "working", "job", "jobs", "internship", "internships", "intern",
      "interned", "interning", "company", "companies", "employer", "career",
      "history", "role", "roles", "position", "positions", "employed",
    ],
    answer: experienceAnswer,
  },
  {
    words: [
      "project", "projects", "repo", "repos", "repository", "repositories",
      "github", "built", "build", "building", "made", "portfolio", "code",
      "coded", "shipped",
    ],
    answer: projectsAnswer,
  },
  {
    words: [
      "contact", "email", "reach", "linkedin", "instagram", "socials",
      "message", "hire", "hiring", "recruiter", "online", "handle", "twitter",
      "connect",
    ],
    answer: contactAnswer,
  },
  {
    words: [
      "skills", "skill", "stack", "language", "languages", "framework",
      "frameworks", "tools", "python", "pytorch", "typescript", "tech",
      "technology", "technologies", "coding", "proficient",
    ],
    answer: skillsAnswer,
  },
  {
    words: [
      "hobby", "hobbies", "interests", "fun", "sports", "badminton", "gym",
      "chess", "cars", "free", "weekend",
    ],
    answer: hobbiesAnswer,
  },
  {
    // Deliberately last and deliberately vague: "what does he do" is the
    // most common question anyone asks about a person, and it has no
    // keyword of its own.
    words: ["who", "about", "bio", "deal", "person", "himself"],
    answer: aboutAnswer,
  },
];

/**
 * Runs only after every rule has missed. Scores the message's words
 * against each topic's vocabulary, allowing near-misses, and answers with
 * the best-scoring topic.
 *
 * The tolerance scales with word length so short words stay exact: at two
 * edits, "do" would reach "go", but "experiance" reaching "experience" is
 * exactly the point. The alternative for any of these questions is the
 * "not written down" message, so a slightly loose match is strictly
 * better than the shrug it replaces.
 */
function fuzzyTopicAnswer(message: string): Answer | null {
  const words = message
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length > 1);
  if (words.length === 0) return null;

  let best: { score: number; answer: () => Answer } | null = null;
  for (const topic of FUZZY_TOPICS) {
    let score = 0;
    for (const word of words) {
      const tolerance = word.length >= 7 ? 2 : word.length >= 5 ? 1 : 0;
      const hit = topic.words.some((k) =>
        tolerance === 0 ? k === word : editDistance(word, k, tolerance) <= tolerance,
      );
      if (hit) score++;
    }
    if (score > 0 && (best === null || score > best.score)) {
      best = { score, answer: topic.answer };
    }
  }
  return best ? best.answer() : null;
}

/**
 * The catch-all. Deliberately says "I don't have that written down"
 * rather than improvising: an honest miss is better than a confident
 * invention on someone's portfolio. Always hands the user a next step.
 */
function fallbackAnswer(): Answer {
  return {
    text:
      `That's not something I've got written down here. What I can cover: his background, his projects, what he's into, and how to reach him. ` +
      `For anything else, email him directly — ${CONTACT.email}.`,
  };
}

/**
 * Rewrite a question into the shape the rules expect.
 *
 * Nearly every rule was written around pronouns — "where has he worked"
 * — so anyone who typed Kyle's name instead ("where did Kyle work")
 * fell through to the fallback. Rather than doubling every pattern, the
 * name folds into the pronoun here, once.
 */
function normalize(message: string): string {
  return message
    .replace(/\bkyle['’]s\b/gi, "his")
    .replace(/\bkyle\b/gi, "he")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve a user message to an answer. Exported for the smoke test. */
export function answerFor(message: string): Answer {
  const text = normalize(message);
  if (!text) return fallbackAnswer();

  const specific = specificProjectAnswer(text);
  if (specific) return specific;

  const role = specificRoleAnswer(text);
  if (role) return role;

  for (const rule of RULES) {
    if (rule.test.test(text)) return rule.answer();
  }

  // Nothing matched exactly. Before giving up, try the same topics with
  // a tolerance for typos and for phrasings nobody thought to list.
  const fuzzy = fuzzyTopicAnswer(text);
  if (fuzzy) return fuzzy;

  // Still nothing with a topic in it — treat it as "so who is this guy".
  if (ABOUT_CATCHALL.test(text)) return aboutAnswer();

  return fallbackAnswer();
}

// ── Streaming ─────────────────────────────────────────────────────────

/** Typing cadence. Fast enough not to feel slow, slow enough that the
 *  handwriting animation on the client has something to animate. */
const CHUNK_CHARS = 3;
const CHUNK_DELAY_MS = 12;

/**
 * Stream an answer in the AI SDK data-stream format.
 *
 * Deliberately free of server-only imports — no logger, no fs, no
 * Upstash. This module runs unchanged in three places: the /api/chat
 * route on a Node host, the same route on Vercel, and directly in the
 * browser on the static GitHub Pages build (see lib/chat/staticTransport).
 * Request logging is the caller's job precisely so that stays true;
 * lib/llm/index.ts does it for the server paths.
 */
export async function streamLocal({
  messages,
}: {
  messages: ChatMessage[];
}): Promise<Response> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const answer = answerFor(lastUser?.content ?? "");

  return createDataStreamResponse({
    execute: async (writer) => {
      // Text first, then the tool call. Order matters on the client: the
      // page flip is triggered by the tool call, and firing it before the
      // reply has rendered means the user watches the page turn next to
      // an empty speech bubble.
      for (let i = 0; i < answer.text.length; i += CHUNK_CHARS) {
        writer.write(
          formatDataStreamPart(
            "text",
            answer.text.slice(i, i + CHUNK_CHARS),
          ),
        );
        if (CHUNK_DELAY_MS > 0) {
          await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
        }
      }

      if (answer.tool) {
        const toolCallId = `local-${Date.now().toString(36)}`;
        writer.write(
          formatDataStreamPart("tool_call", {
            toolCallId,
            toolName: answer.tool,
            args: {},
          }),
        );
        writer.write(
          formatDataStreamPart("tool_result", {
            toolCallId,
            result: { ok: true },
          }),
        );
      }
    },
    onError: (err) => {
      console.error("[local] stream error:", err);
      return "Something went wrong on my end. Try again?";
    },
  });
}
