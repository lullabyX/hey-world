'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { InstancedMesh, Object3D, Vector3 } from 'three';

const MAX_INSTANCES = 128;

const CollisionDebug = ({
  positionsRef,
  color = 'red',
  opacity = 0.2,
  wireframe = false,
}: {
  positionsRef: RefObject<Vector3[]>;
  color?: string;
  opacity?: number;
  wireframe?: boolean;
}) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    const positions = positionsRef.current || [];
    const count = Math.min(positions.length, MAX_INSTANCES);
    for (let i = 0; i < count; i++) {
      const p = positions[i];
      if (!p) {
        continue;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_INSTANCES]}
      frustumCulled={false}
    >
      <boxGeometry args={[1.001, 1.001, 1.001]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        wireframe={wireframe}
        depthTest={false}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

export default CollisionDebug;
