# MCP-Bridge: Contemplative Bridge Design Document

**Version**: 1.0  
**Date**: 2025-12-05  
**Status**: Design Phase → Implementation Roadmap  

---

## Executive Summary

MCP-Bridge is a coordination layer that weaves together **mcp-creative** (divergent ideation) and **mcp-consult** (convergent evaluation) using insights from cognitive-transition research. It enables seamless context-sharing between generative and analytical modes while detecting optimal moment-to-switch using lightweight heuristics inspired by EEG-based cognitive markers.

**Core thesis**: Most creative workflows fail because people **don't know when to switch modes**. By logging meditation cycles and detecting semantic/temporal patterns, we can nudge the right mode at the right time—without modal popups or cognitive overhead.

---

## Part A: Cognitive Science Foundation

### A1. The Cognitive-Transition Problem

**Research baseline** (Guilford, Osborn, Torrance; modern: Kounios/Beeman, Jung-Beeman EEG):
- **Divergent thinking** (creative): Broad search, semantic looseness, incubation periods crucial
- **Convergent thinking** (analytical): Tight focus, rigorous evaluation, builds on constraints
- **The switch**: Teams perform best when they **explicitly alternate** between modes, but humans are bad at sensing the right moment

**EEG findings** (Kounios 2008, Jung-Beeman 2004):
- Insight moments preceded by **broad alpha-band activity** (relaxed, wandering attention)
- Critique/evaluation shows **localized high-frequency** activity (focused gamma)
- The **transition zone** (when switching is optimal) has characteristic pause patterns: longer inter-utterance latencies, repetition of concepts, semantic saturation

### A2. Calm Technology & Progressive Disclosure

**Research** (Weiser, Ishii; modern: UX research on "notification overload"):
- Interrupt only when **threshold confidence** is reached (not every thought)
- Use **contextual panels** over modal alerts (preserve flow)
- Lean on **time-based gentle nudges** (e.g., "After 2 min of repetition, have you considered X mode?")
- Let users ignore suggestions without friction

**Implication for Bridge**: Don't shout. Surface insights in quiet trace panels and logs. Let the user stay in their flow state.

### A3. Bimodal Creative Systems

**Research** (CREA framework, CritiqueLLM, iterative design):
- Keeping **generation and critique distinct yet looped** raises output quality
- Structured feedback between modes > collapsed single-mode iteration
- Memory of critique should inform next generation cycle (not replace it)

**Implication for Bridge**: The bridge is a **memory keeper and router**, not a merger of modes.

---

## Part B: Architecture

### B1. System Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                     User / CLI Client                          │
│                   (vs code, terminal)                          │
└────────────────┬─────────────────────────────┬─────────────────┘
                 │                             │
         ┌───────▼────────┐           ┌────────▼────────┐
         │  mcp-creative  │           │  mcp-consult    │
         │  (diverge)     │           │  (converge)     │
         └───────┬────────┘           └────────┬────────┘
                 │                             │
                 │         ┌───────────────────┘
                 │         │
                 ▼         ▼
         ┌─────────────────────────────┐
         │   mcp-bridge (THIS PROJECT) │
         │  ┌───────────────────────┐  │
         │  │ Contemplative Memory  │  │
         │  │  - Logs traces        │  │
         │  │  - Extracts insights  │  │
         │  │  - Detects switches   │  │
         │  └───────────────────────┘  │
         │  ┌───────────────────────┐  │
         │  │  Mode-Switch Cues     │  │
         │  │  - Repetition watch   │  │
         │  │  - Pause detection    │  │
         │  │  - Confidence scoring │  │
         │  └───────────────────────┘  │
         │  ┌───────────────────────┐  │
         │  │  Context Injection    │  │
         │  │  - Insight→Consult    │  │
         │  │  - Critique→Meditate  │  │
         │  └───────────────────────┘  │
         └─────────────────────────────┘
```

### B2. Data Model: "Contemplative Memory"

Each meditation cycle is logged as a **Trace**:

```typescript
interface MeditationTrace {
  id: string;                    // UUID
  timestamp: number;             // Unix ms
  mode: "diverge" | "converge";
  
  // Diverge phase (from mcp-creative)
  meditation?: {
    contextWords: string[];
    numRandomWords: number;
    seed?: string;
    emergentSentence: string;    // The meditation output
  };
  
  insights?: {
    extractedPatterns: string[]; // Key concepts (3-5)
    novelty: number;             // 0-1: how different from prior traces
    semanticClusters: string[][]; // Related concepts grouped
  };
  
