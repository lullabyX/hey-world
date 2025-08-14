import { playerEyeHeight, playerHeight, playerRadius } from '@/lib/constants';
import { dimensionsAtom } from '@/lib/store';
import { TerrainType, useWorld } from '@/lib/world';
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
  const lastBlockLogTimeRef = useRef(0);

  const [dimensions] = useAtom(dimensionsAtom);

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
        max: Math.max(player.position.x + playerRadius),
      },
      y: {
        min: Math.floor(player.position.y - playerHalfHeight - eyeOffset),
        max: Math.max(player.position.y + playerHalfHeight - eyeOffset),
      },
      z: {
        min: Math.floor(player.position.z - playerRadius),
        max: Math.max(player.position.z + playerRadius),
      },
    };

    broadPhaseCollisionsRef.current = [];

    for (let x = playerExtents.x.min; x <= playerExtents.x.max; x++) {
      for (let y = playerExtents.y.min; y <= playerExtents.y.max; y++) {
        for (let z = playerExtents.z.min; z <= playerExtents.z.max; z++) {
          const block = getBlockAt(x, y, z);

          if (block && block.type !== 'empty') {
            broadPhaseCollisionsRef.current.push(new Vector3(x, y, z));
          }
        }
      }
    }

    const now = performance.now();
    if (now - lastBlockLogTimeRef.current >= 500) {
      lastBlockLogTimeRef.current = now;
      console.log('broadPhaseCollisionsRef', broadPhaseCollisionsRef.current);
    }
  }, [getBlockAt, eyeOffset, playerRef]);
  return {
    broadPhaseCollisionsRef,
    getBroadPhaseCollisions,
    updatePlayerPosition,
  };
};

export default useCollision;
