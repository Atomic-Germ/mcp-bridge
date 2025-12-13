/**
 * Simple NLP utilities for MCP-Bridge
 * Fast, transparent concept extraction without transformers
 *
 * Design philosophy:
 * - Tokenization: Split on whitespace + punctuation boundaries
 * - Keywords: Frequency-based + uncommon word boost (simple TF)
 * - Similarity: Jaccard (set overlap) for fast comparison
 * - Clustering: Group concepts by lexical similarity
 */

/**
 * Tokenize text into words
 * Handles punctuation by treating it as token boundary
 */
export function tokenize(text: string): string[] {
  // Split on whitespace and punctuation, keeping meaningful boundaries
  const tokens = text
    .toLowerCase()
    .split(/[\s\-_.,;:!?()[\]{}"']+/)
    .filter((token) => token.length > 0);

  return tokens;
}

/**
 * Extract keywords using simple frequency analysis
 * Boosts uncommon words (likely more specific/meaningful)
 */
export function extractKeywords(
  text: string,
  limit: number = 10,
  minLength: number = 3
): string[] {
  const tokens = tokenize(text);

  // Filter: only keep meaningful length tokens
  const filtered = tokens.filter((token) => token.length >= minLength);

  // Frequency count
  const frequency = new Map<string, number>();
  for (const token of filtered) {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }

  // Compute TF (term frequency) with uncommon word boost
  const totalTokens = filtered.length;
  const tf = new Map<string, number>();

  for (const [token, count] of frequency.entries()) {
    const relativeFreq = count / totalTokens;

    // Boost uncommon words (those appearing 1-2 times)
    // They're likely domain-specific and important
    const uncommonBoost = count <= 2 ? 1.5 : 1.0;

    tf.set(token, relativeFreq * uncommonBoost);
  }

  // Sort by score and return top N
  const sorted = Array.from(tf.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);

  return sorted;
}

/**
 * Compute Jaccard similarity between two sets of words
 * Measures overlap: intersection / union
 * Range: 0 (nothing in common) to 1 (identical)
 */
export function jaccardSimilarity(words1: string[], words2: string[]): number {
  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = [...set1].filter((w) => set2.has(w)).length;
  const union = new Set([...set1, ...set2]).size;

  return union === 0 ? 0 : intersection / union;
}

/**
 * Compute cosine similarity between two word frequency vectors
 * More granular than Jaccard; considers frequency
 */
export function cosineSimilarity(words1: string[], words2: string[]): number {
  // Build frequency vectors
  const freq1 = new Map<string, number>();
  const freq2 = new Map<string, number>();

  for (const word of words1) {
    freq1.set(word, (freq1.get(word) || 0) + 1);
  }
  for (const word of words2) {
    freq2.set(word, (freq2.get(word) || 0) + 1);
  }

  // Compute dot product (common words * their frequencies)
  let dotProduct = 0;
  for (const [word, count1] of freq1.entries()) {
    const count2 = freq2.get(word) || 0;
    dotProduct += count1 * count2;
  }

  // Compute magnitudes
  let mag1 = 0,
    mag2 = 0;
  for (const count of freq1.values()) {
    mag1 += count * count;
  }
  for (const count of freq2.values()) {
    mag2 += count * count;
  }

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (mag1 * mag2);
}

/**
 * Cluster concepts by lexical similarity
 * Groups related words (e.g., "create", "creation", "creative")
 */
export function semanticCluster(
  concepts: string[],
  threshold: number = 0.5
): string[][] {
  if (concepts.length === 0) return [];
  if (concepts.length === 1) return [concepts];

  // Simple clustering: group by substring match or lexical similarity
  const clusters: string[][] = [];
  const used = new Set<string>();

  for (const concept of concepts) {
    if (used.has(concept)) continue;

    const cluster: string[] = [concept];
    used.add(concept);

    // Find similar concepts
    for (const other of concepts) {
      if (used.has(other)) continue;

      // Check similarity metrics:
      // 1. Substring containment (e.g., "create" in "creative")
      // 2. Lexical distance (first 3 chars match)
      // 3. Jaccard on character bigrams

      const isSubstring =
        concept.includes(other) || other.includes(concept);
      const sharedPrefix =
        concept.substring(0, 3) === other.substring(0, 3);

      if (isSubstring || sharedPrefix) {
        cluster.push(other);
        used.add(other);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Compute average similarity of a concept to a set of prior concepts
 * Used for novelty scoring
 */
export function averageSimilarity(
  concept: string[],
  priors: string[][]
): number {
  if (priors.length === 0) return 1.0; // First entry: maximum novelty

  let totalSimilarity = 0;
  for (const prior of priors) {
    totalSimilarity += jaccardSimilarity(concept, prior);
  }

  return totalSimilarity / priors.length;
}

/**
 * Extract text statistics (word count, sentence count, etc.)
 */
export function textStats(text: string): {
  wordCount: number;
  sentenceCount: number;
  avgWordLength: number;
  uniqueWords: number;
} {
  const words = tokenize(text);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const uniqueWords = new Set(words).size;
  const avgWordLength =
    words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordLength,
    uniqueWords,
  };
}

/**
 * Extract noun-like concepts (heuristic-based)
 * Simple approach: longer words + lowercase + -tion, -ity, -ment endings
 */
export function extractNounLikeConcepts(text: string): string[] {
  const words = tokenize(text);

  return words.filter((word) => {
    // Keep words that:
    // 1. Are 4+ characters (more likely nouns)
    // 2. Have noun-like endings
    // 3. Are not common function words

    const nounLikeEndings = [
      "tion",
      "ity",
      "ment",
      "ness",
      "ance",
      "ence",
      "able",
    ];
    const commonFunctionWords = new Set([
      "the",
      "and",
      "or",
      "is",
      "are",
      "was",
      "were",
      "be",
      "being",
      "that",
      "this",
      "what",
      "which",
      "where",
      "when",
      "through",
      "into",
      "without",
      "without",
      "becomes",
      "descends",
      "between",
    ]);

    if (commonFunctionWords.has(word)) return false;
    if (word.length < 4) return false;

    const hasNounEnding = nounLikeEndings.some((ending) =>
      word.endsWith(ending)
    );

    return hasNounEnding || word.length >= 7; // Longer words more likely nouns
  });
}

/**
 * Extract themes from a narrative
 * Placeholder implementation: Extract themes by splitting narrative into unique words
 */
export function extractThemesFromNarrative(narrative: string): string[] {
  const words = narrative.split(/\s+/);
  const uniqueWords = Array.from(new Set(words));

  // Hypothetical logic to filter meaningful themes
  return uniqueWords.filter((word) => word.length > 4); // Example: Only words longer than 4 characters
}
