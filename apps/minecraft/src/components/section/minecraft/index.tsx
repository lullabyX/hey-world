'use client';

import {
  GizmoHelper,
  GizmoViewport,
  OrbitControls,
  Stats,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls } from 'leva';
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Color, InstancedMesh, Matrix4 } from 'three';
import { cn } from '@lib/src';
import { useFullscreen } from '@hey-world/components';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';

type BlockType = 'empty' | 'grass';

type Block = {
  type: BlockType;
  instanceId: number;
  color?: string;
};

type GrassBlock = Block & {
  type: 'grass';
  color: '#006d00';
};

type EmptyBlock = Block & {
  type: 'empty';
};

const World = ({ width, height }: { width: number; height: number }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const { scale, magnitude, offset } = useControls({
    scale: {
      value: 30,
      min: 10,
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
  });

  const halfSize = Math.floor(width / 2);
  const totalSize = width * width * height;

  const terrainData = useMemo(() => {
    const data: Block[][][] = [];
    for (let x = 0; x < width; x++) {
      const slice: Block[][] = [];
      for (let y = 0; y < height; y++) {
        const row: Block[] = [];
        for (let z = 0; z < width; z++) {
          row.push({ type: 'empty', instanceId: 0 });
        }
        slice.push(row);
      }
      data.push(slice);
    }
    return data;
  }, [height, width]);

  const getBlockAt = (x: number, y: number, z: number) => {
    if (!isBound(x, y, z)) {
      return null;
    }
    return terrainData[x]![y]![z]!;
  };

  const setBlockTypeAt = (x: number, y: number, z: number, type: BlockType) => {
    if (!isBound(x, y, z)) {
      return;
    }
    terrainData[x]![y]![z]!.type = type;
  };

  const setBlockInstanceIdAt = (
    x: number,
    y: number,
    z: number,
    instanceId: number
  ) => {
    if (!isBound(x, y, z)) {
      return;
    }
    terrainData[x]![y]![z]!.instanceId = instanceId;
  };

  const isBound = (x: number, y: number, z: number) => {
    return (
      x >= 0 &&
      x < width &&
      y >= 0 &&
      y < height &&
      z >= 0 &&
      z < width &&
      terrainData[x]?.[y]?.[z] !== undefined
    );
  };

  const generateTerrain = () => {
    const simplexNoise = new SimplexNoise();
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < width; z++) {
        const value = simplexNoise.noise(x / scale, z / scale);
        const scaledValue = value * magnitude + offset;

        const generatedHeight = Math.floor(
          Math.max(0, Math.min(height - 1, height * scaledValue))
        );

        for (let y = 0; y <= generatedHeight; y++) {
          setBlockTypeAt(x, y, z, 'grass');
        }
      }
    }
  };

  generateTerrain();

  useLayoutEffect(() => {
    if (!meshRef.current) {
      return;
    }

    let count = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < width; z++) {
          const block = getBlockAt(x, y, z);
          if (block && block.type !== 'empty') {
            const matrix = new Matrix4();
            // Center the world around origin
            matrix.setPosition(x - halfSize + 0.5, y + 0.5, z - halfSize + 0.5);
            setBlockInstanceIdAt(x, y, z, count);
            meshRef.current.setMatrixAt(count, matrix);
            if (block.color) {
              meshRef.current.setColorAt(count, new Color(block.color));
            }
            count++;
          }
        }
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [terrainData]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, totalSize]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshLambertMaterial />
    </instancedMesh>
  );
};

const MinecraftSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { Fullscreen, isFullscreen } = useFullscreen({
    sectionRef,
  });
  const { width, height } = useControls({
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
      <div className="absolute right-0 top-0 z-10 flex gap-2 p-4">
        <Leva fill />
      </div>
      <Fullscreen />
      <Canvas
        id="minecraft-main-canvas"
        style={{ aspectRatio: '16/9' }}
        gl={{ antialias: true }}
        camera={{
          fov: 75,
          near: 0.1,
          far: 1000,
          position: [
            width * 0.7, // X: 70% of world width
            Math.max(height + 15, 25), // Y: Height + buffer, minimum 25
            width * 0.7,
          ],
        }}
        scene={{ background: new Color('#80a0e0') }}
      >
        <gridHelper args={[128, 128]} />
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport />
        </GizmoHelper>
        <World width={width} height={height} />
        <directionalLight position={[1, 1, 1]} />
        <directionalLight position={[-1, 1, -0.5]} />
        <ambientLight intensity={0.5} />
        <OrbitControls target={[0, 0, 0]} />
        <Stats />
      </Canvas>
    </section>
  );
};

export default MinecraftSection;
