export type McpContentPart =
  | { type: 'text'; text?: string }
  | { type: 'resource'; resource?: { text?: string } }
  | { type: string; [k: string]: unknown };

export type McpToolResultLike = {
  content?: McpContentPart[];
  isError?: boolean;
  [k: string]: unknown;
};

export function extractTextFromMcpResult(result: unknown): string | null {
  if (typeof result === 'string') return result;
  if (!result || typeof result !== 'object') return null;

  const maybe = result as McpToolResultLike;
  const content = Array.isArray(maybe.content) ? maybe.content : [];

  const texts: string[] = [];
  for (const part of content) {
    if (!part || typeof part !== 'object') continue;
    if ((part as any).type === 'text') {
      const t = (part as any).text;
      if (typeof t === 'string' && t.trim()) texts.push(t);
    }
    if ((part as any).type === 'resource') {
      const t = (part as any).resource?.text;
      if (typeof t === 'string' && t.trim()) texts.push(t);
    }
  }

  if (texts.length === 0) return null;
  return texts.join('\n');
}

export function parseCreativeMeditationText(text: string): {
  emergentSentence?: string;
  contextWords?: string[];
  numRandomWords?: number;
} {
  // Expected shape (current mcp-creative):
  // Random Elements: a, b, c
  // Context Elements: x, y OR (none)
  // ✨ EMERGENT SENTENCE:
  // "..."
  const out: {
    emergentSentence?: string;
    contextWords?: string[];
    numRandomWords?: number;
  } = {};

  const randomMatch = text.match(/^Random Elements:\s*(.+)$/m);
  if (randomMatch && randomMatch[1]) {
    const items = randomMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length > 0) out.numRandomWords = items.length;
  }

  const contextMatch = text.match(/^Context Elements:\s*(.+)$/m);
  if (contextMatch && contextMatch[1]) {
    const raw = contextMatch[1].trim();
    if (raw === '(none)' || raw === 'none') {
      out.contextWords = [];
    } else {
      out.contextWords = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const emergentBlock = text.match(/✨\s*EMERGENT SENTENCE:\s*\n([\s\S]*?)(?:\n\n|$)/);
  if (emergentBlock && emergentBlock[1]) {
    const line = emergentBlock[1].trim();
    const quoted = line.match(/^"([\s\S]*)"$/);
    out.emergentSentence = quoted ? quoted[1] : line;
  }

  return out;
}
