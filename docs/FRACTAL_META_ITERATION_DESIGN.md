# Fractal Meta-Iteration: Self-Mutating Constraint Systems

## Overview

A system where constraints can mutate their own rules at multiple recursive nesting levels. This enables **context injection** for critique engines to propose new constraints, while maintaining stability through careful paradox containment and stabilization barriers.

**Core Innovation:** Instead of fixed constraints, the system evolves constraint *rules themselves* based on critique signals, creating a fractal/recursive structure where each level can observe and modify behavior at lower levels.

---

## The Core Paradox: Fixed-Point Incompleteness

When a constraint system can mutate its own rules, it confronts a **Gödelian paradox**:

- **Self-Reference Problem:** A constraint that governs its own modification must contain a description of that modification, creating infinite regress
- **Russell's Paradox Analog:** "The set of all constraints that don't contain themselves as mutable" 
- **Undecidability:** By Gödel's incompleteness, no constraint system can fully decide whether it's stable without examining itself (which requires the system to be outside itself)

**Solution:** Use **intentional opacity** at the meta-layer. The meta-mutation function is a reified first-class object that can be *replaced* but never *fully examined*—preventing the paradox while enabling evolution.

**Mathematical Formulation:**
```
C' = F(C)  where F ∈ C itself

This is unsolvable unless we make F opaque:
  F_opaque: Callable → (not Callable)
  
Result: System evolves without being able to prove convergence
        (like Hofstadter's strange loops or Gödel's incompleteness)
```

---

## Tripartite Constraint Structure

Each constraint has three distinct layers:

### Layer 1: Transparent Predicate
The actual rule, fully evaluable and inspectable:

```python
predicate: Callable[[Context], Trilean]  # True / False / Undefined
```

Examples:
- `novelty > 0.7`
- `saturation < threshold`
- `concepts_overlap_jaccard > 0.65`

**Properties:**
- Always evaluable within the current constraint set
- Cannot be mutated (only replaced)
- Returns ternary logic (Undefined for undecidable cases)

### Layer 2: Semi-Opaque Meta-Protocol
Describes *how* this constraint can evolve. Intentionally NOT fully introspectable:

```python
meta: {
    # The mutation function (opaque black-box)
    "mutagen": Callable[[Context, Metrics], ConstraintDelta],
    
    # How resistant is this constraint to change?
    # Decays with nesting depth (deeper = more mutable)
    "stability_coefficient": float ∈ [0.0, 1.0],
    
    # Fractal branching: how many child constraints can this spawn?
    "propagation_fractal": int ∈ [0, 3],
    
    # Mutations awaiting application (buffered for transactional safety)
    "shadow_queue": List[Mutation],
    
    # How opaque is this constraint? (0 = transparent, 1 = black-box)
    "opacity": float ∈ [0.0, 1.0]
}
```

**Key Design:**
- `mutagen` function is a **sealed black-box** that can be swapped but never examined
- This prevents the liar paradox while allowing the system to evolve
- Shadow queue holds pending mutations, preventing atomic glitches
- Opacity increases with nesting depth, limiting introspection

### Layer 3: Sealed Provenance Graph
Immutable, append-only history of all mutations:

```python
provenance: HashChain[MutationEvent] {
    parent_constraint_id: UUID,
    mutation_type: "PREDICATE_CHANGE" | "META_MUTATION" | "SPAWN_CHILD",
    timestamp: Timestamp,
    critique_source: UUID,
    nesting_level: int,
    hash: SHA256,  # cryptographically sealed
}
```

**Properties:**
- Cannot be modified, only appended to
- Creates an auditable trail of constraint evolution
- Enables detection of circular logic and strange loops
- Sealed against tampering

---

## Constraint Representation

### Core Data Structure

