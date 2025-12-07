# Design Documentation Index

This folder contains the complete design for **MCP-Bridge**, a cognitive-transition layer connecting mcp-creative and mcp-consult.

## Quick Navigation

### 1. **Start Here: VISION.md**
   - **What**: High-level vision and user scenarios
   - **Why**: Understand the problem being solved
   - **Read time**: 10 min
   - **For**: Everyone

### 2. **DESIGN.md** (Detailed Architecture)
   - **What**: System architecture, data model, operations, heuristics
   - **Why**: Understand exactly how the bridge works
   - **Sections**:
     - Part A: Cognitive science foundation (why this matters)
     - Part B: Architecture + data model
     - Part C: Core operations (7 bridge tools)
     - Part D-H: Roadmap, strategy, validation
   - **Read time**: 30 min (parts A-C), 60 min (full)
   - **For**: Designers, architects, implementers

### 3. **RESEARCH_TO_CODE.md** (Cognitive → Implementation)
   - **What**: Explicit mapping from research papers to code
   - **Why**: Justify design choices and heuristic thresholds
   - **Sections**:
     - Divergent vs. Convergent thinking
     - EEG-based switch points
     - Semantic saturation
     - Calm technology principles
     - Bimodal creative systems
   - **Read time**: 20 min
   - **For**: Neuroscience buffs, validators, people who ask "why?"

### 4. **IMPLEMENTATION_ROADMAP.md** (Phase-by-Phase Plan)
   - **What**: 5-milestone implementation plan with acceptance criteria
   - **Why**: Know exactly what to build and in what order
   - **Milestones**:
     - M0: Foundation (types, storage)
     - M1: Insight extraction
     - M2: Mode-switch heuristics
     - M3: Context injection
     - M4: Integration & polish
     - M5 (stretch): Dashboard
   - **Each milestone includes**: Tasks, test fixtures, acceptance criteria
   - **Read time**: 20 min
   - **For**: Project managers, implementers, QA

## Document Relationships

```
VISION.md
  └─→ "What problem are we solving?" + user scenarios
      └─→ DESIGN.md (Part A)
          └─→ "Why does this work scientifically?"
              └─→ RESEARCH_TO_CODE.md
                  └─→ "How do we justify each heuristic?"

DESIGN.md (Part B-C)
  └─→ "What does the system look like?"
      └─→ IMPLEMENTATION_ROADMAP.md
          └─→ "How do we build it?"
              └─→ Code (Phase 1 onwards)
```

## Implementation Flowchart

```
Week 1: M0 Foundation
  ├─ Types (MeditationTrace, ContemplativeMemory, etc.)
  └─ Storage (JSON persistence, session isolation)
  
Week 2: M1 Insight Extraction
  ├─ NLP utilities (tokenize, extract keywords, similarity)
  └─ bridge_log_meditation() + bridge_log_consult()
  
Week 3: M2 Mode-Switch Heuristics
  ├─ Semantic saturation detector
  ├─ Pause detection
  ├─ Novelty drop detector
  ├─ Critique freshness detector
  └─ bridge_suggest_mode_switch()
  
Week 4: M3 Context Injection
  ├─ Format insights for consult prompts
  ├─ Extract & format critique for meditations
  └─ bridge_get_context_*() + bridge_get_critique_*()
  
Week 5: M4 Polish
  ├─ Error handling
  ├─ Logging
  ├─ Full integration test
  └─ README + API docs
  
(Optional) Week 6: M5 Dashboard
  └─ CLI TUI for trace visualization
```

## Key Concepts

### Contemplative Memory
A timestamped log of the meditation→critique→meditation cycle. Each entry (Trace) contains:
- The meditation output + extracted concepts
- The critique response + feedback
- Metadata: novelty, overlap, timing, bridge suggestions

### Mode-Switch Heuristics
Four neuroscience-backed signals that detect when to switch modes:
1. **Semantic Saturation**: Same concepts repeating (>60% overlap)
2. **Pause Detection**: Long pause (5+ sec) suggests incubation
3. **Novelty Drop**: Recent ideas all low-novelty (stalled?)
4. **Critique Freshness**: Evaluations circling the same points

### Context Injection
Two-way flow of insights:
- **Meditation → Consult**: "Here's what your meditation revealed; critique it"
- **Consult → Meditation**: "Here's what critique opened up; explore these angles"

### Calm Technology Principles
- Only surface suggestions with confidence >= 50%
- Max 1-2 suggestions per session (no more than every 5 min)
- Deliver as contextual info, not modal interrupts
- Let users ignore without friction

## Reading Sequences

### For Product Managers / Stakeholders
1. VISION.md (10 min)
2. DESIGN.md: Part A (cognitive foundation) + Part B (architecture) (20 min)
3. IMPLEMENTATION_ROADMAP.md: Success criteria + milestones (10 min)

### For Implementers
1. VISION.md (10 min)
2. DESIGN.md: Part B (architecture) + Part C (operations) (30 min)
3. IMPLEMENTATION_ROADMAP.md: Full document (20 min)
4. RESEARCH_TO_CODE.md: For justifying heuristic thresholds (20 min)
5. Code it!

### For Researchers / Validators
1. DESIGN.md: Part A (cognitive foundation) (15 min)
2. RESEARCH_TO_CODE.md: Full document (20 min)
3. DESIGN.md: Part G (success metrics) (5 min)
4. Propose experiments!

### For Users (Later)
1. VISION.md: Scenario section (5 min)
2. README.md (once built): How to use bridge
3. Bridge CLI dashboard (visualize your traces)

## Critical Design Decisions

| Decision | Reasoning | Alternative Considered |
|----------|-----------|------------------------|
| Separate MCP (not library) | Modularity, process isolation | Library: simpler but tighter coupling |
| JSON file storage | Simplicity, debuggability | Database: overkill for session-based work |
| Simple NLP (not transformers) | Speed, offline, transparency | Embeddings: accurate but slower |
| Confidence thresholds | Graceful degradation, respects user autonomy | Binary on/off: inflexible |
| Calm notification model | Preserve flow state, proven UX | Modal alerts: interrupts focus |

## Success Criteria Summary

✅ **Phase 1 MVP done when:**
- Bridge logs meditation↔consult cycles without breaking MCPs
- Extracts concepts with 80%+ accuracy
- Detects mode switches with 0.6+ confidence when appropriate
- Zero latency overhead (<200ms per tool)
- Session memory persists & replays

📊 **User validation targets:**
- Mode-switch suggestions rated 4.0+/5.0 relevance
- Flow state preserved (≤2 suggestions/session)
- Ideas post-critique 20%+ more novel
- Latency unnoticeable to user

## Getting Started

See **IMPLEMENTATION_ROADMAP.md** for Milestone 0 tasks.

TL;DR:
1. Create `src/types.ts` with all TypeScript interfaces
2. Create `src/utils/storage.ts` with JSON read/write
3. Create `src/index.ts` with MCP server + `listTools()` + `callToolHandler()`
4. Test: `npm run build && npm start`

---

**Last Updated**: 2025-12-05  
**Status**: Design complete → Ready for Phase 1 implementation
