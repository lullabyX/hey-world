'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { loadDeepslateWorldFromObjectAsync } from './deepslateAdapter';
import { Identifier, Climate, MultiNoiseBiomeSource } from 'deepslate';
import overworldParamList from '../data/worldgen/multi_noise_biome_source_parameter_list/overworld.json';
import biomeColors from '../data/biomeColors.json';

function normalizeBiomeColors(
  raw: Record<string, number[]>
): Record<string, readonly [number, number, number]> {
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

const WIDTH = 512;
const HEIGHT = 256;

function rgb(r: number, g: number, b: number) {
  return [r, g, b] as const;
}
const COLORS: Record<string, readonly [number, number, number]> = {
  'minecraft:ocean': rgb(64, 105, 225),
  'minecraft:beach': rgb(237, 201, 175),
  'minecraft:plains': rgb(124, 252, 0),
  'minecraft:forest': rgb(34, 139, 34),
  'minecraft:taiga': rgb(80, 120, 100),
  'minecraft:snowy_plains': rgb(220, 220, 230),
  'minecraft:desert': rgb(237, 201, 175),
  'minecraft:savanna': rgb(189, 183, 107),
  'minecraft:swamp': rgb(47, 79, 79),
  'minecraft:jungle': rgb(34, 139, 34),
  'minecraft:stony_peaks': rgb(128, 128, 128),
};

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

// Minimal overworld parameter list (could be expanded or loaded from preset)
const OVERWORLD_PARAMS: Array<{
  biome: string;
  parameters: {
    temperature: number;
    humidity: number;
    continentalness: number;
    erosion: number;
    depth: number;
    weirdness: number;
    offset: number;
  };
}> = [
  {
    biome: 'minecraft:ocean',
    parameters: {
      temperature: 0,
      humidity: 0,
      continentalness: -0.8,
      erosion: 0,
      depth: 0,
      weirdness: 0,
      offset: 0,
    },
  },
  {
    biome: 'minecraft:beach',
    parameters: {
      temperature: 0.5,
      humidity: 0.3,
      continentalness: -0.06,
      erosion: 0,
      depth: 0,
      weirdness: 0,
      offset: 0,
    },
  },
  {
    biome: 'minecraft:plains',
    parameters: {
      temperature: 0.4,
      humidity: 0.3,
      continentalness: 0.2,
      erosion: 0,
      depth: 0,
      weirdness: 0,
      offset: 0,
    },
  },
  {
    biome: 'minecraft:forest',
    parameters: {
      temperature: 0.3,
      humidity: 0.5,
      continentalness: 0.25,
      erosion: 0,
      depth: 0,
      weirdness: 0,
      offset: 0,
    },
  },
  {
    biome: 'minecraft:taiga',
    parameters: {
      temperature: -0.3,
      humidity: 0.1,
      continentalness: 0.2,
      erosion: 0,
      depth: 0,
      weirdness: 0,
      offset: 0,
    },
  },
  {
    biome: 'minecraft:snowy_plains',
    parameters: {
      temperature: -0.6,
      humidity: 0.0,
      continentalness: 0.2,
      erosion: 0,
      depth: 0,
      weirdness: 0,
      offset: 0,
    },
  },
  {
    biome: 'minecraft:desert',
    parameters: {
      temperature: 0.8,
      humidity: -0.3,
      continentalness: 0.25,
      erosion: 0,
      depth: 0,
      weirdness: 0,
      offset: 0,
    },
  },
  {
    biome: 'minecraft:savanna',
    parameters: {
      temperature: 0.75,
      humidity: 0.1,
      continentalness: 0.25,
      erosion: 0,
      depth: 0,
      weirdness: 0,
      offset: 0,
    },
  },
  {
    biome: 'minecraft:swamp',
    parameters: {
      temperature: 0.2,
      humidity: 0.8,
      continentalness: 0.15,
      erosion: 0,
      depth: 0,
      weirdness: 0,
      offset: 0,
    },
  },
  {
    biome: 'minecraft:jungle',
    parameters: {
      temperature: 0.8,
      humidity: 0.7,
      continentalness: 0.3,
      erosion: 0,
      depth: 0,
      weirdness: 0,
      offset: 0,
    },
  },
  {
    biome: 'minecraft:stony_peaks',
    parameters: {
      temperature: 0.0,
      humidity: 0.0,
      continentalness: 0.5,
      erosion: -0.5,
      depth: 0.6,
      weirdness: 0.5,
      offset: 0,
    },
  },
];

export default function DeepslateBiomeViewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [seed, setSeed] = useState<bigint>(BigInt(1337));
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [world, setWorld] = useState<any>(null);
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
        const json = await settingsRes.json();
        const w = await loadDeepslateWorldFromObjectAsync(
          json as unknown,
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

  const source = useMemo(() => {
    // If the parameter list JSON contains explicit biomes, use it directly
    if ((overworldParamList as any)?.biomes) {
      return MultiNoiseBiomeSource.fromJson(overworldParamList as any);
    }
    const entries = OVERWORLD_PARAMS.map(
      (p) =>
        [
          new Climate.ParamPoint(
            new Climate.Param(
              p.parameters.temperature,
              p.parameters.temperature
            ),
            new Climate.Param(p.parameters.humidity, p.parameters.humidity),
            new Climate.Param(
              p.parameters.continentalness,
              p.parameters.continentalness
            ),
            new Climate.Param(p.parameters.erosion, p.parameters.erosion),
            new Climate.Param(p.parameters.depth, p.parameters.depth),
            new Climate.Param(p.parameters.weirdness, p.parameters.weirdness),
            p.parameters.offset
          ),
          () => Identifier.parse(p.biome),
        ] as const
    );
    return new MultiNoiseBiomeSource(entries as any);
  }, []);

  // Dragging and wheel zoom like NoiseViewer
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
    if (!canvas) return;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(WIDTH, HEIGHT);
    const data = imageData.data;

    if (!world) {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      return;
    }

    for (let iy = 0; iy < HEIGHT; iy++) {
      for (let ix = 0; ix < WIDTH; ix++) {
        const idx = (iy * WIDTH + ix) * 4;
        const gx = pan.x + (ix - WIDTH / 2) / zoom + WIDTH / 2;
        const gz = pan.y + (iy - HEIGHT / 2) / zoom + HEIGHT / 2;

        const quartX = Math.floor(gx) >> 2;
        const quartZ = Math.floor(gz) >> 2;
        const quartY = 16; // 16*4 = 64 block Y
        const id = source.getBiome(quartX, quartY, quartZ, world.state.sampler);
        const key = id.toString();
        const fromJson = BIOME_COLORS[key];
        const fallback = COLORS[key];
        const color = fromJson ?? fallback ?? hashColor(key);
        const [r, g, b] = color;
        data[idx + 0] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [world, source, pan.x, pan.y, zoom]);

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
          <div className="mb-2 font-semibold">Deepslate Biomes (vanilla)</div>
          <div className="grid gap-2">
            <label className="text-sm">Seed</label>
            <input
              className="rounded border px-2 py-1"
              value={String(seed)}
              onChange={(e) => setSeed(BigInt(e.target.value || '0'))}
            />
            <label className="text-sm">Zoom ({zoom.toFixed(2)}x)</label>
            <input
              type="range"
              min={0.25}
              max={8}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <button
              className="rounded border px-2 py-1"
              onClick={() => setPan({ x: 0, y: 0 })}
            >
              Reset Pan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
