# Fractal Meta-Iteration: Quick Start

## The Idea in 1 Minute

**Problem:** How do we let constraints evolve their own rules without creating paradoxes?

**Solution:** 
1. Make constraints have **three layers** (transparent predicate, semi-opaque meta, sealed history)
2. Critique engine proposes **new constraints** based on stability metrics
3. System recursively **mutates constraints at multiple nesting levels**
4. Safeguards prevent paradox via **intentional opacity** and **stabilization firewall**

**Result:** Self-modifying constraint system that can't look too closely at itself (by design), preventing Gödelian undecidability while enabling evolution.

---

## Core Insight: The Paradox You Can't Escape

When a system mutates its own rules, it hits a logical wall:

```
Problem:
  "The set of all constraints that don't mutate themselves"
  → This is Russell's paradox
  
Solution:
  Make the meta-mutation function OPAQUE (black-box)
  → It can be replaced, but never examined
  → Prevents the paradox while allowing evolution
  
Result:
  System evolves without being able to PROVE it's safe
  (Like Gödel's incompleteness theorem)
```

---

## Minimal Code: Three-Layer Constraint

```python
class Constraint:
    def __init__(self):
        # LAYER 1: Transparent (you can inspect and evaluate this)
        self.predicate: Callable = lambda ctx: evaluate_rule(ctx)
        
        # LAYER 2: Semi-opaque (you can replace but not examine)
        self.meta = {
            "mutagen": OpaqueFunction(...),      # Black-box mutation engine
            "stability_coefficient": 0.7,         # How resistant to change?
            "propagation_fractal": 1,             # How many children can spawn?
            "shadow_queue": [],                   # Buffered mutations (transactional)
            "opacity": 0.2                        # How hidden is this constraint?
        }
        
        # LAYER 3: Sealed (immutable history)
        self.provenance: HashChain = HashChain()  # Who changed what and when?
        
        # Operational
        self.nesting_level: int = 0              # How deep in recursion?

    def evaluate(self, context) -> Trilean:
        """Layer 1: Evaluate the rule (transparent)"""
        return self.predicate(context)
    
    def propose_mutation(self, delta, reason) -> Mutation:
        """Queue a mutation in shadow_queue (not yet applied)"""
        mutation = Mutation(
            target=self.constraint_id,
            delta=delta,
            reason=reason
        )
        self.meta["shadow_queue"].append(mutation)
        return mutation
    
    def commit_shadows(self) -> List[Constraint]:
        """Apply all buffered mutations atomically"""
        result = []
        for mutation in self.meta["shadow_queue"]:
            new_c = self.apply_mutation(mutation)
            result.append(new_c)
        self.meta["shadow_queue"].clear()
        return result
    
    def spawn_children(self, num: int) -> List[Constraint]:
        """Create child constraints at next nesting level"""
        if self.meta["propagation_fractal"] == 0:
            return []  # This constraint doesn't branch
        
        children = []
        for i in range(num):
            child = Constraint()
            child.nesting_level = self.nesting_level + 1
            child.parent_id = self.constraint_id
            child.meta["opacity"] += 0.15  # Deeper = more opaque
            child.meta["stability_coefficient"] *= 0.9  # Deeper = more fragile
            children.append(child)
        
        return children
```

---

## Three-Layer Structure Explained

### Layer 1: Transparent Predicate
```
The actual rule, fully evaluable:
  predicate(context) → True | False | Undefined

Examples:
  • novelty > 0.7
  • saturation < threshold
  • concepts_overlap > 0.65

Property: Cannot be mutated (only replaced). Always computable.
```

### Layer 2: Semi-Opaque Meta
```
Describes HOW the constraint evolves (but not fully visible):
  
  mutagen: BLACK BOX function (can swap, never examine)
  stability_coefficient: 0-1 (resist change? higher = more rigid)
  propagation_fractal: 0-3 (spawn children? more = fractal branching)
  shadow_queue: List[Mutation] (buffered changes, applied atomically)
  opacity: 0-1 (how hidden is this? deeper in nesting = higher)

Property: Intentionally not fully introspectable. Prevents paradox.
```

