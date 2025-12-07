# MCP-Bridge Vision: The Contemplative Bridge

## Problem Statement

You have two powerful MCPs:
- **mcp-creative**: Generates divergent ideas through meditative cycles
- **mcp-consult**: Provides analytical critique via local Ollama models

**But they don't talk to each other.** And users don't know when to switch between them.

**Result**: Creativity gets stuck in loops. Analysis doesn't inform ideation. Users manually copy-paste context, breaking their flow state.

---

## The Vision

Build a **cognitive bridge** that:

1. **Logs the full meditation→critique→meditation cycle** automatically
2. **Detects the optimal moment to switch modes** using neuroscience-backed heuristics
3. **Injects insights between modes** without user friction
4. **Preserves flow state** through calm, contextual suggestions

**Outcome**: The meditation+consult loop feels like a natural, integrated creative system—not two separate tools.

---

## How It Works (User Perspective)

### Scenario: Exploring "Creative Constraint"

```
1. User starts meditation:
   → "I want to explore how constraints boost creativity"
   → Runs creative_meditate(context: ["constraint", "creativity", "flow"])
   
2. mcp-creative returns meditation & insight:
   → "Constraint births creativity through systematic opposition"
   → Bridge automatically logs this, extracts concepts
   
3. User reads the insight, thinks: "Should I evaluate this or meditate more?"
   → Bridge sees 3 recent meditations are converging on the same concepts
   → Gently suggests: "Your meditations are converging (72% overlap). 
                        Ready to critique? [Maybe try consult_ollama]"
   
4. User runs consult to evaluate:
   → Uses Bridge's pre-formatted prompt (seeded with meditation insights)
   → Gets structured critique: "Consider: What happens when constraints are *removed*?"
   
5. User sees the critique points to something unexplored
   → Bridge suggests: "Critique opened new angle: 'constraint removal'. 
                       Ready for fresh meditation? [Use bridge_get_critique_for_meditation]"
   
6. Next meditation is seeded with critique feedback:
   → "Explore the tension between constraint and freedom"
   → Gets novel insight not available before
   
7. User builds on this insight with more consult cycles
   → Each cycle logged, traced, analyzed
   → User can replay the entire creative journey later

Session result: **Rigorous exploration** of the constraint paradox, 
                with natural rhythm between ideation and critique.
```

---

## What Makes This Work

### 1. Transparent Logging
Every meditation + consult is logged with:
- Extracted concepts
- Novelty score (how new?)
- Semantic overlap (how repetitive?)
- Timing & pauses
- Relevance scoring

→ **Result**: Full trace of your creative thinking process.

### 2. Neuroscience-Backed Heuristics

The bridge watches for 4 signals (from EEG/cognitive research):

| Signal | Means | Action |
|--------|-------|--------|
| **Semantic Saturation** | Ideas repeating (>60% overlap) | "Ready to evaluate" |
| **Pause** | Silent for 5+ seconds | "Incubating—evaluate now or diverge fresh?" |
| **Novelty Drop** | Recent ideas all 30% novel | "Stuck in local optimum—critique may help" |
| **Critique Freshness** | Evaluations circling | "Evaluation plateau—new divergent pass?" |

None of these are magic. They're grounded in **EEG patterns, cognitive load theory, and creativity research**.

### 3. Calm, Non-Intrusive Suggestions

Suggestions only surface if:
- ✅ Confidence >= 50% (not uncertain guesses)
- ✅ Time since last suggestion >= 5 min (not nagging)
- ✅ Delivered as contextual info, not modal popups

→ **Result**: You stay in flow; suggestions feel like gentle nudges, not interruptions.

### 4. Bidirectional Context Injection

#### Meditation → Consult
Bridge extracts concepts from meditation:
```
"Your meditation revealed: constraint, paradox, systematic opposition.
 Critique these ideas. What contradictions emerge?"
```

#### Consult → Meditation
Bridge extracts actionable feedback from critique:
```
"Consider exploring these angles:
 - Constraint removal (what happens then?)
 - Freedom without structure (chaos or liberation?)
 - The tension between extremes"
```

→ **Result**: Each mode **informs** the other without losing their distinct identities.

---

## Why This Matters (Research Foundation)

### Cognitive Transitions
- **Guilford/Osborn**: Separated ideation + evaluation = better ideas
- **Kounios/Beeman (EEG)**: Insight preceded by broad alpha-band (relaxation), evaluation by localized gamma (focus)
- **The gap**: Humans don't naturally sense when to switch → ideas get stuck

**Bridge solves this**: Detects switch moments automatically.

### Calm Technology
- **Weiser**: Technology should be "at the periphery, not center"
- **Notification research**: >2-3 interruptions per session = flow death
- **Progressive disclosure**: Surface only high-confidence, actionable suggestions

