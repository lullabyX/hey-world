export const TILES = {
  // ground + basics
  grass: 0,
  stone: 1,
  dirt: 2,
  grassSide: 3,
  planks: 4,

  // sand/wood
  sand: 18,
  treeSide: 20,
  treeTop: 21,

  // misc
  cloud: 22,

  // ores
  goldOre: 32,
  ironOre: 33,
  coalOre: 34,
  emeraldOre: 36,
  diamondOre: 50,
  redstoneOre: 51,
  lapisOre: 176,

  // foliage
  leaves: 53,
} as const;

export const BLOCK_CONFIGS = {
  empty: {
    type: 'empty' as const,
  },
  grass: {
    type: 'grass' as const,
    color: '#7FB238',
    textureTiles: {
      tint: {
        top: '#7FB238',
      },
      top: TILES.grass,
      side: TILES.grassSide,
      bottom: TILES.dirt,
    },
  },
  dirt: {
    type: 'dirt' as const,
    color: '#976D4D',
    textureTiles: { top: TILES.dirt, side: TILES.dirt, bottom: TILES.dirt },
  },
  stone: {
    type: 'stone' as const,
    color: '#707070',
    textureTiles: { top: TILES.stone, side: TILES.stone, bottom: TILES.stone },
    isResource: true,
    resource: {
      scale: { x: 30, y: 20, z: 30 },
      scarcity: 0.5,
    },
  },
  sand: {
    type: 'sand' as const,
    color: '#F7E9A3',
    textureTiles: { top: TILES.sand, side: TILES.sand, bottom: TILES.sand },
  },
  wood: {
    type: 'wood' as const,
    color: '#8F7748',
    textureTiles: {
      top: TILES.treeTop,
      side: TILES.treeSide,
      bottom: TILES.treeTop,
    },
  },
  leaves: {
    type: 'leaves' as const,
    color: '#80A755',
    textureTiles: {
      top: TILES.leaves,
      side: TILES.leaves,
      bottom: TILES.leaves,
    },
  },
  coal_ore: {
    type: 'coal_ore' as const,
    color: '#4C4C4C', // Dark gray for coal
    isResource: true,
    textureTiles: {
      top: TILES.coalOre,
      side: TILES.coalOre,
      bottom: TILES.coalOre,
    },
    resource: {
      scale: { x: 24, y: 24, z: 24 },
      scarcity: 0.75,
    },
  },
  iron_ore: {
    type: 'iron_ore' as const,
    color: '#D8AF93', // Official raw iron color
    isResource: true,
    textureTiles: {
      top: TILES.ironOre,
      side: TILES.ironOre,
      bottom: TILES.ironOre,
    },
    resource: {
      scale: { x: 28, y: 28, z: 28 },
      scarcity: 0.85,
    },
  },
  gold_ore: {
    type: 'gold_ore' as const,
    color: '#FAEE4D', // Official Minecraft gold
    isResource: true,
    textureTiles: {
      top: TILES.goldOre,
      side: TILES.goldOre,
      bottom: TILES.goldOre,
    },
    resource: {
      scale: { x: 32, y: 32, z: 32 },
      scarcity: 0.93,
    },
  },
  diamond_ore: {
    type: 'diamond_ore' as const,
    color: '#5CDBD5', // Official Minecraft diamond
    isResource: true,
    textureTiles: {
      top: TILES.diamondOre,
      side: TILES.diamondOre,
      bottom: TILES.diamondOre,
    },
    resource: {
      scale: { x: 40, y: 40, z: 40 },
      scarcity: 0.98,
    },
  },
  emerald_ore: {
    type: 'emerald_ore' as const,
    color: '#00D93A', // Official Minecraft emerald
    isResource: true,
    textureTiles: {
      top: TILES.emeraldOre,
      side: TILES.emeraldOre,
      bottom: TILES.emeraldOre,
    },
    resource: {
      scale: { x: 44, y: 44, z: 44 },
      scarcity: 0.99,
    },
  },
  lapis_ore: {
    type: 'lapis_ore' as const,
    color: '#4A80FF', // Official Minecraft lapis
    isResource: true,
    textureTiles: {
      top: TILES.lapisOre,
      side: TILES.lapisOre,
      bottom: TILES.lapisOre,
    },
    resource: {
      scale: { x: 36, y: 36, z: 36 },
      scarcity: 0.93,
    },
  },
  redstone_ore: {
    type: 'redstone_ore' as const,
    color: '#FC3100', // Official powered redstone
    isResource: true,
    textureTiles: {
      top: TILES.redstoneOre,
      side: TILES.redstoneOre,
      bottom: TILES.redstoneOre,
    },
    resource: {
      scale: { x: 30, y: 30, z: 30 },
      scarcity: 0.88,
    },
  },
} as const satisfies Record<string, BlockDefinition>;

// Unified schema (moved from schema.ts to keep a single source of truth)
export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type ResourceNoiseConfig = {
  scale: Vector3;
  scarcity: number; // [0,1], higher means rarer
  seed?: number;
};

export type CommonBlockProps = {
  type: string;
  color?: string;
  transparent?: boolean;
  emissive?: boolean;
  // Numeric tile indices into the active blocks atlas (grid-based)
  // If a block uses the same tile on all faces, set all three to the same index
  textureTiles?: {
    tint?: {
      top?: string;
      side?: string;
      bottom?: string;
    };
    top: number;
    side: number;
    bottom: number;
  };
};

export type ResourceBlockDefinition = CommonBlockProps & {
  isResource: true;
  resource: ResourceNoiseConfig;
};

export type NonResourceBlockDefinition = CommonBlockProps & {
  isResource?: false;
};

export type BlockDefinition =
  | ResourceBlockDefinition
  | NonResourceBlockDefinition;

// Base properties all blocks share
export type BaseBlock = {
  instanceId: number | null;
  isResource: boolean;
};

// Automatically generate block types from config
export type BlockConfig = typeof BLOCK_CONFIGS;
export type BlockType = keyof BlockConfig;

// Generate union of all possible block shapes
export type Block = {
  [K in BlockType]: BaseBlock & BlockConfig[K];
}[BlockType];

// Helper type to get a specific block (if needed)
export type BlockOfType<T extends BlockType> = BaseBlock & BlockConfig[T];

export type TileName = keyof typeof TILES;
