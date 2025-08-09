import { Atlas } from './useAtlas';
import { Block, CommonBlockProps } from '@/lib/block';
import { Color } from 'three';

// Return UV offset for a given tile index in a grid atlas
// Indices are assumed row-major from 0..(cols*rows-1)
export function getTileOffset(
  index: number,
  cols: number,
  rows: number
): [number, number] {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const u = col / cols;
  // Flip Y because UV v=0 is bottom
  const v = 1 - (row + 1) / rows;
  return [u, v];
}

export const tileIndexToOffset = (
  index: number,
  atlas: { cols: number; rows: number }
) => {
  const [u, v] = getTileOffset(index, atlas.cols, atlas.rows);
  return [u, v] as const;
};

export const loadTextureTiles = ({
  block,
  uvTopArr,
  uvSideArr,
  uvBottomArr,
  tintTopArr,
  tintSideArr,
  tintBottomArr,
  atlas,
}: {
  block: Block;
  uvTopArr: Float32Array;
  uvSideArr: Float32Array;
  uvBottomArr: Float32Array;
  tintTopArr: Float32Array;
  tintSideArr: Float32Array;
  tintBottomArr: Float32Array;
  atlas: Atlas;
}) => {
  if (!atlas || !block) {
    return;
  }
  // Select textures per face from block config (preferred)
  const tiles = (block as CommonBlockProps).textureTiles as
    | { top: number; side: number; bottom: number }
    | undefined;

  if (!tiles) {
    return;
  }

  const topIdx = tiles.top;
  const sideIdx = tiles.side;
  const bottomIdx = tiles.bottom;

  const [uT, vT] = tileIndexToOffset(topIdx, atlas);
  const [uS, vS] = tileIndexToOffset(sideIdx, atlas);
  const [uB, vB] = tileIndexToOffset(bottomIdx, atlas);

  const instanceId = block.instanceId;
  if (instanceId == null) {
    return;
  }

  const tintConfig = (block as CommonBlockProps).textureTiles?.tint as
    | {
        top?: string;
        side?: string;
        bottom?: string;
      }
    | undefined;
  const topColor = new Color(tintConfig?.top ?? 0xffffff);
  const sideColor = new Color(tintConfig?.side ?? 0xffffff);
  const bottomColor = new Color(tintConfig?.bottom ?? 0xffffff);
  const baseTop = instanceId * 3;
  const baseSide = instanceId * 3;
  const baseBottom = instanceId * 3;
  tintTopArr[baseTop + 0] = topColor.r;
  tintTopArr[baseTop + 1] = topColor.g;
  tintTopArr[baseTop + 2] = topColor.b;
  tintSideArr[baseSide + 0] = sideColor.r;
  tintSideArr[baseSide + 1] = sideColor.g;
  tintSideArr[baseSide + 2] = sideColor.b;
  tintBottomArr[baseBottom + 0] = bottomColor.r;
  tintBottomArr[baseBottom + 1] = bottomColor.g;
  tintBottomArr[baseBottom + 2] = bottomColor.b;

  uvTopArr[instanceId * 2 + 0] = uT;
  uvTopArr[instanceId * 2 + 1] = vT;
  uvSideArr[instanceId * 2 + 0] = uS;
  uvSideArr[instanceId * 2 + 1] = vS;
  uvBottomArr[instanceId * 2 + 0] = uB;
  uvBottomArr[instanceId * 2 + 1] = vB;
};
