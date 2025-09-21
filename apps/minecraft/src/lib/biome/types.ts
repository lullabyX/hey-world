import { BlockType } from '@/lib/block';

export const BIOME_CONFIGS = {
  jungle: {
    tree: {
      trunk: 'oak_wood' as BlockType,
      hasCanopee: true,
      leaves: 'jungle_leaves' as BlockType,
      scale: 0.003,
      magnitude: 0.5,
      offset: 0.3,
      thresholdMin: 0.45,
      thresholdMax: 0.65,
      heightMin: 3,
      heightMax: 8,
      radiusMin: 2,
      radiusMax: 3,
    },
  },
  tundra: {
    tree: {
      trunk: 'wood' as BlockType,
      hasCanopee: false,
      scale: 0.03,
      magnitude: 0.35,
      offset: 0.1,
      thresholdMin: 0.45,
      thresholdMax: 0.5,
      heightMin: 2,
      heightMax: 5,
      radiusMin: 1,
      radiusMax: 2,
    },
  },
  desert: {
    tree: {
      trunk: 'cactus' as BlockType,
      hasCanopee: false,
      scale: 0.02,
      magnitude: 0.1,
      offset: 0.05,
      thresholdMin: 0.45,
      thresholdMax: 0.5,
      heightMin: 3,
      heightMax: 6,
      radiusMin: 1,
      radiusMax: 2,
    },
  },
  meadow: {
    tree: {
      trunk: 'wood' as BlockType,
      hasCanopee: true,
      leaves: 'leaves' as BlockType,
      scale: 0.02,
      magnitude: 0.6,
      offset: 0.2,
      thresholdMin: 0.45,
      thresholdMax: 0.55,
      heightMin: 4,
      heightMax: 7,
      radiusMin: 1,
      radiusMax: 2,
    },
  },
} as const;

export type BiomeConfig = typeof BIOME_CONFIGS;
export type BiomeType = keyof BiomeConfig;