### Layer 3: Sealed Provenance
```
Immutable record of ALL mutations:
  
  [MutationEvent, MutationEvent, MutationEvent, ...]
  
  Each event: {
    parent_id: UUID of previous constraint
    type: "PREDICATE_CHANGE" | "SPAWN_CHILD" | "META_MUTATION"
    timestamp: when this happened
    critique_source: what suggested this?
    hash: cryptographically sealed
  }

Property: Cannot be modified. Audit trail. Paradox detector.
```

---

## Critique Engine: Proposing New Constraints

The critique engine **watches metrics** and **proposes constraint mutations**:

```python
class CritiqueEngine:
    def analyze(self, metrics, constraints):
        """Examine current state, propose changes"""
        
        proposals = []
        
        # Problem 1: Stability declining
        if metrics.stability_gradient[-1] < -0.1:
            proposals.append(ConstraintProposal(
                type="STABILITY_REINFORCEMENT",
                description="System destabilizing; freeze mutations",
            ))
        
        # Problem 2: Too many pending mutations
        if metrics.shadow_mutation_pressure > 10:
            proposals.append(ConstraintProposal(
                type="SHADOW_FLUSH",
                description="Too many buffered mutations; commit or discard",
            ))
        
        # Problem 3: Circular logic detected
        if metrics.strange_loop_centrality > 2:
            proposals.append(ConstraintProposal(
                type="PARADOX_CONTAINMENT",
                description="Constraint loop detected; seal as opaque",
            ))
        
        # Problem 4: Nesting too deep
        if metrics.nesting_level > 5 and metrics.opacity_index > 0.8:
            proposals.append(ConstraintProposal(
                type="DEPTH_CUTOFF",
                description="Too deep and too opaque; stop branching",
            ))
        
        # Opportunity: System stable, allow growth
        if metrics.nesting_level < 3 and metrics.stability_gradient[-1] > 0.05:
            proposals.append(ConstraintProposal(
                type="CONSTRUCTIVE_BRANCHING",
                description="System stable; try fractal branching",
            ))
        
        return proposals
```

---

## Meta-Iteration Context (Signaling to Critique)

When asking critique engine to suggest new constraints, send a hint:

```python
# In bridge_get_context_for_consult():

hint = MetaIterationHint(
    iteration_depth=2,              # How many mutation rounds so far?
    request_constraint_proposal=True, # Want NEW constraints?
    allow_shadow_mutations=True,    # Buffer mutations or apply immediately?
    max_branching_depth=3,          # How deep can nesting go?
    critique_mode=True              # Observing or evolving?
)

context = bridge_get_context_for_consult(
    session_id=my_session,
    query=my_query,
    meta_iteration_hint=hint
)

# Critique engine receives this hint and:
# - Understands we're at iteration 2
# - Knows we want new constraints
# - Can propose mutations at multiple levels
```

---

## Recursive Constraint Evolution

```python
def evolve_constraints(constraints, depth, metrics):
    """Mutate constraints, spawn children, recurse deeper"""
    
    if depth == 0:
        return constraints
    
    evolved = []
    
    for constraint in constraints:
        # Step 1: Apply mutation at this depth
        delta = constraint.meta["mutagen"](constraint, context)
        mutated = constraint.apply_mutation(delta)
        mutated.nesting_level = depth
        
        # Step 2: Increase opacity (deeper = more opaque)
        mutated.meta["opacity"] = min(1.0, constraint.meta["opacity"] + 0.15)
        
        # Step 3: Decay stability (deeper = more fragile)
        mutated.meta["stability_coefficient"] *= 0.9
        
        # Step 4: Spawn children if branching enabled
        if mutated.meta["propagation_fractal"] > 0:
            children = mutated.spawn_children(
                num=mutated.meta["propagation_fractal"]
            )
            # Recursively evolve children
            evolved_children = evolve_constraints(children, depth+1, metrics)
            evolved.extend(evolved_children)
        
        evolved.append(mutated)
    
    # Step 5: Every 3rd level, inject meta-constraint from critique
    if depth % 3 == 0:
        critique = CritiqueEngine().analyze(metrics, evolved)
        for proposal in critique:
            evolved.append(
                CritiqueEngine().generate_constraint(proposal)
            )
    
    return evolved
```

