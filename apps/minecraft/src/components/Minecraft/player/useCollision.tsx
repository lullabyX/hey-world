import { playerEyeHeight, playerHeight, playerRadius } from '@/lib/constants';
import { dimensionsAtom } from '@/lib/store';
import { TerrainType, useWorld } from '@/lib/world';
import { useLog } from '@base/components/src';
import { useAtom } from 'jotai';
import { RefObject, useCallback, useRef } from 'react';
import { Mesh, PerspectiveCamera, Vector3 } from 'three';
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib';

export type CollisionType = {
  blockPosition: Vector3;
  point: Vector3;
  overlap: number;
  normal: Vector3;
};

const useCollision = ({
  playerRef,
  playerBodyRef,
  controlsRef,
  world,
}: {
  controlsRef: RefObject<PointerLockControlsImpl | null>;
  playerRef: RefObject<PerspectiveCamera | null>;
  playerBodyRef: RefObject<Mesh | null>;
  world: RefObject<TerrainType>;
}) => {
  const broadPhaseCollisionsRef = useRef<Vector3[]>([]);
  const collisionsRef = useRef<CollisionType[]>([]);

  const narrowPhaseCollisionsRef = useRef<Vector3[]>([]);
  const collisionsDeltaRef = useRef<Vector3[]>([]);

  const [dimensions] = useAtom(dimensionsAtom);

  const logBroadPhase = useLog();
  const logNarrowPhase = useLog();

  const { getBlockAt } = useWorld(dimensions.width, dimensions.height, world);

  const eyeOffset = playerHeight / 2 - playerEyeHeight;

  const updatePlayerPosition = useCallback(() => {
    if (!playerBodyRef.current || !playerRef.current) {
      return;
    }
    playerBodyRef.current.position.set(
      playerRef.current.position.x,
      playerRef.current.position.y + eyeOffset,
      playerRef.current.position.z
    );
  }, [eyeOffset, controlsRef, playerRef]);

  const isPointInBoundingBox = useCallback(
    (p: Vector3) => {
      if (!playerRef.current) {
        return false;
      }

      const playerHalfHeight = playerHeight / 2;
      const playerPosition = playerRef.current.position;

      const dx = p.x - playerPosition.x;
      const dy = p.y - (playerPosition.y - playerHalfHeight);
      const dz = p.z - playerPosition.z;

      const isOverlapXZ = dx * dx + dz * dz < playerRadius * playerRadius;
      const isOverlapY = dy < playerHalfHeight && dy > -playerHalfHeight;

      return isOverlapXZ && isOverlapY;
    },
    [playerRef]
  );

  const detectBroadPhaseCollisions = useCallback(() => {
    if (!playerRef.current) {
      return;
    }

    const player = playerRef.current;
    const playerHalfHeight = playerHeight / 2;
    const playerExtents = {
      x: {
        min: Math.floor(player.position.x - playerRadius),
        max: Math.ceil(player.position.x + playerRadius),
      },
      y: {
        min: Math.floor(player.position.y + eyeOffset - playerHalfHeight),
        max: Math.ceil(player.position.y + eyeOffset + playerHalfHeight),
      },
      z: {
        min: Math.floor(player.position.z - playerRadius),
        max: Math.ceil(player.position.z + playerRadius),
      },
    };

    const newPositions: Vector3[] = [];

    for (let x = playerExtents.x.min; x <= playerExtents.x.max; x++) {
      for (let y = playerExtents.y.min; y <= playerExtents.y.max; y++) {
        for (let z = playerExtents.z.min; z <= playerExtents.z.max; z++) {
          const block = getBlockAt(x, y, z);

          if (block && block.type !== 'empty') {
            newPositions.push(new Vector3(x, y, z));
          }
        }
      }
    }

    broadPhaseCollisionsRef.current = newPositions;

    logBroadPhase('broadPhaseCollisions', broadPhaseCollisionsRef.current);
  }, [getBlockAt, playerRef, logBroadPhase]);

  const detectNarrowPhaseCollisions = useCallback(() => {
    if (!playerRef.current) {
      return;
    }

    const blockHalfSize = 0.5;
    const playerHalfHeight = playerHeight / 2;

    const playerPosition = playerRef.current.position;

    collisionsRef.current = [];
    narrowPhaseCollisionsRef.current = [];
    collisionsDeltaRef.current = [];

    broadPhaseCollisionsRef.current.map((blockPosition) => {
      const nearestX = Math.max(
        blockPosition.x - blockHalfSize,
        Math.min(playerPosition.x, blockPosition.x + blockHalfSize)
      );
      const nearestY = Math.max(
        blockPosition.y - blockHalfSize,
        Math.min(
          playerPosition.y - playerHalfHeight,
          blockPosition.y + blockHalfSize
        )
      );
      const nearestZ = Math.max(
        blockPosition.z - blockHalfSize,
        Math.min(playerPosition.z, blockPosition.z + blockHalfSize)
      );

      const isBlockInBoundingBox = isPointInBoundingBox(
        new Vector3(nearestX, nearestY, nearestZ)
      );

      if (isBlockInBoundingBox) {
        narrowPhaseCollisionsRef.current.push(blockPosition);

        const dx = nearestX - playerPosition.x;
        const dy = nearestY - (playerPosition.y - playerHalfHeight);
        const dz = nearestZ - playerPosition.z;

        const overlapXZ = playerRadius - Math.sqrt(dx * dx + dz * dz);
        const overlapY = playerHalfHeight - Math.abs(dy);

        let normal: Vector3;
        let overlap: number;
        if (overlapXZ < overlapY) {
          normal = new Vector3(-dx, 0, -dz).normalize();
          overlap = overlapXZ;
        } else {
          normal = new Vector3(0, -Math.sign(dy), 0);
          overlap = overlapY;
        }
        collisionsRef.current.push({
          blockPosition,
          normal,
          overlap,
          point: new Vector3(nearestX, nearestY, nearestZ),
        });
      }
    });

    logNarrowPhase('collisionsDeltaRef', collisionsDeltaRef.current);
  }, [playerRef, broadPhaseCollisionsRef, logNarrowPhase]);

  const resolveCollision = useCallback(() => {
    if (
      !collisionsRef.current ||
      collisionsRef.current.length === 0 ||
      !playerRef.current
    ) {
      return;
    }

    const collisions = [...collisionsRef.current].sort(
      (a, b) => a.overlap - b.overlap
    );

    for (const collision of collisions) {
      if (!isPointInBoundingBox(collision.point)) {
        return;
      }

      const deltaPosition = collision.normal
        .clone()
        .multiplyScalar(collision.overlap);

      playerRef.current.position.add(deltaPosition);
    }
  }, []);

  const detectCollision = useCallback(() => {
    detectBroadPhaseCollisions();
    detectNarrowPhaseCollisions();
  }, []);

  const handleCollision = useCallback(() => {
    resolveCollision();
  }, []);

  return {
    broadPhaseCollisionsRef,
    narrowPhaseCollisionsRef,
    collisionsRef,
    detectCollision,
    handleCollision,
    updatePlayerPosition,
  };
};

export default useCollision;
