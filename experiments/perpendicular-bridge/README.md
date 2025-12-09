# Perpendicular Bridge (Experiment)

A tiny utility to generate an "orthogonal" context list from a primary one. It flips meanings when possible, injects shadow/contrarian seeds, and returns a rationale for each mapping.

## Why
Bridge mode-switching is great at telling you *when* to switch. Perpendicular Bridge asks: what if we also walk sideways? Run two meditations: your main path and an orthogonal set. The crossing often reveals the most interesting binding.

## Usage
```ts
import { generatePerpendicularContext } from "../../src/utils/perpendicularContext.js";

const primary = ["bridge", "walk", "wish", "curiosity", "agency"];
const { perpendicular, rationale } = generatePerpendicularContext(primary, {
  seed: "perpendicular-demo",
  targetLength: 8,
});

console.log(perpendicular);
// e.g., ["chasm", "still", "resign", "certainty", "constraint", "mirror", "orthogonal", "shadow"]
console.log(rationale);
// ["bridge → chasm (antonym)", "walk → still (antonym)", ...]
```

Or build a paired meditation plan (primary + perpendicular prompts):

```ts
import { buildPairedMeditationPlan } from "../../src/experiments/perpendicularBridge.js";

const plan = buildPairedMeditationPlan(primary, { seed: "perpendicular-demo" });

console.log(plan.primary.prompt);
console.log(plan.perpendicular.prompt);
console.log(plan.crossingPrompt);
```

## How it works
- Antonym map for quick flips (bridge→chasm, curiosity→certainty, etc.)
- Variant generator for terms without an antonym (anti-*, shadow *, inverse *)
- Contrarian seed pool (orthogonal, void, noise, glitch, counterfactual)
- Seeded RNG for reproducibility

## Possible next steps
- Add a tiny driver that runs paired meditations (primary vs perpendicular) and logs both to the bridge.
- Visualize the crossings: two timelines with a shared binding lane.
- Expand the antonym map with domain-specific vocab.
