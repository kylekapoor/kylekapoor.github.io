#!/usr/bin/env -S node --import tsx
/**
 * Coverage + routing check for the local chat responder.
 *
 * Two failure modes, both of which have actually happened:
 *
 *   1. A question falls through to "that's not something I've got
 *      written down here". Every rule was written around pronouns, so
 *      "where did Kyle work" — a question anyone would type — missed.
 *   2. Widening a rule to fix (1) makes it swallow a neighbouring topic,
 *      so "how do I contact him" starts answering with a project list.
 *
 * So each question is checked twice: it must not hit the fallback, and
 * its answer must contain the thing that topic is supposed to say.
 *
 * Usage: npm run chat:coverage
 */

import { answerFor } from "@/lib/llm/local";

const FALLBACK = /not something I've got written down/;

/** question → a pattern the correct answer must contain. */
const CASES: Array<[string, RegExp]> = [
  // Work history
  ["where did Kyle work", /Forum Asset Management/i],
  ["where does he work", /Forum Asset Management/i],
  ["who has he worked for", /Ontario Power Generation/i],
  ["what companies has kyle worked at", /IrisGo/i],
  ["tell me about his work", /Forum Asset Management/i],
  ["what are his internships", /internships|Forum|email/i],
  ["does he have work experience", /Forum Asset Management/i],
  ["what did kyle do at forum", /Forum Asset Management/i],
  ["what kind of engineer is he", /Applied AI|Full-Stack|Data/i],

  // School
  ["what does kyle study", /\bMath\b/i],
  ["what year is he in", /\bMath\b|2023/i],
  ["when does he graduate", /2028|2023/i],
  ["is kyle a student", /\bMath\b/i],
  ["what school does kyle go to", /Waterloo/i],
  // The site said CS until it was corrected, so this phrasing has to
  // answer Math rather than fall through.
  ["is he in cs", /\bMath\b/i],
  ["what's his major", /\bMath\b/i],

  // Projects
  ["what has kyle built", /f1-tyre-strategy/i],
  ["show me his projects", /drift-stream/i],
  ["what is he working on", /f1-tyre-strategy|redteam/i],
  ["tell me about the fraud project", /drift-stream/i],
  ["what's the f1 project", /f1-tyre-strategy/i],

  // Skills
  ["does he know pytorch", /PyTorch/i],
  ["what languages does he use", /PyTorch|LangChain|Kafka/i],
  ["what's his tech stack", /PyTorch|Kafka/i],
  ["what's he good at", /Applied AI|PyTorch/i],
  ["can he do frontend", /Full-Stack|stack/i],
  ["does he do machine learning", /PyTorch|Applied AI/i],

  // Contact + availability
  ["how do I reach kyle", /kyle\.kapoor@uwaterloo\.ca/],
  ["what's his email", /kyle\.kapoor@uwaterloo\.ca/],
  ["can I dm him", /linkedin|instagram/i],
  ["is he looking for an internship", /2027/],
  ["is kyle available", /2027/],

  // Personality
  ["what does kyle like", /badminton|Formula 1/i],
  ["what are his hobbies", /badminton/i],
  ["does he play sports", /badminton|gym/i],

  // Identity
  ["tell me about kyle", /Waterloo/i],
  ["who is kyle", /Waterloo/i],
  ["what's kyle like", /Waterloo/i],
  ["where is he based", /Toronto/i],
  ["does kyle live in toronto", /Toronto/i],

  // Typos and phrasings nobody listed — these all used to hit the
  // fallback, which is the single worst answer the bot can give.
  ["What program is he in", /\bMath\b/i],
  ["what does he stuyd", /\bMath\b/i],
  ["what does he do", /Waterloo|Math/i],
  // The rule that answers the line above must not swallow this one.
  ["what does he do for fun", /badminton/i],
  ["whats his experiance", /Forum Asset Management/i],
  ["show me his projcts", /f1-tyre-strategy/i],
  ["how do i contct him", /kyle\.kapoor@uwaterloo\.ca/],
  ["what unversity does he go to", /Waterloo/i],

  // Meta
  ["what is this site", /Next\.js|journal/i],
  ["who made this", /Next\.js|journal/i],
  ["what tech is this built on", /Next\.js/i],
  ["why is this site a chatbot", /Next\.js|journal/i],
];

let failed = 0;
for (const [question, expected] of CASES) {
  const { text } = answerFor(question);
  if (FALLBACK.test(text)) {
    console.log(`  ✗ ${question}\n      → fell through to the fallback`);
    failed++;
  } else if (!expected.test(text)) {
    console.log(
      `  ✗ ${question}\n      → wrong topic, expected ${expected}\n      → ${text.slice(0, 110)}`,
    );
    failed++;
  } else {
    console.log(`  ✓ ${question}`);
  }
}

console.log(`\n${CASES.length - failed}/${CASES.length} routed correctly`);
process.exit(failed > 0 ? 1 : 0);
