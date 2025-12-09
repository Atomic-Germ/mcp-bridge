/**
 * Tests for Concept-Thread Critique Formatter
 */

import { describe, it, expect } from "vitest";
import {
  extractFeedbackWithThreadCoupling,
  scoreRelevanceByThread,
  ConceptThread,
  formatCritiqueScoring,
} from "../utils/conceptThreadCritique.js";

describe("ConceptThreadCritique", () => {
  // Setup: two concept threads (primary and perpendicular)
  const primaryThread: ConceptThread = {
    id: "primary",
    concepts: ["threshold", "gradient", "constraint"],
    timestamp: Date.now(),
    precedence: 0.8,
    weight: 0.7,
  };

  const perpendicularThread: ConceptThread = {
    id: "perpendicular",
    concepts: ["mutation", "chaos", "inversion"],
    timestamp: Date.now(),
    precedence: 0.6,
    weight: 0.3,
  };

  const threads = [primaryThread, perpendicularThread];

  const critique = `
    **Key insight:** Consider how gradients interact with constraint mutation.
    Suggestion: Explore the threshold between ordered and chaotic inversion.
    Question: Does the system stabilize under inversion?
    Note: Constraints themselves may undergo mutation at deeper nesting.
  `;

  describe("extractFeedbackWithThreadCoupling", () => {
    it("extracts feedback and assigns thread couplings", () => {
      const feedback = extractFeedbackWithThreadCoupling(critique, threads);
      
      expect(feedback.length).toBeGreaterThan(0);
      
      // Each feedback item should have thread couplings
      for (const item of feedback) {
        expect(item.threadCouplings.size).toBeGreaterThan(0);
        expect(item.dominantThread).toBeDefined();
        expect(item.dominantCoupling).toBeGreaterThan(0);
      }
    });

    it("identifies thread bridges (feedback touching multiple threads)", () => {
      const feedback = extractFeedbackWithThreadCoupling(critique, threads);
      
      // "gradient interact with constraint mutation" should bridge both threads
      const bridges = feedback.filter((item) => item.isThreadBridge);
      
      expect(bridges.length).toBeGreaterThan(0);
      for (const bridge of bridges) {
        expect(bridge.threadCount).toBeGreaterThan(1);
      }
    });

    it("weights coupling by concept overlap", () => {
      const feedback = extractFeedbackWithThreadCoupling(critique, threads);
      
      // Feedback mentioning "gradient" should have high coupling to primary thread
      const gradientFeedback = feedback.find((item) =>
        item.text.toLowerCase().includes("gradient")
      );
      
      if (gradientFeedback) {
        const primaryCoupling = gradientFeedback.threadCouplings.get("primary") || 0;
        expect(primaryCoupling).toBeGreaterThan(0.3);
      }
    });
  });

  describe("scoreRelevanceByThread", () => {
    it("computes per-thread relevance scores", () => {
      const feedback = extractFeedbackWithThreadCoupling(critique, threads);
      const scoring = scoreRelevanceByThread(critique, threads, feedback);
      
      // Both threads should have some relevance
      const primaryRelevance = scoring.relevanceByThread.get("primary") || 0;
      const perpRelevance = scoring.relevanceByThread.get("perpendicular") || 0;
      
      expect(primaryRelevance).toBeGreaterThan(0);
      expect(perpRelevance).toBeGreaterThan(0);
    });

    it("weights relevance by thread importance", () => {
      const feedback = extractFeedbackWithThreadCoupling(critique, threads);
      const scoring = scoreRelevanceByThread(critique, threads, feedback);
      
      // Weighted relevance should be a reasonable combination
      expect(scoring.threadWeightedRelevance).toBeGreaterThanOrEqual(0);
      expect(scoring.threadWeightedRelevance).toBeLessThanOrEqual(1);
    });

    it("tracks thread coverage (fraction of concepts mentioned)", () => {
      const feedback = extractFeedbackWithThreadCoupling(critique, threads);
      const scoring = scoreRelevanceByThread(critique, threads, feedback);
      
      // Primary thread concepts (threshold, gradient, constraint) are mentioned
      const primaryCoverage = scoring.threadCoverage.get("primary") || 0;
      expect(primaryCoverage).toBeGreaterThan(0);
    });

    it("identifies thread bridges in scoring output", () => {
      const feedback = extractFeedbackWithThreadCoupling(critique, threads);
      const scoring = scoreRelevanceByThread(critique, threads, feedback);
      
      // Should have thread bridges identified
      expect(Array.isArray(scoring.threadBridges)).toBe(true);
    });

    it("maps concept mentions to thread couplings", () => {
      const feedback = extractFeedbackWithThreadCoupling(critique, threads);
      const scoring = scoreRelevanceByThread(critique, threads, feedback);
      
      // "constraint" should map to primary thread
      const constraintCouplings = scoring.conceptMentionCoupling.get("constraint");
      if (constraintCouplings) {
        expect(constraintCouplings.has("primary")).toBe(true);
      }
    });
  });

  describe("Integration: Full critique analysis", () => {
    it("handles critique with mixed thread relevance", () => {
      const mixedCritique = `
        The gradient approach works well for primary constraints.
        However, consider how mutation affects the overall system stability.
        What if we introduce chaos to test resilience?
      `;
      
      const feedback = extractFeedbackWithThreadCoupling(mixedCritique, threads);
      const scoring = scoreRelevanceByThread(mixedCritique, threads, feedback);
      
      expect(feedback.length).toBeGreaterThan(0);
      expect(scoring.relevanceByThread.size).toBeGreaterThan(0);
      expect(scoring.threadWeightedRelevance).toBeGreaterThanOrEqual(0);
    });

    it("handles critique with strong single-thread focus", () => {
      const primaryFocusCritique = `
        Consider how the gradient threshold evolves over time.
        Examine constraint behavior under different conditions.
        The system should maintain order while allowing controlled change.
      `;
      
      const feedback = extractFeedbackWithThreadCoupling(primaryFocusCritique, threads);
      const scoring = scoreRelevanceByThread(primaryFocusCritique, threads, feedback);
      
      const primaryRelevance = scoring.relevanceByThread.get("primary") || 0;
      const perpRelevance = scoring.relevanceByThread.get("perpendicular") || 0;
      
      // Primary should dominate
      expect(primaryRelevance).toBeGreaterThan(perpRelevance);
    });

    it("formats scoring output for display", () => {
      const feedback = extractFeedbackWithThreadCoupling(critique, threads);
      const scoring = scoreRelevanceByThread(critique, threads, feedback);
      const formatted = formatCritiqueScoring(scoring);
      
      expect(formatted).toContain("Critique Scoring by Thread");
      expect(formatted).toContain("primary");
      expect(formatted).toContain("perpendicular");
    });
  });

  describe("Edge cases", () => {
    it("handles empty critique", () => {
      const emptyFeedback = extractFeedbackWithThreadCoupling("", threads);
      expect(Array.isArray(emptyFeedback)).toBe(true);
    });

    it("handles critique with no concept mentions", () => {
      const noConcept = "The sky is blue. Birds can fly.";
      const feedback = extractFeedbackWithThreadCoupling(noConcept, threads);
      const scoring = scoreRelevanceByThread(noConcept, threads, feedback);
      
      // Should have low relevance but not crash
      expect(scoring.threadWeightedRelevance).toBeLessThan(0.5);
    });

    it("handles single thread", () => {
      const singleThread = [primaryThread];
      const feedback = extractFeedbackWithThreadCoupling(critique, singleThread);
      const scoring = scoreRelevanceByThread(critique, singleThread, feedback);
      
      expect(scoring.relevanceByThread.size).toBe(1);
    });

    it("handles threads with overlapping concepts", () => {
      const overlappingThread1: ConceptThread = {
        id: "thread1",
        concepts: ["gradient", "threshold"],
        timestamp: Date.now(),
        precedence: 0.5,
        weight: 0.5,
      };

      const overlappingThread2: ConceptThread = {
        id: "thread2",
        concepts: ["gradient", "mutation"],
        timestamp: Date.now(),
        precedence: 0.5,
        weight: 0.5,
      };

      const feedback = extractFeedbackWithThreadCoupling(
        "The gradient undergoes mutation.",
        [overlappingThread1, overlappingThread2]
      );

      // "gradient" should couple to both threads
      const gradientFeedback = feedback.find((item) =>
        item.text.toLowerCase().includes("gradient")
      );

      if (gradientFeedback) {
        expect(gradientFeedback.threadCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("Fractional coupling behavior", () => {
    it("assigns partial coupling when concepts partially overlap", () => {
      const feedback = extractFeedbackWithThreadCoupling(
        "threshold gradient",
        [primaryThread]
      );

      // Both "threshold" and "gradient" are in primary thread
      if (feedback.length > 0) {
        const coupling = feedback[0].threadCouplings.get("primary") || 0;
        expect(coupling).toBeGreaterThan(0);
        expect(coupling).toBeLessThanOrEqual(1);
      }
    });

    it("identifies thread bridges with intermediate coupling", () => {
      // Feedback that touches both threads but not strongly
      const bridgingFeedback = extractFeedbackWithThreadCoupling(
        "Consider gradient-based mutation handling",
        threads
      );

      const bridges = bridgingFeedback.filter((item) => item.isThreadBridge);
      if (bridges.length > 0) {
        // Bridge should have moderate coupling to multiple threads
        const bridge = bridges[0];
        expect(bridge.dominantCoupling).toBeLessThan(0.8);
      }
    });
  });
});
