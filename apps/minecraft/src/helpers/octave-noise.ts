import { SimplexNoise } from 'three/examples/jsm/Addons.js';

/**
 * Parameters for 2D FBM (Fractal Brownian Motion) noise generation.
 *
 * - `amplitude`: Final scale applied after normalizing the FBM result to [-1, 1].
 * - `offset`: Final offset added after scaling (useful for base height).
 */
export type FBMNoise2DParams = {
  x: number;
  y: number;
  simplexNoise: SimplexNoise;
  octaves: number;
  amplitude?: number;
  offset?: number;
};

/**
 * Compute 2D FBM (Fractal Brownian Motion) using Simplex noise.
 *
 * Accumulates `octaves` of Simplex noise, doubling frequency and halving amplitude
 * per octave, then normalizes the sum to [-1, 1]. The normalized value is scaled
 * by `amplitude` and shifted by `offset` for convenient terrain height shaping.
 *
 * @param params - See {@link FBMNoise2DParams}
 * @param params.x - X coordinate
 * @param params.y - Y coordinate
 * @param params.simplexNoise - Simplex noise instance (seeded as desired)
 * @param params.octaves - Number of octaves to accumulate (e.g., 4–8)
 * @param params.amplitude - Final scale applied to normalized FBM (default: 1)
 * @param params.offset - Final offset added after scaling (default: 0)
 * @returns Number in the range roughly `offset + amplitude * [-1, 1]`
 */
export const getFBMNoise2D = ({
  x,
  y,
  simplexNoise,
  octaves,
  amplitude = 1,
  offset = 0,
}: FBMNoise2DParams): number => {
  let noise = 0;
  let frequency = 1;
  let octaveAmplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    noise += simplexNoise.noise(x * frequency, y * frequency) * octaveAmplitude;
    maxValue += octaveAmplitude;
    frequency *= 2;
    octaveAmplitude *= 0.5;
  }
  if (maxValue === 0) return 0;
  const normalized = noise / maxValue; // [-1, 1]
  return normalized * amplitude + offset;
};
