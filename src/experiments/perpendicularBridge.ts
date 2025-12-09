/**
 * Paired meditation planner for perpendicular contexts.
 * Builds primary + orthogonal prompts so a model can run two diverging meditations
 * and examine the crossing. Mode selection can be gated by heuristic signals.
 */

import { generatePerpendicularContext, PerpendicularOptions } from "../utils/perpendicularContext.js";
import { HeuristicSignals, PerpendularState, PerpendicularMode, ContemplativeMemory } from "../types.js";
import { jaccardSimilarity } from "../utils/nlp.js";

const DEFAULT_THRESHOLDS = {
  noveltyHigh: 0.7,
  saturationHigh: 0.7,
  minAffinity: 0.4,
};

const HARSH_SEEDS = [
  "rupture",
  "break",
  "flip",
  "invert",
  "contradict",
  "disrupt",
  "obliterate",
  "negate",
];

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
  mode: PerpendicularMode;
  heuristics: {
    signalUsed?: HeuristicSignals;
    reason: string;
  };
}

export interface BuildPairedPlanOptions extends PerpendicularOptions {
  primaryLabel?: string;
  perpendicularLabel?: string;
  state?: PerpendularState;
  useHeuristicGating?: boolean;
}

/**
 * Derive a PerpendularState from recent session traces plus optional user-provided state.
 * - novelty: from latest meditation trace
 * - saturation: Jaccard overlap between last two meditation concept sets (0-1)
 * - currentAffinity: Jaccard between requested contextWords and last meditation context
 */
export function derivePerpendularStateFromSession(
  session: ContemplativeMemory | null,
  contextWords: string[],
  baseState?: PerpendularState
): PerpendularState | undefined {
  if (!session) return baseState;

  const meditations = session.traces
    .filter((t) => t.meditation && t.insights)
    .slice(-2);

  if (meditations.length === 0) return baseState;

  const latest = meditations[meditations.length - 1];
  const prev = meditations.length > 1 ? meditations[meditations.length - 2] : undefined;

  const latestNovelty = latest.insights?.novelty ?? 0;
  const saturation = prev && prev.insights
    ? jaccardSimilarity(prev.insights.extractedPatterns, latest.insights?.extractedPatterns ?? [])
    : 0;

  const signals: HeuristicSignals[] = [...(baseState?.signals ?? []), { novelty: latestNovelty, saturation }].slice(-5);

  const affinity = computeAffinity(contextWords, latest.meditation?.contextWords);

  return {
    ...baseState,
    mode: baseState?.mode ?? "NORMAL",
    signals,
    recentBranches: baseState?.recentBranches ?? [],
    thresholds: baseState?.thresholds,
    currentAffinity: baseState?.currentAffinity ?? affinity,
  };
}

interface NormalizedState {
  mode: PerpendicularMode;
  signals: HeuristicSignals[];
  recentBranches: string[];
  thresholds: typeof DEFAULT_THRESHOLDS;
  currentAffinity: number;
}

export function buildPairedMeditationPlan(
  primaryContext: string[],
  options: BuildPairedPlanOptions = {}
): PairedMeditationPlan {
  const normalizedState = normalizeState(options.state);
  const gatingEnabled = options.useHeuristicGating ?? true;
  const { mode, reason, signalUsed } = determineMode(normalizedState, gatingEnabled);

  const generatorOptions: PerpendicularOptions = {
    targetLength: options.targetLength,
    additionalPool: augmentPool(options.additionalPool, mode),
    seed: options.seed,
    useAntonymMap: mode === "SOFT" ? false : options.useAntonymMap,
  };

  const { perpendicular, mapping, rationale } = generatePerpendicularContext(primaryContext, generatorOptions);

  const primaryLabel = options.primaryLabel ?? "primary";
  const perpendicularLabel = options.perpendicularLabel ?? "perpendicular";

  const primaryPrompt = composePrompt(primaryLabel, primaryContext, "Trace the natural path; notice bindings that feel inevitable.");
  const perpendicularPrompt = composePrompt(
    perpendicularLabel,
    perpendicular,
    mode === "HARSH"
      ? "Walk sideways and break habits; seek tensions, glitches, and counterfactuals."
      : "Walk sideways on purpose; seek tensions, glitches, and counterfactuals."
  );

  const crossingPrompt = [
    "Run both meditations independently.",
    "Then, extract concepts from each and look for:",
    "- Bindings that survive in both paths",
    "- Contradictions worth amplifying",
    "- Novel concepts unique to the perpendicular path",
    "Surface the crossing point: the smallest shared structure that feels alive.",
  ].join("\n");

  const heuristicNote = `mode=${mode} (reason: ${reason})`;

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
    rationale: [...rationale, heuristicNote],
    mode,
    heuristics: {
      signalUsed,
      reason,
    },
  };
}

function normalizeState(state?: PerpendularState): NormalizedState {
  return {
    mode: state?.mode ?? "NORMAL",
    signals: state?.signals?.slice(-5) ?? [],
    recentBranches: state?.recentBranches ?? [],
    thresholds: {
      noveltyHigh: state?.thresholds?.noveltyHigh ?? DEFAULT_THRESHOLDS.noveltyHigh,
      saturationHigh: state?.thresholds?.saturationHigh ?? DEFAULT_THRESHOLDS.saturationHigh,
      minAffinity: state?.thresholds?.minAffinity ?? DEFAULT_THRESHOLDS.minAffinity,
    },
    currentAffinity: state?.currentAffinity ?? 1,
  };
}

function determineMode(state: NormalizedState, gatingEnabled: boolean): {
  mode: PerpendicularMode;
  reason: string;
  signalUsed?: HeuristicSignals;
} {
  if (!gatingEnabled) {
    return { mode: state.mode, reason: "heuristic gating disabled" };
  }

  const latest = state.signals[state.signals.length - 1];
  if (!latest) {
    return { mode: state.mode, reason: "no signals provided" };
  }

  // Primary routing based on novelty/saturation thresholds.
  if (latest.saturation > state.thresholds.saturationHigh && state.currentAffinity >= state.thresholds.minAffinity) {
    return { mode: "HARSH", reason: "high saturation", signalUsed: latest };
  }

  if (latest.novelty > state.thresholds.noveltyHigh && latest.saturation < state.thresholds.saturationHigh) {
    return { mode: "SOFT", reason: "high novelty with low saturation", signalUsed: latest };
  }

  // Avoid reusing the same branch when saturation is rising.
  if (state.recentBranches.includes(state.mode) && latest.saturation > state.thresholds.saturationHigh) {
    return { mode: "HARSH", reason: "recent branch reused under saturation; escalating", signalUsed: latest };
  }

  return { mode: state.mode, reason: "default mode retained", signalUsed: latest };
}

function augmentPool(additional: string[] | undefined, mode: PerpendicularMode): string[] | undefined {
  if (mode !== "HARSH") return additional;
  const merged = new Set<string>([...HARSH_SEEDS, ...(additional ?? [])]);
  return Array.from(merged);
}

function computeAffinity(current: string[], prior?: string[]): number {
  if (!prior || prior.length === 0) return 1;
  const a = normalizeWords(current);
  const b = normalizeWords(prior);
  if (a.length === 0 || b.length === 0) return 0;
  return jaccardSimilarity(a, b);
}

function normalizeWords(words: string[]): string[] {
  return words
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);
}

function composePrompt(label: string, contextWords: string[], intent: string): string {
  return [
    `Mode: ${label}`,
    `Context: ${contextWords.join(", ")}`,
    intent,
    "Meditate and produce one emergent sentence.",
  ].join("\n");
}
