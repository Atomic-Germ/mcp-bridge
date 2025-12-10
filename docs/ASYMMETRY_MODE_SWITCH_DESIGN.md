# Graded Asymmetry Mode-Switch Heuristics

## Overview

A continuous-valued decision system that replaces binary mode switches with graded asymmetry weights. Instead of deciding "switch or don't switch," the system computes a **degree of asymmetry** (0-1) when overlapping concepts are similar but not identical (Jaccard near threshold), then recommends switch **strength** accordingly.

**Core insight:** Imperfection near the decision threshold creates *higher sensitivity* to directional imbalance, enabling exponentially gentler switches for near-identical concepts and aggressively strong switches for imbalanced ones.

---

## The Imperfection Paradox

When concepts have Jaccard similarity *near* the decision threshold:
- They are **not identical** (not perfect), yet highly **overlapping**
- This imperfection zone is where **asymmetry matters most**
- The system must be *more* sensitive to directional cues precisely when similarity is high

**Paradoxical principle:**
- **S ≈ T AND balanced** → asymmetry ≈ 0 → strength ≈ 0.5 (maintain, gentle nudge)
- **S ≈ T AND imbalanced** → asymmetry ≈ 1 → strength ≈ 0.0 or 1.0 (aggressive switch)
- **S far from T** → disable gradient (binary logic takes over)

This inversion ensures that **similarity is NOT the deciding factor**; instead, **directional imbalance** drives mode-switch decisions at the critical threshold.

---

## Mathematical Core

### Jaccard-Proximity Activation

The gradient mechanism activates only within a critical band around the decision threshold:

```
Proximity(J, T, ε) = 1 - (|J - T| / ε)

Where:
  J = Jaccard similarity ∈ [0,1]
  T = decision threshold ∈ [0,1]
  ε = critical band width (e.g., 0.1)
  
Activation: proximity > 0 only when |J - T| < ε
```

**Why:** Outside the critical band, discrete logic dominates. Inside, gradient modulation takes over.

### Directional Asymmetry

Compute the magnitude and direction of conceptual imbalance:

```
Imbalance = (|A \ B| - |B \ A|) / |A ∪ B|

Where:
  A \ B = elements only in A (cardinality |A \ B|)
  B \ A = elements only in B (cardinality |B \ A|)
  A ∪ B = union
  
Range: [-1, 1]  (negative = A smaller, positive = B smaller)
```

**Why:** Tells us which concept is "larger" or "more exclusive" and by how much.

### Asymmetry Degree (Within Critical Band)

Combine proximity and imbalance into a unified score:

```
AsymmetryDegree = Proximity(J,T,ε) × |Imbalance|

Range: [0, 1]
  0 = perfectly symmetric pair (despite similar J)
  1 = maximally directional imbalance
```

**Key:** Asymmetry degree is **only computed** when proximity > 0. Otherwise, return 0.

### Mode-Switch Strength

Map asymmetry degree to a decision strength (0 = strong switch to A, 0.5 = no switch, 1 = strong switch to B):

```
SwitchStrength = 0.5 + Direction × AsymmetryDegree × Amplification × Proximity²

Where:
  Direction = sign(|B\A| - |A\B|)  ∈ [-1, +1]
  Amplification ∈ [0.5, 2.0]  (tune sensitivity)
  Proximity² ∈ [0, 1]  (sharpen gradient near threshold)
  
Final: clamp(SwitchStrength, 0.0, 1.0)
```

**Interpretation:**
- `strength = 0.0` → strongly recommend switch to A's mode
- `strength = 0.5` → neutral (maintain current mode)
- `strength = 1.0` → strongly recommend switch to B's mode

---

## Algorithm Signature

### Primary Function

```python
def compute_graded_asymmetry(
    A: Set[Any],
    B: Set[Any],
    threshold: float = 0.6,
    epsilon: float = 0.1,
    amplification: float = 1.0,
) -> tuple[float, float]:
    """
    Compute graded asymmetry and mode-switch strength.
    
    Args:
        A, B: Concept sets (e.g., words, tokens, embeddings)
        threshold: Jaccard decision boundary (typically 0.6-0.8)
        epsilon: Critical band width (typically 0.05-0.15)
        amplification: Sensitivity scaling factor (0.5-2.0)
    
    Returns:
        (asymmetry_score, switch_strength) ∈ [0,1] × [0,1]
    """
    # Guard against empty sets
    if not A or not B:
        return (0.0, 0.5)
    
    # Compute cardinalities
    intersection = len(A & B)
    union = len(A | B)
    only_a = len(A - B)
    only_b = len(B - A)
    
    # Jaccard similarity
    jaccard = intersection / union if union > 0 else 0.0
    
    # Proximity: activated only near threshold
    delta = abs(jaccard - threshold)
    if delta >= epsilon:
        # Outside critical band: return neutral
        return (0.0, 0.5)
    
    proximity = 1.0 - (delta / epsilon)  # ∈ [0, 1]
    
    # Directional imbalance
    imbalance = (only_a - only_b) / union  # ∈ [-1, 1]
    
    # Asymmetry degree
    asymmetry = proximity * abs(imbalance)  # ∈ [0, 1]
    
    # Mode-switch strength with amplification
    direction = 1.0 if only_b > only_a else -1.0
    raw_strength = 0.5 + direction * asymmetry * amplification * (proximity ** 2)
    switch_strength = max(0.0, min(1.0, raw_strength))
    
    return (asymmetry, switch_strength)
```

