import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { RefObject, useRef } from 'react';
import { Mesh, PerspectiveCamera as PerspectiveCameraType } from 'three';
import useControl from './useControl';
import { useControls } from 'leva';
import { TerrainType } from '@/lib/world';
import { playerHeight, playerRadius } from '@/lib/constants';
import CameraPosition from './CameraPosition';

const PlayerControls = ({ world }: { world: RefObject<TerrainType> }) => {
  const playerRef = useRef<PerspectiveCameraType>(null);
  const playerBodyRef = useRef<Mesh>(null);

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
    playerRef,
    playerBodyRef,
    world,
  });

  return (
    <group>
      <PerspectiveCamera
        ref={playerRef}
        position={[0, 10, 10]}
        near={0.1}
        far={100}
        fov={75}
        makeDefault={isLocked}
      ></PerspectiveCamera>
      <CameraPosition cameraRef={playerRef} isLocked={isLocked} />
      {Player && playerRef.current && (
        <cameraHelper args={[playerRef.current]} />
      )}
      {controls}
      <OrbitControls target={[0, 0, 0]} enabled={!isLocked} />
      <mesh ref={playerBodyRef} position={[0, 10, 10]}>
        <cylinderGeometry args={[playerRadius, playerRadius, playerHeight]} />
        <meshBasicMaterial color="white" wireframe />
      </mesh>
    </group>
  );
};

export default PlayerControls;
