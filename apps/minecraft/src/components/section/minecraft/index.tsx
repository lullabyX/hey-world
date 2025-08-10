'use client';

import {
  GizmoHelper,
  GizmoViewport,
  OrbitControls,
  Stats,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls, useCreateStore } from 'leva';
import React, { useRef } from 'react';
import { Color } from 'three';
import { cn } from '@lib/src';
import { useFullscreen } from '@hey-world/components';
import CameraMonitor from '@/components/helpers/CameraMonitor';
import LevaControl from '@/components/helpers/LevaControl';
import { Lights, World } from '@/components/Minecraft';

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

  const {
    Grid,
    Stats: StatsControl,
    Camera: CameraControl,
  } = useControls(
    'Debug',
    {
      Grid: { value: false },
      Stats: { value: false },
      Camera: { value: false },
    },
    { collapsed: true }
  );

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
        shadows
        scene={{
          background: new Color('#80a0e0'),
          castShadow: true,
          receiveShadow: true,
        }}
      >
        {Grid && <gridHelper args={[128, 128]} />}
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport />
        </GizmoHelper>
        <World width={width} height={height} />
        <Lights />
        <OrbitControls target={[0, 0, 0]} />
        {StatsControl && <Stats />}
        {CameraControl && <CameraMonitor />}
      </Canvas>
      <LevaControl />
      <Fullscreen className="left-0 top-0" />
    </section>
  );
};

export default MinecraftSection;
