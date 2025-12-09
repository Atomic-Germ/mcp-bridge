/**
 * IMPLEMENTATION GUIDE: Concept-Thread Critique Formatter
 * 
 * How to integrate multi-thread critique analysis into the perpendicular planner
 */

// ============================================================================
// 1. BASIC USAGE: Single Critique with Multiple Threads
// ============================================================================

/**
 * Example: Analyzing a critique from running both primary and perpendicular meditations
 */

import {
  extractFeedbackWithThreadCoupling,
  scoreRelevanceByThread,
  ConceptThread,
} from "../utils/conceptThreadCritique.js";

export function analyzePerpendicularCritique(
  critiqueResponse: string,
  primaryConcepts: string[],
  perpendicularConcepts: string[]
): void {
  // Step 1: Create concept threads from meditation results
  const threads: ConceptThread[] = [
    {
      id: "primary",
      concepts: primaryConcepts,
      timestamp: Date.now(),
      precedence: 0.8,  // Primary is more important
      weight: 0.7,      // Primary carries 70% of weight
    },
    {
      id: "perpendicular",
      concepts: perpendicularConcepts,
      timestamp: Date.now(),
      precedence: 0.6,  // Perpendicular is exploratory
      weight: 0.3,      // Perpendicular carries 30% of weight
    },
  ];

  // Step 2: Extract feedback with thread couplings
  const feedbackItems = extractFeedbackWithThreadCoupling(critiqueResponse, threads);

  console.log("Feedback Items:");
  for (const item of feedbackItems) {
    console.log(`  - "${item.text}"`);
    console.log(`    dominant: ${item.dominantThread} (coupling: ${item.dominantCoupling.toFixed(2)})`);
    console.log(`    threads: ${Array.from(item.threadCouplings.keys()).join(", ")}`);
    if (item.isThreadBridge) {
      console.log(`    ✓ BRIDGES MULTIPLE THREADS`);
    }
  }

  // Step 3: Score relevance per thread
  const scoring = scoreRelevanceByThread(critiqueResponse, threads, feedbackItems);

  console.log("\nThread Relevance Scores:");
  for (const [threadId, relevance] of scoring.relevanceByThread) {
    const coverage = scoring.threadCoverage.get(threadId) || 0;
    console.log(`  ${threadId}: relevance=${relevance.toFixed(2)}, coverage=${coverage.toFixed(2)}`);
  }

  console.log(`\nWeighted Relevance: ${scoring.threadWeightedRelevance.toFixed(2)}`);

  // Step 4: Identify bridges (feedback connecting multiple threads)
  if (scoring.threadBridges.length > 0) {
    console.log(`\nThread Bridges (${scoring.threadBridges.length}):`);
    for (const bridge of scoring.threadBridges) {
      const threads = Array.from(bridge.threadCouplings.keys());
      console.log(`  ✓ Connects: ${threads.join(" ↔ ")}`);
      console.log(`    "${bridge.text}"`);
    }
  }
}

// ============================================================================
// 2. TRACKING CONCEPT THREADS ACROSS SESSION
// ============================================================================

export interface SessionThreadState {
  threads: ConceptThread[];
  roundCritiqueScores: Array<{ round: number; scoring: any }>;
  cumulativeThreadRelevance: Map<string, number>;
  threadDrift: Map<string, number>;
}

export function initializeSessionThreadState(): SessionThreadState {
  return {
    threads: [],
    roundCritiqueScores: [],
    cumulativeThreadRelevance: new Map(),
    threadDrift: new Map(),
  };
}

export function updateSessionThreadState(
  state: SessionThreadState,
  newThreads: ConceptThread[],
  critiqueScoringResult: any,
  roundNumber: number
): SessionThreadState {
  state.threads = newThreads;

  state.roundCritiqueScores.push({
    round: roundNumber,
    scoring: critiqueScoringResult,
  });

  for (const [threadId, relevance] of critiqueScoringResult.relevanceByThread) {
    const current = state.cumulativeThreadRelevance.get(threadId) || 0;
    const updated = (current * (roundNumber - 1) + relevance) / roundNumber;
    state.cumulativeThreadRelevance.set(threadId, updated);
  }

  for (const thread of newThreads) {
    const prevThread = state.threads.find((t) => t.id === thread.id);
    if (prevThread) {
      const drift = computeConceptDrift(prevThread.concepts, thread.concepts);
      state.threadDrift.set(thread.id, drift);
    }
  }

  return state;
}

function computeConceptDrift(prev: string[], current: string[]): number {
  const common = prev.filter((c) => current.includes(c)).length;
  const total = Math.max(prev.length, current.length);
  return 1 - common / total;
}
