import type { PortraitImage, Portraits } from '@/core/portrait';
import type { Animal } from '@/core/types';
import { h } from '../dom';

/** The traveller, until a sprite says otherwise. */
const PLAYER_EMOJI = '🧑';

export interface PortraitOptions {
  /** Screen pixels per sprite pixel: a whole number keeps the art crisp. */
  readonly scale: number;
  readonly portraits?: Portraits | undefined;
  /** Play the sprite's walk cycle in place, if it has one (the results line-up). */
  readonly walking?: boolean;
}

/**
 * A character's picture: its emoji at once, swapped for the scene's pixel
 * sprite when that is available (sprites may still be loading on a reload).
 * `animal` null is the player. Decorative: names are always shown as text.
 */
export function portrait(
  animal: Animal | null,
  shiny: boolean,
  opts: PortraitOptions,
): HTMLElement {
  const el = h(
    'span',
    { class: 'portrait', 'aria-hidden': 'true' },
    animal ? animal.emoji : PLAYER_EMOJI,
  );
  void opts.portraits?.(animal, shiny).then((image) => {
    if (!image) return;
    if (opts.walking && image.walk) {
      el.replaceChildren(walkingSprite(image, image.walk, opts.scale));
      el.classList.add('portrait--sprite');
      return;
    }
    const img = h('img', {
      class: 'portrait__sprite',
      src: image.src,
      alt: '',
      width: image.width * opts.scale,
      height: image.height * opts.scale,
    });
    if (image.facesLeft) img.classList.add('portrait__sprite--flip');
    el.replaceChildren(img);
    el.classList.add('portrait--sprite');
  });
  return el;
}

/**
 * The walk cycle as a stepped background animation over the frames strip:
 * CSS plays it (ui/styles/components.css .portrait__walk), so no script runs
 * per frame, and reduced motion stops it on the first frame. The size comes
 * from CSS too: a whole number of device pixels per sprite pixel (--px from
 * --k and --dpr), so every step is exactly one frame wide. The box sits on its
 * feet (bottom-centre) and is nudged onto whole device pixels once shown.
 */
function walkingSprite(
  image: PortraitImage,
  walk: NonNullable<PortraitImage['walk']>,
  scale: number,
): HTMLElement {
  const el = h('span', {
    class: image.facesLeft ? 'portrait__walk portrait__sprite--flip' : 'portrait__walk',
  });
  el.style.setProperty('--fw', String(image.width));
  el.style.setProperty('--fh', String(image.height));
  el.style.setProperty('--frames', String(walk.frames));
  el.style.setProperty('--k-default', String(scale));
  el.style.backgroundImage = `url("${walk.src}")`;
  el.style.setProperty('--walk-s', `${walk.frames / walk.fps}s`);
  snapToDevicePixels(el);
  return el;
}

/**
 * Moves an element by less than a device pixel so its top-left lands on one:
 * otherwise a centred sprite can start half way into a device pixel and its
 * pixels come out uneven.
 */
function snapToDevicePixels(el: HTMLElement): void {
  const win = el.ownerDocument.defaultView;
  if (!win?.requestAnimationFrame) return;
  win.requestAnimationFrame(() => {
    if (!el.isConnected) return;
    const dpr = win.devicePixelRatio || 1;
    const { left, top } = el.getBoundingClientRect();
    const nudge = (v: number) => (Math.round(v * dpr) - v * dpr) / dpr;
    el.style.translate = `${nudge(left)}px ${nudge(top)}px`;
  });
}
