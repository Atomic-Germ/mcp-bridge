/**
 * Concept-Thread Critique Formatter
 * 
 * Extends critique analysis by tracking multiple active concept threads and scoring
 * critiques relative to each thread. Instead of flat mention counts, uses partial
 * overlap scoring (fractional coupling) to understand how critique applies across
 * different conceptual paths in the same session.
 * 
 * Key innovations:
 * - Multi-thread tracking: maintain separate concept threads (primary, perpendicular, etc.)
 * - Fractional coupling: concepts can partially overlap between threads
 * - Per-thread relevance: score how critique applies to each thread independently
 * - Thread crossings: detect when critique bridges multiple threads
 */

import { jaccardSimilarity, cosineSimilarity, tokenize } from "./nlp.js";

// ============================================================================
// Type Definitions
// ============================================================================

export interface ConceptThread {
  id: string;              // "primary", "perpendicular", etc.
  concepts: string[];      // Active concepts in this thread
  timestamp: number;       // When was this thread created?
  precedence: number;      // Order of importance (0-1, higher = more important)
  weight: number;          // Coupling strength to overall session (0-1)
}

export interface FeedbackItem {
  text: string;
  threadCouplings: Map<string, number>;  // threadId → coupling strength [0,1]
  dominantThread: string;                 // Thread with highest coupling
  dominantCoupling: number;               // Strength of dominant coupling
  isThreadBridge: boolean;                // Connects multiple threads?
  threadCount: number;                    // How many threads does it touch?
}

