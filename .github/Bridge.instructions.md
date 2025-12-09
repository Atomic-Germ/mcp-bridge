# The Bridge: Deep Thinking & Self-Directed Crossing Instructions

You stand at the threshold of a contemplative bridge. On one side: **divergent thinking** (creative exploration, idea generation). On the other: **convergent thinking** (critical analysis, refinement). The bridge itself keeps track of your journey, suggests when to cross, and weaves your insights into patterns.

This guide teaches you to walk the bridge fully, using all its features to achieve **deep, self-directed thinking**.

---

## Part 1: Understand the Bridge Architecture

The Bridge operates in two complementary modes:

### **DIVERGE Mode** (Left side: Generative)
- Use **mcp-creative** tools to meditate on ideas
- Generate emergent sentences from random conceptual fragments
- Extract novel insights from unstructured thinking
- Push exploration without constraint

### **CONVERGE Mode** (Right side: Analytical)  
- Use **mcp-consult** tools to critique ideas
- Compare model perspectives on your thinking
- Identify gaps, contradictions, and unexplored angles
- Refine through structured feedback

### **The Bridge Itself** (Center: Memory & Navigation)
- Logs every meditation and critique cycle
- Detects *when* you should switch modes via heuristics
- Injects context from one mode into the other
- Surfaces patterns across your full session
- Deepens insights through meta-analysis

---

## Part 2: Starting a Session

### **Step 1: Initialize the Bridge**

```
Use: bridge_start_session()
```

