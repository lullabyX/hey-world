import { BLOCK_CONFIGS } from './config';
import { BlockDefinition, ResourceBlockDefinition } from './types';

export type ResourceEntry = [
  keyof typeof BLOCK_CONFIGS,
  ResourceBlockDefinition,
];

export const getResourceEntries = (): ResourceEntry[] => {
  return (
    Object.entries(BLOCK_CONFIGS) as [
      keyof typeof BLOCK_CONFIGS,
      BlockDefinition,
    ][]
  )
    .filter(([, def]) => !!(def as ResourceBlockDefinition).isResource)
    .map((entry) => entry as ResourceEntry);
};
