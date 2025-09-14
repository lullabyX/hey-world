import { RefObject, useCallback } from 'react';
import { Block, BlockType, createBlock } from '@/lib/block';

export type ChuckType = Block[][][];

export const adjacentPositions = [
  { dx: 0, dy: 1, dz: 0 },
  { dx: 0, dy: -1, dz: 0 },
  { dx: 1, dy: 0, dz: 0 },
  { dx: -1, dy: 0, dz: 0 },
  { dx: 0, dy: 0, dz: 1 },
  { dx: 0, dy: 0, dz: -1 },
];

export const useWorldChunk = (
  width: number,
  height: number,
  terrainData: RefObject<ChuckType>
) => {
  const isBound = useCallback(
    (x: number, y: number, z: number) => {
      return (
        x >= 0 &&
        x < width &&
        y >= 0 &&
        y < height &&
        z >= 0 &&
        z < width &&
        terrainData.current[x] &&
        terrainData.current[x][y] &&
        terrainData.current[x][y][z]
      );
    },
    [width, height, terrainData]
  );

  const getBlockAt = useCallback(
    (x: number, y: number, z: number) => {
      if (!isBound(x, y, z)) {
        return null;
      }
      return terrainData.current[x]![y]![z]!;
    },
    [isBound, terrainData]
  );

  const setBlockTypeAt = useCallback(
    (x: number, y: number, z: number, type: BlockType) => {
      if (!isBound(x, y, z)) {
        return;
      }
      const existingBlock = type === 'empty' ? null : getBlockAt(x, y, z);
      terrainData.current[x]![y]![z] = createBlock(
        type,
        existingBlock?.instanceId
      );
    },
    [isBound, getBlockAt, terrainData]
  );

  const setBlockInstanceIdAt = useCallback(
    (x: number, y: number, z: number, instanceId: number | null) => {
      if (!isBound(x, y, z)) {
        return;
      }
      terrainData.current[x]![y]![z]!.instanceId = instanceId;
    },
    [isBound, terrainData]
  );

  const isBlockVisible = useCallback(
    (x: number, y: number, z: number) => {
      for (const { dx, dy, dz } of adjacentPositions) {
        const adjacentX = x + dx;
        const adjacentY = y + dy;
        const adjacentZ = z + dz;

        if (!isBound(adjacentX, adjacentY, adjacentZ)) {
          return true;
        }

        const adjacentBlock = getBlockAt(adjacentX, adjacentY, adjacentZ);
        if (
          adjacentBlock?.type === 'empty' ||
          adjacentBlock?.type === 'leaves'
        ) {
          return true;
        }
      }
      return false;
    },
    [isBound, getBlockAt]
  );

  const initializeTerrain = useCallback(() => {
    terrainData.current = [];
    for (let x = 0; x < width; x++) {
      const slice: Block[][] = [];
      for (let y = 0; y < height; y++) {
        const row: Block[] = [];
        for (let z = 0; z < width; z++) {
          row.push(createBlock('empty'));
        }
        slice.push(row);
      }
      terrainData.current.push(slice);
    }
  }, [width, height, terrainData]);

  return {
    isBound,
    getBlockAt,
    setBlockTypeAt,
    setBlockInstanceIdAt,
    isBlockVisible,
    initializeTerrain,
  };
};
