import {
  NoiseGeneratorSettings,
  RandomState,
  DensityFunction,
  Identifier,
  WorldgenRegistries,
  NoiseParameters,
  Holder,
} from 'deepslate';

import vanillaNoise from './vanillaNoise';
import vanillaDensity from './vanillaDensity';

export type DeepslateWorld = {
  state: RandomState;
  settings: NoiseGeneratorSettings;
};

export type VanillaEntries = {
  noise?: Record<string, { firstOctave: number; amplitudes: number[] }>;
  density_function?: Record<string, unknown>;
};

function ensure(id: string, firstOctave: number, amplitudes: number[]) {
  const key = Identifier.parse(id);
  if (!WorldgenRegistries.NOISE.has(key)) {
    WorldgenRegistries.NOISE.register(
      key,
      NoiseParameters.create(firstOctave, amplitudes)
    );
  }
  return key;
}

export function registerVanillaEntries(entries: VanillaEntries) {
  if (entries.noise) {
    for (const [id, params] of Object.entries(entries.noise)) {
      ensure(id, params.firstOctave, params.amplitudes);
    }
  }
  if (entries.density_function) {
    for (const [id, df] of Object.entries(entries.density_function)) {
      const key = Identifier.parse(id);
      if (!WorldgenRegistries.DENSITY_FUNCTION.has(key)) {
        const value = DensityFunction.fromJson(df);
        WorldgenRegistries.DENSITY_FUNCTION.register(key, () => value);
      }
    }
  }
}

export async function tryFetchMcmetaRegistries(): Promise<VanillaEntries | null> {
  try {
    const res = await fetch('/api/mcmeta/registries?source=github', {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json as VanillaEntries;
  } catch {
    return null;
  }
}

export function loadDeepslateWorldFromObject(
  obj: unknown,
  seed: bigint
): DeepslateWorld {
  // Register bundled defaults first
  registerVanillaEntries({
    noise: vanillaNoise,
    density_function: vanillaDensity,
  });

  const settings = NoiseGeneratorSettings.fromJson(obj);

  // Force finalDensity to a supported, vanilla-equivalent function to avoid unsupported 'slide'
  const finalKey = Identifier.parse('minecraft:overworld/sloped_cheese');
  if (WorldgenRegistries.DENSITY_FUNCTION.has(finalKey)) {
    const holderRef = Holder.reference(
      WorldgenRegistries.DENSITY_FUNCTION,
      finalKey
    );
    (settings.noiseRouter as any).finalDensity = new (
      DensityFunction as any
    ).HolderHolder(holderRef);
  }

  const state = new RandomState(settings, seed);
  return { state, settings };
}

export async function loadDeepslateWorldFromObjectAsync(
  obj: unknown,
  seed: bigint
): Promise<DeepslateWorld> {
  const streamed = await tryFetchMcmetaRegistries();
  if (streamed) {
    registerVanillaEntries(streamed);
  } else {
    registerVanillaEntries({
      noise: vanillaNoise,
      density_function: vanillaDensity,
    });
  }
  return loadDeepslateWorldFromObject(obj, seed);
}

export function sampleClimate(state: RandomState, x: number, z: number) {
  const sampler = state.sampler;
  return sampler.sample(x, 0, z);
}

export function sampleTemperature(state: RandomState, x: number, z: number) {
  const c = sampleClimate(state, x, z);
  return c.temperature;
}

export function sampleDensity(
  state: RandomState,
  x: number,
  y: number,
  z: number
) {
  const ctx = DensityFunction.context(x, y, z);
  return state.router.finalDensity.compute(ctx);
}

export function sampleContinents(state: RandomState, x: number, z: number) {
  const ctx = DensityFunction.context(x << 2, 0, z << 2);
  return state.router.continents.compute(ctx);
}

export function ensureNoiseRegistration(
  id: string,
  firstOctave: number,
  amplitudes: number[]
) {
  const key = Identifier.parse(id);
  if (!WorldgenRegistries.NOISE.has(key)) {
    WorldgenRegistries.NOISE.register(
      key,
      NoiseParameters.create(firstOctave, amplitudes)
    );
  }
}