  // Converge phase (from mcp-consult)
  critique?: {
    consultModel: string;
    prompt: string;
    systemPrompt: string;
    response: string;
    relevance: number;          // How well critique applies to ideas
  };
  
  // Bridge metadata
  bridge: {
    transitionSuggested?: boolean;
    reasonForSwitch?: string;    // Why did we suggest mode switch?
    confidenceLevel: number;     // 0-1: How sure are we about the switch?
  };
}

interface ContemplativeMemory {
  traces: MeditationTrace[];
  sessionId: string;
  startedAt: number;
  
  // Running aggregates for heuristics
  metrics: {
    lastModeSwitch: number;      // Unix ms
    currentMode: "diverge" | "converge";
    repetitionCount: number;     // Concept repeats in last 3 traces
    pauseDuration: number;       // Seconds since last user input
    avgCycleDuration: number;    // Median trace-to-trace time
  };
}
```

### B3. Core Operations

#### B3.1: Log a Trace
**Input**: Result from mcp-creative or mcp-consult tool calls  
**Output**: Trace stored in memory.json + emitted to listeners

**Logic**:
```
1. Parse the tool response
2. Extract metadata (insights, concepts, response quality)
3. Compute semantic similarity to prior traces
4. Create Trace object
5. Write to ~/.cache/mcp-bridge/memory.json
6. Emit TraceLogged event
```

#### B3.2: Extract & Distill Insights
**Input**: Meditation + Insight from mcp-creative  
**Output**: Structured insight with:
- Top 3-5 concepts
- Novelty score (how new vs. session history?)
- Semantic clusters (related ideas)

**Logic**:
```
1. NLP tokenize: mcp-creative insight response
2. Extract named entities & key phrases (simple regex + keyword extraction)
3. Compute TF-IDF or simpler: frequency boost for uncommon words
4. Novelty: cosine-sim(insight, prior_insights) → novelty = 1 - avg_similarity
5. Clustering: group concepts by word-embedding distance or lexical similarity
6. Return top-N by (frequency * novelty)
```

#### B3.3: Detect Mode-Switch Opportunity
**Inputs**:
- Last N traces (window = 5)
- Current elapsed time in mode
- User input latency (if available)

**Output**: SwitchSuggestion with:
- Suggested mode
- Confidence (0-1)
- Reason (what triggered it)

**Heuristics**:

##### **Heuristic 1: Semantic Saturation (→ Switch from Diverge to Converge)**
```
If last 3 traces in diverge mode:
  - Concept_overlap = jaccard_similarity(concepts_trace[N], concepts_trace[N-1])
  - If concept_overlap > 0.6 for 2+ consecutive pairs:
    → Confidence = min(concept_overlap, 0.8)
    → Reason = "Meditation ideas converging; ready for critique"
    → Suggest CONVERGE
```

**Why this works**: Research shows idea exhaustion; when people repeat themes, it's time to evaluate.

##### **Heuristic 2: Pause / Time Threshold (→ Suggest Opposite Mode)**
```
If time_in_current_mode > avg_session_cycle * 1.5:
  - Confidence = 0.4 + (time_in_mode / avg_session_cycle) * 0.3
  - Reason = "Extended focus; fresh perspective may help"
  - If in CONVERGE: Suggest DIVERGE (incubation)
  - If in DIVERGE: Suggest CONVERGE (crystallize)
```

**Why this works**: EEG shows optimal switches happen ~5-15 min, depending on task. Exceeding this signals mode fatigue.

##### **Heuristic 3: Novelty Drop (→ Force Converge)**
```
If novelty_score(last_trace) < 0.3 AND num_traces_in_mode > 3:
  - Confidence = 0.7
  - Reason = "Ideas becoming repetitive; critique may unlock new angles"
  - Suggest CONVERGE
```

**Why this works**: When ideation plateaus, evaluation + feedback often sparks new directions.

##### **Heuristic 4: Critique Freshness (→ Force Diverge)**
```
If mode == CONVERGE AND critique responses increasingly overlap:
  - OR if last 2 consult_ollama responses > 0.8 cosine similarity:
    - Confidence = 0.6
    - Reason = "Evaluation settling; diverge to explore new dimensions"
    - Suggest DIVERGE