```python
class Constraint:
    def __init__(self):
        # Layer 1: Transparent
        self.predicate: Callable[[Context], Trilean]
        self.constraint_id: UUID
        self.friendly_name: str  # e.g., "novelty_threshold"
        
        # Layer 2: Semi-Opaque
        self.meta = {
            "mutagen": OpaqueFunction(...),
            "stability_coefficient": 0.7,
            "propagation_fractal": 1,
            "shadow_queue": [],
            "opacity": 0.2
        }
        
        # Layer 3: Sealed
        self.provenance: HashChain = HashChain()
        
        # Operational
        self.version: int = 0
        self.nesting_level: int = 0
        self.parent_id: Optional[UUID] = None

    def evaluate(self, context: Context) -> Trilean:
        """Layer 1: Transparent evaluation"""
        try:
            return self.predicate(context)
        except RecursionError:
            return Trilean.UNDEFINED  # Can't decide

    def propose_mutation(
        self, 
        delta: ConstraintDelta, 
        reason: str
    ) -> Mutation:
        """Queue a mutation without applying it immediately"""
        mutation = Mutation(
            target_constraint=self.constraint_id,
            delta=delta,
            reason=reason,
            timestamp=now(),
            proposed_by="critique_engine"
        )
        self.meta["shadow_queue"].append(mutation)
        return mutation

    def commit_shadow_mutations(self) -> List[Constraint]:
        """Atomically apply all buffered mutations"""
        if not self.meta["shadow_queue"]:
            return [self]
        
        mutated_constraints = []
        for mutation in self.meta["shadow_queue"]:
            new_c = self.apply_mutation(mutation)
            new_c.provenance.append(
                MutationEvent(
                    parent=self.constraint_id,
                    type="SHADOW_COMMIT",
                    mutation_id=mutation.id,
                    nesting_level=self.nesting_level
                )
            )
            mutated_constraints.append(new_c)
        
        self.meta["shadow_queue"].clear()
        return mutated_constraints

    def spawn_child_constraints(self, num_children: int) -> List[Constraint]:
        """Create child constraints at next nesting level"""
        if self.meta["propagation_fractal"] == 0:
            return []  # This constraint doesn't branch
        
        children = []
        for i in range(num_children):
            child = Constraint()
            child.parent_id = self.constraint_id
            child.nesting_level = self.nesting_level + 1
            child.meta["opacity"] = min(
                1.0,
                self.meta["opacity"] + 0.15  # Increase opacity deeper
            )
            child.meta["stability_coefficient"] *= 0.9  # Decay stability
            
            self.provenance.append(
                MutationEvent(
                    type="SPAWN_CHILD",
                    child_id=child.constraint_id,
                    nesting_level=child.nesting_level
                )
            )
            children.append(child)
        
        return children
```

---

## Meta-Iteration Context Injection

### Enhanced `bridge_get_context_for_consult`

```python
def bridge_get_context_for_consult(
    session_id: UUID,
    query: Query,
    meta_iteration_hint: MetaIterationHint = None
) -> ConsultContext:
    """
    Fetch context for critique, with optional meta-iteration signal.
    
    The hint tells the critique engine:
    - How deep we are in fractal nesting
    - Whether to propose NEW constraints
    - What kinds of mutations to suggest
    """
    
    hint = meta_iteration_hint or MetaIterationHint.default()
    
    # Fetch base facts and current constraints
    facts = fetch_session_facts(session_id)
    constraints = load_constraints(session_id, depth=hint.iteration_depth)
    
    # Apply fractal evolution based on nesting depth
    if hint.iteration_depth > 0:
        constraints = evolve_constraints_recursively(
            constraints,
            depth=hint.iteration_depth,
            allow_shadow_mutations=hint.allow_shadow_mutations
        )
    
    # Build context with fractal awareness
    context = ConsultContext(
        # Base layer
        facts=facts,
        active_constraints=constraints,
        
        # Meta layers
        meta={
            "iteration_depth": hint.iteration_depth,
            "critique_mode": hint.critique_mode,
            "shadow_mutations_pending": sum(
                len(c.meta["shadow_queue"]) for c in constraints
            ),
            
            # The mutagen functions (intentionally opaque)
            "constraint_mutagenesis": OpaqueFunction(
                code="evolve_constraints_per_critique"
            ),
            
            # Stability state (hints if system is entering meta-chaos)
            "stability_metrics": compute_stability_tensor(constraints),
            
            # History of mutations for paradox detection
            "provenance_chain": consolidate_provenance(constraints),
        },
        
        # Signal: should critique propose NEW constraints?
        "request_constraint_proposal": hint.request_constraint_proposal,
        
        # Signal: max depth to allow branching
        "max_branching_depth": hint.max_branching_depth,
    )
    
    return context
```

### MetaIterationHint Structure

