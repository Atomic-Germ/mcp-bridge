import { describe, it, expect } from "vitest";
import {
  parseInsightResponse,
  formatDeepInsights,
  createContextFromInsights,
} from "../utils/creativeInsightIntegration";

describe("Creative Insight Integration", () => {
  describe("parseInsightResponse", () => {
    it("should detect paradox patterns", () => {
      const response = `
        Core insight: Paradox between constraint and freedom
        The apparent contradiction reveals deeper unity
        Suggests alignment through understanding
      `;

      const insights = parseInsightResponse(response);

      expect(insights.patterns.length).toBeGreaterThan(0);
      expect(insights.patterns.some((p) => p.name.includes("Paradox"))).toBe(
        true
      );
    });

    it("should detect emergence patterns", () => {
      const response = `
        Emergence of new understanding
        Pattern evolution suggests growth
        Themes about emergence and becoming
      `;

      const insights = parseInsightResponse(response);

      expect(insights.patterns.some((p) => p.name.includes("Emergence"))).toBe(
        true
      );
    });

    it("should detect meta-patterns", () => {
      const response = `
        The pattern itself is meaningful
        Structure underlying the meditation
        Meaning-making process revealed
      `;

      const insights = parseInsightResponse(response);

      expect(insights.metaPatterns.length).toBeGreaterThan(0);
    });

    it("should extract focus areas", () => {
      const response = `
        Paradox between control and surrender
        Harmony achieved through acceptance
      `;

      const insights = parseInsightResponse(response);

      expect(insights.focusAreas.length).toBeGreaterThan(0);
      expect(insights.focusAreas[0]).toMatch(
        /explore|reflect|consider/i
      );
    });

    it("should handle empty response", () => {
      const response = "";

      const insights = parseInsightResponse(response);

      expect(insights.patterns).toBeDefined();
      expect(insights.metaPatterns).toBeDefined();
      expect(insights.focusAreas).toBeDefined();
      expect(insights.timestamp).toBeGreaterThan(0);
    });
  });

  describe("formatDeepInsights", () => {
    it("should format patterns with confidence", () => {
      const insights = parseInsightResponse(
        "Paradox between two opposites revealed"
      );

      const formatted = formatDeepInsights(insights);

      expect(formatted).toContain("DEEPER INSIGHTS");
      expect(formatted).toContain("Patterns Detected");
    });

    it("should include all sections if present", () => {
      const insights = parseInsightResponse(`
        Paradox detected
        Meta-pattern: meaning-making
        Focus: explore further
      `);

      const formatted = formatDeepInsights(insights);

      expect(formatted).toContain("🔍");
      expect(formatted).toContain("🎯");
    });

    it("should handle missing sections gracefully", () => {
      const insights = {
        patterns: [],
        themes: [],
        metaPatterns: [],
        focusAreas: [],
        timestamp: Date.now(),
      };

      const formatted = formatDeepInsights(insights);

      expect(formatted).toContain("DEEPER INSIGHTS");
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe("createContextFromInsights", () => {
    it("should extract context words from patterns", () => {
      const insights = parseInsightResponse(
        "Paradox and emergence detected"
      );

      const context = createContextFromInsights(insights);

      expect(context.contextWords.length).toBeGreaterThan(0);
      expect(Array.isArray(context.contextWords)).toBe(true);
    });

    it("should create guiding questions for paradox", () => {
      const insights = parseInsightResponse("Paradox revealed");

      const context = createContextFromInsights(insights);

      expect(context.guidingQuestions.length).toBeGreaterThan(0);
      expect(context.guidingQuestions.some((q) =>
        q.toLowerCase().includes("paradox")
      )).toBe(true);
    });

    it("should create guiding questions for emergence", () => {
      const insights = parseInsightResponse("Emergence pattern");

      const context = createContextFromInsights(insights);

      expect(context.guidingQuestions.some((q) =>
        q.toLowerCase().includes("emerg")
      )).toBe(true);
    });

    it("should provide defaults when no patterns", () => {
      const insights = {
        patterns: [],
        themes: [],
        metaPatterns: [],
        focusAreas: [],
        timestamp: Date.now(),
      };

      const context = createContextFromInsights(insights);

      expect(context.contextWords.length).toBeGreaterThan(0);
      expect(context.guidingQuestions.length).toBeGreaterThan(0);
    });

    it("should create unique questions per pattern type", () => {
      const insightsWithParadox = parseInsightResponse("Paradox");
      const insightsWithTension = parseInsightResponse("Tension");

      const contextParadox = createContextFromInsights(insightsWithParadox);
      const contextTension = createContextFromInsights(insightsWithTension);

      // Should have some different questions
      expect(
        contextParadox.guidingQuestions.some(
          (q) => !contextTension.guidingQuestions.includes(q)
        )
      ).toBe(true);
    });

    it("should include harmony-specific questions", () => {
      const insights = parseInsightResponse("Harmony and resonance");

      const context = createContextFromInsights(insights);

      expect(context.guidingQuestions.some((q) =>
        q.toLowerCase().includes("harmon")
      )).toBe(true);
    });
  });

  describe("Integration scenario", () => {
    it("should handle complete insight deepening flow", () => {
      // Simulate a meditation response
      const meditationResponse = `
        Paradox between constraint and freedom emerges.
        Tension reveals deeper harmony.
        Meta-pattern: synthesis of opposites.
        Themes suggest transcendence through understanding.
      `;

      // Parse insights
      const insights = parseInsightResponse(meditationResponse);
      expect(insights.patterns.length).toBeGreaterThan(0);

      // Format for display
      const formatted = formatDeepInsights(insights);
      expect(formatted).toContain("DEEPER INSIGHTS");

      // Create context for next meditation
      const nextContext = createContextFromInsights(insights);
      expect(nextContext.contextWords.length).toBeGreaterThan(0);
      expect(nextContext.guidingQuestions.length).toBeGreaterThan(0);

      // Verify context is actionable
      expect(nextContext.contextWords.some((w) => w.length > 2)).toBe(true);
      expect(nextContext.guidingQuestions.some((q) => q.includes("?"))).toBe(
        true
      );
    });
  });
});