```

**Why this works**: Converging modes can get stuck in local optima. A divergence break can reset.

---

## Part C: Phase 1 Implementation Plan

### C1: Core Components

```
src/
├── index.ts                 # MCP server entry + tool handlers
├── contemplativeMemory.ts   # Memory store & logging
├── insights.ts              # Insight extraction & analysis
├── modeSwitch.ts            # Heuristic-based switch detection
├── contextInjection.ts      # Format insights for prompt injection
├── types.ts                 # TypeScript interfaces
├── utils/
│   ├── nlp.ts              # Simple NLP: tokenize, concepts, similarity
│   └── storage.ts          # JSON file persistence
└── __tests__/
    ├── insights.test.ts
    ├── modeSwitch.test.ts
    └── integration.test.ts
```

### C2: Exposed Tools (MCP Interface)

```typescript
// Tool 1: Start a contemplative session
bridge_start_session()
  → Returns: sessionId, initialMetrics

// Tool 2: Log a meditation result
bridge_log_meditation(
  emergentSentence: string,
  contextWords: string[],
  seed?: string
)
  → Returns: Trace with insights extracted

// Tool 3: Log a consult result
bridge_log_consult(
  model: string,
  prompt: string,
  response: string,
  systemPrompt?: string
)
  → Returns: Trace with relevance scored

// Tool 4: Get next mode suggestion
bridge_suggest_mode_switch()
  → Returns: {
      suggestedMode: "diverge" | "converge",
      confidence: number,
      reason: string,
      heuristicTriggered: string
    }

// Tool 5: Get contemplative insights (for injection)
bridge_get_context_for_consult(
  meditationTraceId: string
)
  → Returns: formatted string for system_prompt injection

// Tool 6: Get critique feedback (for injection into next meditation)
bridge_get_critique_for_meditation(
  consultTraceId: string,
  numTopConcepts?: number
)
  → Returns: structured feedback for context_words

// Tool 7: View session trace log (debugging + UX)
bridge_get_session_trace(
  sessionId?: string,
  limit?: number
)
  → Returns: Recent traces with metadata
```

### C3: Data Flow Example

**Scenario**: User meditates on "creativity" → gets insight → wants critique → bridge suggests what to do next

```
User Input:
  creative_meditate(
    context_words: ["creativity", "flow", "constraint"],
    num_random_words: 12
  )
    ↓
mcp-creative returns emergent sentence & interpretation
    ↓
Bridge intercepts (via logging wrapper):
  bridge_log_meditation({emergentSentence, contextWords}) // or {meditationText} / {mcpResult}
    ├─ Extract concepts: ["constraint", "freedom", "paradox"]
    ├─ Compute novelty: 0.72 (pretty new idea)
    ├─ Create Trace + store
    └─ Return insights for user
    ↓
User sees suggestions:
  "Bridge: Your meditation touched on constraint+freedom paradox.
   Ready to evaluate? [suggest_mode_switch]"
    ↓
User decides to consult:
  consult_ollama(
    model: "llama2",
    prompt: "...user's own prompt...",
    system_prompt: "...INJECTED BY BRIDGE..."
  )
    ↓
Bridge intercepts:
  bridge_log_consult({model, prompt, response, systemPrompt}) // or {consultText} / {mcpResult}
    ├─ Score relevance of critique to original ideas
    ├─ Extract actionable feedback
    └─ Store for potential re-injection into next meditation
    ↓
User finishes consult, gets summary:
  "Session so far: 3 divergent cycles, 1 convergent.
   Ready for another meditative pass?
   [bridge_suggest_mode_switch] → Confidence: 0.65"
```

---

## Part D: Phase 2 Enhancements (Future)

### D1: Live Trace Dashboard (CLI TUI)
- Real-time view of last 5 traces
- Side-by-side "diverge" and "converge" outputs
- Heuristic confidence meters
- Manual mode override

**Tech**: blessed, ink, or simple ansi-formatted tables

### D2: Automatic Prompt Injection
Instead of user manually copy-pasting bridge insights into consult_ollama, the bridge offers a pre-formatted prompt:

```typescript
bridge_create_consult_prompt(
  meditationTraceId: string,
  consultPromptTemplate?: string
)
  → Returns: full system_prompt + formatted prompt
```

### D3: Session Playback & Analysis
```typescript
bridge_analyze_session(sessionId: string)
  → Returns: {
      totalCycles: number,
      modeBreakdown: {diverge: %, converge: %},
      averageSwitchConfidence: number,
      noveltyTrend: number[], // over time
      conceptEvolution: {concept: string, appearances: number}[]
    }
