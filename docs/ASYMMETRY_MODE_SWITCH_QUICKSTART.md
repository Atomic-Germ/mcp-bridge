# Asymmetry Mode-Switch: Quick Start

## The Idea in 30 Seconds

Instead of binary "switch or don't switch" decisions, use **graded asymmetry** to recommend *how strong* a mode switch should be.

**When overlapping concepts are similar but not identical (near decision threshold):**
1. Measure how **imbalanced** they are (directional excess)
2. Use imbalance to compute a **strength score** (0 = strong switch to A, 0.5 = maintain, 1 = strong switch to B)
3. Return both the **asymmetry score** AND the **switch strength** for decision-making

---

## Minimal Code (Python)

```python
def compute_graded_asymmetry(A, B, threshold=0.65, epsilon=0.12):
    """
    Args:
        A, B: sets of comparable items
        threshold: Jaccard decision boundary (0.5-0.8)
        epsilon: activation band around threshold (0.05-0.20)
    
    Returns:
        (asymmetry_score ∈ [0,1], switch_strength ∈ [0,1])
    """
    if not A or not B:
        return (0.0, 0.5)
    
    # Jaccard similarity
    inter = len(A & B)
    union = len(A | B)
    jaccard = inter / union if union > 0 else 0.0
    
    # Activate gradient only near threshold
    if abs(jaccard - threshold) >= epsilon:
        return (0.0, 0.5)  # Outside band, stay neutral
    
    # Proximity (strength of activation)
    proximity = 1.0 - (abs(jaccard - threshold) / epsilon)
    
    # Directional imbalance
    only_a = len(A - B)
    only_b = len(B - A)
    imbalance = abs(only_a - only_b) / union
    
    # Asymmetry degree
    asymmetry = proximity * imbalance
    
    # Mode-switch strength
    direction = 1.0 if only_b > only_a else -1.0
    strength = 0.5 + direction * asymmetry * (proximity ** 2)
    strength = max(0.0, min(1.0, strength))
    
    return (asymmetry, strength)


# Usage
concept_a = {"gradient", "threshold", "imperfect"}
concept_b = {"gradient", "threshold", "imperfect", "asymmetry"}

asym, strength = compute_graded_asymmetry(concept_a, concept_b)
print(f"Asymmetry: {asym:.2f}, Switch strength: {strength:.2f}")
# Output: Asymmetry: 0.04, Switch strength: 0.50 (maintain)
```

---

## Key Concepts

### Jaccard Similarity (J)
```
J = |A ∩ B| / |A ∪ B|

Example:
A = {a, b, c}     B = {a, b, c, d}
J = 3/4 = 0.75
```

### Critical Band
- Gradient logic **only activates** when `|J - threshold| < epsilon`
- Outside this band: use discrete (binary) logic
- Inside: use continuous asymmetry signal

### Directional Imbalance
```
How much larger is B than A (or vice versa)?

only_a = elements only in A
only_b = elements only in B
imbalance = |only_a - only_b| / union
```

### Asymmetry Degree
```
How imbalanced are the concepts, given they're similar?

asymmetry = proximity × |imbalance|
  where proximity = 1 - (|J - threshold| / epsilon)
```

### Switch Strength
```
How strongly should we recommend a mode switch?

strength = 0.0  → Switch strongly to A's mode
strength = 0.5  → Maintain current mode
strength = 1.0  → Switch strongly to B's mode
```

---

## Three Case Studies

### Case 1: Near-Identical Concepts (Symmetric)
```
A = {word, count, token}      |A| = 3
B = {word, count, token}      |B| = 3
Jaccard = 3/3 = 1.0

Result: Outside critical band (too far above threshold)
→ Return (0.0, 0.5) → Maintain mode
```

### Case 2: Similar with Imbalance (Asymmetric)
```
A = {gradient, threshold, imperfect}           |A| = 3
B = {gradient, threshold, imperfect, asymmetry} |B| = 4
Jaccard = 3/4 = 0.75

Delta = |0.75 - 0.65| = 0.10 < 0.12 ✓
Proximity = 1 - (0.10/0.12) ≈ 0.17
Only_a = 0, Only_b = 1
Imbalance = (0 - 1) / 4 = -0.25
Asymmetry = 0.17 × 0.25 ≈ 0.04

Result: (0.04, 0.50) → Gentle nudge, maintain
```

### Case 3: Very Different (Outside Band)
```
A = {concept, analysis}
B = {implementation, code, test, debug, refactor}
Jaccard = 0/7 = 0.0

Delta = |0.0 - 0.65| = 0.65 > 0.12 ✗
Result: (0.0, 0.5) → Discrete logic decides
```

