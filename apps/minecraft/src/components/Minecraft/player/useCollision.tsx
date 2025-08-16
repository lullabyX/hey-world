import { playerEyeHeight, playerHeight, playerRadius } from '@/lib/constants';
import { dimensionsAtom } from '@/lib/store';
import { TerrainType, useWorld } from '@/lib/world';
import { useLog } from '@base/components/src';
import { useAtom } from 'jotai';
import { RefObject, useCallback, useRef } from 'react';
import { Euler, Mesh, PerspectiveCamera, Vector3 } from 'three';
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
  inputRef,
  playerVelocityRef,
  onGroundRef,
  world,
}: {
  controlsRef: RefObject<PointerLockControlsImpl | null>;
  inputRef: RefObject<Vector3>;
  playerVelocityRef: RefObject<Vector3>;
  playerRef: RefObject<PerspectiveCamera | null>;
  playerBodyRef: RefObject<Mesh | null>;
  onGroundRef: RefObject<boolean>;
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

  const eyeOffset = playerHeight - playerEyeHeight;
  const halfEyeOffset = eyeOffset / 2;
  const playerHalfHeight = playerHeight / 2;

  const adjustedPlayerYPosition = useCallback(
    (y: number) => y - playerHalfHeight + halfEyeOffset,
    [playerHalfHeight, halfEyeOffset]
  );

  const updatePlayerPosition = useCallback(() => {
    if (!playerBodyRef.current || !playerRef.current) {
      return;
    }
    playerBodyRef.current.position.set(
      playerRef.current.position.x,
      adjustedPlayerYPosition(playerRef.current.position.y),
      playerRef.current.position.z
    );
  }, [eyeOffset, controlsRef, playerRef]);

  const isPointInBoundingBox = useCallback(
    (p: Vector3) => {
      if (!playerRef.current) {
        return false;
      }

      const playerPosition = playerRef.current.position;

      const dx = p.x - playerPosition.x;
      const dy = p.y - adjustedPlayerYPosition(playerPosition.y);
      const dz = p.z - playerPosition.z;

      const isOverlapXZ = dx * dx + dz * dz < playerRadius * playerRadius;
      const isOverlapY = Math.abs(dy) < playerHalfHeight;

      return isOverlapXZ && isOverlapY;
    },
    [playerRef]
  );

  const detectBroadPhaseCollisions = useCallback(() => {
    if (!playerRef.current) {
      return;
    }

    const player = playerRef.current;
    const playerExtents = {
      x: {
        min: Math.floor(player.position.x - playerRadius),
        max: Math.ceil(player.position.x + playerRadius),
      },
      y: {
        min: Math.floor(player.position.y - playerHeight + eyeOffset),
        max: Math.ceil(player.position.y - eyeOffset),
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
          adjustedPlayerYPosition(playerPosition.y),
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
        const dy = nearestY - adjustedPlayerYPosition(playerPosition.y);
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
          onGroundRef.current = true;
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
      (a, b) => b.overlap - a.overlap
    );

    for (const collision of collisions) {
      if (!isPointInBoundingBox(collision.point)) {
        return;
      }

      const deltaPosition = collision.normal
        .clone()
        .multiplyScalar(collision.overlap);

      playerRef.current.position.add(deltaPosition);

      const velocityMagnitude = playerVelocityRef.current
        .clone()
        .applyEuler(new Euler(0, playerRef.current.rotation.y, 0))
        .dot(collision.normal);
      const velocityAdjustment = collision.normal
        .clone()
        .multiplyScalar(velocityMagnitude)
        .applyEuler(new Euler(0, -playerRef.current.rotation.y, 0))
        .negate();
      playerVelocityRef.current.add(velocityAdjustment);
    }
  }, []);

  const detectCollision = useCallback(() => {
    onGroundRef.current = false;
    detectBroadPhaseCollisions();
    detectNarrowPhaseCollisions();
  }, []);

  const handleCollision = useCallback(() => {
    resolveCollision();
  }, []);

  const movePlayer = useCallback((delta: number) => {
    if (
      !controlsRef.current ||
      !controlsRef.current.isLocked ||
      !playerRef.current
    ) {
      return;
    }

    playerVelocityRef.current.x = inputRef.current.x * delta;
    playerVelocityRef.current.z = inputRef.current.z * delta;

    controlsRef.current.moveRight(playerVelocityRef.current.x);
    controlsRef.current.moveForward(playerVelocityRef.current.z);

    playerRef.current.position.y += playerVelocityRef.current.y * delta;
  }, []);

  const updatePlayer = useCallback((dt: number) => {
    movePlayer(dt);
    detectCollision();
    handleCollision();
    updatePlayerPosition();
  }, []);

  return {
    broadPhaseCollisionsRef,
    narrowPhaseCollisionsRef,
    collisionsRef,
    updatePlayer,
  };
};

export default useCollision;
