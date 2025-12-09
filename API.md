# MCP Bridge API Reference

Complete API documentation for the Contemplative Bridge—the cognitive connector between mcp-creative and mcp-consult.

## Overview

MCP Bridge provides 8 tools for managing the meditation-critique cycle, including:
- Session management and trace logging
- Mode-switch suggestions via neuroscience-backed heuristics
- Context injection between meditation and critique modes
- Session replay and narrative weaving

## Table of Contents

- [Core Tools](#core-tools)
  - [bridge_start_session](#bridge_start_session)
  - [bridge_log_meditation](#bridge_log_meditation)
  - [bridge_log_consult](#bridge_log_consult)
  - [bridge_suggest_mode_switch](#bridge_suggest_mode_switch)
  - [bridge_get_context_for_consult](#bridge_get_context_for_consult)
  - [bridge_get_critique_for_meditation](#bridge_get_critique_for_meditation)
  - [bridge_get_session_trace](#bridge_get_session_trace)
  - [bridge_weave_session](#bridge_weave_session)
  - [bridge_get_insight_deepening](#bridge_get_insight_deepening)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Configuration](#configuration)

---


## Core Tools

### bridge_start_session

Initializes a new contemplative session for logging and analyzing meditation-critique cycles.

**Input Schema:**

```typescript
{}  // No parameters required
```

**Returns:**

```typescript
{
  content: [{
    type: "text",
    text: JSON.stringify({
      sessionId: string;           // UUID for this session
      startedAt: number;           // Unix timestamp (ms)
      initialMetrics: {
        lastModeSwitch: number;
        currentMode: "diverge" | "converge";
        repetitionCount: number;
        pauseDuration: number;
        avgCycleDuration: number;
        lastSuggestionTime: number;
      }
    })
  }]
}
```

**Example:**

```javascript
const response = await callTool({
  name: "bridge_start_session",
  arguments: {}
});
// Returns sessionId like "550e8400-e29b-41d4-a716-446655440000"
```

**State:**
- Creates new session in memory
- Initializes metrics tracking
- Persists to `~/.cache/mcp-bridge/memory.json`

---

### bridge_log_meditation

Logs a meditation output, extracts insights (concepts, novelty, semantic clusters), and stores the trace.

**Input Schema:**

```typescript
{
  emergentSentence: string;        // ✅ Required: The meditation output
  contextWords: string[];          // ✅ Required: Context words used in meditation
  numRandomWords?: number;         // Optional: Number of random words (default: 12)
  seed?: string;                   // Optional: Seed for reproducibility
}
```

**Returns:**

```typescript
{
  content: [{
    type: "text",
    text: JSON.stringify({
      traceId: string;              // UUID of this trace
      insights: {
        extractedPatterns: string[]; // 3-5 key concepts
        novelty: number;             // 0-1: how different from prior traces
        semanticClusters: string[][]; // Related concepts grouped
        extractedAt: number;         // Unix timestamp (ms)
      }
      message: string;              // Human-readable summary
    })
  }]
}
```

**Example:**

```javascript
const response = await callTool({
  name: "bridge_log_meditation",
  arguments: {
    emergentSentence: "Constraint births creativity through systematic opposition",
    contextWords: ["constraint", "creativity", "flow"],
    numRandomWords: 12,
    seed: "session-42"
  }
});
// Returns: traceId, extracted concepts, novelty score
```

**Insight Extraction:**
- Tokenizes emergent sentence
- Extracts 3-5 keywords via frequency + noun-heuristics
- Computes novelty relative to last 3 meditations (0-1)
- Groups concepts into semantic clusters
- Performance: <25ms

**State Stored:**
```json
{
  "id": "trace-uuid",
  "mode": "diverge",
  "meditation": {
    "contextWords": ["constraint", "creativity"],
    "emergentSentence": "...",
    "numRandomWords": 12
  },
  "insights": {
    "extractedPatterns": ["constraint", "creativity", "opposition"],
    "novelty": 0.75,
    "semanticClusters": [["constraint", "structure"], ["creativity", "innovation"]]
  }
}
```

---

### bridge_log_consult

Logs a critique/consult output, extracts feedback points, scores relevance, and stores the trace.

**Input Schema:**

```typescript
{
  model: string;                   // ✅ Required: Ollama model name
  prompt: string;                  // ✅ Required: Prompt sent to model
  response: string;                // ✅ Required: Model's response
  systemPrompt?: string;           // Optional: System prompt used
  relevanceOverride?: number;      // Optional: Manual relevance score (0-1)
}
```

**Returns:**

```typescript
{
  content: [{
    type: "text",
    text: JSON.stringify({
      traceId: string;              // UUID of this trace
      relevanceScore: number;       // 0-1: how well critique applies to ideas
      relevanceSource: "computed" | "user-override";
      extractedFeedback: string[]; // 5 actionable feedback points
      message: string;              // Human-readable summary
    })
  }]
}
```

**Example:**

```javascript
const response = await callTool({
  name: "bridge_log_consult",
  arguments: {
    model: "llama2",
    prompt: "Critique these ideas: constraint, creativity, opposition",
    response: "Consider removing constraints entirely. What if freedom leads to chaos?",
    systemPrompt: "You are a critical thinker.",
    relevanceOverride: 0.85
  }
});
// Returns: traceId, relevance score, extracted feedback points
```

**Feedback Extraction:**
- Detects action words: "consider", "explore", "try", "avoid", "question"
- Returns top 5 actionable sentences
- Fallback: first 2 sentences if no action words found
- Performance: <25ms

**Relevance Scoring:**
- If `relevanceOverride` provided: uses that (0-1 range validated)
- Otherwise: computes relevance as:
  - 70% from concept mentions (how many meditation concepts appear?)
  - 30% from substantiveness (word count)
- Range: 0-1

**State Stored:**
```json
{
  "id": "trace-uuid",
  "mode": "converge",
  "critique": {
    "consultModel": "llama2",
    "prompt": "...",
    "response": "...",
    "relevance": 0.78
  }
}
```

---

### bridge_suggest_mode_switch

Analyzes session traces and suggests whether to switch between diverge (creative) and converge (analytical) modes.

**Input Schema:**

```typescript
{}  // No parameters required; uses current session memory
```

**Returns:**

```typescript
{
  content: [{
    type: "text",
    text: JSON.stringify({
      suggestion: SwitchSuggestion | null;
      message: string;
    })
  }],
  isError?: boolean
}

// Where SwitchSuggestion is:
{
  suggestedMode: "diverge" | "converge";
  confidence: number;               // 0-1: how confident is this suggestion?
  reason: string;                   // Human-readable explanation
  heuristicScores: {
    saturation: { triggered: boolean; confidence: number };
    pause: { triggered: boolean; confidence: number };
    noveltyDrop: { triggered: boolean; confidence: number };
    critiqueFreshness: { triggered: boolean; confidence: number };
  }
}
```

**Example:**

```javascript
const response = await callTool({
  name: "bridge_suggest_mode_switch",
  arguments: {}
});
// Returns: suggestion with confidence, reason, and individual heuristic scores
```

**The Four Heuristics:**

1. **Semantic Saturation** (diverge → converge)
   - Triggered when: Jaccard overlap between traces > 0.60 (concepts repeating)
   - Confidence: min(overlap, 0.8)
   - Signal: ideas are becoming repetitive; time to evaluate

2. **Pause Detection** (either direction)
   - Triggered when: pauseDuration > 5000ms (user paused 5+ seconds)
   - Confidence: min(pause_ms / 15000, 0.8)
   - Signal: incubation phase; user thinking deeply; ready to switch

3. **Novelty Drop** (diverge → converge)
   - Triggered when: average novelty of last 3 traces < 0.35
   - Confidence: 0.70 (fixed)
   - Signal: stuck in local optimum; critique may help escape

4. **Critique Freshness** (converge → diverge)
   - Triggered when: cosine similarity between consecutive critiques > 0.80
   - Confidence: 0.60 (fixed)
   - Signal: evaluation is circling same ideas; diverge to explore new angles

**Suggestion Logic:**
- Runs all 4 heuristics
- Returns highest-confidence trigger (if confidence >= configured threshold, default 0.4)
- If multiple heuristics suggest same mode, confidence increases
- Returns `null` if confidence below threshold

**Performance:** <50ms

---

### bridge_get_context_for_consult

Formats insights from a meditation trace into a prompt chunk for injecting into consult/critique.

**Input Schema:**

```typescript
{
  meditationTraceId: string;   // ✅ Required: UUID of meditation trace
  maxTokens?: number;          // Optional: token limit for output
}
```

**Returns:**

```typescript
{
  content: [{
    type: "text",
    text: JSON.stringify({
      systemPromptChunk: string;   // System prompt addition
      userPromptChunk?: string;    // User prompt addition
      concepts: string[];          // Extracted concepts
      novelty?: number;            // Meditation novelty score
      clusters?: string[][];       // Semantic clusters
      message: string;
    })
  }]
}
```

**Example:**

```javascript
const meditationResponse = await callTool({
  name: "bridge_log_meditation",
  arguments: {
    emergentSentence: "Constraint births creativity...",
    contextWords: ["constraint", "creativity"]
  }
});
const traceId = meditationResponse.traceId;

const contextResponse = await callTool({
  name: "bridge_get_context_for_consult",
  arguments: {
    meditationTraceId: traceId,
    maxTokens: 200
  }
});
// Use contextResponse.systemPromptChunk + contextResponse.userPromptChunk
// to inject into next consult call
```

**Generated Context:**

```
systemPromptChunk: "You are a critical analyst. The user has been meditating on: constraint, creativity, opposition. Their insights cluster around [structure & control] and [innovation & freedom]. Novelty of this meditation: 0.75/1.0 (novel ideas). Critique these ideas deeply, looking for contradictions and unexplored angles."

userPromptChunk: "Based on their meditation, consider: How do constraints *enable* creativity? What happens if you remove all constraints? Is there a tension between structure and freedom that's productive?"
```

**Performance:** <100ms

---

### bridge_get_critique_for_meditation

Formats feedback from a consult trace into context words and questions for the next meditation.

**Input Schema:**

```typescript
{
  consultTraceId: string;      // ✅ Required: UUID of consult trace
  numTopConcepts?: number;     // Optional: how many feedback concepts to extract (default: 5)
}
```

**Returns:**

```typescript
{
  content: [{
    type: "text",
    text: JSON.stringify({
      contextWords: string[];        // Suggested context words for next meditation
      extractedFeedback: string[];   // Actionable feedback points
      provocativeQuestions?: string[]; // Questions to explore
      userPromptChunk?: string;      // Prompt addition for next meditation
      message: string;
    })
  }]
}
```

**Example:**

```javascript
const consultResponse = await callTool({
  name: "bridge_log_consult",
  arguments: {
    model: "llama2",
    prompt: "Critique: constraint, creativity, opposition",
    response: "Consider: What if constraints are freedom? Explore the paradox..."
  }
});
const consultTraceId = consultResponse.traceId;

const feedbackResponse = await callTool({
  name: "bridge_get_critique_for_meditation",
  arguments: {
    consultTraceId: consultTraceId,
    numTopConcepts: 5
  }
});

// Use feedbackResponse.contextWords for next meditation
// Use feedbackResponse.provocativeQuestions to guide thinking
```

**Generated Context:**

```
contextWords: ["paradox", "freedom", "structure", "tension", "liberation"]

extractedFeedback: [
  "Constraints may enable freedom through structure",
  "Explore the paradox of constrained freedom",
  "Question whether chaos equals true freedom",
  "Investigate productive vs destructive constraints",
  "Consider cultural, biological, economic constraints"
]

provocativeQuestions: [
  "What if freedom requires constraints?",
  "Can you find examples of constraints that liberate?",
  "What's the opposite of 'constraint'—and is it desirable?"
]
```

**Performance:** <100ms

---

### bridge_get_session_trace

Retrieves and displays recent traces from a session for review or replay.

**Input Schema:**

```typescript
{
  sessionId?: string;   // Optional: specific session (uses current if not provided)
  limit?: number;       // Optional: how many recent traces (default: 10)
}
```

**Returns:**

```typescript
{
  content: [{
    type: "text",
    text: JSON.stringify({
      sessionId: string;
      traces: MeditationTrace[];   // Array of trace objects
      totalTraces: number;          // Total in session
      message: string;
    })
  }]
}

// Where MeditationTrace is:
{
  id: string;
  timestamp: number;
  mode: "diverge" | "converge";
  meditation?: MeditationData;
  insights?: Insight;
  critique?: CritiqueData;
  bridge: {
    transitionSuggested?: boolean;
    reasonForSwitch?: string;
    confidenceLevel: number;
  }
}
```

**Example:**

```javascript
const response = await callTool({
  name: "bridge_get_session_trace",
  arguments: {
    limit: 5
  }
});
// Returns last 5 traces from current session
```

**Use Cases:**
- Review meditation-critique pairs
- Analyze heuristic triggers
- Trace creative journey over time
- Export for offline analysis

---


### bridge_weave_session

### bridge_get_insight_deepening

Analyzes a meditation trace using creative_insight to extract deeper patterns, meta-themes, and philosophical implications. This tool is designed for reflection and meaning-making, surfacing connections that may be latent in the meditation cycle.

**Input Schema:**

```typescript
{
  meditationTraceId: string;   // ✅ Required: UUID of meditation trace
}
```

**Returns:**

```typescript
{
  content: [{
    deepThemes: string[];         // Array of meta-level themes and patterns
    philosophicalImplications: string[]; // Array of deeper questions or implications
    summary: string;              // Narrative summary of the deepened insight
    extractedAt: ISO8601;         // Timestamp
  }]
}
```

**Example:**

```javascript
const response = await callTool({
  name: "bridge_get_insight_deepening",
  arguments: {
    meditationTraceId: "46ddada3-ef4b-4166-9850-f837e4f039c7"
  }
});
// Returns: deepThemes, philosophicalImplications, summary
```

**Behavior:**
- Uses creative_insight to analyze the meditation trace
- Surfaces meta-patterns, paradoxes, and philosophical questions
- Provides a narrative summary for reflection
- Performance: <100ms

Weaves meditation traces into a narrative "dream"—a coherent stream of consciousness connecting insights via semantic adjacency.

**Input Schema:**

```typescript
{
  sessionId?: string;   // Optional: specific session (uses current if not provided)
  length?: number;      // Optional: approximate number of moments to weave (default: 10)
  seed?: string;        // Optional: seed concept to start the dream
}
```

**Returns:**

```typescript
{
  content: [{
    type: "text",
    text: string  // Narrative dream, e.g.:
                  // "In the garden of constraint, creativity blooms.
                  //  From structure springs freedom, paradoxically intertwined.
                  //  Each boundary becomes a canvas..."
  }]
}
```

**Example:**

```javascript
const response = await callTool({
  name: "bridge_weave_session",
  arguments: {
    length: 12,
    seed: "constraint"
  }
});
// Returns poetic narrative connecting meditation insights
```

**The Weaving Algorithm:**
1. Collects all meditation traces from session
2. Extracts concepts and clusters
3. Performs random walk guided by semantic adjacency
4. Generates narrative prose connecting concepts
5. Creates a "dream journal" entry with metadata

**Use:**
- Reflect on creative journey
- Identify hidden patterns
- Generate poetic interpretation of session
- Export for documentation or sharing

---

## Data Models

### MeditationTrace

```typescript
interface MeditationTrace {
  id: string;              // UUID
  timestamp: number;       // Unix ms
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
```

### Insight

```typescript
interface Insight {
  extractedPatterns: string[];      // 3-5 key concepts
  novelty: number;                  // 0-1: uniqueness relative to history
  semanticClusters: string[][];     // Related concepts grouped
  extractedAt: number;              // Unix timestamp (ms)
}
```

### ContemplativeMemory (Session)

```typescript
interface ContemplativeMemory {
  traces: MeditationTrace[];
  sessionId: string;
  startedAt: number;                // Unix ms
  
  metrics: SessionMetrics;
}

interface SessionMetrics {
  lastModeSwitch: number;           // Unix ms
  currentMode: "diverge" | "converge";
  repetitionCount: number;          // Concept repeats in last 3 traces
  pauseDuration: number;            // Seconds since last input
  avgCycleDuration: number;         // Median trace-to-trace (seconds)
  lastSuggestionTime: number;       // Unix ms
}
```

---

## Error Handling

All tools return graceful errors in standard format:

```typescript
{
  content: [{
    type: "text",
    text: "Error message explaining the issue"
  }],
  isError: true
}
```

### Common Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| `SESSION_NOT_FOUND` | No active session or invalid ID | Call `bridge_start_session()` first |
| `TRACE_NOT_FOUND` | Invalid trace ID | Verify ID from `bridge_get_session_trace()` |
| `INVALID_INPUT` | Missing required parameter | Check input schema |
| `STORAGE_ERROR` | Disk write failure | Check permissions on `~/.cache/mcp-bridge` |

### Example Error Response

```javascript
{
  content: [{
    type: "text",
    text: "SESSION_NOT_FOUND: No active session. Call bridge_start_session first."
  }],
  isError: true
}
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOME` | System home dir | Used to compute storage path |

### Storage Configuration

Storage location: `~/.cache/mcp-bridge/memory.json`

Example configuration in code:

```typescript
const config = {
  storagePath: `${process.env.HOME}/.cache/mcp-bridge`,
  enableLogging: true,
  heuristics: {
    semanticSaturationThreshold: 0.55,    // Overlap > 55% = saturation
    pauseThresholdMs: 10000,              // 10s pause detected
    noveltyDropThreshold: 0.4,            // Novelty < 0.4 = drop
    critiqueFreshnessThreshold: 0.7,      // Similarity > 0.7 = stale
  },
  ux: {
    minConfidenceToSurface: 0.4,          // Surface suggestions >= 40%
    minTimeBetweenSuggestionsMs: 60000,   // Max 1 suggestion per minute
  },
};
```

### Adjusting Heuristics

To tune heuristics per-user or per-session, you can adjust these thresholds. Lower thresholds = more frequent suggestions.

---

## Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| `bridge_log_meditation()` | <100ms | ✅ Typical: <25ms |
| `bridge_log_consult()` | <100ms | ✅ Typical: <25ms |
| `bridge_suggest_mode_switch()` | <50ms | ✅ Typical: <20ms |
| `bridge_get_context_for_consult()` | <100ms | ✅ Typical: <30ms |
| `bridge_get_critique_for_meditation()` | <100ms | ✅ Typical: <20ms |
| Session with 100 traces | <1s retrieval | ✅ Tested |
| Memory (1k traces) | <10MB disk | ✅ Verified |

---

## Integration with mcp-creative & mcp-consult

### Flow: Meditation → Critique → Meditation

```
1. Call mcp-creative: creative_meditate()
   → Returns emergent sentence + context words

2. Log in Bridge: bridge_log_meditation(emergent_sentence, context_words)
   → Returns trace ID, extracted concepts, novelty score

3. Get context for critique: bridge_get_context_for_consult(trace_id)
   → Returns formatted prompt chunk

4. Call mcp-consult: consult_ollama(prompt + context_chunk)
   → Returns critique response

5. Log in Bridge: bridge_log_consult(model, prompt, response)
   → Returns trace ID, relevance score, extracted feedback

6. Get context for next meditation: bridge_get_critique_for_meditation(trace_id)
   → Returns context words + provocative questions

7. Call mcp-creative: creative_meditate(context_words)
   → Returns next emergent sentence

Repeat 2-7 as desired.
```

### Example Session Flow (TypeScript)

```typescript
// Start session
const sessionRes = await bridge.callTool("bridge_start_session", {});
const sessionId = sessionRes.sessionId;

// Loop: meditate → critique → meditate
for (let i = 0; i < 3; i++) {
  // Diverge: meditate
  const meditationRes = await creative.callTool("creative_meditate", {
    context_words: i === 0 ? ["constraint", "creativity"] : feedbackContextWords
  });
  
  // Log meditation
  const logMedRes = await bridge.callTool("bridge_log_meditation", {
    emergentSentence: meditationRes.emergentSentence,
    contextWords: meditationRes.contextWords
  });
  
  // Check: should we switch to critique?
  const switchRes = await bridge.callTool("bridge_suggest_mode_switch", {});
  if (switchRes.suggestion?.suggestedMode === "converge") {
    // Get context for consult
    const contextRes = await bridge.callTool("bridge_get_context_for_consult", {
      meditationTraceId: logMedRes.traceId
    });
    
    // Converge: critique
    const critiqueRes = await consult.callTool("consult_ollama", {
      prompt: contextRes.userPromptChunk,
      model: "llama2"
    });
    
    // Log critique
    const logCritRes = await bridge.callTool("bridge_log_consult", {
      model: "llama2",
      prompt: contextRes.userPromptChunk,
      response: critiqueRes.response
    });
    
    // Get feedback for next meditation
    const feedbackRes = await bridge.callTool("bridge_get_critique_for_meditation", {
      consultTraceId: logCritRes.traceId
    });
    feedbackContextWords = feedbackRes.contextWords;
  }
}

// End: review session
const traceRes = await bridge.callTool("bridge_get_session_trace", {
  limit: 10
});
```

---

## Related Documentation

- **VISION.md**: User-centered perspective on the Bridge
- **DESIGN.md**: Full architecture and design decisions
- **QUICK_REFERENCE.md**: Heuristic cheat sheet
- **mcp-creative/API.md**: Creative meditation tools
- **mcp-consult/docs/API_REFERENCE.md**: Ollama consultation tools

