'use client';

import {
  GizmoHelper,
  GizmoViewport,
  OrbitControls,
  Stats,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { folder, useControls } from 'leva';
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  NearestFilter,
  RepeatWrapping,
  Texture,
  TextureLoader,
  Vector2,
} from 'three';
import type { StaticImageData } from 'next/image';
import blocksAtlas from '@/public/atlas/blocks.png';
import { cn } from '@lib/src';
import { useFullscreen } from '@hey-world/components';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';
import { Block, createBlock, getResourceEntries } from '@/lib/block';
import { useWorld } from '@/lib/world';
import CameraMonitor from '@/components/helpers/CameraMonitor';
import LevaControl from '@/components/helpers/LevaControl';
import { RandomNumberGenerator } from '@/helpers/random-number-generator';

const World = ({ width, height }: { width: number; height: number }) => {
  const halfSize = Math.floor(width / 2);
  const totalSize = width * width * height;

  const meshRef = useRef<InstancedMesh>(null);
  const materialRef = useRef<MeshLambertMaterial>(null);
  const atlasScaleRef = useRef(new Vector2(1, 1));

  const [atlas, setAtlas] = useState<{
    texture: Texture;
    cols: number;
    rows: number;
    tileIndexByName: Record<string, number>;
  } | null>(null);
  const {
    terrainDataRef,
    getBlockAt,
    setBlockTypeAt,
    isBlockVisible,
    setBlockInstanceIdAt,
  } = useWorld(width, height);

  const { scale, magnitude, offset, seed } = useControls('Terrain', {
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
  });

  const resources = useMemo(() => getResourceEntries(), []);
  const resourceControlsSchema = useMemo(
    () =>
      resources.reduce(
        (acc, [resourceType, def]) => {
          const scale = def.resource.scale;
          acc[resourceType] = folder(
            {
              [`${resourceType}::scarcity`]: {
                label: 'scarcity',
                value: def.resource.scarcity,
                min: 0,
                max: 1,
                step: 0.01,
              },
              [`${resourceType}::scaleX`]: {
                label: 'scaleX',
                value: scale.x,
                min: 1,
                max: 128,
                step: 1,
              },
              [`${resourceType}::scaleY`]: {
                label: 'scaleY',
                value: scale.y,
                min: 1,
                max: 128,
                step: 1,
              },
              [`${resourceType}::scaleZ`]: {
                label: 'scaleZ',
                value: scale.z,
                min: 1,
                max: 128,
                step: 1,
              },
            },
            { collapsed: true }
          );
          return acc;
        },
        {} as Record<string, unknown>
      ),
    [resources]
  );
  const resourceControls = useControls('Resources', resourceControlsSchema, {
    collapsed: true,
  }) as Record<string, number>;
  const resourceControlsKey = JSON.stringify(resourceControls);

  const initializeTerrain = ({
    width,
    height,
  }: {
    width: number;
    height: number;
  }) => {
    terrainDataRef.current = [];
    for (let x = 0; x < width; x++) {
      const slice: Block[][] = [];
      for (let y = 0; y < height; y++) {
        const row: Block[] = [];
        for (let z = 0; z < width; z++) {
          row.push(createBlock('empty'));
        }
        slice.push(row);
      }
      terrainDataRef.current.push(slice);
    }
  };

  // Inject shader to sample atlas with per-face offsets
  useEffect(() => {
    if (!materialRef.current) return;
    const mat = materialRef.current;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.atlasScale = { value: atlasScaleRef.current };
      shader.vertexShader =
        `
        attribute vec2 uvTop;
        attribute vec2 uvSide;
        attribute vec2 uvBottom;
        uniform vec2 atlasScale;
        varying vec2 vUvAtlas;
      ` +
        shader.vertexShader.replace(
          '#include <uv_vertex>',
          `
        #include <uv_vertex>
        vec2 _uvOffset = (normal.y > 0.5) ? uvTop : ((normal.y < -0.5) ? uvBottom : uvSide);
        vUvAtlas = (uv * atlasScale) + _uvOffset;
        `
        );
      shader.fragmentShader =
        `
        varying vec2 vUvAtlas;
      ` +
        shader.fragmentShader.replace(
          '#include <map_fragment>',
          `
        #ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vUvAtlas );
          diffuseColor *= sampledDiffuseColor;
        #endif
        `
        );
      (mat as any).userData.shader = shader;
    };
    mat.needsUpdate = true;
  }, []);

  // Build a small texture atlas from remote block textures
  useEffect(() => {
    let cancelled = false;
    const loader = new TextureLoader();
    loader.setCrossOrigin('anonymous');
    const atlasUrl =
      (blocksAtlas as any)?.src ?? (blocksAtlas as unknown as string);
    loader.load(
      atlasUrl,
      (texture) => {
        if (cancelled) return;
        texture.magFilter = NearestFilter;
        texture.minFilter = NearestFilter;
        texture.generateMipmaps = false;
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        const cols = 16;
        const rows = 16;
        const tileIndexByName: Record<string, number> = {
          grass: 0,
          stone: 1,
          dirt: 2,
          grassSide: 3,
          planks: 4,
          sand: 18,
          treeSide: 20,
          treeTop: 21,
          cloud: 22,
          goldOre: 32,
          ironOre: 33,
          coalOre: 34,
          leaves: 53,
        };
        setAtlas({ texture, cols, rows, tileIndexByName });
      },
      undefined,
      () => {
        // ignore
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const generateTerrain = ({
    scale,
    magnitude,
    offset,
    rng,
  }: {
    scale: number;
    magnitude: number;
    offset: number;
    rng: RandomNumberGenerator;
  }) => {
    const simplexNoise = new SimplexNoise(rng);
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < width; z++) {
        const value = simplexNoise.noise(x / scale, z / scale);
        const scaledValue = value * magnitude + offset;

        let _height = Math.floor(height * scaledValue);

        _height = Math.max(0, Math.min(height - 1, _height));

        for (let y = 0; y < height; y++) {
          const isResource = getBlockAt(x, y, z)?.isResource;
          if (y === _height) {
            setBlockTypeAt(x, y, z, 'grass');
          } else if (y < _height && !isResource) {
            setBlockTypeAt(x, y, z, 'dirt');
          } else if (y > _height) {
            setBlockTypeAt(x, y, z, 'empty');
          }
        }
      }
    }
  };

  const generateResources = ({ rng }: { rng: RandomNumberGenerator }) => {
    const resources = getResourceEntries();
    resources.forEach(([resourceType, def]) => {
      const scale = {
        x: resourceControls[`${resourceType}::scaleX`] ?? def.resource.scale.x,
        y: resourceControls[`${resourceType}::scaleY`] ?? def.resource.scale.y,
        z: resourceControls[`${resourceType}::scaleZ`] ?? def.resource.scale.z,
      };
      const threshold = Math.min(
        Math.max(
          resourceControls[`${resourceType}::scarcity`] ??
            def.resource.scarcity,
          0
        ),
        1
      );
      const simplexNoise = new SimplexNoise(rng);
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          for (let z = 0; z < width; z++) {
            const current = getBlockAt(x, y, z);
            if (!current) {
              continue;
            }
            const value = simplexNoise.noise3d(
              x / scale.x,
              y / scale.y,
              z / scale.z
            );
            if (value > threshold) {
              setBlockTypeAt(x, y, z, resourceType);
            }
          }
        }
      }
    });
  };

  const generateMesh = () => {
    if (!meshRef.current || !atlas) {
      return;
    }

    meshRef.current.count = 0;
    const matrix = new Matrix4();

    const geom = meshRef.current.geometry as any;
    const total = totalSize;
    const uvTopArr = new Float32Array(total * 2);
    const uvSideArr = new Float32Array(total * 2);
    const uvBottomArr = new Float32Array(total * 2);

    const atlasScale = new Vector2(1 / atlas.cols, 1 / atlas.rows);
    atlasScaleRef.current.copy(atlasScale);

    const tileIndexToOffset = (index: number) => {
      const col = index % atlas.cols;
      const row = Math.floor(index / atlas.cols);
      const u = col * atlasScale.x;
      const v = 1 - (row + 1) * atlasScale.y; // flip Y because UV origin is bottom-left
      return [u, v] as const;
    };
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < width; z++) {
          const block = getBlockAt(x, y, z);
          const notEmptyBlock = block && block.type !== 'empty';
          const _isBlockVisible = isBlockVisible(x, y, z);
          if (notEmptyBlock && _isBlockVisible) {
            // Center the world around origin
            matrix.setPosition(x - halfSize + 0.5, y + 0.5, z - halfSize + 0.5);

            const instanceId = meshRef.current.count;
            setBlockInstanceIdAt(x, y, z, instanceId);
            meshRef.current.setMatrixAt(instanceId, matrix);
            // Select textures per face
            const texMap = (block as any).textureMap as string[] | undefined;
            let topName: string;
            let sideName: string;
            let bottomName: string;
            if (texMap && typeof texMap[0] === 'string') {
              topName = texMap[0] as string;
              sideName = (texMap[1] as string) ?? topName;
              bottomName = (texMap[2] as string) ?? topName;
            } else if (block.type === 'grass') {
              topName = 'grass';
              sideName = 'grassSide';
              bottomName = 'dirt';
            } else if (block.type === 'dirt') {
              topName = 'dirt';
              sideName = 'dirt';
              bottomName = 'dirt';
            } else if (block.type === 'stone') {
              topName = 'stone';
              sideName = 'stone';
              bottomName = 'stone';
            } else {
              topName = 'dirt';
              sideName = 'dirt';
              bottomName = 'dirt';
            }

            const topIdx = atlas.tileIndexByName[topName] ?? 0;
            const sideIdx = atlas.tileIndexByName[sideName] ?? 0;
            const bottomIdx = atlas.tileIndexByName[bottomName] ?? 0;

            const [uT, vT] = tileIndexToOffset(topIdx);
            const [uS, vS] = tileIndexToOffset(sideIdx);
            const [uB, vB] = tileIndexToOffset(bottomIdx);

            uvTopArr[instanceId * 2 + 0] = uT;
            uvTopArr[instanceId * 2 + 1] = vT;
            uvSideArr[instanceId * 2 + 0] = uS;
            uvSideArr[instanceId * 2 + 1] = vS;
            uvBottomArr[instanceId * 2 + 0] = uB;
            uvBottomArr[instanceId * 2 + 1] = vB;
            meshRef.current.count++;
          }
        }
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    geom.setAttribute('uvTop', new InstancedBufferAttribute(uvTopArr, 2));
    geom.setAttribute('uvSide', new InstancedBufferAttribute(uvSideArr, 2));
    geom.setAttribute('uvBottom', new InstancedBufferAttribute(uvBottomArr, 2));
    geom.attributes.uvTop.needsUpdate = true;
    geom.attributes.uvSide.needsUpdate = true;
    geom.attributes.uvBottom.needsUpdate = true;

    const shader = (materialRef.current as any)?.userData?.shader;
    if (shader?.uniforms?.atlasScale) {
      shader.uniforms.atlasScale.value.copy(atlasScaleRef.current);
    }
  };

  // Initialize terrain and generate mesh when parameters change
  useLayoutEffect(() => {
    const rng = new RandomNumberGenerator(seed);
    initializeTerrain({ width, height });
    generateResources({ rng });
    generateTerrain({ scale, magnitude, offset, rng });
    generateMesh();
  }, [
    width,
    height,
    scale,
    magnitude,
    offset,
    seed,
    resourceControlsKey,
    atlas,
  ]);

  // Bind atlas texture to material when ready
  useEffect(() => {
    if (!materialRef.current || !atlas) return;
    materialRef.current.map = atlas.texture;
    materialRef.current.needsUpdate = true;
  }, [atlas]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, totalSize]}
      frustumCulled={false}
    >
      <meshLambertMaterial ref={materialRef} />
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
};

const MinecraftSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { Fullscreen, isFullscreen } = useFullscreen({
    sectionRef,
  });
  const { width, height } = useControls('World', {
    width: {
      value: 64,
      min: 16,
      max: 128,
      step: 2,
    },
    height: {
      value: 16,
      min: 4,
      max: 32,
      step: 2,
    },
  });

  return (
    <section
      ref={sectionRef}
      className={cn('relative flex', {
        'fixed inset-0 z-50': isFullscreen,
      })}
    >
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
        scene={{ background: new Color('#80a0e0') }}
      >
        <gridHelper args={[128, 128]} />
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport />
        </GizmoHelper>
        <World width={width} height={height} />
        <directionalLight position={[1, 1, 1]} intensity={0.8} />
        <directionalLight position={[-1, 1, -0.5]} intensity={0.4} />
        <ambientLight intensity={0.2} />
        <OrbitControls target={[0, 0, 0]} />
        <Stats />
        <CameraMonitor />
      </Canvas>
      <Fullscreen />
      <LevaControl />
    </section>
  );
};

export default MinecraftSection;