### Usage Pattern

```python
# Detect overlapping concepts (e.g., from recent meditations)
concept_a = {"gradient", "threshold", "imperfect"}
concept_b = {"gradient", "threshold", "asymmetry"}

# Compute asymmetry
asymmetry, strength = compute_graded_asymmetry(
    concept_a, concept_b,
    threshold=0.65,
    epsilon=0.12,
    amplification=1.5
)

# Interpret result
if asymmetry > 0.7:
    print(f"High asymmetry ({asymmetry:.2f}): consider mode switch with strength {strength:.2f}")
elif asymmetry > 0.3:
    print(f"Moderate asymmetry ({asymmetry:.2f}): gentle suggestion")
else:
    print(f"Low asymmetry ({asymmetry:.2f}): maintain current mode")
```

---

## Failure Modes & Safeguards

### Failure 1: Redundant Convergence (J → 1.0)

**Symptom:** Concepts become almost identical; gradient oscillates wildly.  
**Root cause:** As only_a, only_b → 0, the imbalance computation becomes noise-sensitive. Numerically: `(0 - 0) / union` ≈ 0, but floating-point errors dominate.  
**Safeguard:**
```python
# Clamp imbalance to avoid numerical noise
imbalance_safe = (only_a - only_b) / max(union, 1)
# Add epsilon-smoothing
imbalance_safe = imbalance_safe / (1.0 + epsilon_smoothing)
```

### Failure 2: Diffuse Divergence (J → 0.0)

**Symptom:** Concepts are very different; gradient "leaks" to spurious size differences.  
**Root cause:** When union >> intersection, `|A\B|/|A∪B|` loses semantic meaning; asymmetry becomes a random walk.  
**Safeguard:**
```python
# Outside critical band, disable gradient entirely
if delta >= epsilon:
    return (0.0, 0.5)  # Neutral, let discrete logic handle it
```

### Failure 3: Threshold Paralysis (|J - T| ≈ ε/2)

**Symptom:** Small Jaccard fluctuations cause large phase-lagged oscillations in mode recommendations.  
**Root cause:** "Static" constraint (fixed threshold) creates hysteresis lock; gradient recommends switching while discrete layer just switched.  
**Safeguard:**
```python
# Add hysteresis history to dampen oscillations
def apply_hysteresis(
    current_strength,
    recent_strengths: list[float],
    decay_rate: float = 0.9
) -> float:
    """Smooth mode-switch recommendations using recent history."""
    if len(recent_strengths) < 2:
        return current_strength
    
    # Weighted average with decay
    weighted = current_strength
    for i, prev_strength in enumerate(recent_strengths[-3:]):
        weight = decay_rate ** (i + 1)
        weighted = (weighted + prev_strength * weight) / (1.0 + weight)
    
    return weighted
```

---

## Integration with Bridge

Extend `bridge_suggest_mode_switch()` to return graded strength:

```python
def bridge_suggest_mode_switch_graded(
    recent_concepts: list[list[str]],
    current_mode: str,
    threshold: float = 0.65,
    epsilon: float = 0.12,
) -> tuple[str, float]:
    """
    Suggest mode switch with graded strength instead of binary.
    
    Args:
        recent_concepts: Last 2-3 concept sets from meditations
        current_mode: "diverge" or "converge"
        threshold: Jaccard decision boundary
        epsilon: Critical band width
    
    Returns:
        (suggested_mode, confidence_strength) ∈ ["diverge"|"converge"] × [0,1]
    """
    if len(recent_concepts) < 2:
        return (current_mode, 0.5)  # Not enough data
    
    # Compare most recent concepts
    a = set(recent_concepts[-2])
    b = set(recent_concepts[-1])
    
    asymmetry, strength = compute_graded_asymmetry(
        a, b,
        threshold=threshold,
        epsilon=epsilon,
        amplification=1.5
    )
    
    # Threshold to decide if switch is recommended
    if strength < 0.4:
        suggested = "converge"  # Strong push toward convergence
    elif strength > 0.6:
        suggested = "diverge"   # Strong push toward divergence
    else:
        suggested = current_mode  # Maintain (strength ≈ 0.5)
    
    return (suggested, strength)
```

