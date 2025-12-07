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
  MeditationTrace,
  BridgeError,
  InvalidInputError,
} from "./types.js";
import { StorageManager } from "./utils/storage.js";
import { extractInsights, extractFeedback, scoreRelevance } from "./insights.js";
import { suggestModeSwitch } from "./modeSwitch.js";
import {
  formatContextForConsult,
  formatContextForMeditation,
  buildConversationBridge,
} from "./contextInjection.js";

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
      description: "Start a new contemplative session for logging traces",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "bridge_log_meditation",
      description:
        "Log a meditation output and extract insights (concepts, novelty, clusters)",
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
  };

  const session: ContemplativeMemory = {
    traces: [],
    sessionId,
    startedAt: now,
    metrics: initialMetrics,
  };

  await storage.saveSession(session);
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
    config.ux.minConfidenceToSurface // Use configured threshold
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
}

// ============================================================================
// Server Initialization
// ============================================================================

async function main() {
  // Initialize storage
  storage = new StorageManager(config);
  await storage.initialize();

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
