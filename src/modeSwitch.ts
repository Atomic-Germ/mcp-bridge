/**
 * Mode-Switch Heuristics for MCP-Bridge
 * Detects optimal moments to switch between diverge (meditation) and converge (critique)
 *
 * Grounded in cognitive science:
 * - EEG signatures of insight vs. analysis (Kounios, Jung-Beeman)
 * - Saturation theory (Klahr & Simon)
 * - Flow state research (Csikszentmihalyi)
 * - Dual-process cognition (Kahneman)
 */

import { ContemplativeMemory } from "./types.js";
import {
  detectSaturation,
  semanticDistance,
} from "./insights.js";
import { jaccardSimilarity } from "./utils/nlp.js";

/**
 * Heuristic 1: Semantic Saturation
 * Detects when concepts are repeating (ready to evaluate)
 *
 * Signal: When overlap between recent meditations > threshold
 * Research: Concept saturation indicates local optimum (Klahr & Simon, 1999)
 * Action: Suggest switching to critique mode
 */
export function semanticSaturationDetector(
  memory: ContemplativeMemory,
  threshold: number = 0.6
): { triggered: boolean; confidence: number; reason: string } {
  if (!memory || memory.traces.length < 2) {
    return {
      triggered: false,
      confidence: 0,
      reason: "Need at least 2 traces to detect saturation",
    };
  }

  // Get last two meditation traces
  const meditationTraces = memory.traces
    .filter((t) => t.meditation && t.insights)
    .slice(-2);

  if (meditationTraces.length < 2) {
    return {
      triggered: false,
      confidence: 0,
      reason: "Need at least 2 meditation traces",
    };
  }

  const concepts1 = meditationTraces[0].insights!.extractedPatterns;
  const concepts2 = meditationTraces[1].insights!.extractedPatterns;

  const overlap = jaccardSimilarity(concepts1, concepts2);

  const triggered = overlap > threshold;
  const confidence = Math.min(1, overlap / threshold); // Scaled 0-1

  return {
    triggered,
    confidence,
    reason: `Concepts overlap ${(overlap * 100).toFixed(0)}% (threshold: ${(threshold * 100).toFixed(0)}%)`,
  };
}

/**
 * Heuristic 2: Pause Detection
 * Detects when user has been silent (incubation/thinking)
 *
 * Signal: Large gap since last trace (user pausing/thinking)
 * Research: EEG shows alpha waves (relaxation) before insight (Kounios et al.)
 * Action: Suggest moving to critique to evaluate ideas
 */
export function pauseDetectionHeuristic(
  memory: ContemplativeMemory,
  pauseThresholdMs: number = 300000 // 5 minutes
): { triggered: boolean; confidence: number; reason: string } {
  if (!memory || memory.traces.length < 2) {
    return {
      triggered: false,
      confidence: 0,
      reason: "Need at least 2 traces to detect pause",
    };
  }

  const lastTrace = memory.traces[memory.traces.length - 1];
  const prevTrace = memory.traces[memory.traces.length - 2];

  const pauseDuration = lastTrace.timestamp - prevTrace.timestamp;
  const triggered = pauseDuration > pauseThresholdMs;

  // Confidence scales with pause duration
  // Beyond threshold, max out at 0.8 (respect user autonomy)
  const confidence = Math.min(0.8, pauseDuration / pauseThresholdMs);

  const pauseSeconds = (pauseDuration / 1000).toFixed(0);
  const thresholdSeconds = (pauseThresholdMs / 1000).toFixed(0);

  return {
    triggered,
    confidence,
    reason: `Pause: ${pauseSeconds}s (threshold: ${thresholdSeconds}s) — incubation moment`,
  };
}

/**
 * Heuristic 3: Novelty Drop
 * Detects when recent ideas are all low-novelty (stuck in local optimum)
 *
 * Signal: Average novelty of last 3 meditations < threshold
 * Research: Cognitive load theory (Sweller, 1988) — stalled progress signals need for shift
 * Action: Suggest critique to get fresh perspective
 */
