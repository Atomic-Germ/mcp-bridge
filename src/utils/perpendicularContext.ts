/**
 * Perpendicular context generator
 * Given a primary context list, synthesize an "orthogonal" set by
 * flipping meanings, adding shadow terms, and injecting contrarian seeds.
 */

const ANTONYM_MAP: Record<string, string[]> = {
  up: ["down", "ground"],
  down: ["up", "lift"],
  light: ["dark", "shadow"],
  dark: ["light", "signal"],
  order: ["chaos", "entropy"],
  chaos: ["order", "pattern"],
  build: ["dismantle", "disperse"],
  create: ["erase", "unmake"],
  converge: ["diverge", "fan"],
  diverge: ["converge", "focus"],
  connect: ["sever", "disconnect"],
  bridge: ["chasm", "gap"],
  flow: ["stall", "dam"],
  wish: ["doubt", "resign"],
  curiosity: ["certainty", "routine"],
  agency: ["constraint", "automation"],
  walk: ["still", "pause"],
  bind: ["release", "scatter"],
  binding: ["release", "scatter"],
};

const CONTRARIAN_SEEDS = [
  "orthogonal",
  "side-channel",
  "mirror",
  "inverse",
  "anti-pattern",
  "shadow",
  "void",
  "noise",
  "glitch",
  "counterfactual",
  "lateral",
  "perpendicular",
];

export interface PerpendicularOptions {
  targetLength?: number;
  additionalPool?: string[];
  seed?: string;
  useAntonymMap?: boolean;
}

export interface PerpendicularResult {
  perpendicular: string[];
  mapping: Array<{ source?: string; derived: string; method: string }>;
  rationale: string[];
}

/**
 * Generate an orthogonal context set from a primary list.
 * The goal is contrast, not perfect antonymy.
 */
export function generatePerpendicularContext(
  primary: string[],
  options: PerpendicularOptions = {}
): PerpendicularResult {
  const normalized = primary
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 0);

  const targetLength = options.targetLength ?? Math.max(normalized.length, 4);
  const pool = buildPool(options.additionalPool);
  const rng = makeRng(options.seed ?? Date.now().toString());

  const set = new Set<string>();
  const mapping: Array<{ source?: string; derived: string; method: string }> = [];

  for (const word of normalized) {
    if (options.useAntonymMap !== false) {
      const antonyms = ANTONYM_MAP[word];
      if (antonyms && antonyms.length > 0) {
        const choice = pick(antonyms, rng);
        set.add(choice);
        mapping.push({ source: word, derived: choice, method: "antonym" });
        continue;
      }
    }

    const variants = buildVariants(word);
    const derived = pick(variants, rng);
    set.add(derived);
    mapping.push({ source: word, derived, method: "variant" });
  }

  while (set.size < targetLength && pool.length > 0) {
    const next = pick(pool, rng);
    set.add(next);
    mapping.push({ derived: next, method: "contrarian-seed" });
  }

  const perpendicular = Array.from(set).slice(0, targetLength);
  const rationale = buildRationale(mapping, normalized, perpendicular);

  return { perpendicular, mapping, rationale };
}

function buildPool(additional?: string[]): string[] {
  const base = [...CONTRARIAN_SEEDS];
  if (additional) {
    additional.forEach((w) => {
      const trimmed = w.trim().toLowerCase();
      if (trimmed) base.push(trimmed);
    });
  }
  return Array.from(new Set(base));
}

function buildVariants(word: string): string[] {
  return [
    `anti-${word}`,
    `shadow ${word}`,
    `mirror ${word}`,
    `inverse ${word}`,
    `lateral ${word}`,
    `${word} glitch`,
    `${word} void`,
  ];
}

function makeRng(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    // Linear congruential generator
    state = (state * 1664525 + 1013904223) % 0xffffffff;
    return state / 0xffffffff;
  };
}

function pick<T>(list: T[], rng: () => number): T {
  const idx = Math.floor(rng() * list.length);
  return list[idx];
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildRationale(
  mapping: Array<{ source?: string; derived: string; method: string }>,
  primary: string[],
  perpendicular: string[]
): string[] {
  const lines: string[] = [];

  for (const m of mapping) {
    if (!perpendicular.includes(m.derived)) continue;
    if (m.source) {
      lines.push(`${m.source} → ${m.derived} (${m.method})`);
    } else {
      lines.push(`seed → ${m.derived} (${m.method})`);
    }
  }

  const missed = primary.filter((p) => !mapping.some((m) => m.source === p));
  if (missed.length > 0) {
    lines.push(`unused source terms: ${missed.join(", ")}`);
  }

  return lines;
}
