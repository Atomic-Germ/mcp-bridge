/**
 * Tests for cleaned critique feedback extraction.
 */

import { describe, it, expect } from "vitest";
import { extractFeedback, extractQuestions } from "../insights.js";

const critique = `
- **Novel angle:** Consider inverses that are *context-dependent*—what is inverse in one system state may not hold in another.
- **Suggestion:** Explore gradients of asymmetry; test anti-scale paths?
• Question: Does precedence stay fixed when iterations mutate order?
`;

describe("extractFeedback and extractQuestions", () => {
  it("strips markdown/bullets and keeps actionable feedback", () => {
    const feedback = extractFeedback(critique);
    expect(feedback.length).toBeGreaterThan(0);
    expect(feedback[0].toLowerCase()).toContain("consider inverses");
    expect(feedback.join(" ")).not.toMatch(/\*\*|\*/);
  });

  it("extracts questions without markdown noise", () => {
    const questions = extractQuestions(critique);
    expect(questions.some((q) => q.toLowerCase().includes("precedence"))).toBe(true);
    expect(questions.join(" ")).not.toMatch(/\*\*|\*/);
  });
});
