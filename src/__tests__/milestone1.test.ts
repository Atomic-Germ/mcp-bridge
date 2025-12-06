/**
 * Tests for Milestone 1: Insight Extraction
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  tokenize,
  extractKeywords,
  jaccardSimilarity,
  cosineSimilarity,
  semanticCluster,
  averageSimilarity,
  extractNounLikeConcepts,
} from "../utils/nlp.js";
import {
  extractInsights,
  computeNoveltyScore,
  extractFeedback,
  scoreRelevance,
  semanticDistance,
  detectSaturation,
} from "../insights.js";
import { ContemplativeMemory, MeditationTrace } from "../types.js";

describe("Milestone 1: Insight Extraction", () => {
  describe("NLP Utilities", () => {
    describe("tokenize", () => {
      it("should split text into words", () => {
        const tokens = tokenize("Constraint births creativity");
        expect(tokens).toContain("constraint");
        expect(tokens).toContain("births");
        expect(tokens).toContain("creativity");
      });

      it("should handle punctuation", () => {
        const tokens = tokenize("Hello, world! How are you?");
        expect(tokens).not.toContain("");
        expect(tokens.length).toBeGreaterThan(0);
      });

      it("should be case-insensitive", () => {
        const tokens = tokenize("CONSTRAINT creativity");
        expect(tokens[0]).toBe("constraint");
      });
    });

    describe("extractKeywords", () => {
      it("should extract top keywords by frequency", () => {
        const text =
          "creativity is about finding new ways to solve problems. creativity requires thinking differently.";
        const keywords = extractKeywords(text);
        expect(keywords).toContain("creativity");
      });

      it("should return limited number of keywords", () => {
        const text = "word word word " + "a b c d e f g h i j k l m n o p ".repeat(10);
        const keywords = extractKeywords(text, 5);
        expect(keywords.length).toBeLessThanOrEqual(5);
      });

      it("should filter short words", () => {
        const keywords = extractKeywords("a I is the creativity", 10, 3);
        expect(keywords).not.toContain("a");
        expect(keywords).not.toContain("is");
      });
    });

    describe("jaccardSimilarity", () => {
      it("should return 1 for identical sets", () => {
        const sim = jaccardSimilarity(
          ["a", "b", "c"],
          ["a", "b", "c"]
        );
        expect(sim).toBe(1);
      });

      it("should return 0 for disjoint sets", () => {
        const sim = jaccardSimilarity(["a", "b"], ["c", "d"]);
        expect(sim).toBe(0);
      });

      it("should return 0.5 for 50% overlap", () => {
        const sim = jaccardSimilarity(
          ["a", "b", "c"],
          ["a", "b", "d"]
        );
        expect(sim).toBeCloseTo(0.5, 1);
      });
    });

    describe("cosineSimilarity", () => {
      it("should return 1 for identical sequences", () => {
        const sim = cosineSimilarity(
          ["a", "b", "c"],
          ["a", "b", "c"]
        );
        expect(sim).toBeCloseTo(1, 5);
      });

      it("should return higher for frequency matches", () => {
        const sim1 = cosineSimilarity(
          ["a", "a", "b"],
          ["a", "a", "c"]
        );
        const sim2 = cosineSimilarity(
          ["a", "b", "c"],
          ["a", "d", "e"]
        );
        expect(sim1).toBeGreaterThan(sim2);
      });
    });

    describe("semanticCluster", () => {
      it("should cluster similar concepts", () => {
        const clusters = semanticCluster(["create", "creation", "creator"]);
        expect(clusters.length).toBeLessThanOrEqual(2);
      });

      it("should handle single concept", () => {
        const clusters = semanticCluster(["constraint"]);
        expect(clusters).toEqual([["constraint"]]);
      });

      it("should separate dissimilar concepts", () => {
        const clusters = semanticCluster(["elephant", "bicycle", "mountain"]);
        expect(clusters.length).toBeGreaterThan(1);
      });
    });

    describe("extractNounLikeConcepts", () => {
      it("should extract noun-like words", () => {
        const text = "Constraint births creativity through systematic opposition";
        const concepts = extractNounLikeConcepts(text);
        expect(concepts.length).toBeGreaterThan(0);
        // Should contain noun-like endings
        const hasNounEndings = concepts.some(
          (c) =>
            c.endsWith("tion") ||
            c.endsWith("ity") ||
            c.endsWith("ment") ||
            c.length >= 6
        );
        expect(hasNounEndings).toBe(true);
      });
    });
  });

  describe("Insight Extraction", () => {
    const testSentence =
      "Constraint births creativity through systematic opposition and paradox";

    it("should extract concepts from text", () => {
      const insights = extractInsights(testSentence, null);
      expect(insights.extractedPatterns.length).toBeGreaterThan(0);
      expect(insights.extractedPatterns.length).toBeLessThanOrEqual(5);
    });

    it("should compute novelty score", () => {
      const insights = extractInsights(testSentence, null);
      expect(insights.novelty).toBeGreaterThanOrEqual(0);
      expect(insights.novelty).toBeLessThanOrEqual(1);
    });

    it("should return maximum novelty for first meditation", () => {
      const insights = extractInsights(testSentence, null);
      expect(insights.novelty).toBe(1.0);
    });

    it("should cluster related concepts", () => {
      const insights = extractInsights(testSentence, null);
      expect(insights.semanticClusters.length).toBeGreaterThan(0);
      expect(insights.semanticClusters[0].length).toBeGreaterThan(0);
    });

    it("should handle empty text gracefully", () => {
      const insights = extractInsights("", null);
      expect(insights.extractedPatterns).toBeDefined();
      expect(Array.isArray(insights.extractedPatterns)).toBe(true);
    });
  });

  describe("Novelty Computation", () => {
    it("should return 1.0 for first trace", () => {
      const novelty = computeNoveltyScore(
        ["creativity", "constraint"],
        null
      );
      expect(novelty).toBe(1.0);
    });

    it("should decrease novelty for repeated concepts", () => {
      const memory: ContemplativeMemory = {
        sessionId: "test",
        startedAt: Date.now(),
        traces: [
          {
            id: "1",
            timestamp: Date.now(),
            mode: "diverge",
            insights: {
              extractedPatterns: ["creativity", "constraint"],
              novelty: 1.0,
              semanticClusters: [],
              extractedAt: Date.now(),
            },
            bridge: { confidenceLevel: 1.0 },
          },
        ],
        metrics: {
          lastModeSwitch: Date.now(),
          currentMode: "diverge",
          repetitionCount: 0,
          pauseDuration: 0,
          avgCycleDuration: 0,
          lastSuggestionTime: Date.now(),
        },
      };

      const novelty = computeNoveltyScore(
        ["creativity", "constraint"],
        memory
      );
      expect(novelty).toBeLessThan(0.5); // Should be low (repeated)
    });

    it("should give high novelty for new concepts", () => {
      const memory: ContemplativeMemory = {
        sessionId: "test",
        startedAt: Date.now(),
        traces: [
          {
            id: "1",
            timestamp: Date.now(),
            mode: "diverge",
            insights: {
              extractedPatterns: ["creativity", "constraint"],
              novelty: 1.0,
              semanticClusters: [],
              extractedAt: Date.now(),
            },
            bridge: { confidenceLevel: 1.0 },
          },
        ],
        metrics: {
          lastModeSwitch: Date.now(),
          currentMode: "diverge",
          repetitionCount: 0,
          pauseDuration: 0,
          avgCycleDuration: 0,
          lastSuggestionTime: Date.now(),
        },
      };

      const novelty = computeNoveltyScore(
        ["emergence", "transformation", "paradox"],
        memory
      );
      expect(novelty).toBeGreaterThan(0.5); // Should be high (new)
    });
  });

  describe("Feedback Extraction", () => {
    it("should extract actionable feedback", () => {
      const critique =
        "Consider exploring the tension between constraint and freedom. What if you rethink the role of opposition?";
      const feedback = extractFeedback(critique);
      expect(feedback.length).toBeGreaterThan(0);
    });

    it("should handle critique without action words", () => {
      const critique = "This is interesting. It shows good thinking.";
      const feedback = extractFeedback(critique);
      expect(Array.isArray(feedback)).toBe(true);
    });

    it("should limit feedback to 5 items", () => {
      const critique =
        "Consider this. Try that. Explore this. Suggest that. Avoid this. " +
        "Question that. Examine this. Rethink that. Challenge this. Investigate that.";
      const feedback = extractFeedback(critique);
      expect(feedback.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Relevance Scoring", () => {
    it("should score high for on-topic critique", () => {
      const concepts = ["creativity", "constraint"];
      const critique =
        "Your ideas about creativity and constraint are interesting...";
      const score = scoreRelevance(concepts, critique);
      expect(score).toBeGreaterThan(0.5);
    });

    it("should score low for off-topic critique", () => {
      const concepts = ["creativity", "constraint"];
      const critique = "The weather is nice today.";
      const score = scoreRelevance(concepts, critique);
      expect(score).toBeLessThan(0.5);
    });

    it("should range from 0 to 1", () => {
      const concepts = ["test"];
      const critique = "Random words about nothing in particular";
      const score = scoreRelevance(concepts, critique);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe("Saturation Detection", () => {
    it("should detect when ideas are repeating", () => {
      const memory: ContemplativeMemory = {
        sessionId: "test",
        startedAt: Date.now(),
        traces: [
          {
            id: "1",
            timestamp: Date.now(),
            mode: "diverge",
            insights: {
              extractedPatterns: ["creativity", "constraint"],
              novelty: 1.0,
              semanticClusters: [],
              extractedAt: Date.now(),
            },
            bridge: { confidenceLevel: 1.0 },
          },
          {
            id: "2",
            timestamp: Date.now(),
            mode: "diverge",
            insights: {
              extractedPatterns: ["creativity", "constraint"],
              novelty: 0.8,
              semanticClusters: [],
              extractedAt: Date.now(),
            },
            bridge: { confidenceLevel: 1.0 },
          },
        ],
        metrics: {
          lastModeSwitch: Date.now(),
          currentMode: "diverge",
          repetitionCount: 0,
          pauseDuration: 0,
          avgCycleDuration: 0,
          lastSuggestionTime: Date.now(),
        },
      };

      const isSaturated = detectSaturation(
        ["creativity", "constraint"],
        memory
      );
      expect(isSaturated).toBe(true);
    });

    it("should not detect saturation with new concepts", () => {
      const memory: ContemplativeMemory = {
        sessionId: "test",
        startedAt: Date.now(),
        traces: [
          {
            id: "1",
            timestamp: Date.now(),
            mode: "diverge",
            insights: {
              extractedPatterns: ["creativity", "constraint"],
              novelty: 1.0,
              semanticClusters: [],
              extractedAt: Date.now(),
            },
            bridge: { confidenceLevel: 1.0 },
          },
        ],
        metrics: {
          lastModeSwitch: Date.now(),
          currentMode: "diverge",
          repetitionCount: 0,
          pauseDuration: 0,
          avgCycleDuration: 0,
          lastSuggestionTime: Date.now(),
        },
      };

      const isSaturated = detectSaturation(
        ["emergence", "transformation"],
        memory
      );
      expect(isSaturated).toBe(false);
    });
  });

  describe("Acceptance Criteria (M1)", () => {
    it("✓ Extracts 3-5 concepts per meditation", () => {
      const text =
        "Constraint births creativity through systematic opposition and paradox";
      const insights = extractInsights(text, null);
      expect(insights.extractedPatterns.length).toBeGreaterThanOrEqual(3);
      expect(insights.extractedPatterns.length).toBeLessThanOrEqual(5);
    });

    it("✓ Novelty scores range 0-1 meaningfully", () => {
      const insights1 = extractInsights("First meditation", null);
      expect(insights1.novelty).toBe(1.0);

      // Create memory with first meditation
      const memory: ContemplativeMemory = {
        sessionId: "test",
        startedAt: Date.now(),
        traces: [
          {
            id: "1",
            timestamp: Date.now(),
            mode: "diverge",
            insights: insights1,
            bridge: { confidenceLevel: 1.0 },
          },
        ],
        metrics: {
          lastModeSwitch: Date.now(),
          currentMode: "diverge",
          repetitionCount: 0,
          pauseDuration: 0,
          avgCycleDuration: 0,
          lastSuggestionTime: Date.now(),
        },
      };

      const insights2 = extractInsights("First meditation", memory);
      expect(insights2.novelty).toBeLessThan(insights1.novelty);
    });

    it("✓ Extracts and clusters concepts", () => {
      const text =
        "Constraint births creativity through systematic opposition and paradox";
      const insights = extractInsights(text, null);
      expect(insights.semanticClusters.length).toBeGreaterThan(0);
    });

    it("✓ Extracts feedback from critique", () => {
      const critique =
        "Consider exploring deeper. What if you tried a different angle?";
      const feedback = extractFeedback(critique);
      expect(feedback.length).toBeGreaterThan(0);
    });
  });
});
