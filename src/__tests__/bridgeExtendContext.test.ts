import { describe, it, expect, beforeEach, vi, Mocked } from "vitest";
import { handleExtendContext } from "../index";
import { DreamWeaver } from "../utils/dreamWeaver.js";
import { mockConfig } from "./mockConfig";
import { StorageManager } from "../utils/storage";
import { extractThemesFromNarrative } from "../utils/nlp.js";
import { MeditationTrace } from "../types";

describe("bridge_extend_context", () => {
  let mockStorage: StorageManager;
  let mockDreamWeaver: typeof DreamWeaver;

  beforeEach(() => {
    console.log("MockConfig in beforeEach:", mockConfig);

    mockStorage = {
      loadSession: vi.fn().mockResolvedValue({
        sessionId: "test-session-id",
        startedAt: Date.now(),
        metrics: {
          lastModeSwitch: Date.now(),
          currentMode: "diverge",
          repetitionCount: 0,
          pauseDuration: 0,
          avgCycleDuration: 0,
          lastSuggestionTime: Date.now(),
        },
        traces: [
          { id: "trace1", timestamp: Date.now(), mode: "diverge", bridge: { transitionSuggested: true, reasonForSwitch: "test-reason", confidenceLevel: 0.9 } },
          { id: "trace2", timestamp: Date.now(), mode: "converge", bridge: { transitionSuggested: false, reasonForSwitch: "test-reason", confidenceLevel: 0.8 } },
        ],
      }),
    } as unknown as StorageManager;

    mockDreamWeaver = {
      weave: vi.fn().mockResolvedValue("Generated narrative from traces"),
    } as unknown as typeof DreamWeaver;
  });

  it("should generate a thematic narrative and extract themes", async () => {
    const sessionId = "test-session-id";

    const result = await handleExtendContext(
      {
        sessionId,
        length: 2,
        seed: "integration",
      },
      mockStorage,
      mockDreamWeaver
    );

    expect(mockStorage.loadSession).toHaveBeenCalledWith(sessionId);
    expect(mockDreamWeaver.weave).toHaveBeenCalledWith(expect.any(Array), 2, "integration");
    expect(result.narrative).toBe("Generated narrative from traces");
    expect(result.themes).toEqual(["Generated", "narrative", "traces"]);
    expect(result.message).toBe("Thematic narrative generated successfully.");
  });

  it("should throw an error if session is not found", async () => {
    mockStorage.loadSession = vi.fn().mockResolvedValue(null);

    await expect(
      handleExtendContext({ sessionId: "invalid-session-id" }, mockStorage, mockDreamWeaver)
    ).rejects.toThrow("Session not found: invalid-session-id");
  });
});