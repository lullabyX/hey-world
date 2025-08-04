'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import React, { useRef } from 'react';
import { Color } from 'three';
import * as THREE from 'three';

const BasicBlock = ({ position }: { position: [number, number, number] }) => {
  return (
    <mesh position={position}>
      <boxGeometry args={[1, 1, 1]} />
      <meshLambertMaterial color="#00d000" />
    </mesh>
  );
};

const setupWorld = (size: number) => {
  const blocks = [];
  const halfSize = Math.floor(size / 2);

  for (let x = -halfSize; x <= halfSize; x++) {
    for (let z = -halfSize; z <= halfSize; z++) {
      blocks.push(<BasicBlock key={`world-${x}-${z}`} position={[x, 0, z]} />);
    }
  }
  return blocks;
};

const RotatingWorld = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2; // Slow rotation speed
    }
  });

  return (
    <group ref={groupRef}>
      <gridHelper args={[64, 64]} />
      {setupWorld(32)}
    </group>
  );
};

const MinecraftSection = () => {
  return (
    <section className="flex min-h-screen flex-1 bg-card">
      <Canvas
        id="minecraft-main-canvas"
        style={{ aspectRatio: '16/9' }}
        gl={{ antialias: true }}
        camera={{ fov: 75, near: 0.1, far: 1000, position: [20, 8, 20] }}
        scene={{ background: new Color('#80a0e0') }}
      >
        <RotatingWorld />
        <directionalLight position={[1, 1, 1]} />
        <directionalLight position={[-1, 1, -0.5]} />
        <ambientLight intensity={0.5} />
        <OrbitControls target={[0, 0, 0]} />
      </Canvas>
    </section>
  );
};

export default MinecraftSection;
