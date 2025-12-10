# API Documentation Index

Central index for all API documentation across the MCP ecosystem.

## Quick Reference

| Repository | API Doc | Purpose | Size |
|---|---|---|---|
| **mcp-creative** | [`API.md`](mcp-creative/API.md) | Meditation cycles, insight generation | 5.8K |
| **mcp-consult** | [`docs/API_REFERENCE.md`](mcp-consult/docs/API_REFERENCE.md) | Ollama model consultation | 14K |
| **mcp-bridge** | [`API.md`](mcp-bridge/API.md) | Session logging, mode switching, context injection | 22K |
| **mcp-dream-weaver** | [`API.md`](mcp-dream-weaver/API.md) | Narrative weaving from text fragments | 16K |

## Integration Guide

**Start here**: [`API_INTEGRATION_GUIDE.md`](API_INTEGRATION_GUIDE.md)

Comprehensive guide showing:
- Complete meditation-critique-meditation workflow
- Data flow between MCPs
- Full code examples
- Integration testing patterns

## Repository Overview

### mcp-creative

**Tools**:
- `creative_meditate`: Generate meditation combining random words + context
- `creative_insight`: Extract meaningful patterns from meditation
- `creative_ponder`: Deep analysis or Ollama consultation on insights

**Best for**: Generating divergent ideas, exploring topics creatively

**API**: [`mcp-creative/API.md`](mcp-creative/API.md)

### mcp-consult

**Tools**:
- `consult_ollama`: Query a specific Ollama model
- `list_ollama_models`: List available models
- `compare_ollama_models`: Compare responses across models
- `remember_consult`: Store consultation results
- `sequential_consultation_chain`: Chain multiple consultations

**Best for**: Critical analysis, logical reasoning, evaluating ideas

**API**: [`mcp-consult/docs/API_REFERENCE.md`](mcp-consult/docs/API_REFERENCE.md)

### mcp-bridge

**Tools**:
- `bridge_start_session`: Initialize contemplative session
- `bridge_log_meditation`: Log and extract insights
- `bridge_log_consult`: Log and extract feedback
- `bridge_suggest_mode_switch`: Detect optimal switch moments (4 heuristics)
- `bridge_get_context_for_consult`: Format insights for critique
- `bridge_get_critique_for_meditation`: Format feedback for meditation
- `bridge_get_session_trace`: Retrieve session history
- `bridge_weave_session`: Generate narrative from session

**Best for**: Managing the meditation-critique cycle, detecting switch moments, preserving flow

**API**: [`mcp-bridge/API.md`](mcp-bridge/API.md)  
**Design**: [`mcp-bridge/VISION.md`](mcp-bridge/VISION.md)  
**Quick Ref**: [`mcp-bridge/QUICK_REFERENCE.md`](mcp-bridge/QUICK_REFERENCE.md)

### mcp-dream-weaver

**Tools**:
- `weave_dream`: Transform text fragments into narrative via semantic adjacency

**Best for**: Reflecting on notes/sessions, discovering hidden connections, generating poetic narratives

**API**: [`mcp-dream-weaver/API.md`](mcp-dream-weaver/API.md)

## Complete Workflow

```
1. bridge_start_session()
   └─ Initialize session

2. Loop: Meditation-Critique-Meditation
   ├─ creative_meditate()
   │  └─ Generate divergent ideas
   ├─ bridge_log_meditation()
   │  └─ Extract concepts, novelty, clusters
   ├─ bridge_suggest_mode_switch()
   │  └─ Check if time to critique (4 heuristics)
   ├─ IF SWITCHING:
   │  ├─ bridge_get_context_for_consult()
   │  │  └─ Format insights for prompt
   │  ├─ consult_ollama()
   │  │  └─ Get analytical feedback
   │  ├─ bridge_log_consult()
   │  │  └─ Extract feedback, score relevance
   │  └─ bridge_get_critique_for_meditation()
   │     └─ Format feedback for next meditation
   └─ REPEAT

3. bridge_get_session_trace()
   └─ Review full journey

4. weave_dream()
   └─ Generate narrative reflection
```

## API Changes and Versioning

### Tracking Updates

Each MCP maintains its own API documentation. When integrating:

1. **Check the API docs** for current parameter names and return types
2. **Version note**: Each MCP versioning is independent
3. **Compatibility**: See `API_INTEGRATION_GUIDE.md` for cross-MCP compatibility

### Breaking Changes

If you make changes to any tool:

1. **Update the tool in your MCP's source**
2. **Update the API.md** in that repository
3. **Run integration tests** (see `API_INTEGRATION_GUIDE.md#Testing`)
4. **Update any downstream documentation** (this file, integration guide)

## Getting Started

### For New Users

