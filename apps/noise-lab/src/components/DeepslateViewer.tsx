'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  loadDeepslateWorldFromObject,
  loadDeepslateWorldFromObjectAsync,
  sampleClimate,
  sampleDensity,
  sampleContinents,
  sampleTemperature,
} from './deepslateAdapter';
import { MultiNoiseBiomeSource } from 'deepslate';
import overworldParamList from '../data/worldgen/multi_noise_biome_source_parameter_list/overworld.json';
import biomeColors from '../data/biomeColors.json';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Button,
} from '@hey-world/ui';

const WIDTH = 1024;
const HEIGHT = 512;

function normalizeBiomeColors(raw: Record<string, number[]>) {
  const out: Record<string, readonly [number, number, number]> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v) && v.length >= 3) {
      const r = Math.max(0, Math.min(255, Math.floor(v[0] ?? 0)));
      const g = Math.max(0, Math.min(255, Math.floor(v[1] ?? 0)));
      const b = Math.max(0, Math.min(255, Math.floor(v[2] ?? 0)));
      out[k] = [r, g, b] as const;
    }
  }
  return out;
}
const BIOME_COLORS = normalizeBiomeColors(
  biomeColors as Record<string, number[]>
);

function hashColor(id: string): readonly [number, number, number] {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const r = ((h >>> 16) & 0xff) | 0x30;
  const g = ((h >>> 8) & 0xff) | 0x30;
  const b = (h & 0xff) | 0x30;
  return [r, g, b] as const;
}

type Mode =
  | 'continents'
  | 'temperature'
  | 'climate'
  | 'biome'
  | 'finalDensity'
  | 'terrain';

