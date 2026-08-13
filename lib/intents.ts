import type { ToolName } from "./tools";

type Intent = {
  tool: ToolName;
  args?: Record<string, unknown>;
  reply: string;
};

/**
 * Client-side intent matcher. If a user message matches one of these
 * patterns, dispatch the tool locally without hitting the LLM. This
 * covers the recruiter "6 second" path for free and — more importantly
 * — skips the class of LLM bug where tool calls land without any text
 * content (empty bot bubble, user sees the page open but no reply).
 *
 * Patterns are split into:
 *   - EXACT/SHORT patterns     (slash commands, bare nouns)
 *   - NAV_PHRASE + TOPIC combo (matches any "can I see experience" /
 *                               "i want to view his projects" style
 *                               phrasing)
 *
 * The NAV_PHRASE list is intentionally permissive — false positives just
 * open a view that's safe to show. False negatives (letting the LLM
 * handle a simple nav request) are worse, because the model sometimes
 * omits the text one-liner and the user gets a blank bubble.
 */

// Phrases that signal "I want to VIEW a page" — restricted to explicit
// command/viewing verbs. Questions about the underlying info ("where has
// he worked", "tell me about kyle") are left to the bot so it can answer
// conversationally and optionally nudge toward the full page. Anchored to
// message start so "I don't want to see X" and similar negations don't
// match.
//
// Exception: "how (do|can|should) i (contact|reach|email|message|dm|get
// in touch)" — structurally a question, but its answer is entirely the
// contact page, so route it. Narrow on purpose: the verb list is only
// contact-related, so "how do I make pasta" stays with the bot.
const NAV_PHRASE =
  /^\s*(\/?(show|see|view|read|open|pull\s+up|take\s+me\s+to|go\s+to)\s+(me\s+|us\s+)?|(can|could|will|would)\s+(i|you|we)\s+(see|show|view|look\s+at|check|read|pull\s+up|open)\s+(me\s+|us\s+)?|(let|lemme)\s+me?\s+(see|view|check|read|look\s+at)\s+|(i|we)('?ll|\s+will|\s+would\s+like|\s+want|\s+wanna|\s+need|'?d\s+like)(\s+to)?\s+(see|view|look\s+at|check|read|open)\s+|how\s+(do|can|should|would|to)\s+(i|we|one)?\s*(contact|reach|email|message|dm|get\s+in\s+touch)\s+)/i;

const TOPIC_PATTERNS: Record<ToolName, RegExp> = {
  showAbout:
    /\b(about\s+(yourself|kyle|you|page|section)|who\s+(are|is)\s+(you|kyle)|your\s+story|his\s+story|bio|who\s+he\s+is|who\s+you\s+are)\b/i,
  showExperience:
    /\b(experience|work(\s+history|ed)?|jobs?|companies|career|background|roles?|resume|cv|internships?|school|university|waterloo|studies)\b/i,
  showProjects:
    /\b(projects?|repos?|repositories|github|code|portfolio|side\s+projects?|what\s+(he'?s|you'?ve)\s+built)\b/i,
  showContact:
    /\b(contact|email|reach(\s+out|\s+him|\s+kyle)?|get\s+in\s+touch|dm|socials?|instagram|linkedin|message\s+(him|kyle)|how\s+to\s+reach)\b/i,
};

// Bare topic words / slash commands — match without needing a command
// verb in front. These are things a user types as a search shortcut
// (e.g. someone types just "projects" in the input). Must match the
// WHOLE trimmed message, so "experience was great" stays with the bot.
const EXACT_PATTERNS: Record<ToolName, RegExp> = {
  showAbout: /^\/about$|^about\??$/i,
  showExperience:
    /^\/experience$|^(experience|jobs?|companies|career|resume|cv|internships?)\??$/i,
  showProjects:
    /^\/projects$|^(projects?|repos?|github|code|portfolio)\??$/i,
  showContact:
    /^\/contact$|^(contact|email|socials?|instagram|linkedin)\??$/i,
};

const REPLIES: Record<ToolName, string> = {
  showAbout: "Cool — pulling up the about page.",
  showExperience: "Here's the timeline.",
  showProjects: "Opening the projects — click any card to see the repo.",
  showContact: "Easiest way is email. Here's everything.",
};

const TOOL_ORDER: ToolName[] = [
  // Order matters when a message hits multiple topics. Projects and
  // contact are narrower than experience/about, so they go first.
  "showProjects",
  "showContact",
  "showExperience",
  "showAbout",
];

export function matchIntent(message: string): Intent | null {
  const trimmed = message.trim();

  // 1. Exact/short patterns — match even without a nav phrase.
  for (const tool of TOOL_ORDER) {
    if (EXACT_PATTERNS[tool].test(trimmed)) {
      return { tool, reply: REPLIES[tool] };
    }
  }

  // 2. Nav phrase + topic keyword combo.
  if (NAV_PHRASE.test(trimmed)) {
    for (const tool of TOOL_ORDER) {
      if (TOPIC_PATTERNS[tool].test(trimmed)) {
        return { tool, reply: REPLIES[tool] };
      }
    }
  }

  return null;
}
