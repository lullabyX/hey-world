'use client';

import { TerrainType } from '@/lib/world';
import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { ForwardedRef, RefObject } from 'react';
import { Mesh, PerspectiveCamera, Vector3 } from 'three';
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib';
import useCollision from './useCollision';

const useControl = ({
  camera,
  playerRef,
  world,
}: {
  camera: PerspectiveCamera;
  playerRef: RefObject<Mesh | null>;
  world: RefObject<TerrainType>;
}) => {
  const { speed } = useControls('Player', {
    speed: {
      value: 5,
      min: 1,
      max: 10,
      step: 1,
    },
  });

  const controlsRef = useRef<PointerLockControlsImpl>(null);

  const pointerLockControlTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointerLockReadyRef = useRef(true);

  const inputRef = useRef<Vector3>(new Vector3(0, 0, 0));
  const playerVelocityRef = useRef(new Vector3(0, 0, 0));

  const [isLocked, setIsLocked] = useState(false);

  const { gl } = useThree();

  const { getBroadPhaseCollisions, updatePlayerPosition } = useCollision({
    camera,
    playerRef,
    controlsRef,
    world,
  });

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

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
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
  }, []);

  const movePlayer = useCallback((delta: number) => {
    if (!controlsRef.current || !controlsRef.current.isLocked) {
      return;
    }
    inputRef.current.x = playerVelocityRef.current.x * delta;
    inputRef.current.z = playerVelocityRef.current.z * delta;
    inputRef.current.y = playerVelocityRef.current.y * delta;
    controlsRef.current?.moveRight(inputRef.current.x);
    controlsRef.current?.moveForward(inputRef.current.z);
  }, []);

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
    updatePlayerPosition();
    getBroadPhaseCollisions();
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

export default useControl;