export function noveltyDropDetector(
  memory: ContemplativeMemory,
  noveltyThreshold: number = 0.35
): { triggered: boolean; confidence: number; reason: string } {
  if (!memory || memory.traces.length < 3) {
    return {
      triggered: false,
      confidence: 0,
      reason: "Need at least 3 traces to detect novelty drop",
    };
  }

  // Get last 3 meditation traces
  const recentTraces = memory.traces
    .filter((t) => t.insights)
    .slice(-3);

  if (recentTraces.length < 3) {
    return {
      triggered: false,
      confidence: 0,
      reason: "Need at least 3 insight traces",
    };
  }

  const noveltyScores = recentTraces.map((t) => t.insights!.novelty);
  const avgNovelty = noveltyScores.reduce((a, b) => a + b, 0) / noveltyScores.length;

  const triggered = avgNovelty < noveltyThreshold;

  // Confidence: inverse of average novelty (low novelty → high confidence in detector)
  const confidence = Math.min(1, (noveltyThreshold - avgNovelty) / noveltyThreshold);

  const avgNoveltyPercent = (avgNovelty * 100).toFixed(0);
  const thresholdPercent = (noveltyThreshold * 100).toFixed(0);

  return {
    triggered,
    confidence,
    reason: `Novelty low: ${avgNoveltyPercent}% (threshold: ${thresholdPercent}%) — ideas repeating`,
  };
}

/**
 * Heuristic 4: Critique Freshness
 * Detects when critique responses are circling the same points
 *
 * Signal: Recent critique responses are highly similar to each other
 * Research: Elaboration likelihood model (Petty & Cacioppo) — repetition without new insight
 * Action: Suggest new meditation to diverge
 */
export function critiqueFreshnessDetector(
  memory: ContemplativeMemory,
  similarityThreshold: number = 0.75
): { triggered: boolean; confidence: number; reason: string } {
  if (!memory || memory.traces.length < 4) {
    return {
      triggered: false,
      confidence: 0,
      reason: "Need at least 4 traces to detect critique freshness",
    };
  }

  // Get last 2 critique traces
  const critiqueTraces = memory.traces
    .filter((t) => t.critique)
    .slice(-2);

  if (critiqueTraces.length < 2) {
    return {
      triggered: false,
      confidence: 0,
      reason: "Need at least 2 critique traces",
    };
  }

  const response1 = critiqueTraces[0].critique!.response;
  const response2 = critiqueTraces[1].critique!.response;

  // Simple similarity: compare first 100 words of each response
  const words1 = response1.split(/\s+/).slice(0, 100);
  const words2 = response2.split(/\s+/).slice(0, 100);

  const similarity = jaccardSimilarity(words1, words2);
  const triggered = similarity > similarityThreshold;

  // Confidence based on how similar the critiques are
  const confidence = Math.min(1, similarity / similarityThreshold);

  const similarityPercent = (similarity * 100).toFixed(0);
  const thresholdPercent = (similarityThreshold * 100).toFixed(0);

  return {
    triggered,
    confidence,
    reason: `Critique similarity: ${similarityPercent}% (threshold: ${thresholdPercent}%) — repeating insights`,
  };
}

/**
 * Mode-Switch Suggestion Engine
 * Combines all 4 heuristics with weighted voting
 */
export interface ModeSwitchSuggestion {
  suggestedMode: "diverge" | "converge";
  confidence: number; // 0-1
  reason: string;
  heuristicScores: {
    saturation: { triggered: boolean; confidence: number };
    pause: { triggered: boolean; confidence: number };
    noveltyDrop: { triggered: boolean; confidence: number };
    critiqueFreshness: { triggered: boolean; confidence: number };
  };
}

