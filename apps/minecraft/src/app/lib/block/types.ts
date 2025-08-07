import { BLOCK_CONFIGS } from "./config";

// Base properties all blocks share
export type BaseBlock = {
  instanceId: number | null;
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
