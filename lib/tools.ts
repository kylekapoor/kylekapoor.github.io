import { z } from "zod";

/**
 * Navigation tools the chatbot can call. Each one opens a page in the
 * journal; none of them return content, because the page IS the content.
 *
 * These four mirror the four slash commands exactly (/about,
 * /experience, /projects, /contact) — keep them in sync with
 * SlashCommandRow and lib/intents.ts.
 */
export const toolSchemas = {
  showAbout: {
    description:
      "Display Kyle's About page. Call this for open-ended 'tell me about yourself' / 'who are you' / 'what's your story' questions, or an explicit /about. Prefer this over writing a text bio.",
    parameters: z.object({}),
  },
  showExperience: {
    description:
      "Display Kyle's experience timeline. Call this when the user asks about his background, studies, work, or what he's built.",
    parameters: z.object({}),
  },
  showProjects: {
    description:
      "Display Kyle's projects as a card carousel linking to GitHub. Call this when the user asks about projects, repos, code, or what he's built on his own time.",
    parameters: z.object({}),
  },
  showContact: {
    description:
      "Display contact information. Call this when the user wants to reach out, or asks for an email / LinkedIn / socials.",
    parameters: z.object({}),
  },
} as const;

export type ToolName = keyof typeof toolSchemas;

export const toolNames = Object.keys(toolSchemas) as ToolName[];
