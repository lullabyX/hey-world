'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  InstancedMesh,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib';
import CollisionDebug from '@/components/helpers/CollisionDebug';
import PointDebug from '@/components/helpers/PointDebug';
import { useFullscreen } from '@base/components/src';
import usePhysics from './usePhysics';
import { useWorldManager } from '../../world';
import { BlockType, isValidInstanceId } from '@/lib/block';

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
  const selectedCoordsRef = useRef<Vector3>(null);
  const selectionHelperRef = useRef<Mesh>(null);
  const selectedBlockTypeRef = useRef<BlockType>('empty');
  const selectedNormalRef = useRef<Vector3>(new Vector3(0, 0, 0));

  const [isLocked, setIsLocked] = useState(false);

  const { 'Collision Debug': isCollisionDebug, 'Point Debug': isPointDebug } =
    useControls('Debug', {
      'Collision Debug': { value: false },
      'Point Debug': { value: false },
    });

  const { gl } = useThree();

  const { handleFullscreen } = useFullscreen({
    id: 'minecraft-main-canvas',
  });

  const { chunksRef, removeBlockAt, addBlockAt } = useWorldManager();

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
        case '1':
          selectedBlockTypeRef.current = 'grass';
          break;
        case '2':
          selectedBlockTypeRef.current = 'dirt';
          break;
        case '3':
          selectedBlockTypeRef.current = 'stone';
          break;
        case '4':
          selectedBlockTypeRef.current = 'wood';
          break;
        case '5':
          selectedBlockTypeRef.current = 'coal_ore';
          break;
        case '6':
          selectedBlockTypeRef.current = 'iron_ore';
          break;
        case '7':
          selectedBlockTypeRef.current = 'gold_ore';
          break;
        case '8':
          selectedBlockTypeRef.current = 'diamond_ore';
          break;
        case '9':
          selectedBlockTypeRef.current = 'sand';
          break;
        case '0':
          selectedBlockTypeRef.current = 'empty';
          break;
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
          playerRef.current?.position.set(32, 32, 32);
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

  const handlePointerOver = useCallback(() => {
    if (!controlsRef.current?.isLocked) return;
    if (!playerRef.current) return;
    if (!chunksRef.current) return;
    if (!selectionHelperRef.current) return;

    const raycaster = new Raycaster(
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 0),
      0,
      3
    );

    raycaster.setFromCamera(new Vector2(0, 0), playerRef.current); // correct world origin+dir
    const intersections = raycaster.intersectObject(chunksRef.current, true);

    const intersection = intersections?.[0];

    if (
      intersection &&
      isValidInstanceId(intersection.instanceId) &&
      intersection.object instanceof InstancedMesh
    ) {
      const chunkPosition = intersection.object.position;

      const blockMatrix = new Matrix4();
      intersection.object.getMatrixAt(intersection.instanceId, blockMatrix);

      selectedCoordsRef.current = chunkPosition.clone();
      selectedCoordsRef.current.applyMatrix4(blockMatrix);
      selectedNormalRef.current.copy(
        intersection.normal ?? new Vector3(0, 0, 0)
      );

      selectionHelperRef.current.position.copy(selectedCoordsRef.current);
      selectionHelperRef.current.visible = true;
    } else {
      selectedCoordsRef.current = null;
      selectionHelperRef.current.visible = false;
    }
  }, [controlsRef, playerRef, chunksRef, selectionHelperRef]);

  const handlePointerDown = useCallback(
    (ev: MouseEvent) => {
      if (!controlsRef.current?.isLocked) return;
      if (!selectedCoordsRef.current) return;
      if (ev.button !== 0) return;

      const coords = selectedCoordsRef.current;
      if (selectedBlockTypeRef.current === 'empty') {
        removeBlockAt(coords.x, coords.y, coords.z);
      } else {
        const normalizedCoords = coords.clone().add(selectedNormalRef.current);
        console.log(normalizedCoords);
        addBlockAt(
          normalizedCoords.x,
          normalizedCoords.y,
          normalizedCoords.z,
          selectedBlockTypeRef.current
        );
      }
    },
    [selectedCoordsRef, controlsRef, removeBlockAt, addBlockAt]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.addEventListener('mousedown', handlePointerDown);
    };
  }, [handleKeyDown, handleKeyUp, handlePointerOver, handlePointerDown]);

  useFrame((_, delta) => {
    updatePhysics(delta);
    handlePointerOver();
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
      <mesh
        ref={selectionHelperRef}
        position={playerRef.current?.position}
        visible={false}
      >
        <boxGeometry args={[1.001, 1.001, 1.001]} />
        <meshBasicMaterial color="white" transparent opacity={0.3} />
      </mesh>
    </group>
  ) : null;

  return {
    isLocked,
    handleUnlock,
    controls,
    controlsRef,
  };
};

export default useControl;
