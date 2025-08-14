'use client';

import { TerrainType, useWorld } from '@/lib/world';
import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { ForwardedRef, RefObject } from 'react';
import { Mesh, PerspectiveCamera, Vector3 } from 'three';
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib';
import { useAtom } from 'jotai';
import { dimensionsAtom } from '@/lib/store';
import { playerEyeHeight, playerHeight, playerRadius } from '@/lib/constants';

const usePointerLockedControl = ({
  camera,
  playerRef,
  world,
}: {
  camera: PerspectiveCamera;
  playerRef: RefObject<Mesh | null>;
  world: RefObject<TerrainType>;
}) => {
  const { speed, fly } = useControls('Player', {
    speed: {
      value: 5,
      min: 1,
      max: 10,
      step: 1,
    },
    fly: false,
  });

  const controlsRef = useRef<PointerLockControlsImpl>(null);

  const pointerLockControlTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointerLockReadyRef = useRef(true);

  const inputRef = useRef<Vector3>(new Vector3(0, 0, 0));
  const playerVelocityRef = useRef(new Vector3(0, 0, 0));
  const lastBlockLogTimeRef = useRef(0);

  const [isLocked, setIsLocked] = useState(false);

  const { gl } = useThree();

  const [dimensions] = useAtom(dimensionsAtom);

  const { getBlockAt } = useWorld(dimensions.width, dimensions.height, world);

  const eyeOffset = playerHeight / 2 - playerEyeHeight;

  const broadPhaseCollisions = useRef<Vector3[]>([]);

  useEffect(() => {
    return () => {
      if (pointerLockControlTimeoutRef.current) {
        clearTimeout(pointerLockControlTimeoutRef.current);
      }
    };
  }, []);

  const triggerLock = useCallback(() => {
    if (!controlsRef.current || controlsRef.current.isLocked) {
      return;
    }
    if (!pointerLockReadyRef.current) {
      return;
    }
    controlsRef.current.lock();
    setIsLocked(true);
  }, []);

  const handleUnlock = useCallback(() => {
    if (!controlsRef.current || !controlsRef.current.isLocked) {
      return;
    }
    pointerLockReadyRef.current = false;
    setIsLocked(false);
    controlsRef.current.unlock();
    if (pointerLockControlTimeoutRef.current) {
      clearTimeout(pointerLockControlTimeoutRef.current);
    }
    pointerLockControlTimeoutRef.current = setTimeout(() => {
      pointerLockReadyRef.current = true;
    }, 1500);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !controlsRef.current?.isLocked) {
        triggerLock();
      }

      if (!controlsRef.current?.isLocked) {
        return;
      }

      switch (e.key) {
        case 'w':
        case 'ArrowUp':
          playerVelocityRef.current.z = speed;
          break;
        case 's':
        case 'ArrowDown':
          playerVelocityRef.current.z = -speed;
          break;
        case 'a':
        case 'ArrowLeft':
          playerVelocityRef.current.x = -speed;
          break;
        case 'd':
        case 'ArrowRight':
          playerVelocityRef.current.x = speed;
          break;
        case ' ':
          playerVelocityRef.current.y = speed;
          break;
        case 'Shift':
          playerVelocityRef.current.y = -speed;
          break;
        case 'r':
          camera?.position.set(0, 10, 10);
          playerVelocityRef.current = new Vector3(0, 0, 0);
          inputRef.current = new Vector3(0, 10, 10);
          break;
      }
    },
    [triggerLock, speed, controlsRef, camera]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!controlsRef.current?.isLocked) {
        return;
      }
      switch (e.key) {
        case 'w':
        case 'ArrowUp':
          playerVelocityRef.current.z = 0;
          break;
        case 's':
        case 'ArrowDown':
          playerVelocityRef.current.z = 0;
          break;
        case 'a':
        case 'ArrowLeft':
          playerVelocityRef.current.x = 0;
          break;
        case 'd':
        case 'ArrowRight':
          playerVelocityRef.current.x = 0;
          break;
        case ' ':
          playerVelocityRef.current.y = 0;
          break;
        case 'Shift':
          playerVelocityRef.current.y = 0;
          break;
      }
    },
    [controlsRef]
  );

  const updatePlayerPosition = useCallback(() => {
    if (!controlsRef.current || !playerRef.current) {
      return;
    }
    playerRef.current.position.set(
      controlsRef.current.getObject().position.x,
      controlsRef.current.getObject().position.y - eyeOffset,
      controlsRef.current.getObject().position.z
    );
  }, [playerRef, controlsRef, eyeOffset]);

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
        min: Math.floor(player.position.y - playerHalfHeight + eyeOffset),
        max: Math.max(player.position.y + playerHalfHeight + eyeOffset),
      },
      z: {
        min: Math.floor(player.position.z - playerRadius),
        max: Math.max(player.position.z + playerRadius),
      },
    };

    broadPhaseCollisions.current = [];

    for (let x = playerExtents.x.min; x <= playerExtents.x.max; x++) {
      for (let y = playerExtents.y.min; y <= playerExtents.y.max; y++) {
        for (let z = playerExtents.z.min; z <= playerExtents.z.max; z++) {
          const block = getBlockAt(x, y, z);

          if (block && block.type !== 'empty') {
            broadPhaseCollisions.current.push(new Vector3(x, y, z));
          }
        }
      }
    }

    const now = performance.now();
    if (now - lastBlockLogTimeRef.current >= 500) {
      lastBlockLogTimeRef.current = now;
      console.log('broadPhaseCollisions', broadPhaseCollisions.current);
    }
  }, [playerRef, getBlockAt, eyeOffset]);

  const movePlayer = useCallback(
    (delta: number) => {
      if (!controlsRef.current || !controlsRef.current.isLocked) {
        return;
      }
      inputRef.current.x = playerVelocityRef.current.x * delta;
      inputRef.current.z = playerVelocityRef.current.z * delta;
      inputRef.current.y = playerVelocityRef.current.y * delta;
      controlsRef.current?.moveRight(inputRef.current.x);
      controlsRef.current?.moveForward(inputRef.current.z);
      updatePlayerPosition();
      if (fly) {
        controlsRef.current?.getObject().translateY(inputRef.current.y);
      }
      getBroadPhaseCollisions();
    },
    [controlsRef, fly, getBroadPhaseCollisions, updatePlayerPosition]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useFrame((_, delta) => {
    movePlayer(delta);
  });

  const controls = camera ? (
    <PointerLockControls
      ref={controlsRef}
      selector="#__no_pointer_lock_controls__"
      camera={camera}
      onUnlock={handleUnlock}
      domElement={gl.domElement}
    />
  ) : null;

  return {
    isLocked,
    handleUnlock,
    controls,
    controlsRef,
  };
};

export const Control = forwardRef(
  (
    {
      camera,
      handleUnlock,
    }: {
      camera: PerspectiveCamera | null;
      handleUnlock: () => void;
    },
    ref: ForwardedRef<PointerLockControlsImpl | null>
  ) => {
    const { gl } = useThree();

    if (!camera) {
      return null;
    }

    return (
      <PointerLockControls
        ref={ref}
        selector="#__no_pointer_lock_controls__"
        camera={camera}
        onUnlock={handleUnlock}
        domElement={gl.domElement}
      />
    );
  }
);

Control.displayName = 'PlayerControl';

export default usePointerLockedControl;
