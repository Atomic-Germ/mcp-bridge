# Perpendicular Planner: Quick Start Implementation

## Core Concept
A heuristic-driven system that modulates perpendicular path selection based on novelty and saturation signals in real-time.

---

## 1-Minute Summary

**When to use what inverses:**
- **High novelty + Low saturation** → Soft inverses (gentle variation, preserve context)
- **High saturation (regardless of novelty)** → Harsh flips (strong contrast, escape stagnation)
- **Normal/low signals** → Default perpendicular variation

**Key insight:** Don't always flip the same way. Let heuristic signals drive the inversion strength.

---

## Minimal Implementation (TypeScript)

```typescript
interface HeuristicSignals {
  novelty: number;        // 0.0 - 1.0
  saturation: number;     // 0.0 - 1.0
}

interface PerpendularState {
  signals: HeuristicSignals[];  // Last 5 samples
  recentBranches: string[];     // Last 3 branches used
  thresholds: {
    noveltyHigh: number;        // 0.7 default
    saturationHigh: number;     // 0.7 default
  };
  currentAffinity: number;      // 0.0 - 1.0
}

function selectInverseType(state: PerpendularState): "SOFT" | "HARSH" | "NORMAL" {
  const latest = state.signals[state.signals.length - 1];
  
  if (latest.novelty > state.thresholds.noveltyHigh && 
      latest.saturation < state.thresholds.saturationHigh) {
    return "SOFT";  // High novelty + low saturation = gentle variation
  }
  
  if (latest.saturation > state.thresholds.saturationHigh) {
    return "HARSH"; // High saturation = strong escape
  }
  
  return "NORMAL";  // Default
}

function plan_perpendicular_with_state(
  contextWords: string[],
  state: PerpendularState
): { primary: string[]; perpendicular: string[] } {
  const inverseType = selectInverseType(state);
  
  // Avoid reusing recent branches
  const recentSet = new Set(state.recentBranches);
  
  // Fetch appropriate inverse pool based on type
  const inversePool = 
    inverseType === "SOFT" ? softInverses :
    inverseType === "HARSH" ? harshInverses :
    normalInverses;
  
  // Pick one that hasn't been used recently
  const perpedicular = inversePool.find(inv => !recentSet.has(inv.id));
  
  return {
    primary: contextWords,
    perpendicular: perpedicular.terms
  };
}
```

---

## Three Inverse Pools (Pseudocode)

### Soft Inverses (High Novelty)
```python
soft_inverses = [
  { id: "s1", terms: [term + "_gently_flipped" for term in context] },
  { id: "s2", terms: [term + "_reframed" for term in context] },
  { id: "s3", terms: [term + "_nuanced" for term in context] },
]
```

### Harsh Flips (High Saturation)
```python
harsh_inverses = [
  { id: "h1", terms: [antonym(term) for term in context] },      # Flip to opposites
  { id: "h2", terms: [term + "_inverted" for term in context] }, # Invert logic
  { id: "h3", terms: [randomize_order(context)] },                # Shuffle order
]
```

### Normal Variation (Default)
```python
normal_inverses = [
  { id: "n1", terms: context + ["lateral_expansion"] },
  { id: "n2", terms: context + ["adjacent_concept"] },
  { id: "n3", terms: reorder_by_frequency(context) },
]
```

---

## State Machine

```
START
  ↓
Collect signal (novelty, saturation)
  ↓
Query signal history (last 5)
  ↓
Determine mode:
  ├─ novelty > 0.7 AND saturation < 0.7 → SOFT
  ├─ saturation > 0.7 → HARSH
  └─ else → NORMAL
  ↓
Select inverse pool (soft/harsh/normal)
  ↓
Pick branch avoiding recency in recentBranches
  ↓
Generate perpendicular context
  ↓
Record used branch, decay others
  ↓
YIELD result
```

---

## Recency Memory (Prevent Reuse)

```python
class BranchMemory:
    def __init__(self):
        self.used = {}  # branch_id -> (count, last_step)
        self.step = 0
    
    def is_available(self, branch_id: str) -> bool:
        if branch_id not in self.used:
            return True
        
        count, last_step = self.used[branch_id]
        # Simple rule: need gap of at least 5 steps (or 3 if saturation < 0.5)
        min_gap = 3 if saturation < 0.5 else 5
        return (self.step - last_step) > min_gap
    
    def record(self, branch_id: str):
        self.used[branch_id] = (count + 1, self.step)
        self.step += 1
```

---

## Safety Checks

| Check | Rationale |
|-------|-----------|
| `currentAffinity > minAffinity` | Ensure we stay connected to source context |
| `recentBranches.length < MAX` | Don't accumulate old history indefinitely |
| `len(unused_branches) > 0` | Avoid forced reuse (keep inverse pool large enough) |
| `signal_history_length >= 3` | Need enough samples before mode inference |

---

## Example Flow

```
Session 1:
  Signals: [ (novelty=0.2, sat=0.3) ]
  Mode: NORMAL
  Branch picked: n1 (lateral_expansion)
  State.recentBranches: ["n1"]

Session 2:
  Signals: [ ..., (novelty=0.8, sat=0.2) ]
  Mode: SOFT
  Branch picked: s2 (reframed) [n1 still in recent, but different pool]
  State.recentBranches: ["n1", "s2"]

Session 3:
  Signals: [ ..., (novelty=0.3, sat=0.9) ]
  Mode: HARSH
  Branch picked: h1 (antonym) [n1 still in recent, s2 recent but harsh pool]
  State.recentBranches: ["n1", "s2", "h1"]

Session 4:
  Signals: [ ..., (novelty=0.6, sat=0.4) ]
  Mode: NORMAL
  n1 still in recent → try n2 (adjacent_concept)
  State.recentBranches: ["s2", "h1", "n2"]  [n1 aged out]
```

---

## When to Tune Thresholds

- **If too many SOFT modes:** Increase `noveltyHigh` (e.g., 0.7 → 0.8)
- **If too many HARSH modes:** Increase `saturationHigh` (e.g., 0.7 → 0.8)
- **If seeing meta-saturation (escape paths stagnate):** Increase inverse pool size or lower min_gap
- **If feeling disconnected from source:** Raise `minAffinity` (e.g., 0.4 → 0.5)

---

## Integration Checklist

- [ ] Define soft, harsh, and normal inverse pools for your domain
- [ ] Implement signal collection (how to measure novelty & saturation)
- [ ] Create PerpendularState struct with thresholds
- [ ] Add BranchMemory to track recent usage
- [ ] Implement selectInverseType() logic
- [ ] Wire into bridge_plan_perpendicular_meditations()
- [ ] Test mode transitions with synthetic signals
- [ ] Monitor for cascade lock; adjust inverse pools if needed

