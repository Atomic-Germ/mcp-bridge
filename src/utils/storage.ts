/**
 * Storage layer for Contemplative Memory
 * Handles JSON persistence with atomic writes and rollback safety
 */

import { promises as fs } from "fs";
import { dirname } from "path";
import {
  ContemplativeMemory,
  MeditationTrace,
  SessionMetrics,
  BridgeConfig,
  StorageError,
} from "../types.js";

export class StorageManager {
  private storagePath: string;
  private memoryFilePath: string;
  private lockFilePath: string;

  constructor(config: BridgeConfig) {
    this.storagePath = config.storagePath;
    this.memoryFilePath = `${this.storagePath}/memory.json`;
    this.lockFilePath = `${this.storagePath}/.lock`;
  }

  /**
   * Initialize storage directory and memory file if needed
   */
  async initialize(): Promise<void> {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(this.storagePath, { recursive: true });

      // Check if memory file exists; if not, create empty structure
      try {
        await fs.access(this.memoryFilePath);
      } catch {
        // File doesn't exist; create it with empty session
        const initialMemory: Record<string, ContemplativeMemory> = {};
        await this.writeAtomically(initialMemory);
      }
    } catch (error) {
      throw new StorageError(
        `Failed to initialize storage: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load all sessions from storage
   */
  async loadAllSessions(): Promise<Record<string, ContemplativeMemory>> {
    try {
      const content = await fs.readFile(this.memoryFilePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        // File doesn't exist; return empty
        return {};
      }
      throw new StorageError(
        `Failed to load sessions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load a specific session
   */
  async loadSession(sessionId: string): Promise<ContemplativeMemory | null> {
    const allSessions = await this.loadAllSessions();
    return allSessions[sessionId] || null;
  }

  /**
   * Save a session (atomic write with backup)
   */
  async saveSession(session: ContemplativeMemory): Promise<void> {
    const allSessions = await this.loadAllSessions();
    allSessions[session.sessionId] = session;
    await this.writeAtomically(allSessions);
  }

  /**
   * Add a trace to a session
   */
  async addTraceToSession(
    sessionId: string,
    trace: MeditationTrace
  ): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.traces.push(trace);
    session.metrics.lastModeSwitch = Date.now();

    await this.saveSession(session);
  }

  /**
   * Update session metrics
   */
  async updateMetrics(
    sessionId: string,
    metrics: Partial<SessionMetrics>
  ): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.metrics = { ...session.metrics, ...metrics };
    await this.saveSession(session);
  }

  /**
   * Get recent traces from a session (last N)
   */
  async getRecentTraces(
    sessionId: string,
    limit: number = 10
  ): Promise<MeditationTrace[]> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      return [];
    }

    return session.traces.slice(-limit);
  }

  /**
   * Get a specific trace by ID
   */
  async getTraceById(
    sessionId: string,
    traceId: string
  ): Promise<MeditationTrace | null> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      return null;
    }

    return session.traces.find((t) => t.id === traceId) || null;
  }

  /**
   * Write data atomically with temporary file
   * Ensures we never corrupt the main file
   */
  private async writeAtomically(
    data: Record<string, ContemplativeMemory>
  ): Promise<void> {
    try {
      const tempPath = `${this.memoryFilePath}.tmp`;
      const backupPath = `${this.memoryFilePath}.backup`;

      // Write to temporary file
      const json = JSON.stringify(data, null, 2);
      await fs.writeFile(tempPath, json, "utf-8");

      // Create backup of current file (if it exists)
      try {
        await fs.copyFile(this.memoryFilePath, backupPath);
      } catch {
        // Backup doesn't exist yet; that's ok
      }

      // Rename temp to main (atomic on most filesystems)
      await fs.rename(tempPath, this.memoryFilePath);
    } catch (error) {
      throw new StorageError(
        `Atomic write failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get list of available sessions with metadata
   */
  async getAvailableSessions(): Promise<
    Array<{
      sessionId: string;
      startedAt: number;
      traceCount: number;
      lastActive: number;
    }>
  > {
    const allSessions = await this.loadAllSessions();
    return Object.entries(allSessions).map(([sessionId, session]) => ({
      sessionId,
      startedAt: session.startedAt,
      traceCount: session.traces.length,
      lastActive: session.metrics.lastModeSwitch,
    }));
  }

  /**
   * Get the current session ID from disk (if persisted)
   */
  async getCurrentSessionId(): Promise<string | null> {
    const currentSessionFile = `${this.storagePath}/current-session.json`;
    try {
      const content = await fs.readFile(currentSessionFile, "utf-8");
      const data = JSON.parse(content);
      return data.sessionId || null;
    } catch {
      // File doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Persist the current session ID to disk
   */
  async setCurrentSessionId(sessionId: string): Promise<void> {
    const currentSessionFile = `${this.storagePath}/current-session.json`;
    try {
      const data = { sessionId, timestamp: Date.now() };
      await fs.writeFile(
        currentSessionFile,
        JSON.stringify(data, null, 2),
        "utf-8"
      );
    } catch (error) {
      throw new StorageError(
        `Failed to persist current session: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Clear the current session ID from disk
   */
  async clearCurrentSessionId(): Promise<void> {
    const currentSessionFile = `${this.storagePath}/current-session.json`;
    try {
      await fs.unlink(currentSessionFile);
    } catch {
      // File doesn't exist; that's ok
    }
  }

  /**
   * Get the most recent session
   */
  async getMostRecentSession(): Promise<string | null> {
    const sessions = await this.getAvailableSessions();
    if (sessions.length === 0) {
      return null;
    }

    // Sort by lastActive (most recent first)
    const sorted = sessions.sort((a, b) => b.lastActive - a.lastActive);
    return sorted[0].sessionId;
  }

  /**
   * Delete a session (for cleanup)
   */
  async deleteSession(sessionId: string): Promise<void> {
    const allSessions = await this.loadAllSessions();
    delete allSessions[sessionId];
    await this.writeAtomically(allSessions);
  }

  /**
   * Export session to JSON string (for user sharing)
   */
  async exportSession(sessionId: string): Promise<string> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return JSON.stringify(session, null, 2);
  }

  /**
   * Get storage stats
   */
  async getStats(): Promise<{
    totalSessions: number;
    totalTraces: number;
    storageBytes: number;
  }> {
    const allSessions = await this.loadAllSessions();
    const totalSessions = Object.keys(allSessions).length;
    const totalTraces = Object.values(allSessions).reduce(
      (sum, session) => sum + session.traces.length,
      0
    );

    try {
      const stats = await fs.stat(this.memoryFilePath);
      return {
        totalSessions,
        totalTraces,
        storageBytes: stats.size,
      };
    } catch {
      return { totalSessions, totalTraces, storageBytes: 0 };
    }
  }
}
