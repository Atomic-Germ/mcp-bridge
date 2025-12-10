# Bridge System Design Index

Complete design documentation for two complementary heuristic systems: 
**Perpendicular Planner** and **Asymmetry Mode-Switch**.

---

## Quick Navigation

### For Decision Makers (5 minutes)
→ Read **BRIDGE_SYSTEM_SUMMARY.md** 
- Overview of both systems
- How they work together
- Deployment timeline

### For Implementers (30 minutes)
1. **PERPENDICULAR_PLANNER_QUICKSTART.md** (understand concept)
2. **ASYMMETRY_MODE_SWITCH_QUICKSTART.md** (understand algorithm)
3. Choose which to implement first or do both

### For Deep Understanding (4-6 hours)
1. **PERPENDICULAR_PLANNER_DESIGN.md** (complete spec)
2. **ASYMMETRY_MODE_SWITCH_DESIGN.md** (complete theory + math)
3. **ASYMMETRY_MODE_SWITCH_INTEGRATION.md** (debugging + tuning)
4. **BRIDGE_SYSTEM_SUMMARY.md** (integration view)

### For Debugging (30 minutes)
→ **ASYMMETRY_MODE_SWITCH_INTEGRATION.md**
- Scenario-based debugging
- Parameter tuning worksheet
- Testing template
- Production checklist

---

## System 1: Perpendicular Planner

**Problem:** How to choose perpendicular inversions dynamically based on system state?

**Solution:** Use novelty and saturation signals to select inverse pool strength.

| Document | Lines | Purpose | Audience |
|----------|-------|---------|----------|
| PERPENDICULAR_PLANNER_DESIGN.md | 230 | Complete specification | Architects |
| PERPENDICULAR_PLANNER_QUICKSTART.md | 222 | Implementation ready | Developers |

**Key Components:**
- PerpendularState interface
- selectInverseType() function
- BranchMemory class
- Three implementation patterns

**Default Parameters:**
- noveltyHigh: 0.7
- saturationHigh: 0.7
- minAffinity: 0.4
- Signal history: last 5 samples
- Branch memory: last 3 moves

---

## System 2: Asymmetry Mode-Switch

**Problem:** When concepts are near decision threshold but imbalanced, how strongly should we switch modes?

**Solution:** Compute graded asymmetry degree to inform switch strength (0-1).

| Document | Lines | Purpose | Audience |
|----------|-------|---------|----------|
| ASYMMETRY_MODE_SWITCH_DESIGN.md | 387 | Complete theory + math | Researchers |
| ASYMMETRY_MODE_SWITCH_QUICKSTART.md | 299 | Implementation ready | Developers |
| ASYMMETRY_MODE_SWITCH_INTEGRATION.md | 434 | Debugging + tuning | DevOps |

**Key Components:**
- Jaccard similarity computation
- Critical band activation logic
- Asymmetry degree calculation
- Mode-switch strength mapping
- Hysteresis smoothing

**Default Parameters:**
- threshold: 0.65
- epsilon: 0.12
- amplification: 1.0
- hysteresis_decay: 0.9

---

## Integration

**BRIDGE_SYSTEM_SUMMARY.md** (380 lines)

Shows how both systems work together:
1. Perpendicular planner determines inverse pool based on novelty/saturation
2. Meditations generate new concept sets
3. Asymmetry detector measures if switch is needed
4. Mode decision incorporates asymmetry confidence
5. State updates for next round

**Synergy:** Perpendicular ensures conceptual drift is heuristically appropriate; 
Asymmetry detects when drift has crossed decision boundaries.

---

## File Manifest