export function suggestModeSwitch(
  memory: ContemplativeMemory,
  minConfidenceToSurface: number = 0.5,
  heuristicsConfig: {
    semanticSaturationThreshold: number;
    pauseThresholdMs: number;
    noveltyDropThreshold: number;
    critiqueFreshnessThreshold: number;
  } = {
    semanticSaturationThreshold: 0.6,
    pauseThresholdMs: 300000,
    noveltyDropThreshold: 0.35,
    critiqueFreshnessThreshold: 0.75,
  },
  heuristicWeights: {
    saturation: number;
    pause: number;
    noveltyDrop: number;
    critiqueFreshness: number;
  } = {
    saturation: 0.3,
    pause: 0.25,
    noveltyDrop: 0.25,
    critiqueFreshness: 0.2,
  }
): ModeSwitchSuggestion | null {
  if (!memory || memory.traces.length < 2) {
    return null; // Not enough data
  }

  // Run all 4 heuristics
  const saturation = semanticSaturationDetector(memory, heuristicsConfig.semanticSaturationThreshold);
  const pause = pauseDetectionHeuristic(memory, heuristicsConfig.pauseThresholdMs);
  const noveltyDrop = noveltyDropDetector(memory, heuristicsConfig.noveltyDropThreshold);
  const critiqueFreshness = critiqueFreshnessDetector(memory, heuristicsConfig.critiqueFreshnessThreshold);

  // Vote for diverge (meditation) vs converge (critique)
  let convergeScore = 0; // Vote for critique
  let divergeScore = 0; // Vote for meditation

  // Saturation → suggests divergence is stalled, need critique
  if (saturation.triggered) {
    convergeScore += saturation.confidence * heuristicWeights.saturation;
  }

  // Pause → during incubation, can either evaluate or continue diverging
  // But if followed by low novelty, suggests evaluate
  if (pause.triggered) {
    if (noveltyDrop.triggered) {
      convergeScore += pause.confidence * heuristicWeights.pause * 0.5;
    } else {
      divergeScore += pause.confidence * heuristicWeights.pause * 0.3;
    }
  }

  // Novelty drop → definitely suggests need for critique/perspective
  if (noveltyDrop.triggered) {
    convergeScore += noveltyDrop.confidence * heuristicWeights.noveltyDrop;
  }

  // Critique freshness → suggests need for new divergent pass
  if (critiqueFreshness.triggered) {
    divergeScore += critiqueFreshness.confidence * heuristicWeights.critiqueFreshness;
  }

  // Calculate combined confidence
  const totalScore = convergeScore + divergeScore;
  if (totalScore === 0) {
    return null; // No strong signal
  }

  const convergeConfidence = convergeScore / totalScore;
  const divergeConfidence = divergeScore / totalScore;

  let suggestedMode: "diverge" | "converge";
  let confidence: number;
  let reason: string;

  if (convergeConfidence > divergeConfidence) {
    suggestedMode = "converge";
    confidence = convergeConfidence;
    const triggers = [
      saturation.triggered && `saturation (${(saturation.confidence * 100).toFixed(0)}%)`,
      noveltyDrop.triggered && `novelty drop (${(noveltyDrop.confidence * 100).toFixed(0)}%)`,
    ]
      .filter(Boolean)
      .join(" + ");
    reason = `Ready to evaluate. Signals: ${triggers}`;
  } else {
    suggestedMode = "diverge";
    confidence = divergeConfidence;
    const triggers = [
      critiqueFreshness.triggered && `fresh divergence needed (${(critiqueFreshness.confidence * 100).toFixed(0)}%)`,
    ]
      .filter(Boolean)
      .join(" + ");
    reason = triggers
      ? `Time for new ideas. Signals: ${triggers}`
      : "Continue exploring";
  }

  // Only surface if confidence >= threshold (calm UX)
  if (confidence < minConfidenceToSurface) {
    return null;
  }

  return {
    suggestedMode,
    confidence,
    reason,
    heuristicScores: {
      saturation: { triggered: saturation.triggered, confidence: saturation.confidence },
      pause: { triggered: pause.triggered, confidence: pause.confidence },
      noveltyDrop: {
        triggered: noveltyDrop.triggered,
        confidence: noveltyDrop.confidence,
      },
      critiqueFreshness: {
        triggered: critiqueFreshness.triggered,
        confidence: critiqueFreshness.confidence,
      },
    },
  };
}
