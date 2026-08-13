/**
 * LLM provider abstraction.
 *
 * Flip between providers by setting LLM_PROVIDER in .env.local:
 *   LLM_PROVIDER=github   (free GitHub Models inference, default)
 *   LLM_PROVIDER=ollama   (local daemon OR Ollama Cloud API)
 *   LLM_PROVIDER=claude
 *   LLM_PROVIDER=openai
 *
 * Optional failover: set LLM_FALLBACK_PROVIDER to have streamChat
 * automatically retry with a backup provider when the primary
 * returns a 5xx or throws before streaming starts. Useful pairing:
 *   LLM_PROVIDER=github           (free)
 *   LLM_FALLBACK_PROVIDER=ollama  (paid but reliable)
 * Fallback only fires for pre-stream errors (auth failures, rate
 * limits, network issues). If a stream starts and fails mid-flight,
 * the request is already committed and cannot be retried.
 *
 * Override the model with LLM_MODEL. Each provider ships a sensible
 * default if LLM_MODEL isn't set. Note: LLM_MODEL applies to the
 * primary provider; the fallback always uses its own default.
 *
 * The system prompt is assembled here via buildSystemPrompt(provider)
 * so callers don't need to know about the prompt structure.
 */

import { buildSystemPrompt } from "./prompt";
import { streamOllama } from "./ollama";
import { streamClaude } from "./claude";
import { streamOpenAI } from "./openai";
import { streamGitHub } from "./github";
import { streamLocal } from "./local";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/** Metadata threaded from the route to the provider for log emission. */
export type LogContext = {
  startedAt: number;
  ipHash: string;
  feedbackFlag?: true;
};

export type ChatRequest = {
  messages: ChatMessage[];
  signal?: AbortSignal;
  logContext?: LogContext;
};

export type LLMProvider =
  | "local"
  | "ollama"
  | "claude"
  | "openai"
  | "github";

const PROVIDER = (process.env.LLM_PROVIDER ?? "local") as LLMProvider;
const FALLBACK_PROVIDER =
  process.env.LLM_FALLBACK_PROVIDER &&
  process.env.LLM_FALLBACK_PROVIDER !== process.env.LLM_PROVIDER
    ? (process.env.LLM_FALLBACK_PROVIDER as LLMProvider)
    : undefined;

const DEFAULT_MODELS: Record<LLMProvider, string> = {
  local: "grounded-profile",
  ollama: "gpt-oss:120b-cloud",
  claude: "claude-haiku-4-5-20251001",
  openai: "gpt-4.1-mini",
  github: "openai/gpt-4.1-mini",
};

export function currentConfig() {
  return {
    provider: PROVIDER,
    model: process.env.LLM_MODEL ?? DEFAULT_MODELS[PROVIDER],
    fallbackProvider: FALLBACK_PROVIDER,
  };
}

async function callProvider(
  provider: LLMProvider,
  req: ChatRequest,
  model: string
): Promise<Response> {
  // The local provider answers from lib/profile.ts and has no prompt to
  // assemble — building one would read the corpus off disk for nothing.
  if (provider === "local") {
    return streamLocal(req);
  }

  const system = buildSystemPrompt(provider);
  switch (provider) {
    case "ollama":
      return streamOllama({ ...req, system, model });
    case "claude":
      return streamClaude({ ...req, system, model });
    case "openai":
      return streamOpenAI({ ...req, system, model });
    case "github":
      return streamGitHub({ ...req, system, model });
    default:
      console.error(
        `[llm] Unknown LLM_PROVIDER "${provider}" — falling back to the local responder.`
      );
      return streamLocal(req);
  }
}

/**
 * Detect a response that's worth falling back on — provider-level
 * failures that happened before a successful stream started. 5xx is
 * the obvious case; 429 (rate limited) is also worth retrying on a
 * different provider. 4xx other than 429 usually means bad request
 * shape, which fallback won't fix — don't retry on those.
 */
function shouldFallback(response: Response): boolean {
  // 5xx covers both genuine upstream failures and the "API key not set"
  // 500s the provider modules return when they're unconfigured — which
  // is the common case for a fresh deploy, and exactly when falling back
  // to the local responder matters most.
  if (response.status >= 500) return true;
  if (response.status === 429) return true;
  return false;
}

export async function streamChat(req: ChatRequest): Promise<Response> {
  const model = process.env.LLM_MODEL ?? DEFAULT_MODELS[PROVIDER];

  // Effective fallback: whatever LLM_FALLBACK_PROVIDER names, or the
  // local responder. A portfolio chat that replies "GITHUB_TOKEN not set"
  // is worse than one that answers from the profile file, so "local" is
  // the floor no matter how the deployment is configured. It costs
  // nothing and can't fail on credentials, which makes it a safe last
  // resort rather than another thing that might break.
  const fallback: LLMProvider | undefined =
    FALLBACK_PROVIDER ?? (PROVIDER !== "local" ? "local" : undefined);

  const useFallback = async (why: string) => {
    if (!fallback) return null;
    console.warn(`[llm] ${why} — failing over to ${fallback}`);
    return callProvider(fallback, req, DEFAULT_MODELS[fallback]);
  };

  try {
    const primary = await callProvider(PROVIDER, req, model);

    if (shouldFallback(primary)) {
      // Drain the primary's body so the connection closes cleanly.
      await primary.body?.cancel().catch(() => {});
      const alt = await useFallback(
        `Primary provider ${PROVIDER} returned ${primary.status}`
      );
      if (alt) return alt;
    }

    return primary;
  } catch (err) {
    const alt = await useFallback(`Primary provider ${PROVIDER} threw: ${err}`);
    if (alt) return alt;
    throw err;
  }
}
