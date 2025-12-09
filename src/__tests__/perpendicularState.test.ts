import { describe, expect, it } from "vitest";
import { derivePerpendularStateFromSession } from "../experiments/perpendicularBridge.js";
import { ContemplativeMemory, MeditationTrace, SessionMetrics, PerpendularState } from "../types.js";

const metrics: SessionMetrics = {
  lastModeSwitch: 0,
  currentMode: "diverge",
  repetitionCount: 0,
  pauseDuration: 0,
  avgCycleDuration: 0,
  lastSuggestionTime: 0,
};

function makeMeditationTrace(
  id: string,
  timestamp: number,
  contextWords: string[],
  patterns: string[],
  novelty: number
): MeditationTrace {
  return {
    id,
    timestamp,
    mode: "diverge",
    meditation: {
      contextWords,
      numRandomWords: 12,
      emergentSentence: "",
    },
    insights: {
      extractedPatterns: patterns,
      novelty,
      semanticClusters: [],
      extractedAt: timestamp,
    },
    bridge: {
      confidenceLevel: 1,
    },
  };
}

describe("derivePerpendularStateFromSession", () => {
  it("derives novelty/saturation signals and affinity from recent meditations", () => {
    const session: ContemplativeMemory = {
      sessionId: "s1",
      startedAt: 0,
      metrics,
      traces: [
        makeMeditationTrace("t1", 1, ["alpha", "beta"], ["alpha", "beta"], 0.9),
        makeMeditationTrace("t2", 2, ["alpha", "gamma"], ["alpha", "gamma"], 0.2),
      ],
    };

    const state = derivePerpendularStateFromSession(session, ["alpha", "gamma"], { mode: "HARSH" });
    expect(state).toBeDefined();
    expect(state?.mode).toBe("HARSH"); // preserves caller override
    expect(state?.signals?.length).toBe(1);
    expect(state?.signals?.[0].novelty).toBeCloseTo(0.2);
    expect(state?.signals?.[0].saturation).toBeCloseTo(1 / 3); // Jaccard of ['alpha','beta'] vs ['alpha','gamma']
    expect(state?.currentAffinity).toBeCloseTo(1); // requested context matches last meditation context
  });

  it("returns base state when no session is provided", () => {
    const base: PerpendularState = { mode: "SOFT", signals: [{ novelty: 0.5, saturation: 0.1 }] };
    const state = derivePerpendularStateFromSession(null, ["x"], base);
    expect(state).toEqual(base);
  });
});
