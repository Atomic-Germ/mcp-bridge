# MCP-Bridge Implementation Roadmap

## Milestone 0: Foundation (Week 1)
**Goal**: Scaffolding + basic types + storage layer

### Tasks
- [x] Repository initialized with TypeScript setup
- [ ] **Type definitions** (`src/types.ts`)
  - `MeditationTrace`, `ContemplativeMemory`, `ModeSwitch`, `Insight`
  - Input/output schemas for all 7 bridge tools
  
- [ ] **Storage layer** (`src/utils/storage.ts`)
  - Initialize `~/.cache/mcp-bridge/memory.json`
  - Read/write operations with rollback safety (atomic writes)
  - Session isolation (each session gets a unique ID)

- [ ] **Basic server scaffolding** (`src/index.ts`)
  - Express.js or fastify for HTTP (or stick with stdio if pure MCP)
  - `listTools()` returning all 7 bridge tools
  - `callToolHandler(params)` routing to handlers
  - Error handling + logging

### Acceptance Criteria
```
✓ npm run build completes
✓ npm start runs without errors
✓ bridge_start_session() creates a sessionId
✓ Sessions persist to ~/.cache/mcp-bridge/memory.json
```

---

## Milestone 1: Insight Extraction (Week 2)
**Goal**: Extract meaningful concepts from meditation outputs

### Tasks
- [ ] **Simple NLP utilities** (`src/utils/nlp.ts`)
  - `tokenize(text: string): string[]` → word + punctuation splitting
  - `extractKeywords(text: string): string[]` → TF-IDF or frequency-based
  - `cosineSimilarity(words1, words2): number` → 0-1 overlap metric
  - `semanticCluster(concepts: string[]): string[][]` → group related words

- [ ] **Insight extractor** (`src/insights.ts`)
  - `extractInsights(meditationText: string): Insight`
  - Compute novelty vs. session history
  - Return top 3-5 concepts
  - Confidence score for extracted concepts

- [ ] **Integration**: `bridge_log_meditation()` handler
  - Intercepts meditation output
  - Calls `extractInsights()`
  - Creates + stores Trace
  - Returns formatted insight

### Test Fixtures
Create 5 sample meditation outputs:
```json
[
  {
    "sentence": "Constraint births creativity through systematic opposition.",
    "expectedConcepts": ["constraint", "creativity", "opposition"],
    "expectedNovelty": 0.75
  },
  ...
]
```

### Acceptance Criteria
```
✓ Extracts 3-5 concepts per meditation
✓ Concepts match manual review >= 80% accuracy
✓ Novelty scores range 0-1 meaningfully
✓ bridge_log_meditation() returns insights in <100ms
```

---

## Milestone 2: Mode-Switch Heuristics (Week 3)
**Goal**: Detect optimal moment to switch between diverge/converge

### Tasks
- [ ] **Heuristic engine** (`src/modeSwitch.ts`)
  - Implement 4 heuristics (Semantic Saturation, Pause, Novelty, Critique Freshness)
  - Each returns `{triggeredAt: boolean, confidence: number, reason: string}`
  - Combine via weighted OR (highest confidence wins)

- [ ] **Metrics aggregator** (`src/contemplativeMemory.ts`)
  - Maintain running window of last N traces
  - Track `repetitionCount`, `pauseDuration`, `avgCycleDuration`
  - Update metrics on each `bridge_log_*()` call

- [ ] **Integration**: `bridge_suggest_mode_switch()` handler
  - Calls heuristic engine
  - Returns suggestion with confidence
  - Logs suggestion for later analysis

- [ ] **Tests for each heuristic**
  ```typescript
  // Example: Semantic Saturation
  test('detects 3 consecutive high-overlap concepts', () => {
    const traces = [
      { insights: {extractedPatterns: ["A", "B"]} },
      { insights: {extractedPatterns: ["A", "B", "C"]} },
      { insights: {extractedPatterns: ["A", "B", "D"]} },
    ];
    const {triggeredAt, confidence, reason} = 
      detectSemanticSaturation(traces);
    expect(triggeredAt).toBe(true);
    expect(confidence).toBeGreaterThan(0.6);
  });
  ```

### Acceptance Criteria
```
✓ Each heuristic fires in expected scenarios
✓ Confidence scores are calibrated (test on fixture traces)
✓ bridge_suggest_mode_switch() returns in <50ms
✓ No heuristic fires when session has <3 traces (avoid false positives)
```

---

## Milestone 3: Context Injection (Week 4)
**Goal**: Format insights for prompt injection into consult/meditate

### Tasks
- [ ] **Context formatters** (`src/contextInjection.ts`)
  - `formatInsightsForConsult(traceId): string`
    → System prompt chunk: "Your meditation revealed: [concepts]. Critique these."
  - `formatCritiqueForMeditation(traceId): string[]`
    → Context words for next meditation: filtered, priority-ranked critique points

- [ ] **Integration**: Two new handlers
  - `bridge_get_context_for_consult(meditationTraceId)`
  - `bridge_get_critique_for_meditation(consultTraceId)`
  - Return formatted strings ready for prompt injection

- [ ] **bridge_log_consult()** enhanced
  - Compute relevance: how well does critique apply to the meditation ideas?
  - Extract actionable feedback (simple: sentences with "suggest", "consider", "avoid")
  - Store for re-injection

