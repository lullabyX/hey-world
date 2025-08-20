import { useEffect, useLayoutEffect, useState } from 'react';
import { useControls } from 'leva';
import { dimensionsAtom } from '@/lib/store';
import { useAtom } from 'jotai';
import WorldChunk from './WorldChunk';

const World = () => {
  const [chunks, setChunks] = useState<React.ReactNode[]>([]);

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

  const { scale, magnitude, offset, seed } = useControls(
    'Terrain',
    {
      scale: {
        value: 30,
        min: 20,
        max: 100,
        step: 1,
      },
      magnitude: {
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
      offset: {
        value: 0.2,
        min: 0,
        max: 1,
        step: 0.01,
      },
      seed: {
        value: 123456789,
        min: 0,
        max: 1000000000,
        step: 1,
      },
    },
    { collapsed: true }
  );

  useEffect(() => {
    setDimensions({ width, height });
  }, [width, height, setDimensions]);

  useLayoutEffect(() => {
    const chunks = [];
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        const chunk = (
          <WorldChunk
            key={`${x}-${z}`}
            width={dimensions.width}
            height={dimensions.height}
            xPosition={x}
            zPosition={z}
            scale={scale}
            magnitude={magnitude}
            offset={offset}
            seed={seed}
          />
        );
        chunks.push(chunk);
      }
    }
    setChunks(chunks);
  }, [dimensions.width, dimensions.height, scale, magnitude, offset, seed]);

  return <group>{chunks}</group>;
};

export default World;
