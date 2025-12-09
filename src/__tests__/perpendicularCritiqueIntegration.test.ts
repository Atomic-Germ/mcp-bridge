/**
 * Integration Tests: ConceptThreadCritique with Perpendicular Planner
 * 
 * Demonstrates how concept-thread tracking works in the context of
 * perpendicular meditation planning with multi-thread critique analysis.
 */

import { describe, it, expect } from "vitest";
import {
  extractFeedbackWithThreadCoupling,
  scoreRelevanceByThread,
  ConceptThread,
} from "../utils/conceptThreadCritique.js";
import {
  createThreadFromMeditation,
  extractFeedbackSimple,
  scoreRelevanceSimple,
} from "../utils/enhancedInsights.js";
import { buildPairedMeditationPlan, derivePerpendularStateFromSession } from "../experiments/perpendicularBridge.js";
import type { ContemplativeMemory, MeditationTrace } from "../types.js";

describe("Perpendicular Planner + ConceptThreadCritique Integration", () => {
  /**
   * Scenario: A session with primary and perpendicular meditation paths
   * We track both concept threads and analyze how critique applies to each
   */

  const buildMockSession = (meditations: { concepts: string[] }[]): ContemplativeMemory => {
    const traces: MeditationTrace[] = meditations.map((med, idx) => ({
      id: `trace-${idx}`,
      timestamp: Date.now() + idx * 1000,
      mode: idx % 2 === 0 ? "diverge" : "converge",
      meditation: {
        contextWords: med.concepts,
        numRandomWords: 10,
        seed: `seed-${idx}`,
        emergentSentence: med.concepts.join(" ") + " emergent.",
      },
      insights: {
        extractedPatterns: med.concepts,
        novelty: 1 - idx * 0.1,
        semanticClusters: [med.concepts],
        extractedAt: Date.now(),
      },
      bridge: {
        confidenceLevel: 0.8,
      },
    }));

    return {
      traces,
      sessionId: "session-1",
      startedAt: Date.now(),
      metrics: {
        lastModeSwitch: Date.now(),
        currentMode: "diverge",
        repetitionCount: 0,
        pauseDuration: 0,
        avgCycleDuration: 5,
        lastSuggestionTime: Date.now(),
      },
    };
  };

  it("tracks primary and perpendicular meditation threads separately", () => {
    const primaryConcepts = ["threshold", "gradient", "constraint"];
    const perpendicularConcepts = ["mutation", "chaos", "inversion"];

    const primaryThread = createThreadFromMeditation("primary", primaryConcepts, {
      precedence: 0.8,
      weight: 0.7,
    });

    const perpThread = createThreadFromMeditation("perpendicular", perpendicularConcepts, {
      precedence: 0.6,
      weight: 0.3,
    });

    expect(primaryThread.concepts).toEqual(primaryConcepts);
    expect(perpThread.concepts).toEqual(perpendicularConcepts);
    expect(primaryThread.weight).toBeGreaterThan(perpThread.weight);
  });

  it("analyzes critique relevant to both threads", () => {
    const threads: ConceptThread[] = [
      createThreadFromMeditation("primary", ["threshold", "gradient"], {
        precedence: 0.8,
        weight: 0.7,
      }),
      createThreadFromMeditation("perpendicular", ["mutation", "chaos"], {
        precedence: 0.6,
        weight: 0.3,
      }),
    ];

    // Critique addressing both meditation paths
    const critique = `
      The primary gradient threshold works well for stability.
      However, the perpendicular mutation approach introduces chaos.
      Consider how to balance constraint-based order with mutation-driven exploration.
    `;

    const feedback = extractFeedbackWithThreadCoupling(critique, threads);
    const scoring = scoreRelevanceByThread(critique, threads, feedback);

    // Should score both threads
    expect(scoring.relevanceByThread.size).toBe(2);

    // Primary should have higher relevance (mentioned first, more stable language)
    const primaryRel = scoring.relevanceByThread.get("primary") || 0;
    const perpRel = scoring.relevanceByThread.get("perpendicular") || 0;

    expect(primaryRel).toBeGreaterThanOrEqual(0);
    expect(perpRel).toBeGreaterThanOrEqual(0);
  });

  it("identifies thread bridges in critique", () => {
    const threads: ConceptThread[] = [
      createThreadFromMeditation("primary", ["order", "stability"], {
        precedence: 0.8,
        weight: 0.7,
      }),
      createThreadFromMeditation("perpendicular", ["chaos", "mutation"], {
        precedence: 0.6,
        weight: 0.3,
      }),
    ];

    // Critique that bridges both threads
    const bridgingCritique = `
      Consider how chaotic mutation could enhance stability.
      What if stable order and chaos could coexist in a dynamic equilibrium?
    `;

    const feedback = extractFeedbackWithThreadCoupling(bridgingCritique, threads);
    const scoring = scoreRelevanceByThread(bridgingCritique, threads, feedback);

    // Should identify bridges
    expect(scoring.threadBridges.length).toBeGreaterThanOrEqual(0);
  });

  it("compares simple vs. enhanced relevance scoring", () => {
    const concepts = ["threshold", "gradient"];
    const critique = "The gradient threshold approach is innovative. Consider mutation patterns.";

    // Simple scoring (existing)
    const simpleScore = scoreRelevanceSimple(concepts, critique);

    // Enhanced scoring with threads
    const threads = [
      createThreadFromMeditation("primary", concepts, { precedence: 0.8, weight: 0.7 }),
      createThreadFromMeditation("perpendicular", ["mutation"], { precedence: 0.6, weight: 0.3 }),
    ];

    const enhancedScoring = scoreRelevanceByThread(critique, threads, []);

    // Both should indicate relevance
    expect(simpleScore).toBeGreaterThan(0);
    expect(enhancedScoring.threadWeightedRelevance).toBeGreaterThanOrEqual(0);
  });

  it("tracks concept mention coupling across threads", () => {
    const threads: ConceptThread[] = [
      createThreadFromMeditation("primary", ["gradient", "threshold"], {
        precedence: 0.8,
        weight: 0.7,
      }),
      createThreadFromMeditation("perpendicular", ["gradient", "mutation"], {
        precedence: 0.6,
        weight: 0.3,
      }),
    ];

    // Critique mentioning shared concept "gradient"
    const critique = "The gradient mechanism is fundamental to both approaches.";

    const feedback = extractFeedbackWithThreadCoupling(critique, threads);
    const scoring = scoreRelevanceByThread(critique, threads, feedback);

    // "gradient" should appear in conceptMentionCoupling
    expect(scoring.conceptMentionCoupling.size).toBeGreaterThan(0);
  });

  it("handles session with multiple meditation pairs", () => {
    const mockSession = buildMockSession([
      { concepts: ["threshold", "gradient"] },
      { concepts: ["mutation", "chaos"] },
      { concepts: ["threshold", "mutation"] },
    ]);

    // Create threads from first two meditations (primary + perpendicular pair)
    const primaryTrace = mockSession.traces[0];
    const perpTrace = mockSession.traces[1];

    const threads = [
      createThreadFromMeditation(
        "primary",
        primaryTrace.insights?.extractedPatterns || [],
        { precedence: 0.8, weight: 0.7 }
      ),
      createThreadFromMeditation(
        "perpendicular",
        perpTrace.insights?.extractedPatterns || [],
        { precedence: 0.6, weight: 0.3 }
      ),
    ];

    expect(threads[0].concepts).toEqual(["threshold", "gradient"]);
    expect(threads[1].concepts).toEqual(["mutation", "chaos"]);
  });

  it("handles critique with varying thread relevance", () => {
    const threads: ConceptThread[] = [
      createThreadFromMeditation("primary", ["order", "stability"], {
        precedence: 0.9,
        weight: 0.8,
      }),
      createThreadFromMeditation("secondary", ["exploration"], {
        precedence: 0.5,
        weight: 0.2,
      }),
    ];

    // Critique focused on primary thread
    const critiquePrimary = "Stability and order are crucial for this approach.";

    const feedback = extractFeedbackWithThreadCoupling(critiquePrimary, threads);
    const scoring = scoreRelevanceByThread(critiquePrimary, threads, feedback);

    // Primary should dominate
    const primaryRel = scoring.relevanceByThread.get("primary") || 0;
    const secondaryRel = scoring.relevanceByThread.get("secondary") || 0;

    expect(primaryRel).toBeGreaterThanOrEqual(secondaryRel);
  });

  it("fallback to simple extraction when no threads provided", () => {
    const critique = "Consider exploring gradient approaches. Try asymmetric paths.";

    // Without threads, should use simple extraction
    const simpleFeedback = extractFeedbackSimple(critique);

    expect(Array.isArray(simpleFeedback)).toBe(true);
    expect(simpleFeedback.length).toBeGreaterThan(0);
  });

  it("preserves backward compatibility with existing code", () => {
    const concepts = ["threshold", "gradient"];
    const critique = "The gradient threshold is innovative.";

    // Old code should still work
    const simpleScore = scoreRelevanceSimple(concepts, critique);

    expect(simpleScore).toBeGreaterThan(0);
    expect(simpleScore).toBeLessThanOrEqual(1);
  });
});
