'use client';

import {
  GizmoHelper,
  GizmoViewport,
  OrbitControls,
  Stats,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls } from 'leva';
import React, { useLayoutEffect, useRef } from 'react';
import { Color, InstancedMesh, Matrix4 } from 'three';
import { cn } from '@lib/src';
import { useFullscreen } from '@hey-world/components';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';
import { Block } from '@/lib/block';
import { useWorld } from '@/lib/world';
import CameraMonitor from '@/components/helpers/CameraMonitor';
import LevaControl from '@/components/helpers/LevaControl';
import { RandomNumberGenerator } from '@/helpers/random-number-generator';

const World = ({ width, height }: { width: number; height: number }) => {
  const halfSize = Math.floor(width / 2);
  const totalSize = width * width * height;

  const meshRef = useRef<InstancedMesh>(null);
  const {
    terrainDataRef,
    getBlockAt,
    setBlockTypeAt,
    isBlockVisible,
    setBlockInstanceIdAt,
  } = useWorld(width, height);

  const { scale, magnitude, offset, seed } = useControls('Terrain', {
    scale: {
      value: 30,
      min: 20,
      max: 100,
      step: 1,
    },
    magnitude: {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
    },
    offset: {
      value: 0.2,
      min: 0,
      max: 1,
      step: 0.01,
    },
    seed: {
      value: 123456789,
      min: 0,
      max: 1000000000,
      step: 1,
    },
  });

  const initializeTerrain = ({
    width,
    height,
  }: {
    width: number;
    height: number;
  }) => {
    terrainDataRef.current = [];
    for (let x = 0; x < width; x++) {
      const slice: Block[][] = [];
      for (let y = 0; y < height; y++) {
        const row: Block[] = [];
        for (let z = 0; z < width; z++) {
          row.push({ type: 'empty', instanceId: null });
        }
        slice.push(row);
      }
      terrainDataRef.current.push(slice);
    }
  };

  const generateTerrain = ({
    scale,
    magnitude,
    offset,
    seed,
  }: {
    scale: number;
    magnitude: number;
    offset: number;
    seed: number;
  }) => {
    const randomNumberGenerator = new RandomNumberGenerator(seed);
    const simplexNoise = new SimplexNoise(randomNumberGenerator);
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < width; z++) {
        const value = simplexNoise.noise(x / scale, z / scale);
        const scaledValue = value * magnitude + offset;

        let _height = Math.floor(height * scaledValue);

        _height = Math.max(0, Math.min(height - 1, _height));

        for (let y = 0; y < height; y++) {
          if (y === _height) {
            setBlockTypeAt(x, y, z, 'grass');
          } else if (y < _height) {
            setBlockTypeAt(x, y, z, 'dirt');
          } else {
            setBlockTypeAt(x, y, z, 'empty');
          }
        }
      }
    }
  };

  const generateMesh = () => {
    if (!meshRef.current) {
      return;
    }

    meshRef.current.count = 0;
    const matrix = new Matrix4();
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < width; z++) {
          const block = getBlockAt(x, y, z);
          const notEmptyBlock = block && block.type !== 'empty';
          const _isBlockVisible = isBlockVisible(x, y, z);
          if (notEmptyBlock && _isBlockVisible) {
            // Center the world around origin
            matrix.setPosition(x - halfSize + 0.5, y + 0.5, z - halfSize + 0.5);

            const instanceId = meshRef.current.count;
            setBlockInstanceIdAt(x, y, z, instanceId);
            meshRef.current.setMatrixAt(instanceId, matrix);
            if (block.color) {
              meshRef.current.setColorAt(instanceId, new Color(block.color));
            }
            meshRef.current.count++;
          }
        }
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  };

  // Initialize terrain and generate mesh when parameters change
  useLayoutEffect(() => {
    initializeTerrain({ width, height });
    generateTerrain({ scale, magnitude, offset, seed });
    generateMesh();
  }, [width, height, scale, magnitude, offset, seed]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, totalSize]}
      frustumCulled={false} // Disable per-instance culling for better performance
    >
      <meshLambertMaterial />
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
};

const MinecraftSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { Fullscreen, isFullscreen } = useFullscreen({
    sectionRef,
  });
  const { width, height } = useControls('World', {
    width: {
      value: 64,
      min: 16,
      max: 128,
      step: 2,
    },
    height: {
      value: 16,
      min: 4,
      max: 32,
      step: 2,
    },
  });

  return (
    <section
      ref={sectionRef}
      className={cn('relative flex', {
        'fixed inset-0 z-50': isFullscreen,
      })}
    >
      <Canvas
        id="minecraft-main-canvas"
        style={{ aspectRatio: '16/9' }}
        gl={{ antialias: true }}
        camera={{
          fov: 75,
          near: 0.1,
          far: 1000,
          position: [width * 0.15, height + 10, -width * 0.8],
        }}
        scene={{ background: new Color('#80a0e0') }}
      >
        <gridHelper args={[128, 128]} />
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport />
        </GizmoHelper>
        <World width={width} height={height} />
        <directionalLight position={[1, 1, 1]} intensity={0.8} />
        <directionalLight position={[-1, 1, -0.5]} intensity={0.4} />
        <ambientLight intensity={0.2} />
        <OrbitControls target={[0, 0, 0]} />
        <Stats />
        <CameraMonitor />
      </Canvas>
      <Fullscreen />
      <LevaControl />
    </section>
  );
};

export default MinecraftSection;
