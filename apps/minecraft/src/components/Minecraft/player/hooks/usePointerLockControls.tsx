'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { ForwardedRef, RefObject } from 'react';
import { Mesh, PerspectiveCamera, Vector3 } from 'three';
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib';
import CollisionDebug from '@/components/helpers/CollisionDebug';
import PointDebug from '@/components/helpers/PointDebug';
import { useFullscreen } from '@base/components/src';
import usePhysics from './usePhysics';

const useControl = ({
  playerRef,
  playerBodyRef,
}: {
  playerRef: RefObject<PerspectiveCamera | null>;
  playerBodyRef: RefObject<Mesh | null>;
}) => {
  const { speed } = useControls('Player', {
    speed: {
      value: 5,
      min: 1,
      max: 10,
      step: 1,
    },
  });

  const jumpSpeed = 10;
  const onGroundRef = useRef(false);

  const controlsRef = useRef<PointerLockControlsImpl>(null);

  const pointerLockControlTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointerLockReadyRef = useRef(true);

  const inputRef = useRef<Vector3>(new Vector3(0, 0, 0));
  const playerVelocityRef = useRef(new Vector3(0, 0, 0));

  const [isLocked, setIsLocked] = useState(false);

  const { 'Collision Debug': isCollisionDebug, 'Point Debug': isPointDebug } =
    useControls('Debug', {
      'Collision Debug': { value: false },
      'Point Debug': { value: false },
    });

  const { handleFullscreen } = useFullscreen({
    id: 'minecraft-main-canvas',
  });

  const { gl } = useThree();

  const { narrowPhaseCollisionsRef, collisionsRef, updatePhysics } = usePhysics(
    {
      inputRef,
      playerRef,
      controlsRef,
      playerBodyRef,
      playerVelocityRef,
      onGroundRef,
    }
  );

  const handleLock = useCallback(() => {
    if (!controlsRef.current || controlsRef.current.isLocked) {
      return;
    }
    if (!pointerLockReadyRef.current) {
      return;
    }
    controlsRef.current.lock();
    setIsLocked(true);
    handleFullscreen();
    return () => {
      if (pointerLockControlTimeoutRef.current) {
        clearTimeout(pointerLockControlTimeoutRef.current);
      }
    };
  }, [handleFullscreen]);

  const handleUnlock = useCallback(() => {
    if (!controlsRef.current || !controlsRef.current.isLocked) {
      return;
    }
    pointerLockReadyRef.current = false;
    setIsLocked(false);
    controlsRef.current.unlock();
    handleFullscreen();
    if (pointerLockControlTimeoutRef.current) {
      clearTimeout(pointerLockControlTimeoutRef.current);
    }
    pointerLockControlTimeoutRef.current = setTimeout(() => {
      pointerLockReadyRef.current = true;
    }, 1500);
  }, [handleFullscreen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !controlsRef.current?.isLocked) {
        handleLock();
      }

      if (!controlsRef.current?.isLocked) {
        return;
      }

      switch (e.key) {
        case 'w':
        case 'ArrowUp':
          inputRef.current.z = speed;
          break;
        case 's':
        case 'ArrowDown':
          inputRef.current.z = -speed;
          break;
        case 'a':
        case 'ArrowLeft':
          inputRef.current.x = -speed;
          break;
        case 'd':
        case 'ArrowRight':
          inputRef.current.x = speed;
          break;
        case ' ':
          if (onGroundRef.current) {
            playerVelocityRef.current.y = jumpSpeed;
          }
          break;
        case 'r':
          playerRef.current?.position.set(0, 10, 10);
          playerVelocityRef.current = new Vector3(0, 0, 0);
          break;
      }
    },
    [handleLock, speed, controlsRef, playerRef]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!controlsRef.current?.isLocked) {
      return;
    }
    switch (e.key) {
      case 'w':
      case 'ArrowUp':
        inputRef.current.z = 0;
        break;
      case 's':
      case 'ArrowDown':
        inputRef.current.z = 0;
        break;
      case 'a':
      case 'ArrowLeft':
        inputRef.current.x = 0;
        break;
      case 'd':
      case 'ArrowRight':
        inputRef.current.x = 0;
        break;
    }
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
    updatePhysics(delta);
  });

  const controls = playerRef.current ? (
    <group>
      <PointerLockControls
        ref={controlsRef}
        selector="#__no_pointer_lock_controls__"
        camera={playerRef.current}
        onUnlock={handleUnlock}
        domElement={gl.domElement}
      />
      {isCollisionDebug && (
        <CollisionDebug
          positionsRef={narrowPhaseCollisionsRef}
          color="red"
          opacity={0.2}
        />
      )}
      {isPointDebug && <PointDebug positionsRef={collisionsRef} wireframe />}
    </group>
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
