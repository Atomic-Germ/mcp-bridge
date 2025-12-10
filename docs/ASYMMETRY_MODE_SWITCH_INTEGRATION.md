# Asymmetry Mode-Switch: Integration & Visual Guide

## Visual: The Asymmetry Decision Space

```
                    Switch Strength (0-1)
                           ▲
                     1.0   │
           Aggressive       │
            Switch to B     │     ╱╲
                           │    ╱  ╲
                     0.8   │   ╱    ╲
                           │  ╱      ╲
                     0.6   │ ╱        ╲
                           │╱          ╲
                     0.5   ├────────────┤─────  NEUTRAL (Maintain)
                           │╲          ╱
                     0.4   │ ╲        ╱
                           │  ╲      ╱
                     0.2   │   ╲    ╱
           Aggressive       │    ╲  ╱
            Switch to A     │     ╲╱
                     0.0   │
                           └─────────────────► Asymmetry Degree (0-1)
                               0.0        1.0

    Key insight: Strength depends BOTH on:
    - How asymmetric the concepts are (X-axis)
    - Which direction the imbalance leans (slope direction)
```

---

## Core State Machine

```
START
  │
  ├─ Collect Concepts A and B
  │
  ├─ Compute Jaccard Similarity J = |A∩B| / |A∪B|
  │
  ├─ Check Activation: |J - T| < ε?
  │  ├─ NO  → Outside critical band
  │  │        Return (0.0, 0.5)
  │  │        Let DISCRETE logic decide
  │  │
  │  └─ YES → Inside critical band
  │           Compute Proximity = 1 - |J-T|/ε
  │
  ├─ Compute Imbalance = (|A\B| - |B\A|) / |A∪B|
  │
  ├─ Asymmetry = Proximity × |Imbalance|
  │
  ├─ Direction = sign(|B\A| - |A\B|)
  │
  ├─ SwitchStrength = 0.5 + Direction × Asymmetry × Proximity²
  │
  └─ Return (Asymmetry, SwitchStrength)
       │
       ├─ If strength < 0.4  → Switch to A mode
       ├─ If strength > 0.6  → Switch to B mode
       └─ If strength ≈ 0.5  → Maintain current mode
```

---

## Decision Boundary Visualization

```
Perfect                                    Jaccard
Mismatch    ←──────────────────────────────────→  Perfect
  (0)                                               Match
                                                    (1)

  ├────────────┤ ε ├────────────┤ ε ├────────────┤
  
0.0          │     0.65       │     1.0
             │ CRITICAL BAND  │
             │ (Gradient      │
             │  Active Here)  │
             │
        Threshold T = 0.65
        Epsilon ε = 0.12
        Active range: [0.53, 0.77]


Example mapping:
  J = 0.50 (well below threshold)
    │J - T│ = 0.15 > ε → DISCRETE LOGIC
    Return: (0.0, 0.5)
  
  J = 0.62 (just below threshold)
    │J - T│ = 0.03 < ε → GRADIENT ACTIVE
    Proximity ≈ 0.75 → High activation
    (compute asymmetry and strength)
  
  J = 0.65 (exactly at threshold)
    │J - T│ = 0.0 < ε → PEAK ACTIVATION
    Proximity = 1.0 → Maximum sensitivity
    (asymmetry determines outcome)
  
  J = 0.80 (well above threshold)
    │J - T│ = 0.15 > ε → DISCRETE LOGIC
    Return: (0.0, 0.5)
```

---

## Algorithm Flow with Actual Computation

```
INPUT: A, B, T=0.65, ε=0.12

STEP 1: Cardinalities
  inter = |A ∩ B| = 3
  union = |A ∪ B| = 5
  only_a = |A \ B| = 1
  only_b = |B \ A| = 1

STEP 2: Jaccard
  J = 3/5 = 0.60

STEP 3: Activation Check
  δ = |0.60 - 0.65| = 0.05
  Is δ < 0.12? → YES, activate gradient

STEP 4: Proximity
  prox = 1 - (0.05 / 0.12) = 0.583

STEP 5: Imbalance
  imb = (1 - 1) / 5 = 0.0

STEP 6: Asymmetry
  asym = 0.583 × 0.0 = 0.0

STEP 7: Direction
  dir = sign(1 - 1) = 0

STEP 8: Strength
  str = 0.5 + 0 × 0.0 × (0.583²)
      = 0.5

OUTPUT: (asymmetry=0.0, strength=0.5)
        → Perfectly symmetric → MAINTAIN
```

