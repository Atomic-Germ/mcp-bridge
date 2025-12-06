/**
 * Context Injection Engine for MCP-Bridge (Milestone 3)
 * Formats meditation insights for critique prompts and vice versa
 * Creates seamless idea flow between diverge (meditation) and converge (critique)
 */

import { MeditationTrace } from "./types.js";
import { extractFeedback } from "./insights.js";

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

  // Build system prompt: establish the grounding
  const systemPrompt = [
    "You are an expert at structured critique, helping refine ideas through careful evaluation.",
    "",
    "CONTEXT:",
    `The person just meditated on: [${contextWords.join(", ")}]`,
    `And arrived at this emergent insight: "${emergentSentence}"`,
    "",
    "KEY CONCEPTS TO EVALUATE:",
    extractedPatterns.map((c, i) => `  ${i + 1}. ${c}`).join("\n"),
    "",
    "SEMANTIC RELATIONSHIPS:",
    semanticClusters
      .map((cluster, i) => `  Cluster ${i + 1}: [${cluster.join(", ")}]`)
      .join("\n"),
    "",
    `NOVELTY SIGNAL: ${(novelty * 100).toFixed(0)}% (0=familiar, 100=breakthrough)`,
    sessionHistory
      ? `SESSION PATTERN: ${sessionHistory.count} meditations so far, avg novelty ${(sessionHistory.avgNovelty * 100).toFixed(0)}%`
      : "",
    "",
    "YOUR TASK:",
    "Provide structured critique that:",
    "• Questions assumptions in the concepts above",
    "• Suggests novel angles the person hasn't considered",
    "• Identifies tensions or contradictions",
    "• Proposes next steps for deepening the ideas",
    "",
    "Format: Lead with specific feedback, end with actionable suggestions.",
  ]
    .filter((line) => line !== "" || line.length > 0) // Keep structure
    .join("\n");

  // Build user prompt: the actual question
  const userPrompt = [
    `I just had this creative insight: "${emergentSentence}"`,
    "",
    `Based on thinking about: ${contextWords.join(", ")}`,
    "",
    "The concepts I'm working with are:",
    extractedPatterns.map((c) => `• ${c}`).join("\n"),
    "",
    "Please critique my thinking. What am I missing? What should I explore next?",
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

  // Extract provocative questions (sentences with ? mark)
  const sentences = response.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const questions = sentences
    .filter((s) => response.includes(s + "?"))
    .map((s) => s.trim())
    .slice(0, 3);

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