---

## Session Metrics: What to Track

```python
class SessionMetrics:
    def __init__(self):
        # Depth
        self.meta_iteration_depth = 0        # How many rounds?
        self.nesting_level = 0               # Current fractal level
        self.loop_counter = {}               # Named loop counts
        
        # Opacity (information-theoretic)
        self.opacity_index = 0.0             # How hidden are constraints?
        self.shadow_mutation_pressure = 0    # How many buffered mutations?
        
        # Stability (dynamical)
        self.local_stability = 1.0           # Current stability score
        self.stability_gradient = []         # Is stability increasing/decreasing?
        
        # Paradox risk (diagnostic)
        self.strange_loop_centrality = 0     # Circular logic count
        self.incompleteness_risk = 0.0       # Probability of undecidable state
        self.self_reference_detected = False # Found self-referential rules?
    
    def is_entering_meta_chaos(self) -> bool:
        """Check if system is losing predictable control"""
        chaos_indicator = self.opacity_index * self.meta_iteration_depth
        return chaos_indicator > self.local_stability
    
    def suggest_action(self) -> Optional[str]:
        """Recommend if system needs help"""
        if self.is_entering_meta_chaos():
            return "ACTIVATE_STABILIZATION_FIREWALL"
        if self.shadow_mutation_pressure > 15:
            return "COMMIT_OR_DISCARD_SHADOWS"
        if self.strange_loop_centrality > 3:
            return "SEAL_PARADOXICAL_CONSTRAINTS"
        return None
```

---

## Emergency Stabilization Firewall

When the system enters "meta-chaos" (opacity × depth > stability), activate:

```python
def activate_stabilization_firewall(constraints):
    """Emergency circuit-breaker: freeze all mutations"""
    
    firewall = Constraint(
        friendly_name="STABILIZATION_FIREWALL",
        predicate=lambda ctx: ctx.metrics.stability > 0.5,
        meta={
            # Refuse all mutations
            "mutagen": OpaqueFunction(code="raise MutationHaltError()"),
            "stability_coefficient": 1.0,  # Immutable
            "propagation_fractal": 0,      # No children
            "shadow_queue": [],            # Cannot be shadow-mutated
            "opacity": 0.5
        }
    )
    
    # Clear all pending mutations
    for c in constraints:
        c.meta["shadow_queue"].clear()
    
    # System enters quiescent state
    return constraints + [firewall]
```

**Effect:** System freezes, all mutations stop, shadow queue cleared. Gives time to assess state.

---

## Failure Modes & Fixes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Rules flip back and forth | Mutagen functions contradictory | Detect oscillation, freeze constraint |
| Too many pending mutations | Shadow queue keeps growing | Commit shadows or discard, trigger firewall |
| Nesting gets too deep | propagation_fractal > 0 at all levels | Set propagation_fractal=0 after depth N |
| Circular constraint logic | Constraint references itself | Seal as opaque (opacity=1.0) |
| Can't predict what happens | opacity × depth > stability | ACTIVATE_STABILIZATION_FIREWALL |

---

## Example: Three Iterations