---

## Integration Roadmap

### Phase 1: Core Implementation (Week 1)

```python
# Step 1: Add function
def compute_graded_asymmetry(A, B, threshold=0.65, epsilon=0.12):
    # ... implementation ...
    return (asymmetry, strength)

# Step 2: Test with synthetic data
test_cases = [
    ({"a","b","c"}, {"a","b","c"}, "identical"),
    ({"a","b","c"}, {"a","b","c","d"}, "subset"),
    ({"a","b"}, {"c","d","e"}, "disjoint"),
]

# Step 3: Validate output ranges
assert all(0 <= asym <= 1 for _, asym in results)
assert all(0 <= str <= 1 for _, str in results)
```

### Phase 2: Bridge Integration (Week 2)

```python
# Step 1: Extend bridge_suggest_mode_switch()
def bridge_suggest_mode_switch_graded(recent_concepts, current_mode):
    a = set(recent_concepts[-2])
    b = set(recent_concepts[-1])
    asym, strength = compute_graded_asymmetry(a, b)
    
    # Decision logic
    if strength < 0.4:
        return ("converge", strength)
    elif strength > 0.6:
        return ("diverge", strength)
    else:
        return (current_mode, strength)

# Step 2: Log strength recommendations
# Track: how often was strength < 0.4 vs > 0.6 vs ≈ 0.5?

# Step 3: Monitor oscillations
# If strength jumps 0.3→0.7 repeatedly, apply hysteresis
```

### Phase 3: Perpendicular Planner Synergy (Week 3)

```python
# Combine asymmetry with perpendicular planning:

def plan_perpendicular_with_asymmetry(
    context_words,
    asymmetry_score,
    switch_strength
):
    """
    Use asymmetry to inform inverse pool selection.
    """
    if asymmetry_score < 0.2:
        # Low asymmetry = balanced concepts
        # Use soft inverses (gentle variation)
        return plan_soft_perpendicular(context_words)
    elif asymmetry_score > 0.7:
        # High asymmetry = imbalanced concepts
        # Use harsh flips (strong escape)
        return plan_harsh_perpendicular(context_words)
    else:
        # Moderate asymmetry
        return plan_default_perpendicular(context_words)
```

### Phase 4: Tuning & Optimization (Ongoing)

```
Metric to track: Decision confidence over sessions
  - High asymmetry → high confidence in switch
  - Low asymmetry + high strength → potential false positive
  
Adaptive tuning:
  - If oscillations detected → increase hysteresis or ε
  - If switches too rare → increase amplification
  - If switches too frequent → decrease amplification
```

---

## Comparison: Three Integration Approaches

### Approach 1: Minimal (Drop-in Replacement)

```python
# Before: Binary mode switch
if bridge_should_switch_mode(concepts):
    mode = "converge" if mode == "diverge" else "diverge"

# After: Graded mode switch with strength
suggested_mode, strength = bridge_suggest_mode_switch_graded(concepts, mode)
if strength > 0.65:  # Strong recommendation
    mode = suggested_mode
elif strength > 0.55:  # Weak recommendation
    # Log but don't act yet; wait for confirmation
    log_tentative_switch(suggested_mode, strength)
```

### Approach 2: Moderate (With Hysteresis)

```python
# Track recent switch strengths
strength_history = [...]

def smooth_suggestion(current_strength, history):
    return apply_hysteresis(current_strength, history, decay=0.9)

suggested_mode, raw_strength = bridge_suggest_mode_switch_graded(concepts, mode)
smooth_strength = smooth_suggestion(raw_strength, strength_history)

if smooth_strength > 0.65:
    mode = suggested_mode
```

### Approach 3: Full (With Perpendicular + Asymmetry)

```python
# Combine all three systems:
suggested_mode, asymmetry, strength = compute_full_mode_decision(
    recent_concepts=concepts,
    current_mode=mode,
    heuristic_state=perpendicular_state  # novelty/saturation
)

# Use asymmetry to inform perpendicular planning
plan = bridge_plan_perpendicular_meditations_with_state(
    context_words=context,
    state=perpendicular_state,
    asymmetry_signal=asymmetry
)

# Execute meditations
meditation_a = creative_meditate(plan.primary)
meditation_b = creative_meditate(plan.perpendicular)

# Log and update state
log_meditations(meditation_a, meditation_b, strength, asymmetry)
```

