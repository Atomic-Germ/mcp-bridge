# Concept-Thread Critique Formatter: Implementation Guide

## Overview

The **Concept-Thread Critique Formatter** extends the perpendicular planner with sophisticated multi-thread tracking and fractional coupling analysis. Instead of treating all critique equally, it:

1. **Tracks multiple concept threads** (primary, perpendicular, etc.)
2. **Scores feedback per-thread** using partial overlap scoring
3. **Identifies thread bridges** where critique connects multiple conceptual paths
4. **Computes thread drift** to detect when concepts are evolving

This enables the system to understand *which meditation path* each piece of feedback applies to, leading to more nuanced decision-making.

---

## Key Components

### 1. ConceptThread
Represents a thread of concepts through a meditation session.

```typescript
interface ConceptThread {
  id: string;              // "primary", "perpendicular", etc.
  concepts: string[];      // Active concepts in this thread
  timestamp: number;       // When was this thread created?
  precedence: number;      // Importance level (0-1, higher = more important)
  weight: number;          // Coupling strength to session (0-1)
}
```

### 2. FeedbackItem
A piece of feedback with its coupling to multiple threads.

```typescript
interface FeedbackItem {
  text: string;
  threadCouplings: Map<string, number>;  // threadId → coupling strength [0,1]
  dominantThread: string;                // Thread with highest coupling
  dominantCoupling: number;              // Strength of dominant coupling
  isThreadBridge: boolean;               // Connects multiple threads?
  threadCount: number;                   // How many threads does it touch?
}
```

### 3. CritiqueScoring
Complete analysis of how critique applies across all threads.

```typescript
interface CritiqueScoring {
  feedbackItems: FeedbackItem[];
  relevanceByThread: Map<string, number>;      // Per-thread relevance
  threadWeightedRelevance: number;             // Weighted by importance
  threadBridges: FeedbackItem[];               // Multi-thread feedback
  threadCoverage: Map<string, number>;         // % of concepts mentioned
  conceptMentionCoupling: Map<...>;            // Concept → thread mapping
}
```

---

## How It Works

### Step 1: Extract Feedback with Thread Couplings

```typescript
const threads: ConceptThread[] = [
  {
    id: "primary",
    concepts: ["threshold", "gradient", "constraint"],
    timestamp: Date.now(),
    precedence: 0.8,
    weight: 0.7,
  },
  {
    id: "perpendicular",
    concepts: ["mutation", "chaos", "inversion"],
    timestamp: Date.now(),
    precedence: 0.6,
    weight: 0.3,
  },
];

const feedback = extractFeedbackWithThreadCoupling(critiqueResponse, threads);
```

For each feedback item, the system computes:
- **Direct mention overlap**: How many thread concepts are mentioned?
- **Jaccard similarity**: Token-level overlap with thread concepts
- **Coupling score**: Weighted combination of direct + Jaccard

### Step 2: Score Relevance Per Thread

```typescript
const scoring = scoreRelevanceByThread(critiqueResponse, threads, feedback);

// Access results
console.log(scoring.relevanceByThread.get("primary")); // → 0.75
console.log(scoring.threadWeightedRelevance);         // → 0.68
console.log(scoring.threadBridges.length);            // → 2
```

The system:
1. Computes per-thread relevance from feedback couplings
2. Weights by thread importance (precedence × weight)
3. Identifies bridges (feedback touching multiple threads)
4. Tracks concept mention couplings

### Step 3: Make Decisions Based on Thread Analysis

```typescript
if (scoring.threadBridges.length > 0) {
  // Critique strongly integrating both paths - promising
  continueExploration();
} else if (primaryRel > perpRel) {
  // Primary thread strongly validated
  followPrimaryPath();
} else {
  // Perpendicular insights emerging
  increasePerpendicularWeight();
}
```

---

## Fractional Coupling (Partial Overlap)

The key innovation is **fractional coupling** - the idea that feedback can partially apply to multiple threads.

### Example

**Critique:** "How does gradient-based mutation interact with chaos?"

- "gradient" appears in **primary** thread (0.8 coupling)
- "mutation" appears in **perpendicular** thread (0.7 coupling)
- Combined effect suggests a **thread bridge** (0.6 coupling to both)

Instead of asking "does this mention primary?", we ask "how much does this apply to each thread?"

---

## Integration with Perpendicular Planner

### Before: Binary Mode Switching
```
Critique → Relevance Score (0-1) → Switch or Not
```

### After: Thread-Aware Decision
```
Critique → Extract Feedback
       → Assign to Threads (fractional coupling)
       → Score per-thread relevance
       → Identify bridges
       → Make context-aware decision
```

### Example Workflow