**Bridge solves this**: Gentle nudges, transparent reasoning, easy to ignore.

### Bimodal Creative Systems
- **CritiqueLLM, CREA**: Keeping generation & critique distinct yet looped = higher quality
- **Feedback loops**: Critique → re-generation → better output
- **Identity preservation**: Don't collapse modes; route between them

**Bridge solves this**: Acts as router/memory keeper, not merger.

---

## Architecture at a Glance

```
User Interface
    ↓
┌─────────────────┐
│ mcp-creative    │  ← Divergent ideation (meditate, insight, ponder)
│ mcp-consult     │  ← Convergent evaluation (analyze, critique)
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│      MCP-BRIDGE (NEW)           │
│                                 │
│ 1. Contemplative Memory         │
│    - Logs all traces            │
│    - Extracts concepts          │
│    - Computes novelty & overlap │
│                                 │
│ 2. Mode-Switch Heuristics       │
│    - Semantic saturation        │
│    - Pause detection            │
│    - Novelty drop               │
│    - Critique freshness         │
│                                 │
│ 3. Context Injection            │
│    - Format insights for consult│
│    - Format feedback for meditate│
│                                 │
│ 4. Session Trace & Analysis     │
│    - Replay creative journey    │
│    - Stats & patterns           │
│    - Future: adaptive heuristics│
└─────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core (Weeks 1-2)
- [x] Design & research grounding
- [ ] Type definitions + storage layer
- [ ] Insight extraction (concepts, novelty)
- [ ] Mode-switch heuristics (4 signals)
- [ ] Basic logging + trace retrieval

**Success**: Bridge logs meditation→insight→consult cycles, detects saturation.

### Phase 2: Context Injection (Week 3)
- [ ] Format insights for consult prompts
- [ ] Extract critique feedback
- [ ] Re-inject feedback into next meditations
- [ ] Relevance scoring

**Success**: Consult & meditation inform each other; outputs improve.

### Phase 3: Polish (Week 4)
- [ ] Error handling + graceful degradation
- [ ] Structured logging + debugging
- [ ] Full integration test
- [ ] Documentation + examples

**Success**: Bridge is production-ready, transparent, reliable.

### Phase 4 (Stretch): Dashboard
- [ ] CLI TUI for live trace view
- [ ] Heuristic confidence visualization
- [ ] Session replay + analysis
- [ ] Mode-switch history

**Success**: Users can *see* their meditation→critique rhythm.

---

## Success Metrics

### Does It Solve the Mode-Switch Problem?
- Users report switching modes when heuristic suggests (4.0+/5.0 Likert)
- Mode-switch latency down 50% (faster decisions)

### Does It Preserve Flow?
- ≤2 suggestions per 30-min session (not interrupting)
- Users report flow state 4.0+/5.0

### Does It Improve Ideas?
- Injected context rated 4.0+/5.0 relevance
- Ideas post-critique are 20%+ more novel

### Does It Scale?
- Each bridge operation < 200ms latency
- Sessions with 1k traces use < 10MB memory

---

## Why Build This Now

1. **Both MCPs exist** and work well independently—bridge is the connective tissue
2. **Cognitive science is ready**: 20+ years of EEG research on insight/analysis
3. **Users are struggling**: Manual mode-switching breaks flow
4. **Calm tech is proven**: Progressive disclosure, contextual nudges work
5. **The gap is clear**: mcp-creative + mcp-consult should feel like one system

---

## The Name

**"Contemplative Bridge"** because:
- **Contemplation** = the reflective, meditative thinking (mcp-creative)
- **Bridge** = the connection, the routing, the memory keeper
- The bridge doesn't collapse the two modes; it connects them gracefully
- It lets you contemplate longer, switch at the right moment, and return with fresh perspective

---

## Next Steps

1. ✅ Design complete (you're reading it)
2. → Implement Phase 1: Core logging + heuristics
3. → Implement Phase 2: Context injection
4. → Implement Phase 3: Polish & docs
5. → Optional Phase 4: Dashboard visualization

**Start**: Milestone 0 (Foundation) with type definitions + storage layer.

---

## Questions & Feedback

**For the designer/researcher**:
- Are the heuristic thresholds sensible? (0.6 overlap, 5s pause, 0.35 novelty)
- Should we track additional signals? (user mood, domain expertise, task type?)
- Adaptive heuristics—when should retraining trigger?

**For the implementer**:
- Should bridge run as separate MCP server or utility library?
- How to test heuristics without live meditation/consult calls?
- Storage: JSON file, SQLite, or in-memory + export?

**For the user**:
- Does the suggestion flow make sense?
- Would you use a CLI dashboard to replay traces?
- What would convince you the suggestions are "right"?

---

**Status**: Design complete. Ready for Phase 1 implementation.
