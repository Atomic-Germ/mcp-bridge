import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import { StorageManager } from "../utils/storage";
import { DEFAULT_CONFIG, BridgeConfig } from "../types";

describe("Session Persistence", () => {
  let storage: StorageManager;
  const testStoragePath = "/tmp/test-bridge-persistence";

  beforeEach(async () => {
    // Clean up test directory
    if (fs.existsSync(testStoragePath)) {
      fs.rmSync(testStoragePath, { recursive: true });
    }
    const config: BridgeConfig = { ...DEFAULT_CONFIG, storagePath: testStoragePath };
    storage = new StorageManager(config);
    await storage.initialize();
  });

  afterEach(async () => {
    if (fs.existsSync(testStoragePath)) {
      fs.rmSync(testStoragePath, { recursive: true });
    }
  });

  describe("getAvailableSessions", () => {
    it("should return empty list when no sessions", async () => {
      const sessions = await storage.getAvailableSessions();
      expect(sessions).toEqual([]);
    });

    it("should return session list with metadata", async () => {
      // Create a session manually
      const session = {
        sessionId: "test-session-1",
        startedAt: Date.now(),
        traces: [{ id: "trace-1" }] as any,
        metrics: {
          lastModeSwitch: Date.now(),
          currentMode: "diverge" as const,
          repetitionCount: 0,
          pauseDuration: 0,
          avgCycleDuration: 0,
          lastSuggestionTime: Date.now(),
        },
      };

      await storage.saveSession(session);
      const sessions = await storage.getAvailableSessions();

      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe("test-session-1");
      expect(sessions[0].traceCount).toBe(1);
      expect(sessions[0].startedAt).toBeGreaterThan(0);
    });
  });

  describe("getCurrentSessionId", () => {
    it("should return null when no session persisted", async () => {
      const sessionId = await storage.getCurrentSessionId();
      expect(sessionId).toBeNull();
    });

    it("should persist and retrieve current session ID", async () => {
      await storage.setCurrentSessionId("test-session-123");
      const sessionId = await storage.getCurrentSessionId();

      expect(sessionId).toBe("test-session-123");
    });
  });

  describe("setCurrentSessionId", () => {
    it("should create current-session.json file", async () => {
      await storage.setCurrentSessionId("persistent-session");

      const filePath = `${testStoragePath}/current-session.json`;
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(content.sessionId).toBe("persistent-session");
      expect(content.timestamp).toBeGreaterThan(0);
    });
  });

  describe("clearCurrentSessionId", () => {
    it("should remove current-session.json", async () => {
      await storage.setCurrentSessionId("temp-session");
      const filePath = `${testStoragePath}/current-session.json`;
      expect(fs.existsSync(filePath)).toBe(true);

      await storage.clearCurrentSessionId();
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("should not throw if file doesn't exist", async () => {
      // Should not throw
      await expect(storage.clearCurrentSessionId()).resolves.not.toThrow();
    });
  });

  describe("getMostRecentSession", () => {
    it("should return null when no sessions", async () => {
      const sessionId = await storage.getMostRecentSession();
      expect(sessionId).toBeNull();
    });

    it("should return most recently active session", async () => {
      // Create two sessions with different last activity times
      const now = Date.now();

      const session1 = {
        sessionId: "old-session",
        startedAt: now - 10000,
        traces: [] as any,
        metrics: {
          lastModeSwitch: now - 5000, // Older
          currentMode: "diverge" as const,
          repetitionCount: 0,
          pauseDuration: 0,
          avgCycleDuration: 0,
          lastSuggestionTime: now - 5000,
        },
      };

      const session2 = {
        sessionId: "recent-session",
        startedAt: now,
        traces: [] as any,
        metrics: {
          lastModeSwitch: now, // Newer
          currentMode: "diverge" as const,
          repetitionCount: 0,
          pauseDuration: 0,
          avgCycleDuration: 0,
          lastSuggestionTime: now,
        },
      };

      await storage.saveSession(session1);
      await storage.saveSession(session2);

      const mostRecent = await storage.getMostRecentSession();
      expect(mostRecent).toBe("recent-session");
    });
  });

  describe("Session recovery workflow", () => {
    it("should support full persistence workflow", async () => {
      // Step 1: Create session
      const sessionId = "recovery-test-session";
      const session = {
        sessionId,
        startedAt: Date.now(),
        traces: [] as any,
        metrics: {
          lastModeSwitch: Date.now(),
          currentMode: "diverge" as const,
          repetitionCount: 0,
          pauseDuration: 0,
          avgCycleDuration: 0,
          lastSuggestionTime: Date.now(),
        },
      };

      await storage.saveSession(session);

      // Step 2: Persist as current
      await storage.setCurrentSessionId(sessionId);

      // Step 3: Simulate server restart (new storage instance)
      const config: BridgeConfig = { ...DEFAULT_CONFIG, storagePath: testStoragePath };
      const newStorage = new StorageManager(config);
      await newStorage.initialize();

      // Step 4: Retrieve current session ID
      const restoredId = await newStorage.getCurrentSessionId();
      expect(restoredId).toBe(sessionId);

      // Step 5: Retrieve session data
      const restoredSession = await newStorage.loadSession(sessionId);
      expect(restoredSession?.sessionId).toBe(sessionId);
    });
  });
});
