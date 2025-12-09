/**
 * Enhanced extractFeedback and scoreRelevance for concept-thread coupling
 * 
 * This extends the existing feedback extraction and relevance scoring to support
 * multiple concept threads with fractional coupling (partial overlap).
 */

import { tokenize } from "./nlp.js";
import {
  ConceptThread,
  extractFeedbackWithThreadCoupling,
  scoreRelevanceByThread as scoreByThread,
} from "./conceptThreadCritique.js";

// ============================================================================
// Enhanced Feedback Extraction
// ============================================================================

/**
 * Extract feedback from critique with optional thread context
 * If threads are provided, each feedback item is tagged with thread couplings
 */
export function extractFeedbackEnhanced(
  critiqueResponse: string,
  threads?: ConceptThread[]
): string[] | ReturnType<typeof extractFeedbackWithThreadCoupling> {
  if (!threads || threads.length === 0) {
    // Fallback to simple extraction (existing behavior)
    return extractFeedbackSimple(critiqueResponse);
  }

  // Return enhanced feedback with thread couplings
  return extractFeedbackWithThreadCoupling(critiqueResponse, threads);
}

/**
 * Simple feedback extraction (existing implementation)
 */
export function extractFeedbackSimple(critiqueResponse: string): string[] {
  const feedback: string[] = [];
  const normalized = normalizeCritiqueText(critiqueResponse);
  const sentences = splitIntoSentences(normalized).map((s) => stripMarkdown(s));

  const actionPatterns = [
    /consider\s+/i,
    /try\s+/i,
    /explore\s+/i,
    /what\s+if\s+/i,
    /could\s+you\s+/i,
    /you\s+might\s+/i,
    /avoid\s+/i,
    /challenge\s+/i,
    /rethink\s+/i,
    /question\s+/i,
    /examine\s+/i,
    /suggest\s+/i,
  ];

  for (const sentence of sentences) {
    const hasAction = actionPatterns.some((pattern) => pattern.test(sentence));

    if (hasAction && sentence.length > 10) {
      const core = sentence
        .replace(/^(consider|try|explore|suggest)\s+/i, "")
        .trim();
      if (core.length > 0) {
        feedback.push(core);
      }
    }
  }

  if (feedback.length === 0) {
    feedback.push(...sentences.slice(0, 2));
  }

  return feedback.slice(0, 5);
}

// ============================================================================
// Enhanced Relevance Scoring
// ============================================================================

/**
 * Score how relevant a critique is, optionally considering concept threads
 * Returns:
 *  - Simple score (0-1) if no threads provided
 *  - Complex scoring object if threads provided
 */
export function scoreRelevanceEnhanced(
  meditationConcepts: string[],
  critiqueResponse: string,
  threads?: ConceptThread[]
): number | ReturnType<typeof scoreByThread> {
  if (!threads || threads.length === 0) {
    // Fallback to simple scoring (existing behavior)
    return scoreRelevanceSimple(meditationConcepts, critiqueResponse);
  }

  // Enhanced scoring with thread context
  const feedbackItems = extractFeedbackWithThreadCoupling(critiqueResponse, threads);
  return scoreByThread(critiqueResponse, threads, feedbackItems);
}

/**
 * Simple relevance scoring (existing implementation)
 * Range: 0-1, where 1 is most relevant
 */
export function scoreRelevanceSimple(
  meditationConcepts: string[],
  critiqueResponse: string
): number {
  const critiqueTokens = tokenize(critiqueResponse);

  // Check overlap between meditation concepts and critique tokens
  const overlap = meditationConcepts.filter((concept: string) =>
    critiqueTokens.some(
      (token: string) =>
        token.includes(concept) || concept.includes(token)
    )
  ).length;

  // Score: higher if critique mentions concepts
  const conceptMentionScore = overlap / Math.max(meditationConcepts.length, 1);

  // Also check: is critique substantive? (long enough to be meaningful)
  const length = critiqueTokens.length;
  const substantivenessScore = Math.min(1, length / 50); // 50 words = perfect score

  // Combined score (weighted)
  return conceptMentionScore * 0.7 + substantivenessScore * 0.3;
}

// ============================================================================
// Helper Functions
// ============================================================================

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/#+\s+/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .trim();
}

function normalizeCritiqueText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoSentences(text: string, keepPunctuation: boolean = false): string[] {
  const matches = text.match(/[^.!?]+[.!?]?/g);
  if (!matches) return [];
  return matches
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (keepPunctuation ? s : s.replace(/[.!?]+$/, "")));
}

// ============================================================================
// Thread Creation Helpers
// ============================================================================

/**
 * Create a concept thread from meditation data
 */
export function createThreadFromMeditation(
  id: string,
  concepts: string[],
  options?: {
    precedence?: number;
    weight?: number;
  }
): ConceptThread {
  return {
    id,
    concepts,
    timestamp: Date.now(),
    precedence: options?.precedence ?? 0.5,
    weight: options?.weight ?? 0.5,
  };
}

/**
 * Update thread weights based on current session state
 * This allows reweighting threads as the session progresses
 */
export function updateThreadWeights(
  threads: ConceptThread[],
  weights: Record<string, number>
): ConceptThread[] {
  return threads.map((thread) => ({
    ...thread,
    weight: weights[thread.id] ?? thread.weight,
  }));
}

/**
 * Update thread precedence based on importance
 */
export function updateThreadPrecedence(
  threads: ConceptThread[],
  precedences: Record<string, number>
): ConceptThread[] {
  return threads.map((thread) => ({
    ...thread,
    precedence: precedences[thread.id] ?? thread.precedence,
  }));
}
