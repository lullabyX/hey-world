'use client';

import { folder, useControls } from 'leva';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import {
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Vector2,
  Vector3,
  WebGLProgramParametersWithUniforms,
} from 'three';
import {
  copyTextureTiles,
  createAtlasOnBeforeCompile,
  loadTextureTiles,
} from '@/lib/texture';
import { useAtlas } from '@/lib/texture';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';
import {
  Block,
  BlockType,
  getResourceEntries,
  hasInstanceId,
} from '@/lib/block';
import { RandomNumberGenerator } from '@/helpers/random-number-generator';
import {
  adjacentPositions,
  ChuckType,
  useWorldChunk,
} from '../hooks/useWorldChunk';
import useWorldManager from '../hooks/useWorldManger';

export type WorldChunkHandle = {
  meshRef: React.RefObject<InstancedMesh | null>;
  terrainDataRef: React.RefObject<ChuckType>;
  loadedRef: React.RefObject<boolean>;
  getBlockAt: (x: number, y: number, z: number) => Block | null;
  removeBlockAt: (x: number, y: number, z: number) => void;
  setBlockTypeAt: (x: number, y: number, z: number, type: BlockType) => void;
  setBlockInstanceIdAt: (x: number, y: number, z: number, id: number) => void;
  isBlockVisible: (x: number, y: number, z: number) => boolean;
  initializeTerrain: () => void;
  generateMesh: () => void;
};

