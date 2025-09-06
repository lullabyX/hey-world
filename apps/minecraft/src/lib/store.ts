import { atom } from 'jotai';
import { Block, BlockType } from './block';

export const dimensionsAtom = atom({
  width: 32,
  height: 16,
});

const STORAGE_KEY = 'mc:edits:v1';

type StoreKey = `${number}|${number}|${number}|${number}|${number}`;

class WorldEditsStore {
  private loaded = false;
  private saveTimer: number | null = null;
  private store = new Map<StoreKey, BlockType>();

  private ensureLoaded() {
    if (typeof window === 'undefined') return;
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const storeObj = JSON.parse(raw) as Record<string, BlockType>;
      for (const [k, v] of Object.entries(storeObj))
        this.store.set(k as StoreKey, v);
    } catch (error) {
      console.error(error);
    }
  }

  private scheduleSave() {
    if (typeof window === 'undefined') return;
    if (this.saveTimer != null) return;
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      try {
        const storeObj = Object.fromEntries(this.store.entries());
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storeObj));
      } catch (error) {
        console.error(error);
      }
    }, 100);
  }

  private key(
    cx: number,
    cz: number,
    x: number,
    y: number,
    z: number
  ): StoreKey {
    return `${cx}|${cz}|${x}|${y}|${z}`;
  }

  set(
    cx: number,
    cz: number,
    x: number,
    y: number,
    z: number,
    type: BlockType
  ) {
    this.ensureLoaded();
    this.store.set(this.key(cx, cz, x, y, z), type);
    this.scheduleSave();
  }

  get(
    cx: number,
    cz: number,
    x: number,
    y: number,
    z: number
  ): BlockType | undefined {
    this.ensureLoaded();
    return this.store.get(this.key(cx, cz, x, y, z));
  }
}

export const worldEdits = new WorldEditsStore();
