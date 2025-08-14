import { playerEyeHeight, playerHeight, playerRadius } from '@/lib/constants';
import { dimensionsAtom } from '@/lib/store';
import { TerrainType, useWorld } from '@/lib/world';
import { useLog } from '@base/components/src';
import { useAtom } from 'jotai';
import { RefObject, useCallback, useRef } from 'react';
import { Mesh, PerspectiveCamera, Vector3 } from 'three';
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib';

const useCollision = ({
  playerRef,
  controlsRef,
  world,
}: {
  controlsRef: RefObject<PointerLockControlsImpl | null>;
  camera: PerspectiveCamera;
  playerRef: RefObject<Mesh | null>;
  world: RefObject<TerrainType>;
}) => {
  const broadPhaseCollisionsRef = useRef<Vector3[]>([]);
  const collisionPointsRef = useRef<Vector3[]>([]);
  const narrowPhaseCollisionsRef = useRef<Vector3[]>([]);

  const [dimensions] = useAtom(dimensionsAtom);

  const logBroadPhase = useLog();
  const logNarrowPhase = useLog();

  const { getBlockAt } = useWorld(dimensions.width, dimensions.height, world);

  const eyeOffset = playerHeight / 2 - playerEyeHeight;

  const updatePlayerPosition = useCallback(() => {
    if (!controlsRef.current || !playerRef.current) {
      return;
    }
    playerRef.current.position.set(
      controlsRef.current.getObject().position.x,
      controlsRef.current.getObject().position.y + eyeOffset,
      controlsRef.current.getObject().position.z
    );
  }, [eyeOffset, controlsRef, playerRef]);

  const getBroadPhaseCollisions = useCallback(() => {
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
        min: Math.floor(player.position.y - playerHalfHeight),
        max: Math.ceil(player.position.y + playerHalfHeight),
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

  const getNarrowPhaseCollisions = useCallback(() => {
    if (!playerRef.current) {
      return;
    }

    const blockHalfSize = 0.5;
    const playerHalfHeight = playerHeight / 2;

    const playerPosition = playerRef.current.position;
    const adjustedPlayerPositionY = playerPosition.y;

    collisionPointsRef.current = [];
    narrowPhaseCollisionsRef.current = [];

    broadPhaseCollisionsRef.current.map((blockPosition) => {
      const nearestX = Math.max(
        blockPosition.x - blockHalfSize,
        Math.min(playerPosition.x, blockPosition.x + blockHalfSize)
      );
      const nearestY = Math.max(
        blockPosition.y - blockHalfSize,
        Math.min(adjustedPlayerPositionY, blockPosition.y + blockHalfSize)
      );
      const nearestZ = Math.max(
        blockPosition.z - blockHalfSize,
        Math.min(playerPosition.z, blockPosition.z + blockHalfSize)
      );

      const dx = playerPosition.x - nearestX;
      const dz = playerPosition.z - nearestZ;

      const overlapXZ = dx * dx + dz * dz <= playerRadius * playerRadius;

      const playerMaxY = adjustedPlayerPositionY + playerHalfHeight;
      const playerMinY = adjustedPlayerPositionY - playerHalfHeight;

      const overlapY = nearestY <= playerMaxY && nearestY >= playerMinY;

      if (overlapXZ && overlapY) {
        collisionPointsRef.current.push(
          new Vector3(nearestX, nearestY, nearestZ)
        );

        narrowPhaseCollisionsRef.current.push(blockPosition);
      }
    });

    logNarrowPhase('narrowPhaseCollisions', narrowPhaseCollisionsRef.current);
  }, [playerRef, broadPhaseCollisionsRef, logNarrowPhase]);

  return {
    broadPhaseCollisionsRef,
    narrowPhaseCollisionsRef,
    collisionPointsRef,
    getBroadPhaseCollisions,
    getNarrowPhaseCollisions,
    updatePlayerPosition,
  };
};

export default useCollision;