---

## Tuning Parameters

| Parameter | Default | Range | Meaning |
|-----------|---------|-------|---------|
| `threshold` | 0.65 | 0.5-0.8 | Jaccard decision boundary |
| `epsilon` | 0.12 | 0.05-0.20 | Critical band width (how close to threshold to activate gradient) |
| `amplification` | 1.0 | 0.5-2.0 | Sensitivity multiplier (higher = more aggressive switches) |
| `hysteresis_decay` | 0.9 | 0.7-0.99 | How much to dampen oscillations (higher = more damping) |
| `smoothing_epsilon` | 0.01 | 0.001-0.05 | Numerical stability guard for convergent concepts |

### When to Adjust

- **Too many false switches:** Increase `epsilon` or lower `amplification`
- **Switches too conservative:** Decrease `epsilon` or raise `amplification`
- **Oscillating recommendations:** Increase `hysteresis_decay` or widen `epsilon`
- **Redundant concepts not triggering:** Lower `smoothing_epsilon`

---

## Example Scenarios

### Scenario 1: High Novelty (Growing Concepts)

```
Recent concept A: {gradient, threshold, imperfect}          |A| = 3
Recent concept B: {gradient, threshold, imperfect, asymmetry} |B| = 4
Intersection: {gradient, threshold, imperfect}              |A∩B| = 3
Union: {gradient, threshold, imperfect, asymmetry}          |A∪B| = 4

Jaccard = 3/4 = 0.75
Threshold = 0.65, Epsilon = 0.12

Delta = |0.75 - 0.65| = 0.10 < 0.12 → Inside critical band ✓
Proximity = 1 - (0.10/0.12) ≈ 0.167
Only_A = 0, Only_B = 1
Imbalance = (0 - 1) / 4 = -0.25
Asymmetry = 0.167 × 0.25 ≈ 0.042

Direction = -1 (B is larger)
SwitchStrength = 0.5 + (-1) × 0.042 × 1.0 × (0.167²) ≈ 0.496

Result: (asymmetry=0.042, strength=0.496) → Maintain, very gentle nudge toward B
```

### Scenario 2: Severe Imbalance (One Concept Much Larger)

```
Concept A: {word, frequency, pattern}         |A| = 3
Concept B: {word, frequency, pattern, ... +17 more}  |B| = 20
Intersection: 3
Union: 20

Jaccard = 3/20 = 0.15 (far below threshold 0.65)
→ Outside critical band, return (0.0, 0.5) → Discrete logic decides
```

### Scenario 3: Critical Threshold (Perfectly Symmetric Near-Miss)

```
Concept A: {A, B, C, X}              |A| = 4
Concept B: {A, B, C, Y}              |B| = 4
Intersection: 3
Union: 5

Jaccard = 3/5 = 0.60
Threshold = 0.65, Epsilon = 0.12

Delta = |0.60 - 0.65| = 0.05 < 0.12 → Inside critical band ✓
Proximity = 1 - (0.05/0.12) ≈ 0.583
Only_A = 1 (X), Only_B = 1 (Y)
Imbalance = (1 - 1) / 5 = 0
Asymmetry = 0.583 × 0 = 0

SwitchStrength = 0.5 + 0 = 0.5

Result: (asymmetry=0.0, strength=0.5) → Perfectly symmetric → Maintain mode
```

---

## Integration Checklist

- [ ] Implement `compute_graded_asymmetry()` function
- [ ] Define domain-specific concept extraction (embeddings, tokenization, etc.)
- [ ] Add hysteresis memory to track recent switch recommendations
- [ ] Wire into `bridge_suggest_mode_switch_graded()`
- [ ] Test with synthetic concept sets (overlapping, disjoint, imbalanced)
- [ ] Benchmark Jaccard threshold sensitivity (vary threshold, measure switch frequency)
- [ ] Monitor for oscillation patterns; adjust hysteresis if needed
- [ ] Document threshold choice rationale for your use case

---

## Future Enhancements

- **Adaptive epsilon:** Widen critical band when noise is high, narrow when decisions are stable
- **Multi-dimensional asymmetry:** Include semantic similarity (not just set cardinality)
- **Weighted concepts:** Not all elements are equally important; weight by frequency or salience
- **Cached Jaccard:** Precompute and memoize similarities to avoid recomputation
- **Mode history integration:** Incorporate how long system has been in current mode (switches cost)
- **Signal-aware thresholds:** Use novelty/saturation from perpendicular planner to dynamically adjust epsilon