### Acceptance Criteria
```
✓ Injected context < 200 tokens (stays within prompt budget)
✓ Context is grammatically correct and relevant (manual check)
✓ Re-injected critique → new meditation produces 20%+ novel concepts (test)
✓ Both formatters complete in <100ms
```

---

## Milestone 4: Integration & Polish (Week 5)
**Goal**: Full end-to-end test + error handling + documentation

### Tasks
- [ ] **Full integration test**
  - meditate → log → suggest → consult → log → suggest again
  - Trace the entire flow with mock data
  - Verify all 7 tools work together

- [ ] **Error handling**
  - Invalid sessionIds → 404 with helpful message
  - Malformed meditation/consult logs → validation errors
  - Storage failures → graceful fallback to in-memory
  - mcp-creative/mcp-consult unavailable → warn but continue

- [ ] **Logging**
  - Structured JSON logs to `~/.cache/mcp-bridge/bridge.log`
  - Include: timestamp, tool name, input, output, latency, heuristic fires
  - No sensitive data (no prompts, only tokens/concepts)

- [ ] **README + API docs**
  - Quick start: how to configure bridge alongside creative/consult
  - Each tool: inputs, outputs, example usage
  - Heuristic explanation + calibration guide

- [ ] **Performance profiling**
  - Ensure each bridge tool < 200ms (including storage I/O)
  - Memory footprint for 1k traces < 10MB

### Acceptance Criteria
```
✓ Full integration test passes (meditate → suggest → consult → suggest)
✓ All error cases handled gracefully
✓ Logs are structured and debuggable
✓ API docs are complete
✓ Latency profiling shows all tools < 200ms
```

---

## Milestone 5 (Stretch): Dashboard Prototype
**Goal**: Simple CLI visualization of bridge state

### Tasks
- [ ] **TUI component** (`src/cli/dashboard.ts`)
  - Real-time display of last 3 traces (diverge + converge side-by-side)
  - Heuristic confidence meter (visual)
  - Current mode indicator + suggestion queue
  - Tech: `blessed` or simple ANSI tables

- [ ] **CLI command**
  - `mcp-bridge dashboard` → spawn TUI
  - `mcp-bridge trace <sessionId>` → pretty-print traces
  - `mcp-bridge analyze <sessionId>` → stats summary

### Acceptance Criteria
```
✓ Dashboard updates in <500ms on new traces
✓ TUI is non-blocking (doesn't interfere with normal tool usage)
✓ Looks polished (no janky redraws)
```

---

## Code Structure Template

```typescript
// src/types.ts
export interface Insight {
  extractedPatterns: string[];
  novelty: number;        // 0-1
  semanticClusters: string[][];
  extractedAt: number;
}

export interface MeditationTrace {
  id: string;
  timestamp: number;
  mode: "diverge";
  meditation: {
    contextWords: string[];
    numRandomWords: number;
    emergentSentence: string;
  };
  insights: Insight;
  bridge: { confidenceLevel: number };
}

export interface SwitchSuggestion {
  suggestedMode: "diverge" | "converge";
  confidence: number;
  reason: string;
  heuristicTriggered: string;
}
```

```typescript
// src/insights.ts
export async function extractInsights(
  meditationText: string,
  sessionMemory: ContemplativeMemory
): Promise<Insight> {
  const concepts = await extractKeywords(meditationText);
  const novelty = computeNoveltyScore(concepts, sessionMemory);
  const clusters = semanticCluster(concepts);
  
  return {
    extractedPatterns: concepts.slice(0, 5),
    novelty,
    semanticClusters: clusters,
    extractedAt: Date.now()
  };
}
```

```typescript
// src/modeSwitch.ts
export function suggestModeSwitch(
  memory: ContemplativeMemory
): SwitchSuggestion | null {
  const heuristics = [
    detectSemanticSaturation(memory),
    detectPauseThreshold(memory),
    detectNoveltyDrop(memory),
    detectCritiqueFreshness(memory)
  ];
  
  const triggered = heuristics.filter(h => h.triggeredAt);
  if (!triggered.length) return null;
  
  const best = triggered.reduce((a, b) =>
    a.confidence > b.confidence ? a : b
  );
  
  return {
    suggestedMode: memory.metrics.currentMode === "diverge" ? "converge" : "diverge",
    confidence: best.confidence,
    reason: best.reason,
    heuristicTriggered: best.heuristic
  };
}
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "uuid": "^9.0.0",
    "zod": "^3.22.0",
    "simple-statistics": "^7.8.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.0"
  }
}
```

---

## Review Checklist (Before Each Milestone PR)

- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] No console.error in normal flow (logging only)
- [ ] All new functions have JSDoc comments
- [ ] New types exported from `types.ts`
- [ ] Integration with mcp-creative/mcp-consult still works
- [ ] Latency profiling complete
- [ ] README updated with new tools

---

## Success Definition

By end of Milestone 4, the bridge:
1. **Captures every meditation + consult cycle** without breaking the MCPs
2. **Extracts meaningful insights** with 80%+ accuracy
3. **Detects mode switches** with >0.6 confidence in obvious scenarios
4. **Injects context** that visibly improves next-cycle outputs
5. **Operates transparently**: low latency, good logging, graceful errors
6. **Preserves flow**: no interruptions, contextual suggestions only

Optional (Milestone 5): **Beautiful visualization** so users can see the meditation→critique→meditation loop in action.
