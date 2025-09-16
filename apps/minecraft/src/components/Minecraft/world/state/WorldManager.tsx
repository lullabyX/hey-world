'use client';

import { dimensionsAtom, worldEdits } from '@/lib/store';
import { button, useControls } from 'leva';
import { useAtom } from 'jotai';
import { createContext, RefObject, useCallback, useMemo, useRef } from 'react';
import { Group, Vector3 } from 'three';
import { WorldChunkHandle } from '../components/WorldChunk';
import { Block, BlockType } from '@/lib/block';

type WorldManager = {
  chunksRef: RefObject<Group | null>;
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
  removeBlockAt: (x: number, y: number, z: number) => void;
  addBlockAt: (x: number, y: number, z: number, type: BlockType) => void;
  getBlockOutsideChunkAt: (
    x: number,
    y: number,
    z: number
  ) => BlockType | undefined;
  setBlockOutsideChunkAt: (
    x: number,
    y: number,
    z: number,
    type: BlockType
  ) => void;
  worldData: {
    drawDistance: number;
    scale: number;
    magnitude: number;
    offset: number;
    seed: number;
  };
};

export const WorldContext = createContext<WorldManager | null>(null);

export const WorldManagerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [dimensions] = useAtom(dimensionsAtom);

  const chunksRef = useRef<Group>(null);
  const chunkRegistryRef = useRef(new Map<string, WorldChunkHandle>());
  const playerPositionRef = useRef(new Vector3(32, 32, 32));

  const {
    scale,
    magnitude,
    offset,
    seed,
    'Draw Distance': drawDistance,
  } = useControls(
    'Terrain',
    {
      'Draw Distance': {
        value: 2,
        min: 0,
        max: 10,
        step: 1,
      },
      scale: {
        value: 50,
        min: 20,
        max: 100,
        step: 1,
      },
      magnitude: {
        value: 0.15,
        min: 0,
        max: 1,
        step: 0.01,
      },
      offset: {
        value: 0.12,
        min: 0,
        max: 1,
        step: 0.01,
      },
      seed: {
        value: 123456789,
        min: 0,
        max: 1000000000,
        step: 1,
      },
      'Reset World': button(() => {
        worldEdits.reset();
      }),
    },
    { collapsed: true }
  );

  const blockOutsideChunk = useMemo(
    () => new Map<string, BlockType>(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scale, magnitude, offset, seed]
  );

  const keyForGlobalPosition = useCallback(
    (x: number, y: number, z: number) => {
      const cx = Math.floor(x / dimensions.width);
      const cz = Math.floor(z / dimensions.width);
      return `${cx}|${cz}|${x}|${y}|${z}`;
    },
    [dimensions.width]
  );

  const getBlockOutsideChunkAt = useCallback(
    (x: number, y: number, z: number) => {
      return blockOutsideChunk.get(keyForGlobalPosition(x, y, z));
    },
    [blockOutsideChunk, keyForGlobalPosition]
  );

  const setBlockOutsideChunkAt = useCallback(
    (x: number, y: number, z: number, type: BlockType) => {
      blockOutsideChunk.set(keyForGlobalPosition(x, y, z), type);
    },
    [blockOutsideChunk, keyForGlobalPosition]
  );

  const chunkKeyFor = useCallback(
    (cx: number, cz: number) => `${cx}-${cz}`,
    []
  );

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
      const { cx, cz } = getChunkCoords(x, z);

      return chunkKeyFor(cx, cz);
    },
    [chunkKeyFor, getChunkCoords]
  );

  const getChunkAt = useCallback(
    (x: number, z: number) => {
      return chunkRegistryRef.current.get(getChunkKey(x, z));
    },
    [chunkRegistryRef, getChunkKey]
  );

  const getBlockLocalCoords = useCallback(
    (x: number, y: number, z: number) => {
      const width = dimensions.width;

      const localX = ((x % width) + width) % width;
      const localZ = ((z % width) + width) % width;

      return { localX, localY: y, localZ };
    },
    [dimensions]
  );

  const getBlockAt = useCallback(
    (x: number, y: number, z: number) => {
      const chunk = getChunkAt(x, z);

      if (!chunk) {
        return null;
      }

      if (!chunk.loadedRef.current) {
        return null;
      }

      const { localX, localY, localZ } = getBlockLocalCoords(x, y, z);

      return chunk.getBlockAt(localX, localY, localZ);
    },
    [getChunkAt, getBlockLocalCoords]
  );

  const addBlockAt = useCallback(
    (x: number, y: number, z: number, type: BlockType) => {
      const chunk = getChunkAt(x, z);

      if (!chunk) return;
      if (!chunk.loadedRef.current) return;
      if (!chunk.meshRef.current) return;

      const cx = chunk.meshRef.current.position.x;
      const cz = chunk.meshRef.current.position.z;

      const { localX, localY, localZ } = getBlockLocalCoords(x, y, z);

      chunk.addBlockAt(localX, localY, localZ, type);
      worldEdits.set(cx, cz, localX, localY, localZ, type);
    },
    [getBlockLocalCoords, getChunkAt]
  );

  const removeBlockAt = useCallback(
    (x: number, y: number, z: number) => {
      const chunk = getChunkAt(x, z);

      if (!chunk) return;
      if (!chunk.loadedRef.current) return;
      if (!chunk.meshRef.current) return;

      const cx = chunk.meshRef.current.position.x;
      const cz = chunk.meshRef.current.position.z;

      const { localX, localY, localZ } = getBlockLocalCoords(x, y, z);

      chunk.removeBlockAt(localX, localY, localZ);
      worldEdits.set(cx, cz, localX, localY, localZ, 'empty');
    },
    [getBlockLocalCoords, getChunkAt]
  );

  const listChunks = useCallback(() => {
    return Array.from(chunkRegistryRef.current.keys());
  }, []);

  const value = useMemo<WorldManager>(
    () => ({
      chunksRef: chunksRef,
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
      removeBlockAt,
      addBlockAt,
      getBlockOutsideChunkAt,
      setBlockOutsideChunkAt,
      worldData: {
        drawDistance,
        scale,
        magnitude,
        offset,
        seed,
      },
    }),
    [
      chunksRef,
      getBlockAt,
      chunkKeyFor,
      getChunkAt,
      listChunks,
      getChunkKey,
      getChunkCoords,
      removeBlockAt,
      addBlockAt,
      getBlockOutsideChunkAt,
      setBlockOutsideChunkAt,
      drawDistance,
      scale,
      magnitude,
      offset,
      seed,
    ]
  );

  return (
    <WorldContext.Provider value={value}>{children}</WorldContext.Provider>
  );
};
