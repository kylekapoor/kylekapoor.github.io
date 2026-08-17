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
 * A question naming one specific project. Checked before the general
 * projects rule so "tell me about the F1 project" gets that project's
 * line instead of the whole catalogue — and before the cars rule, so
 * "the f1 project" isn't answered as a hobby question.
 */
function specificProjectAnswer(message: string): Answer | null {
  // Require some signal that the user means a *project*, not the hobby.
  // Without this, "do you like F1" would return a repo description.
  const projectContext =
    /\b(project|repo|repositor|code|built|build|github|working\s+on|made)\b/i;
  if (!projectContext.test(message)) return null;

  for (const project of PROJECTS) {
    const named =
      message.toLowerCase().includes(project.name.toLowerCase()) ||
      PROJECT_KEYWORDS[project.name]?.test(message);
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
  {
    test: /\b(available|availability|looking\s+for\s+(work|a\s+role|a\s+job|an?\s+internship)|open\s+to|internships?|opportunit(y|ies)|job\s+search|is\s+he\s+(free|open))\b/i,
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
    test: /\b(skills?|tech\s*stack|stack|languages?|frameworks?|tools?|good\s+at|strengths?|know\s+(how\s+to\s+)?\w+|familiar|experienced\s+(in|with)|front[\s-]?end|back[\s-]?end|full[\s-]?stack|machine\s+learning|\bml\b|data\s+science|python|pytorch|tensorflow|langchain|kafka|docker|sql|react|typescript)\b/i,
    answer: () => ({
      text:
        `What the site publishes: the stack on each project — ${PROJECTS.map(
          (p) => `${p.name} (${p.stack})`,
        ).join(", ")} — and the kind of work each role was: ${[
          ...new Set(EXPERIENCE.map((e) => e.focus)),
        ].join(", ")}. ` +
        `The repos are public if you want the detail, and email him for anything past that — ${CONTACT.email}.`,
      tool: "showProjects",
    }),
  },

  // ── Navigation-ish topics ───────────────────────────────────────────
  {
    test: /\b(projects?|repos?|repositories|github|source\s*code|side\s*projects?|buil[dt]|building|made|working\s+on|portfolio\s+pieces?)\b/i,
    answer: () => ({
      text: `Here's what he's built:\n${projectLines()}\n\nEvery card on the projects page opens the repo on GitHub.`,
      tool: "showProjects",
    }),
  },
  {
    test: /\b(contact|email|reach\s*(out|him|you)?|get\s+in\s+touch|dm|socials?|instagram|linkedin|hire|hiring|recruit)\b/i,
    answer: () => ({
      text: CONTACT_TEXT,
      tool: "showContact",
    }),
  },
  // School sits above work history: "where does he go to school"
  // matches the experience rule's `where does he ...` clause, so asked
  // in the other order it came back with a list of internships.
  {
    test: /\b(school|university|uni|college|waterloo|degree|stud(y|ies|ying|ent)|major|classes|course|what\s+year|graduat(e|es|ing|ion)|grad\s+year)\b/i,
    answer: () => ({
      text: `${EDUCATION.degree} at the ${EDUCATION.school}, ${EDUCATION.dates}. ${IDENTITY.status}`,
      tool: "showExperience",
    }),
  },
  {
    test: /\b(experience|background|resume|cv|work(s|ed|ing)?|work\s*history|employ(er|ed|ment)|compan(y|ies)|jobs?|career|internships?|interned|what\s+kind\s+of\s+(engineer|developer|dev)|where\s+(has|have|did|does|do)\s+(he|you))\b/i,
    // Company, type of work, dates — nothing about what the work was.
    // Kyle's resume bullets are not on the site and the bot has no copy
    // of them to misquote.
    answer: () => ({
      text: `Here's the short version:\n${experienceLines()}`,
      tool: "showExperience",
    }),
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
    answer: () => ({ text: `${IDENTITY.location}. ${INTERESTS.city}` }),
  },
  {
    test: /\b(hobb(y|ies)|fun|weekend|free\s*time|outside\s+of\s+work|interests?|into|sports?|likes\b|enjoys\b|(?:does|do|did)\s+(?:he|you)\s+(?:like|enjoy)|for\s+fun|what\s+do\s+you\s+do\s+when)\b/i,
    // Written out rather than stitched from the INTERESTS strings —
    // concatenating full sentences produced a run-on, and lowercasing
    // them to fix that mangled "Formula 1" into "formula 1".
    answer: () => ({
      text: `Far too much Formula 1 and NBA. Badminton, where he'll tell you he gets smoked, and the gym, permanently. Otherwise: the car market, chess, whatever book promises him a million dollars, and finding an excuse to fly to Europe.`,
    }),
  },
  {
    // Catch-all for "who is this person" phrasings. Last, so a question
    // with a specific topic in it reaches that topic's rule first.
    test: /\b(about\s+(you|him|yourself)|tell\s+me\s+about|who\s+(is|are)\s+(he|this\s+guy)|what('?s| is)\s+(his|the)\s+deal|what('?s| is)\s+he\s+like|your\s+story|his\s+story|bio|introduce)\b/i,
    answer: () => ({
      text: ABOUT_TEXT,
      tool: "showAbout",
    }),
  },
];

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
