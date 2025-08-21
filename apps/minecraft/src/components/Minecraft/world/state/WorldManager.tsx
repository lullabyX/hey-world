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
  listChunks: () => string[];
  getChunkKey: (x: number, z: number) => string;
  getChunkCoords: (x: number, z: number) => { cx: number; cz: number };
  chunkKeyFor: (cx: number, cz: number) => string;
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

      if (!chunk.loadedRef.current) {
        return null;
      }

      return chunk.getBlockAt(localX, y, localZ);
    },
    [dimensions.width, getChunkAt]
  );

  const listChunks = useCallback(() => {
    return Array.from(chunkRegistryRef.current.keys());
  }, []);

  const getChunkCoords = useCallback(
    (x: number, z: number) => {
      const width = dimensions.width;
      const cx = Math.floor(x / width);
      const cz = Math.floor(z / width);

      return { cx, cz };
    },
    [dimensions.width]
  );

  const getChunkKey = useCallback(
    (x: number, z: number) => {
      const width = dimensions.width;
      const cx = Math.floor(x / width);
      const cz = Math.floor(z / width);

      return chunkKeyFor(cx, cz);
    },
    [chunkKeyFor, dimensions.width]
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
      listChunks,
      getChunkKey,
      getChunkCoords,
      chunkKeyFor,
    }),
    [
      getBlockAt,
      chunkKeyFor,
      getChunkAt,
      listChunks,
      getChunkKey,
      getChunkCoords,
    ]
  );

  return (
    <WorldContext.Provider value={value}>{children}</WorldContext.Provider>
  );
};
