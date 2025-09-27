import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DEFAULT_LOCAL = '/home/lullaby/dev/mcmeta';
const DEFAULT_REF = process.env.MCMETA_REF || '1.19.2-data';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/misode/mcmeta';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = (url.searchParams.get('id') || 'overworld').replace(
      /\.json$/,
      ''
    );
    const source =
      url.searchParams.get('source') || process.env.MCMETA_SOURCE || 'local';
    const ref = url.searchParams.get('ref') || DEFAULT_REF;

    if (source === 'github') {
      const rawUrl = `${GITHUB_RAW_BASE}/${encodeURIComponent(ref)}/data/minecraft/worldgen/noise_settings/${id}.json`;
      const res = await fetch(rawUrl, { cache: 'no-store' });
      if (!res.ok) {
        return NextResponse.json(
          { error: `noise_settings ${id} not found (${res.status})` },
          { status: 404 }
        );
      }
      const json = await res.json();
      return NextResponse.json(json);
    }

    const base = process.env.MCMETA_PATH || DEFAULT_LOCAL;
    const file = path.join(
      base,
      'data',
      'minecraft',
      'worldgen',
      'noise_settings',
      `${id}.json`
    );
    const str = await fs.readFile(file, 'utf8');
    const json = JSON.parse(str);
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
