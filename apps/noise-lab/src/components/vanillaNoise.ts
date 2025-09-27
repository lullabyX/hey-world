export type NoiseParam = { firstOctave: number; amplitudes: number[] };

// Optional fallback when streaming registries is unavailable.
// Intentionally left empty to avoid bundling vanilla data.
const noiseParams: Record<string, NoiseParam> = {};

export default noiseParams;
