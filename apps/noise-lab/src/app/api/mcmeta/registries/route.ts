import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DEFAULT_LOCAL = '';
const DEFAULT_REF = process.env.MCMETA_REF || '1.19.2-data';
const RAW_BASE = 'https://raw.githubusercontent.com/misode/mcmeta';

async function readJson(file: string) {
  const data = await fs.readFile(file, 'utf8');
  return JSON.parse(data);
}

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      const sub = await listFiles(p);
      out.push(...sub);
    } else if (ent.isFile() && ent.name.endsWith('.json')) {
      out.push(p);
    }
  }
  return out;
}

async function fetchRaw(url: string) {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`fetch failed ${res.status} ${url}`);
  return res.json();
}

async function fetchGithubRegistriesRaw(ref: string) {
  // Curated lists sufficient for overworld routing (no aquifers/ores needed for terrain, but we include them for completeness)
  const noiseIds = [
    'aquifer_barrier',
    'aquifer_fluid_level_floodedness',
    'aquifer_fluid_level_spread',
    'aquifer_lava',
    'cave_layer',
    'cave_cheese',
    'cave_entrance',
    'continentalness',
    'erosion',
    'ridge',
    'jagged',
    'offset',
    'spaghetti_3d_rarity',
    'spaghetti_3d_1',
    'spaghetti_3d_2',
    'spaghetti_3d_thickness',
    'spaghetti_2d',
    'spaghetti_2d_modulator',
    'spaghetti_2d_thickness',
    'spaghetti_2d_elevation',
    'spaghetti_roughness_modulator',
    'spaghetti_roughness',
    'noodle',
    'noodle_thickness',
    'noodle_ridge_a',
    'noodle_ridge_b',
    'pillar',
    'pillar_rareness',
    'pillar_thickness',
    'temperature',
    'vegetation',
    'ore_gap',
    'ore_vein_a',
    'ore_vein_b',
    'ore_veininess',
  ];

  const dfPaths = [
    'shift_x',
    'shift_z',
    'y',
    'overworld/continents',
    'overworld/erosion',
    'overworld/ridges',
    'overworld/depth',
    'overworld/factor',
    'overworld/sloped_cheese',
    'overworld/base_3d_noise',
    'overworld/ridges_folded',
    'overworld/offset',
    'overworld/jaggedness',
    'overworld/caves/entrances',
    'overworld/caves/noodle',
    'overworld/caves/pillars',
    'overworld/caves/spaghetti_2d',
    'overworld/caves/spaghetti_2d_thickness_modulator',
    'overworld/caves/spaghetti_roughness_function',
  ];

  const noise: Record<string, any> = {};
  const density_function: Record<string, any> = {};

  await Promise.all(
    noiseIds.map(async (name) => {
      try {
        const url = `${RAW_BASE}/${encodeURIComponent(ref)}/data/minecraft/worldgen/noise/${name}.json`;
        noise[`minecraft:${name}`] = await fetchRaw(url);
      } catch {}
    })
  );

  await Promise.all(
    dfPaths.map(async (p) => {
      try {
        const url = `${RAW_BASE}/${encodeURIComponent(ref)}/data/minecraft/worldgen/density_function/${p}.json`;
        density_function[`minecraft:${p}`] = await fetchRaw(url);
      } catch {}
    })
  );

  return { noise, density_function } as const;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const source =
      url.searchParams.get('source') || process.env.MCMETA_SOURCE || 'local';
    const ref = url.searchParams.get('ref') || DEFAULT_REF;

    if (source === 'github') {
      const { noise, density_function } = await fetchGithubRegistriesRaw(ref);
      if (!Object.keys(noise).length && !Object.keys(density_function).length) {
        return NextResponse.json(
          { noise: {}, density_function: {}, error: 'empty (ref?)' },
          { status: 200 }
        );
      }
      return NextResponse.json({ noise, density_function });
    }

    const base = process.env.MCMETA_PATH || DEFAULT_LOCAL;
    const worldgen = path.join(base, 'data', 'minecraft', 'worldgen');

    const noiseDir = path.join(worldgen, 'noise');
    const noise: Record<string, any> = {};
    try {
      const files = await listFiles(noiseDir);
      for (const f of files) {
        const rel = path.relative(noiseDir, f).replace(/\\/g, '/');
        const id = `minecraft:${rel.replace(/\.json$/, '')}`;
        noise[id] = await readJson(f);
      }
    } catch {}

    const dfDir = path.join(worldgen, 'density_function');
    const density_function: Record<string, any> = {};
    try {
      const files = await listFiles(dfDir);
      for (const f of files) {
        const rel = path.relative(dfDir, f).replace(/\\/g, '/');
        const id = `minecraft:${rel.replace(/\.json$/, '')}`;
        density_function[id] = await readJson(f);
      }
    } catch {}

    if (!Object.keys(noise).length && !Object.keys(density_function).length) {
      const gh = await fetchGithubRegistriesRaw(ref);
      if (
        Object.keys(gh.noise).length ||
        Object.keys(gh.density_function).length
      ) {
        return NextResponse.json(gh);
      }
      return NextResponse.json(
        { error: 'No mcmeta registries found (local and github empty)' },
        { status: 404 }
      );
    }

    return NextResponse.json({ noise, density_function });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
