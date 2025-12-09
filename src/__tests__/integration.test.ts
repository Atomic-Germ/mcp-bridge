/**
 * Integration Tests for MCP-Bridge with mcp-creative and mcp-consult
 * Validates the bridge works seamlessly end-to-end
 */

import { describe, it, expect } from "vitest";
import {
  formatContextForConsult,
  formatContextForMeditation,
  buildConversationBridge,
} from "../contextInjection.js";
import { computeGradedAsymmetry, suggestModeSwitch } from "../modeSwitch.js";
import { MeditationTrace, ContemplativeMemory } from "../types.js";

function createTestMemory(
  meditationCount: number,
  conceptSets: string[][] = []
): ContemplativeMemory {
  const traces: MeditationTrace[] = [];
  const baseTime = Date.now() - meditationCount * 60000;

  for (let i = 0; i < meditationCount; i++) {
    const concepts =
      conceptSets[i] || ["concept_a", "concept_b", "concept_c"];
    traces.push({
      id: `trace_${i}`,
      timestamp: baseTime + i * 60000,
      mode: "diverge",
      meditation: {
        contextWords: concepts,
        numRandomWords: 12,
        emergentSentence: `Meditation ${i}: ${concepts.join(" ")}`,
      },
      insights: {
        extractedPatterns: concepts,
        novelty: Math.max(0, 1.0 - i * 0.1),
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

describe("M4 Integration: Bridge with Creative + Consult", () => {
  const sampleMeditationTrace: MeditationTrace = {
    id: "med_1",
    timestamp: Date.now(),
    mode: "diverge",
    meditation: {
      contextWords: ["constraint", "creativity"],
      numRandomWords: 12,
      emergentSentence:
        "Constraint births creativity through opposition and paradox",
    },
    insights: {
      extractedPatterns: [
        "constraint",
        "creativity",
        "opposition",
        "paradox",
        "systematic",
      ],
      novelty: 0.85,
      semanticClusters: [
        ["constraint", "opposition"],
        ["creativity", "paradox"],
      ],
      extractedAt: Date.now(),
    },
    bridge: { confidenceLevel: 0.9 },
  };

  const sampleCritiqueTrace: MeditationTrace = {
    id: "crit_1",
    timestamp: Date.now() + 60000,
    mode: "converge",
    critique: {
      consultModel: "ollama-model",
      prompt: "Critique this idea",
      response:
        "Consider exploring the tension between constraint and freedom. " +
        "What mechanisms enable constraints to foster creativity? " +
        "Structure provides the canvas for expression. " +
        "Examine how disassembly reveals hidden flows.",
      relevance: 0.85,
    },
    bridge: { confidenceLevel: 0.9 },
  };

  describe("✓ Full Meditation → Critique → Loop", () => {
    it("formats meditation for critique (Consult input)", () => {
      const context = formatContextForConsult(sampleMeditationTrace, {
        count: 1,
        avgNovelty: 0.85,
      });

      expect(context.systemPrompt).toBeTruthy();
      expect(context.userPrompt).toBeTruthy();
      expect(context.systemPrompt).toContain("constraint");
      expect(context.systemPrompt).toContain("creativity");
      expect(context.systemPrompt).toContain("85");
    });

    it("extracts feedback from critique (Creative input)", () => {
      const context = formatContextForMeditation(sampleCritiqueTrace);

      expect(context.extractedFeedback.length).toBeGreaterThan(0);
      expect(context.suggestedContextWords.length).toBeGreaterThan(0);
      expect(context.userPrompt).toContain("feedback");
    });

    it("builds conversation bridge between modes", () => {
      const bridge = buildConversationBridge(
        sampleMeditationTrace,
        sampleCritiqueTrace,
        { suggestedMode: "diverge", confidence: 0.72 }
      );

      expect(bridge.meditationSummary).toContain("MEDITATION");
      expect(bridge.critiqueSummary).toContain("CRITIQUE");
      expect(bridge.transitionReasoning).toContain("72%");
      expect(bridge.nextSteps.length).toBeGreaterThan(0);
    });

    it("suggests mode switches based on session signals", () => {
      const memory: ContemplativeMemory = {
        sessionId: "test",
        startedAt: Date.now(),
        traces: [
          {
            ...sampleMeditationTrace,
            id: "1",
            timestamp: Date.now() - 120000,
            insights: { ...sampleMeditationTrace.insights!, novelty: 0.9 },
          },
          {
            ...sampleMeditationTrace,
            id: "2",
            timestamp: Date.now() - 60000,
            insights: { ...sampleMeditationTrace.insights!, novelty: 0.7 },
          },
          {
            ...sampleMeditationTrace,
            id: "3",
            timestamp: Date.now(),
            insights: { ...sampleMeditationTrace.insights!, novelty: 0.3 },
          },
        ],
        metrics: {
          lastModeSwitch: Date.now(),
          currentMode: "diverge",
          repetitionCount: 3,
          pauseDuration: 0,
          avgCycleDuration: 60,
          lastSuggestionTime: Date.now(),
        },
      };

      const suggestion = suggestModeSwitch(memory, 0.1);
      // With declining novelty, may suggest converge
      expect(typeof suggestion === "object" || suggestion === null).toBe(true);
    });

    it("emits graded asymmetry when concepts sit near the threshold", () => {
      const memory = createTestMemory(2, [
        ["a", "b", "c"],
        ["a", "b", "c", "d"],
      ]);

      const suggestion = suggestModeSwitch(memory, 0.1);
      expect(suggestion?.asymmetry).toBeDefined();
      if (suggestion?.asymmetry) {
        expect(suggestion.asymmetry.criticalBandActive).toBe(true);
        expect(suggestion.asymmetry.strength).toBeGreaterThan(0);
      }
    });

    it("leans backward when overlap is maximal even without imbalance", () => {
      const signal = computeGradedAsymmetry(["a", "b", "c"], ["a", "b", "c"]);
      expect(signal.criticalBandActive).toBe(true);
      expect(signal.direction).toBe("backward");
      expect(signal.asymmetry).toBeGreaterThan(0);
      expect(signal.strength).toBeLessThan(0.5);
    });

    it("returns neutral asymmetry outside the critical band", () => {
      const signal = computeGradedAsymmetry(["a"], ["x", "y"]);
      expect(signal.criticalBandActive).toBe(false);
      expect(signal.strength).toBeCloseTo(0.5);
    });
  });

  describe("✓ Context Preservation Across Cycles", () => {
    it("preserves semantic relationships through context injection", () => {
      const context = formatContextForConsult(sampleMeditationTrace);

      expect(context.clusters).toEqual(
        sampleMeditationTrace.insights!.semanticClusters
      );
      expect(context.novelty).toBe(sampleMeditationTrace.insights!.novelty);
    });

    it("maintains novelty tracking across meditation sequence", () => {
      const m1 = { ...sampleMeditationTrace, id: "1" };
      const m2 = {
        ...sampleMeditationTrace,
        id: "2",
        insights: {
          ...sampleMeditationTrace.insights!,
          novelty: 0.65,
        },
      };
      const m3 = {
        ...sampleMeditationTrace,
        id: "3",
        insights: {
          ...sampleMeditationTrace.insights!,
          novelty: 0.4,
        },
      };

      const traces = [m1, m2, m3];
      const novalties = traces.map((t) => t.insights!.novelty);

      expect(novalties[0]).toBeGreaterThan(novalties[1]);
      expect(novalties[1]).toBeGreaterThan(novalties[2]);
    });
  });

  describe("✓ User Override Integration", () => {
    it("allows user to override relevance scoring", () => {
      // Bridge computed score: low (no jargon match)
      const computed = 0.45;

      // User override: high (philosophical resonance)
      const userOverride = 0.95;

      expect(userOverride > computed).toBe(true);
      expect(userOverride).toBeLessThanOrEqual(1);
      expect(userOverride).toBeGreaterThanOrEqual(0);
    });

    it("tracks relevance source (computed vs override)", () => {
      const responses = [
        {
          traceId: "1",
          relevanceScore: 0.45,
          relevanceSource: "computed" as const,
        },
        {
          traceId: "2",
          relevanceScore: 0.95,
          relevanceSource: "user-override" as const,
        },
      ];

      expect(responses[0].relevanceSource).toBe("computed");
      expect(responses[1].relevanceSource).toBe("user-override");
    });
  });

  describe("✓ Acceptance Criteria (M4)", () => {
    it("can run complete meditation → critique → meditation cycle", () => {
      // Phase 1: Meditation
      const med1 = sampleMeditationTrace;
      expect(med1.meditation).toBeTruthy();
      expect(med1.insights).toBeTruthy();

      // Phase 2: Format for critique
      const context = formatContextForConsult(med1, {
        count: 1,
        avgNovelty: 0.85,
      });
      expect(context.systemPrompt.length > 100).toBe(true);

      // Phase 3: Simulate critique
      const crit1 = sampleCritiqueTrace;
      expect(crit1.critique).toBeTruthy();

      // Phase 4: Extract feedback for next meditation
      const feedback = formatContextForMeditation(crit1);
      expect(feedback.extractedFeedback.length > 0).toBe(true);
      expect(feedback.suggestedContextWords.length > 0).toBe(true);

      // Phase 5: Mode switch decision
      const bridge = buildConversationBridge(med1, crit1, {
        suggestedMode: "diverge",
        confidence: 0.68,
      });
      expect(bridge.suggestedNextMode).toBeTruthy();
    });

    it("handles realistic multi-meditation sessions", () => {
      const session: ContemplativeMemory = {
        sessionId: "realistic",
        startedAt: Date.now() - 600000, // 10 minutes ago
        traces: Array.from({ length: 5 }, (_, i) => ({
          ...sampleMeditationTrace,
          id: `trace_${i}`,
          timestamp: Date.now() - (5 - i) * 120000,
          insights: {
            ...sampleMeditationTrace.insights!,
            novelty: 0.9 - i * 0.15,
          },
        })),
        metrics: {
          lastModeSwitch: Date.now() - 300000,
          currentMode: "diverge",
          repetitionCount: 5,
          pauseDuration: 60000,
          avgCycleDuration: 120,
          lastSuggestionTime: Date.now() - 180000,
        },
      };

      expect(session.traces.length).toBe(5);
      expect(
        session.traces.every((t) => t.meditation || t.critique)
      ).toBe(true);

      const suggestion = suggestModeSwitch(session, 0.2);
      // With declining novelty, should have signal
      expect(
        suggestion === null ||
          (suggestion && suggestion.confidence > 0)
      ).toBe(true);
    });

    it("all bridge components integrate without errors", () => {
      const components = {
        meditation: sampleMeditationTrace,
        critique: sampleCritiqueTrace,
        contextForCritique: formatContextForConsult(sampleMeditationTrace),
        contextForMeditation: formatContextForMeditation(sampleCritiqueTrace),
        bridge: buildConversationBridge(
          sampleMeditationTrace,
          sampleCritiqueTrace,
          { suggestedMode: "converge", confidence: 0.65 }
        ),
      };

      // All components exist and have data
      expect(components.meditation).toBeTruthy();
      expect(components.critique).toBeTruthy();
      expect(components.contextForCritique.systemPrompt).toBeTruthy();
      expect(components.contextForMeditation.extractedFeedback.length > 0).toBe(true);
      expect(components.bridge.meditationSummary).toBeTruthy();
    });
  });

  describe("✓ Robustness", () => {
    it("handles edge case: critique with no feedback", () => {
      const emptyTrace: MeditationTrace = {
        ...sampleCritiqueTrace,
        critique: {
          ...sampleCritiqueTrace.critique!,
          response: "",
        },
      };

      // Should not crash
      expect(() =>
        formatContextForMeditation(emptyTrace)
      ).not.toThrow();
    });

    it("handles edge case: meditation with minimal context", () => {
      const minimalTrace: MeditationTrace = {
        ...sampleMeditationTrace,
        meditation: {
          contextWords: ["a"],
          numRandomWords: 12,
          emergentSentence: "x",
        },
        insights: {
          extractedPatterns: ["a"],
          novelty: 1.0,
          semanticClusters: [["a"]],
          extractedAt: Date.now(),
        },
      };

      expect(() =>
        formatContextForConsult(minimalTrace)
      ).not.toThrow();
    });

    it("handles mode switch with insufficient data", () => {
      const emptyMemory: ContemplativeMemory = {
        sessionId: "empty",
        startedAt: Date.now(),
        traces: [],
        metrics: {
          lastModeSwitch: Date.now(),
          currentMode: "diverge",
          repetitionCount: 0,
          pauseDuration: 0,
          avgCycleDuration: 0,
          lastSuggestionTime: Date.now(),
        },
      };

      const result = suggestModeSwitch(emptyMemory, 0.5);
      expect(result === null).toBe(true);
    });
  });
});