```python
class MetaIterationHint:
    """Signal to critique engine about meta-iteration parameters"""
    
    # How many times has the constraint set been mutated?
    iteration_depth: int = 0
    
    # Should critique suggest NEW constraints for next run?
    request_constraint_proposal: bool = True
    
    # Allow mutations to be buffered (shadow queue)?
    allow_shadow_mutations: bool = True
    
    # What is the target stable state (if any)?
    fixed_point_target: Optional[ConstraintSet] = None
    
    # How deep into fractal branching should we go?
    max_branching_depth: int = 3
    
    # Are we in "critique mode" (observing) or "evolution mode" (mutating)?
    critique_mode: bool = True
    
    # Fail-safe: if stability drops below this, trigger firewall
    min_stability_threshold: float = 0.3
    
    @staticmethod
    def default() -> "MetaIterationHint":
        return MetaIterationHint()
    
    @staticmethod
    def deep_mutation() -> "MetaIterationHint":
        """Allow aggressive constraint mutation"""
        return MetaIterationHint(
            iteration_depth=3,
            request_constraint_proposal=True,
            allow_shadow_mutations=True,
            max_branching_depth=4
        )
```

---

## Critique Engine: Proposing Evolved Constraints

The critique engine observes metrics and proposes NEW constraints for next iteration:

```python
class CritiqueEngine:
    """Generates constraint evolution proposals based on system state"""
    
    def analyze(
        self,
        metrics: SessionMetrics,
        constraints: List[Constraint]
    ) -> List[ConstraintProposal]:
        """Analyze current state and propose constraint mutations"""
        
        proposals = []
        
        # Diagnostic 1: Stability Erosion
        if metrics.stability_gradient[-1] < -0.1:
            proposals.append(ConstraintProposal(
                type="STABILITY_REINFORCEMENT",
                target_depth=metrics.nesting_level,
                description="Stability declining; freeze mutations at this level",
                new_constraint=Constraint(
                    predicate=lambda ctx: ctx.metrics.stability > 0.5,
                    meta={
                        "mutagen": OpaqueFunction(code="no_mutation"),
                        "stability_coefficient": 1.0,  # Immutable
                        "propagation_fractal": 0,      # No children
                    }
                )
            ))
        
        # Diagnostic 2: Shadow Accumulation
        shadow_count = sum(
            len(c.meta["shadow_queue"]) for c in constraints
        )
        if shadow_count > 10:
            proposals.append(ConstraintProposal(
                type="SHADOW_FLUSH",
                description="Too many pending mutations; commit or discard",
                action="commit_all_shadows_or_abort"
            ))
        
        # Diagnostic 3: Strange Loop Detection (Paradox)
        if metrics.strange_loop_centrality > 2:
            proposals.append(ConstraintProposal(
                type="PARADOX_CONTAINMENT",
                description="Circular constraint logic detected; seal as opaque",
                target_constraints=detect_strange_loops(constraints),
                action="maximize_opacity_to_1_0"
            ))
        
        # Diagnostic 4: Infinite Regress (Too Deep)
        if metrics.nesting_level > 5 and metrics.opacity_index > 0.8:
            proposals.append(ConstraintProposal(
                type="DEPTH_CUTOFF",
                description="Nesting too deep with high opacity; stop branching",
                action="set_propagation_fractal_to_0"
            ))
        
        # Diagnostic 5: Constructive Mutation (when stable)
        if (metrics.nesting_level < 3 and 
            metrics.stability_gradient[-1] > 0.05):
            proposals.append(ConstraintProposal(
                type="CONSTRUCTIVE_BRANCHING",
                description="System stable; allow fractal branching",
                new_constraint=self._generate_novel_constraint(metrics)
            ))
        
        return proposals
    
    def generate_constraint(
        self,
        proposal: ConstraintProposal
    ) -> Constraint:
        """Transform proposal into an executable constraint"""
        
        if proposal.type == "STABILITY_REINFORCEMENT":
            return Constraint(
                predicate=proposal.new_constraint.predicate,
                meta={
                    "mutagen": proposal.new_constraint.meta["mutagen"],
                    "stability_coefficient": 1.0,
                    "propagation_fractal": 0,
                    "opacity": 0.9,
                }
            )
        
        # ... handle other proposal types
        
        return proposal.new_constraint
    
    def _generate_novel_constraint(self, metrics: SessionMetrics) -> Constraint:
        """Create a new constraint based on system state"""
        # This is where new evolution happens
        return Constraint(
            predicate=lambda ctx: check_novel_property(ctx, metrics),
            meta={
                "mutagen": OpaqueFunction(
                    code="mutate_based_on_critique"
                ),
                "stability_coefficient": 0.6,
                "propagation_fractal": 1,
                "opacity": 0.3,
            }
        )
```