```
PERPENDICULAR_PLANNER_DESIGN.md (8.3 KB)
├─ Core Mechanism (novelty/saturation modulation)
├─ Minimal Viable State
├─ Three Implementation Patterns (bandit, decay, gating)
├─ Failure Modes & Safeguards
├─ Integration with Bridge
├─ Example Flow
├─ Tuning Parameters
└─ Future Enhancements

PERPENDICULAR_PLANNER_QUICKSTART.md (6.1 KB)
├─ 1-minute Summary
├─ Minimal Code (TypeScript/Python)
├─ Three Inverse Pools (soft/harsh/normal)
├─ State Machine
├─ Recency Memory Logic
├─ Safety Checks
├─ Example Flow (4 sessions)
├─ Tuning Guide
└─ Integration Checklist

ASYMMETRY_MODE_SWITCH_DESIGN.md (13 KB)
├─ Overview & Imperfection Paradox
├─ Mathematical Core (Jaccard-Proximity, Imbalance, Asymmetry Degree, Strength)
├─ Algorithm Signature (primary function + usage)
├─ Failure Modes (convergence, divergence, paralysis)
├─ Integration with Bridge
├─ Tuning Parameters
├─ Example Scenarios (3 cases)
└─ Checklist

ASYMMETRY_MODE_SWITCH_QUICKSTART.md (7.9 KB)
├─ 30-second Summary
├─ Minimal Code (Python)
├─ Key Concepts (Jaccard, band, imbalance, asymmetry, strength)
├─ Three Case Studies
├─ Interpreting Results
├─ Integration Pattern
├─ Parameter Tuning
├─ Common Failure Patterns
├─ Comparison (binary vs graded)
└─ Testing Checklist

ASYMMETRY_MODE_SWITCH_INTEGRATION.md (12 KB)
├─ Visual: Asymmetry Decision Space
├─ Core State Machine (with computation steps)
├─ Decision Boundary Visualization
├─ Algorithm Flow (actual computation example)
├─ Integration Roadmap (4 phases)
├─ Three Approaches (minimal/moderate/full)
├─ Practical Debugging (3 scenarios)
├─ Testing Template
├─ Parameter Tuning Worksheet
└─ Production Checklist

BRIDGE_SYSTEM_SUMMARY.md (12 KB)
├─ System 1 Overview (perpendicular planner)
├─ System 2 Overview (asymmetry mode-switch)
├─ How They Work Together (scenario walkthrough)
├─ Synergy Benefits
├─ Deployment Path (7 weeks)
├─ Key Insights from Meditation
├─ Mathematical Foundations
├─ Testing & Validation
├─ Documentation Map
├─ Next Steps
└─ References to Original Concepts
```

**Total:** 6 markdown files, ~60 KB, ~2,000 lines of comprehensive documentation

---

## Implementation Timeline

### Week 1-2: Perpendicular Planner
- [ ] Implement `selectInverseType()` and state struct
- [ ] Define soft/harsh/normal inverse pools
- [ ] Integrate signal collection
- [ ] Test with synthetic data

### Week 3-4: Asymmetry Mode-Switch
- [ ] Implement `compute_graded_asymmetry()` 
- [ ] Define concept extraction
- [ ] Integrate with mode decision logic
- [ ] Test with synthetic concept pairs

### Week 5-6: Integration
- [ ] Wire perpendicular into meditation planning
- [ ] Connect asymmetry to mode logic
- [ ] Implement hysteresis smoothing
- [ ] Add monitoring/logging

### Week 7+: Production
- [ ] Track distributions and patterns
- [ ] Adjust thresholds based on data
- [ ] Deploy A/B test
- [ ] Iterate based on results

---

## Key Parameters at a Glance

### Perpendicular Planner
| Parameter | Default | Range | Tune When |
|-----------|---------|-------|-----------|
| noveltyHigh | 0.7 | 0.5-0.9 | Too many SOFT modes |
| saturationHigh | 0.7 | 0.5-0.9 | Too many HARSH modes |
| minAffinity | 0.4 | 0.2-0.6 | Feeling disconnected |
| signalHistoryLen | 5 | 3-10 | Noisy signals |
| decayRate | 0.85 | 0.7-0.95 | Repetitive branch reuse |

### Asymmetry Mode-Switch
| Parameter | Default | Range | Tune When |
|-----------|---------|-------|-----------|
| threshold | 0.65 | 0.5-0.8 | Wrong boundary |
| epsilon | 0.12 | 0.05-0.20 | Too many false triggers |
| amplification | 1.0 | 0.5-2.0 | Switches too weak/strong |
| hysteresis_decay | 0.9 | 0.7-0.99 | Oscillating |
| smoothing_epsilon | 0.01 | 0.001-0.05 | Convergent concepts |

---

## Success Metrics

