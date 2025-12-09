/**
 * Paired meditation planner for perpendicular contexts.
 * Builds primary + orthogonal prompts so a model can run two diverging meditations
 * and examine the crossing.
 */

import { generatePerpendicularContext, PerpendicularOptions } from "../utils/perpendicularContext.js";

export interface MeditationPlan {
  label: "primary" | "perpendicular";
  contextWords: string[];
  prompt: string;
}

export interface PairedMeditationPlan {
  primary: MeditationPlan;
  perpendicular: MeditationPlan;
  crossingPrompt: string;
  mapping: Array<{ source?: string; derived: string; method: string }>;
  rationale: string[];
}

export interface BuildPairedPlanOptions extends PerpendicularOptions {
  primaryLabel?: string;
  perpendicularLabel?: string;
}

export function buildPairedMeditationPlan(
  primaryContext: string[],
  options: BuildPairedPlanOptions = {}
): PairedMeditationPlan {
  const { perpendicular, mapping, rationale } = generatePerpendicularContext(primaryContext, options);

  const primaryLabel = options.primaryLabel ?? "primary";
  const perpendicularLabel = options.perpendicularLabel ?? "perpendicular";

  const primaryPrompt = composePrompt(primaryLabel, primaryContext, "Trace the natural path; notice bindings that feel inevitable.");
  const perpendicularPrompt = composePrompt(
    perpendicularLabel,
    perpendicular,
    "Walk sideways on purpose; seek tensions, glitches, and counterfactuals."
  );

  const crossingPrompt = [
    "Run both meditations independently.",
    "Then, extract concepts from each and look for:",
    "- Bindings that survive in both paths",
    "- Contradictions worth amplifying",
    "- Novel concepts unique to the perpendicular path",
    "Surface the crossing point: the smallest shared structure that feels alive.",
  ].join("\n");

  return {
    primary: {
      label: "primary",
      contextWords: primaryContext,
      prompt: primaryPrompt,
    },
    perpendicular: {
      label: "perpendicular",
      contextWords: perpendicular,
      prompt: perpendicularPrompt,
    },
    crossingPrompt,
    mapping,
    rationale,
  };
}

function composePrompt(label: string, contextWords: string[], intent: string): string {
  return [
    `Mode: ${label}`,
    `Context: ${contextWords.join(", ")}`,
    intent,
    "Meditate and produce one emergent sentence.",
  ].join("\n");
}
