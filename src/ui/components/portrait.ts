import type { Portraits } from '@/core/portrait';
import type { Animal } from '@/core/types';
import { h } from '../dom';

/** The traveller, until a sprite says otherwise. */
const PLAYER_EMOJI = '🧑';

export interface PortraitOptions {
  /** Screen pixels per sprite pixel: a whole number keeps the art crisp. */
  readonly scale: number;
  readonly portraits?: Portraits | undefined;
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
