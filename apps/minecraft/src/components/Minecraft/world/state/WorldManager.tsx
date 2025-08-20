'use client';

import { dimensionsAtom } from '@/lib/store';
import { useAtom } from 'jotai';
import { createContext, RefObject, useCallback, useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import { WorldChunkHandle } from '../components/WorldChunk';
import { Block } from '@/lib/block';

type WorldManager = {
  chunkRegistryRef: RefObject<Map<string, WorldChunkHandle>>;
  playerPositionRef: RefObject<Vector3>;
  registerChunk: (cx: number, cz: number, handle: WorldChunkHandle) => void;
  unregisterChunk: (cx: number, cz: number) => void;
  getBlockAt: (x: number, y: number, z: number) => Block | null;
  getChunkAt: (x: number, z: number) => WorldChunkHandle | undefined;
};

export const WorldContext = createContext<WorldManager | null>(null);

export const WorldManagerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [dimensions] = useAtom(dimensionsAtom);

  const chunkRegistryRef = useRef(new Map<string, WorldChunkHandle>());
  const playerPositionRef = useRef(new Vector3(32, 32, 32));

  const chunkKeyFor = useCallback(
    (cx: number, cz: number) => `${cx}-${cz}`,
    []
  );

  const getChunkAt = useCallback(
    (x: number, z: number) => {
      const width = dimensions.width;

      const chunkX = Math.floor(x / width);
      const chunkZ = Math.floor(z / width);

      return chunkRegistryRef.current.get(chunkKeyFor(chunkX, chunkZ));
    },
    [dimensions.width, chunkRegistryRef, chunkKeyFor]
  );

  const getBlockAt = useCallback(
    (x: number, y: number, z: number) => {
      const chunk = getChunkAt(x, z);

      if (!chunk) {
        return null;
      }

      const width = dimensions.width;

      const localX = ((x % width) + width) % width;
      const localZ = ((z % width) + width) % width;

      return chunk.getBlockAt(localX, y, localZ);
    },
    [dimensions.width, getChunkAt]
  );

  const value = useMemo<WorldManager>(
    () => ({
      chunkRegistryRef,
      playerPositionRef,
      registerChunk: (cx, cz, handle) =>
        chunkRegistryRef.current.set(chunkKeyFor(cx, cz), handle),
      unregisterChunk: (cx, cz) =>
        chunkRegistryRef.current.delete(chunkKeyFor(cx, cz)),
      getBlockAt,
      getChunkAt,
    }),
    [getBlockAt, chunkKeyFor, getChunkAt]
  );

  return (
    <WorldContext.Provider value={value}>{children}</WorldContext.Provider>
  );
};
