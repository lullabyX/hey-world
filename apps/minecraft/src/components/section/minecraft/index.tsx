'use client';

import { GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls } from 'leva';
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Matrix4 } from 'three';
import { cn } from '@lib/src';
import { useFullscreen } from '@hey-world/components';

const InstancedWorld = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  const meshRef = useRef<InstancedMesh>(null);

  const halfSize = Math.floor(width / 2);
  const totalSize = width * width * height;

  const { matrices } = useMemo(() => {
    const matrices: Matrix4[] = [];

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < width; z++) {
        for (let y = 0; y < height; y++) {
          const matrix = new Matrix4();
          // Center the world around origin
          matrix.setPosition(x - halfSize + 0.5, y + 0.5, z - halfSize + 0.5);
          matrices.push(matrix);
        }
      }
    }

    return { matrices };
  }, [width, height, halfSize]);

  useLayoutEffect(() => {
    if (!meshRef.current) {
      return;
    }

    matrices.forEach((matrix, i) => {
      meshRef.current!.setMatrixAt(i, matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, totalSize]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshLambertMaterial color="#00d000" />
    </instancedMesh>
  );
};

const MinecraftSection = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
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
        <InstancedWorld width={width} height={height} />
        <directionalLight position={[1, 1, 1]} />
        <directionalLight position={[-1, 1, -0.5]} />
        <ambientLight intensity={0.5} />
        <OrbitControls target={[0, 0, 0]} />
      </Canvas>
    </section>
  );
};

export default MinecraftSection;
