export const mockConfig = {
  storagePath: "/tmp/mock-storage",
  enableLogging: true,
  logPath: "/tmp/mock-storage/logs",
  heuristics: {
    semanticSaturationThreshold: 0.55,
    pauseThresholdMs: 10000,
    noveltyDropThreshold: 0.4,
    critiqueFreshnessThreshold: 0.7,
  },
  ux: {
    minConfidenceToSurface: 0.4,
    minTimeBetweenSuggestionsMs: 60000,
  },
};