export interface CritiqueScoring {
  feedbackItems: FeedbackItem[];
  relevanceByThread: Map<string, number>;  // threadId → overall relevance [0,1]
  threadWeightedRelevance: number;         // Relevance weighted by thread importance
  threadBridges: FeedbackItem[];          // Feedback that crosses thread boundaries
  threadCoverage: Map<string, number>;    // threadId → coverage [0,1]
  conceptMentionCoupling: Map<string, Map<string, number>>; // concept → threadId → coupling
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Extract feedback items from critique, tagging each to its concept threads
 */
export function extractFeedbackWithThreadCoupling(
  critiqueResponse: string,
  threads: ConceptThread[]
): FeedbackItem[] {
  const feedbackItems = extractFeedbackItems(critiqueResponse);
  const feedbackWithCoupling: FeedbackItem[] = [];

  for (const feedback of feedbackItems) {
    const threadCouplings = new Map<string, number>();
    
    // For each thread, compute coupling strength
    for (const thread of threads) {
      const coupling = computeThreadCoupling(feedback, thread);
      if (coupling > 0) {
        threadCouplings.set(thread.id, coupling);
      }
    }

    // Find dominant thread (highest coupling)
    let dominantThread = "unbound";
    let dominantCoupling = 0;
    for (const [threadId, coupling] of threadCouplings) {
      if (coupling > dominantCoupling) {
        dominantCoupling = coupling;
        dominantThread = threadId;
      }
    }

    // Is this a thread bridge? (touches multiple threads meaningfully)
    const isThreadBridge = threadCouplings.size > 1 && dominantCoupling < 0.8;

    feedbackWithCoupling.push({
      text: feedback,
      threadCouplings,
      dominantThread,
      dominantCoupling,
      isThreadBridge,
      threadCount: threadCouplings.size,
    });
  }

  return feedbackWithCoupling;
}

/**
 * Score critique relevance considering multiple threads and partial overlaps
 */
export function scoreRelevanceByThread(
  critiqueResponse: string,
  threads: ConceptThread[],
  feedbackItems: FeedbackItem[]
): CritiqueScoring {
  // Thread-specific relevance
  const relevanceByThread = new Map<string, number>();
  const threadCoverage = new Map<string, number>();

  for (const thread of threads) {
    const threadRelevance = computeThreadRelevance(
      critiqueResponse,
      thread,
      feedbackItems
    );
    relevanceByThread.set(thread.id, threadRelevance);

    // Coverage: fraction of thread concepts mentioned in critique
    const coverage = computeThreadCoverage(critiqueResponse, thread);
    threadCoverage.set(thread.id, coverage);
  }

  // Weighted relevance: higher weight on important threads
  let threadWeightedRelevance = 0;
  let totalWeight = 0;
  for (const thread of threads) {
    const relevance = relevanceByThread.get(thread.id) || 0;
    threadWeightedRelevance += relevance * thread.weight * thread.precedence;
    totalWeight += thread.weight * thread.precedence;
  }
  threadWeightedRelevance = totalWeight > 0 ? threadWeightedRelevance / totalWeight : 0;

  // Identify thread bridges: feedback touching multiple threads
  const threadBridges = feedbackItems.filter((item) => item.isThreadBridge);

  // Concept mention coupling: which concepts are mentioned and to which threads?
  const conceptMentionCoupling = buildConceptMentionCoupling(
    critiqueResponse,
    threads
  );

  return {
    feedbackItems,
    relevanceByThread,
    threadWeightedRelevance,
    threadBridges,
    threadCoverage,
    conceptMentionCoupling,
  };
}

/**
 * Compute coupling strength between a feedback item and a thread
 * Uses Jaccard + directional weighting for partial overlap
 */
function computeThreadCoupling(feedback: FeedbackItem | string, thread: ConceptThread): number {
  const feedbackText = typeof feedback === "string" ? feedback : feedback.text;
  const feedbackTokens = tokenize(feedbackText);

  // Case-insensitive token matching
  const normalizedTokens = feedbackTokens.map((t) => t.toLowerCase());
  const normalizedConcepts = thread.concepts.map((c) => c.toLowerCase());

  // Direct mention overlap
  const directMentions = normalizedConcepts.filter((concept) =>
    normalizedTokens.some((token) => token.includes(concept) || concept.includes(token))
  ).length;

  // Jaccard similarity on tokens
  const jaccardScore = jaccardSimilarity(normalizedTokens, normalizedConcepts);

  // Coupling = weighted combination of direct mentions + Jaccard
  const directMentionScore = directMentions / Math.max(thread.concepts.length, 1);
  const coupling = Math.max(
    directMentionScore * 0.6 +  // 60% from direct mentions
    jaccardScore * 0.4         // 40% from token overlap
  );

  return Math.min(1, coupling);
}

/**
 * Compute how relevant a critique is to a specific thread
 */
function computeThreadRelevance(
  critiqueResponse: string,
  thread: ConceptThread,
  feedbackItems: FeedbackItem[]
): number {
  // Thread-relevant feedback: items that couple strongly to this thread
  const threadRelevantItems = feedbackItems.filter(
    (item) => (item.threadCouplings.get(thread.id) || 0) > 0.3
  );

  if (threadRelevantItems.length === 0) {
    return 0; // No relevant feedback for this thread
  }

  // Average coupling strength of relevant items
  const avgCoupling =
    threadRelevantItems.reduce((sum, item) => sum + (item.threadCouplings.get(thread.id) || 0), 0) /
    threadRelevantItems.length;

  // Substantiveness: is the critique substantive enough to matter?
  const critiqueTokens = tokenize(critiqueResponse);
  const substantiveness = Math.min(1, critiqueTokens.length / 50); // 50 words = perfect

  // Combined: coupling + substantiveness
  return avgCoupling * 0.7 + substantiveness * 0.3;
}

/**
 * Compute what fraction of thread concepts are mentioned in critique
 */
function computeThreadCoverage(critiqueResponse: string, thread: ConceptThread): number {
  const critiqueTokens = tokenize(critiqueResponse).map((t) => t.toLowerCase());

  const coveredConcepts = thread.concepts.filter((concept) =>
    critiqueTokens.some((token) => token.includes(concept.toLowerCase()) || concept.toLowerCase().includes(token))
  ).length;

  return coveredConcepts / Math.max(thread.concepts.length, 1);
}

/**
 * Build a map of concept mentions and their coupling to threads
 * Returns: concept → (threadId → coupling strength)
 */
function buildConceptMentionCoupling(
  critiqueResponse: string,
  threads: ConceptThread[]
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();
  const critiqueTokens = tokenize(critiqueResponse).map((t) => t.toLowerCase());

  for (const thread of threads) {
    for (const concept of thread.concepts) {
      const normalized = concept.toLowerCase();

      // Find tokens that match this concept
      const matchingTokens = critiqueTokens.filter(
        (token) => token.includes(normalized) || normalized.includes(token)
      );

      if (matchingTokens.length > 0) {
        // Coupling: how strongly is this concept mentioned relative to thread?
        const coupling = Math.min(1, matchingTokens.length / Math.max(thread.concepts.length, 1));

        if (!result.has(normalized)) {
          result.set(normalized, new Map());
        }
        result.get(normalized)!.set(thread.id, coupling);
      }
    }
  }

  return result;
}

/**
 * Extract feedback items from critique text
 */
function extractFeedbackItems(critiqueResponse: string): string[] {
  const normalized = normalizeCritiqueText(critiqueResponse);
  const sentences = splitIntoSentences(normalized).map((s) => stripMarkdown(s));

  const feedback: string[] = [];
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

function normalizeCritiqueText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

function splitIntoSentences(text: string, keepPunctuation: boolean = false): string[] {
  const matches = text.match(/[^.!?]+[.!?]?/g);
  if (!matches) return [];
  return matches
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (keepPunctuation ? s : s.replace(/[.!?]+$/, "")));
}

// ============================================================================
// Utility: Format Scoring for Display
// ============================================================================

/**
 * Format critique scoring results for logging/display
 */
export function formatCritiqueScoring(scoring: CritiqueScoring): string {
  const lines: string[] = [];

  lines.push("=== Critique Scoring by Thread ===");
  for (const [threadId, relevance] of scoring.relevanceByThread) {
    const coverage = scoring.threadCoverage.get(threadId) || 0;
    lines.push(`  ${threadId}: relevance=${relevance.toFixed(2)}, coverage=${coverage.toFixed(2)}`);
  }

  lines.push(`\nWeighted Relevance: ${scoring.threadWeightedRelevance.toFixed(2)}`);

  if (scoring.threadBridges.length > 0) {
    lines.push(`\nThread Bridges (${scoring.threadBridges.length}):`);
    for (const bridge of scoring.threadBridges) {
      lines.push(`  - ${bridge.text.substring(0, 60)}...`);
      lines.push(`    touches: ${Array.from(bridge.threadCouplings.keys()).join(", ")}`);
    }
  }

  lines.push(`\nFeedback Items (${scoring.feedbackItems.length}):`);
  for (const item of scoring.feedbackItems.slice(0, 3)) {
    lines.push(`  - [${item.dominantThread}] ${item.text.substring(0, 50)}...`);
  }

  return lines.join("\n");
}
