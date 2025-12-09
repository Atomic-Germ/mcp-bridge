/**
 * MCP-Bridge Server
 * Cognitive transition layer connecting mcp-creative and mcp-consult
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "crypto";
import {
  BridgeConfig,
  ContemplativeMemory,
  DEFAULT_CONFIG,
  SessionMetrics,
  StartSessionResponse,
  LogMeditationRequest,
  LogMeditationResponse,
  LogConsultRequest,
  LogConsultResponse,
  SuggestModeSwitchRequest,
  SuggestModeSwitchResponse,
  GetContextForConsultRequest,
  GetContextForConsultResponse,
  GetCritiqueForMeditationRequest,
  GetCritiqueForMeditationResponse,
  GetSessionTraceRequest,
  GetSessionTraceResponse,
  WeaveSessionRequest,
  WeaveSessionResponse,
  CompareModelsCritiqueRequest,
  CompareModelsCritiqueResponse,
  BuildConceptMemoryRequest,
  BuildConceptMemoryResponse,
  GetInsightDeepeningRequest,
  GetInsightDeepeningResponse,
  GetAvailableSessionsResponse,
  ResumeSessionRequest,
  ResumeSessionResponse,
  PlanPerpendicularMeditationsRequest,
  PlanPerpendicularMeditationsResponse,
  MeditationTrace,
  BridgeError,
  InvalidInputError,
} from "./types.js";
import { StorageManager } from "./utils/storage.js";
import { extractInsights, extractFeedback, scoreRelevance } from "./insights.js";
import { suggestModeSwitch } from "./modeSwitch.js";
import { DreamWeaver } from "./utils/dreamWeaver.js";
import {
  formatContextForConsult,
  formatContextForMeditation,
  buildConversationBridge,
} from "./contextInjection.js";
import { compareOllamaModels, listOllamaModels, analyzeConsensus } from "./utils/ollamaConsultant.js";
import { getConceptMemory } from "./utils/conceptMemory.js";
import {
  parseInsightResponse,
  formatDeepInsights,
  createContextFromInsights,
} from "./utils/creativeInsightIntegration.js";
import { buildPairedMeditationPlan, derivePerpendularStateFromSession } from "./experiments/perpendicularBridge.js";

// ============================================================================
// Global State
// ============================================================================

let config: BridgeConfig = DEFAULT_CONFIG;
let storage: StorageManager;
let currentSessionId: string | null = null;

// ============================================================================
// Tool Definitions
// ============================================================================

function listTools(): Tool[] {
  return [
    {
      name: "bridge_start_session",
      description:
        "START HERE: Initialize a new contemplative session. Must call this FIRST before any other bridge tools. Returns sessionId needed for all subsequent operations. Initializes empty trace history and metrics. No prerequisites. Next: creative_meditate or other tools.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "bridge_log_meditation",
      description:
        "Log meditation results from creative_meditate. Prerequisites: bridge_start_session. Extracts concepts, identifies patterns, analyzes novelty. Input: emergentSentence + contextWords. Next: bridge_get_insight_deepening (for deep analysis) OR bridge_suggest_mode_switch (check if switch to critique).",
      inputSchema: {
        type: "object",
        properties: {
          emergentSentence: {
            type: "string",
            description: "The emergent sentence from meditation",
          },
          contextWords: {
            type: "array",
            items: { type: "string" },
            description: "Context words used in meditation",
          },
          numRandomWords: {
            type: "number",
            description: "Number of random words generated",
          },
          seed: {
            type: "string",
            description: "Optional seed for reproducibility",
          },
        },
        required: ["emergentSentence", "contextWords"],
      },
    },
    {
      name: "bridge_log_consult",
      description:
        "Log a consult (critique) output and extract actionable feedback. Optionally override the computed relevance score.",
      inputSchema: {
        type: "object",
        properties: {
          model: {
            type: "string",
            description: "Ollama model used",
          },
          prompt: {
            type: "string",
            description: "The prompt sent to consult",
          },
          response: {
            type: "string",
            description: "The response from consult",
          },
          systemPrompt: {
            type: "string",
            description: "Optional system prompt",
          },
          relevanceOverride: {
            type: "number",
            description:
              "Optional: Override the computed relevance score (0-1). Use this if the bridge's NLP scoring disagrees with your intuition.",
          },
        },
        required: ["model", "prompt", "response"],
      },
    },
    {
      name: "bridge_suggest_mode_switch",
      description:
        "Suggest whether to switch modes (diverge/converge) based on heuristics",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "bridge_get_context_for_consult",
      description:
        "Get formatted insights from a meditation trace for injection into consult prompt",
      inputSchema: {
        type: "object",
        properties: {
          meditationTraceId: {
            type: "string",
            description: "ID of the meditation trace",
          },
          maxTokens: {
            type: "number",
            description: "Optional token limit",
          },
        },
        required: ["meditationTraceId"],
      },
    },
    {
      name: "bridge_get_critique_for_meditation",
      description:
        "Get formatted critique feedback from a consult trace for injection into next meditation",
      inputSchema: {
        type: "object",
        properties: {
          consultTraceId: {
            type: "string",
            description: "ID of the consult trace",
          },
          numTopConcepts: {
            type: "number",
            description: "How many top concepts to extract",
          },
        },
        required: ["consultTraceId"],
      },
    },
    {
      name: "bridge_get_session_trace",
      description:
        "View the current session trace log (recent traces and metadata)",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Optional session ID (uses current if not provided)",
          },
          limit: {
            type: "number",
            description: "Number of recent traces to return",
          },
        },
        required: [],
      },
    },
    {
      name: "bridge_weave_session",
      description:
        "Weave a narrative dream from the session's meditation traces, connecting insights based on adjacency.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Optional session ID (uses current if not provided)",
          },
          length: {
            type: "number",
            description: "Approximate number of moments to weave",
          },
          seed: {
            type: "string",
            description: "Optional seed concept to start the dream",
          },
        },
        required: [],
      },
    },
    {
      name: "bridge_compare_critique_models",
      description:
        "Get critiques from multiple Ollama models and analyze consensus/divergence",
      inputSchema: {
        type: "object",
        properties: {
          meditationTraceId: {
            type: "string",
            description: "UUID of the meditation trace to critique",
          },
          models: {
            type: "array",
            items: { type: "string" },
            description: "Optional: models to compare (default: auto-detect available)",
          },
          timeoutMs: {
            type: "number",
            description: "Optional: timeout per model in milliseconds (default: 120000)",
          },
        },
        required: ["meditationTraceId"],
      },
    },
    {
      name: "bridge_build_concept_memory",
      description:
        "Build persistent memory for a concept across sessions with evolution tracking",
      inputSchema: {
        type: "object",
        properties: {
          concept: {
            type: "string",
            description: "The concept to memorize",
          },
          sessionId: {
            type: "string",
            description: "Optional: current session ID for tracking",
          },
          insight: {
            type: "string",
            description: "Optional: the insight where concept appeared",
          },
          relatedConcepts: {
            type: "array",
            items: { type: "string" },
            description: "Optional: related concepts to link",
          },
        },
        required: ["concept"],
      },
    },
    {
      name: "bridge_get_insight_deepening",
      description:
        "Analyze a meditation trace using creative_insight to extract deeper patterns and themes",
      inputSchema: {
        type: "object",
        properties: {
          meditationTraceId: {
            type: "string",
            description: "UUID of the meditation trace to analyze deeply",
          },
        },
        required: ["meditationTraceId"],
      },
    },
    {
      name: "bridge_list_sessions",
      description:
        "List all available sessions with metadata (when session ID is lost after server restart)",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "bridge_resume_session",
      description:
        "Resume a specific session (after server restart or to switch sessions)",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "UUID of the session to resume",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "bridge_explain_flow",
      description:
        "Ask Bridge: What should I do next? Returns explicit next step with tool name, parameters, and reasoning. Use when unsure. Helps ALL models understand the flow. Input: (optional) currentState or goal. Output: nextStep recommendation.",
      inputSchema: {
        type: "object",
        properties: {
          currentState: {
            type: "string",
            description:
              "Optional: Describe what you just did (e.g. 'logged a meditation', 'got critiques')",
          },
          goal: {
            type: "string",
            description:
              "Optional: What are you trying to accomplish (e.g. 'deep insight', 'full session cycle')",
          },
        },
        required: [],
      },
    },
    {
      name: "bridge_get_workflow_examples",
      description:
        "See concrete examples of Bridge workflows. Learn by example how to sequence tools. Workflows: 'full_session' (complete cycle), 'quick_insight' (fast meditation+insight), 'recovery' (after crash). Each shows exact tool calls and data flow.",
      inputSchema: {
        type: "object",
        properties: {
          workflowType: {
            type: "string",
            enum: ["full_session", "quick_insight", "concept_building", "recovery"],
            description: "Type of workflow to see",
          },
        },
        required: ["workflowType"],
      },
    },
    {
      name: "bridge_plan_perpendicular_meditations",
      description:
        "Plan paired meditations: primary + perpendicular contexts with prompts and crossing guidance. Returns orthogonal context, mapping, rationale.",
      inputSchema: {
        type: "object",
        properties: {
          contextWords: {
            type: "array",
            items: { type: "string" },
            description: "Primary context words",
          },
          targetLength: {
            type: "number",
            description: "Desired size of perpendicular list",
          },
          additionalPool: {
            type: "array",
            items: { type: "string" },
            description: "Optional extra seeds for orthogonal generation",
          },
          seed: {
            type: "string",
            description: "Seed for deterministic perpendicular generation",
          },
          primaryLabel: {
            type: "string",
            description: "Optional label for the primary path",
          },
          perpendicularLabel: {
            type: "string",
            description: "Optional label for the perpendicular path",
          },
          useAntonymMap: {
            type: "boolean",
            description: "Toggle antonym-based flips",
          },
          state: {
            type: "object",
            description: "Optional heuristic state (novelty/saturation signals) to modulate inversion strength",
            properties: {
              mode: { type: "string", enum: ["NORMAL", "SOFT", "HARSH"] },
              signals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    novelty: { type: "number" },
                    saturation: { type: "number" },
                  },
                  required: ["novelty", "saturation"],
                },
                description: "Recent novelty/saturation samples (last 5)",
              },
              recentBranches: {
                type: "array",
                items: { type: "string" },
                description: "Identifiers of recently used perpendicular branches",
              },
              thresholds: {
                type: "object",
                properties: {
                  noveltyHigh: { type: "number" },
                  saturationHigh: { type: "number" },
                  minAffinity: { type: "number" },
                },
              },
              currentAffinity: { type: "number" },
            },
          },
          useHeuristicGating: {
            type: "boolean",
            description: "Enable novelty/saturation gating (default true)",
          },
        },
        required: ["contextWords"],
      },
    },
  ];
}

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleStartSession(): Promise<StartSessionResponse> {
  const sessionId = randomUUID();
  const now = Date.now();

  const initialMetrics: SessionMetrics = {
    lastModeSwitch: now,
    currentMode: "diverge",
    repetitionCount: 0,
    pauseDuration: 0,
    avgCycleDuration: 0,
    lastSuggestionTime: now,
    recentPerpendicularModes: [],
  };

  const session: ContemplativeMemory = {
    traces: [],
    sessionId,
    startedAt: now,
    metrics: initialMetrics,
  };

  await storage.saveSession(session);
  await storage.setCurrentSessionId(sessionId);  // Persist to disk
  currentSessionId = sessionId;

  return {
    sessionId,
    startedAt: now,
    initialMetrics,
  };
}

async function handleLogMeditation(
  req: LogMeditationRequest
): Promise<LogMeditationResponse> {
  if (!currentSessionId) {
    throw new InvalidInputError("No active session. Call bridge_start_session first.");
  }

  if (!req.emergentSentence || !req.contextWords) {
    throw new InvalidInputError(
      "emergentSentence and contextWords are required"
    );
  }

  const traceId = randomUUID();
  const now = Date.now();

  // Load session to get history for novelty computation
  const session = await storage.loadSession(currentSessionId);
  if (!session) {
    throw new InvalidInputError(`Session not found: ${currentSessionId}`);
  }

  // Extract insights from the meditation text
  const insights = extractInsights(req.emergentSentence, session);

  const trace: MeditationTrace = {
    id: traceId,
    timestamp: now,
    mode: "diverge",
    meditation: {
      contextWords: req.contextWords,
      numRandomWords: req.numRandomWords || 12,
      seed: req.seed,
      emergentSentence: req.emergentSentence,
    },
    insights,
    bridge: {
      confidenceLevel: 0.9, // High confidence in extraction
    },
  };

  await storage.addTraceToSession(currentSessionId, trace);

  return {
    traceId,
    insights,
    message: `Logged meditation trace ${traceId}. Concepts: ${insights.extractedPatterns.join(", ")}. Novelty: ${insights.novelty.toFixed(2)}.`,
  };
}

async function handleLogConsult(
  req: LogConsultRequest
): Promise<LogConsultResponse> {
  if (!currentSessionId) {
    throw new InvalidInputError("No active session. Call bridge_start_session first.");
  }

  if (!req.model || !req.prompt || !req.response) {
    throw new InvalidInputError("model, prompt, and response are required");
  }

  const traceId = randomUUID();
  const now = Date.now();

  // Extract feedback from the consult response
  const extractedFeedback = extractFeedback(req.response);

  // Determine relevance score: use override if provided, otherwise compute
  let relevanceScore = 0.5; // Default neutral
  let relevanceSource: "computed" | "user-override" = "computed";

  if (req.relevanceOverride !== undefined) {
    // User override takes precedence
    if (req.relevanceOverride < 0 || req.relevanceOverride > 1) {
      throw new InvalidInputError("relevanceOverride must be between 0 and 1");
    }
    relevanceScore = req.relevanceOverride;
    relevanceSource = "user-override";
  } else {
    // Try to score relevance based on prior meditations
    const session = await storage.loadSession(currentSessionId);
    if (session && session.traces.length > 0) {
      const lastMeditation = [...session.traces]
        .reverse()
        .find((t) => t.meditation);
      if (lastMeditation?.insights) {
        relevanceScore = scoreRelevance(
          lastMeditation.insights.extractedPatterns,
          req.response
        );
      }
    }
  }

  const trace: MeditationTrace = {
    id: traceId,
    timestamp: now,
    mode: "converge",
    critique: {
      consultModel: req.model,
      prompt: req.prompt,
      systemPrompt: req.systemPrompt,
      response: req.response,
      relevance: relevanceScore,
    },
    bridge: {
      confidenceLevel: 0.85,
    },
  };

  await storage.addTraceToSession(currentSessionId, trace);

  return {
    traceId,
    relevanceScore,
    relevanceSource,
    extractedFeedback,
    message: `Logged consult trace ${traceId}. Relevance: ${relevanceScore.toFixed(2)} (${relevanceSource}). Feedback points: ${extractedFeedback.length}`,
  };
}

async function handleSuggestModeSwitch(): Promise<SuggestModeSwitchResponse> {
  if (!currentSessionId) {
    throw new InvalidInputError("No active session. Call bridge_start_session first.");
  }

  const session = await storage.loadSession(currentSessionId);
  if (!session || session.traces.length < 2) {
    return {
      suggestion: null,
      message:
        "Need at least 2 traces before suggesting mode switch. Keep building history!",
    };
  }

  // Run all 4 heuristics and get suggestion
  const suggestion = suggestModeSwitch(
    session,
    config.ux.minConfidenceToSurface, // Use configured threshold
    config.heuristics // Pass configured heuristics
  );

  if (!suggestion) {
    return {
      suggestion: null,
      message: "No strong mode-switch signal yet. Continue your flow!",
    };
  }

  return {
    suggestion,
    message: `Suggestion: Switch to ${suggestion.suggestedMode} mode. Confidence: ${(suggestion.confidence * 100).toFixed(0)}%. Reason: ${suggestion.reason}`,
  };
}

async function handleGetContextForConsult(
  req: GetContextForConsultRequest
): Promise<GetContextForConsultResponse> {
  if (!currentSessionId) {
    throw new InvalidInputError("No active session. Call bridge_start_session first.");
  }

  const trace = await storage.getTraceById(currentSessionId, req.meditationTraceId);
  if (!trace || !trace.insights) {
    throw new InvalidInputError(`Meditation trace not found: ${req.meditationTraceId}`);
  }

  // Load session to get history for context
  const session = await storage.loadSession(currentSessionId);
  if (!session) {
    throw new InvalidInputError(`Session not found: ${currentSessionId}`);
  }

  // Calculate session statistics
  const meditationTraces = session.traces.filter((t) => t.insights);
  const avgNovelty =
    meditationTraces.length > 0
      ? meditationTraces.reduce((sum, t) => sum + (t.insights?.novelty || 0), 0) /
        meditationTraces.length
      : 0;

  // Format rich context for consult
  const context = formatContextForConsult(trace, {
    count: meditationTraces.length,
    avgNovelty,
  });

  return {
    systemPromptChunk: context.systemPrompt,
    userPromptChunk: context.userPrompt,
    concepts: context.concepts,
    novelty: context.novelty,
    clusters: context.clusters,
    message: `Rich context for critique. Meditation novelty: ${(context.novelty * 100).toFixed(0)}%. Session avg: ${(avgNovelty * 100).toFixed(0)}%.`,
  };
}

async function handleGetCritiqueForMeditation(
  req: GetCritiqueForMeditationRequest
): Promise<GetCritiqueForMeditationResponse> {
  if (!currentSessionId) {
    throw new InvalidInputError("No active session. Call bridge_start_session first.");
  }

  const trace = await storage.getTraceById(currentSessionId, req.consultTraceId);
  if (!trace || !trace.critique) {
    throw new InvalidInputError(`Consult trace not found: ${req.consultTraceId}`);
  }

  // Format critique context for next meditation
  const context = formatContextForMeditation(trace);

  return {
    contextWords: context.suggestedContextWords,
    extractedFeedback: context.extractedFeedback,
    provocativeQuestions: context.provocativeQuestions,
    userPromptChunk: context.userPrompt,
    message: `Feedback extracted. Suggested context: ${context.suggestedContextWords.join(", ")}. Feedback points: ${context.extractedFeedback.length}. Questions to explore: ${context.provocativeQuestions.length}.`,
  };
}

async function handleGetSessionTrace(
  req: GetSessionTraceRequest
): Promise<GetSessionTraceResponse> {
  const sessionId = req.sessionId || currentSessionId;
  if (!sessionId) {
    throw new InvalidInputError("No session ID provided and no active session");
  }

  const session = await storage.loadSession(sessionId);
  if (!session) {
    throw new InvalidInputError(`Session not found: ${sessionId}`);
  }

  const limit = req.limit || 10;
  const recentTraces = session.traces.slice(-limit);

  return {
    sessionId,
    traces: recentTraces,
    totalTraces: session.traces.length,
    message: `Retrieved ${recentTraces.length} of ${session.traces.length} traces`,
  };
}

async function handleWeaveSession(
  req: WeaveSessionRequest
): Promise<WeaveSessionResponse> {
  const sessionId = req.sessionId || currentSessionId;
  if (!sessionId) {
    throw new InvalidInputError("No session ID provided and no active session");
  }

  const session = await storage.loadSession(sessionId);
  if (!session) {
    throw new InvalidInputError(`Session not found: ${sessionId}`);
  }

  const dream = await DreamWeaver.weave(session.traces, req.length, req.seed);

  return {
    dream,
    message: "Session dream woven successfully.",
  };
}

async function handleCompareModelsCritique(
  req: CompareModelsCritiqueRequest
): Promise<CompareModelsCritiqueResponse> {
  if (!currentSessionId) {
    throw new InvalidInputError("No active session. Call bridge_start_session first.");
  }

  const trace = await storage.getTraceById(currentSessionId, req.meditationTraceId);
  if (!trace || !trace.meditation) {
    throw new InvalidInputError(`Meditation trace not found: ${req.meditationTraceId}`);
  }

  // Determine which models to use
  let models = req.models;
  if (!models || models.length === 0) {
    // Auto-detect available models
    const available = await listOllamaModels();
    models = available.map((m) => m.name).slice(0, 3); // Use top 3

    if (models.length === 0) {
      throw new InvalidInputError(
        "No Ollama models available and no models specified"
      );
    }
  }

  // Get context for critique from bridge
  const contextRes = await handleGetContextForConsult({
    meditationTraceId: req.meditationTraceId,
  });

  // Consult multiple models in parallel
  const prompt = contextRes.userPromptChunk || contextRes.systemPromptChunk;
  const { successes, failures } = await compareOllamaModels(
    models,
    prompt,
    contextRes.systemPromptChunk,
    req.timeoutMs || 120000
  );

  if (successes.length === 0) {
    throw new InvalidInputError(
      `All models failed: ${failures.map((f) => f.error).join("; ")}`
    );
  }

  // Analyze consensus
  const comparison = analyzeConsensus(successes);

  // Add model responses to comparison
  const fullComparison = {
    ...comparison,
    modelResponses: successes.map((s) => ({
      model: s.model,
      response: s.response,
      processingTime: s.processingTime,
    })),
  };

  // Log the comparison as a new trace
  const traceId = randomUUID();
  const now = Date.now();

  const multiModelTrace: MeditationTrace = {
    id: traceId,
    timestamp: now,
    mode: "converge",
    critique: {
      consultModel: `multi-model(${successes.map((s) => s.model).join(",")})`,
      prompt,
      response: successes.map((s) => `[${s.model}]: ${s.response}`).join("\n\n"),
      relevance: (
        successes.reduce((sum, s) => sum + (s.processingTime ? 1 : 0), 0) /
        successes.length
      ), // Simplified relevance
    },
    bridge: {
      confidenceLevel: comparison.agreementScore,
      reasonForSwitch: `Multi-model critique: ${successes.length} models analyzed`,
    },
  };

  await storage.addTraceToSession(currentSessionId, multiModelTrace);

  return {
    traceId,
    comparison: fullComparison,
    message: `Got critiques from ${successes.length} models. Agreement score: ${(
      fullComparison.agreementScore * 100
    ).toFixed(0)}%.`,
  };
}

async function handleBuildConceptMemory(
  req: BuildConceptMemoryRequest
): Promise<BuildConceptMemoryResponse> {
  if (!currentSessionId) {
    throw new InvalidInputError("No active session. Call bridge_start_session first.");
  }

  const conceptMemory = getConceptMemory();

  // Record the concept
  const record = conceptMemory.recordConcept(
    req.concept,
    currentSessionId,
    (req as any).insight || req.concept,
    (req as any).model
  );

  // Link related concepts if provided
  if ((req as any).relatedConcepts) {
    for (const related of (req as any).relatedConcepts) {
      conceptMemory.linkConcepts(req.concept, related);
    }
  }

  // Get related concepts
  const related = conceptMemory.getRelated(req.concept);

  return {
    concept: req.concept,
    entryId: record.id,
    firstSessionId: record.sessionIds[0],
    relatedConcepts: related.map((r) => r.concept),
    message: `Concept "${req.concept}" recorded. ${related.length} related concepts found.`,
  };
}

async function handleGetInsightDeepening(
  req: GetInsightDeepeningRequest
): Promise<GetInsightDeepeningResponse> {
  if (!currentSessionId) {
    throw new InvalidInputError("No active session. Call bridge_start_session first.");
  }

  const trace = await storage.getTraceById(currentSessionId, req.meditationTraceId);
  if (!trace || !trace.meditation) {
    throw new InvalidInputError(`Meditation trace not found: ${req.meditationTraceId}`);
  }

  const emergentSentence = trace.meditation.emergentSentence;
  const contextWords = trace.meditation.contextWords;

  // Parse the meditation to extract deeper insights
  // Since we can't directly call creative_insight from another MCP in this context,
  // we'll use heuristic pattern extraction based on the meditation content
  const deepInsight = parseInsightResponse(emergentSentence);

  // Create context for next meditation
  const nextContext = createContextFromInsights(deepInsight);

  // Record patterns in concept memory
  const conceptMemory = getConceptMemory();
  for (const pattern of deepInsight.patterns) {
    conceptMemory.recordConcept(
      pattern.name,
      currentSessionId,
      `Identified in meditation: ${emergentSentence.substring(0, 50)}...`,
      "creative-insight"
    );
  }

  // Log this deepening as a special trace
  const traceId = randomUUID();
  const now = Date.now();

  const insightTrace: MeditationTrace = {
    id: traceId,
    timestamp: now,
    mode: "diverge",
    insights: {
      extractedPatterns: deepInsight.patterns.map((p) => p.name),
      novelty: 0.8, // Deepening is always novel
      semanticClusters: [
        deepInsight.patterns.map((p) => p.name),
        deepInsight.metaPatterns,
        nextContext.contextWords,
      ],
      extractedAt: now,
    },
    bridge: {
      transitionSuggested: false,
      reasonForSwitch: "Deeper insight patterns extracted and recorded",
      confidenceLevel: 0.85,
    },
  };

  await storage.addTraceToSession(currentSessionId, insightTrace);

  return {
    traceId,
    patterns: deepInsight.patterns,
    metaPatterns: deepInsight.metaPatterns,
    focusAreas: deepInsight.focusAreas,
    suggestedContextWords: nextContext.contextWords,
    guidingQuestions: nextContext.guidingQuestions,
    message: `Insight deepening complete. Found ${deepInsight.patterns.length} patterns and ${deepInsight.focusAreas.length} focus areas.`,
  };
}

async function handleListSessions(): Promise<GetAvailableSessionsResponse> {
  const sessions = await storage.getAvailableSessions();

  return {
    sessions,
    currentSessionId,
    message: `${sessions.length} session(s) available. ${
      currentSessionId ? `Currently on: ${currentSessionId}` : "No active session"
    }`,
  };
}

async function handleResumeSession(
  req: ResumeSessionRequest
): Promise<ResumeSessionResponse> {
  if (!req.sessionId) {
    throw new InvalidInputError("sessionId is required");
  }

  const session = await storage.loadSession(req.sessionId);
  if (!session) {
    throw new InvalidInputError(`Session not found: ${req.sessionId}`);
  }

  // Set as current session (in memory and on disk)
  currentSessionId = req.sessionId;
  await storage.setCurrentSessionId(req.sessionId);

  return {
    sessionId: req.sessionId,
    traceCount: session.traces.length,
    lastActive: session.metrics.lastModeSwitch,
    message: `Resumed session ${req.sessionId}. Ready to continue.`,
  };
}

interface ExplainFlowRequest {
  currentState?: string;
  goal?: string;
}

interface ExplainFlowResponse {
  nextStep: string;
  tool: string;
  params: Record<string, unknown>;
  reasoning: string;
  alternativeSteps?: string[];
  flowContext: string;
}

async function handleExplainFlow(req: ExplainFlowRequest): Promise<ExplainFlowResponse> {
  const state = req.currentState?.toLowerCase() || "fresh_start";
  const goal = req.goal?.toLowerCase() || "explore";

  // Logic to determine next step based on state
  let nextStep: string;
  let tool: string;
  let params: Record<string, unknown>;
  let reasoning: string;
  let alternatives: string[] = [];
  let flowContext: string;

  if (!currentSessionId || state.includes("start") || goal.includes("new")) {
    nextStep = "Start a new session";
    tool = "bridge_start_session";
    params = {};
    reasoning =
      "Every Bridge workflow begins by creating a session. This initializes the trace history and metrics.";
    alternatives = [];
    flowContext = "→ After: Call creative_meditate to begin exploration";
  } else if (state.includes("meditat")) {
    nextStep = "Log your meditation results";
    tool = "bridge_log_meditation";
    params = {
      emergentSentence: "[the sentence that emerged from your meditation]",
      contextWords: "[words you provided to the meditation]",
    };
    reasoning =
      "After meditating, logging extracts concepts and patterns. This creates a trace in your session.";
    alternatives = ["bridge_get_insight_deepening (for deeper analysis first)"];
    flowContext = "→ After: bridge_suggest_mode_switch or bridge_get_insight_deepening";
  } else if (state.includes("insight") || goal.includes("deep")) {
    nextStep = "Get deep insight from your meditation";
    tool = "bridge_get_insight_deepening";
    params = {
      meditationTraceId: "[ID from your last logged meditation]",
    };
    reasoning =
      "Extract deeper patterns (paradox, emergence, harmony). This guides your next meditation and builds concept memory.";
    alternatives = ["bridge_log_meditation (if you haven't logged yet)"];
    flowContext =
      "→ After: bridge_build_concept_memory or bridge_suggest_mode_switch";
  } else if (state.includes("critique") || state.includes("consult")) {
    nextStep = "Get multiple AI perspectives";
    tool = "bridge_compare_critique_models";
    params = {
      meditationTraceId: "[ID from your last logged meditation]",
      models: ["llama2", "mistral", "neural-chat"],
    };
    reasoning =
      "Consulting multiple models gives richer perspective. Analyze consensus and disagreement.";
    alternatives = ["bridge_suggest_mode_switch (check if time to switch)"];
    flowContext =
      "→ Prerequisites: Must have logged a meditation. After: bridge_log_consult";
  } else if (state.includes("concept") || state.includes("memory")) {
    nextStep = "Build persistent concept memory";
    tool = "bridge_build_concept_memory";
    params = {
      concept: "[concept you discovered]",
      relatedConcepts: ["[related concepts]"],
    };
    reasoning =
      "Record concepts to persist across sessions. Builds knowledge graph and tracks concept evolution.";
    alternatives = ["bridge_get_insight_deepening (for pattern guidance)"];
    flowContext = "→ This creates long-term memory for your contemplative journey";
  } else if (state.includes("weave") || goal.includes("narrative")) {
    nextStep = "Weave session into narrative dream";
    tool = "bridge_weave_session";
    params = {};
    reasoning =
      "Generate poetic synthesis of your entire session. Best with 5+ traces. Read-only reflection.";
    alternatives = ["bridge_get_session_trace (to review specific traces)"];
    flowContext = "→ Use at session end or for reflection on your journey";
  } else if (state.includes("lost") || state.includes("crash") || state.includes("restart")) {
    nextStep = "List available sessions to recover";
    tool = "bridge_list_sessions";
    params = {},
    reasoning =
      "After server restart or crash, sessions persist on disk. List all to find what you were working on.";
    alternatives = [
      "bridge_resume_session (if you know the sessionId)",
      "Server auto-recovery (may have restored automatically)",
    ];
    flowContext = "→ After: bridge_resume_session to switch back to it";
  } else {
    // Default: full cycle guidance
    nextStep = "Suggested flow: meditate → log → insight → concepts → critique → repeat";
    tool = "bridge_explain_flow";
    params = { goal: "I want to see an example workflow" };
    reasoning =
      "Not sure where you are in the flow? Bridge has examples for different workflows.";
    alternatives = ["bridge_get_workflow_examples (see concrete examples)"];
    flowContext = "→ Try bridge_get_workflow_examples with workflowType='full_session'";
  }

  return {
    nextStep,
    tool,
    params,
    reasoning,
    alternativeSteps: alternatives.length > 0 ? alternatives : undefined,
    flowContext,
  };
}

interface GetWorkflowExamplesRequest {
  workflowType: "full_session" | "quick_insight" | "concept_building" | "recovery";
}

interface GetWorkflowExamplesResponse {
  workflowType: string;
  description: string;
  duration: string;
  steps: Array<{
    step: number;
    tool: string;
    params: Record<string, unknown>;
    description: string;
    produces: string;
  }>;
  flowDiagram: string;
  tips: string[];
}

async function handleGetWorkflowExamples(
  req: GetWorkflowExamplesRequest
): Promise<GetWorkflowExamplesResponse> {
  const workflows: Record<string, GetWorkflowExamplesResponse> = {
    full_session: {
      workflowType: "full_session",
      description:
        "Complete contemplative cycle: meditate → log → deepen → critique → repeat",
      duration: "30-60 minutes",
      steps: [
        {
          step: 1,
          tool: "bridge_start_session",
          params: {},
          description: "Initialize new session",
          produces: "sessionId",
        },
        {
          step: 2,
          tool: "creative_meditate",
          params: {
            context_words: ["constraint", "freedom"],
            num_random_words: 12,
          },
          description: "Meditate with context words",
          produces: "emergentSentence, interpretation",
        },
        {
          step: 3,
          tool: "bridge_log_meditation",
          params: {
            emergentSentence: "[from meditation]",
            contextWords: "[your context words]",
          },
          description: "Log meditation and extract concepts",
          produces: "Trace with concepts, novelty score",
        },
        {
          step: 4,
          tool: "bridge_get_insight_deepening",
          params: {
            meditationTraceId: "[trace from step 3]",
          },
          description: "Extract deep patterns and focus areas",
          produces:
            "Patterns, meta-patterns, guided questions for next meditation",
        },
        {
          step: 5,
          tool: "bridge_build_concept_memory",
          params: {
            concept: "[concept from step 4]",
            relatedConcepts: ["[related concepts]"],
          },
          description: "Record concept for persistent learning",
          produces: "Persisted concept with relationships",
        },
        {
          step: 6,
          tool: "bridge_suggest_mode_switch",
          params: {},
          description: "Check if time to switch to critique",
          produces: "Switch recommendation",
        },
        {
          step: 7,
          tool: "bridge_compare_critique_models",
          params: {
            meditationTraceId: "[trace from step 3]",
            models: ["llama2", "mistral", "neural-chat"],
          },
          description: "Get multiple AI perspectives",
          produces:
            "Consensus analysis, per-model responses, agreement score",
        },
        {
          step: 8,
          tool: "bridge_log_consult",
          params: {
            model: "aggregate",
            prompt: "[your original meditation]",
            response: "[aggregate insights from step 7]",
          },
          description: "Log critique results",
          produces: "Critique trace in session",
        },
        {
          step: 9,
          tool: "bridge_get_critique_for_meditation",
          params: {},
          description: "Get feedback to guide next meditation",
          produces: "Suggested focus areas and context words",
        },
        {
          step: 10,
          tool: "bridge_weave_session",
          params: {},
          description: "At end: generate narrative synthesis",
          produces: "Poetic summary of entire session",
        },
      ],
      flowDiagram:
        "START → MEDITATE → LOG → DEEP INSIGHT → CONCEPTS → SWITCH? → CRITIQUE → LOG → FEEDBACK → (repeat or WEAVE)",
      tips: [
        "Start with meditation, always log results",
        "Deep insight helps guide next meditation direction",
        "Concept memory builds knowledge over multiple sessions",
        "Use multiple models for richer perspective",
        "Weave at end for reflection on your journey",
      ],
    },
    quick_insight: {
      workflowType: "quick_insight",
      description: "Fast workflow: meditate → log → deep insight only",
      duration: "10-15 minutes",
      steps: [
        {
          step: 1,
          tool: "bridge_start_session",
          params: {},
          description: "Start session",
          produces: "sessionId",
        },
        {
          step: 2,
          tool: "creative_meditate",
          params: {
            context_words: ["your focus word"],
            num_random_words: 8,
          },
          description: "Quick meditation",
          produces: "Emergent sentence",
        },
        {
          step: 3,
          tool: "bridge_log_meditation",
          params: {
            emergentSentence: "[from step 2]",
            contextWords: ["[your focus]"],
          },
          description: "Log meditation",
          produces: "Trace with concepts",
        },
        {
          step: 4,
          tool: "bridge_get_insight_deepening",
          params: {
            meditationTraceId: "[from step 3]",
          },
          description: "Extract deep patterns",
          produces: "Actionable insights and next focus",
        },
      ],
      flowDiagram: "START → MEDITATE → LOG → DEEP INSIGHT → DONE",
      tips: [
        "Good for quick contemplation sessions",
        "Skip critique for speed",
        "Still gets deep pattern analysis",
        "Can save to concept memory manually",
      ],
    },
    concept_building: {
      workflowType: "concept_building",
      description: "Focus on long-term learning: meditate → log → concept memory",
      duration: "20-40 minutes",
      steps: [
        {
          step: 1,
          tool: "bridge_start_session",
          params: {},
          description: "Start session",
          produces: "sessionId",
        },
        {
          step: 2,
          tool: "bridge_list_sessions",
          params: {},
          description: "See previous concepts you've recorded",
          produces: "List of all sessions with concept counts",
        },
        {
          step: 3,
          tool: "creative_meditate",
          params: {
            context_words: ["[concept to explore]"],
          },
          description: "Meditate on concept",
          produces: "New perspective on concept",
        },
        {
          step: 4,
          tool: "bridge_log_meditation",
          params: {
            emergentSentence: "[from step 3]",
            contextWords: ["[concept from step 2]"],
          },
          description: "Log new perspective",
          produces: "Trace",
        },
        {
          step: 5,
          tool: "bridge_build_concept_memory",
          params: {
            concept: "[concept you explored]",
            relatedConcepts: ["[how it relates to previous explorations]"],
          },
          description: "Record evolved understanding",
          produces: "Updated concept with evolution history",
        },
      ],
      flowDiagram: "START → LIST OLD CONCEPTS → MEDITATE ON ONE → LOG → RECORD EVOLUTION",
      tips: [
        "Check bridge_list_sessions first to see what you've explored",
        "Build on previous concepts to show growth",
        "Concept memory shows evolution across sessions",
        "Great for long-term knowledge development",
      ],
    },
    recovery: {
      workflowType: "recovery",
      description: "Recover after server crash or restart",
      duration: "5 minutes",
      steps: [
        {
          step: 1,
          tool: "bridge_list_sessions",
          params: {},
          description: "See what sessions are available",
          produces:
            "List with startedAt, traceCount, lastActive for each session",
        },
        {
          step: 2,
          tool: "bridge_resume_session",
          params: {
            sessionId: "[sessionId from step 1]",
          },
          description: "Resume the session you want",
          produces: "Confirmation that session is now active",
        },
        {
          step: 3,
          tool: "bridge_get_session_trace",
          params: {},
          description: "Review what was in your session",
          produces: "All traces and metrics from that session",
        },
        {
          step: 4,
          tool: "bridge_weave_session",
          params: {},
          description: "See narrative summary of your work",
          produces: "Poetic synthesis of session journey",
        },
      ],
      flowDiagram: "CRASH → LIST SESSIONS → RESUME → REVIEW → WEAVE FOR CONTEXT",
      tips: [
        "Bridge auto-restores most recent session on startup",
        "Use bridge_list_sessions if auto-restore didn't work as expected",
        "Check lastActive timestamp to find what you were working on",
        "bridge_weave_session helps you remember context",
        "Then continue your workflow where you left off",
      ],
    },
  };

  const workflow = workflows[req.workflowType];
  if (!workflow) {
    throw new InvalidInputError(
      `Unknown workflow: ${req.workflowType}. Available: ${Object.keys(workflows).join(", ")}`
    );
  }

  return workflow;
}

// ============================================================================
// Call Tool Handler (MCP Dispatch)
// ============================================================================

interface CallToolRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

async function callToolHandler(params: CallToolRequest): Promise<any> {
  const request = params;

  try {
    let result: unknown;

    switch (request.name) {
      case "bridge_start_session":
        result = await handleStartSession();
        break;

      case "bridge_log_meditation":
        result = await handleLogMeditation(request.arguments as unknown as LogMeditationRequest);
        break;

      case "bridge_log_consult":
        result = await handleLogConsult(request.arguments as unknown as LogConsultRequest);
        break;

      case "bridge_suggest_mode_switch":
        result = await handleSuggestModeSwitch();
        break;

      case "bridge_get_context_for_consult":
        result = await handleGetContextForConsult(
          request.arguments as unknown as GetContextForConsultRequest
        );
        break;

      case "bridge_get_critique_for_meditation":
        result = await handleGetCritiqueForMeditation(
          request.arguments as unknown as GetCritiqueForMeditationRequest
        );
        break;

      case "bridge_get_session_trace":
        result = await handleGetSessionTrace(request.arguments as unknown as GetSessionTraceRequest);
        break;

      case "bridge_weave_session":
        result = await handleWeaveSession(request.arguments as unknown as WeaveSessionRequest);
        break;

      case "bridge_compare_critique_models":
        result = await handleCompareModelsCritique(
          request.arguments as unknown as CompareModelsCritiqueRequest
        );
        break;

      case "bridge_build_concept_memory":
        result = await handleBuildConceptMemory(
          request.arguments as unknown as BuildConceptMemoryRequest
        );
        break;

      case "bridge_get_insight_deepening":
        result = await handleGetInsightDeepening(
          request.arguments as unknown as GetInsightDeepeningRequest
        );
        break;

      case "bridge_list_sessions":
        result = await handleListSessions();
        break;

      case "bridge_resume_session":
        result = await handleResumeSession(
          request.arguments as unknown as ResumeSessionRequest
        );
        break;

      case "bridge_explain_flow":
        result = await handleExplainFlow(
          request.arguments as unknown as ExplainFlowRequest
        );
        break;

      case "bridge_get_workflow_examples":
        result = await handleGetWorkflowExamples(
          request.arguments as unknown as GetWorkflowExamplesRequest
        );
        break;

      case "bridge_plan_perpendicular_meditations":
        result = await handlePlanPerpendicularMeditations(
          request.arguments as unknown as PlanPerpendicularMeditationsRequest
        );
        break;

      default:
        throw new InvalidInputError(`Unknown tool: ${request.name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMsg =
      error instanceof BridgeError
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: errorMsg }, null, 2),
        },
      ],
      isError: true,
    };
  }

  async function handlePlanPerpendicularMeditations(
    req: PlanPerpendicularMeditationsRequest
  ): Promise<PlanPerpendicularMeditationsResponse> {
    if (!req.contextWords || req.contextWords.length === 0) {
      throw new InvalidInputError("contextWords are required to build a perpendicular plan");
    }

    let derivedState = req.state;
    let sessionForUpdate: ContemplativeMemory | null = null;
    if (currentSessionId) {
      sessionForUpdate = await storage.loadSession(currentSessionId);
      derivedState = derivePerpendularStateFromSession(sessionForUpdate, req.contextWords, req.state);
    }

    const plan = buildPairedMeditationPlan(req.contextWords, {
      targetLength: req.targetLength,
      additionalPool: req.additionalPool,
      seed: req.seed,
      primaryLabel: req.primaryLabel,
      perpendicularLabel: req.perpendicularLabel,
      useAntonymMap: req.useAntonymMap,
      state: derivedState,
      useHeuristicGating: req.useHeuristicGating,
    });

    if (currentSessionId && sessionForUpdate) {
      const prior = sessionForUpdate.metrics.recentPerpendicularModes ?? [];
      const updated = [...prior, plan.mode].slice(-3);
      await storage.updateMetrics(currentSessionId, { recentPerpendicularModes: updated });
    }

    return {
      ...plan,
      message: `Planned paired meditations (mode=${plan.mode}) with ${plan.primary.contextWords.length} primary terms and ${plan.perpendicular.contextWords.length} perpendicular terms.`,
    };
  }
}

// ============================================================================
// Server Initialization
// ============================================================================

async function main() {
  // Initialize storage
  storage = new StorageManager(config);
  await storage.initialize();

  // Auto-restore previous session on startup
  try {
    const restoredSessionId = await storage.getCurrentSessionId();
    if (restoredSessionId) {
      // Validate that session still exists
      const session = await storage.loadSession(restoredSessionId);
      if (session) {
        currentSessionId = restoredSessionId;
        console.error(`[Bridge] Restored session: ${restoredSessionId}`);
      } else {
        // Session file was deleted but reference remains; try most recent
        const mostRecent = await storage.getMostRecentSession();
        if (mostRecent) {
          currentSessionId = mostRecent;
          await storage.setCurrentSessionId(mostRecent);
          console.error(`[Bridge] Previous session not found, using most recent: ${mostRecent}`);
        }
      }
    } else {
      // No previous session; try to find most recent
      const mostRecent = await storage.getMostRecentSession();
      if (mostRecent) {
        currentSessionId = mostRecent;
        await storage.setCurrentSessionId(mostRecent);
        console.error(`[Bridge] Auto-loaded most recent session: ${mostRecent}`);
      }
    }
  } catch (error) {
    console.error(`[Bridge] Failed to restore session:`, error);
    // Continue anyway; currentSessionId will be null
  }

  // Create MCP server
  const server = new Server(
    {
      name: "mcp-bridge",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listTools(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    callToolHandler(request.params as unknown as CallToolRequest)
  );

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[mcp-bridge] Server started");
}

main().catch((error) => {
  console.error("[mcp-bridge] Fatal error:", error);
  process.exit(1);
});
