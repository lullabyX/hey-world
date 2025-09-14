'use client';

import { useHelper } from '@react-three/drei';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { useControls } from 'leva';
import {
  CameraHelper,
  DirectionalLight,
  DirectionalLightHelper,
  OrthographicCamera,
  Vector3,
} from 'three';
import { useWorldManager } from './world';
import { useFrame, useThree } from '@react-three/fiber';

const Lights = () => {
  const dirLightRef = useRef<DirectionalLight>(null!);
  const orthoCamRef = useRef<OrthographicCamera>(null!);

  const { Sun } = useControls(
    'Debug',
    {
      Sun: { value: false },
    },
    { collapsed: true }
  );

  const { scene } = useThree();

  useHelper(Sun ? dirLightRef : null, DirectionalLightHelper, 20, 0xffaa00);
  useHelper(Sun ? orthoCamRef : null, CameraHelper);

  const { playerPositionRef } = useWorldManager();

  const updateLightPosition = useCallback(() => {
    if (!playerPositionRef.current || !dirLightRef.current) {
      return;
    }

    const offset = new Vector3(-25, -25, -25);
    dirLightRef.current.position.copy(playerPositionRef.current);
    dirLightRef.current.position.sub(offset);
    dirLightRef.current.target.position.copy(playerPositionRef.current);
  }, [playerPositionRef, dirLightRef]);

  useLayoutEffect(() => {
    if (!dirLightRef.current) {
      return;
    }
    const sun = dirLightRef.current.target;
    scene.add(sun);

    return () => {
      scene.remove(sun);
    };
  }, [scene, dirLightRef]);

  useFrame(() => {
    updateLightPosition();
  });

  const SIZE = 50;
  return (
    <group>
      <directionalLight
        ref={dirLightRef}
        position={[SIZE / 2, SIZE / 2.5, SIZE / 2]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.005}
      >
        <orthographicCamera
          ref={orthoCamRef}
          attach="shadow-camera"
          args={[-SIZE, SIZE, -SIZE, SIZE]}
          near={0.1}
          far={100}
        />
      </directionalLight>
      <ambientLight intensity={0.6} />
    </group>
  );
};

Lights.displayName = 'Lights';

export default Lights;