```
ITERATION 0 (Initial):
  ├─ novelty > 0.7
  ├─ saturation < 0.8
  └─ jaccard > 0.65

ITERATION 1 (First mutation round):
  Critique detects stability is good
  → Proposes "prevent_oscillation" constraint
  ├─ novelty > 0.75 (mutated)
  ├─ saturation < 0.8 (spawns child)
  ├─ jaccard > 0.65
  └─ [NEW] prevent_oscillation

ITERATION 2 (Recursive branching):
  Children constraints mutate at nesting_level=1
  Opacity increases, stability decays
  ├─ novelty > 0.75 (opacity=0.35)
  ├─ saturation < 0.8 (stability=0.63)
  ├─ saturation_child (nesting_level=1)
  │  └─ Prevents rapid swings
  └─ prevent_oscillation

ITERATION 3+ (If chaos risk rises):
  Metrics show: opacity=0.8, depth=3
  → chaos_indicator = 0.8 × 3 = 2.4 > stability
  → Activate STABILIZATION_FIREWALL
  → All mutations freeze, system stabilizes
```

---

## Integration: One Complete Cycle

```python
def one_meta_iteration_cycle(session_id, constraints, depth=0):
    """Run one full meta-iteration cycle"""
    
    # 1. Get context with meta-iteration hint
    hint = MetaIterationHint(
        iteration_depth=depth,
        request_constraint_proposal=True
    )
    context = bridge_get_context_for_consult(
        session_id, 
        meta_iteration_hint=hint
    )
    
    # 2. Critique proposes new constraints
    metrics = compute_metrics(constraints)
    proposals = CritiqueEngine().analyze(metrics, constraints)
    
    # 3. Convert proposals to constraints
    new_constraints = [
        CritiqueEngine().generate_constraint(p) 
        for p in proposals
    ]
    
    # 4. Recursively evolve all constraints
    all_constraints = constraints + new_constraints
    evolved = evolve_constraints(all_constraints, depth, metrics)
    
    # 5. Update metrics
    metrics.update_post_iteration(evolved, proposals[0] if proposals else None)
    
    # 6. Check if system is entering chaos
    if metrics.is_entering_meta_chaos():
        evolved = activate_stabilization_firewall(evolved)
    
    return evolved, metrics
```

---

## Parameters to Tune

```
stability_decay_per_depth = 0.9
  → Lower = stability weakens faster at depth
  → Use 0.99 for stable systems, 0.7 for adventurous

opacity_increase_per_depth = 0.15
  → How much more opaque constraints become each level
  → Use 0.05 for transparency, 0.30 for quick obfuscation

max_shadow_queue_size = 15
  → Trigger firewall if exceeded
  → Use 5 for conservative, 30 for aggressive

max_branching_depth = 3
  → How many nesting levels before stopping
  → Use 2 for shallow, 5 for deep
```

---

## Common Mistakes

❌ **Not using shadow_queue:** Applying mutations immediately creates atomic glitches  
✅ **Always buffer mutations** in shadow_queue, commit atomically

❌ **High propagation_fractal at all depths:** Constraint explosion  
✅ **Set propagation_fractal=0** after depth 3 or when opacity > 0.8

❌ **Ignoring strange_loop_centrality:** Paradox grows silently  
✅ **Seal opaque** (opacity=1.0) when > 2 cycles detected

❌ **No stabilization firewall:** System enters meta-chaos  
✅ **Always monitor** `opacity_index × meta_iteration_depth > local_stability`

---

## Testing Checklist

- [ ] Constraints evaluate correctly at each nesting level
- [ ] Mutations in shadow_queue don't trigger until commit
- [ ] Children spawn with higher opacity and lower stability
- [ ] Recursive evolution stops at max_branching_depth
- [ ] Critique engine detects stability decline
- [ ] Firewall activates when chaos_indicator > threshold
- [ ] Provenance chain grows without repeating parent IDs
- [ ] Strange loops detected and sealed
- [ ] No oscillation (stable after 5 iterations)

---

## Next Steps

1. Implement 3-layer Constraint class
2. Define your domain-specific predicates
3. Create MetaIterationHint signal
4. Wire into bridge_get_context_for_consult()
5. Implement CritiqueEngine
6. Test with shallow recursion (depth=1-2) first
7. Monitor metrics closely, tune parameters
8. Gradually increase depth as you gain confidence