---

## Practical Debugging

### Scenario 1: Always Returns 0.5

**Diagnosis:**
```python
# Check if gradient is activating
a = set(recent_concepts[-2])
b = set(recent_concepts[-1])
jaccard = len(a & b) / len(a | b)
delta = abs(jaccard - 0.65)

if delta >= 0.12:
    print("Outside critical band! Gradient disabled.")
    print(f"  J={jaccard:.3f}, δ={delta:.3f}, ε=0.12")
else:
    print("Inside band. Check imbalance computation.")
    print(f"  |A\B|={len(a-b)}, |B\A|={len(b-a)}")
```

**Fix:** Widen epsilon, lower threshold, or increase concept similarity.

### Scenario 2: Oscillating Wildly

**Diagnosis:**
```python
# Track strength history
strength_over_time = [0.2, 0.8, 0.3, 0.7, 0.4, ...]

# Calculate variance
variance = np.var(strength_over_time)
if variance > 0.1:
    print("High variance! Oscillating pattern detected.")
    print(f"  Variance: {variance:.3f}")
```

**Fix:** Increase hysteresis decay, widen epsilon, or cap amplification.

### Scenario 3: Too Conservative (Rarely Switches)

**Diagnosis:**
```python
# Count switches
switch_count = sum(1 for s in strength_history if s < 0.4 or s > 0.6)
switch_frequency = switch_count / len(strength_history)

if switch_frequency < 0.1:
    print("Very conservative! Switch frequency < 10%")
```

**Fix:** Lower threshold, increase amplification, or narrow epsilon.

---

## Testing Template

```python
def test_compute_graded_asymmetry():
    # Test 1: Identical sets
    a = {"x", "y", "z"}
    b = {"x", "y", "z"}
    asym, str = compute_graded_asymmetry(a, b)
    assert asym == 0.0, "Identical sets should have zero asymmetry"
    assert str == 0.5, "Identical sets should have neutral strength"
    
    # Test 2: Subset relationship
    a = {"x", "y", "z"}
    b = {"x", "y", "z", "w"}
    asym, str = compute_graded_asymmetry(a, b)
    assert 0 <= asym <= 1, "Asymmetry must be in [0,1]"
    assert 0 <= str <= 1, "Strength must be in [0,1]"
    
    # Test 3: Disjoint sets
    a = {"x", "y"}
    b = {"z", "w"}
    asym, str = compute_graded_asymmetry(a, b)
    assert asym == 0.0, "Disjoint sets should return 0 (outside band)"
    assert str == 0.5, "Disjoint sets should be neutral"
    
    # Test 4: Edge case - empty sets
    a = set()
    b = {"x"}
    asym, str = compute_graded_asymmetry(a, b)
    assert asym == 0.0 and str == 0.5, "Empty sets should be safe"
    
    print("All tests passed!")

test_compute_graded_asymmetry()
```

---

## Parameter Tuning Worksheet

```
Current Settings:
  threshold = 0.65
  epsilon = 0.12
  amplification = 1.0

Observation: [describe what you're seeing]
  e.g., "Switches too rare"

Hypothesis: [root cause]
  e.g., "Critical band too narrow"

Adjustment: [what to change]
  e.g., "Increase epsilon from 0.12 → 0.15"

Expected Impact: [what should improve]
  e.g., "More concepts activate gradient"

Validation: [how to measure success]
  e.g., "Switch frequency increases to 15-20%"

Result: [did it work?]
  ✓ Yes / ✗ No / ? Unclear

Notes: [for next iteration]
```

---

## Checklist for Production

- [ ] Implement `compute_graded_asymmetry()` with all guards
- [ ] Add input validation (non-empty sets, threshold ∈ [0,1], etc.)
- [ ] Implement hysteresis smoothing
- [ ] Wire into `bridge_suggest_mode_switch_graded()`
- [ ] Log asymmetry/strength to monitoring system
- [ ] Set up alerts for oscillation patterns
- [ ] Document threshold choice rationale
- [ ] Create tuning guide for domain experts
- [ ] Test with real concept sets (min. 100 sessions)
- [ ] Benchmark performance (milliseconds per decision)
- [ ] Plan A/B test: graded vs. binary mode-switch

