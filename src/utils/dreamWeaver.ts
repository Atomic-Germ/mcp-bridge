import { MeditationTrace } from "../types.js";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";

interface Granule {
  id: string;
  content: string;
  keywords: Set<string>;
  originalTrace: MeditationTrace;
}

interface DreamJournalEntry {
  id: string;
  timestamp: string;
  seed?: string;
  length: number;
  granules: {
    id: string;
    content: string;
    keywords: string[];
    traceId: string;
  }[];
  narrative: string;
}

export class DreamWeaver {
  /**
   * Weaves a narrative dream from a session's meditation traces.
   * Connects insights based on shared concepts (adjacency).
   */
  static async weave(traces: MeditationTrace[], length: number = 5, seed?: string): Promise<string> {
    // 1. Convert Traces to Granules
    const granules: Granule[] = traces
      .filter(t => t.meditation && t.insights) // Only use meditation traces
      .map(t => {
        const content = t.meditation!.emergentSentence;
        const keywords = new Set([
          ...t.meditation!.contextWords,
          ...(t.insights!.extractedPatterns || [])
        ]);
        
        return {
          id: t.id,
          content,
          keywords,
          originalTrace: t
        };
      });

    if (granules.length === 0) {
      return "The session is silent. No meditations to weave.";
    }

    // 2. Weave (Random Walk with Affinity)
    let current: Granule;

    // Pick start
    if (seed) {
      const matches = granules.filter(g => 
        g.content.toLowerCase().includes(seed.toLowerCase()) ||
        [...g.keywords].some(k => k.toLowerCase().includes(seed.toLowerCase()))
      );
      current = matches.length > 0 
        ? matches[Math.floor(Math.random() * matches.length)] 
        : granules[Math.floor(Math.random() * granules.length)];
    } else {
      current = granules[Math.floor(Math.random() * granules.length)];
    }

    const dreamPath: Granule[] = [current];
    const visited = new Set<string>([current.id]);

    // Limit length to available granules if smaller
    const actualLength = Math.min(length, granules.length);

    for (let i = 0; i < actualLength - 1; i++) {
      const next = this.findNextGranule(current, granules, visited);
      if (!next) break; // Dead end or all visited
      
      dreamPath.push(next);
      visited.add(next.id);
      current = next;
    }

    // 3. Format Output
    const narrative = this.formatDream(dreamPath);

    // 4. Save to Journal
    await this.saveToJournal(dreamPath, narrative, seed);

    return narrative;
  }

  private static async saveToJournal(dreamPath: Granule[], narrative: string, seed?: string) {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.env.HOME || "/tmp", ".cache/mcp-bridge/dreams");
    
    try {
      await fs.mkdir(memoryDir, { recursive: true });
      
      const entry: DreamJournalEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        seed,
        length: dreamPath.length,
        granules: dreamPath.map(g => ({
          id: g.id,
          content: g.content,
          keywords: Array.from(g.keywords),
          traceId: g.originalTrace.id
        })),
        narrative
      };

      const filename = `dream-${entry.timestamp.replace(/[:.]/g, "-")}.json`;
      await fs.writeFile(path.join(memoryDir, filename), JSON.stringify(entry, null, 2));
      // Silent success - logging might clutter bridge output
    } catch (error) {
      console.error("Failed to save dream journal:", error);
    }
  }

  private static findNextGranule(current: Granule, all: Granule[], visited: Set<string>): Granule | null {
    // Calculate affinity based on shared keywords
    const candidates = all.filter(g => !visited.has(g.id));
    
    if (candidates.length === 0) return null;

    // Simple weighted random selection based on overlap
    const scored = candidates.map(g => {
      let overlap = 0;
      current.keywords.forEach(k => {
        if (g.keywords.has(k)) overlap++;
      });
      return { granule: g, score: overlap };
    });

    // Sort by score desc
    scored.sort((a, b) => b.score - a.score);

    // Pick from top 3 or random if no overlap
    const topN = 3;
    const pool = scored.slice(0, topN).filter(x => x.score > 0);
    
    if (pool.length > 0) {
      return pool[Math.floor(Math.random() * pool.length)].granule;
    } else {
      // Jump to random (dream logic: sudden shift)
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  private static formatDream(path: Granule[]): string {
    const narrative = path.map((g, i) => {
      const next = path[i + 1];
      let transition = "";
      
      if (next) {
        // Find connecting concept
        const shared = [...g.keywords].filter(k => next.keywords.has(k));
        if (shared.length > 0) {
          transition = `\n...flowing through *${shared[0]}* to...\n`;
        } else {
          transition = `\n...suddenly shifting to...\n`;
        }
      }

      return `"${g.content}"${transition}`;
    }).join("");

    return `✨ SESSION DREAM (${path.length} moments)\n\n${narrative}`;
  }
}
