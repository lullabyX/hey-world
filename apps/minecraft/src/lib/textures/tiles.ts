export const TILES = {
  grass: 0,
  stone: 1,
  dirt: 2,
  grassSide: 3,
  planks: 4,
  sand: 18,
  treeSide: 20,
  treeTop: 21,
  cloud: 22,
  goldOre: 32,
  ironOre: 33,
  coalOre: 34,
  leaves: 53,
} as const;

export type TileName = keyof typeof TILES;
