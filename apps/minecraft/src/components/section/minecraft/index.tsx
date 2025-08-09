'use client';

import {
  GizmoHelper,
  GizmoViewport,
  OrbitControls,
  Stats,
  useHelper,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { folder, useControls } from 'leva';
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Vector2,
  WebGLProgramParametersWithUniforms,
  DirectionalLightHelper,
  CameraHelper,
} from 'three';
import type { DirectionalLight, OrthographicCamera } from 'three';
import { createAtlasOnBeforeCompile, loadTextureTiles } from '@/lib/texture';
import { useAtlas } from '@/lib/texture';
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
  const { atlas, atlasScaleRef, atlasPaddingRef } = useAtlas(
    { cols: 16, rows: 16 },
    1
  );
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
    const inject = createAtlasOnBeforeCompile({
      atlasScaleRef,
      atlasPaddingRef,
    });
    mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      mat.userData.shader = shader;
      inject(shader);
    };
    mat.needsUpdate = true;
  }, [atlasScaleRef, atlasPaddingRef]);

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
    if (!meshRef.current || !atlas || !materialRef.current) {
      return;
    }

    meshRef.current.count = 0;
    const matrix = new Matrix4();

    const geom = meshRef.current.geometry;
    const total = totalSize;
    const uvTopArr = new Float32Array(total * 2);
    const uvSideArr = new Float32Array(total * 2);
    const uvBottomArr = new Float32Array(total * 2);
    const tintTopArr = new Float32Array(total * 3);
    const tintSideArr = new Float32Array(total * 3);
    const tintBottomArr = new Float32Array(total * 3);

    const atlasScale = new Vector2(1 / atlas.cols, 1 / atlas.rows);
    atlasScaleRef.current.copy(atlasScale);

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
            loadTextureTiles({
              block,
              uvTopArr,
              uvSideArr,
              uvBottomArr,
              tintTopArr,
              tintSideArr,
              tintBottomArr,
              atlas,
            });
            meshRef.current.count++;
          }
        }
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;

    const uvTopAttr = new InstancedBufferAttribute(uvTopArr, 2);
    const uvSideAttr = new InstancedBufferAttribute(uvSideArr, 2);
    const uvBottomAttr = new InstancedBufferAttribute(uvBottomArr, 2);
    const tintTopAttr = new InstancedBufferAttribute(tintTopArr, 3);
    const tintSideAttr = new InstancedBufferAttribute(tintSideArr, 3);
    const tintBottomAttr = new InstancedBufferAttribute(tintBottomArr, 3);

    geom.setAttribute('uvTop', uvTopAttr);
    geom.setAttribute('uvSide', uvSideAttr);
    geom.setAttribute('uvBottom', uvBottomAttr);
    geom.setAttribute('tintTop', tintTopAttr);
    geom.setAttribute('tintSide', tintSideAttr);
    geom.setAttribute('tintBottom', tintBottomAttr);

    uvTopAttr.needsUpdate = true;
    uvSideAttr.needsUpdate = true;
    uvBottomAttr.needsUpdate = true;
    tintTopAttr.needsUpdate = true;
    tintSideAttr.needsUpdate = true;
    tintBottomAttr.needsUpdate = true;

    const shader = materialRef.current?.userData?.shader;
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
      castShadow
      receiveShadow
    >
      <meshLambertMaterial ref={materialRef} flatShading />
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

  const Lights = () => {
    const dirLightRef = React.useRef<DirectionalLight>(null!);
    const orthoCamRef = React.useRef<OrthographicCamera>(null!);

    // Bigger yellow helper for the light itself
    useHelper(dirLightRef, DirectionalLightHelper, 20, 0xffaa00);

    // Draw the light’s shadow camera frustum

    useHelper(orthoCamRef, CameraHelper);

    // Fit shadow frustum to world dimensions for stable, sharper shadows
    const SIZE = 50;

    const { intensity, x, y, z } = useControls('Lights', {
      intensity: {
        value: 1.6,
        min: 0,
        max: 10,
        step: 0.1,
      },
      position: folder({
        x: {
          value: 50,
          min: -100,
          max: 100,
          step: 0.1,
        },
        y: {
          value: 50,
          min: -100,
          max: 100,
          step: 0.1,
        },
        z: {
          value: 50,
          min: -100,
          max: 100,
          step: 0.1,
        },
      }),
    });


    return (
      <group>
        <directionalLight
          ref={dirLightRef}
          position={[x, y, z]}
          intensity={intensity}
          castShadow
          shadow-mapSize={[512, 512]}
        >
          <orthographicCamera
            ref={orthoCamRef}
            attach="shadow-camera"
            top={SIZE}
            bottom={-SIZE}
            left={-SIZE}
            right={SIZE}
            near={0.1}
            far={100}
          />
        </directionalLight>
        <ambientLight intensity={0.2} />
      </group>
    );
  };

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
        shadows
        scene={{
          background: new Color('#80a0e0'),
          castShadow: true,
          receiveShadow: true,
        }}
      >
        <gridHelper args={[128, 128]} />
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport />
        </GizmoHelper>
        <World width={width} height={height} />
        <Lights />
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