---

## Session Metrics: Tracking Fractal Nesting

A comprehensive metrics tensor to track constraint evolution:

```python
class SessionMetrics:
    """3D tensor tracking depth, opacity, and stability"""
    
    def __init__(self):
        # Structural depth
        self.meta_iteration_depth: int = 0      # How many mutation rounds?
        self.constraint_branching_depth: int = 0  # Max recursion in provenance?
        self.nesting_level: int = 0             # Current fractal level
        self.loop_counter: Dict[str, int] = {}  # Named loop counts
        
        # Information-theoretic opacity
        self.opacity_index: float = 0.0         # Ratio hidden/total constraints
        self.shadow_mutation_pressure: int = 0  # Pending mutations count
        self.provenance_entropy: float = 0.0    # Shannon entropy of mutations
        
        # Dynamical stability
        self.local_stability: float = 1.0       # Current level stability
        self.stability_gradient: List[float] = []  # d(stability)/d(depth)
        self.fixed_point_distance: float = 0.0    # ||current - target||
        
        # Paradox indicators (diagnostic)
        self.self_reference_detected: bool = False
        self.incompleteness_risk: float = 0.0     # Probability undecidable
        self.strange_loop_centrality: int = 0     # Cycle count in provenance
        
        # Evolutionary signals
        self.constraint_version_history: Dict[UUID, List[int]] = {}
        self.constraint_mutation_count: Dict[UUID, int] = {}
    
    def update_post_iteration(
        self,
        constraints: List[Constraint],
        critique_proposal: Optional[ConstraintProposal] = None
    ):
        """Update metrics after one iteration"""
        
        # Structural metrics
        self.nesting_level = max(
            c.nesting_level for c in constraints
        ) if constraints else 0
        
        # Opacity: ratio of opaque constraints to total
        total_opacity = sum(c.meta["opacity"] for c in constraints)
        self.opacity_index = total_opacity / max(len(constraints), 1)
        
        # Shadow pressure: how many mutations are queued?
        self.shadow_mutation_pressure = sum(
            len(c.meta["shadow_queue"]) for c in constraints
        )
        
        # Stability gradient: how is stability changing with depth?
        stability_by_depth = {}
        for c in constraints:
            if c.nesting_level not in stability_by_depth:
                stability_by_depth[c.nesting_level] = []
            stability_by_depth[c.nesting_level].append(
                c.meta["stability_coefficient"]
            )
        
        self.stability_gradient = [
            np.mean(stability_by_depth.get(d, [0.5]))
            for d in range(self.nesting_level + 1)
        ]
        
        # Paradox detection: strange loops in provenance
        self.strange_loop_centrality = sum(
            1 for c in constraints
            if self._detect_cycle(c.provenance)
        )
        
        # Track mutation counts per constraint
        for c in constraints:
            cid = c.constraint_id
            if cid not in self.constraint_mutation_count:
                self.constraint_mutation_count[cid] = 0
            self.constraint_mutation_count[cid] += 1
        
        # Incompleteness risk: as opacity and depth grow, undecidability rises
        self.incompleteness_risk = min(
            1.0,
            self.opacity_index * (self.nesting_level / 10.0)
        )
        
        # Loop counter
        if critique_proposal:
            loop_type = critique_proposal.type
            if loop_type not in self.loop_counter:
                self.loop_counter[loop_type] = 0
            self.loop_counter[loop_type] += 1
    
    def is_entering_meta_chaos(self) -> bool:
        """Check if system is losing predictable control"""
        chaos_indicator = (
            self.opacity_index * self.meta_iteration_depth
        )
        return chaos_indicator > self.local_stability
    
    def suggest_stabilization(self) -> Optional[str]:
        """Recommend action if stability at risk"""
        if self.is_entering_meta_chaos():
            return "ACTIVATE_STABILIZATION_FIREWALL"
        if self.shadow_mutation_pressure > 15:
            return "COMMIT_OR_DISCARD_SHADOWS"
        if self.strange_loop_centrality > 3:
            return "SEAL_PARADOXICAL_CONSTRAINTS"
        return None
```

---

## Recursive Constraint Evolution

The core function that evolves constraints at each nesting level:

