import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { ConceptMemory } from "../utils/conceptMemory";

describe("ConceptMemory", () => {
  let memory: ConceptMemory;
  const testDir = "/tmp/test-concept-memory";

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    memory = new ConceptMemory(testDir);
  });

  afterEach(() => {
    memory.clear();
  });

  it("should record a new concept", () => {
    const record = memory.recordConcept("constraint", "session-1", "Constraint breeds creativity");

    expect(record.concept).toBe("constraint");
    expect(record.sessionIds).toContain("session-1");
    expect(record.evolution.insightProgression.length).toBe(1);
  });

  it("should update existing concept", () => {
    memory.recordConcept("constraint", "session-1", "Insight 1");
    const updated = memory.recordConcept("constraint", "session-2", "Insight 2");

    expect(updated.sessionIds).toContain("session-1");
    expect(updated.sessionIds).toContain("session-2");
    expect(updated.evolution.insightProgression.length).toBe(2);
  });

  it("should link related concepts", () => {
    memory.recordConcept("constraint", "session-1", "Constraint insight");
    memory.recordConcept("freedom", "session-1", "Freedom insight");
    memory.linkConcepts("constraint", "freedom");

    const constraint = memory.getConcept("constraint");
    expect(constraint?.relatedConcepts).toContain("freedom");
  });

  it("should retrieve related concepts", () => {
    memory.recordConcept("constraint", "session-1", "Constraint");
    memory.recordConcept("freedom", "session-1", "Freedom");
    memory.recordConcept("structure", "session-1", "Structure");
    memory.linkConcepts("constraint", "freedom");
    memory.linkConcepts("constraint", "structure");

    const related = memory.getRelated("constraint");
    expect(related.length).toBeGreaterThanOrEqual(2);
    expect(related.map((r) => r.concept)).toContain("freedom");
  });

  it("should get session concepts", () => {
    memory.recordConcept("constraint", "session-1", "Insight");
    memory.recordConcept("freedom", "session-1", "Insight");
    memory.recordConcept("creativity", "session-2", "Insight");

    const sessionConcepts = memory.getSessionConcepts("session-1");
    expect(sessionConcepts.length).toBe(2);
    expect(sessionConcepts.map((c) => c.concept)).toContain("constraint");
    expect(sessionConcepts.map((c) => c.concept)).toContain("freedom");
  });

  it("should get concept evolution", () => {
    memory.recordConcept("constraint", "session-1", "First insight");
    memory.recordConcept("constraint", "session-2", "Second insight");
    memory.recordConcept("constraint", "session-3", "Third insight");

    const evolution = memory.getConceptEvolution("constraint");
    expect(evolution).not.toBeNull();
    expect(evolution?.sessionCount).toBe(3);
    expect(evolution?.evolution.length).toBe(3);
  });

  it("should provide statistics", () => {
    memory.recordConcept("constraint", "session-1", "Insight");
    memory.recordConcept("constraint", "session-2", "Insight");
    memory.recordConcept("freedom", "session-1", "Insight");
    memory.recordConcept("creativity", "session-3", "Insight");

    const stats = memory.getStats();
    expect(stats.totalConcepts).toBeGreaterThanOrEqual(3);
    expect(stats.totalSessions).toBeGreaterThanOrEqual(3);
    expect(stats.mostFrequent[0].concept).toBe("constraint");
    expect(stats.mostFrequent[0].count).toBe(2);
  });

  it("should normalize concept names", () => {
    memory.recordConcept("Constraint", "session-1", "Insight");
    const record = memory.getConcept("constraint");

    expect(record).not.toBeUndefined();
    expect(record?.concept).toBe("constraint");
  });

  it("should persist to disk", () => {
    memory.recordConcept("constraint", "session-1", "Insight");
    memory.recordConcept("freedom", "session-1", "Insight");

    // Create new instance and reload
    const memory2 = new ConceptMemory(testDir);
    const constraint = memory2.getConcept("constraint");
    const freedom = memory2.getConcept("freedom");

    expect(constraint).not.toBeUndefined();
    expect(freedom).not.toBeUndefined();
  });

  it("should track models that tested concepts", () => {
    memory.recordConcept("constraint", "session-1", "Insight", "llama2");
    const record = memory.recordConcept("constraint", "session-2", "Insight", "mistral");

    expect(record.modelsTested).toContain("llama2");
    expect(record.modelsTested).toContain("mistral");
  });
});
