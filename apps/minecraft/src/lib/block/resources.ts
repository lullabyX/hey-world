import {
  BlockDefinition,
  BLOCK_CONFIGS,
  ResourceBlockDefinition,
} from './types';

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
    .sort((a, b) => {
      const aDef = a[1] as ResourceBlockDefinition;
      const bDef = b[1] as ResourceBlockDefinition;
      return aDef.resource.scarcity - bDef.resource.scarcity;
    })
    .map((entry) => entry as ResourceEntry);
};
