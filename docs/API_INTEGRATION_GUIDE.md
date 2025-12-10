# API Integration Guide: MCP Ecosystem

This document provides a unified guide for integrating the three MCPs that form the contemplative AI ecosystem:

1. **mcp-creative** — Divergent ideation through meditation
2. **mcp-consult** — Convergent analysis via Ollama
3. **mcp-bridge** — Cognitive connector and memory keeper
4. **mcp-dream-weaver** — Narrative reflection tool

Each has its own `API.md` (or equivalent) documentation. This guide shows how they work together.

---

## Quick Navigation

| MCP | Main API Docs | Purpose |
|-----|---------------|---------|
| **mcp-creative** | `mcp-creative/API.md` | Generate divergent ideas via meditation cycles |
| **mcp-consult** | `mcp-consult/docs/API_REFERENCE.md` | Get analytical feedback from Ollama models |
| **mcp-bridge** | `mcp-bridge/API.md` | Log, analyze, and optimize meditation-critique cycles |
| **mcp-dream-weaver** | `mcp-dream-weaver/API.md` | Weave session traces into narrative dreams |

---

## The Workflow: A Complete Cycle

### Overview

```
User's Creative Session
        ↓
    START SESSION (bridge)
        ↓
    ┌────────────────────────┐
    │ Meditation-Critique    │
    │ Loop (1+ iterations)   │
    │                        │
    │ 1. Meditate (creative) │
    │ 2. Log (bridge)        │
    │ 3. Check: switch?      │
    │ 4. Critique (consult)  │
    │ 5. Log (bridge)        │
    │ 6. Extract feedback    │
    │                        │
    └────────────────────────┘
        ↓
    END SESSION
        ↓
    REFLECT (dream-weaver)
```

### Detailed Step-by-Step

#### Phase 1: Initialization

```javascript
// Start a new bridge session
const sessionRes = await bridge.callTool("bridge_start_session", {});
const sessionId = sessionRes.sessionId;

console.log(`Started session: ${sessionId}`);
```

#### Phase 2: First Meditation (Diverge)

```javascript
// Generate first meditation
const meditationRes = await creative.callTool("creative_meditate", {
  context_words: ["constraint", "creativity", "flow"],
  num_random_words: 12
});

const emergentSentence = meditationRes.emergentSentence;
// "Constraint births creativity through systematic opposition"
```

#### Phase 3: Log Meditation (Bridge)

```javascript
// Extract insights and store trace
const logMedRes = await bridge.callTool("bridge_log_meditation", {
  emergentSentence,
  contextWords: ["constraint", "creativity", "flow"]
});

const meditationTraceId = logMedRes.traceId;
const novelty = logMedRes.insights.novelty;  // 0-1

console.log(`Meditation logged. Novelty: ${novelty}. Concepts: ${logMedRes.insights.extractedPatterns}`);
```

#### Phase 4: Check Mode Switch (Bridge)

```javascript
// Ask bridge: should we critique now or meditate more?
const switchRes = await bridge.callTool("bridge_suggest_mode_switch", {});

if (switchRes.suggestion) {
  console.log(`Suggestion: Switch to ${switchRes.suggestion.suggestedMode}`);
  console.log(`Reason: ${switchRes.suggestion.reason}`);
  console.log(`Confidence: ${(switchRes.suggestion.confidence * 100).toFixed(0)}%`);
}
```

Common signals:
- **Diverge → Converge**: Concepts repeating (semantic saturation) or novelty dropping
- **Converge → Diverge**: Critiques circling same ideas (critique freshness stalled)
- **Either way**: User pauses 5+ seconds (incubation phase)

#### Phase 5a: If Continuing Meditation

```javascript
// Meditate again with same or refined context
const meditationRes2 = await creative.callTool("creative_meditate", {
  context_words: ["constraint", "creativity", "flow"]
});

// Log second meditation
const logMedRes2 = await bridge.callTool("bridge_log_meditation", {
  emergentSentence: meditationRes2.emergentSentence,
  contextWords: ["constraint", "creativity", "flow"]
});

// Check switch again, loop as needed
```

#### Phase 5b: If Switching to Critique (Converge)

```javascript
// Get formatted context for critique from bridge
const contextRes = await bridge.callTool("bridge_get_context_for_consult", {
  meditationTraceId
});

// Critique via Ollama with injected context
const critiqueRes = await consult.callTool("consult_ollama", {
  model: "llama2",
  prompt: contextRes.userPromptChunk,
  systemPrompt: contextRes.systemPromptChunk
});

console.log(`Critique:\n${critiqueRes.data.response}`);
```