---

## Interpreting Results

| Asymmetry | Strength | Meaning |
|-----------|----------|---------|
| ≈ 0.0 | ≈ 0.5 | Symmetric pair, no urgency to switch |
| 0.0-0.3 | 0.4-0.6 | Low asymmetry, gentle suggestion only |
| 0.3-0.7 | 0.3-0.7 | Moderate imbalance, consider switch |
| > 0.7 | < 0.3 or > 0.7 | High asymmetry, strong recommendation |

---

## Integration Pattern

### With Bridge Session

```python
def suggest_mode_switch_graded(recent_concepts, current_mode):
    """Suggest mode switch with graded strength."""
    if len(recent_concepts) < 2:
        return (current_mode, 0.5)
    
    a = set(recent_concepts[-2])
    b = set(recent_concepts[-1])
    
    asym, strength = compute_graded_asymmetry(a, b)
    
    # Threshold to decide
    if strength < 0.4:
        return ("converge", strength)
    elif strength > 0.6:
        return ("diverge", strength)
    else:
        return (current_mode, strength)
```

### With Perpendicular Planner

Combine with the perpendicular planner from the previous design:
- Use **asymmetry degree** to inform inverse pool selection
- High asymmetry → use harsher inverses (push toward imbalanced concept's side)
- Low asymmetry → use soft inverses (preserve both concepts)

---

## Parameters to Tune

```python
threshold = 0.65      # Where to place decision boundary
epsilon = 0.12        # Width of critical band
amplification = 1.0   # Sensitivity multiplier
```

### Rules of Thumb

- **threshold too low:** Too many concepts trigger gradient (noisy switches)
- **threshold too high:** Few concepts trigger gradient (misses opportunities)
- **epsilon too small:** Sharp switches, can oscillate
- **epsilon too large:** Soft switches, may miss decisions
- **amplification too high:** Over-react to imbalance
- **amplification too low:** Imbalance has little effect

---

## Common Failure Patterns & Fixes

### Problem: Oscillating Recommendations

**Symptom:** Strength jumps between 0.3 and 0.7 each step.

**Fix:** Widen epsilon or increase hysteresis:
```python
def apply_hysteresis(current, recent, decay=0.9):
    if len(recent) < 2:
        return current
    weighted = current
    for i, prev in enumerate(recent[-3:]):
        weight = decay ** (i + 1)
        weighted = (weighted + prev * weight) / (1.0 + weight)
    return weighted
```

### Problem: Too Few Switches Triggered

**Symptom:** (asymmetry, strength) always returns (0.0, 0.5).

**Fix:** Increase epsilon or lower threshold:
```python
epsilon = 0.15  # was 0.10
# or
threshold = 0.60  # was 0.65
```

### Problem: Too Many Spurious Switches

**Symptom:** Random small differences trigger large strength changes.

**Fix:** Decrease amplification or add concept size guards:
```python
amplification = 0.5  # was 1.0
# or
if len(A) < 2 or len(B) < 2:
    return (0.0, 0.5)  # Too small to trust
```

---

## Comparison: Binary vs. Graded

### Old (Binary)
```
if jaccard > threshold:
    recommend_switch = True  # All-in
else:
    recommend_switch = False  # All-out
```

**Downside:** No nuance at decision boundary; misses subtle asymmetries.

### New (Graded)
```
asymmetry, strength = compute_graded_asymmetry(A, B)
# strength ∈ [0,1] allows partial/gentle suggestions
```

**Upside:** Near-threshold decisions are nuanced; can recommend "gentle switch" vs "aggressive switch."

---

## Testing Checklist

- [ ] Test with symmetric near-threshold concepts → strength ≈ 0.5
- [ ] Test with imbalanced near-threshold concepts → strength != 0.5
- [ ] Test with far-from-threshold concepts → return (0.0, 0.5)
- [ ] Test with empty sets → return (0.0, 0.5)
- [ ] Verify strength ∈ [0, 1] (no NaN or overflow)
- [ ] Check oscillation behavior with hysteresis off/on
- [ ] Benchmark parameter sensitivity (vary epsilon, measure switch frequency)

---

## Next Steps

1. **Implement** `compute_graded_asymmetry()` in your bridge system
2. **Integrate** with `bridge_suggest_mode_switch()` to return graded strength
3. **Tune** threshold and epsilon for your concept domain
4. **Monitor** asymmetry/strength distributions across sessions
5. **Combine** with perpendicular planner for full context-aware mode selection

