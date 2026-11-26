// The loading screen's walkers, from the loading kit: index.html carries its
// image and CSS (scripts/vite/loadingKit.ts), so they walk from first paint.
// Never emoji: without the kit only the traveller shows, once its still is in.
import { UI_SPRITE_SCALE } from '@/config/ui';
import type { Portraits } from '@/core/portrait';
import { h } from '../dom';

/** Whether index.html brought the kit (its inline script marks <html>). */
export const kitReady = (doc: Document = document): boolean =>
  doc.documentElement.getAttribute('data-kit') === 'ready';

/** One kit walker: the traveller, or today's animal (the kit's CSS picks its row). */
const kitWalker = (who: 'traveller' | 'animal') => h('span', { class: `kit kit--${who}` });

/**
 * The animal behind, the traveller in front, both walking the way they face.
 * Each in a `wrap` span (the card's buddies, the path's walkers).
 */
export function kitParty(wrap: (child: Node, traveller: boolean) => HTMLElement): HTMLElement[] {
  if (!kitReady()) return [];
  return [wrap(kitWalker('animal'), false), wrap(kitWalker('traveller'), true)];
}

/**
 * Without the kit: the traveller alone, as its still (from the portraits,
 * once they load), in `slot`. Nothing at all until then.
 */
export function travellerFallback(slot: HTMLElement, portraits: Portraits | undefined): void {
  if (kitReady() || slot.childElementCount > 0) return;
  void portraits?.(null, false).then((image) => {
    if (!image || slot.childElementCount > 0) return;
    const scale = UI_SPRITE_SCALE.loading;
    slot.append(
      h('img', {
        class: 'portrait__sprite',
        src: image.src,
        alt: '',
        width: image.width * scale,
        height: image.height * scale,
      }),
    );
  });
}