const WorldChunk = ({
  width,
  height,
  xPosition,
  zPosition,
  scale,
  magnitude,
  offset,
  seed,
}: {
  width: number;
  height: number;
  xPosition: number;
  zPosition: number;
  scale: number;
  magnitude: number;
  offset: number;
  seed: number;
}) => {
  const totalSize = width * width * height;
  const xOffset = xPosition * width;
  const zOffset = zPosition * width;

  const terrainData = useRef<ChuckType>([]);

  const meshRef = useRef<InstancedMesh>(null);
  const materialRef = useRef<MeshLambertMaterial>(null);
  const { atlas, atlasScaleRef, atlasPaddingRef } = useAtlas(
    { cols: 16, rows: 16 },
    1
  );

  const loadedRef = useRef(false);

  const shaderAttrib = useMemo(() => {
    const uvTopArr = new Float32Array(totalSize * 2);
    const uvSideArr = new Float32Array(totalSize * 2);
    const uvBottomArr = new Float32Array(totalSize * 2);
    const tintTopArr = new Float32Array(totalSize * 3);
    const tintSideArr = new Float32Array(totalSize * 3);
    const tintBottomArr = new Float32Array(totalSize * 3);

    const uvTopAttr = new InstancedBufferAttribute(uvTopArr, 2);
    const uvSideAttr = new InstancedBufferAttribute(uvSideArr, 2);
    const uvBottomAttr = new InstancedBufferAttribute(uvBottomArr, 2);
    const tintTopAttr = new InstancedBufferAttribute(tintTopArr, 3);
    const tintSideAttr = new InstancedBufferAttribute(tintSideArr, 3);
    const tintBottomAttr = new InstancedBufferAttribute(tintBottomArr, 3);

    return {
      uvTopArr,
      uvSideArr,
      uvBottomArr,
      tintTopArr,
      tintSideArr,
      tintBottomArr,

      uvTopAttr,
      uvSideAttr,
      uvBottomAttr,
      tintTopAttr,
      tintSideAttr,
      tintBottomAttr,
    };
  }, [totalSize]);

  const {
    getBlockAt,
    setBlockTypeAt,
    isBlockVisible,
    setBlockInstanceIdAt,
    initializeTerrain,
  } = useWorldChunk(width, height, terrainData);

  const { registerChunk, unregisterChunk } = useWorldManager();

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

  const setGeometryAttributes = useCallback(() => {
    if (!meshRef.current) return;

    const geom = meshRef.current.geometry;
    const {
      uvTopAttr,
      uvSideAttr,
      uvBottomAttr,
      tintTopAttr,
      tintSideAttr,
      tintBottomAttr,
    } = shaderAttrib;

    geom.setAttribute('uvTop', uvTopAttr);
    geom.setAttribute('uvSide', uvSideAttr);
    geom.setAttribute('uvBottom', uvBottomAttr);
    geom.setAttribute('tintTop', tintTopAttr);
    geom.setAttribute('tintSide', tintSideAttr);
    geom.setAttribute('tintBottom', tintBottomAttr);
  }, [shaderAttrib, meshRef]);

  const setShaderAttributesNeedsUpdate = useCallback(() => {
    if (!meshRef.current) return;

    const {
      uvTopAttr,
      uvSideAttr,
      uvBottomAttr,
      tintTopAttr,
      tintSideAttr,
      tintBottomAttr,
    } = shaderAttrib;

    uvTopAttr.needsUpdate = true;
    uvSideAttr.needsUpdate = true;
    uvBottomAttr.needsUpdate = true;
    tintTopAttr.needsUpdate = true;
    tintSideAttr.needsUpdate = true;
    tintBottomAttr.needsUpdate = true;
  }, [shaderAttrib, meshRef]);

  const generateTerrain = useCallback(
    ({ rng }: { rng: RandomNumberGenerator }) => {
      const simplexNoise = new SimplexNoise(rng);
      for (let x = 0; x < width; x++) {
        for (let z = 0; z < width; z++) {
          const value = simplexNoise.noise(
            (x + xOffset) / scale,
            (z + zOffset) / scale
          );
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
    },
    [
      width,
      height,
      getBlockAt,
      setBlockTypeAt,
      scale,
      magnitude,
      offset,
      xOffset,
      zOffset,
    ]
  );

  const generateResources = useCallback(
    ({ rng }: { rng: RandomNumberGenerator }) => {
      const resources = getResourceEntries();
      resources.forEach(([resourceType, def]) => {
        const scale = {
          x:
            resourceControls[`${resourceType}::scaleX`] ?? def.resource.scale.x,
          y:
            resourceControls[`${resourceType}::scaleY`] ?? def.resource.scale.y,
          z:
            resourceControls[`${resourceType}::scaleZ`] ?? def.resource.scale.z,
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
                (x + xOffset) / scale.x,
                y / scale.y,
                (z + zOffset) / scale.z
              );
              if (value > threshold) {
                setBlockTypeAt(x, y, z, resourceType);
              }
            }
          }
        }
      });
    },
    [
      width,
      height,
      getBlockAt,
      setBlockTypeAt,
      resourceControlsKey,
      xOffset,
      zOffset,
    ]
  );

  const generateMesh = useCallback(() => {
    if (!meshRef.current || !atlas || !materialRef.current) {
      return;
    }

    meshRef.current.count = 0;
    const matrix = new Matrix4();

    const {
      uvTopArr,
      uvSideArr,
      uvBottomArr,
      tintTopArr,
      tintSideArr,
      tintBottomArr,
    } = shaderAttrib;

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
            matrix.setPosition(x, y, z);

            const instanceId = meshRef.current.count;
            setBlockInstanceIdAt(x, y, z, instanceId);
            // Ensure the local block reference carries the instanceId for attribute writes
            if (block) {
              (block as Block).instanceId = instanceId;
            }
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

    meshRef.current.position.set(xOffset, 0, zOffset);
    meshRef.current.computeBoundingSphere();

    meshRef.current.instanceMatrix.needsUpdate = true;

    setGeometryAttributes();

    setShaderAttributesNeedsUpdate();

    const shader = materialRef.current?.userData?.shader;
    if (shader?.uniforms?.atlasScale) {
      shader.uniforms.atlasScale.value.copy(atlasScaleRef.current);
    }
  }, [
    width,
    height,
    atlas,
    atlasScaleRef,
    materialRef,
    xOffset,
    zOffset,
    shaderAttrib,
    getBlockAt,
    setBlockInstanceIdAt,
    isBlockVisible,
    setGeometryAttributes,
    setShaderAttributesNeedsUpdate,
  ]);

  const revealBlockAt = useCallback(
    (x: number, y: number, z: number) => {
      if (!meshRef.current) return;
      if (!atlas) return;

      const block = getBlockAt(x, y, z);
      if (!block || block?.type === 'empty' || block?.instanceId) return;

      const mesh = meshRef.current;
      const instanceId = mesh.count++;

      const {
        uvTopArr,
        uvSideArr,
        uvBottomArr,
        tintTopArr,
        tintSideArr,
        tintBottomArr,
      } = shaderAttrib;

      const matrix = new Matrix4();
      setBlockInstanceIdAt(x, y, z, instanceId);
      matrix.setPosition(x, y, z);
      mesh.setMatrixAt(instanceId, matrix);

      (block as Block).instanceId = instanceId;
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
    },
    [meshRef, atlas, shaderAttrib, getBlockAt, setBlockInstanceIdAt]
  );

  const removeBlockAt = useCallback(
    (x: number, y: number, z: number) => {
      const mesh = meshRef.current;
      if (!mesh) return;

      const block = getBlockAt(x, y, z);

      if (block?.type === 'empty') return;
      if (!hasInstanceId(block)) return;

      const fromInstanceId = mesh.count - 1;
      const toInstanceId = block.instanceId;

      setBlockTypeAt(x, y, z, 'empty');

      const lastMatrix = new Matrix4();
      mesh.getMatrixAt(fromInstanceId, lastMatrix);

      const v = new Vector3();
      v.applyMatrix4(lastMatrix);
      setBlockInstanceIdAt(v.x, v.y, v.z, toInstanceId);

      mesh.setMatrixAt(toInstanceId, lastMatrix);

      const {
        uvTopArr,
        uvSideArr,
        uvBottomArr,
        tintTopArr,
        tintSideArr,
        tintBottomArr,
      } = shaderAttrib;

      copyTextureTiles({
        uvTopArr,
        uvSideArr,
        uvBottomArr,
        tintTopArr,
        tintSideArr,
        tintBottomArr,
        fromInstanceId,
        toInstanceId,
      });

      mesh.count--;

      for (const { dx, dy, dz } of adjacentPositions) {
        revealBlockAt(x + dx, y + dy, z + dz);
      }

      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();

      setShaderAttributesNeedsUpdate();
    },
    [
      meshRef,
      shaderAttrib,
      getBlockAt,
      setBlockTypeAt,
      setBlockInstanceIdAt,
      revealBlockAt,
      setShaderAttributesNeedsUpdate,
    ]
  );

  const handle = useMemo<WorldChunkHandle>(
    () => ({
      meshRef,
      terrainDataRef: terrainData,
      loadedRef,
      getBlockAt,
      removeBlockAt,
      setBlockTypeAt,
      setBlockInstanceIdAt,
      isBlockVisible,
      initializeTerrain,
      generateMesh,
    }),
    [
      meshRef,
      getBlockAt,
      removeBlockAt,
      setBlockTypeAt,
      setBlockInstanceIdAt,
      isBlockVisible,
      initializeTerrain,
      generateMesh,
    ]
  );

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

  // Initialize terrain and generate mesh when parameters change
  useLayoutEffect(() => {
    const rng = new RandomNumberGenerator(seed);
    requestIdleCallback(
      () => {
        initializeTerrain();
        generateResources({ rng });
        generateTerrain({ rng });
        generateMesh();
        loadedRef.current = true;
      },
      { timeout: 1000 }
    );
  }, [
    initializeTerrain,
    generateResources,
    generateTerrain,
    generateMesh,
    seed,
  ]);

  // Bind atlas texture to material when ready
  useEffect(() => {
    if (!materialRef.current || !atlas) return;
    materialRef.current.map = atlas.texture;
    materialRef.current.needsUpdate = true;
  }, [atlas]);

  useEffect(() => {
    registerChunk(xPosition, zPosition, handle);
    return () => unregisterChunk(xPosition, zPosition);
  }, [registerChunk, unregisterChunk, handle, xPosition, zPosition]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, totalSize]}
      frustumCulled={false}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshLambertMaterial ref={materialRef} />
    </instancedMesh>
  );
};

WorldChunk.displayName = 'WorldChunk';

export default WorldChunk;
