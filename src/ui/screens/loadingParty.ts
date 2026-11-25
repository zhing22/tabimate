// The loading card's centre: the traveller and an animal walking in place.
import { UI_SPRITE_SCALE } from '@/config/ui';
import type { Portraits } from '@/core/portrait';
import type { Animal } from '@/core/types';
import { portrait } from '../components/portrait';
import { h } from '../dom';

export interface LoadingParty {
  readonly el: HTMLElement;
  /** Once the animals are in: this animal and the traveller as pixel sprites (emoji until ready). */
  show(animal: Animal, portraits: Portraits | undefined): void;
}

/**
 * The animal behind, the traveller in front, both facing the way they walk.
 * Emoji at first (nothing has loaded yet), so the card moves from the start.
 */
export function loadingParty(animalEmoji: string): LoadingParty {
  const walker = (child: Node | string, extra = '') =>
    h('span', { class: `loading__buddy${extra}` }, child);
  const el = h(
    'div',
    { class: 'loading__hero', 'aria-hidden': 'true' },
    walker(animalEmoji),
    walker('🧑', ' loading__buddy--traveller'),
  );
  return {
    el,
    show(animal, portraits) {
      const sprite = { scale: UI_SPRITE_SCALE.loading, portraits, walking: true };
      el.replaceChildren(
        walker(portrait(animal, false, sprite)),
        walker(portrait(null, false, sprite), ' loading__buddy--traveller'),
      );
    },
  };
}

/**
 * The animal to show: one whose emoji is the one already walking (so the
 * swap to its sprite looks like the same animal), else any.
 */
export function pickWalker(
  animals: Iterable<Animal>,
  emoji: string,
  random: () => number = Math.random,
): Animal | null {
  const all = [...animals];
  const same = all.filter((a) => a.emoji === emoji);
  const pool = same.length ? same : all;
  return pool[Math.floor(random() * pool.length)] ?? null;
}
