import { BLOCK_CONFIGS } from './config';
import { Block, BlockType } from './types';

// Factory function remains simple
export const createBlock = (
  type: BlockType,
  instanceId: number | null = null
): Block => {
  const config = BLOCK_CONFIGS[type];
  return {
    ...config,
    instanceId,
  } as Block;
};
