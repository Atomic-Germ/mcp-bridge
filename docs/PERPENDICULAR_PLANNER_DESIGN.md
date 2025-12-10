# Context-Dependent Perpendicular Planner

## Overview

A heuristic-driven system that dynamically modulates perpendicular path selection based on novelty and saturation signals. Instead of choosing the same perpendicular inversion every time, the planner conditionally selects inverse strength and type based on recent system state.

---

## Core Mechanism

**Perpendicular generation modulated by heuristic feedback:**

1. **Heuristic Sensing** — Detect novelty (new patterns emerging) and saturation (repetition indicators)
2. **Orthogonal Response** — Shift into perpendicular branching logic as alternative/contrasting approach
3. **Dynamic Inversion** — Apply signal-driven thresholds:
   - High novelty ⟹ softer inverses (gentle variation, preserve context)
   - High saturation ⟹ harsher flips (strong contrast, escape stagnation)
4. **Feedback Loop** — Recent signal history influences generator to avoid reusing same escape patterns

---

## Minimal Viable State Parameter

The `state` parameter for `bridge_plan_perpendicular_meditations()` should contain:

```typescript
interface PerpendularState {
  mode: "NORMAL" | "SOFT" | "HARSH";
  
  signals: Array<{
    novelty: number;      // 0.0 - 1.0
    saturation: number;   // 0.0 - 1.0
  }>;                     // Last K samples (default K=5)
  
  recentBranches: string[]; // Last M perpendicular moves used (default M=3)
  
  thresholds: {
    noveltyHigh: number;      // e.g., 0.7
    saturationHigh: number;   // e.g., 0.7
    minAffinity: number;      // e.g., 0.4
  };
  
  currentAffinity: number;    // Connection to source context (0.0 - 1.0)
}
```

**Mode selection logic:**
- If `novelty > thresholds.noveltyHigh` AND `saturation < thresholds.saturationHigh` → `SOFT`
- Else if `saturation > thresholds.saturationHigh` → `HARSH`
- Else → `NORMAL`

---

## Implementation Patterns

### Pattern 1: Multi-Armed Bandit Selector

Represent perpendicular moves as "arms" with context-dependent payoff:

```python
class PerpendularBandit:
    def __init__(self, soft_arms, harsh_arms, normal_arms):
        self.soft_arms = soft_arms        # Small deviation generators
        self.harsh_arms = harsh_arms      # Large deviation generators
        self.normal_arms = normal_arms    # Default generators
        
    def select(self, state: PerpendularState):
        if state.mode == "SOFT":
            return self._ucb_select(self.soft_arms, state)
        elif state.mode == "HARSH":
            return self._ucb_select(self.harsh_arms, state, exploitation=0.6)
        else:
            return self._ucb_select(self.normal_arms, state)
    
    def _ucb_select(self, arms, state, exploitation=0.3):
        # Penalize recently used arms
        recent_penalty = {arm_id: 0.2 for arm_id in state.recentBranches}
        # Apply UCB with penalties
        return max(arms, key=lambda arm: ucb_score(arm, recent_penalty))
```

### Pattern 2: Stateful Branching with Decay

Track recent escape patterns and apply temporal decay:

```python
class PerpendicularMemory:
    def __init__(self, decay_rate=0.85):
        self.memory = {}  # branch_id -> (count, last_used_step)
        self.decay_rate = decay_rate
        self.step = 0
        
    def can_reuse(self, branch_id: str, state: PerpendularState) -> bool:
        if branch_id not in self.memory:
            return True
        
        count, last_step = self.memory[branch_id]
        # Decay penalty based on how recently used and saturation level
        min_gap = int(5 / (state.signals[-1].saturation + 0.1))
        return (self.step - last_step) > min_gap
    
    def record_branch(self, branch_id: str):
        if branch_id not in self.memory:
            self.memory[branch_id] = (0, self.step)
        count, _ = self.memory[branch_id]
        self.memory[branch_id] = (count + 1, self.step)
        self.step += 1
```

### Pattern 3: Signal-Threshold Gating

Simple deterministic routing based on signal ranges:

