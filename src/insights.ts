/**
 * Insight extraction engine for MCP-Bridge
 * Extracts concepts, computes novelty, clusters related ideas
 */

import {
  extractKeywords,
  tokenize,
  jaccardSimilarity,
  semanticCluster,
  averageSimilarity,
  extractNounLikeConcepts,
  cosineSimilarity,
} from "./utils/nlp.js";
import { Insight, ContemplativeMemory } from "./types.js";

/**
 * Extract insights from a meditation text
 * Returns concepts, novelty score, and semantic clusters
 */
export function extractInsights(
  meditationText: string,
  sessionMemory: ContemplativeMemory | null
): Insight {
  const extractedAt = Date.now();

  // Strategy: Combine keyword extraction + noun-like concept detection
  // 1. Extract top keywords (frequency-based)
  // 2. Extract noun-like concepts (grammatical heuristic)
  // 3. Deduplicate and merge
  // 4. Cluster related concepts
  // 5. Compute novelty vs. session history

  // Get keywords
  const keywords = extractKeywords(meditationText, 10);

  // Get noun-like concepts (usually more meaningful)
  const nounConcepts = extractNounLikeConcepts(meditationText);

  // Merge: take unique from both, prioritize nouns
  const conceptSet = new Set<string>();
  nounConcepts.forEach((c: string) => conceptSet.add(c));
  keywords.forEach((c: string) => conceptSet.add(c));

  // Convert to array and take top 5 (we'll cluster these)
  let extractedPatterns = Array.from(conceptSet).slice(0, 5);

  // If we got fewer than 3 concepts, relax the criteria
  if (extractedPatterns.length < 3) {
    extractedPatterns = extractKeywords(meditationText, 5);
  }

  // Cluster the extracted patterns
  const semanticClusters = semanticCluster(extractedPatterns);

  // Compute novelty
  const novelty = computeNoveltyScore(
    extractedPatterns,
    sessionMemory
  );

  return {
    extractedPatterns,
    novelty,
    semanticClusters,
    extractedAt,
  };
}

/**
 * Compute how novel these concepts are relative to session history
 * Returns 0-1: 0 = identical to prior, 1 = completely new
 */
export function computeNoveltyScore(
  currentConcepts: string[],
  sessionMemory: ContemplativeMemory | null
): number {
  if (!sessionMemory || sessionMemory.traces.length === 0) {
    return 1.0; // First meditation is maximally novel
  }

  // Get recent prior concepts (last 3 meditations)
  const recentTraces = sessionMemory.traces.slice(-3);
  const priorConceptSets = recentTraces
    .filter((t: any) => t.insights)
    .map((t: any) => t.insights!.extractedPatterns);

  if (priorConceptSets.length === 0) {
    return 1.0;
  }

  // Compute average similarity to prior concepts
  const avgSim = averageSimilarity(currentConcepts, priorConceptSets);

  // Novelty = 1 - average_similarity
  // This gives us: 1.0 (totally new) to 0.0 (identical to prior)
  return Math.max(0, Math.min(1, 1.0 - avgSim));
}

/**
 * Strip markdown formatting from text
 * Removes bold, italic, links, code blocks, and other markdown syntax
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
    .replace(/\*([^*]+)\*/g, "$1") // Italic
    .replace(/__([^_]+)__/g, "$1") // Bold underscore
    .replace(/_([^_]+)_/g, "$1") // Italic underscore
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links
    .replace(/`([^`]+)`/g, "$1") // Inline code
    .replace(/```[\s\S]*?```/g, "") // Code blocks
    .replace(/#+\s+/g, "") // Headers
    .replace(/^\s*[-*+]\s+/gm, "") // Bullet points
    .replace(/^\s*\d+\.\s+/gm, "") // Numbered lists
    .trim();
}

/**
 * Extract actionable feedback from a critique response
 * Identifies sentences/phrases that suggest actions or considerations
 */
export function extractFeedback(critiqueResponse: string): string[] {
  const feedback: string[] = [];

  const normalized = normalizeCritiqueText(critiqueResponse);
  const sentences = splitIntoSentences(normalized).map((s) => stripMarkdown(s));

  // Look for actionable patterns
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
    // Check if sentence contains action patterns
    const hasAction = actionPatterns.some((pattern) => pattern.test(sentence));

    if (hasAction && sentence.length > 10) {
      // Extract the core phrase (remove redundant connectors)
      const core = sentence
        .replace(/^(consider|try|explore|suggest)\s+/i, "")
        .trim();
      if (core.length > 0) {
        feedback.push(core);
      }
    }
  }

  // If no actionable feedback found, take first 2 sentences as context
  if (feedback.length === 0) {
    feedback.push(...sentences.slice(0, 2));
  }

  return feedback.slice(0, 5); // Return top 5
}

export function extractQuestions(critiqueResponse: string): string[] {
  const normalized = normalizeCritiqueText(critiqueResponse);
  const sentences = splitIntoSentences(normalized, true);
  return sentences.filter((s) => s.endsWith("?")).slice(0, 5);
}

function normalizeCritiqueText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1") // italics
    .replace(/`(.*?)`/g, "$1") // code
    .replace(/^\s*[-*•]\s+/gm, "") // bullets
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

/**
 * Score how relevant a critique is to the meditation concepts
 * Returns 0-1: relevance score
 */
export function scoreRelevance(
  meditationConcepts: string[],
  critiqueResponse: string
): number {
  // Extract words from critique
  const critiqueTokens = tokenize(critiqueResponse);

  // Check overlap between meditation concepts and critique tokens
  const overlap = meditationConcepts.filter((concept: string) =>
    critiqueTokens.some(
      (token: string) =>
        token.includes(concept) || concept.includes(token)
    )
  ).length;

  // Score: higher if critique mentions concepts
  const conceptMentionScore =
    overlap / Math.max(meditationConcepts.length, 1);

  // Also check: is critique substantive? (long enough to be meaningful)
  const length = critiqueTokens.length;
  const substantivenessScore = Math.min(1, length / 50); // 50 words = perfect score

  // Combined score (weighted)
  return (
    conceptMentionScore * 0.7 + // 70% from concept mentions
    substantivenessScore * 0.3 // 30% from substantiveness
  );
}

/**
 * Compute semantic distance between two concept sets
 * Used for detecting when ideas are converging (saturation)
 */
export function semanticDistance(
  concepts1: string[],
  concepts2: string[]
): number {
  // 1 - similarity = distance
  // Range: 0 (identical) to 1 (completely different)
  return 1.0 - jaccardSimilarity(concepts1, concepts2);
}

/**
 * Detect saturation: when ideas are repeating/converging
 * Returns true if recent meditations are too similar
 */
export function detectSaturation(
  currentConcepts: string[],
  sessionMemory: ContemplativeMemory | null,
  threshold: number = 0.6
): boolean {
  if (!sessionMemory || sessionMemory.traces.length < 2) {
    return false; // Need at least 2 prior traces to detect saturation
  }

  // Get last trace's concepts
  const lastTrace = sessionMemory.traces[sessionMemory.traces.length - 1];
  if (!lastTrace.insights) return false;

  const lastConcepts = lastTrace.insights.extractedPatterns;

  // Compute overlap
  const overlap = jaccardSimilarity(currentConcepts, lastConcepts);

  // High overlap = saturation
  return overlap > threshold;
}
