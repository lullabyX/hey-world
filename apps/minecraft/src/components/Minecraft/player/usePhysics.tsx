import { playerEyeHeight, playerHeight, playerRadius } from '@/lib/constants';
import { dimensionsAtom } from '@/lib/store';
import { TerrainType, useWorld } from '@/lib/world';
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

const usePhysics = ({
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
  const gravity = 32;
  const simulationRate = 200;
  const timeStep = 1 / simulationRate;

  const broadPhaseCollisionsRef = useRef<Vector3[]>([]);
  const collisionsRef = useRef<CollisionType[]>([]);
  const narrowPhaseCollisionsRef = useRef<Vector3[]>([]);
  const physicsAccumulatorRef = useRef(0);

  const [dimensions] = useAtom(dimensionsAtom);

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
  }, [playerBodyRef, playerRef, adjustedPlayerYPosition]);

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
    [playerHalfHeight, playerRef, adjustedPlayerYPosition]
  );

  const detectBroadPhaseCollisions = useCallback(() => {
    if (!playerRef.current) {
      return;
    }

    const playerPosition = playerRef.current.position;
    const playerExtents = {
      x: {
        min: Math.floor(playerPosition.x - playerRadius),
        max: Math.ceil(playerPosition.x + playerRadius),
      },
      y: {
        min: Math.floor(playerPosition.y - playerHeight + eyeOffset),
        max: Math.ceil(playerPosition.y - eyeOffset),
      },
      z: {
        min: Math.floor(playerPosition.z - playerRadius),
        max: Math.ceil(playerPosition.z + playerRadius),
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
  }, [eyeOffset, playerRef, getBlockAt]);

  const detectNarrowPhaseCollisions = useCallback(() => {
    const blockHalfSize = 0.5;

    collisionsRef.current = [];
    narrowPhaseCollisionsRef.current = [];

    broadPhaseCollisionsRef.current.map((blockPosition) => {
      if (!playerRef.current) {
        return;
      }
      const playerPosition = playerRef.current.position;

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

      const nearestPoint = new Vector3(nearestX, nearestY, nearestZ);

      if (isPointInBoundingBox(nearestPoint)) {
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
          point: nearestPoint,
        });
      }
    });
  }, [
    playerHalfHeight,
    playerRef,
    onGroundRef,
    isPointInBoundingBox,
    adjustedPlayerYPosition,
  ]);

  const resolveCollision = useCallback(() => {
    if (
      !collisionsRef.current ||
      collisionsRef.current.length === 0 ||
      !playerRef.current
    ) {
      return;
    }

    const collisions = collisionsRef.current;
    collisions.sort((a, b) => a.overlap - b.overlap);

    for (const collision of collisions) {
      if (!isPointInBoundingBox(collision.point)) {
        continue;
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
        .negate()
        .applyEuler(new Euler(0, -playerRef.current.rotation.y, 0));
      playerVelocityRef.current.add(velocityAdjustment);
    }
  }, [playerRef, playerVelocityRef, isPointInBoundingBox]);

  const detectCollision = useCallback(() => {
    onGroundRef.current = false;
    detectBroadPhaseCollisions();
    detectNarrowPhaseCollisions();
  }, [onGroundRef, detectBroadPhaseCollisions, detectNarrowPhaseCollisions]);

  const movePlayer = useCallback(
    (delta: number) => {
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
    },
    [inputRef, playerRef, controlsRef, playerVelocityRef]
  );

  const applyGravity = useCallback(
    (dt: number) => {
      playerVelocityRef.current.y -= gravity * dt;
    },
    [playerVelocityRef]
  );

  const runPhysics = useCallback(
    (dt: number) => {
      applyGravity(dt);
      movePlayer(dt);
      detectCollision();
      resolveCollision();
      updatePlayerPosition();
    },
    [
      applyGravity,
      movePlayer,
      detectCollision,
      resolveCollision,
      updatePlayerPosition,
    ]
  );

  const updatePhysics = useCallback(
    (dt: number) => {
      if (!controlsRef.current?.isLocked) {
        return;
      }

      physicsAccumulatorRef.current += dt;

      while (physicsAccumulatorRef.current >= timeStep) {
        runPhysics(timeStep);
        physicsAccumulatorRef.current -= timeStep;
      }
    },
    [timeStep, controlsRef, physicsAccumulatorRef, runPhysics]
  );

  return {
    broadPhaseCollisionsRef,
    narrowPhaseCollisionsRef,
    collisionsRef,
    updatePhysics,
  };
};

export default usePhysics;
