'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RandomNumberGenerator } from '@/helpers/random-number-generator';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';
import { getFBMNoise2D } from '@/helpers/octave-noise';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Button,
} from '@hey-world/ui';

type RenderMode =
  | 'base'
  | 'ridged'
  | 'erosion'
  | 'continental'
  | 'finalHeight'
  | 'biome';

const WIDTH = 1024;
const HEIGHT = 512;

function useLocalStorageNumber(key: string, initial: number) {
  const [value, setValue] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? Number(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

function useLocalStorageString<T extends string>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return (raw as T) ?? initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

function useLocalStorageJson<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

type SplinePoint = { t: number; v: number };

function evalLinearSpline(x: number, points: SplinePoint[]): number {
  if (points.length === 0) return x;
  const sorted = [...points].sort((a, b) => a.t - b.t);
  if (x <= sorted[0]!.t) return sorted[0]!.v;
  if (x >= sorted[sorted.length - 1]!.t) return sorted[sorted.length - 1]!.v;
  for (let i = 0; i < sorted.length - 1; i++) {
    const p0 = sorted[i]!;
    const p1 = sorted[i + 1]!;
    if (x >= p0.t && x <= p1.t) {
      const t = (x - p0.t) / Math.max(1e-6, p1.t - p0.t);
      return p0.v + (p1.v - p0.v) * t;
    }
  }
  return x;
}

export default function NoiseViewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Controls (persisted)
  const [seed, setSeed] = useLocalStorageNumber('noise.seed', 1337);
  const [scale, setScale] = useLocalStorageNumber('noise.scale', 120);
  const [magnitude, setMagnitude] = useLocalStorageNumber(
    'noise.magnitude',
    0.5
  );
  const [offset, setOffset] = useLocalStorageNumber('noise.offset', 0.2);
  // Continentalness-specific params
  const [contScale, setContScale] = useLocalStorageNumber(
    'noise.contScale',
    120
  );
  const [contMagnitude, setContMagnitude] = useLocalStorageNumber(
    'noise.contMagnitude',
    1
  );
  const [contOffset, setContOffset] = useLocalStorageNumber(
    'noise.contOffset',
    0
  );
  const [contSpline, setContSpline] = useLocalStorageJson<SplinePoint[]>(
    'noise.contSpline',
    [
      { t: -1, v: -1 },
      { t: 0, v: 0 },
      { t: 1, v: 1 },
    ]
  );
  const [pvScale, setPvScale] = useLocalStorageNumber('noise.pvScale', 140);
  const [pvOctaves, setPvOctaves] = useLocalStorageNumber('noise.pvOctaves', 3);
  const [erosionScale, setErosionScale] = useLocalStorageNumber(
    'noise.erosionScale',
    220
  );
  const [erosionOctaves, setErosionOctaves] = useLocalStorageNumber(
    'noise.erosionOctaves',
    2
  );
  const [erosionStrength, setErosionStrength] = useLocalStorageNumber(
    'noise.erosionStrength',
    0.5
  );
  const [warpStrength, setWarpStrength] = useLocalStorageNumber(
    'noise.warpStrength',
    40
  );
  const [renderMode, setRenderMode] = useLocalStorageString<RenderMode>(
    'noise.renderMode',
    'finalHeight'
  );
  const [zoom, setZoom] = useLocalStorageNumber('noise.zoom', 1);
  // Biome noises
  const [tempScale, setTempScale] = useLocalStorageNumber(
    'noise.tempScale',
    300
  );
  const [humidScale, setHumidScale] = useLocalStorageNumber(
    'noise.humidScale',
    300
  );
  const [tempOctaves, setTempOctaves] = useLocalStorageNumber(
    'noise.tempOctaves',
    3
  );
  const [humidOctaves, setHumidOctaves] = useLocalStorageNumber(
    'noise.humidOctaves',
    3
  );

  const noises = useMemo(() => {
    const baseRng = new RandomNumberGenerator(seed + 101);
    const ridgedRng = new RandomNumberGenerator(seed + 202);
    const erosionRng = new RandomNumberGenerator(seed + 303);
    const microRng = new RandomNumberGenerator(seed + 404);
    const warpRng = new RandomNumberGenerator(seed + 505);
    const tempRng = new RandomNumberGenerator(seed + 808);
    const humidRng = new RandomNumberGenerator(seed + 909);

    const baseNoise = new SimplexNoise(baseRng);
    const ridgedNoise = new SimplexNoise(ridgedRng);
    const erosionNoise = new SimplexNoise(erosionRng);
    const microNoise = new SimplexNoise(microRng);
    const warpNoise = new SimplexNoise(warpRng);
    const tempNoise = new SimplexNoise(tempRng);
    const humidNoise = new SimplexNoise(humidRng);

    return {
      baseNoise,
      ridgedNoise,
      erosionNoise,
      microNoise,
      warpNoise,
      tempNoise,
      humidNoise,
    };
  }, [seed]);

  // Drag to pan across the noise field
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dragging = false;
    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
      canvas.style.cursor = 'grabbing';
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
      canvas.style.cursor = 'grab';
    };
    const onPointerLeave = () => {
      dragging = false;
      canvas.style.cursor = 'grab';
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      setPan((prev) => ({
        x: prev.x - e.movementX / zoom,
        y: prev.y - e.movementY / zoom,
      }));
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;
      const oldZoom = zoom;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.max(0.25, Math.min(8, oldZoom * factor));
      if (newZoom === oldZoom) return;
      // Zoom around cursor: adjust pan to keep cursor world point stable
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const dx = cx - centerX;
      const dy = cy - centerY;
      setPan((prev) => ({
        x: prev.x + dx * (1 / oldZoom - 1 / newZoom),
        y: prev.y + dy * (1 / oldZoom - 1 / newZoom),
      }));
      setZoom(newZoom);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.style.cursor = 'grab';

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('wheel', onWheel as EventListener);
    };
  }, [zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(WIDTH, HEIGHT);
    const data = imageData.data;

    const warpScale = scale * 2.5;
    const warpStrengthClamped = Math.max(
      0,
      Math.min(warpStrength, scale * 0.6)
    );

    const sampleContinental = (gx: number, gz: number) => {
      // Match world generator: single-stage warp
      const cWarpScale = contScale * 2.5;
      const cWarpStrengthClamped = Math.max(
        0,
        Math.min(warpStrength, contScale * 0.6)
      );
      const wx =
        noises.warpNoise.noise(gx / cWarpScale, gz / cWarpScale) *
        cWarpStrengthClamped;
      const wz =
        noises.warpNoise.noise(
          (gx + 1000) / cWarpScale,
          (gz - 1000) / cWarpScale
        ) * cWarpStrengthClamped;
      return getFBMNoise2D({
        x: (gx + wx) / contScale,
        y: (gz + wz) / contScale,
        simplexNoise: noises.baseNoise,
        octaves: 2,
      });
    };

    const ridgedFBM2D = (x: number, y: number) => {
      let sum = 0;
      let frequency = 1;
      let amplitude = 1;
      let maxAmp = 0;
      for (let i = 0; i < pvOctaves; i++) {
        const n = noises.ridgedNoise.noise(x * frequency, y * frequency);
        const ridged = 1 - Math.abs(n);
        sum += ridged * amplitude;
        maxAmp += amplitude;
        frequency *= 2;
        amplitude *= 0.5;
      }
      return maxAmp === 0 ? 0 : sum / maxAmp;
    };

    const smoothstep = (edge0: number, edge1: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    // ---- Helpers for Beta-like biome smoothing and 3D density ----
    const WORLD_HEIGHT = 256;
    const SEA_LEVEL = 64;
    const BIOME_SAMPLE_SPACING = 24;

    // Precompute 5x5 parabolic kernel weights
    const kernel: number[] = [];
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        const w = 10 / Math.sqrt(dx * dx + dz * dz + 0.2);
        kernel.push(w);
      }
    }

    const sampleTempHumid = (x: number, z: number) => {
      const t = getFBMNoise2D({
        x: x / tempScale,
        y: z / tempScale,
        simplexNoise: noises.tempNoise,
        octaves: tempOctaves,
        amplitude: 0.5,
        offset: 0.5,
      });
      const hRaw = getFBMNoise2D({
        x: x / humidScale,
        y: z / humidScale,
        simplexNoise: noises.humidNoise,
        octaves: humidOctaves,
        amplitude: 0.5,
        offset: 0.5,
      });
      const tClamped = Math.max(0, Math.min(1, t));
      const h = Math.max(0, Math.min(1, hRaw * tClamped));
      return { t: tClamped, h };
    };

    // Approximate Beta-era biome anchors from climate
    const biomeAnchorsFromClimate = (t: number, h: number) => {
      if (t < 0.3) {
        if (h < 0.35) return { base: 0.1, var: 0.1 }; // Tundra
        if (h < 0.65) return { base: 0.2, var: 0.2 }; // Taiga
        return { base: 0.2, var: 0.25 }; // Snowy forest
      } else if (t > 0.8) {
        if (h < 0.25) return { base: 0.125, var: 0.05 }; // Desert
        if (h < 0.55) return { base: 0.125, var: 0.15 }; // Savanna
        return { base: 0.2, var: 0.3 }; // Rainforest-like
      } else {
        if (h < 0.3) return { base: 0.125, var: 0.05 }; // Plains
        if (h < 0.6) return { base: 0.1, var: 0.2 }; // Forest
        return { base: -0.2, var: 0.1 }; // Swamp
      }
    };

    const getSmoothedBiomeAnchors = (x: number, z: number) => {
      let sumBase = 0;
      let sumVar = 0;
      let wSum = 0;
      let k = 0;
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++, k++) {
          const w = kernel[k]!;
          const { t, h } = sampleTempHumid(
            x + dx * BIOME_SAMPLE_SPACING,
            z + dz * BIOME_SAMPLE_SPACING
          );
          const b = biomeAnchorsFromClimate(t, h);
          sumBase += b.base * w;
          sumVar += b.var * w;
          wSum += w;
        }
      }
      if (wSum === 0) return { base: 0.1, variation: 0.1 };
      return { base: sumBase / wSum, variation: sumVar / wSum };
    };

    const noise3D = (sn: any, x: number, y: number, z: number) => {
      if (typeof sn.noise3d === 'function') return sn.noise3d(x, y, z);
      if (typeof sn.noise3D === 'function') return sn.noise3D(x, y, z);
      const a = sn.noise(x, y);
      const b = sn.noise(y, z);
      const c = sn.noise(z, x);
      return (a + b + c) / 3;
    };

    const getFBMNoise3D = (args: {
      x: number;
      y: number;
      z: number;
      simplexNoise: any;
      octaves?: number;
      amplitude?: number;
      offset?: number;
      lacunarity?: number;
      gain?: number;
    }) => {
      const {
        x,
        y,
        z,
        simplexNoise,
        octaves = 4,
        amplitude = 1,
        offset = 0,
        lacunarity = 2,
        gain = 0.5,
      } = args;
      let sum = 0;
      let freq = 1;
      let amp = 1;
      let maxAmp = 0;
      for (let i = 0; i < octaves; i++) {
        sum += noise3D(simplexNoise, x * freq, y * freq, z * freq) * amp;
        maxAmp += amp;
        freq *= lacunarity;
        amp *= gain;
      }
      if (maxAmp === 0) return offset;
      return (sum / maxAmp) * amplitude + offset;
    };

    // Fast path for finalHeight: compute a coarse height grid with 3D density
    // and bilinearly interpolate to pixels. Avoid per-pixel vertical scans.
    if (renderMode === 'finalHeight') {
      const STEP = 8; // horizontal pixel step for coarse grid
      const Y_STEP = 4; // vertical step for density search
      const gridW = Math.ceil(WIDTH / STEP) + 1;
      const gridH = Math.ceil(HEIGHT / STEP) + 1;
      const heights = new Float32Array(gridW * gridH);

      const idxGrid = (gxIdx: number, gzIdx: number) => gzIdx * gridW + gxIdx;

      for (let gzIdx = 0; gzIdx < gridH; gzIdx++) {
        const py = Math.min(HEIGHT - 1, gzIdx * STEP);
        const gzWorld = pan.y + (py - HEIGHT / 2) / zoom + HEIGHT / 2;
        for (let gxIdx = 0; gxIdx < gridW; gxIdx++) {
          const px = Math.min(WIDTH - 1, gxIdx * STEP);
          const gxWorld = pan.x + (px - WIDTH / 2) / zoom + WIDTH / 2;

          const anchors = getSmoothedBiomeAnchors(gxWorld, gzWorld);
          const depth = getFBMNoise2D({
            x: gxWorld / 200,
            y: gzWorld / 200,
            simplexNoise: noises.baseNoise,
            octaves: 2,
            amplitude: 1,
          });
          const scale2 = getFBMNoise2D({
            x: gxWorld / 200,
            y: gzWorld / 200,
            simplexNoise: noises.erosionNoise,
            octaves: 2,
            amplitude: 1,
          });

          const targetBaseY =
            SEA_LEVEL + anchors.base * 24 + depth * 6 + offset * 16;
          const varY = 8 + anchors.variation * 24 + Math.max(0, scale2) * 10;

          const fx = gxWorld / 684.4;
          const fz = gzWorld / 684.4;

          const densityAt = (y: number) => {
            const fy = y / 684.4;
            const minN = getFBMNoise3D({
              x: fx,
              y: fy,
              z: fz,
              simplexNoise: noises.baseNoise as any,
              octaves: 3,
              amplitude: 1,
            });
            const maxN = getFBMNoise3D({
              x: fx + 17.0,
              y: fy - 31.0,
              z: fz + 7.0,
              simplexNoise: noises.microNoise as any,
              octaves: 3,
              amplitude: 1,
            });
            const selN = getFBMNoise3D({
              x: fx - 11.0,
              y: fy + 23.0,
              z: fz - 5.0,
              simplexNoise: noises.ridgedNoise as any,
              octaves: 3,
              amplitude: 1,
            });
            const sel = Math.max(0, Math.min(1, selN * 0.5 + 0.5));
            const densityBlend = minN * (1 - sel) + maxN * sel;
            const baseShape = (y - targetBaseY) / Math.max(1, varY);
            return densityBlend - baseShape;
          };

          let surface = 0;
          // Coarse vertical search with refinement
          for (let y = WORLD_HEIGHT - 1; y >= 0; y -= Y_STEP) {
            const d = densityAt(y);
            if (d > 0) {
              // refine upwards within band [y, y+Y_STEP)
              let yy = Math.min(WORLD_HEIGHT - 1, y + (Y_STEP - 1));
              for (; yy > y; yy--) {
                if (densityAt(yy) > 0) {
                  surface = yy;
                  break;
                }
              }
              break;
            }
          }

          heights[idxGrid(gxIdx, gzIdx)] = surface;
        }
      }

      // Bilinear interpolation from coarse grid to pixels
      for (let iy = 0; iy < HEIGHT; iy++) {
        const gy = iy / STEP;
        const gz0 = Math.floor(gy);
        const gz1 = Math.min(gridH - 1, gz0 + 1);
        const tz = Math.min(1, Math.max(0, gy - gz0));
        for (let ix = 0; ix < WIDTH; ix++) {
          const idx = (iy * WIDTH + ix) * 4;
          const gx = ix / STEP;
          const gx0 = Math.floor(gx);
          const gx1 = Math.min(gridW - 1, gx0 + 1);
          const tx = Math.min(1, Math.max(0, gx - gx0));

          const i00 = gz0 * gridW + gx0;
          const i10 = gz0 * gridW + gx1;
          const i01 = gz1 * gridW + gx0;
          const i11 = gz1 * gridW + gx1;
          const h00 = heights[i00] ?? 0;
          const h10 = heights[i10] ?? h00;
          const h01 = heights[i01] ?? h00;
          const h11 = heights[i11] ?? h10;

          const h0 = h00 + (h10 - h00) * tx;
          const h1 = h01 + (h11 - h01) * tx;
          const h = h0 + (h1 - h0) * tz;

          const value = (h / WORLD_HEIGHT) * 2 - 1;
          const v = Math.max(0, Math.min(1, (value + 1) / 2));
          const c = Math.floor(v * 255);
          data[idx + 0] = c;
          data[idx + 1] = c;
          data[idx + 2] = c;
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      return;
    }

    for (let iy = 0; iy < HEIGHT; iy++) {
      for (let ix = 0; ix < WIDTH; ix++) {
        const idx = (iy * WIDTH + ix) * 4;
        const gx = pan.x + (ix - WIDTH / 2) / zoom + WIDTH / 2;
        const gz = pan.y + (iy - HEIGHT / 2) / zoom + HEIGHT / 2;

        const wx =
          noises.warpNoise.noise(gx / warpScale, gz / warpScale) *
          warpStrengthClamped;
        const wz =
          noises.warpNoise.noise(
            (gx + 1000) / warpScale,
            (gz - 1000) / warpScale
          ) * warpStrengthClamped;

        // Smoothed continentalness (5-tap like WorldChunk)
        const nStep = Math.max(8, Math.floor(contScale * 0.15));
        const c0 = sampleContinental(gx, gz);
        const c1 = sampleContinental(gx + nStep, gz);
        const c2 = sampleContinental(gx - nStep, gz);
        const c3 = sampleContinental(gx, gz + nStep);
        const c4 = sampleContinental(gx, gz - nStep);
        const continentalnessRaw = c0 * 0.6 + (c1 + c2 + c3 + c4) * 0.1;
        // Shaped variant for downstream use if desired
        let continentalnessShaped = Math.max(
          -1,
          Math.min(1, continentalnessRaw * contMagnitude + contOffset)
        );
        continentalnessShaped = Math.max(
          -1,
          Math.min(1, evalLinearSpline(continentalnessShaped, contSpline))
        );

        const ridged = ridgedFBM2D((gx + wx) / pvScale, (gz + wz) / pvScale);

        const erosionMask = getFBMNoise2D({
          x: (gx + wx * 0.5) / erosionScale,
          y: (gz + wz * 0.5) / erosionScale,
          simplexNoise: noises.erosionNoise,
          octaves: erosionOctaves,
          amplitude: 0.5,
          offset: 0.5,
        });

        // Temperature & humidity (0..1)
        const tempNoise = getFBMNoise2D({
          x: gx / tempScale,
          y: gz / tempScale,
          simplexNoise: noises.tempNoise,
          octaves: tempOctaves,
          amplitude: 0.5,
          offset: 0.5,
        });
        const temp = Math.max(0, Math.min(1, tempNoise));
        let humid = getFBMNoise2D({
          x: gx / humidScale,
          y: gz / humidScale,
          simplexNoise: noises.humidNoise,
          octaves: humidOctaves,
          amplitude: 0.5,
          offset: 0.5,
        });
        // Beta behavior: humidity depends on temperature
        humid = Math.max(0, Math.min(1, humid * temp));

        let value = 0;
        if (renderMode === 'base') {
          value = noises.baseNoise.noise(gx / scale, gz / scale);
        } else if (renderMode === 'ridged') {
          value = ridged;
        } else if (renderMode === 'erosion') {
          value = erosionMask;
        } else if (renderMode === 'continental') {
          // Show raw continentalness like the Minecraft debug view
          value = continentalnessRaw;
        } else if (renderMode === 'biome') {
          // Biome mapping influenced by PV/erosion/continentalness
          const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
          const inland = smoothstep(-0.2, 0.6, continentalnessRaw);

          // Temperature cools with mountains; humidity wetter with erosion and coasts
          const t = clamp01(temp - 0.25 * ridged);
          const hWet = clamp01(humid * 0.7 + erosionMask * 0.3);
          const h = clamp01(hWet * (1 - 0.25 * inland) + (1 - inland) * 0.15);

          // Oceans & beaches by continentalness
          if (continentalnessRaw < -0.15) {
            data[idx + 0] = 64; // ocean
            data[idx + 1] = 105;
            data[idx + 2] = 225;
            data[idx + 3] = 255;
            continue;
          }
          if (continentalnessRaw < -0.05) {
            data[idx + 0] = 237; // beach
            data[idx + 1] = 201;
            data[idx + 2] = 175;
            data[idx + 3] = 255;
            continue;
          }

          // Mountain priority inland
          if (ridged > 0.7 && inland > 0.5) {
            if (t < 0.35) {
              data[idx + 0] = 250; // snowy peak
              data[idx + 1] = 250;
              data[idx + 2] = 250;
              data[idx + 3] = 255;
              continue;
            }
            data[idx + 0] = 128; // rocky mountain
            data[idx + 1] = 128;
            data[idx + 2] = 128;
            data[idx + 3] = 255;
            continue;
          }

          // Climate-based biomes
          let r = 0,
            g = 0,
            b = 0;
          if (t < 0.3) {
            if (h < 0.35) {
              r = 220;
              g = 220;
              b = 230; // Tundra
            } else if (h < 0.65) {
              r = 80;
              g = 120;
              b = 100; // Taiga
            } else {
              r = 200;
              g = 220;
              b = 220; // Snowy forest
            }
          } else if (t > 0.8) {
            if (h < 0.25) {
              r = 237;
              g = 201;
              b = 175; // Desert
            } else if (h < 0.55) {
              r = 189;
              g = 183;
              b = 107; // Savanna
            } else {
              r = 34;
              g = 139;
              b = 34; // Jungle
            }
          } else {
            if (h < 0.3) {
              r = 124;
              g = 252;
              b = 0; // Plains
            } else if (h < 0.6) {
              r = 34;
              g = 139;
              b = 34; // Forest
            } else {
              r = 47;
              g = 79;
              b = 79; // Swamp
            }
          }
          data[idx + 0] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
          continue;
        } else {
          // True 3D density pass with 5x5 parabolic-smoothed biome anchors
          const anchors = getSmoothedBiomeAnchors(gx, gz);
          const depth = getFBMNoise2D({
            x: gx / 200,
            y: gz / 200,
            simplexNoise: noises.baseNoise,
            octaves: 2,
            amplitude: 1,
          });
          const scale2 = getFBMNoise2D({
            x: gx / 200,
            y: gz / 200,
            simplexNoise: noises.erosionNoise,
            octaves: 2,
            amplitude: 1,
          });

          const targetBaseY =
            SEA_LEVEL + anchors.base * 24 + depth * 6 + offset * 16;
          const varY = 8 + anchors.variation * 24 + Math.max(0, scale2) * 10;

          const fx = gx / 684.4;
          const fz = gz / 684.4;

          let surface = 0;
          for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
            const fy = y / 684.4;

            const minN = getFBMNoise3D({
              x: fx,
              y: fy,
              z: fz,
              simplexNoise: noises.baseNoise as any,
              octaves: 4,
              amplitude: 1,
            });
            const maxN = getFBMNoise3D({
              x: fx + 17.0,
              y: fy - 31.0,
              z: fz + 7.0,
              simplexNoise: noises.microNoise as any,
              octaves: 4,
              amplitude: 1,
            });
            const selN = getFBMNoise3D({
              x: fx - 11.0,
              y: fy + 23.0,
              z: fz - 5.0,
              simplexNoise: noises.ridgedNoise as any,
              octaves: 3,
              amplitude: 1,
            });
            const sel = Math.max(0, Math.min(1, selN * 0.5 + 0.5));
            const densityBlend = minN * (1 - sel) + maxN * sel;

            const baseShape = (y - targetBaseY) / Math.max(1, varY);
            const density = densityBlend - baseShape;

            if (density > 0) {
              surface = y;
              break;
            }
          }

          value = (surface / WORLD_HEIGHT) * 2 - 1;
        }

        const v = Math.max(0, Math.min(1, (value + 1) / 2));
        const c = Math.floor(v * 255);
        data[idx + 0] = c;
        data[idx + 1] = c;
        data[idx + 2] = c;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [
    noises,
    scale,
    magnitude,
    offset,
    contScale,
    contMagnitude,
    contOffset,
    contSpline,
    pvScale,
    pvOctaves,
    erosionScale,
    erosionOctaves,
    erosionStrength,
    warpStrength,
    renderMode,
    pan.x,
    pan.y,
    tempScale,
    humidScale,
    tempOctaves,
    humidOctaves,
    zoom,
  ]);

  const controls = (
    <div className="flex flex-col gap-4 p-3">
      <div className="grid gap-2">
        <Label htmlFor="seed">Seed</Label>
        <Input
          id="seed"
          type="number"
          value={seed}
          onChange={(e) => setSeed(Number(e.target.value) || 0)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Render Mode</Label>
        <Select
          value={renderMode}
          onValueChange={(v) => setRenderMode(v as RenderMode)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="base">Base</SelectItem>
            <SelectItem value="ridged">Ridged</SelectItem>
            <SelectItem value="erosion">Erosion</SelectItem>
            <SelectItem value="continental">Continental</SelectItem>
            <SelectItem value="finalHeight">Final Height</SelectItem>
            <SelectItem value="biome">Biome</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Continental Scale ({contScale})</Label>
        <Slider
          value={[contScale]}
          min={10}
          max={400}
          step={1}
          onValueChange={([v = contScale]) => setContScale(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Continental Magnitude ({contMagnitude.toFixed(2)})</Label>
        <Slider
          value={[contMagnitude]}
          min={0}
          max={2}
          step={0.01}
          onValueChange={([v = contMagnitude]) => setContMagnitude(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Continental Offset ({contOffset.toFixed(2)})</Label>
        <Slider
          value={[contOffset]}
          min={-1}
          max={1}
          step={0.01}
          onValueChange={([v = contOffset]) => setContOffset(v)}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Continental Spline</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setContSpline((prev) => {
                  const next = [...prev, { t: 0, v: 0 }];
                  next.sort((a, b) => a.t - b.t);
                  return next;
                })
              }
            >
              Add Point
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setContSpline([
                  { t: -1, v: -1 },
                  { t: 0, v: 0 },
                  { t: 1, v: 1 },
                ])
              }
            >
              Reset
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {contSpline
            .slice()
            .sort((a, b) => a.t - b.t)
            .map((p, i, arr) => (
              <div key={`${p.t}:${p.v}:${i}`} className="rounded border p-2">
                <div className="flex items-center justify-between pb-2">
                  <div className="text-sm font-medium">Point {i + 1}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={i === 0 || i === arr.length - 1}
                    onClick={() =>
                      setContSpline((prev) => {
                        const sorted = [...prev].sort((a, b) => a.t - b.t);
                        if (i === 0 || i === sorted.length - 1) return sorted;
                        sorted.splice(i, 1);
                        return sorted;
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label>t ({p.t.toFixed(2)})</Label>
                  <Slider
                    value={[p.t]}
                    min={-1}
                    max={1}
                    step={0.01}
                    onValueChange={([tv = p.t]) =>
                      setContSpline((prev) => {
                        const sorted = [...prev].sort((a, b) => a.t - b.t);
                        const next = sorted.map((sp, idx) =>
                          idx === i
                            ? { ...sp, t: Math.max(-1, Math.min(1, tv)) }
                            : sp
                        );
                        next.sort((a, b) => a.t - b.t);
                        return next;
                      })
                    }
                  />
                </div>
                <div className="grid gap-2 pt-2">
                  <Label>v ({p.v.toFixed(2)})</Label>
                  <Slider
                    value={[p.v]}
                    min={-1}
                    max={1}
                    step={0.01}
                    onValueChange={([vv = p.v]) =>
                      setContSpline((prev) => {
                        const sorted = [...prev].sort((a, b) => a.t - b.t);
                        const next = sorted.map((sp, idx) =>
                          idx === i
                            ? { ...sp, v: Math.max(-1, Math.min(1, vv)) }
                            : sp
                        );
                        return next;
                      })
                    }
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Temp Scale ({tempScale})</Label>
        <Slider
          value={[tempScale]}
          min={50}
          max={800}
          step={1}
          onValueChange={([v = tempScale]) => setTempScale(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Temp Octaves ({tempOctaves})</Label>
        <Slider
          value={[tempOctaves]}
          min={1}
          max={6}
          step={1}
          onValueChange={([v = tempOctaves]) => setTempOctaves(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Humidity Scale ({humidScale})</Label>
        <Slider
          value={[humidScale]}
          min={50}
          max={800}
          step={1}
          onValueChange={([v = humidScale]) => setHumidScale(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Humidity Octaves ({humidOctaves})</Label>
        <Slider
          value={[humidOctaves]}
          min={1}
          max={6}
          step={1}
          onValueChange={([v = humidOctaves]) => setHumidOctaves(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Scale ({scale})</Label>
        <Slider
          value={[scale]}
          min={10}
          max={400}
          step={1}
          onValueChange={([v = scale]) => setScale(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Magnitude ({magnitude.toFixed(2)})</Label>
        <Slider
          value={[magnitude]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={([v = magnitude]) => setMagnitude(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Offset ({offset.toFixed(2)})</Label>
        <Slider
          value={[offset]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={([v = offset]) => setOffset(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Peaks & Valleys Scale ({pvScale})</Label>
        <Slider
          value={[pvScale]}
          min={20}
          max={400}
          step={1}
          onValueChange={([v = pvScale]) => setPvScale(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Peaks & Valleys Octaves ({pvOctaves})</Label>
        <Slider
          value={[pvOctaves]}
          min={1}
          max={8}
          step={1}
          onValueChange={([v = pvOctaves]) => setPvOctaves(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Erosion Scale ({erosionScale})</Label>
        <Slider
          value={[erosionScale]}
          min={20}
          max={600}
          step={1}
          onValueChange={([v = erosionScale]) => setErosionScale(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Erosion Octaves ({erosionOctaves})</Label>
        <Slider
          value={[erosionOctaves]}
          min={1}
          max={8}
          step={1}
          onValueChange={([v = erosionOctaves]) => setErosionOctaves(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Erosion Strength ({erosionStrength.toFixed(2)})</Label>
        <Slider
          value={[erosionStrength]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={([v = erosionStrength]) => setErosionStrength(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Warp Strength ({warpStrength})</Label>
        <Slider
          value={[warpStrength]}
          min={0}
          max={200}
          step={1}
          onValueChange={([v = warpStrength]) => setWarpStrength(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Zoom ({zoom.toFixed(2)}x)</Label>
        <Slider
          value={[zoom]}
          min={0.25}
          max={8}
          step={0.05}
          onValueChange={([v = zoom]) => setZoom(v)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Pan</Label>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setPan({ x: 0, y: 0 })}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );

  const [panelHeight, setPanelHeight] = useState<number>(HEIGHT);
  useEffect(() => {
    const update = () => {
      const el = canvasRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPanelHeight(Math.max(HEIGHT, Math.floor(rect.height)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
      <div className="relative overflow-hidden rounded border border-border">
        <canvas ref={canvasRef} className="h-auto w-full max-w-full" />
      </div>

      <div className="hidden md:block">
        <div
          className="sticky top-4 overflow-hidden rounded border bg-card text-card-foreground shadow-sm"
          style={{ height: panelHeight }}
        >
          <div className="border-b p-3 font-semibold">Controls</div>
          <div className="h-full overflow-y-auto pb-12">{controls}</div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary">Open Controls</Button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Controls</SheetTitle>
            </SheetHeader>
            {controls}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
