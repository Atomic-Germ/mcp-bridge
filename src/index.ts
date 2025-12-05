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
        "Log a consult (critique) output and extract actionable feedback",
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

  // TODO: Extract insights in Milestone 1
  // For now, stub basic insights
  const basicNovelty = Math.random() * 0.5 + 0.5; // 0.5-1.0 random

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
    insights: {
      extractedPatterns: req.contextWords, // Stub: will be enhanced in M1
      novelty: basicNovelty,
      semanticClusters: [req.contextWords],
      extractedAt: now,
    },
    bridge: {
      confidenceLevel: 0.8,
    },
  };

  await storage.addTraceToSession(currentSessionId, trace);

  return {
    traceId,
    insights: trace.insights!,
    message: `Logged meditation trace ${traceId}. Concepts: ${req.contextWords.join(", ")}. Novelty: ${basicNovelty.toFixed(2)}`,
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

  // TODO: Extract feedback in Milestone 1
  // For now, stub basic relevance
  const basicRelevance = Math.random() * 0.4 + 0.6; // 0.6-1.0 random

  const trace: MeditationTrace = {
    id: traceId,
    timestamp: now,
    mode: "converge",
    critique: {
      consultModel: req.model,
      prompt: req.prompt,
      systemPrompt: req.systemPrompt,
      response: req.response,
      relevance: basicRelevance,
    },
    bridge: {
      confidenceLevel: 0.8,
    },
  };

  await storage.addTraceToSession(currentSessionId, trace);

  return {
    traceId,
    relevanceScore: basicRelevance,
    extractedFeedback: [], // TODO: Extract in M1
    message: `Logged consult trace ${traceId}. Model: ${req.model}. Relevance: ${basicRelevance.toFixed(2)}`,
  };
}

async function handleSuggestModeSwitch(): Promise<SuggestModeSwitchResponse> {
  if (!currentSessionId) {
    throw new InvalidInputError("No active session. Call bridge_start_session first.");
  }

  const session = await storage.loadSession(currentSessionId);
  if (!session || session.traces.length < 3) {
    return {
      suggestion: null,
      message:
        "Need at least 3 traces before suggesting mode switch. Keep meditating/consulting!",
    };
  }

  // TODO: Implement heuristics in Milestone 2
  // For now, return null (no suggestion yet)
  return {
    suggestion: null,
    message: "Heuristics not yet implemented. Check back in M2!",
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

  // TODO: Format context in Milestone 3
  // For now, stub basic formatting
  const systemPromptChunk = `Your meditation revealed these concepts: ${trace.insights.extractedPatterns.join(", ")}.\nPlease critique and evaluate these ideas.`;

  return {
    systemPromptChunk,
    concepts: trace.insights.extractedPatterns,
    message: "Context formatted (basic version; enhanced in M3)",
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

  // TODO: Extract feedback in Milestone 3
  // For now, stub basic extraction
  const contextWords = ["feedback", "consider", "next"];

  return {
    contextWords,
    extractedFeedback: [trace.critique.response.substring(0, 100)],
    message:
      "Critique formatted (basic version; enhanced in M3). Use contextWords for next meditation.",
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
