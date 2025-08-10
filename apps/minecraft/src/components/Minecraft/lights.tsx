'use client';

import { useHelper } from '@react-three/drei';
import React from 'react';
import {
  CameraHelper,
  DirectionalLight,
  DirectionalLightHelper,
  OrthographicCamera,
} from 'three';

const Lights = () => {
  const dirLightRef = React.useRef<DirectionalLight>(null!);
  const orthoCamRef = React.useRef<OrthographicCamera>(null!);

  // Bigger yellow helper for the light itself
  useHelper(dirLightRef, DirectionalLightHelper, 20, 0xffaa00);

  // Draw the light’s shadow camera frustum

  useHelper(orthoCamRef, CameraHelper);

  // Fit shadow frustum to world dimensions for stable, sharper shadows

  return (
    <group>
      <directionalLight
        ref={dirLightRef}
        position={[25, 25, 25]}
        intensity={2}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0005}
      >
        <orthographicCamera
          ref={orthoCamRef}
          attach="shadow-camera"
          top={50}
          bottom={-50}
          left={-50}
          right={50}
          near={0.1}
          far={75}
        />
      </directionalLight>
      <ambientLight intensity={0.8} />
    </group>
  );
};

Lights.displayName = 'Lights';

export default Lights;
