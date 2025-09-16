import { BiomeType } from './types';

export const getBiome = (noise: number): BiomeType => {
  if (noise < -0.5) {
    return 'jungle';
  } else if (noise < 0) {
    return 'tundra';
  } else if (noise < 0.5) {
    return 'desert';
  } else {
    return 'meadow';
  }
};
