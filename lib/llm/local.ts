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
 * For experience questions it emits the `blurb` one-liners from
 * lib/profile.ts and nothing more — it never expands them into invented
 * resume bullets.
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
  // One line per entry, exactly the profile's blurb. Nothing added.
  return EXPERIENCE.map((e) => `• ${e.org} (${e.focus}) — ${e.blurb}`).join("\n");
}

function projectLines(): string {
  return PROJECTS.map((p) => `• ${p.name} — ${p.blurb}`).join("\n");
}

const ABOUT_TEXT =
  `${IDENTITY.program} at the ${IDENTITY.school}, based in ${IDENTITY.location}. ` +
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
  "f1-tyre-strategy": /\b(f1|formula\s*1|tyres?|tires?|pit|race\s*strateg|degradation)\b/i,
  "drift-stream": /\b(drift|streaming|psi|retrain|inference\s*pipeline)\b/i,
  "redteam-sandbox": /\b(red[\s-]?team|adversarial|guardrails?|jailbreak|genetic)\b/i,
  "bl-robo-advisor": /\b(black[\s-]?litterman|portfolio|robo[\s-]?advisor|quant|market\s*views?)\b/i,
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
 * Answers with that role's single summary line and nothing else. Both
 * OPG terms match the same keyword, so asking about OPG returns both
 * lines rather than silently picking one.
 */
function specificRoleAnswer(message: string): Answer | null {
  const matches = EXPERIENCE.filter((role) =>
    ORG_KEYWORDS[role.org]?.test(message),
  );
  if (matches.length === 0) return null;

  const lines = matches
    .map((r) => `${r.org} — ${r.title} (${r.focus}), ${r.dates}\n${r.blurb}`)
    .join("\n\n");
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

  // ── Navigation-ish topics ───────────────────────────────────────────
  {
    test: /\b(projects?|repos?|repositories|github|source\s*code|side\s*projects?|what\s+(has|have)\s+(he|you)\s+built|portfolio\s+pieces?)\b/i,
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
  {
    test: /\b(experience|background|resume|cv|work\s*history|worked|jobs?|career|where\s+(has|did)\s+(he|you))\b/i,
    // One line per role and no more — the bot never elaborates past the
    // blurb, which is how a "25%" would turn into "about a third" and
    // the site would start misquoting his own resume.
    answer: () => ({
      text: `Here's the short version:\n${experienceLines()}`,
      tool: "showExperience",
    }),
  },
  {
    test: /\b(school|university|waterloo|degree|studying|student|major|classes|course)\b/i,
    answer: () => ({
      text: `${EDUCATION.degree} at the ${EDUCATION.school}, ${EDUCATION.dates}. ${IDENTITY.status}`,
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
    answer: () => ({ text: `${INTERESTS.badminton} Bring a racket.` }),
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
    test: /\b(chess)\b/i,
    answer: () => ({ text: INTERESTS.chess }),
  },
  {
    test: /\b(stocks?|investing|markets?|trading|finance|portfolio\s+theory)\b/i,
    answer: () => ({ text: INTERESTS.investing }),
  },
  {
    test: /\b(read(s|ing)?|books?|travel(ling|ing)?)\b/i,
    answer: () => ({ text: INTERESTS.reading }),
  },
  {
    test: /\b(toronto|based|live|located|location|city|where\s+(is|are)\s+(he|you))\b/i,
    answer: () => ({ text: `${IDENTITY.location}. ${INTERESTS.city}` }),
  },
  {
    test: /\b(hobb(y|ies)|fun|weekend|free\s*time|outside\s+of\s+work|interests?|for\s+fun|what\s+do\s+you\s+do\s+when)\b/i,
    // Written out rather than stitched from the INTERESTS strings —
    // concatenating full sentences produced a run-on, and lowercasing
    // them to fix that mangled "Formula 1" into "formula 1".
    answer: () => ({
      text: `He watches a ridiculous amount of F1 and NBA. When he's actually moving it's badminton or the gym. Otherwise: chess, cars, reading, travel, and markets.`,
    }),
  },

  // ── Meta ────────────────────────────────────────────────────────────
  {
    test: /\b(built\s+(with|using)|tech\s*stack|what\s+is\s+this\s+(site|built)|how\s+(was|did)\s+(this|you)\s+(site\s+)?(made|built)|framework|next\.?js)\b/i,
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
  {
    test: /\b(about\s+(you|him|yourself|kyle)|tell\s+me\s+about|who\s+is\s+kyle|your\s+story|his\s+story|bio|introduce)\b/i,
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

/** Resolve a user message to an answer. Exported for the smoke test. */
export function answerFor(message: string): Answer {
  const text = message.trim();
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
