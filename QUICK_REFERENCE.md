# MCP-Bridge Quick Reference Card

## Problem in One Sentence
User switches between creative meditation and analytical critique, but doesn't know *when* to switch → ideas get stuck, flow breaks.

## Solution in One Sentence
Bridge logs every cycle, detects switch moments via EEG-backed heuristics, injects context seamlessly.

---

## The 4 Mode-Switch Signals

```
SEMANTIC SATURATION         PAUSE DETECTION
Concept_A         Concept_B   5+ seconds
Concept_A Concept_B Concept_C  silent
Concept_A Concept_B Concept_D  ↓ Incubation
   ↓                           ↓
60%+ overlap                Ready to evaluate
→ Switch to CONVERGE       or diverge fresh

NOVELTY DROP                CRITIQUE FRESHNESS
Last 3 ideas:               Last 2 critiques:
0.30, 0.28, 0.25           "Consider X. Did you..."
   ↓                        "Yes, what about Y?"
Stuck exploring             "Well, isn't Y just..."
→ Critique helps               ↓
                           Circling same ideas
                           → Diverge fresh
```

---

## Data Model Cheat Sheet

```typescript
MeditationTrace = {
  id: uuid,
  mode: "diverge" | "converge",
  meditation?: { sentence, concepts },
  insights?: { patterns, novelty, clusters },
  critique?: { response, relevance },
  bridge: { confidence, reason }
}

ContemplativeMemory = {
  traces: [MeditationTrace[], ...],
  metrics: {
    currentMode,
    repetitionCount,      // Concept repeats
    pauseDuration,        // Seconds
    noveltyScores,        // Recent [0.7, 0.4, 0.3]
    avgCycleDuration      // Minutes
  }
}

SwitchSuggestion = {
  suggestedMode,         // "diverge" or "converge"
  confidence: 0.0-1.0,   // >= 0.5 to surface
  reason,                // Human-readable
  heuristicTriggered     // Which one fired?
}
```

---

## 7 Bridge Tools

| Tool | Input | Output | Why |
|------|-------|--------|-----|
| `bridge_start_session()` | none | `{sessionId, time}` | Begin logging |
| `bridge_log_meditation(text, words)` | meditation output | `Trace + insights` | Log + extract concepts |
| `bridge_log_consult(model, prompt, response)` | critique output | `Trace + feedback` | Log + relevance score |
| `bridge_suggest_mode_switch()` | none (uses memory) | `SwitchSuggestion` | Get advice + confidence |
| `bridge_get_context_for_consult(id)` | meditation trace | `formatted_prompt` | Inject insights into consult |
| `bridge_get_critique_for_meditation(id)` | consult trace | `context_words` | Inject feedback into meditation |
| `bridge_get_session_trace(sessionId?, limit?)` | optional ID | `[Traces...]` | Replay session |

---

## Heuristic Thresholds (Calibrated)

| Heuristic | Trigger | Confidence | Why |
|-----------|---------|------------|-----|
| **Semantic Saturation** | Jaccard > 0.60 for 2+ pairs | min(overlap, 0.8) | Research: saturation = local optimum |
| **Pause** | pauseDuration > 5000ms | min(pause/15000, 0.8) | EEG: 4-8s pause precedes insight |
| **Novelty Drop** | avg(last_3_novelties) < 0.35 | 0.70 | Research: plateau = stuck |
| **Critique Freshness** | cosine(response[N], response[N-1]) > 0.80 | 0.60 | Signal: evaluation stalled |

---

## Research References (Quick)

- **Diverge/Converge**: Guilford (1967), Osborn (1953)
- **EEG Insight**: Kounios & Beeman (2009, 2014)
- **Calm Tech**: Weiser & Brown (1996)
- **Bimodal Systems**: CritiqueLLM (Wei et al. 2023), CREA framework
- **Flow**: Csikszentmihalyi (1990)
- **Saturation**: Klahr & Simon (1999)

---

## UX Principles (Hard Rules)

✅ Surface suggestions only if confidence >= 0.5  
✅ Max 1 suggestion per 5 minutes (preserve flow)  
✅ Contextual info, not modal popups  
✅ Show reasoning ("Why did bridge suggest this?")  
✅ Easy to ignore without friction  
✅ Store everything in trace for later analysis  

---

## Implementation Order (5 Weeks)

