/**
 * Type definitions for MCP-Bridge
 * Contemplative Memory data model and tool schemas
 */

// ============================================================================
// Core Data Models
// ============================================================================

export interface Insight {
  extractedPatterns: string[];
  novelty: number; // 0-1: how different from prior traces
  semanticClusters: string[][]; // related concepts grouped
  extractedAt: number; // Unix ms
}

export interface MeditationData {
  contextWords: string[];
  numRandomWords: number;
  seed?: string;
  emergentSentence: string; // The meditation output
}

export interface CritiqueData {
  consultModel: string;
  prompt: string;
  systemPrompt?: string;
  response: string;
  relevance: number; // 0-1: how well does critique apply to ideas?
}

export interface BridgeMetadata {
  transitionSuggested?: boolean;
  reasonForSwitch?: string;
  confidenceLevel: number; // 0-1
}

export interface MeditationTrace {
  id: string; // UUID
  timestamp: number; // Unix ms
  mode: "diverge" | "converge";

  // Diverge phase (from mcp-creative)
  meditation?: MeditationData;

  // Extracted insights (from meditation or consult)
  insights?: Insight;

  // Converge phase (from mcp-consult)
  critique?: CritiqueData;

  // Bridge-specific metadata
  bridge: BridgeMetadata;
}

export interface SessionMetrics {
  lastModeSwitch: number; // Unix ms
  currentMode: "diverge" | "converge";
  repetitionCount: number; // Concept repeats in last 3 traces
  pauseDuration: number; // Seconds since last user input
  avgCycleDuration: number; // Median trace-to-trace time (seconds)
  lastSuggestionTime: number; // Unix ms
}

export interface ContemplativeMemory {
  traces: MeditationTrace[];
  sessionId: string;
  startedAt: number; // Unix ms

  // Running aggregates for heuristics
  metrics: SessionMetrics;
}

// ============================================================================
// Mode-Switch Heuristics
// ============================================================================

export interface HeuristicResult {
  heuristic: string;
  triggeredAt: boolean;
  confidence: number; // 0-1
  reason: string;
}

