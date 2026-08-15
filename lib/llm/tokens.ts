/**
 * Token estimation, split out from prompt.ts so it can be imported on
 * the client.
 *
 * prompt.ts reads the markdown corpus off disk with node:fs at module
 * scope. lib/validation.ts needs estimateTokens and nothing else from
 * it — importing the whole module would drag `fs` into any bundle that
 * validates a chat request, which breaks the static build where
 * validation runs in the browser.
 */

/** Estimated token count (for logging and budget checks). Cheap, rough,
 *  good enough — roughly four characters to a token. */
export function estimateTokens(text: string): number {
  return Math.round(text.length / 4);
}
