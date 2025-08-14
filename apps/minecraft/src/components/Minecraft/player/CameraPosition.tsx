'use client';

import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Camera } from 'three';

const CameraPosition = ({
  cameraRef,
  isLocked,
}: {
  cameraRef?: RefObject<Camera | null>;
  isLocked?: boolean;
}) => {
  const { camera: activeCamera } = useThree();
  const camera =
    isLocked && cameraRef?.current ? cameraRef.current : activeCamera;
  const lastRef = useRef({ x: 0, y: 0, z: 0 });

  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 0 });

  // Keep the Html wrapper fixed to the canvas (top-left), regardless of camera movement.
  // With Html's `fullscreen`, its container is offset by (-w/2, -h/2). Returning [w/2, h/2]
  // cancels that offset so the wrapper aligns with the canvas' top-left.
  const placeAtCanvasTopLeft = useCallback(
    (
      _el: unknown,
      _camera: unknown,
      size: { width: number; height: number }
    ) => [size.width / 2, size.height / 2],
    []
  );

  // Update atom each frame (rounded to 2 decimals) and avoid redundant writes
  useFrame(() => {
    if (!camera) return;
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const next = {
      x: round2(camera.position.x),
      y: round2(camera.position.y),
      z: round2(camera.position.z),
    };
    const prev = lastRef.current;
    if (next.x !== prev.x || next.y !== prev.y || next.z !== prev.z) {
      lastRef.current = next;
      setCameraPosition(next);
    }
  });

  return (
    <Html fullscreen calculatePosition={placeAtCanvasTopLeft}>
      <div className="absolute bottom-2 left-2">
        <div className="flex flex-row gap-3 rounded bg-black/50 px-2 py-1 text-white">
          <div className="flex flex-row gap-1">
            X: <span>{cameraPosition.x.toFixed(2)}</span>
          </div>
          <div className="flex flex-row gap-1">
            Y: <span>{cameraPosition.y.toFixed(2)}</span>
          </div>
          <div className="flex flex-row gap-1">
            Z: <span>{cameraPosition.z.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </Html>
  );
};

export default CameraPosition;
