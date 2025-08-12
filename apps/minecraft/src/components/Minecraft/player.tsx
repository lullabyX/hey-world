import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useRef } from 'react';
import { PerspectiveCamera as PerspectiveCameraType } from 'three';
import usePointerLockedControl from './usePointerLockedControl';
import { useControls } from 'leva';

const PlayerControls = () => {
  const cameraRef = useRef<PerspectiveCameraType>(null);

  const { Player } = useControls(
    'Debug',
    {
      Player: { value: false },
    },
    {
      collapsed: true,
    }
  );

  const { isLocked, controls } = usePointerLockedControl({
    camera: cameraRef.current,
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
    </group>
  );
};

export default PlayerControls;