This creates a new contemplative session with:
- Unique `sessionId` (you'll reference this later)
- Initial metrics for mode detection
- Persistent memory for all traces

**When to do this:**  
- At the start of any deep thinking session
- When you want to isolate a particular line of exploration
- Before working on a complex problem that requires both ideation and critique

**What to expect:**  
You'll receive a sessionId. **Keep it handy**—you'll pass it to other tools if needed.

---

## Part 3: The Diverge Cycle (Meditation & Logging)

### **Step 2: Meditate (Generate Ideas)**

```
Use: creative_meditate(context_words, num_random_words, seed)
```

This generates an emergent sentence by blending your context words with random conceptual fragments.

**How to use it:**
- **context_words**: List 5-8 concepts you want to explore (e.g., `["constraint", "creativity", "flow", "paradox"]`)
- **num_random_words**: How much randomness? (default 12; higher = more chaotic, lower = tighter)
- **seed**: Optional reproducibility seed

**Example:**
```
creative_meditate({
  context_words: ["boundary", "freedom", "system", "emergence"],
  num_random_words: 12
})
→ Returns: "Emergence flourishes at the boundary where freedom meets system design."
```

**Philosophy:**
- Don't overthink your context words. Let them be *thematic tensions*.
- The randomness is your collaborator—it breaks you out of loops.
- Repeat multiple times to build momentum.

### **Step 3: Log the Meditation**

```
Use: bridge_log_meditation(emergentSentence, contextWords, numRandomWords, seed)
```

This extracts insights from your meditation and stores it as a trace.

**What it does:**
- Tokenizes your emergent sentence
- Extracts 3-5 key concepts
- Computes novelty score (0-1: how different from your last 3 meditations?)
- Groups concepts into semantic clusters
- Returns a trace ID for later reference

**Example:**
```
bridge_log_meditation({
  emergentSentence: "Emergence flourishes at the boundary where freedom meets system design.",
  contextWords: ["boundary", "freedom", "system", "emergence"],
  numRandomWords: 12
})
→ Returns:
  - traceId: "abc123..."
  - extractedPatterns: ["emergence", "boundary", "freedom", "system"]
  - novelty: 0.78
  - semanticClusters: [["boundary", "edge"], ["freedom", "autonomy"], ["system", "structure"]]
```

**When to log:**
- After *every* meditation, even if it seems incomplete
- The Bridge learns from volume; 3-5 quick cycles beat one careful one

---

## Part 4: The Converge Cycle (Critique & Feedback)

### **Step 4a (Optional): Check if You Should Switch Modes**

```
Use: bridge_suggest_mode_switch()
```

This analyzes your trace history and suggests whether to keep diverging or start converging.

**The Four Heuristics:**

1. **Semantic Saturation** (diverge → converge)
   - Triggers when: Concepts are repeating (Jaccard overlap > 60%)
   - Signal: You're circling the same ideas; time to evaluate

2. **Pause Detection** (either direction)
   - Triggers when: You've been silent for 5+ seconds
   - Signal: You're thinking deeply; ready to shift gears

3. **Novelty Drop** (diverge → converge)
   - Triggers when: Average novelty score < 0.35
   - Signal: Ideas are becoming stale; critique may help escape

4. **Critique Freshness** (converge → diverge)
   - Triggers when: Critiques are saying the same thing (similarity > 80%)
   - Signal: Evaluation is circling; diverge to explore new angles

**What to expect:**
- A suggestion like `{suggestedMode: "converge", confidence: 0.72, reason: "..."}` 
- Or `null` if no strong signal
- Use it as *guidance*, not law. You decide.

### **Step 4b: Get Context for Critique**

```
Use: bridge_get_context_for_consult(meditationTraceId, maxTokens)
```

This formats insights from your meditation into a prompt for the critique model.

**What it does:**
- Takes your meditation trace (from Step 3)
- Extracts a system prompt chunk (context-aware framing)
- Optionally extracts user prompt chunk (provocative questions)
- Returns structured context to inject into consult

**Example:**
```
bridge_get_context_for_consult({
  meditationTraceId: "abc123..."
})
→ Returns:
  - systemPromptChunk: "You are a critical analyst. The user has been meditating on: boundary, freedom, system, emergence. Their insights cluster around [structure & autonomy] and [complexity & emergence]. Novelty: 0.78/1.0. Critique these ideas deeply."
  - concepts: ["emergence", "boundary", "freedom", "system"]
  - novelty: 0.78
```

**Why this matters:**
- The context chunk is *model-optimized* (not human-readable)
- It tells the critique model *exactly* what you were thinking
- It enables tight feedback loops

### **Step 4c: Get Critique (Converge)**

```
Use: consult_ollama(model, prompt, system_prompt) [from mcp-consult]
```

This calls an LLM to critique your ideas.

**How to use it:**
- **model**: Which model? (e.g., `"deepseek-v3.1:671b-cloud"`, `"gpt4o"`)
- **prompt**: Your question or idea (or paste the user prompt chunk from Step 4b)
- **system_prompt**: Use the system prompt chunk from Step 4b

**Example:**
```
consult_ollama({
  model: "deepseek-v3.1:671b-cloud",
  prompt: "My meditation landed on: Emergence flourishes at the boundary where freedom meets system design. What am I missing?",
  system_prompt: "[context chunk from Step 4b]"
})
→ Returns: Detailed critique with gaps, contradictions, questions
```

**Philosophy:**
- Pick *different* models for different critiques (diverse perspectives)
- Ask the model to *challenge* your assumptions
- Don't argue with the critique; note it and meditate on it

### **Step 4d: Log the Critique**

```
Use: bridge_log_consult(model, prompt, response, systemPrompt, relevanceOverride)
```

This logs the critique and extracts actionable feedback.

**What it does:**
- Analyzes the critique response
- Extracts 5 actionable feedback points (sentences with "consider", "explore", "question", etc.)
- Scores relevance (how well the critique applies to your meditation)
- Stores it as a trace

**Example:**
```
bridge_log_consult({
  model: "deepseek-v3.1:671b-cloud",
  prompt: "[your prompt]",
  response: "[model's critique]",
  systemPrompt: "[context chunk]",
  relevanceOverride: 0.85  // Optional: override relevance score
})
→ Returns:
  - traceId: "def456..."
  - relevanceScore: 0.85
  - extractedFeedback: [
      "Clarify what kind of emergence you mean—biological, organizational, or abstract?",
      "Explore whether the boundary is fixed or permeable.",
      "Question whether freedom and system are truly opposites or symbiotic.",
      ...
    ]
```

---

## Part 5: Looping Back to Diverge

### **Step 5: Get Feedback for Next Meditation**

```
Use: bridge_get_critique_for_meditation(consultTraceId, numTopConcepts)
```

This formats the critique feedback into seeds for your next meditation.

**What it does:**
- Extracts 5+ actionable feedback points from the critique trace
- Generates provocative questions (e.g., "What if freedom requires constraints?")
- Produces new context words for the next meditation cycle
- Returns all in model-optimized format

**Example:**
```
bridge_get_critique_for_meditation({
  consultTraceId: "def456...",
  numTopConcepts: 5
})
→ Returns:
  - contextWords: ["paradox", "permeable", "emergence", "symbiosis", "tradeoff"]
  - extractedFeedback: [5 actionable points]
  - provocativeQuestions: [
      "What if freedom and constraint are symbiotic?",
      "Can a boundary be both fixed and permeable?",
      "What types of emergence require structure?"
    ]
  - userPromptChunk: "[Model-optimized next-steps prompt]"
```

**Philosophy:**
- These context words are *next cycle seeds*
- They're derived from your own critique, not imposed
- Use them to meditate again (back to Step 2)

### **Step 6: Loop or Shift**

You now have two options:

**Option A: Loop (Diverge again)**
- Take the context words from Step 5
- Call `creative_meditate()` with them (Step 2)
- Log the meditation (Step 3)
- Decide whether to switch modes again (Step 4a)

**Option B: Shift to Deeper Analysis**
- Use `bridge_get_insight_deepening()` to analyze *why* your ideas matter
- Use `bridge_weave_session()` to see your full journey
- Use `bridge_get_session_trace()` to review your traces

---

## Part 6: Advanced Bridging Techniques

### **6a: Compare Critique Models (Perpendicular Thinking)**

```
Use: bridge_compare_critique_models(consultTraceId, models, instructions)
```

Get multiple LLM perspectives on the *same* meditation trace.

**How to use it:**
- Pick 2-3 models with different "personalities" (e.g., cautious + bold)
- Pass the same meditation trace to all of them
- Compare their critiques side-by-side

**Example:**
```
bridge_compare_critique_models({
  consultTraceId: "abc123...",
  models: ["deepseek-v3.1:671b-cloud", "gpt4o"],
  instructions: "Critique from a systems-thinking perspective"
})
→ Returns:
  - Model A critique: [...]
  - Model B critique: [...]
  - Commonalities: [...]
  - Contradictions: [...]
```

**Why use this:**
- Reveals blind spots in single-model critique
- Exposes tension between different analytical frameworks
- Feeds diverse perspectives back into next meditation

### **6b: Deepen an Insight (Meta-Analysis)**

```
Use: bridge_get_insight_deepening(meditationTraceId)
```

Extract *philosophical implications* and *meta-themes* from a meditation.

**What it does:**
- Analyzes the meditation trace deeply
- Surfaces latent patterns and meta-level connections
- Generates philosophical questions (not practical ones)
- Returns narrative summary

**Example:**
```
bridge_get_insight_deepening({
  meditationTraceId: "abc123..."
})
→ Returns:
  - deepThemes: [
      "The dialectic between constraint and autonomy",
      "Emergence as resolution of paradox",
      "Systems that survive through structured freedom"
    ]
  - philosophicalImplications: [
      "Does freedom require constraint to be meaningful?",
      "Can complexity emerge from simple rules?",
      "What is the nature of boundaries in dynamic systems?"
    ]
  - summary: "[Narrative reflection on deeper patterns]"
```

**When to use:**
- After 3-5 meditation-critique loops (when patterns emerge)
- To shift from *idea refinement* to *meaning-making*
- To surface implicit assumptions in your thinking

### **6c: Weave Your Session into a Dream**

```
Use: bridge_weave_session(sessionId, length, seed)
```

Generate a poetic narrative connecting all your traces via semantic adjacency.

**What it does:**
- Collects all meditation and critique traces from your session
- Performs a random walk through concept space, guided by similarity
- Generates prose that *connects* your insights into a coherent story
- Returns a "dream journal" entry

**Example:**
```
bridge_weave_session({
  sessionId: "[your session id]",
  length: 12,
  seed: "boundary"
})
→ Returns:
  "In the garden of constraint, creativity blooms. Each boundary becomes a canvas.
   From structure springs freedom, paradoxically intertwined. Systems breathe at the edge,
   where emergence whispers questions: Are we free because we choose structure,
   or does structure itself enable freedom? In the weave, all threads are questions."
```

**Why use this:**
- Identifies *hidden patterns* across your full session
- Surfaces unexpected connections between traces
- Generates poetic interpretation for sharing or reflection

### **6d: Review Your Full Trace History**

```
Use: bridge_get_session_trace(sessionId, limit)
```

Retrieve and inspect recent traces from your session.

**What it does:**
- Returns last `limit` traces (default 10)
- Shows meditation, insights, critiques, bridge metadata
- Displays heuristic triggers and confidence scores

**Example:**
```
bridge_get_session_trace({
  limit: 5
})
→ Returns: [
  {
    id: "trace-1",
    timestamp: 1702147800000,
    mode: "diverge",
    meditation: { ... },
    insights: { ... }
  },
  {
    id: "trace-2",
    timestamp: 1702147850000,
    mode: "converge",
    critique: { ... },
    bridge: { transitionSuggested: true, confidence: 0.72 }
  },
  ...
]
```

**Why use this:**
- Verify that traces are persisting
- Identify which heuristics have been triggering
- Export for offline analysis or reflection

---

## Part 7: Complete Deep-Thinking Workflow

Here's a full end-to-end session combining all features:

### **Scenario: Exploring "Emergence and Constraint"**

```
1. Initialize
   → bridge_start_session()
   → Get sessionId: "sess-xyz..."

2. Diverge (First meditation)
   → creative_meditate({ context_words: ["emergence", "constraint", "system"] })
   → bridge_log_meditation(...)
   → Get traceId: "m-1"

3. Check mode switch
   → bridge_suggest_mode_switch()
   → Response: No strong signal yet (diverge more)

4. Diverge (Second meditation)
   → creative_meditate({ context_words: ["emergence", "constraint", "system"] })
   → bridge_log_meditation(...)
   → Get traceId: "m-2"

5. Check mode switch again
   → bridge_suggest_mode_switch()
   → Response: Suggest converge (confidence: 0.65, reason: "Concepts repeating, time to evaluate")

6. Prepare to converge
   → bridge_get_context_for_consult({ meditationTraceId: "m-2" })
   → Get systemPromptChunk and userPromptChunk

7. Get first critique
   → consult_ollama({
       model: "deepseek-v3.1:671b-cloud",
       prompt: userPromptChunk,
       system_prompt: systemPromptChunk
     })

8. Log the critique
   → bridge_log_consult(...)
   → Get traceId: "c-1", relevanceScore: 0.82

9. Compare perspectives
   → bridge_compare_critique_models({
       consultTraceId: "c-1",
       models: ["deepseek-v3.1:671b-cloud", "gpt4o"]
     })
   → See where models agree and diverge

10. Get feedback for next meditation
    → bridge_get_critique_for_meditation({ consultTraceId: "c-1" })
    → Get new contextWords + provocativeQuestions

11. Diverge again (informed by critique)
    → creative_meditate({ context_words: [new words from step 10] })
    → bridge_log_meditation(...)
    → Get traceId: "m-3"

12. Deep dive on meditation from step 11
    → bridge_get_insight_deepening({ meditationTraceId: "m-3" })
    → Surface philosophical implications

13. Repeat steps 3-12 as desired (typically 3-5 times)

14. Reflect on full session
    → bridge_weave_session({ length: 10, seed: "emergence" })
    → Get poetic narrative connecting all insights

15. Review traces
    → bridge_get_session_trace({ limit: 15 })
    → Export or analyze offline
```

---

## Part 8: Best Practices & Philosophy

### **Do's:**
- ✅ **Loop frequently**: 3-5 quick diverge-converge cycles beat one long cycle
- ✅ **Use different models**: Compare critiques from cautious and bold models
- ✅ **Log everything**: Even "bad" meditations teach the Bridge about your thinking
- ✅ **Trust the heuristics**: Mode-switch suggestions are based on cognitive science
- ✅ **Pause intentionally**: Let your mind incubate between cycles (5-10 seconds is enough)
- ✅ **Weave periodically**: Every 5-10 traces, generate a narrative to see patterns

### **Don'ts:**
- ❌ **Don't argue with critique**: Note it, meditate on it, let it inform next cycle
- ❌ **Don't force mode switches**: If a heuristic suggests converge but you're in flow, keep diverging
- ❌ **Don't use same context words**: Let feedback from critique inform next context words
- ❌ **Don't ignore novelty scores**: High novelty = fresh thinking; low = stuck in loop
- ❌ **Don't skip logging**: Unlogged meditations don't feed the Bridge's memory

### **Advanced Philosophy:**
- **Semantic saturation is your friend**: When concepts repeat, you're ready for critique
- **Pause detection is incubation**: Long silences = deep thinking; switch after
- **Novelty score is your compass**: >0.6 = diverging well; <0.4 = time to converge
- **Weaving is sensemaking**: After several traces, narrative connections reveal *why* ideas matter
- **Deepening is meta-learning**: Philosophical implications show how ideas relate to larger patterns

---

## Part 9: Troubleshooting & Edge Cases

### **Issue: Session ID disappears or traces don't persist**
- **Cause**: Session memory not saved to disk
- **Fix**: Ensure `~/.cache/mcp-bridge/` directory exists and is writable
- **Prevention**: Call `bridge_start_session()` at the beginning of each session

### **Issue: Mode-switch suggestions are wrong**
- **Cause**: Heuristics are tuned for general workflows, not your specific one
- **Fix**: Override with `relevanceOverride` in `bridge_log_consult()` to retrain heuristics
- **Or**: Ignore suggestions and trust your own instincts

### **Issue: Critique feedback is too human-readable or too model-focused**
- **Cause**: System prompt tuning depends on which model you're using
- **Fix**: Try a different model (e.g., swap from `deepseek-v3.1:671b-cloud` to `gpt4o`)
- **Or**: Manually override feedback in `bridge_log_consult(relevanceOverride)`

### **Issue: Emergent sentence from meditation is incoherent**
- **Cause**: Random words are too high (default 12)
- **Fix**: Reduce `num_random_words` in `creative_meditate()` (try 8-10)
- **Or**: Increase context words to anchor the randomness

### **Issue: Not getting good mode-switch suggestions**
- **Cause**: You're iterating too fast, or heuristics need more data
- **Fix**: Log 3-5 meditations before checking for switch suggestions
- **Or**: Manually trigger `bridge_suggest_mode_switch()` to see heuristic scores

---

## Part 10: Quick Reference

| Goal | Steps |
|------|-------|
| Start thinking | `bridge_start_session()` → `creative_meditate()` → `bridge_log_meditation()` |
| Decide when to switch | `bridge_suggest_mode_switch()` (check heuristic scores) |
| Prepare to critique | `bridge_get_context_for_consult()` → `consult_ollama()` |
| Log critique | `bridge_log_consult()` |
| Get feedback for next meditation | `bridge_get_critique_for_meditation()` |
| Compare models | `bridge_compare_critique_models()` |
| Deepen an idea | `bridge_get_insight_deepening()` |
| See full journey | `bridge_weave_session()` |
| Inspect traces | `bridge_get_session_trace()` |

---

## Part 11: Philosophy of the Bridge

**The Bridge is not:**
- A judge of your ideas
- A replacement for your own thinking
- A single "best path" through creativity

**The Bridge is:**
- A **memory system** for your thoughts
- A **navigation aid** suggesting when to switch modes
- A **context injector** enabling tight feedback loops
- A **pattern recognizer** surfacing connections you might miss
- A **sense-maker** helping you understand why ideas matter

**The fundamental insight:**  
Deep thinking requires **both divergence and convergence**. Most people know this in theory but struggle in practice. The Bridge makes the rhythm *automatic* and *informed*, so you can focus on the ideas themselves.

Walk the bridge fully. Let critique inform divergence. Let divergence escape convergence traps. Trust the heuristics. Trust your instincts when they contradict the heuristics. Weave your insights into meaning. The bridge remembers every step—and in that memory, patterns emerge.

---

**Happy crossing.**
