import { useRef, useCallback } from 'react';
import { Block, BlockType, createBlock } from '@/app/lib/block';

export const useWorld = (width: number, height: number) => {
  const terrainDataRef = useRef<Block[][][]>([]);

  const isBound = useCallback(
    (x: number, y: number, z: number) => {
      return x >= 0 && x < width && y >= 0 && y < height && z >= 0 && z < width;
    },
    [width, height]
  );

  const getBlockAt = useCallback(
    (x: number, y: number, z: number) => {
      if (!isBound(x, y, z)) {
        return null;
      }
      return terrainDataRef.current[x]![y]![z]!;
    },
    [isBound]
  );

  const setBlockTypeAt = useCallback(
    (x: number, y: number, z: number, type: BlockType) => {
      if (!isBound(x, y, z)) {
        return;
      }
      const existingBlock = getBlockAt(x, y, z);
      terrainDataRef.current[x]![y]![z] = createBlock(
        type,
        existingBlock?.instanceId
      );
    },
    [isBound, getBlockAt]
  );

  const setBlockInstanceIdAt = useCallback(
    (x: number, y: number, z: number, instanceId: number) => {
      if (!isBound(x, y, z)) {
        return;
      }
      terrainDataRef.current[x]![y]![z]!.instanceId = instanceId;
    },
    [isBound]
  );

  const isBlockVisible = useCallback(
    (x: number, y: number, z: number) => {
      const adjacentPositions = [
        { dx: 0, dy: 1, dz: 0 },
        { dx: 0, dy: -1, dz: 0 },
        { dx: 1, dy: 0, dz: 0 },
        { dx: -1, dy: 0, dz: 0 },
        { dx: 0, dy: 0, dz: 1 },
        { dx: 0, dy: 0, dz: -1 },
      ];

      for (const { dx, dy, dz } of adjacentPositions) {
        const adjacentX = x + dx;
        const adjacentY = y + dy;
        const adjacentZ = z + dz;

        if (!isBound(adjacentX, adjacentY, adjacentZ)) {
          return true;
        }

        const adjacentBlock = getBlockAt(adjacentX, adjacentY, adjacentZ);
        if (adjacentBlock?.type === 'empty') {
          return true;
        }
      }
      return false;
    },
    [isBound, getBlockAt]
  );

  const initializeTerrain = useCallback(() => {
    terrainDataRef.current = [];
    for (let x = 0; x < width; x++) {
      const slice: Block[][] = [];
      for (let y = 0; y < height; y++) {
        const row: Block[] = [];
        for (let z = 0; z < width; z++) {
          row.push(createBlock('empty'));
        }
        slice.push(row);
      }
      terrainDataRef.current.push(slice);
    }
  }, [width, height]);

  return {
    terrainDataRef,
    isBound,
    getBlockAt,
    setBlockTypeAt,
    setBlockInstanceIdAt,
    isBlockVisible,
    initializeTerrain,
  };
};
