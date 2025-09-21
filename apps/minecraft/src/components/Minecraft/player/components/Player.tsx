import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useRef } from 'react';
import { Mesh, PerspectiveCamera as PerspectiveCameraType } from 'three';
import usePointerLockControls from '../hooks/useControls';
import { useControls } from 'leva';
import { playerHeight, playerRadius } from '@/lib/constants';
import CameraPosition from '@/components/helpers/CameraPosition';

const PlayerControls = () => {
  const playerRef = useRef<PerspectiveCameraType>(null);
  const playerBodyRef = useRef<Mesh>(null);

  const {
    'Player Body': isPlayerBody,
    'Player Camera Position': isPlayerCameraPosition,
    'Player Camera': isPlayerCamera,
  } = useControls(
    'Debug',
    {
      'Player Camera': { value: false },
      'Player Body': { value: false },
      'Player Camera Position': { value: false },
    },
    {
      collapsed: true,
    }
  );

  const { isLocked, controls } = usePointerLockControls({
    playerRef,
    playerBodyRef,
  });

  return (
    <group>
      <PerspectiveCamera
        ref={playerRef}
        position={[0, 64, 0]}
        near={0.1}
        far={100}
        fov={75}
        makeDefault={isLocked}
      />
      {isPlayerCameraPosition && (
        <CameraPosition cameraRef={playerRef} isLocked={isLocked} />
      )}
      {isPlayerCamera && playerRef.current && (
        <cameraHelper args={[playerRef.current]} />
      )}
      {isPlayerBody && (
        <mesh ref={playerBodyRef} position={[0, 64, 0]}>
          <cylinderGeometry args={[playerRadius, playerRadius, playerHeight]} />
          <meshBasicMaterial color="white" wireframe />
        </mesh>
      )}
      {controls}
      <OrbitControls target={[0, 0, 0]} enabled={!isLocked} />
    </group>
  );
};

export default PlayerControls;
