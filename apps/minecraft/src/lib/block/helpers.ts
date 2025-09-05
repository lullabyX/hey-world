import { Block, BlockDefinition, BlockType, BLOCK_CONFIGS } from './types';

// Factory function remains simple
export const createBlock = (
  type: BlockType,
  instanceId: number | null = null
): Block => {
  const config = BLOCK_CONFIGS[type];
  return {
    ...config,
    instanceId,
    isResource: Boolean((config as BlockDefinition)?.isResource),
  } as Block;
};

export const hasInstanceId = <T extends { instanceId: number | null }>(
  block: T | null | undefined
): block is T & { instanceId: number } =>
  block?.instanceId !== null && block?.instanceId !== undefined;

export const isValidInstanceId = (
  id: number | null | undefined
): id is number => id != null;