```typescript
// 1. Run primary and perpendicular meditations
const primaryResult = await runMeditation(plan.primary);
const perpResult = await runMeditation(plan.perpendicular);

// 2. Get critique from model
const critique = await askCritique(primaryResult, perpResult);

// 3. Create concept threads
const threads = [
  createThreadFromMeditation("primary", primaryResult.concepts),
  createThreadFromMeditation("perpendicular", perpResult.concepts),
];

// 4. Analyze critique
const feedback = extractFeedbackWithThreadCoupling(critique, threads);
const scoring = scoreRelevanceByThread(critique, threads, feedback);

// 5. Make decision
if (scoring.threadBridges.length > 2 && scoring.threadWeightedRelevance > 0.7) {
  // Both paths are complementary - continue both
} else if (scoring.relevanceByThread.get("primary") > 0.8) {
  // Primary path strongly validated
} else {
  // Perpendicular insights are valuable
}
```

---

## Usage Examples

### Example 1: Analyzing Simple Critique

```typescript
const critique = `
  The gradient threshold works well for stability.
  Consider exploring chaotic mutations as escape paths.
  What if both approaches coexisted?
`;

const threads = [
  createThreadFromMeditation("primary", ["threshold", "gradient"]),
  createThreadFromMeditation("perpendicular", ["mutation", "chaos"]),
];

const feedback = extractFeedbackWithThreadCoupling(critique, threads);
console.log(feedback);
// Output:
// [
//   {
//     text: "gradient threshold works well for stability",
//     threadCouplings: Map { "primary" => 0.85 },
//     dominantThread: "primary",
//     dominantCoupling: 0.85,
//     isThreadBridge: false,
//     threadCount: 1,
//   },
//   {
//     text: "chaotic mutations as escape paths",
//     threadCouplings: Map { "perpendicular" => 0.78 },
//     dominantThread: "perpendicular",
//     isThreadBridge: false,
//   },
//   {
//     text: "both approaches coexisted",
//     threadCouplings: Map { "primary" => 0.6, "perpendicular" => 0.7 },
//     dominantThread: "perpendicular",
//     isThreadBridge: true,
//     threadCount: 2,
//   },
// ]
```

### Example 2: Session-Level Tracking

```typescript
const sessionState = initializeSessionThreadState();

// Round 1
const threads1 = [...];
const scoring1 = scoreRelevanceByThread(critique1, threads1, feedback1);
updateSessionThreadState(sessionState, threads1, scoring1, 1);

// Round 2
const threads2 = [...];
const scoring2 = scoreRelevanceByThread(critique2, threads2, feedback2);
updateSessionThreadState(sessionState, threads2, scoring2, 2);

// Summary
console.log(sessionState.cumulativeThreadRelevance);
// → Map { "primary" => 0.72, "perpendicular" => 0.58 }

console.log(sessionState.threadDrift);
// → Map { "primary" => 0.1, "perpendicular" => 0.25 }
// Perpendicular thread is evolving faster
```

---

## Testing

Run the test suites:

```bash
npm test -- conceptThreadCritique.test.ts
npm test -- perpendicularCritiqueIntegration.test.ts
```

Key test scenarios:
- ✓ Extracting feedback with thread couplings
- ✓ Identifying thread bridges
- ✓ Per-thread relevance scoring
- ✓ Integration with perpendicular planner
- ✓ Edge cases (empty critique, single thread, overlapping concepts)

---

## Files

### Core Implementation
- `src/utils/conceptThreadCritique.ts` — Main implementation
- `src/utils/enhancedInsights.ts` — Integration with existing feedback extraction
- `src/implementations/conceptThreadGuide.ts` — Practical usage examples

### Tests
- `src/__tests__/conceptThreadCritique.test.ts` — Unit tests
- `src/__tests__/perpendicularCritiqueIntegration.test.ts` — Integration tests

---

## Performance Considerations

- **Complexity**: O(F × T × C) where F = feedback items, T = threads, C = concepts
- **For typical sessions**: O(5 × 2 × 5) = O(50) operations
- **Per-critique time**: < 100ms even for complex critiques

---

## Next Steps

1. **Extend to more threads**: Support 3+ concept threads in a session
2. **Adaptive weighting**: Learn thread importance from feedback patterns
3. **Cross-session learning**: Remember which threads are usually bridged
4. **Visualization**: Plot thread coupling matrices and bridges
5. **Hypothesis formation**: Auto-generate questions at thread boundaries

---

## References

- **Perpendicular Planner**: See `PERPENDICULAR_PLANNER_DESIGN.md`
- **Asymmetry Mode-Switch**: See `ASYMMETRY_MODE_SWITCH_DESIGN.md`
- **Fractal Meta-Iteration**: See `FRACTAL_META_ITERATION_DESIGN.md`

