// The loading kit (v3 Step 2 part 5): one small pre-recoloured PNG of the
// traveller's walk and a few animals' walks, made by
// scripts/build-loading-kit.ts from the sheets and palettes, and inlined into
// index.html as a data URI (scripts/vite/loadingKit.ts), so the loading screen
// has pixel walkers at first paint, before any JS, sprite or data loads.

export const LOADING_KIT = {
  /** Written by the script, read by the Vite plugin; committed so dev works too. */
  png: 'public/assets/loading-kit.png',
  json: 'public/assets/loading-kit.json',
  /** Animals that walk behind the traveller (ids in animals.json); one is picked per visit. */
  animals: ['red-fox', 'emperor-penguin', 'giant-panda', 'tiger'],
  /** Every frame sits bottom-centre in a cell this size (native px). */
  cell: { width: 24, height: 24 },
  /** The walk frames per row: every sheet's walk and the traveller have this many. */
  frames: 4,
  /** Frames per second of the CSS walk cycle. */
  fps: 8,
} as const;

/** What the script writes beside the PNG: the sheet's layout, row by row. */
export interface LoadingKitLayout {
  readonly cell: { readonly width: number; readonly height: number };
  readonly frames: number;
  readonly fps: number;
  /** Row 0 is the traveller, then one row per animal. */
  readonly rows: readonly string[];
}
