import { SimplexNoise } from 'three/examples/jsm/Addons.js';

export type FBMNoise2DParams = {
  x: number;
  y: number;
  simplexNoise: SimplexNoise;
  octaves: number;
  amplitude?: number;
  offset?: number;
};

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
  const normalized = noise / maxValue;
  return normalized * amplitude + offset;
};
