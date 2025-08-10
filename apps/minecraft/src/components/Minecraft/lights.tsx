'use client';

import { useHelper } from '@react-three/drei';
import { useRef } from 'react';
import { useControls } from 'leva';
import {
  CameraHelper,
  DirectionalLight,
  DirectionalLightHelper,
  OrthographicCamera,
} from 'three';

const Lights = () => {
  const dirLightRef = useRef<DirectionalLight>(null!);
  const orthoCamRef = useRef<OrthographicCamera>(null!);

  const { showHelpers } = useControls(
    'Debug',
    {
      showHelpers: { value: false },
    },
    { collapsed: true }
  );

  useHelper(
    showHelpers ? dirLightRef : null,
    DirectionalLightHelper,
    20,
    0xffaa00
  );
  useHelper(showHelpers ? orthoCamRef : null, CameraHelper);

  const SIZE = 100;
  return (
    <group>
      <directionalLight
        ref={dirLightRef}
        position={[SIZE / 2, SIZE / 2.5, SIZE / 2]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.005}
      >
        <orthographicCamera
          ref={orthoCamRef}
          attach="shadow-camera"
          top={SIZE}
          bottom={-SIZE}
          left={-SIZE}
          right={SIZE}
          near={0.1}
          far={SIZE * 1.5}
        />
      </directionalLight>
      <ambientLight intensity={0.8} />
    </group>
  );
};

Lights.displayName = 'Lights';

export default Lights;
