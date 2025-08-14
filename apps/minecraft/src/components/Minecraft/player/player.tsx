import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { RefObject, useRef } from 'react';
import { Mesh, PerspectiveCamera as PerspectiveCameraType } from 'three';
import useControl from './useControl';
import { useControls } from 'leva';
import { TerrainType } from '@/lib/world';
import { playerHeight, playerRadius } from '@/lib/constants';

const PlayerControls = ({ world }: { world: RefObject<TerrainType> }) => {
  const cameraRef = useRef<PerspectiveCameraType>(null);
  const playerRef = useRef<Mesh>(null);

  const { Player } = useControls(
    'Debug',
    {
      Player: { value: false },
    },
    {
      collapsed: true,
    }
  );

  const { isLocked, controls } = useControl({
    camera: cameraRef.current!,
    playerRef,
    world,
  });

  return (
    <group>
      <PerspectiveCamera
        ref={cameraRef}
        position={[0, 10, 10]}
        near={0.1}
        far={100}
        fov={75}
        makeDefault={isLocked}
      ></PerspectiveCamera>
      {Player && cameraRef.current && (
        <cameraHelper args={[cameraRef.current]} />
      )}
      {controls}
      <OrbitControls target={[0, 0, 0]} enabled={!isLocked} />
      <mesh ref={playerRef} position={[0, 10, 10]}>
        <cylinderGeometry args={[playerRadius, playerRadius, playerHeight]} />
        <meshBasicMaterial color="white" wireframe />
      </mesh>
    </group>
  );
};

export default PlayerControls;
