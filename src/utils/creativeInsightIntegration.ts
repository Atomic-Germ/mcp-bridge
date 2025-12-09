/**
 * Creative Insight Integration Utility
 * Calls mcp-creative's insight extraction for deeper pattern analysis
 */

export interface InsightPattern {
  name: string;              // "Paradox", "Emergence", "Harmony", etc.
  description: string;       // What the pattern means
  confidence: number;        // 0-1: how certain we are
  relatedConcepts: string[]; // Which concepts relate to this pattern
}

export interface DeepInsight {
  patterns: InsightPattern[];
  themes: string[];
  metaPatterns: string[];    // Patterns about the patterns
  focusAreas: string[];      // Where to direct next meditation
  timestamp: number;         // Unix ms
}

/**
 * Parse creative_insight text response to extract structured patterns
 */
export function parseInsightResponse(responseText: string): DeepInsight {
  const lines = responseText.split("\n").filter((l) => l.trim().length > 0);

  // Extract patterns using heuristics
  const patterns: InsightPattern[] = [];
  const themes: string[] = [];
  const metaPatterns: string[] = [];
  const focusAreas: string[] = [];

  // Pattern keywords to look for
  const patternKeywords: Record<string, string> = {
    paradox: "Paradox or contradiction",
    emergence: "Emergence or evolution",
    harmony: "Harmony or resonance",
    tension: "Tension or duality",
    transcendence: "Transcendence or boundary-crossing",
    immanence: "Immanence or inner presence",
    synthesis: "Synthesis or integration",
    coherence: "Coherence or alignment",
  };

  for (const line of lines) {
    const lowered = line.toLowerCase();

    // Detect patterns
    for (const [keyword, name] of Object.entries(patternKeywords)) {
      if (lowered.includes(keyword)) {
        patterns.push({
          name,
          description: line,
          confidence: 0.7,
          relatedConcepts: extractConcepts(line),
        });
      }
    }

    // Detect meta-patterns (patterns about the meditation process itself)
    if (
      lowered.includes("pattern") ||
      lowered.includes("structure") ||
      lowered.includes("meaning-making")
    ) {
      metaPatterns.push(line);
    }

    // Detect themes
    if (
      lowered.includes("theme") ||
      lowered.includes("suggests") ||
      lowered.includes("resonat")
    ) {
      themes.push(line);
    }
  }

  // Generate focus areas from patterns
  if (patterns.length > 0) {
    focusAreas.push(
      `Explore the ${patterns[0].name.toLowerCase()} you discovered`
    );
  }
  if (patterns.length > 1) {
    focusAreas.push(
      `Consider the relationship between ${patterns[0].name.toLowerCase()} and ${patterns[1].name.toLowerCase()}`
    );
  }
  if (metaPatterns.length > 0) {
    focusAreas.push("Reflect on how meaning was constructed in this meditation");
  }

  return {
    patterns,
    themes,
    metaPatterns,
    focusAreas,
    timestamp: Date.now(),
  };
}

/**
 * Extract concepts from a text snippet
 */
function extractConcepts(text: string): string[] {
  // Simple heuristic: capitalized words (likely concepts)
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  return matches ? matches.slice(0, 3) : [];
}

/**
 * Format insights for human readability
 */
export function formatDeepInsights(insight: DeepInsight): string {
  const lines: string[] = [];

  lines.push("=== DEEPER INSIGHTS ===\n");

  if (insight.patterns.length > 0) {
    lines.push("🔍 Patterns Detected:");
    for (const p of insight.patterns) {
      lines.push(
        `  • ${p.name} (${(p.confidence * 100).toFixed(0)}% confidence)`
      );
      lines.push(`    ${p.description}`);
      if (p.relatedConcepts.length > 0) {
        lines.push(`    Related: ${p.relatedConcepts.join(", ")}`);
      }
    }
    lines.push("");
  }

  if (insight.metaPatterns.length > 0) {
    lines.push("🎨 Meta-Patterns:");
    for (const m of insight.metaPatterns) {
      lines.push(`  • ${m}`);
    }
    lines.push("");
  }

  if (insight.focusAreas.length > 0) {
    lines.push("🎯 Suggested Focus Areas:");
    for (const f of insight.focusAreas) {
      lines.push(`  • ${f}`);
    }
    lines.push("");
  }

  if (insight.themes.length > 0) {
    lines.push("📍 Themes:");
    for (const t of insight.themes) {
      lines.push(`  • ${t}`);
    }
  }

  return lines.join("\n");
}

/**
 * Create context for next meditation based on deep insights
 */
export function createContextFromInsights(insight: DeepInsight): {
  contextWords: string[];
  guidingQuestions: string[];
} {
  const contextWords: string[] = [];
  const guidingQuestions: string[] = [];

  // Extract pattern names as context
  for (const p of insight.patterns) {
    const pattern = p.name.toLowerCase().split(" ")[0];
    contextWords.push(pattern);
  }

  // Create guiding questions based on patterns
  if (insight.patterns.some((p) => p.name.includes("Paradox"))) {
    guidingQuestions.push("How does this paradox resolve?");
    guidingQuestions.push("What's the hidden unity in this contradiction?");
  }

  if (insight.patterns.some((p) => p.name.includes("Emergence"))) {
    guidingQuestions.push("What emerges from this?");
    guidingQuestions.push("How does it evolve?");
  }

  if (insight.patterns.some((p) => p.name.includes("Harmony"))) {
    guidingQuestions.push("What creates this harmony?");
    guidingQuestions.push("Where is dissonance?");
  }

  if (insight.patterns.some((p) => p.name.includes("Tension"))) {
    guidingQuestions.push("Is this tension generative or destructive?");
    guidingQuestions.push("What would balance this?");
  }

  // Ensure we have at least some context
  if (contextWords.length === 0) {
    contextWords.push("reflection", "pattern", "meaning");
  }

  if (guidingQuestions.length === 0) {
    guidingQuestions.push("What does this reveal?");
    guidingQuestions.push("How does it transform understanding?");
  }

  return { contextWords, guidingQuestions };
}