1. Read the [**Integration Guide**](API_INTEGRATION_GUIDE.md) first
2. Review each MCP's individual API.md
3. Try the [example workflow](#complete-workflow) in code
4. Run integration tests

### For Integration Development

1. Implement using the API docs as specifications
2. Test each MCP individually against its API.md
3. Test the full cycle using patterns in Integration Guide
4. Update API.md if you change tool signatures

### For Troubleshooting

See **API_INTEGRATION_GUIDE.md#Common Issues & Solutions**

Common issues:
- Session not found (missing `bridge_start_session`)
- No previous meditation (order of operations)
- Ollama unavailable (network/service issue)
- No granules found in dream weaver (glob pattern mismatch)

## Design Philosophy

### Separation of Concerns

- **mcp-creative**: Pure divergent thinking (no integration needed)
- **mcp-consult**: Pure analytical thinking (no integration needed)
- **mcp-bridge**: The connector layer (integrates creative + consult)
- **mcp-dream-weaver**: The reflection tool (works with any structured text)

This separation means:
- ✅ Each MCP works independently
- ✅ Clear APIs with minimal dependencies
- ✅ Easy to debug and test
- ✅ Simple to version and update

### Core Principle

> **The bridge doesn't merge the MCPs; it connects them gracefully.**

Each MCP has a distinct identity. The bridge is the traffic controller, not a merger.

## Key Concepts

### Heuristics (mcp-bridge)

The bridge detects optimal mode-switch moments via 4 signals grounded in cognitive science:

1. **Semantic Saturation**: Concepts repeating (Jaccard > 0.6)
2. **Pause Detection**: User pauses 5+ seconds
3. **Novelty Drop**: Recent ideas all score <0.35 novelty
4. **Critique Freshness**: Recent critiques >0.8 similar

[Details](mcp-bridge/QUICK_REFERENCE.md)

### Context Injection (mcp-bridge)

Automatically formats insights/feedback for prompt injection:
- Meditation → Consult: "Your meditation revealed: [concepts]. Critique these."
- Consult → Meditation: New context words + provocative questions

### Insight Extraction (mcp-bridge)

Simple NLP (no transformers) extracting:
- 3-5 key concepts from meditation
- Novelty score (0-1): how different from prior meditations?
- Semantic clusters: related concepts grouped
- Performance: <25ms

### Dream Weaving (mcp-dream-weaver)

Algorithm:
1. Scan directory, granularize files into paragraphs
2. Extract keywords from each granule
3. Compute Jaccard similarity (adjacency) between all pairs
4. Random walk through granules guided by adjacency
5. Generate narrative connecting the path
6. Save to dream journal

---

## File Structure

```
/home/casey/Documents/MCP-GITS/
├── API_INDEX.md                    ← You are here
├── API_INTEGRATION_GUIDE.md        ← Complete workflow examples
│
├── mcp-creative/
│   ├── API.md                      ← Tool definitions
│   ├── README.md
│   ├── src/
│   └── ...
│
├── mcp-consult/
│   ├── docs/
│   │   ├── API_REFERENCE.md        ← Tool definitions
│   │   └── ...
│   ├── README.md
│   ├── src/
│   └── ...
│
├── mcp-bridge/
│   ├── API.md                      ← Tool definitions
│   ├── VISION.md                   ← Design philosophy
│   ├── QUICK_REFERENCE.md          ← Heuristic cheat sheet
│   ├── src/
│   └── ...
│
└── mcp-dream-weaver/
    ├── API.md                      ← Tool definitions
    ├── README.md
    ├── src/
    └── ...
```

## Quick Links

| Goal | Resource |
|------|----------|
| Understand the ecosystem | [Integration Guide](API_INTEGRATION_GUIDE.md) |
| Use mcp-creative | [API.md](mcp-creative/API.md) |
| Use mcp-consult | [API_REFERENCE.md](mcp-consult/docs/API_REFERENCE.md) |
| Use mcp-bridge | [API.md](mcp-bridge/API.md) |
| Understand mode-switching | [QUICK_REFERENCE.md](mcp-bridge/QUICK_REFERENCE.md) |
| Understand design | [VISION.md](mcp-bridge/VISION.md) |
| Use mcp-dream-weaver | [API.md](mcp-dream-weaver/API.md) |
| See full workflow | [API_INTEGRATION_GUIDE.md#Example: Full Session in Code](API_INTEGRATION_GUIDE.md#example-full-session-in-code) |
| Test integration | [API_INTEGRATION_GUIDE.md#Testing](API_INTEGRATION_GUIDE.md#testing-the-integration) |
| Troubleshoot issues | [API_INTEGRATION_GUIDE.md#Common Issues](API_INTEGRATION_GUIDE.md#common-issues--solutions) |

---

**Last Updated**: 2025-12-08  
**Status**: All 4 MCPs aligned with comprehensive API documentation
