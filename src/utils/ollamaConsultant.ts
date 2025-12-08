/**
 * Ollama Consultant Utility
 * Wrapper for calling Ollama models from within Bridge
 * Enables multi-model critique and consultation
 */

export interface OllamaResponse {
  model: string;
  response: string;
  processingTime?: number;
}

export interface OllamaError {
  model: string;
  error: string;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const DEFAULT_TIMEOUT = 120000; // 2 minutes

/**
 * Consult a single Ollama model
 */
export async function consultOllamaModel(
  model: string,
  prompt: string,
  systemPrompt?: string,
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<OllamaResponse> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        system: systemPrompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const processingTime = Date.now() - startTime;

    return {
      model,
      response: data.response || "",
      processingTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to consult model ${model}: ${message}`);
  }
}

/**
 * Consult multiple Ollama models in parallel
 */
export async function compareOllamaModels(
  models: string[],
  prompt: string,
  systemPrompt?: string,
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<{
  successes: OllamaResponse[];
  failures: OllamaError[];
}> {
  const promises = models.map((model) =>
    consultOllamaModel(model, prompt, systemPrompt, timeoutMs)
      .then((result) => ({ success: true as const, result }))
      .catch((error) => ({
        success: false as const,
        error: {
          model,
          error: error instanceof Error ? error.message : String(error),
        },
      }))
  );

  const results = await Promise.all(promises);

  const successes = results
    .filter((r) => r.success)
    .map((r) => (r as any).result);

  const failures = results
    .filter((r) => !r.success)
    .map((r) => (r as any).error);

  return { successes, failures };
}

/**
 * List available Ollama models
 */
export async function listOllamaModels(): Promise<
  { name: string; size?: string; digest?: string }[]
> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = (await response.json()) as any;
    return (data.models || []).map((m: any) => ({
      name: m.name,
      size: m.size,
      digest: m.digest,
    }));
  } catch (error) {
    console.error("Failed to list Ollama models:", error);
    // Return empty list on error so bridge can still function
    return [];
  }
}

/**
 * Analyze consensus between multiple critique responses
 */
export function analyzeConsensus(responses: OllamaResponse[]): {
  consensus: string[];
  divergent: string[];
  agreementScore: number;
} {
  if (responses.length === 0) {
    return {
      consensus: [],
      divergent: [],
      agreementScore: 0,
    };
  }

  if (responses.length === 1) {
    // Single response: extract main points
    const sentences = responses[0].response
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 20)
      .slice(0, 3);

    return {
      consensus: sentences,
      divergent: [],
      agreementScore: 1.0, // Single response is 100% agreement with itself
    };
  }

  // Multi-model consensus: find common themes
  // Simple heuristic: extract key sentences, count overlaps
  const allSentences = responses.flatMap((r) =>
    r.response
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 20)
  );

  // Count keyword overlaps as proxy for consensus
  const keywordOverlapScore = computeOverlapScore(responses.map((r) => r.response));

  // Take first few sentences from each response as "consensus"
  const consensus = responses
    .slice(0, 2)
    .flatMap((r) =>
      r.response
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 20)
        .slice(0, 1)
    );

  // Identify divergent points (differing viewpoints)
  const divergent = responses
    .filter((r, i) => i > 0) // After first response
    .flatMap((r) =>
      r.response
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 20)
        .slice(0, 1)
    );

  return {
    consensus: consensus.slice(0, 3),
    divergent: divergent.slice(0, 2),
    agreementScore: Math.min(1, keywordOverlapScore),
  };
}

/**
 * Compute keyword overlap between responses
 */
function computeOverlapScore(responses: string[]): number {
  if (responses.length < 2) return 1.0;

  const extractKeywords = (text: string): Set<string> => {
    return new Set(
      text
        .toLowerCase()
        .match(/\b\w{5,}\b/g) // Words 5+ chars
        ?.slice(0, 20) || [] // Top 20
    );
  };

  const keywordSets = responses.map(extractKeywords);

  // Compute Jaccard similarity between first and others
  let totalSimilarity = 0;
  for (let i = 1; i < keywordSets.length; i++) {
    const intersection = new Set([...keywordSets[0]].filter((x) => keywordSets[i].has(x)));
    const union = new Set([...keywordSets[0], ...keywordSets[i]]);
    const similarity = intersection.size / (union.size || 1);
    totalSimilarity += similarity;
  }

  return totalSimilarity / (keywordSets.length - 1);
}
