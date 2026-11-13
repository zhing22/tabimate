// Reads Aseprite's "Export Sprite Sheet" JSON (hash or array frames, frame tags).

export interface FrameRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A named run of frames, e.g. walk = frames 0-3 at 8 fps. */
export interface FrameTag {
  readonly from: number;
  readonly to: number;
  readonly fps: number;
}

export interface SheetInfo {
  readonly frames: readonly FrameRect[];
  readonly tags: Readonly<Record<string, FrameTag>>;
  /** Size of one frame: every frame of a sheet is the same size. */
  readonly frameWidth: number;
  readonly frameHeight: number;
}

const DEFAULT_FRAME_MS = 125;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function rectOf(entry: unknown, i: number): { rect: FrameRect; duration: number } {
  const frame = isObject(entry) ? entry.frame : undefined;
  if (!isObject(frame)) throw new Error(`frame ${i} has no "frame" rectangle`);
  const [x, y, w, h] = [frame.x, frame.y, frame.w, frame.h].map(Number) as [
    number,
    number,
    number,
    number,
  ];
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
    throw new Error(`frame ${i} has a bad rectangle`);
  }
  const duration = isObject(entry) ? Number(entry.duration) : NaN;
  return { rect: { x, y, w, h }, duration: duration > 0 ? duration : DEFAULT_FRAME_MS };
}

/**
 * Throws with a clear message if the JSON isn't a usable sheet. With `image`
 * (the PNG's size), every frame must also lie inside it.
 */
export function parseAsepriteSheet(
  json: unknown,
  image?: { readonly width: number; readonly height: number },
): SheetInfo {
  if (!isObject(json)) throw new Error('sheet JSON must be an object');
  const raw = Array.isArray(json.frames)
    ? json.frames
    : isObject(json.frames)
      ? Object.values(json.frames) // hash export keeps frame order
      : null;
  if (!raw || raw.length === 0) throw new Error('sheet JSON has no frames');
  const parsed = raw.map(rectOf);
  const first = parsed[0]!.rect;
  if (parsed.some(({ rect }) => rect.w !== first.w || rect.h !== first.h)) {
    throw new Error('every frame must be the same size');
  }
  if (image) {
    parsed.forEach(({ rect }, i) => {
      if (rect.x + rect.w > image.width || rect.y + rect.h > image.height) {
        throw new Error(`frame ${i} lies outside the ${image.width}x${image.height} image`);
      }
    });
  }

  const tags: Record<string, FrameTag> = {};
  const meta = isObject(json.meta) ? json.meta : {};
  for (const tag of Array.isArray(meta.frameTags) ? meta.frameTags : []) {
    if (!isObject(tag) || typeof tag.name !== 'string') continue;
    const from = Number(tag.from);
    const to = Number(tag.to);
    if (!(from >= 0 && to >= from && to < parsed.length)) {
      throw new Error(`tag "${tag.name}" runs past the last frame`);
    }
    // Only forward loops are played; reject the rest rather than play them wrong.
    const direction = tag.direction ?? 'forward';
    if (direction !== 'forward') {
      throw new Error(
        `tag "${tag.name}" plays ${JSON.stringify(direction)}; only forward is supported`,
      );
    }
    const ms = parsed.slice(from, to + 1).reduce((sum, f) => sum + f.duration, 0) / (to - from + 1);
    tags[tag.name] = { from, to, fps: 1000 / ms };
  }
  return {
    frames: parsed.map((p) => p.rect),
    tags,
    frameWidth: first.w,
    frameHeight: first.h,
  };
}

/** Which frame of a tag shows `seconds` into playing it on a loop. */
export const frameAt = (tag: FrameTag, seconds: number): number =>
  tag.from + (Math.floor(Math.max(0, seconds) * tag.fps) % (tag.to - tag.from + 1));
