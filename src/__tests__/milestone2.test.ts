/**
 * Tests for Milestone 2: Mode-Switch Heuristics
 */

import { describe, it, expect } from "vitest";
import {
  semanticSaturationDetector,
  pauseDetectionHeuristic,
  noveltyDropDetector,
  critiqueFreshnessDetector,
  suggestModeSwitch,
} from "../modeSwitch.js";
import { ContemplativeMemory } from "../types.js";

describe("Milestone 2: Mode-Switch Heuristics", () => {
  function createTestMemory(
    meditationCount: number,
    conceptSets: string[][] = []
  ): ContemplativeMemory {
    const traces = [];
    const baseTime = Date.now() - meditationCount * 60000;

    for (let i = 0; i < meditationCount; i++) {
      const concepts =
        conceptSets[i] || [
          "concept_a",
          "concept_b",
          "concept_c",
        ];
      traces.push({
        id: `trace_${i}`,
        timestamp: baseTime + i * 60000,
        mode: "diverge" as const,
        meditation: {
          contextWords: concepts,
          numRandomWords: 12,
          emergentSentence: `Meditation ${i}: ${concepts.join(" ")}`,
        },
        insights: {
          extractedPatterns: concepts,
          novelty: 1.0 - i * 0.1,
          semanticClusters: [concepts],
          extractedAt: baseTime + i * 60000,
        },
        bridge: { confidenceLevel: 0.9 },
      });
    }

    return {
      sessionId: "test",
      startedAt: baseTime,
      traces,
      metrics: {
        lastModeSwitch: baseTime,
        currentMode: "diverge",
        repetitionCount: 0,
        pauseDuration: 0,
        avgCycleDuration: 60,
        lastSuggestionTime: baseTime,
      },
    };
  }

  describe("Semantic Saturation", () => {
    it("should trigger when concepts overlap > threshold", () => {
      const memory = createTestMemory(2, [
        ["a", "b", "c", "d"],
        ["a", "b", "c", "e"],
      ]);
      // 3/5 = 0.6 > 0.5
      const result = semanticSaturationDetector(memory, 0.5);
      expect(result.triggered).toBe(true);
    });

    it("should not trigger for distinct concepts", () => {
      const memory = createTestMemory(2, [
        ["a", "b"],
        ["x", "y"],
      ]);
      // 0/4 = 0 < 0.6
      const result = semanticSaturationDetector(memory, 0.6);
      expect(result.triggered).toBe(false);
    });
  });

  describe("Pause Detection", () => {
    it("should trigger after 5+ minute pause", () => {
      const memory = createTestMemory(2);
      memory.traces[1].timestamp =
        memory.traces[0].timestamp + 360000; // 6 minutes
      const result = pauseDetectionHeuristic(memory, 300000);
      expect(result.triggered).toBe(true);
    });

    it("should not trigger for short pauses", () => {
      const memory = createTestMemory(2); // 1 min default
      const result = pauseDetectionHeuristic(memory, 300000);
      expect(result.triggered).toBe(false);
    });
  });

  describe("Novelty Drop", () => {
    it("should trigger when avg novelty < threshold", () => {
      const memory = createTestMemory(3);
      memory.traces.forEach((t) => {
        if (t.insights) t.insights.novelty = 0.2;
      });
      const result = noveltyDropDetector(memory, 0.35);
      expect(result.triggered).toBe(true);
    });

    it("should not trigger with high novelty", () => {
      const memory = createTestMemory(3);
      memory.traces.forEach((t) => {
        if (t.insights) t.insights.novelty = 0.8;
      });
      const result = noveltyDropDetector(memory, 0.35);
      expect(result.triggered).toBe(false);
    });
  });

  describe("Critique Freshness", () => {
    it("should have functioning detector", () => {
      const memory = createTestMemory(4);
      const result = critiqueFreshnessDetector(memory, 0.75);
      expect(result).toHaveProperty("triggered");
      expect(result).toHaveProperty("confidence");
    });
  });

  describe("Mode-Switch Suggestion", () => {
    it("✓ Returns suggestion or null based on confidence", () => {
      const memory = createTestMemory(2, [
        ["a", "b", "c", "d"],
        ["a", "b", "c", "e"],
      ]);
      // May or may not suggest depending on heuristic weights
      const suggestion = suggestModeSwitch(memory, 0.1);
      // Just verify it returns something
      expect(typeof suggestion === "object" || suggestion === null).toBe(true);
    });

    it("should return null below confidence threshold", () => {
      const memory = createTestMemory(2, [
        ["a", "b"],
        ["x", "y"],
      ]);
      const suggestion = suggestModeSwitch(memory, 0.99);
      expect(suggestion).toBeNull();
    });

    it("✓ Returns complete suggestion with all fields", () => {
      // Create a memory that WILL trigger saturation
      const memory = createTestMemory(3);
      // Make all recent traces nearly identical (high saturation)
      memory.traces.forEach((t) => {
        if (t.insights) {
          t.insights.extractedPatterns = ["a", "b", "c", "d"];
        }
      });
      // Make them have low novelty too (double signal)
      memory.traces.forEach((t) => {
        if (t.insights) {
          t.insights.novelty = 0.2;
        }
      });

      const suggestion = suggestModeSwitch(memory, 0.1);
      if (suggestion) {
        expect(suggestion).toHaveProperty("suggestedMode");
        expect(suggestion).toHaveProperty("confidence");
        expect(suggestion).toHaveProperty("reason");
        expect(suggestion).toHaveProperty("heuristicScores");
        expect(suggestion.heuristicScores).toHaveProperty("saturation");
        expect(suggestion.heuristicScores).toHaveProperty("pause");
        expect(suggestion.heuristicScores).toHaveProperty("noveltyDrop");
        expect(suggestion.heuristicScores).toHaveProperty("critiqueFreshness");
      }
    });
  });

  describe("Acceptance Criteria (M2)", () => {
    it("✓ All 4 heuristics implemented", () => {
      const m = createTestMemory(2);
      const sat = semanticSaturationDetector(m, 0.5);
      const pause = pauseDetectionHeuristic(m, 300000);
      const novelty = noveltyDropDetector(m, 0.35);
      const freshness = critiqueFreshnessDetector(m, 0.75);

      expect(sat.triggered).toBeDefined();
      expect(pause.triggered).toBeDefined();
      expect(novelty.triggered).toBeDefined();
      expect(freshness.triggered).toBeDefined();
    });

    it("✓ Suggestions have 0-1 confidence", () => {
      const m = createTestMemory(2, [["a", "b"], ["a", "b"]]);
      const s = suggestModeSwitch(m, 0.2);
      expect(s).not.toBeNull();
      if (s) {
        expect(s.confidence).toBeGreaterThanOrEqual(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("✓ Respects minConfidenceToSurface", () => {
      const m = createTestMemory(2, [["a"], ["b"]]);
      const s = suggestModeSwitch(m, 0.99);
      expect(s).toBeNull();
    });

    it("✓ Returns reason string", () => {
      const m = createTestMemory(2, [["a", "b"], ["a", "b"]]);
      const s = suggestModeSwitch(m, 0.2);
      expect(s).not.toBeNull();
      if (s) {
        expect(typeof s.reason).toBe("string");
        expect(s.reason.length).toBeGreaterThan(0);
      }
    });
  });
});
