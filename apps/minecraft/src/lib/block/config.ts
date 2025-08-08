// Define block configurations with actual Minecraft colors
import { BlockDefinition } from './types';

export const BLOCK_CONFIGS = {
  empty: {
    type: 'empty' as const,
  },
  grass: {
    type: 'grass' as const,
    color: '#7FB238', // Official Minecraft grass green
  },
  dirt: {
    type: 'dirt' as const,
    color: '#976D4D', // Official Minecraft dirt brown
  },
  stone: {
    type: 'stone' as const,
    color: '#707070', // Official Minecraft stone gray
    isResource: true,
    resource: {
      scale: { x: 30, y: 20, z: 30 },
      scarcity: 0.5,
    },
  },
  sand: {
    type: 'sand' as const,
    color: '#F7E9A3', // Official Minecraft sand
  },
  wood: {
    type: 'wood' as const,
    color: '#8F7748', // Official Minecraft wood (oak)
  },
  leaves: {
    type: 'leaves' as const,
    color: '#80A755', // Official Minecraft birch leaves (constant)
  },
  water: {
    type: 'water' as const,
    color: '#4040FF', // Official Minecraft water blue
    transparent: true,
  },
  coal_ore: {
    type: 'coal_ore' as const,
    color: '#4C4C4C', // Dark gray for coal
    isResource: true,
    resource: {
      scale: { x: 24, y: 24, z: 24 },
      scarcity: 0.75,
    },
  },
  iron_ore: {
    type: 'iron_ore' as const,
    color: '#D8AF93', // Official raw iron color
    isResource: true,
    resource: {
      scale: { x: 28, y: 28, z: 28 },
      scarcity: 0.85,
    },
  },
  gold_ore: {
    type: 'gold_ore' as const,
    color: '#FAEE4D', // Official Minecraft gold
    isResource: true,
    resource: {
      scale: { x: 32, y: 32, z: 32 },
      scarcity: 0.93,
    },
  },
  diamond_ore: {
    type: 'diamond_ore' as const,
    color: '#5CDBD5', // Official Minecraft diamond
    isResource: true,
    resource: {
      scale: { x: 40, y: 40, z: 40 },
      scarcity: 0.98,
    },
  },
  emerald_ore: {
    type: 'emerald_ore' as const,
    color: '#00D93A', // Official Minecraft emerald
    isResource: true,
    resource: {
      scale: { x: 44, y: 44, z: 44 },
      scarcity: 0.99,
    },
  },
  lapis_ore: {
    type: 'lapis_ore' as const,
    color: '#4A80FF', // Official Minecraft lapis
    isResource: true,
    resource: {
      scale: { x: 36, y: 36, z: 36 },
      scarcity: 0.93,
    },
  },
  redstone_ore: {
    type: 'redstone_ore' as const,
    color: '#FC3100', // Official powered redstone
    isResource: true,
    resource: {
      scale: { x: 30, y: 30, z: 30 },
      scarcity: 0.88,
    },
  },
  obsidian: {
    type: 'obsidian' as const,
    color: '#191919', // Official Minecraft black
  },
  bedrock: {
    type: 'bedrock' as const,
    color: '#353535', // Very dark gray
  },
  gravel: {
    type: 'gravel' as const,
    color: '#999999', // Official Minecraft light gray/silver
  },
  clay: {
    type: 'clay' as const,
    color: '#A4A8B8', // Official Minecraft clay
  },
  snow: {
    type: 'snow' as const,
    color: '#FFFFFF', // Official Minecraft snow white
  },
  ice: {
    type: 'ice' as const,
    color: '#A0A0FF', // Official Minecraft ice
  },
  netherrack: {
    type: 'netherrack' as const,
    color: '#700200', // Official Minecraft netherrack
  },
  glowstone: {
    type: 'glowstone' as const,
    color: '#FED83D', // Bright yellow (same as yellow dye)
    emissive: true,
  },
  lava: {
    type: 'lava' as const,
    color: '#FF5000', // Bright orange-red for lava
    emissive: true,
  },
  // Terracotta colors
  terracotta: {
    type: 'terracotta' as const,
    color: '#D1B1A1', // Official white terracotta (base)
  },
  red_terracotta: {
    type: 'red_terracotta' as const,
    color: '#8E3C2E', // Official red terracotta
  },
  orange_terracotta: {
    type: 'orange_terracotta' as const,
    color: '#9F5224', // Official orange terracotta
  },
  yellow_terracotta: {
    type: 'yellow_terracotta' as const,
    color: '#BA8524', // Official yellow terracotta
  },
  // Concrete colors (more vibrant than terracotta)
  white_concrete: {
    type: 'white_concrete' as const,
    color: '#F9FFFE', // Official white concrete
  },
  black_concrete: {
    type: 'black_concrete' as const,
    color: '#1D1D21', // Official black concrete
  },
  red_concrete: {
    type: 'red_concrete' as const,
    color: '#B02E26', // Official red concrete
  },
  green_concrete: {
    type: 'green_concrete' as const,
    color: '#5E7C16', // Official green concrete
  },
  blue_concrete: {
    type: 'blue_concrete' as const,
    color: '#3C44AA', // Official blue concrete
  },
  cyan_concrete: {
    type: 'cyan_concrete' as const,
    color: '#169C9C', // Official cyan concrete
  },
  // Biome-specific grass variants
  plains_grass: {
    type: 'plains_grass' as const,
    color: '#91BD59', // Plains biome grass
  },
  desert_grass: {
    type: 'desert_grass' as const,
    color: '#BFB755', // Desert/savanna grass
  },
  jungle_grass: {
    type: 'jungle_grass' as const,
    color: '#59C93C', // Jungle grass (lush)
  },
  swamp_grass: {
    type: 'swamp_grass' as const,
    color: '#6A7039', // Swamp grass (murky)
  },
  badlands_grass: {
    type: 'badlands_grass' as const,
    color: '#90814D', // Badlands grass (tan)
  },
  // Wood types
  oak_wood: {
    type: 'oak_wood' as const,
    color: '#8F7748', // Oak
  },
  spruce_wood: {
    type: 'spruce_wood' as const,
    color: '#664C33', // Darker brown
  },
  birch_wood: {
    type: 'birch_wood' as const,
    color: '#D7CB8D', // Light/pale wood
  },
  jungle_wood: {
    type: 'jungle_wood' as const,
    color: '#664C33', // Similar to spruce
  },
  acacia_wood: {
    type: 'acacia_wood' as const,
    color: '#BA8524', // Orange-tinted wood
  },
  dark_oak_wood: {
    type: 'dark_oak_wood' as const,
    color: '#4C3223', // Very dark brown
  },
  // Nether blocks
  crimson_nylium: {
    type: 'crimson_nylium' as const,
    color: '#BD3031', // Official crimson
  },
  warped_nylium: {
    type: 'warped_nylium' as const,
    color: '#167E86', // Official warped
  },
  soul_sand: {
    type: 'soul_sand' as const,
    color: '#4C3223', // Dark brown
  },
  // End blocks
  end_stone: {
    type: 'end_stone' as const,
    color: '#F7E9A3', // Pale yellow (similar to sand)
  },
  purpur: {
    type: 'purpur' as const,
    color: '#8932B8', // Official purple
  },
  // Deepslate variants
  deepslate: {
    type: 'deepslate' as const,
    color: '#646464', // Official deepslate gray
  },
} as const satisfies Record<string, BlockDefinition>;
