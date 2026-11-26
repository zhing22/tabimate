// Trimmed Aseprite exports, laid out untrimmed: the frame layout the scene and
// the UI both draw from.
import type { FrameRect, SheetInfo } from './sheet';

/** One frame copied from a trimmed sheet into its untrimmed place. */
export interface FrameCopy {
  readonly from: FrameRect;
  readonly toX: number;
  readonly toY: number;
}

/**
 * The one frame layout everything draws from, scene and UI alike: every frame
 * in its full box, side by side in one row, its pixels at their Aseprite
 * offset inside the box (so the feet stay put from frame to frame and the box
 * anchors bottom-centre). Null when the sheet is already laid out that way.
 */
export function untrimmed(
  info: SheetInfo,
): { readonly info: SheetInfo; readonly copies: readonly FrameCopy[] } | null {
  const { frameWidth: fw, frameHeight: fh } = info;
  const trimmed = info.frames.some(
    (f, i) => f.w !== fw || f.h !== fh || info.offsets[i]!.x !== 0 || info.offsets[i]!.y !== 0,
  );
  if (!trimmed) return null;
  return {
    info: {
      ...info,
      frames: info.frames.map((_, i) => ({ x: i * fw, y: 0, w: fw, h: fh })),
      offsets: info.frames.map(() => ({ x: 0, y: 0 })),
    },
    copies: info.frames.map((from, i) => ({
      from,
      toX: i * fw + info.offsets[i]!.x,
      toY: info.offsets[i]!.y,
    })),
  };
}