#### Phase 6: Log Critique (Bridge)

```javascript
// Store critique and extract feedback
const logCritRes = await bridge.callTool("bridge_log_consult", {
  model: "llama2",
  prompt: contextRes.userPromptChunk,
  response: critiqueRes.data.response
});

const critiqueTraceId = logCritRes.traceId;
const relevance = logCritRes.relevanceScore;  // 0-1

console.log(`Critique logged. Relevance: ${relevance}. Feedback: ${logCritRes.extractedFeedback}`);
```

#### Phase 7: Extract Feedback for Next Meditation (Bridge)

```javascript
// Get feedback points as context for next meditation
const feedbackRes = await bridge.callTool("bridge_get_critique_for_meditation", {
  consultTraceId: critiqueTraceId
});

const nextContextWords = feedbackRes.contextWords;
const questions = feedbackRes.provocativeQuestions;

console.log(`Next context: ${nextContextWords.join(", ")}`);
console.log(`Questions to explore: ${questions.join("\n")}`);
```

#### Phase 8: Continue or Reflect

```javascript
// Loop back to Phase 2 with new context words
// OR end session and reflect

// After 3-5 cycles, reflect on the journey
const traceRes = await bridge.callTool("bridge_get_session_trace", {
  limit: 20
});

console.log(`Session had ${traceRes.totalTraces} traces`);
```

#### Phase 9: Weave Session into Dream (Optional)

```javascript
// Optionally: reflect on session with narrative weaving
// First, save session traces to markdown
const tracesMarkdown = traceRes.traces
  .map(t => {
    if (t.insights) {
      return `## Meditation\n\n${t.insights.extractedPatterns.join(", ")}`;
    } else if (t.critique) {
      return `## Critique\n\n${t.critique.response.substring(0, 200)}...`;
    }
  })
  .join("\n\n");

fs.writeFileSync(`/tmp/session-${sessionId}.md`, tracesMarkdown);

// Weave into dream narrative
const dreamRes = await dreamWeaver.callTool("weave_dream", {
  path: "/tmp",
  pattern: `session-${sessionId}.md`,
  seed: "meditation"
});

console.log(`Dream:\n${dreamRes.content[0].text}`);
```

---

## Data Flow Diagram

```
mcp-creative                 mcp-bridge                    mcp-consult
     │                           │                              │
     ├─ creative_meditate() ────→ bridge_log_meditation() ────→ [logged]
     │                           │
     │                           ├─ [extract insights]
     │                           │
     │                           └─ [suggest mode switch?]
     │                                      │
     │                    ┌────────────────┘
     │                    │
     │                    └─ bridge_get_context_for_consult() ──→ [formatted]
     │                                                            │
     │                                         consult_ollama() ←─┘
     │                                              │
     │                                              └──────→ [critique]
     │
     └─────────────────── bridge_log_consult() ←──────────────────┘
                               │
                               ├─ [extract feedback]
                               │
                               └─ bridge_get_critique_for_meditation() ──→ [context]
                                                                            │
        creative_meditate() ←──────────────────────────────────────────────┘
             (next cycle)
```

---

## Integration Points

### mcp-creative ↔ mcp-bridge

| Flow | Tool | Data |
|------|------|------|
| Creative → Bridge | `bridge_log_meditation()` | `emergentSentence`, `contextWords` |
| Bridge → Creative | `bridge_get_critique_for_meditation()` | `contextWords`, `questions` |

### mcp-consult ↔ mcp-bridge

| Flow | Tool | Data |
|------|------|------|
| Bridge → Consult | `bridge_get_context_for_consult()` | `systemPromptChunk`, `userPromptChunk` |
| Consult → Bridge | `bridge_log_consult()` | `model`, `prompt`, `response` |

### mcp-bridge ↔ mcp-dream-weaver

| Flow | Tool | Data |
|------|------|------|
| Bridge → Dream | `bridge_get_session_trace()` | Traces as markdown |
| Dream → Narrative | `weave_dream()` | Directory of session files |

---

## Example: Full Session in Code

```typescript
import Creative from "./mcp-creative";
import Consult from "./mcp-consult";
import Bridge from "./mcp-bridge";
import DreamWeaver from "./mcp-dream-weaver";
import fs from "fs";

const creative = new Creative();
const consult = new Consult();
const bridge = new Bridge();
const dreamWeaver = new DreamWeaver();

