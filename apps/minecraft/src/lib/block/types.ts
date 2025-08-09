import { BLOCK_CONFIGS, TILES } from './config';

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