**Week 1: Types + Storage**
- `src/types.ts` (all interfaces)
- `src/utils/storage.ts` (JSON persistence)
- `src/index.ts` (MCP scaffolding)

**Week 2: Extraction**
- `src/utils/nlp.ts` (tokenize, keywords, similarity)
- `src/insights.ts` (novelty, clusters)
- `bridge_log_meditation/consult` handlers

**Week 3: Heuristics**
- `src/modeSwitch.ts` (4 detectors)
- `bridge_suggest_mode_switch` handler
- Tests for each heuristic

**Week 4: Context**
- `src/contextInjection.ts` (formatters)
- `bridge_get_context_*` handlers
- Relevance scoring for critique

**Week 5: Polish**
- Error handling + logging
- Full integration test
- Docs + README
- Performance profiling

---

## Success Checklist (MVP)

- [ ] Bridge logs meditation↔consult pairs
- [ ] Concepts extracted with 80%+ accuracy
- [ ] Semantic saturation detected when overlap > 0.60
- [ ] Pause detected at 5+ seconds
- [ ] Novelty drop detected when score < 0.35
- [ ] All tools complete in < 200ms
- [ ] Session memory persists to disk
- [ ] Context injection produces coherent prompts
- [ ] Zero breaking changes to mcp-creative/mcp-consult
- [ ] Full integration test passes

---

## File Structure

```
mcp-bridge/
├── src/
│   ├── index.ts                    # MCP server + handlers
│   ├── types.ts                    # All interfaces
│   ├── contemplativeMemory.ts      # Memory store
│   ├── insights.ts                 # Extract concepts
│   ├── modeSwitch.ts               # 4 heuristics
│   ├── contextInjection.ts         # Format prompts
│   ├── utils/
│   │   ├── nlp.ts                 # Tokenize, similarity
│   │   └── storage.ts             # JSON persistence
│   └── __tests__/
│       ├── insights.test.ts
│       ├── modeSwitch.test.ts
│       └── integration.test.ts
├── package.json
├── tsconfig.json
├── VISION.md                       # User perspective
├── DESIGN.md                       # Full architecture
├── RESEARCH_TO_CODE.md             # Why each decision
├── IMPLEMENTATION_ROADMAP.md       # Phase-by-phase
├── QUICK_REFERENCE.md              # This file
└── README.md                       # How to use (TBD)
```

---

## Testing Fixtures (Example)

```typescript
// Test: Semantic saturation detection
const traces = [
  { insights: { patterns: ["A", "B", "C"], novelty: 0.8 } },
  { insights: { patterns: ["A", "B", "D"], novelty: 0.65 } }, // overlap 67%
  { insights: { patterns: ["A", "B", "E"], novelty: 0.45 } }, // overlap 67%
];
// Expected: heuristic fires with confidence > 0.6

// Test: Pause detection
const memory = {
  metrics: { pauseDuration: 5500 }
};
// Expected: triggers with confidence 0.36-0.8

// Test: Novelty drop
const recentNovelties = [0.72, 0.35, 0.25];
// Expected: triggers with confidence 0.7
```

---

## Common Questions

**Q: Why not merge mcp-creative and mcp-consult into one?**  
A: Separation is the feature. We want to enforce alternation, not collapse modes.

**Q: What if heuristic thresholds are wrong?**  
A: M5 includes "adaptive tuning"—learns per-user thresholds after 5 sessions.

**Q: Will bridge slow down meditation/consult?**  
A: No. Bridge runs async/parallel. Max <200ms overhead.

**Q: Can users disable suggestions?**  
A: Yes. Low-confidence suggestions never surface. Users can ignore contextual hints.

**Q: What's stored in contemplative memory?**  
A: Only metadata (concepts, scores, timestamps). No sensitive prompts/responses.

---

## Performance Budget

| Operation | Target | Actual |
|-----------|--------|--------|
| `bridge_log_*()` | <100ms | TBD |
| `bridge_suggest_mode_switch()` | <50ms | TBD |
| `bridge_get_context_*()` | <100ms | TBD |
| Session with 100 traces | <1s retrieval | TBD |
| Memory (1k traces) | <10MB | TBD |

---

**Read**: VISION.md → DESIGN.md → Code  
**Test**: Each heuristic independently, then full cycle  
**Ship**: M1-M4 in 4-5 weeks  
**Iterate**: M5 (dashboard) optional, heuristic tuning ongoing
