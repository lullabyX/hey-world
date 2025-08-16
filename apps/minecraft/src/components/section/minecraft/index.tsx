'use client';

import { GizmoHelper, GizmoViewport, Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls } from 'leva';
import React, { useEffect, useRef } from 'react';
import { Color } from 'three';
import { cn } from '@lib/src';
import { useFullscreen } from '@hey-world/components';
import CameraMonitor from '@/components/helpers/CameraMonitor';
import LevaControl from '@/components/helpers/LevaControl';
import { Lights, World } from '@/components/Minecraft';
import Player from '@/components/Minecraft/player/player';
import { TerrainType } from '@/lib/world';
import { useAtom } from 'jotai';
import { dimensionsAtom } from '@/lib/store';

const MinecraftSection = () => {
  const sectionRef = useRef<HTMLElement>(null);

  const terrainDataRef = useRef<TerrainType>([]);

  const { Fullscreen, isFullscreen } = useFullscreen({
    sectionRef,
  });

  const [dimensions, setDimensions] = useAtom(dimensionsAtom);

  const { width, height } = useControls('World', {
    width: {
      value: dimensions.width,
      min: 16,
      max: 128,
      step: 2,
    },
    height: {
      value: dimensions.height,
      min: 4,
      max: 32,
      step: 2,
    },
  });

  useEffect(() => {
    setDimensions({ width, height });
  }, [width, height, setDimensions]);

  const {
    Grid,
    Stats: StatsControl,
    Camera: CameraControl,
  } = useControls(
    'Debug',
    {
      Grid: { value: false },
      Stats: { value: true },
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
      <LevaControl />
      <Fullscreen className="left-0 top-0" />
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
        <World width={width} height={height} terrainData={terrainDataRef} />
        <Lights />
        <Player world={terrainDataRef} />
        {StatsControl && <Stats />}
        {CameraControl && <CameraMonitor />}
      </Canvas>
    </section>
  );
};

export default MinecraftSection;
