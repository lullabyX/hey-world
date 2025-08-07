'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import React, { useLayoutEffect, useRef } from 'react';
import { Color, InstancedMesh, Matrix4 } from 'three';
import { cn } from '@lib/src';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';
import { Block } from '@/app/lib/block';
import { useWorld } from '@/app/lib/world';

const World = ({
  width,
  height,
  scale,
  magnitude,
  offset,
}: {
  width: number;
  height: number;
  scale: number;
  magnitude: number;
  offset: number;
}) => {
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
  }: {
    scale: number;
    magnitude: number;
    offset: number;
  }) => {
    const simplexNoise = new SimplexNoise();
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
    generateTerrain({ scale, magnitude, offset });
    generateMesh();
  }, [width, height, scale, magnitude, offset]);

  // Use delta for frame-rate independent rotation
  // rotationSpeed is in radians per second
  const rotationSpeed = 0.1; // Adjust this value to control speed

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y -= rotationSpeed * delta;
    }
  });

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

const MinecraftWorld = ({
  width,
  height,
  className,
  scale,
  magnitude,
  offset,
  ...rest
}: {
  width: number;
  height: number;
  scale: number;
  magnitude: number;
  offset: number;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const worldRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={worldRef} className={cn('relative flex', className)} {...rest}>
      <Canvas
        id="minecraft-world-hero-canvas"
        style={{ aspectRatio: '16/9' }}
        gl={{ antialias: true }}
        camera={{
          fov: 75,
          near: 0.1,
          far: 1000,
          position: [width * 0.15, height + 10, -width * 0.8],
        }}
      >
        <World
          width={width}
          height={height}
          scale={scale}
          magnitude={magnitude}
          offset={offset}
        />
        <directionalLight position={[1, 1, 1]} intensity={0.8} />
        <directionalLight position={[-1, 1, -0.5]} intensity={0.4} />
        <ambientLight intensity={0.2} />
      </Canvas>
    </div>
  );
};

export default MinecraftWorld;