```

### D4: Adaptive Heuristic Tuning
Let the bridge learn session-specific parameters:
```
After 5 sessions, it knows:
  - "This user typically needs 8-min divergent cycles"
  - "When they go >30s without typing, they're ready to switch"
  - "Their 'aha moment' usually follows semantic saturation at 0.65 overlap"
```

---

## Part E: Implementation Strategy

### E1: Tech Stack
- **Runtime**: Node.js 18+ / TypeScript
- **Dependencies**:
  - `axios`: HTTP calls to mcp-creative & mcp-consult
  - `uuid`: Trace IDs
  - `simple-statistics` or similar: rolling averages, basic NLP
  - `zod` or `io-ts`: Schema validation for traces
- **Storage**: JSON file (`~/.cache/mcp-bridge/memory.json`), human-readable logging

### E2: Testing Strategy
- **Unit tests**: Each heuristic (semantic saturation, pause detection, novelty)
- **Integration tests**: Full meditate → log → suggest → consult cycle
- **Fixtures**: Pre-recorded traces for deterministic testing

### E3: MVP Success Criteria
1. ✅ Can log meditation + consult traces without breaking mcp-creative/mcp-consult
2. ✅ Extracts insights with >80% concept accuracy (manual validation on 10 traces)
3. ✅ Mode-switch heuristics fire with confidence >= 0.5 when semantic saturation hits
4. ✅ Session memory persists & can be replayed
5. ✅ Zero overhead: bridge latency < 200ms per operation

---

## Part F: Rationale for Design Choices

### Why MCP server (not library)?
- **Modularity**: Each system runs independently; bridge is optional
- **Process isolation**: Errors in bridge don't crash creative/consult
- **Testability**: Can mock HTTP calls to both MCPs
- **Composability**: Future integrations (e.g., other MCPs) plug in easily

### Why JSON file storage (not database)?
- **Simplicity**: No new dependencies
- **Debuggability**: Traces are human-readable
- **Portability**: Easy to analyze with standard tools
- **Scalability**: For session-based work, 10k-100k traces is fine

### Why simple NLP (not transformers)?
- **Speed**: Extract insights in <50ms
- **Portability**: No model loading; works offline
- **Transparency**: Heuristics are auditable
- **Future-proof**: Can plug in richer NLP if needed (e.g., local embedding model)

### Why confidence scores?
- Enables **graceful degradation**: Low confidence = gentle suggestion vs. hard redirect
- Supports **learning**: Over time, filter for high-confidence suggestions and retrain heuristics
- Respects **user autonomy**: Gives them veto power without friction

---

## Part G: Success Metrics & Validation

### G1: Does it solve the cognitive-transition problem?
**Metric**: Users report switching modes when heuristic suggests it (1-5 Likert)  
**Target**: >= 4.0 / 5.0

### G2: Does it preserve flow state (calm UX)?
**Metric**: Number of interruptions per session  
**Target**: <= 2 interruptions for 30-min session

### G3: Does it inject useful context?
**Metric**: User rates injected insights as "relevant to my work" (1-5 Likert)  
**Target**: >= 4.0 / 5.0

### G4: Does it reduce cognitive load?
**Metric**: Time to decide "should I switch modes?" before vs. after  
**Target**: -50% (from 2 min deliberation to 1 min)

---

## Part H: Open Questions & Research Directions

1. **Optimal cycle duration**: Is 8 min typical for this user? Should we auto-adapt?
2. **Semantic similarity metric**: Should we use TF-IDF, embeddings, or something else?
3. **Multi-user coordination**: Could two users benefit from shared meditation memory?
4. **Feedback loop closure**: Should users be able to mark "that mode-switch suggestion was great" to retrain heuristics?
5. **Voice/rhythm detection**: Can we infer pause duration from transcript metadata?

---

## Appendix: Cognitive Science References

- **Guilford (1967)**: Structure of Intellect; Divergent vs. Convergent
- **Kounios & Beeman (2009, 2014)**: Brain bases of creative insight (EEG)
- **Weiser (1993)**: Calm Technology; Ubiquitous Computing
- **Klahr & Simon (1999)**: Dual-space search (homing in on problem space)
- **Csikszentmihalyi (1990)**: Flow state; optimal challenge levels
- **CritiqueLLM & CREA papers**: Bimodal creative-system architectures

---

**Next Step**: Implement Part B.3 (Core Operations) as Phase 1 MVP.