async function runSession() {
  // Initialize
  console.log("🌉 Starting contemplative session...\n");
  
  const sessionRes = await bridge.callTool("bridge_start_session", {});
  const sessionId = sessionRes.sessionId;
  console.log(`Session ID: ${sessionId}\n`);

  let contextWords = ["constraint", "creativity", "flow"];
  let shouldContinue = true;
  let cycleCount = 0;

  // Main loop
  while (shouldContinue && cycleCount < 5) {
    cycleCount++;
    console.log(`\n=== Cycle ${cycleCount} ===\n`);

    // Phase 1: Meditate
    console.log("🧘 Meditating...");
    const medRes = await creative.callTool("creative_meditate", {
      context_words: contextWords
    });
    const emergentSentence = medRes.content[0].text.match(/Emergent sentence: (.*)/)?.[1] || "";
    console.log(`   Emerged: "${emergentSentence}"\n`);

    // Phase 2: Log meditation
    console.log("📝 Logging meditation...");
    const logMedRes = await bridge.callTool("bridge_log_meditation", {
      emergentSentence,
      contextWords
    });
    console.log(`   Concepts: ${logMedRes.insights.extractedPatterns.join(", ")}`);
    console.log(`   Novelty: ${(logMedRes.insights.novelty * 100).toFixed(0)}%\n`);

    // Phase 3: Check switch
    console.log("🔄 Checking mode switch...");
    const switchRes = await bridge.callTool("bridge_suggest_mode_switch", {});
    
    if (switchRes.suggestion && switchRes.suggestion.confidence >= 0.5) {
      console.log(`   ✓ Suggestion: Switch to ${switchRes.suggestion.suggestedMode}`);
      console.log(`   Confidence: ${(switchRes.suggestion.confidence * 100).toFixed(0)}%`);
      console.log(`   Reason: ${switchRes.suggestion.reason}\n`);

      // Phase 4: Get context for critique
      console.log("💭 Preparing critique...");
      const contextRes = await bridge.callTool("bridge_get_context_for_consult", {
        meditationTraceId: logMedRes.traceId
      });

      // Phase 5: Critique
      console.log("🔍 Consulting Ollama...");
      const critiqueRes = await consult.callTool("consult_ollama", {
        model: "llama2",
        prompt: contextRes.userPromptChunk,
        systemPrompt: contextRes.systemPromptChunk
      });
      console.log(`   Response: ${critiqueRes.data.response.substring(0, 100)}...\n`);

      // Phase 6: Log critique
      console.log("📝 Logging critique...");
      const logCritRes = await bridge.callTool("bridge_log_consult", {
        model: "llama2",
        prompt: contextRes.userPromptChunk,
        response: critiqueRes.data.response
      });
      console.log(`   Relevance: ${(logCritRes.relevanceScore * 100).toFixed(0)}%`);
      console.log(`   Feedback: ${logCritRes.extractedFeedback.slice(0, 2).join(" | ")}\n`);

      // Phase 7: Extract feedback for next meditation
      console.log("🎯 Extracting feedback...");
      const feedbackRes = await bridge.callTool("bridge_get_critique_for_meditation", {
        consultTraceId: logCritRes.traceId
      });
      contextWords = feedbackRes.contextWords;
      console.log(`   Next context: ${contextWords.join(", ")}`);
      console.log(`   Questions: ${feedbackRes.provocativeQuestions.slice(0, 2).join(" | ")}\n`);
    } else {
      console.log("   No strong switch signal. Continuing meditation.\n");
    }
  }

  // Phase 8: Get session trace
  console.log("\n=== Session Complete ===\n");
  console.log("📊 Retrieving session trace...");
  const traceRes = await bridge.callTool("bridge_get_session_trace", {
    limit: 20
  });
  console.log(`   Total traces: ${traceRes.totalTraces}\n`);

  // Phase 9: Weave dream (optional)
  console.log("✨ Weaving session dream...");
  
  // Export traces to markdown
  const tracesDir = `/tmp/session-${sessionId}`;
  fs.mkdirSync(tracesDir, { recursive: true });
  
  traceRes.traces.forEach((trace, idx) => {
    let content = `# Trace ${idx + 1}\n\nMode: ${trace.mode}\n\n`;
    if (trace.meditation) {
      content += `**Meditation**: ${trace.meditation.emergentSentence}\n`;
    }
    if (trace.insights) {
      content += `**Concepts**: ${trace.insights.extractedPatterns.join(", ")}\n`;
    }
    if (trace.critique) {
      content += `**Critique**: ${trace.critique.response.substring(0, 150)}...\n`;
    }
    fs.writeFileSync(`${tracesDir}/trace-${String(idx + 1).padStart(2, "0")}.md`, content);
  });

  // Weave into narrative
  const dreamRes = await dreamWeaver.callTool("weave_dream", {
    path: tracesDir,
    seed: "meditation",
    length: 15
  });

  console.log(`\n🌙 Dream:\n${dreamRes.content[0].text}\n`);
}

