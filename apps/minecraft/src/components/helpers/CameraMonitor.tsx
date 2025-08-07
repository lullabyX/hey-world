import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useState } from 'react';

// Camera position monitor component
const CameraMonitor = ({ hidden = false }: { hidden?: boolean }) => {
  if (hidden) {
    return null;
  }
  const { camera } = useThree();
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });

  useFrame(() => {
    // Update position every 10 frames to reduce overhead
    if (Math.random() < 0.1) {
      setPosition({
        x: Math.round(camera.position.x * 10) / 10,
        y: Math.round(camera.position.y * 10) / 10,
        z: Math.round(camera.position.z * 10) / 10,
      });
    }
  });

  return (
    <Html
      position={[0, 20, 0]}
      center
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      Camera: X:{position.x} Y:{position.y} Z:{position.z}
    </Html>
  );
};

export default CameraMonitor;