export interface SwitchSuggestion {
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

// ============================================================================
// Tool Input/Output Schemas
// ============================================================================

// Tool 1: bridge_start_session
export interface StartSessionRequest {
  // No parameters
}

export interface StartSessionResponse {
  sessionId: string;
  startedAt: number;
  initialMetrics: SessionMetrics;
}

// Tool 2: bridge_log_meditation
export interface LogMeditationRequest {
  emergentSentence: string;
  contextWords: string[];
  numRandomWords?: number;
  seed?: string;
}

export interface LogMeditationResponse {
  traceId: string;
  insights: Insight;
  message: string;
}

// Tool 3: bridge_log_consult
export interface LogConsultRequest {
  model: string;
  prompt: string;
  response: string;
  systemPrompt?: string;
  relevanceOverride?: number; // User can override computed relevance (0-1)
}

export interface LogConsultResponse {
  traceId: string;
  relevanceScore: number;
  relevanceSource: "computed" | "user-override"; // Track source
  extractedFeedback: string[];
  message: string;
}

// Tool 4: bridge_suggest_mode_switch
export interface SuggestModeSwitchRequest {
  // No parameters - uses session memory
}

export interface SuggestModeSwitchResponse {
  suggestion: SwitchSuggestion | null;
  message: string;
}

// Tool 5: bridge_get_context_for_consult
export interface GetContextForConsultRequest {
  meditationTraceId: string;
  maxTokens?: number; // Optional limit
}

export interface GetContextForConsultResponse {
  systemPromptChunk: string;
  userPromptChunk?: string;
  concepts: string[];
  novelty?: number;
  clusters?: string[][];
  message: string;
}

// Tool 6: bridge_get_critique_for_meditation
export interface GetCritiqueForMeditationRequest {
  consultTraceId: string;
  numTopConcepts?: number; // How many feedback concepts to include
}

export interface GetCritiqueForMeditationResponse {
  contextWords: string[];
  extractedFeedback: string[];
  provocativeQuestions?: string[];
  userPromptChunk?: string;
  message: string;
}

// Tool 7: bridge_get_session_trace
export interface GetSessionTraceRequest {
  sessionId?: string; // Optional; uses current if not provided
  limit?: number; // How many recent traces to return
}

export interface GetSessionTraceResponse {
  sessionId: string;
  traces: MeditationTrace[];
  totalTraces: number;
  message: string;
}

// Tool 8: bridge_weave_session
export interface WeaveSessionRequest {
  sessionId?: string;
  length?: number;
  seed?: string;
}

export interface WeaveSessionResponse {
  dream: string;
  message: string;
}

// Tool 9: bridge_compare_critique_models
export interface CompareModelsCritiqueRequest {
  meditationTraceId: string;   // ✅ Required: UUID of meditation trace
  models?: string[];           // Optional: models to compare (default: auto-detect)
  timeoutMs?: number;          // Optional: timeout per model (default: 120000)
}

export interface ModelCritique {
  model: string;
  response: string;
  processingTime?: number;
}

export interface CritiqueComparison {
  consensus: string[];         // Points all models agree on
  divergent: string[];         // Points where models disagree
  modelResponses: ModelCritique[];
  agreementScore: number;      // 0-1: how much consensus
}

export interface CompareModelsCritiqueResponse {
  traceId: string;
  comparison: CritiqueComparison;
  message: string;
}

// Tool 10: bridge_build_concept_memory
export interface ConceptMemoryEntry {
  concept: string;
  firstSeen: number;           // Unix ms
  lastSeen: number;            // Unix ms
  sessions: string[];          // Session IDs where concept appeared
  modelsTested: string[];      // Which models analyzed this
  relatedConcepts: string[];   // Semantically related concepts
  evolution: {
    sessionSequence: string[];
    insightProgression: string[];
  };
}

export interface BuildConceptMemoryRequest {
  concept: string;             // ✅ Required: concept to memorize
  persistenceModel?: string;   // Optional: which model to use for persistence
}

export interface BuildConceptMemoryResponse {
  concept: string;
  entryId: string;
  firstSessionId: string;
  relatedConcepts: string[];
  message: string;
}

// Tool 11: bridge_get_insight_deepening
export interface GetInsightDeepeningRequest {
  meditationTraceId: string;   // ✅ Required: UUID of meditation trace
}

export interface InsightPattern {
  name: string;                // "Paradox", "Emergence", "Harmony", etc.
  description: string;
  confidence: number;          // 0-1: confidence level
  relatedConcepts: string[];
}

export interface GetInsightDeepeningResponse {
  traceId: string;
  patterns: InsightPattern[];
  metaPatterns: string[];
  focusAreas: string[];
  suggestedContextWords: string[];
  guidingQuestions: string[];
  message: string;
}

// Tool 12: bridge_list_sessions
export interface GetAvailableSessionsResponse {
  sessions: Array<{
    sessionId: string;
    startedAt: number;
    traceCount: number;
    lastActive: number;
  }>;
  currentSessionId: string | null;
  message: string;
}

// Tool 13: bridge_plan_perpendicular_meditations
export interface PlanPerpendicularMeditationsRequest {
  contextWords: string[];          // Primary context list
  targetLength?: number;           // Desired size of perpendicular list
  additionalPool?: string[];       // Optional extra seeds
  seed?: string;                   // Seed for deterministic generation
  primaryLabel?: string;           // Label for primary path
  perpendicularLabel?: string;     // Label for orthogonal path
  useAntonymMap?: boolean;         // Toggle antonym mapping
}

export interface PlanPerpendicularMeditationsResponse {
  primary: {
    label: string;
    contextWords: string[];
    prompt: string;
  };
  perpendicular: {
    label: string;
    contextWords: string[];
    prompt: string;
  };
  crossingPrompt: string;
  mapping: Array<{ source?: string; derived: string; method: string }>;
  rationale: string[];
  message: string;
}

// Tool 13: bridge_resume_session
export interface ResumeSessionRequest {
  sessionId: string;  // ✅ Required: which session to resume
}

export interface ResumeSessionResponse {
  sessionId: string;
  traceCount: number;
  lastActive: number;
  message: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class BridgeError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "BridgeError";
  }
}

export class SessionNotFoundError extends BridgeError {
  constructor(sessionId: string) {
    super("SESSION_NOT_FOUND", `Session not found: ${sessionId}`, 404);
  }
}

export class TraceNotFoundError extends BridgeError {
  constructor(traceId: string) {
    super("TRACE_NOT_FOUND", `Trace not found: ${traceId}`, 404);
  }
}

export class InvalidInputError extends BridgeError {
  constructor(message: string) {
    super("INVALID_INPUT", message, 400);
  }
}

export class StorageError extends BridgeError {
  constructor(message: string) {
    super("STORAGE_ERROR", message, 500);
  }
}

// ============================================================================
// Configuration
// ============================================================================

export interface BridgeConfig {
  storagePath: string; // Where to persist memory.json
  enableLogging: boolean;
  logPath: string;
  // Heuristic thresholds (can be tuned per-user)
  heuristics: {
    semanticSaturationThreshold: number; // Jaccard overlap; default 0.6
    pauseThresholdMs: number; // Milliseconds; default 5000
    noveltyDropThreshold: number; // Novelty score; default 0.35
    critiqueFreshnessThreshold: number; // Cosine similarity; default 0.8
  };
  // UX settings
  ux: {
    minConfidenceToSurface: number; // default 0.5
    minTimeBetweenSuggestionsMs: number; // default 300000 (5 min)
  };
}

export const DEFAULT_CONFIG: BridgeConfig = {
  storagePath: `${process.env.HOME}/.cache/mcp-bridge`,
  enableLogging: true,
  logPath: `${process.env.HOME}/.cache/mcp-bridge/bridge.log`,
  heuristics: {
    semanticSaturationThreshold: 0.55,
    pauseThresholdMs: 10000,
    noveltyDropThreshold: 0.4,
    critiqueFreshnessThreshold: 0.7,
  },
  ux: {
    minConfidenceToSurface: 0.4,
    minTimeBetweenSuggestionsMs: 60000,
  },
};
