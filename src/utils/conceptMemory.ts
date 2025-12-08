/**
 * Concept Memory Manager
 * Persistent storage for concepts discovered across sessions
 * Tracks evolution, related concepts, and model analysis
 */

import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

export interface ConceptRecord {
  id: string;
  concept: string;
  firstSeen: number;
  lastSeen: number;
  sessionIds: string[];
  modelsTested: string[];
  relatedConcepts: string[];
  evolution: {
    sessionSequence: string[];
    insightProgression: string[];
  };
}

export class ConceptMemory {
  private memoryDir: string;
  private conceptsFile: string;
  private concepts: Map<string, ConceptRecord> = new Map();

  constructor(memoryDir: string = `${process.env.HOME}/.cache/mcp-bridge/concepts`) {
    this.memoryDir = memoryDir;
    this.conceptsFile = path.join(this.memoryDir, "concepts.json");
    this.initialize();
  }

  private initialize(): void {
    try {
      if (!fs.existsSync(this.memoryDir)) {
        fs.mkdirSync(this.memoryDir, { recursive: true });
      }

      if (fs.existsSync(this.conceptsFile)) {
        const data = JSON.parse(fs.readFileSync(this.conceptsFile, "utf-8"));
        this.concepts = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error("Failed to initialize concept memory:", error);
      this.concepts = new Map();
    }
  }

  /**
   * Record a concept sighting in a session
   */
  recordConcept(
    concept: string,
    sessionId: string,
    insight: string,
    model?: string
  ): ConceptRecord {
    const normalized = concept.toLowerCase().trim();
    const now = Date.now();

    let record = this.concepts.get(normalized);

    if (!record) {
      // New concept
      record = {
        id: randomUUID(),
        concept: normalized,
        firstSeen: now,
        lastSeen: now,
        sessionIds: [sessionId],
        modelsTested: model ? [model] : [],
        relatedConcepts: [],
        evolution: {
          sessionSequence: [sessionId],
          insightProgression: [insight],
        },
      };
    } else {
      // Update existing
      record.lastSeen = now;
      if (!record.sessionIds.includes(sessionId)) {
        record.sessionIds.push(sessionId);
        record.evolution.sessionSequence.push(sessionId);
      }
      if (model && !record.modelsTested.includes(model)) {
        record.modelsTested.push(model);
      }
      record.evolution.insightProgression.push(insight);
    }

    this.concepts.set(normalized, record);
    this.persist();

    return record;
  }

  /**
   * Link related concepts together
   */
  linkConcepts(concept1: string, concept2: string): void {
    const norm1 = concept1.toLowerCase().trim();
    const norm2 = concept2.toLowerCase().trim();

    const rec1 = this.concepts.get(norm1);
    const rec2 = this.concepts.get(norm2);

    if (rec1 && !rec1.relatedConcepts.includes(norm2)) {
      rec1.relatedConcepts.push(norm2);
    }

    if (rec2 && !rec2.relatedConcepts.includes(norm1)) {
      rec2.relatedConcepts.push(norm1);
    }

    this.persist();
  }

  /**
   * Get a concept record
   */
  getConcept(concept: string): ConceptRecord | undefined {
    return this.concepts.get(concept.toLowerCase().trim());
  }

  /**
   * Get related concepts
   */
  getRelated(concept: string): ConceptRecord[] {
    const record = this.getConcept(concept);
    if (!record) return [];

    return record.relatedConcepts
      .map((c) => this.concepts.get(c))
      .filter((c) => c !== undefined) as ConceptRecord[];
  }

  /**
   * Get all concepts
   */
  getAllConcepts(): ConceptRecord[] {
    return Array.from(this.concepts.values());
  }

  /**
   * Get concepts from a specific session
   */
  getSessionConcepts(sessionId: string): ConceptRecord[] {
    return Array.from(this.concepts.values()).filter((r) =>
      r.sessionIds.includes(sessionId)
    );
  }

  /**
   * Get concept evolution over time
   */
  getConceptEvolution(concept: string): {
    concept: string;
    firstSeen: Date;
    lastSeen: Date;
    sessionCount: number;
    evolution: string[];
  } | null {
    const record = this.getConcept(concept);
    if (!record) return null;

    return {
      concept: record.concept,
      firstSeen: new Date(record.firstSeen),
      lastSeen: new Date(record.lastSeen),
      sessionCount: record.sessionIds.length,
      evolution: record.evolution.insightProgression,
    };
  }

  /**
   * Get statistics about concept memory
   */
  getStats(): {
    totalConcepts: number;
    totalSessions: number;
    mostFrequent: { concept: string; count: number }[];
    mostRecent: ConceptRecord[];
  } {
    const allConcepts = Array.from(this.concepts.values());

    const mostFrequent = allConcepts
      .sort((a, b) => b.sessionIds.length - a.sessionIds.length)
      .slice(0, 5)
      .map((r) => ({ concept: r.concept, count: r.sessionIds.length }));

    const mostRecent = allConcepts
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 5);

    const uniqueSessions = new Set(allConcepts.flatMap((c) => c.sessionIds));

    return {
      totalConcepts: allConcepts.length,
      totalSessions: uniqueSessions.size,
      mostFrequent,
      mostRecent,
    };
  }

  /**
   * Persist to disk
   */
  private persist(): void {
    try {
      const data = Object.fromEntries(this.concepts);
      fs.writeFileSync(this.conceptsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to persist concept memory:", error);
    }
  }

  /**
   * Clear all concept memory
   */
  clear(): void {
    this.concepts.clear();
    try {
      if (fs.existsSync(this.conceptsFile)) {
        fs.unlinkSync(this.conceptsFile);
      }
    } catch (error) {
      console.error("Failed to clear concept memory:", error);
    }
  }
}

// Singleton instance
let instance: ConceptMemory | null = null;

export function getConceptMemory(): ConceptMemory {
  if (!instance) {
    instance = new ConceptMemory();
  }
  return instance;
}
