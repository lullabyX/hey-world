import { useEffect, useRef, useState } from 'react';
import {
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
} from 'three';
import blocksAtlas from '@/public/atlas/blocks.png';
import { TILES } from '@/lib/textures/tiles';

export type Atlas = {
  texture: Texture;
  cols: number;
  rows: number;
  tileIndexByName: Record<string, number>;
};

export function useAtlas(
  grid: { cols: number; rows: number },
  paddingPixels = 1
) {
  const [atlas, setAtlas] = useState<null | Atlas>(null);
  const atlasScaleRef = useRef(new Vector2(1, 1));
  const atlasPaddingRef = useRef(new Vector2(0, 0));

  useEffect(() => {
    let cancelled = false;
    const loader = new TextureLoader();
    loader.setCrossOrigin('anonymous');
    const atlasUrl = blocksAtlas?.src ?? (blocksAtlas as unknown as string);
    loader.load(
      atlasUrl,
      (texture) => {
        if (cancelled) {
          return;
        }
        texture.magFilter = NearestFilter;
        texture.minFilter = NearestFilter;
        texture.generateMipmaps = false;
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.colorSpace = SRGBColorSpace;
        const cols = grid.cols;
        const rows = grid.rows;
        const texW = texture.image?.width ?? 256;
        const texH = texture.image?.height ?? 256;
        atlasScaleRef.current.set(1 / cols, 1 / rows);
        atlasPaddingRef.current.set(paddingPixels / texW, paddingPixels / texH);
        setAtlas({ texture, cols, rows, tileIndexByName: TILES });
      },
      undefined,
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [grid.cols, grid.rows, paddingPixels]);

  return { atlas, atlasScaleRef, atlasPaddingRef } as const;
}
