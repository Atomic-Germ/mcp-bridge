/**
 * Tests for Milestone 3: Context Injection
 */

import { describe, it, expect } from "vitest";
import {
  formatContextForConsult,
  formatContextForMeditation,
  buildConversationBridge,
} from "../contextInjection.js";
import { MeditationTrace } from "../types.js";

describe("Milestone 3: Context Injection", () => {
  const testMeditationTrace: MeditationTrace = {
    id: "med_1",
    timestamp: Date.now(),
    mode: "diverge",
    meditation: {
      contextWords: ["constraint", "creativity"],
      numRandomWords: 12,
      emergentSentence:
        "Constraint births creativity through systematic opposition and paradox",
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

  const testCritiqueTrace: MeditationTrace = {
    id: "crit_1",
    timestamp: Date.now() + 60000,
    mode: "converge",
    critique: {
      consultModel: "test-model",
      prompt: "Critique these ideas",
      response:
        "Consider exploring the tension between constraint and freedom more deeply. " +
        "What if you examined how constraints actually enable innovation? " +
        "You might also explore what happens when you remove all constraints. " +
        "Try combining these insights with historical examples of breakthrough innovation.",
      relevance: 0.85,
    },
    bridge: { confidenceLevel: 0.9 },
  };

  describe("Format Context for Consult", () => {
    it("should include emergent sentence in system prompt", () => {
      const context = formatContextForConsult(testMeditationTrace);
      expect(context.systemPrompt).toContain(
        testMeditationTrace.meditation!.emergentSentence
      );
    });

    it("should list extracted concepts", () => {
      const context = formatContextForConsult(testMeditationTrace);
      expect(context.systemPrompt).toContain("constraint");
      expect(context.systemPrompt).toContain("creativity");
    });

     it("should include novelty score", () => {
       const context = formatContextForConsult(testMeditationTrace);
       expect(context.systemPrompt).toContain("NOVELTY: 85");
       expect(context.novelty).toBe(0.85);
     });

     it("should include semantic clusters", () => {
       const context = formatContextForConsult(testMeditationTrace);
       expect(context.systemPrompt).toContain("CLUSTERS:");
       expect(context.clusters).toHaveLength(2);
     });

     it("should include session history when provided", () => {
       const context = formatContextForConsult(testMeditationTrace, {
         count: 5,
         avgNovelty: 0.7,
       });
       expect(context.systemPrompt).toContain("SESSION_AVG: 70");
       expect(context.systemPrompt).toContain("SESSION_DEPTH: 5");
     });

     it("should have rich user prompt", () => {
       const context = formatContextForConsult(testMeditationTrace);
       expect(context.userPrompt).toContain("INSIGHT:");
       expect(context.userPrompt).toContain("QUERY:");
     });
  });

  describe("Format Context for Meditation", () => {
    it("should extract feedback from critique response", () => {
      const context = formatContextForMeditation(testCritiqueTrace);
      expect(context.extractedFeedback.length).toBeGreaterThan(0);
      expect(context.extractedFeedback[0]).toBeTruthy();
    });

    it("should extract provocative questions", () => {
      const context = formatContextForMeditation(testCritiqueTrace);
      expect(context.provocativeQuestions.length).toBeGreaterThan(0);
      // Questions extracted from critique should be non-empty
      expect(context.provocativeQuestions[0].length).toBeGreaterThan(10);
    });

    it("should suggest context words from feedback", () => {
      const context = formatContextForMeditation(testCritiqueTrace);
      expect(context.suggestedContextWords.length).toBeGreaterThan(0);
      expect(context.suggestedContextWords[0].length).toBeGreaterThan(3);
    });

    it("should have user prompt for next meditation", () => {
      const context = formatContextForMeditation(testCritiqueTrace);
      expect(context.userPrompt).toContain("feedback");
      expect(context.userPrompt).toContain("meditation");
    });
  });

  describe("Build Conversation Bridge", () => {
    it("should summarize both meditation and critique phases", () => {
      const bridge = buildConversationBridge(
        testMeditationTrace,
        testCritiqueTrace,
        { suggestedMode: "diverge", confidence: 0.65 }
      );
      expect(bridge.meditationSummary).toContain("MEDITATION");
      expect(bridge.critiqueSummary).toContain("CRITIQUE");
    });

    it("should include transition reasoning", () => {
      const bridge = buildConversationBridge(
        testMeditationTrace,
        testCritiqueTrace,
        { suggestedMode: "converge", confidence: 0.72 }
      );
      expect(bridge.transitionReasoning).toContain("72%");
      expect(bridge.transitionReasoning).toContain("Bridge detected");
    });

    it("should suggest next steps for diverge mode", () => {
      const bridge = buildConversationBridge(
        testMeditationTrace,
        testCritiqueTrace,
        { suggestedMode: "diverge", confidence: 0.7 }
      );
      expect(bridge.suggestedNextMode).toBe("diverge");
      expect(bridge.nextSteps.length).toBeGreaterThan(0);
      expect(bridge.nextSteps[0]).toContain("feedback");
    });

    it("should suggest next steps for converge mode", () => {
      const bridge = buildConversationBridge(
        testMeditationTrace,
        testCritiqueTrace,
        { suggestedMode: "converge", confidence: 0.65 }
      );
      expect(bridge.suggestedNextMode).toBe("converge");
      expect(bridge.nextSteps[0]).toContain("Deepen");
    });

    it("should include novelty and concepts in meditation summary", () => {
      const bridge = buildConversationBridge(
        testMeditationTrace,
        testCritiqueTrace,
        { suggestedMode: "diverge", confidence: 0.6 }
      );
      expect(bridge.meditationSummary).toContain("85%");
      expect(bridge.meditationSummary).toContain("constraint");
    });
  });

  describe("Acceptance Criteria (M3)", () => {
    it("✓ Formats context for consult with system + user prompts", () => {
      const context = formatContextForConsult(testMeditationTrace);
      expect(context.systemPrompt).toBeTruthy();
      expect(context.userPrompt).toBeTruthy();
      expect(context.systemPrompt.length).toBeGreaterThan(100);
      expect(context.userPrompt.length).toBeGreaterThan(50);
    });

    it("✓ Formats context for meditation with feedback + questions", () => {
      const context = formatContextForMeditation(testCritiqueTrace);
      expect(context.extractedFeedback.length).toBeGreaterThan(0);
      expect(context.provocativeQuestions.length).toBeGreaterThan(0);
      expect(context.suggestedContextWords.length).toBeGreaterThan(0);
    });

    it("✓ Builds conversation bridge showing flow", () => {
      const bridge = buildConversationBridge(
        testMeditationTrace,
        testCritiqueTrace,
        { suggestedMode: "diverge", confidence: 0.72 }
      );
      expect(bridge.meditationSummary).toBeTruthy();
      expect(bridge.critiqueSummary).toBeTruthy();
      expect(bridge.transitionReasoning).toBeTruthy();
      expect(bridge.nextSteps).toBeTruthy();
    });

    it("✓ Context preserves semantic relationships", () => {
      const context = formatContextForConsult(testMeditationTrace);
      expect(context.clusters).toEqual(
        testMeditationTrace.insights!.semanticClusters
      );
    });

    it("✓ Feedback extraction is non-empty", () => {
      const context = formatContextForMeditation(testCritiqueTrace);
      expect(context.extractedFeedback.every((f) => f.length > 0)).toBe(true);
    });
  });
});