### Perpendicular Planner
- [ ] Inverse pool changes match signal dynamics
- [ ] No cascade lock (escape path saturation)
- [ ] Recent branch memory prevents reuse
- [ ] Affinity stays above minAffinity threshold

### Asymmetry Mode-Switch
- [ ] Strength values have bimodal distribution (rare near 0.5)
- [ ] No oscillation (strength shouldn't flip repeatedly)
- [ ] Switch frequency matches expectation (e.g., 5-20%)
- [ ] Outside band: always return (0.0, 0.5)
- [ ] Inside band: asymmetry varies meaningfully

### Integration
- [ ] Perpendicular inverse pool selection observable in asymmetry patterns
- [ ] Mode switches are contextually appropriate
- [ ] System recovers from failures gracefully
- [ ] Monitoring shows expected seasonal patterns

---

## Decision Tree: Which to Read First?

```
START
  │
  ├─ "I have 5 minutes"
  │   └→ BRIDGE_SYSTEM_SUMMARY.md
  │
  ├─ "I want to implement perpendicular planner"
  │   ├→ PERPENDICULAR_PLANNER_QUICKSTART.md (understand)
  │   └→ PERPENDICULAR_PLANNER_DESIGN.md (detail)
  │
  ├─ "I want to implement asymmetry mode-switch"
  │   ├→ ASYMMETRY_MODE_SWITCH_QUICKSTART.md (understand)
  │   ├→ ASYMMETRY_MODE_SWITCH_DESIGN.md (theory)
  │   └→ ASYMMETRY_MODE_SWITCH_INTEGRATION.md (implement)
  │
  ├─ "I want to implement both"
  │   ├→ BRIDGE_SYSTEM_SUMMARY.md (overview)
  │   ├→ PERPENDICULAR_PLANNER_QUICKSTART.md
  │   ├→ ASYMMETRY_MODE_SWITCH_QUICKSTART.md
  │   ├→ PERPENDICULAR_PLANNER_DESIGN.md
  │   ├→ ASYMMETRY_MODE_SWITCH_DESIGN.md
  │   └→ ASYMMETRY_MODE_SWITCH_INTEGRATION.md
  │
  ├─ "Something is broken"
  │   └→ ASYMMETRY_MODE_SWITCH_INTEGRATION.md (debugging section)
  │
  └─ "I need to tune parameters"
      ├→ ASYMMETRY_MODE_SWITCH_INTEGRATION.md (tuning worksheet)
      ├→ PERPENDICULAR_PLANNER_DESIGN.md (tuning parameters)
      └→ ASYMMETRY_MODE_SWITCH_DESIGN.md (tuning parameters)
```

---

## Quick Links

- **Concept**: BRIDGE_SYSTEM_SUMMARY.md
- **Perpendicular idea**: PERPENDICULAR_PLANNER_QUICKSTART.md
- **Asymmetry idea**: ASYMMETRY_MODE_SWITCH_QUICKSTART.md
- **Perpendicular deep dive**: PERPENDICULAR_PLANNER_DESIGN.md
- **Asymmetry deep dive**: ASYMMETRY_MODE_SWITCH_DESIGN.md
- **Implementation guide**: ASYMMETRY_MODE_SWITCH_INTEGRATION.md
- **This index**: DESIGN_INDEX.md

---

## Generated From

**Creative Meditation Session:** 2025-12-09 00:51:37 UTC

**Concepts Explored:**
1. Context-dependent perpendicular inversions with heuristic feedback
2. Graded asymmetry mode-switches with Jaccard proximity activation

**Methodology:**
- Dual meditation paths (direct + inverse)
- Multi-model AI synthesis (Kimi K2 + Deepseek V3)
- Systematic failure mode analysis
- Practical implementation guidance

**Documentation Quality:**
- 100+ code examples (Python, TypeScript)
- 20+ diagrams and visual aids
- 30+ tuning parameters with ranges
- Complete failure mode coverage
- Production-ready checklists

---

**Start reading:**
- Quick overview: BRIDGE_SYSTEM_SUMMARY.md
- Implementation: PERPENDICULAR_PLANNER_QUICKSTART.md → ASYMMETRY_MODE_SWITCH_QUICKSTART.md

