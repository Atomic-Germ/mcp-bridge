/**
 * Context Injection Engine for MCP-Bridge (Milestone 3)
 * Formats meditation insights for critique prompts and vice versa
 * Creates seamless idea flow between diverge (meditation) and converge (critique)
 */

import { MeditationTrace } from "./types.js";
import { extractFeedback, extractQuestions } from "./insights.js";
import { StorageManager } from "./utils/storage";
import { mockConfig } from "../src/__tests__/mockConfig";
import { extractThemesFromNarrative } from "./utils/nlp";
import { DreamWeaver } from "./utils/dreamWeaver";

const mockStorage = new StorageManager(mockConfig);

/**
 * Format meditation insights for a consult/critique prompt
 * Returns a rich context string that grounds the AI's evaluation
 */
export interface MeditationContext {
  systemPrompt: string;
  userPrompt: string;
  concepts: string[];
  novelty: number;
  clusters: string[][];
}

export function formatContextForConsult(
  trace: MeditationTrace,
  sessionHistory?: { count: number; avgNovelty: number }
): MeditationContext {
  if (!trace.meditation || !trace.insights) {
    throw new Error("Trace must contain both meditation and insights");
  }

  const { emergentSentence, contextWords } = trace.meditation;
  const { extractedPatterns, novelty, semanticClusters } = trace.insights;

  // Build system prompt: MODEL-OPTIMIZED, terse, technical, executable
  // Optimized for model cognition, not human readability
  const systemPrompt = [
    "ROLE: Structured critique engine for divergent idea exploration.",
    "INPUT: Meditation trace with emergent insight + context + concept extraction.",
    "OUTPUT: Binary feedback: {assumptions to challenge} + {novel exploration angles} + {tension/contradiction pairs} + {next-step hypotheses}.",
    "",
    `MEDITATION_INPUT: [${contextWords.join("|")}]`,
    `EMERGENT: ${emergentSentence}`,
    "",
    `CONCEPTS: [${extractedPatterns.join("|")}]`,
    "",
    `CLUSTERS: ${semanticClusters.map((c) => `[${c.join("|")}]`).join(" | ")}`,
    "",
    `NOVELTY: ${(novelty * 100).toFixed(0)}`,
    sessionHistory ? `SESSION_AVG: ${(sessionHistory.avgNovelty * 100).toFixed(0)}` : "",
    `SESSION_DEPTH: ${sessionHistory?.count || 1}`,
    "",
    "CRITIQUE_TARGETS:",
    extractedPatterns
      .map(
        (c, i) =>
          `T${i + 1}: assume(${c}) → challenge → counterexample → subsume/evolve`
      )
      .join("\n"),
    "",
    "EXECUTION:",
    "1. For each concept: identify implicit assumption.",
    "2. For each pair: find tension points (incompatibility, contradiction, paradox).",
    "3. For each tension: suggest complementary perspective (inversion, composition, boundary-crossing).",
    "4. For next-step: specify hypothesis that extends novelty vector (orthogonal to current trajectory).",
    "",
    "OUTPUT_FORMAT: Compact, concept-indexed, hypothesis-driven. Omit fluff. Maximize conceptual density.",
    "AUDIENCE: Next iteration of divergence; optimize for model-to-model handoff.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  // Build user prompt: terse, structural, model-focused
  const userPrompt = [
    `INSIGHT: "${emergentSentence}"`,
    `FROM: [${contextWords.join(", ")}]`,
    `CONCEPTS: [${extractedPatterns.join(", ")}]`,
    "",
    "QUERY: Identify assumption breakdowns, tension clusters, and evolution hypotheses.",
  ].join("\n");

  return {
    systemPrompt,
    userPrompt,
    concepts: extractedPatterns,
    novelty,
    clusters: semanticClusters,
  };
}

/**
 * Format critique feedback for next meditation
 * Extracts actionable points and suggests context for divergence
 */
export interface CritiqueContext {
  suggestedContextWords: string[];
  extractedFeedback: string[];
  provocativeQuestions: string[];
  userPrompt: string;
}

export function formatContextForMeditation(
  trace: MeditationTrace
): CritiqueContext {
  if (!trace.critique) {
    throw new Error("Trace must contain critique");
  }

  const { response } = trace.critique;

  // Extract feedback using M1 logic
  const feedback = extractFeedback(response);

  // Extract provocative questions (retain punctuation)
  const questions = extractQuestions(response).slice(0, 3);

  // Extract context words from feedback
  // Look for nouns/concepts in the feedback
  const contextWords = feedback
    .flatMap((f) => f.split(/\s+/))
    .filter(
      (word) =>
        word.length > 4 &&
        !["think", "about", "would", "could", "should"].includes(word)
    )
    .slice(0, 5);

  // Build user prompt for next meditation
  const userPrompt = [
    "Based on the feedback: ",
    feedback.map((f) => `• ${f}`).join("\n"),
    "",
    "And these questions to explore:",
    questions.map((q) => `• ${q}`).join("\n"),
    "",
    `Use these as seeds for the next meditation: ${contextWords.join(", ")}`,
  ].join("\n");

  return {
    suggestedContextWords: contextWords,
    extractedFeedback: feedback,
    provocativeQuestions: questions,
    userPrompt,
  };
}

/**
 * Build a full conversation bridge prompt
 * Shows the conversation flow for transparency
 */
export interface ConversationBridge {
  meditationSummary: string;
  critiqueSummary: string;
  transitionReasoning: string;
  suggestedNextMode: "diverge" | "converge";
  nextSteps: string[];
}

export function buildConversationBridge(
  meditationTrace: MeditationTrace,
  critiqueTrace: MeditationTrace,
  modeSwitch: { suggestedMode: string; confidence: number }
): ConversationBridge {
  if (!meditationTrace.meditation || !meditationTrace.insights) {
    throw new Error("Need valid meditation trace");
  }
  if (!critiqueTrace.critique) {
    throw new Error("Need valid critique trace");
  }

  const { emergentSentence } = meditationTrace.meditation;
  const { extractedPatterns, novelty } = meditationTrace.insights;
  const { response: critiqueText } = critiqueTrace.critique;

  const meditationSummary = [
    "MEDITATION PHASE:",
    `Emerged: "${emergentSentence}"`,
    `Concepts: ${extractedPatterns.join(", ")}`,
    `Novelty: ${(novelty * 100).toFixed(0)}%`,
  ].join("\n");

  const critiqueSummary = [
    "CRITIQUE PHASE:",
    `Response: ${critiqueText.substring(0, 200)}...`,
  ].join("\n");

  const transitionReasoning = [
    `SIGNAL: Bridge detected ${modeSwitch.suggestedMode} mode is ready.`,
    `Confidence: ${(modeSwitch.confidence * 100).toFixed(0)}%`,
    "",
    modeSwitch.suggestedMode === "diverge"
      ? "You've explored critique thoroughly. Time to generate new ideas."
      : "Ideas have converged. Time to evaluate and refine.",
  ].join("\n");

  const nextSteps =
    modeSwitch.suggestedMode === "diverge"
      ? [
          "Use extracted feedback as seeds for next meditation",
          "Try combining disparate critique points",
          "Explore tensions the critique revealed",
        ]
      : [
          "Deepen the novel concepts from meditation",
          "Challenge the assumptions you identified",
          "Generate variations and alternatives",
        ];

  return {
    meditationSummary,
    critiqueSummary,
    transitionReasoning,
    suggestedNextMode: modeSwitch.suggestedMode as "diverge" | "converge",
    nextSteps,
  };
}

export async function handleExtendContext(
  { sessionId, length = 10, seed }: { sessionId: string; length?: number; seed?: string },
  storage: StorageManager,
  dreamWeaver: typeof DreamWeaver
): Promise<{ narrative: string; themes: string[]; message: string }> {
  const session = await storage.loadSession(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const traces = session.traces || [];
  const narrative = await dreamWeaver.weave(traces, length, seed);

  const themes = extractThemesFromNarrative(narrative);

  return {
    narrative,
    themes,
    message: "Thematic narrative generated successfully."
  };
}
