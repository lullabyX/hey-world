import { useCallback, useLayoutEffect, useState } from 'react';
import { dimensionsAtom } from '@/lib/store';
import { useAtom } from 'jotai';
import WorldChunk from './WorldChunk';
import useWorldManager from '../hooks/useWorldManger';
import { useFrame } from '@react-three/fiber';

const World = () => {
  const [chunks, setChunks] = useState<React.ReactElement[]>([]);

  const [dimensions] = useAtom(dimensionsAtom);

  const {
    playerPositionRef,
    getChunkCoords,
    chunkKeyFor,
    chunksRef,
    worldData,
  } = useWorldManager();

  const { drawDistance } = worldData;

  const generateChunks = useCallback(() => {
    const { cx, cz } = getChunkCoords(
      playerPositionRef.current.x,
      playerPositionRef.current.z
    );

    // Build desired chunk coordinates around the player's current chunk
    const desiredCoords: { x: number; z: number }[] = [];
    for (let dx = -drawDistance; dx <= drawDistance; dx++) {
      for (let dz = -drawDistance; dz <= drawDistance; dz++) {
        desiredCoords.push({ x: cx + dx, z: cz + dz });
      }
    }
    setChunks((prev) => {
      const prevByKey = new Map<string, React.ReactElement>();
      for (const el of prev) {
        const k = el.key != null ? String(el.key) : '';
        if (k) prevByKey.set(k, el);
      }

      const next: React.ReactElement[] = [];
      const nextKeys: string[] = [];
      for (const { x, z } of desiredCoords) {
        const key = chunkKeyFor(x, z);
        nextKeys.push(key);
        const existing = prevByKey.get(key);
        if (existing) {
          next.push(existing);
        } else {
          next.push(
            <WorldChunk
              key={key}
              width={dimensions.width}
              height={dimensions.height}
              xPosition={x}
              zPosition={z}
            />
          );
        }
      }

      // Avoid state updates if keys are unchanged
      if (prev.length === next.length) {
        const prevKeys = prev
          .map((p) => (p.key != null ? String(p.key) : ''))
          .join('|');

        const joinedNext = nextKeys.join('|');
        if (prevKeys === joinedNext) {
          return prev;
        }
      }

      return next;
    });
  }, [
    dimensions,
    drawDistance,
    playerPositionRef,
    chunkKeyFor,
    getChunkCoords,
  ]);

  useLayoutEffect(() => {
    generateChunks();
  }, [generateChunks]);

  useFrame(() => {
    generateChunks();
  });

  return <group ref={chunksRef}>{chunks}</group>;
};

export default World;
