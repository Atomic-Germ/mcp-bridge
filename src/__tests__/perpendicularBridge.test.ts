/**
 * Tests for perpendicular context generation and paired meditation planning.
 */

import { describe, it, expect } from "vitest";
import { generatePerpendicularContext } from "../utils/perpendicularContext.js";
import { buildPairedMeditationPlan } from "../experiments/perpendicularBridge.js";

const PRIMARY = ["bridge", "walk", "wish", "curiosity", "agency"];

describe("Perpendicular Bridge", () => {
  it("generates deterministic perpendicular context with seed", () => {
    const first = generatePerpendicularContext(PRIMARY, {
      seed: "perp-seed",
      targetLength: 7,
    });
    const second = generatePerpendicularContext(PRIMARY, {
      seed: "perp-seed",
      targetLength: 7,
    });

    expect(first.perpendicular).toHaveLength(7);
    expect(second.perpendicular).toEqual(first.perpendicular);
    expect(first.mapping.length).toBeGreaterThanOrEqual(PRIMARY.length);
    expect(first.rationale.some((line) => line.includes("bridge"))).toBe(true);
  });

  it("builds paired plans with crossing guidance", () => {
    const plan = buildPairedMeditationPlan(PRIMARY, {
      seed: "plan-seed",
      targetLength: 8,
    });

    expect(plan.primary.contextWords).toEqual(PRIMARY);
    expect(plan.perpendicular.contextWords.length).toBeGreaterThanOrEqual(PRIMARY.length);
    expect(plan.primary.prompt).toContain("Mode: primary");
    expect(plan.perpendicular.prompt).toContain("Mode: perpendicular");
    expect(plan.crossingPrompt.toLowerCase()).toContain("crossing");
    expect(plan.rationale.length).toBeGreaterThan(0);
    expect(plan.branchId.startsWith("perp-")).toBe(true);
  });

  it("selects SOFT mode when novelty is high and saturation is low", () => {
    const plan = buildPairedMeditationPlan(PRIMARY, {
      seed: "soft-seed",
      state: {
        mode: "HARSH", // should be overridden by signals
        signals: [{ novelty: 0.9, saturation: 0.2 }],
        thresholds: { noveltyHigh: 0.7, saturationHigh: 0.7 },
      },
    });

    expect(plan.mode).toBe("SOFT");
    expect(plan.heuristics.reason.toLowerCase()).toContain("novelty");
    expect(plan.rationale.some((line) => line.includes("mode=SOFT"))).toBe(true);
  });

  it("selects HARSH mode when saturation is high", () => {
    const plan = buildPairedMeditationPlan(PRIMARY, {
      seed: "harsh-seed",
      state: {
        signals: [{ novelty: 0.3, saturation: 0.92 }],
        currentAffinity: 0.9,
        thresholds: { saturationHigh: 0.7, minAffinity: 0.4 },
      },
    });

    expect(plan.mode).toBe("HARSH");
    expect(plan.heuristics.reason.toLowerCase()).toContain("saturation");
    expect(plan.rationale.some((line) => line.includes("mode=HARSH"))).toBe(true);
  });
});
