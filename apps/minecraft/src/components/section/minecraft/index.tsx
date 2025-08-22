'use client';

import { GizmoHelper, GizmoViewport, Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useControls } from 'leva';
import React, { useRef } from 'react';
import { Color } from 'three';
import { cn } from '@lib/src';
import CameraMonitor from '@/components/helpers/CameraMonitor';
import LevaControl from '@/components/helpers/LevaControl';
import { Lights } from '@/components/Minecraft';
import Player from '@/components/Minecraft/player/components/Player';
import { useAtom } from 'jotai';
import { dimensionsAtom } from '@/lib/store';
import World from '@/components/Minecraft/world/components/World';
import { WorldManagerProvider } from '@/components/Minecraft/world/state/WorldManager';

const MinecraftSection = () => {
  const sectionRef = useRef<HTMLElement>(null);

  const [dimensions] = useAtom(dimensionsAtom);

  const {
    Grid: isGridControl,
    Stats: isStatsControl,
    Camera: isCameraControl,
    Gizmo: isGizmoControl,
  } = useControls(
    'Debug',
    {
      Grid: { value: false },
      Stats: { value: true },
      Camera: { value: false },
      Gizmo: { value: false },
    },
    { collapsed: true }
  );

  return (
    <section ref={sectionRef} className={cn('relative flex')}>
      <LevaControl />
      <Canvas
        id="minecraft-main-canvas"
        style={{ aspectRatio: '16/9' }}
        gl={{ antialias: true }}
        camera={{
          fov: 75,
          near: 0.1,
          far: 1000,
          position: [
            dimensions.width * 0.15,
            dimensions.height + 10,
            -dimensions.width * 0.8,
          ],
        }}
        shadows
        scene={{
          background: new Color('#80a0e0'),
        }}
      >
        {isGridControl && <gridHelper args={[128, 128]} />}
        {isGizmoControl && (
          <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
            <GizmoViewport />
          </GizmoHelper>
        )}
        <WorldManagerProvider>
          <fog attach="fog" args={['#80a0e0', 40, 60]} />
          <World />
          <Player />
          <Lights />
        </WorldManagerProvider>
        {isStatsControl && <Stats />}
        {isCameraControl && <CameraMonitor />}
      </Canvas>
    </section>
  );
};

export default MinecraftSection;