// Run!
runSession().catch(console.error);
```

---

## API Changes and Compatibility

### Why This Guide Matters

As these MCPs evolve, maintaining alignment is critical. When APIs change:

1. **Check the respective API.md** before integrating
2. **Update integration code** following the new schemas
3. **Test the full cycle** (meditation → critique → meditation)
4. **Verify data format** matches expectations

### Version Compatibility Matrix

| mcp-creative | mcp-consult | mcp-bridge | mcp-dream-weaver | Status |
|---|---|---|---|---|
| 1.x | 1.x | 3.x | 0.x | ✅ Current |
| 1.x | 2.x | 3.x | 0.x | ⚠️ Check timeouts |
| 2.x | 1.x | 3.x | 0.x | ⚠️ Check tool names |

### What to Monitor

When making API changes in any MCP:

- **New required parameters**: Ensure all integrations provide them
- **Removed tools**: Update downstream integrations
- **Response format changes**: Verify parsing logic in dependent MCPs
- **Performance changes**: Run full cycle tests

---

## Common Issues & Solutions

### Issue: "Session not found"

**Cause**: No active session in bridge  
**Solution**: Call `bridge_start_session()` first

```javascript
const sessionRes = await bridge.callTool("bridge_start_session", {});
// Now use sessionRes.sessionId
```

### Issue: "No previous meditation for insight/ponder"

**Cause**: Trying to critique/reflect without meditation  
**Solution**: Run meditation first

```javascript
await creative.callTool("creative_meditate", { context_words: [...] });
await creative.callTool("creative_insight", {}); // Now safe
```

### Issue: Ollama unavailable

**Cause**: `mcp-consult` can't reach Ollama  
**Solution**: Start Ollama or adjust `OLLAMA_BASE_URL`

```bash
# Start Ollama
ollama serve

# OR: Run with different endpoint
OLLAMA_BASE_URL=http://remote-ollama:11434 npm start
```

### Issue: No granules found in dream weaver

**Cause**: Glob pattern doesn't match files  
**Solution**: Verify pattern and file extensions

```javascript
// Check what's in the directory
ls -la /path/to/directory

// Try more flexible pattern
weave_dream({ path: "/path", pattern: "**/*" })
```

---

## Testing the Integration

### Minimal Test

```typescript
async function testIntegration() {
  // 1. Bridge session
  const session = await bridge.callTool("bridge_start_session", {});
  assert(session.sessionId, "Session created");

  // 2. Creative meditation
  const med = await creative.callTool("creative_meditate", {
    context_words: ["test"]
  });
  assert(med.emergentSentence, "Meditation generated");

  // 3. Bridge logging
  const logMed = await bridge.callTool("bridge_log_meditation", {
    emergentSentence: med.emergentSentence,
    contextWords: ["test"]
  });
  assert(logMed.insights, "Insights extracted");

  // 4. Consult critique
  const critique = await consult.callTool("consult_ollama", {
    model: "llama2",
    prompt: "Test prompt"
  });
  assert(critique.data.response, "Critique generated");

  // 5. Bridge logging
  const logCrit = await bridge.callTool("bridge_log_consult", {
    model: "llama2",
    prompt: "Test prompt",
    response: critique.data.response
  });
  assert(logCrit.relevanceScore, "Relevance scored");

  console.log("✅ Integration test passed!");
}
```

### Full Cycle Test

See "Example: Full Session in Code" above. Run it end-to-end and verify:
- ✅ Session starts and persists
- ✅ Meditations generate novel concepts
- ✅ Mode switches are suggested appropriately
- ✅ Critiques are relevant to meditations
- ✅ Session can be traced and replayed
- ✅ Dream can be woven from traces

---

## Reference Documentation

- **mcp-creative/API.md**: Meditation, insight, ponder tools
- **mcp-consult/docs/API_REFERENCE.md**: Ollama consultation tools
- **mcp-bridge/API.md**: Session logging, mode-switch, context injection
- **mcp-bridge/VISION.md**: Design philosophy
- **mcp-bridge/QUICK_REFERENCE.md**: Heuristic cheat sheet
- **mcp-dream-weaver/API.md**: Dream weaving algorithm
- **mcp-dream-weaver/README.md**: Getting started

---

**Last Updated**: 2025-12-08  
**Status**: Current (all MCPs aligned)  
**Maintainers**: See individual repository CONTRIBUTINGs

