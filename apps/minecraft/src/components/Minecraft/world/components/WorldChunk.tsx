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
import { worldEdits } from '@/lib/store';
import {
  desertTreeNoise,
  jungleTreeNoise,
  tundraTreeNoise,
} from '@/lib/constants';
import { clampNoise } from '@/helpers/noise-clamp';
import { BIOME_CONFIGS, BiomeType, getBiome } from '@/lib/biome';

export type WorldChunkHandle = {
  meshRef: React.RefObject<InstancedMesh | null>;
  terrainDataRef: React.RefObject<ChuckType>;
  loadedRef: React.RefObject<boolean>;
  getBlockAt: (x: number, y: number, z: number) => Block | null;
  addBlockAt: (x: number, y: number, z: number, type: BlockType) => void;
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
}: {
  width: number;
  height: number;
  xPosition: number;
  zPosition: number;
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
    const cutoutArr = new Float32Array(totalSize);

    const uvTopAttr = new InstancedBufferAttribute(uvTopArr, 2);
    const uvSideAttr = new InstancedBufferAttribute(uvSideArr, 2);
    const uvBottomAttr = new InstancedBufferAttribute(uvBottomArr, 2);
    const tintTopAttr = new InstancedBufferAttribute(tintTopArr, 3);
    const tintSideAttr = new InstancedBufferAttribute(tintSideArr, 3);
    const tintBottomAttr = new InstancedBufferAttribute(tintBottomArr, 3);
    const cutoutFlagAttr = new InstancedBufferAttribute(cutoutArr, 1);

    return {
      uvTopArr,
      uvSideArr,
      uvBottomArr,
      tintTopArr,
      tintSideArr,
      tintBottomArr,
      cutoutArr,

      uvTopAttr,
      uvSideAttr,
      uvBottomAttr,
      tintTopAttr,
      tintSideAttr,
      tintBottomAttr,
      cutoutFlagAttr,
    };
  }, [totalSize]);

  const {
    getBlockAt,
    setBlockTypeAt,
    isBlockVisible,
    setBlockInstanceIdAt,
    initializeTerrain,
  } = useWorldChunk(width, height, terrainData);

  const {
    registerChunk,
    unregisterChunk,
    getBlockOutsideChunkAt,
    setBlockOutsideChunkAt,
    addBlockAt: addBlockAtOutsideChunk,
    getBlockAt: getBlockAtOutsideChunk,
    worldData,
  } = useWorldManager();

  const { scale, magnitude, offset, seed } = worldData;

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

  const treeControls = useControls(
    'Trees',
    {
      biome: {
        label: 'biome',
        options: {
          Meadow: 'meadow',
          Jungle: 'jungle',
          Tundra: 'tundra',
          Desert: 'desert',
        },
        value: 'meadow',
      },
    },
    { collapsed: false }
  ) as { biome: 'meadow' | 'jungle' | 'tundra' | 'desert' };

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
      cutoutFlagAttr,
    } = shaderAttrib;

    geom.setAttribute('uvTop', uvTopAttr);
    geom.setAttribute('uvSide', uvSideAttr);
    geom.setAttribute('uvBottom', uvBottomAttr);
    geom.setAttribute('tintTop', tintTopAttr);
    geom.setAttribute('tintSide', tintSideAttr);
    geom.setAttribute('tintBottom', tintBottomAttr);
    geom.setAttribute('cutoutFlag', cutoutFlagAttr);
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
      cutoutFlagAttr,
    } = shaderAttrib;

    uvTopAttr.needsUpdate = true;
    uvSideAttr.needsUpdate = true;
    uvBottomAttr.needsUpdate = true;
    tintTopAttr.needsUpdate = true;
    tintSideAttr.needsUpdate = true;
    tintBottomAttr.needsUpdate = true;
    cutoutFlagAttr.needsUpdate = true;
  }, [shaderAttrib, meshRef]);

  const loadUserSave = useCallback(
    (x: number, y: number, z: number) => {
      if (!terrainData.current) return;

      const modifiedBlockType = worldEdits.get(xOffset, zOffset, x, y, z);
      if (modifiedBlockType) {
        setBlockTypeAt(x, y, z, modifiedBlockType);
      }
    },
    [terrainData, xOffset, zOffset, setBlockTypeAt]
  );

  const loadBlocksFromOutsideChunk = useCallback(
    (x: number, y: number, z: number) => {
      const modifiedBlockType = getBlockOutsideChunkAt(
        x + xOffset, // global x
        y,
        z + zOffset // global z
      );
      if (modifiedBlockType) {
        setBlockTypeAt(x, y, z, modifiedBlockType);
        const block = getBlockAtOutsideChunk(x + xOffset, y, z + zOffset);
        if (block && block.type === 'empty') {
          addBlockAtOutsideChunk(
            x + xOffset,
            y,
            z + zOffset,
            modifiedBlockType
          );
        }
      }
    },
    [
      xOffset,
      zOffset,
      setBlockTypeAt,
      getBlockOutsideChunkAt,
      addBlockAtOutsideChunk,
      getBlockAtOutsideChunk,
    ]
  );

  const saveOutsideChunk = useCallback(
    (x: number, y: number, z: number, type: BlockType) => {
      setBlockOutsideChunkAt(x + xOffset, y, z + zOffset, type);
    },
    [xOffset, zOffset, setBlockOutsideChunkAt]
  );

  const generateTreeCanopee = useCallback(
    (
      x: number,
      baseY: number,
      z: number,
      trunkHeight: number,
      noise: number,
      biome: BiomeType
    ) => {
      // Compute canopy radius from noise within configured bounds
      const cfg = BIOME_CONFIGS[biome].tree;
      const minRadius = cfg.radiusMin;
      const maxRadius = cfg.radiusMax;
      const radius = Math.round(clampNoise(noise, minRadius, maxRadius));

      // Center canopy just above the trunk top
      const centerY = baseY - 1 + trunkHeight;

      // Build a hemisphere of leaves (only dy >= 0) to avoid replacing trunk
      const radiusSquared = radius * radius;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = 0; dy <= radius; dy++) {
          for (let dz = -radius; dz <= radius; dz++) {
            const distSquared =
              Math.abs(dx) * Math.abs(dx) +
              Math.abs(dy) * Math.abs(dy) +
              Math.abs(dz) * Math.abs(dz);
            if (distSquared > radiusSquared) continue;

            const px = x + dx;
            const py = centerY + dy;
            const pz = z + dz;

            // Do not overwrite the trunk top block directly
            if (dx === 0 && dy === 0 && dz === 0) continue;
            const block = getBlockAt(px, py, pz);
            if (block && (block.type === 'wood' || block.type === 'leaves')) {
              continue;
            }

            // Bounds check within this chunk
            if (px < 0 || px >= width) {
              saveOutsideChunk(px, py, pz, 'leaves');
              continue;
            }
            if (py < 0 || py >= height) {
              continue;
            }
            if (pz < 0 || pz >= width) {
              saveOutsideChunk(px, py, pz, 'leaves');
              continue;
            }

            setBlockTypeAt(px, py, pz, 'leaves');
          }
        }
      }
    },
    [width, height, getBlockAt, setBlockTypeAt, saveOutsideChunk]
  );

  const generateTree = useCallback(
    (x: number, y: number, z: number, noise: number, biome: BiomeType) => {
      const treeConfig = BIOME_CONFIGS[biome].tree;
      const minH = treeConfig.heightMin;
      const maxH = treeConfig.heightMax;
      const desiredHeight = Math.floor(clampNoise(noise, minH, maxH));
      const trunkHeight = Math.max(1, Math.min(maxH, desiredHeight));
      if (noise > treeConfig.thresholdMin && noise < treeConfig.thresholdMax) {
        for (let i = 1; i < trunkHeight && y + i < height - 1; i++) {
          setBlockTypeAt(x, y + i, z, 'wood');
        }

        if (treeConfig.hasCanopee) {
          generateTreeCanopee(x, y, z, trunkHeight, noise, biome);
        }
      }
    },
    [setBlockTypeAt, generateTreeCanopee, height]
  );

  const generateTerrain = useCallback(
    ({ rng }: { rng: RandomNumberGenerator }) => {
      const simplexNoise = new SimplexNoise(rng);
      for (let x = 0; x < width; x++) {
        for (let z = 0; z < width; z++) {
          const globalX = x + xOffset;
          const globalZ = z + zOffset;
          const value = simplexNoise.noise(globalX / scale, globalZ / scale);
          const scaledValue = value * magnitude + offset;

          let _height = Math.floor(height * scaledValue);

          _height = Math.max(0, Math.min(height - 1, _height));

          const biomeNoiseValue = simplexNoise.noise(
            globalX / scale,
            globalZ / scale
          );
          const biomeNoiseScaledValue = biomeNoiseValue * magnitude + offset;

          const biomeType = getBiome(biomeNoiseScaledValue);
          console.log('biomeType', biomeNoiseScaledValue);

          let topBlockType: BlockType = 'grass';

          switch (biomeType) {
            case 'jungle':
              topBlockType = 'jungle_grass';
              break;
            case 'tundra':
              topBlockType = 'snow';
              break;
            case 'desert':
              topBlockType = 'sand';
              break;
            case 'meadow':
              topBlockType = 'grass';
              break;
          }

          const treeConfig = BIOME_CONFIGS[biomeType].tree;
          const treeNoiseValue = simplexNoise.noise(
            globalX / treeConfig.scale,
            globalZ / treeConfig.scale
          );

          const treeScaledNoiseValue = clampNoise(
            treeNoiseValue * treeConfig.magnitude + treeConfig.offset
          );
          for (let y = 0; y < height; y++) {
            loadBlocksFromOutsideChunk(x, y, z);

            const block = getBlockAt(x, y, z);
            const isResource = block?.isResource;
            if (y === _height) {
              setBlockTypeAt(x, y, z, topBlockType);
              generateTree(x, y, z, treeScaledNoiseValue, biomeType);
            } else if (y < _height && !isResource) {
              setBlockTypeAt(x, y, z, 'dirt');
            } else if (y > _height && isResource) {
              setBlockTypeAt(x, y, z, 'empty');
            }

            loadUserSave(x, y, z);
          }
        }
      }
    },
    [
      width,
      height,
      scale,
      magnitude,
      offset,
      xOffset,
      zOffset,
      getBlockAt,
      setBlockTypeAt,
      generateTree,
      loadUserSave,
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

    meshRef.current.position.set(xOffset, 0, zOffset);

    meshRef.current.count = 0;
    const matrix = new Matrix4();

    const {
      uvTopArr,
      uvSideArr,
      uvBottomArr,
      tintTopArr,
      tintSideArr,
      tintBottomArr,
      cutoutArr,
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
            cutoutArr[instanceId] = block?.type === 'leaves' ? 1 : 0;
            meshRef.current.count++;
          }
        }
      }
    }

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
      if (!block || block.type === 'empty' || hasInstanceId(block)) return;
      const mesh = meshRef.current;
      const instanceId = mesh.count++;

      const {
        uvTopArr,
        uvSideArr,
        uvBottomArr,
        tintTopArr,
        tintSideArr,
        tintBottomArr,
        cutoutArr,
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
      cutoutArr[instanceId] = block?.type === 'leaves' ? 1 : 0;
    },
    [meshRef, atlas, shaderAttrib, getBlockAt, setBlockInstanceIdAt]
  );

  const hideBlockAt = useCallback(
    (x: number, y: number, z: number) => {
      const mesh = meshRef.current;
      if (!mesh) return;

      const block = getBlockAt(x, y, z);

      if (!hasInstanceId(block)) return;

      const fromInstanceId = mesh.count - 1;
      const toInstanceId = block.instanceId;

      const lastMatrix = new Matrix4();
      mesh.getMatrixAt(fromInstanceId, lastMatrix);

      const v = new Vector3();
      v.applyMatrix4(lastMatrix);
      setBlockInstanceIdAt(v.x, v.y, v.z, toInstanceId);

      mesh.setMatrixAt(toInstanceId, lastMatrix);

      setBlockInstanceIdAt(x, y, z, null);

      const {
        uvTopArr,
        uvSideArr,
        uvBottomArr,
        tintTopArr,
        tintSideArr,
        tintBottomArr,
        cutoutArr,
      } = shaderAttrib;

      copyTextureTiles({
        uvTopArr,
        uvSideArr,
        uvBottomArr,
        tintTopArr,
        tintSideArr,
        tintBottomArr,
        cutoutArr,
        fromInstanceId,
        toInstanceId,
      });

      mesh.count--;
    },
    [meshRef, shaderAttrib, getBlockAt, setBlockInstanceIdAt]
  );

  const addBlockAt = useCallback(
    (x: number, y: number, z: number, type: BlockType) => {
      const mesh = meshRef.current;
      if (!mesh) return;

      const block = getBlockAt(x, y, z);

      if (block?.type !== 'empty') return;
      if (hasInstanceId(block)) return;

      setBlockTypeAt(x, y, z, type);

      revealBlockAt(x, y, z);

      for (const { dx, dy, dz } of adjacentPositions) {
        const adjX = x + dx;
        const adjY = y + dy;
        const adjZ = z + dz;
        const isVisible = isBlockVisible(adjX, adjY, adjZ);
        if (!isVisible) {
          hideBlockAt(adjX, adjY, adjZ);
        }
      }

      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();

      setShaderAttributesNeedsUpdate();
    },
    [
      meshRef,
      isBlockVisible,
      getBlockAt,
      setBlockTypeAt,
      hideBlockAt,
      revealBlockAt,
      setShaderAttributesNeedsUpdate,
    ]
  );

  const removeBlockAt = useCallback(
    (x: number, y: number, z: number) => {
      const mesh = meshRef.current;
      if (!mesh) return;

      const block = getBlockAt(x, y, z);

      if (block?.type === 'empty') return;
      if (!hasInstanceId(block)) return;

      hideBlockAt(x, y, z);
      setBlockTypeAt(x, y, z, 'empty');

      for (const { dx, dy, dz } of adjacentPositions) {
        revealBlockAt(x + dx, y + dy, z + dz);
      }

      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();

      setShaderAttributesNeedsUpdate();
    },
    [
      meshRef,
      getBlockAt,
      setBlockTypeAt,
      hideBlockAt,
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
      addBlockAt,
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
      addBlockAt,
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
      <meshLambertMaterial ref={materialRef} alphaTest={0.5} />
    </instancedMesh>
  );
};

WorldChunk.displayName = 'WorldChunk';

export default WorldChunk;