```python
def evolve_constraints_recursively(
    base_constraints: List[Constraint],
    depth: int,
    allow_shadow_mutations: bool = True,
    metrics: Optional[SessionMetrics] = None
) -> List[Constraint]:
    """
    Recursively evolve constraints at nesting level `depth`.
    Each constraint can spawn children, which evolve independently.
    """
    
    if depth == 0:
        return base_constraints
    
    evolved = []
    
    for constraint in base_constraints:
        # Step 1: Apply meta-mutation at this depth
        delta = constraint.meta["mutagen"](
            constraint,
            get_context_at_depth(depth)
        )
        
        mutated = constraint.apply_mutation(delta)
        mutated.nesting_level = depth
        
        # Step 2: Update opacity (increases with depth)
        mutated.meta["opacity"] = min(
            1.0,
            constraint.meta["opacity"] + (0.15 * depth)
        )
        
        # Step 3: Decay stability (deeper = more fragile)
        mutated.meta["stability_coefficient"] *= (0.9 ** depth)
        
        # Step 4: Recursive branching (if propagation_fractal > 0)
        if mutated.meta["propagation_fractal"] > 0:
            num_children = mutated.meta["propagation_fractal"]
            children = mutated.spawn_child_constraints(num_children)
            
            # Recursively evolve children
            evolved_children = [
                evolve_constraints_recursively(
                    [child],
                    depth=depth + 1,
                    allow_shadow_mutations=allow_shadow_mutations,
                    metrics=metrics
                )[0]
                for child in children
            ]
            evolved.extend(evolved_children)
        
        evolved.append(mutated)
        
        # Step 5: Every 3rd depth, inject meta-constraint from critique
        if depth % 3 == 0 and metrics:
            critique = CritiqueEngine().analyze(
                metrics,
                evolved
            )
            if critique:
                meta_constraint = CritiqueEngine().generate_constraint(
                    critique[0]
                )
                evolved.append(meta_constraint)
    
    return evolved
```

---

## Stabilization Firewall: Circuit-Breaker

When the system enters meta-chaos, activate a firewall constraint that halts all mutations:

```python
def activate_stabilization_firewall(
    constraints: List[Constraint]
) -> List[Constraint]:
    """
    Emergency circuit-breaker: freeze all mutations and clear shadow queues.
    This is a meta-constraint that overrides all others.
    """
    
    firewall = Constraint(
        friendly_name="STABILIZATION_FIREWALL",
        predicate=lambda ctx: (
            ctx.metrics.shadow_mutation_pressure < 5
            and ctx.metrics.opacity_index < 0.7
        ),
        meta={
            # Mutagen that does nothing (refuses mutations)
            "mutagen": OpaqueFunction(
                code="""
                def raise_mutation_halt_error(constraint, context):
                    raise MutationHaltError(
                        "Stabilization firewall active. "
                        "System in quiescent state."
                    )
                """
            ),
            "stability_coefficient": 1.0,  # Immutable
            "propagation_fractal": 0,      # No children
            "shadow_queue": [],            # Cannot be shadow-mutated
            "opacity": 0.5,                # Partially transparent
        }
    )
    
    # Seal this constraint's provenance
    firewall.provenance.seal_as_immutable()
    
    # Clear all shadow queues (discard buffered mutations)
    for c in constraints:
        c.meta["shadow_queue"].clear()
    
    # Add firewall to constraints
    return constraints + [firewall]
```

---

## Failure Modes & Safeguards

### Failure 1: Constraint Oscillation
**Symptom:** Rules mutate back-and-forth without convergence  
**Root Cause:** Mutagen functions pointing in opposite directions  
**Safeguard:**
```python
# Detect oscillation in version history
def detect_oscillation(c: Constraint, window=5) -> bool:
    recent_versions = c.version_history[-window:]
    return len(set(recent_versions)) < len(recent_versions) / 2

# If detected, freeze constraint
if detect_oscillation(c):
    c.meta["stability_coefficient"] = 1.0
```

### Failure 2: Shadow Accumulation Collapse
**Symptom:** Mutations queue up, system becomes unpredictable  
**Root Cause:** Shadow mutations across nesting levels interact non-linearly  
**Safeguard:**
```python
if metrics.shadow_mutation_pressure > 15:
    activate_stabilization_firewall(constraints)
```

### Failure 3: Infinite Regress (Depth Explosion)
**Symptom:** Nesting level keeps growing, opacity hits 1.0  
**Root Cause:** Branching factor > 1 at each level  
**Safeguard:**
```python
if depth > 5 and opacity > 0.8:
    constraint.meta["propagation_fractal"] = 0  # Stop branching
```

