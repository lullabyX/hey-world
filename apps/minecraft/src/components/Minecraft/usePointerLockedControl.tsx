'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { ForwardedRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib';

const usePointerLockedControl = ({
  camera,
}: {
  camera: PerspectiveCamera | null;
}) => {
  const controlsRef = useRef<PointerLockControlsImpl>(null);

  const pointerLockControlTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointerLockReadyRef = useRef(true);

  const playerPositionRef = useRef<Vector3>(new Vector3(0, 10, 10));
  const playerMovementRef = useRef(new Vector3(0, 0, 0));

  const { speed, fly } = useControls('Player', {
    speed: {
      value: 10,
      min: 1,
      max: 20,
      step: 1,
    },
    fly: false
  });

  const [isLocked, setIsLocked] = useState(false);

  const { gl } = useThree();

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
          playerMovementRef.current.z = speed;
          break;
        case 's':
        case 'ArrowDown':
          playerMovementRef.current.z = -speed;
          break;
        case 'a':
        case 'ArrowLeft':
          playerMovementRef.current.x = -speed;
          break;
        case 'd':
        case 'ArrowRight':
          playerMovementRef.current.x = speed;
          break;
        case ' ':
          playerMovementRef.current.y = speed;
          break;
        case 'Shift':
          playerMovementRef.current.y = -speed;
          break;
        case 'r':
          camera?.position.set(0, 10, 10);
          playerMovementRef.current = new Vector3(0, 0, 0);
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
          playerMovementRef.current.z = 0;
          break;
        case 's':
        case 'ArrowDown':
          playerMovementRef.current.z = 0;
          break;
        case 'a':
        case 'ArrowLeft':
          playerMovementRef.current.x = 0;
          break;
        case 'd':
        case 'ArrowRight':
          playerMovementRef.current.x = 0;
          break;
        case ' ':
          playerMovementRef.current.y = 0;
          break;
        case 'Shift':
          playerMovementRef.current.y = 0;
          break;
      }
    },
    [controlsRef]
  );

  const movePlayer = useCallback(
    (delta: number) => {
      if (!controlsRef.current || !controlsRef.current.isLocked) {
        return;
      }
      playerPositionRef.current.x = playerMovementRef.current.x * delta;
      playerPositionRef.current.z = playerMovementRef.current.z * delta;
      playerPositionRef.current.y = playerMovementRef.current.y * delta;
      controlsRef.current?.moveRight(playerPositionRef.current.x);
      controlsRef.current?.moveForward(playerPositionRef.current.z);
      if (fly) {
        controlsRef.current?.getObject().translateY(playerPositionRef.current.y);
      }
    },
    [controlsRef, fly]
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
    playerPosition: playerPositionRef.current,
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