export default function DeepslateViewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [seed, setSeed] = useState<bigint>(BigInt(1337));
  const [mode, setMode] = useState<Mode>('finalDensity');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [yLevel, setYLevel] = useState(64);
  const [minY, setMinY] = useState(-64);
  const [maxY, setMaxY] = useState(320);
  const [yStep, setYStep] = useState(4);
  const [error, setError] = useState<string | null>(null);

  const [world, setWorld] = useState<ReturnType<
    typeof loadDeepslateWorldFromObject
  > | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setWorld(null);
      try {
        const settingsRes = await fetch(
          '/api/mcmeta/noise_settings?id=overworld&source=github',
          { cache: 'no-store' }
        );
        if (!settingsRes.ok)
          throw new Error('Failed to fetch noise_settings from mcmeta');
        const noiseSettingsJson = await settingsRes.json();
        const w = await loadDeepslateWorldFromObjectAsync(
          noiseSettingsJson as unknown,
          seed
        );
        if (!cancelled) setWorld(w);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seed]);

  const biomeSource = useMemo(
    () => MultiNoiseBiomeSource.fromJson(overworldParamList as any),
    []
  );

  // Drag to pan and wheel to zoom (like other viewers)
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
    if (!canvas || !world) return;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(WIDTH, HEIGHT);
    const data = imageData.data;

    if (mode === 'terrain') {
      const STEP = 8;
      const gridW = Math.ceil(WIDTH / STEP) + 1;
      const gridH = Math.ceil(HEIGHT / STEP) + 1;
      const heights = new Float32Array(gridW * gridH);
      const idxGrid = (gxIdx: number, gzIdx: number) => gzIdx * gridW + gxIdx;

      for (let gzIdx = 0; gzIdx < gridH; gzIdx++) {
        const py = Math.min(HEIGHT - 1, gzIdx * STEP);
        const gz = pan.y + (py - HEIGHT / 2) / zoom + HEIGHT / 2;
        for (let gxIdx = 0; gxIdx < gridW; gxIdx++) {
          const px = Math.min(WIDTH - 1, gxIdx * STEP);
          const gx = pan.x + (px - WIDTH / 2) / zoom + WIDTH / 2;

          let surface = minY;
          for (let y = maxY; y >= minY; y -= yStep) {
            const d = sampleDensity(
              world.state,
              Math.floor(gx),
              Math.floor(y),
              Math.floor(gz)
            );
            if (d > 0) {
              let yy = Math.min(maxY, y + (yStep - 1));
              for (; yy > y; yy--) {
                const dd = sampleDensity(
                  world.state,
                  Math.floor(gx),
                  Math.floor(yy),
                  Math.floor(gz)
                );
                if (dd > 0) {
                  surface = yy;
                  break;
                }
              }
              if (surface === minY) surface = y;
              break;
            }
          }
          heights[idxGrid(gxIdx, gzIdx)] = surface;
        }
      }

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
          const h00 = heights[i00] ?? minY;
          const h10 = heights[i10] ?? h00;
          const h01 = heights[i01] ?? h00;
          const h11 = heights[i11] ?? h10;

          const h0 = h00 + (h10 - h00) * tx;
          const h1 = h01 + (h11 - h01) * tx;
          const h = h0 + (h1 - h0) * tz;

          const n = Math.max(
            0,
            Math.min(1, (h - minY) / Math.max(1, maxY - minY))
          );
          const c = Math.floor(n * 255);
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

        if (mode === 'biome') {
          const quartX = Math.floor(gx) >> 2;
          const quartZ = Math.floor(gz) >> 2;
          const id = biomeSource.getBiome(
            quartX,
            16,
            quartZ,
            world.state.sampler
          );
          const key = id.toString();
          const [r, g, b] = BIOME_COLORS[key] ?? hashColor(key);
          data[idx + 0] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
          continue;
        }

        let v = 0;
        if (mode === 'continents') {
          v = sampleContinents(world.state, Math.floor(gx), Math.floor(gz));
        } else if (mode === 'temperature') {
          v = sampleTemperature(world.state, Math.floor(gx), Math.floor(gz));
        } else if (mode === 'climate') {
          const c = sampleClimate(world.state, Math.floor(gx), Math.floor(gz));
          v =
            (c.temperature +
              c.humidity +
              c.continentalness +
              c.erosion +
              c.depth +
              c.weirdness) /
            6;
        } else {
          v = sampleDensity(
            world.state,
            Math.floor(gx),
            Math.floor(yLevel),
            Math.floor(gz)
          );
        }

        const n = Math.max(0, Math.min(1, (v + 1) / 2));
        const c = Math.floor(n * 255);
        data[idx + 0] = c;
        data[idx + 1] = c;
        data[idx + 2] = c;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [world, mode, pan.x, pan.y, zoom, yLevel, minY, maxY, yStep, biomeSource]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
      <div className="relative overflow-hidden rounded border border-border">
        <canvas ref={canvasRef} className="h-auto w-full max-w-full" />
        {!world && !error && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            Loading mcmeta registries…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-red-500">
            {error}
          </div>
        )}
      </div>
      <div className="hidden h-full md:block">
        <div
          className="sticky top-4 h-full overflow-hidden rounded border bg-card text-card-foreground shadow-sm"
          style={{ height: HEIGHT }}
        >
          <div className="border-b p-3 font-semibold">Deepslate Viewer</div>
          <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="seed">Seed</Label>
              <Input
                id="seed"
                type="number"
                value={String(seed)}
                onChange={(e) => setSeed(BigInt(e.target.value || '0'))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger>
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="continents">continents</SelectItem>
                  <SelectItem value="temperature">temperature</SelectItem>
                  <SelectItem value="climate">climate (avg)</SelectItem>
                  <SelectItem value="biome">biome (deepslate)</SelectItem>
                  <SelectItem value="finalDensity">
                    finalDensity (y-controlled)
                  </SelectItem>
                  <SelectItem value="terrain">terrain (heightmap)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === 'finalDensity' && (
              <div className="flex flex-col gap-2">
                <Label>Y ({yLevel})</Label>
                <Slider
                  value={[yLevel]}
                  min={-64}
                  max={256}
                  step={1}
                  onValueChange={([v = yLevel]) => setYLevel(v)}
                />
              </div>
            )}

            {mode === 'terrain' && (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Min Y ({minY})</Label>
                  <Slider
                    value={[minY]}
                    min={-128}
                    max={0}
                    step={1}
                    onValueChange={([v = minY]) => setMinY(v)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Max Y ({maxY})</Label>
                  <Slider
                    value={[maxY]}
                    min={128}
                    max={384}
                    step={1}
                    onValueChange={([v = maxY]) => setMaxY(v)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Y Step ({yStep})</Label>
                  <Slider
                    value={[yStep]}
                    min={1}
                    max={16}
                    step={1}
                    onValueChange={([v = yStep]) => setYStep(v)}
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-2">
              <Label>Zoom ({zoom.toFixed(2)}x)</Label>
              <Slider
                value={[zoom]}
                min={0.25}
                max={8}
                step={0.05}
                onValueChange={([v = zoom]) => setZoom(v)}
              />
            </div>

            <div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setPan({ x: 0, y: 0 })}
              >
                Reset Pan
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