### Failure 4: Paradox Absorption
**Symptom:** System "suspends" when encountering circular logic  
**Root Cause:** Constraint violates its own preconditions  
**Safeguard:**
```python
# Detect and seal paradoxical constraints
if detect_strange_loop(constraint.provenance):
    constraint.meta["opacity"] = 1.0  # Make fully opaque
    constraint.meta["stability_coefficient"] = 1.0  # Immutable
```

---

## Integration with Bridge

### Complete Workflow

```python
def bridge_fractal_meta_iteration_cycle(
    session_id: UUID,
    current_constraints: List[Constraint],
    iteration_depth: int = 0
) -> tuple[List[Constraint], SessionMetrics]:
    """
    One complete fractal meta-iteration cycle.
    
    1. Get context with meta-iteration hint
    2. Run critique engine
    3. Apply critique proposals as constraint mutations
    4. Evolve constraints recursively
    5. Update metrics
    6. Check for stabilization need
    """
    
    # Step 1: Get context with meta-iteration signal
    hint = MetaIterationHint(
        iteration_depth=iteration_depth,
        request_constraint_proposal=True,
        max_branching_depth=3
    )
    
    context = bridge_get_context_for_consult(
        session_id,
        query=Query(task="evolve_constraints"),
        meta_iteration_hint=hint
    )
    
    # Step 2: Critique analyzes and proposes new constraints
    critique = CritiqueEngine()
    metrics = compute_metrics(current_constraints)
    proposals = critique.analyze(metrics, current_constraints)
    
    # Step 3: Convert proposals to constraints
    proposed_constraints = [
        critique.generate_constraint(p) for p in proposals
    ]
    
    # Step 4: Evolve constraints recursively
    evolved = evolve_constraints_recursively(
        current_constraints + proposed_constraints,
        depth=iteration_depth,
        allow_shadow_mutations=True,
        metrics=metrics
    )
    
    # Step 5: Update metrics
    metrics.update_post_iteration(evolved, proposals[0] if proposals else None)
    
    # Step 6: Check stabilization need
    if metrics.is_entering_meta_chaos():
        evolved = activate_stabilization_firewall(evolved)
    
    return evolved, metrics
```

---

## Example: Multi-Iteration Evolution

```
Iteration 0 (Direct Constraints):
  ├─ novelty > 0.7
  ├─ saturation < 0.8
  └─ jaccard > 0.65

Iteration 1 (Meta-mutations):
  ├─ novelty > 0.7 (mutated to > 0.75)
  ├─ saturation < 0.8 (spawns child)
  │  └─ saturation_child: forbids rapid oscillation
  ├─ jaccard > 0.65
  └─ [NEW] stability > 0.5  (from critique)

Iteration 2 (Recursive branching + fractal):
  ├─ novelty > 0.75 (deeper opacity)
  ├─ saturation < 0.8 (no more children)
  ├─ saturation_child (still present)
  ├─ jaccard > 0.65 (mutates to account for imbalance)
  ├─ stability > 0.5
  └─ [NEW] prevent_oscillation (meta-constraint)

Iteration 3+ (Approaching meta-chaos):
  └─ Stabilization firewall activates
     All mutations frozen
     Shadow queue cleared
```

---

## Tuning Parameters

| Parameter | Default | Range | Meaning |
|-----------|---------|-------|---------|
| `stability_decay_per_depth` | 0.9 | 0.7-0.99 | How quickly stability weakens deeper |
| `opacity_increase_per_depth` | 0.15 | 0.05-0.30 | How quickly opacity increases deeper |
| `max_shadow_queue_size` | 15 | 5-30 | Trigger firewall if exceeded |
| `max_branching_depth` | 3 | 2-5 | How many nesting levels allowed |
| `strange_loop_threshold` | 3 | 1-5 | Cycles before paradox containment |
| `meta_chaos_threshold` | 1.0 | 0.5-2.0 | opacity × depth where chaos begins |

---

## Future Enhancements

- **Adaptive mutagen functions:** Learn mutation strategies from successful evolutions
- **Constraint annealing:** Gradually reduce temperature to cool chaos phases
- **Provenance compression:** Hash ancient mutation history to save space
- **Cross-session learning:** Mutations persist and improve across sessions
- **Strange loop detection:** Use topological methods to predict paradox formation
- **Quantum constraint resolution:** Use many-worlds interpretation for undecidable states