```python
def route_perpendicular(state: PerpendularState, context_words):
    novelty = state.signals[-1].novelty
    saturation = state.signals[-1].saturation
    
    if novelty > state.thresholds.noveltyHigh and \
       saturation < state.thresholds.saturationHigh:
        # Soft path: preserve context, gentle variations
        return plan_soft_perpendicular(context_words, state)
    
    elif saturation > state.thresholds.saturationHigh:
        # Harsh path: strong contrast, escape saturation
        return plan_harsh_perpendicular(context_words, state)
    
    else:
        # Default: standard perpendicular variation
        return plan_default_perpendicular(context_words, state)
```

---

## Failure Modes & Safeguards

### Failure 1: Cascade Lock
**Problem:** Successive perpendicular steps become repetitive ("anti-novelty").  
**Safeguard:** Monitor escape path novelty separately; if escape path saturation rises, force a new type of inversion.

### Failure 2: Override Starvation
**Problem:** Tight affinity thresholds prevent mode switches from triggering.  
**Safeguard:** Ensure `minAffinity` is realistic (0.3-0.5); track time-since-last-switch and force override if threshold exceeded.

### Failure 3: Orthogonal Exhaustion
**Problem:** Finite inverse set → harsh flips reused too often → meta-saturation.  
**Safeguard:** Maintain larger inverse pools; use memory decay to allow reuse after sufficient gap; dynamically generate new inverses if reuse pressure is high.

---

## Integration with Bridge

Extend `bridge_plan_perpendicular_meditations()`:

```python
def bridge_plan_perpendicular_meditations_with_state(
    context_words: List[str],
    state: Optional[PerpendularState] = None,
    use_heuristic_gating: bool = True,
) -> PerpendicularPlan:
    """
    Plan paired meditations with context-dependent inversion.
    
    Args:
        context_words: Primary context for meditation
        state: Optional PerpendularState with heuristic signals
        use_heuristic_gating: If True, modulate inverse selection by state
    
    Returns:
        PerpendicularPlan with (primary, perpendicular) context pairs
    """
    if state is None:
        state = PerpendularState(mode="NORMAL")
    
    if use_heuristic_gating:
        # Route based on novelty/saturation
        inverse_type = determine_inverse_type(state)
        perpendicular_pool = select_inverse_pool(inverse_type)
    else:
        perpendicular_pool = default_inverse_pool
    
    # Generate perpendicular context avoiding recent reuse
    perp_context = generate_perpendicular(
        context_words,
        pool=perpendicular_pool,
        exclude=state.recentBranches,
    )
    
    return PerpendicularPlan(
        primary=(context_words, "Direct: Mode-aware path"),
        perpendicular=(perp_context, f"Inverse: {inverse_type}"),
    )
```

---

## Example Flow

1. **Detect signals:** Analyze recent meditations for novelty/saturation
2. **Update state:** Record signals; compute current affinity
3. **Route:** Use state.mode to select inverse type
4. **Plan perpendiculars:** Generate two context sets with appropriate inversion
5. **Execute meditations:** Run both paths independently
6. **Record result:** Log which perpendicular branch was used, update memory
7. **Decay:** Gradually allow recent branches to be reused (if gap sufficient)

---

## Tuning Parameters

| Parameter | Default | Range | Meaning |
|-----------|---------|-------|---------|
| `noveltyHigh` | 0.7 | 0.5-0.9 | Signal threshold for "high novelty" |
| `saturationHigh` | 0.7 | 0.5-0.9 | Signal threshold for "high saturation" |
| `minAffinity` | 0.4 | 0.2-0.6 | Minimum context connection to allow harsh flips |
| `signalHistoryLen` | 5 | 3-10 | How many recent samples to track |
| `recentBranchesMemory` | 3 | 2-5 | How many recent branches to exclude from reuse |
| `decayRate` | 0.85 | 0.7-0.95 | How quickly recent-use penalties decay |

---

## Future Enhancements

- **Adaptive thresholds:** Learn optimal novelty/saturation thresholds from session history
- **Cross-domain inverse pools:** Different inverses for different context domains
- **Affinity-aware softness:** Modulate inverse strength by current affinity (lower affinity → harsher)
- **Multi-signal integration:** Add signal_smoothness, signal_diversity, etc. beyond novelty/saturation
- **Failure recovery:** Auto-detect cascade lock and auto-inject rescue perpendicular

