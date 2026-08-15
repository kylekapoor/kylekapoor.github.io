/**
 * The chatbot, without a server.
 *
 * GitHub Pages serves files and nothing else — there is no runtime to
 * host /api/chat. That would normally be the end of the chat, except the
 * default provider was never a network call in the first place: the
 * grounded responder in lib/llm/local.ts answers from lib/profile.ts
 * with plain regex matching, no key and no upstream. There is nothing in
 * it that actually needs a server.
 *
 * So on the static build, `useChat` is handed this in place of `fetch`.
 * It runs the identical validation and the identical responder in the
 * browser and hands back a real Response streaming the same AI SDK
 * data-stream protocol. Everything downstream — the typing animation,
 * the tool calls that flip the journal to a page, the rate-limit error
 * path — is byte-for-byte the same code as the hosted build, because
 * from useChat's point of view nothing has changed.
 *
 * What is genuinely lost on the static build, and is fine to lose:
 *   - Upstash request logging. Nowhere to write to, and no secret that
 *     could safely live in a public client bundle anyway.
 *   - IP rate limiting. It exists to cap spend on a metered upstream
 *     provider; the local responder has no upstream and costs nothing,
 *     so there is nothing to protect.
 *   - Any model-backed provider (Claude, OpenAI, GitHub Models, Ollama).
 *     Those need a key, and a key in a static bundle is a published key.
 *     Deploy to a Node host if you want one of those.
 */

import { streamLocal } from "@/lib/llm/local";
import { validateChatRequest } from "@/lib/validation";

/**
 * Drop-in replacement for `fetch` in `useChat({ fetch })`.
 *
 * Mirrors the /api/chat route's contract, including its status codes,
 * so the client's error handling doesn't need a static-specific branch.
 */
export const staticChatFetch: typeof fetch = async (_input, init) => {
  let body: unknown;
  try {
    body = JSON.parse((init?.body as string) ?? "");
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  // The local responder has no system prompt, so the budget half of the
  // check has nothing to charge against — same as the server passes for
  // this provider (see getSystemPromptTokens).
  const validation = validateChatRequest(body, 0);
  if (!validation.ok) {
    return jsonError(validation.status, validation.error);
  }

  return streamLocal({ messages: validation.messages });
};

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export { IS_STATIC_BUILD } from "@/lib/basePath";
