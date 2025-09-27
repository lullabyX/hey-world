'use client';

import { useEffect, useRef, useState } from 'react';
import {
  loadDeepslateWorldFromObjectAsync,
  sampleDensity,
} from './deepslateAdapter';
import { Input, Label, Slider, Button } from '@hey-world/ui';

type DeepslateWorld = Awaited<
  ReturnType<typeof loadDeepslateWorldFromObjectAsync>
>;

const WIDTH = 1024;
const HEIGHT = 512;

export default function DeepslateTerrainViewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [seed, setSeed] = useState<bigint>(BigInt(1337));
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minY, setMinY] = useState(-64);
  const [maxY, setMaxY] = useState(320);
  const [yStep, setYStep] = useState(4);
  const [debugValueMode, setDebugValueMode] = useState(false);
  const [world, setWorld] = useState<DeepslateWorld | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        if (!cancelled) setWorld(w as any);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(WIDTH, HEIGHT);
    const data = imageData.data;

    if (!world) {
      // draw nothing; overlay below shows loading/error
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      return;
    }

    if (debugValueMode) {
      for (let iy = 0; iy < HEIGHT; iy++) {
        for (let ix = 0; ix < WIDTH; ix++) {
          const idx = (iy * WIDTH + ix) * 4;
          const gx = pan.x + (ix - WIDTH / 2) / zoom + WIDTH / 2;
          const gz = pan.y + (iy - HEIGHT / 2) / zoom + HEIGHT / 2;
          const v = sampleDensity(
            world.state,
            Math.floor(gx),
            Math.floor((minY + maxY) / 2),
            Math.floor(gz)
          );
          const n = Math.max(0, Math.min(1, (v + 1) / 2));
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

    // Coarse grid approach for efficiency
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

        // Scan downwards to find surface (density > 0)
        let surface = minY;
        for (let y = maxY; y >= minY; y -= yStep) {
          const d = sampleDensity(
            world.state,
            Math.floor(gx),
            Math.floor(y),
            Math.floor(gz)
          );
          if (d > 0) {
            // refine upwards within this band
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

    // Bilinear interpolation from coarse grid
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

        // Normalize height to 0..1 for display
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
  }, [world, pan.x, pan.y, zoom, minY, maxY, yStep, debugValueMode]);

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
      <div className="hidden md:block">
        <div className="sticky top-4 rounded border bg-card p-3 text-card-foreground shadow-sm">
          <div className="mb-2 font-semibold">Deepslate Terrain</div>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="seed">Seed</Label>
              <Input
                id="seed"
                type="number"
                value={String(seed)}
                onChange={(e) => setSeed(BigInt(e.target.value || '0'))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Min Y ({minY})</Label>
              <Slider
                value={[minY]}
                min={-128}
                max={0}
                step={1}
                onValueChange={([v = minY]) => setMinY(v)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Max Y ({maxY})</Label>
              <Slider
                value={[maxY]}
                min={128}
                max={384}
                step={1}
                onValueChange={([v = maxY]) => setMaxY(v)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Y Step ({yStep})</Label>
              <Slider
                value={[yStep]}
                min={1}
                max={16}
                step={1}
                onValueChange={([v = yStep]) => setYStep(v)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={debugValueMode}
                onChange={(e) => setDebugValueMode(e.target.checked)}
              />
              finalDensity value debug
            </label>
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
