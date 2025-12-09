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
  });
});
