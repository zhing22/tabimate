import type { Portraits } from '@/core/portrait';
import type { Animal } from '@/core/types';
import { card } from '../components/card';
import { themeChip } from '../components/themeChip';
import { wordmark } from '../components/wordmark';
import { h } from '../dom';
import { kitParty, travellerFallback } from './loadingParty';

export interface LoadingProps {
  readonly puzzleNumber: number;
  /** The day's theme, known from the date before anything loads. */
  readonly theme: { readonly name: string } | null;
}

export interface LoadingView {
  readonly el: HTMLElement;
  /** The path and the walkers: on the stage (ui/layout/stage.ts), along the ground. */
  readonly track: HTMLElement;
  /** 0..1: how far along the path the traveller has walked. */
  setProgress(fraction: number): void;
  /** Shows a "Did you know?" line once the animals have loaded. */
  setFact(animal: Pick<Animal, 'display' | 'description'> | null): void;
  /** Without the loading kit: the traveller's still, once the portraits are in. */
  setPortraits(portraits: Portraits | undefined): void;
}

/** "Packing your bag for Fishy Friday…", or plain on a day without a theme. */
export const loadingText = (theme: LoadingProps['theme']): string =>
  theme ? `Packing your bag for ${theme.name}…` : 'Packing your bag…';

/** A random animal that has a description, for the "Did you know?" line. */
export function pickFact(
  animals: Iterable<Animal>,
  random: () => number = Math.random,
): Animal | null {
  const described = [...animals].filter((a) => a.description);
  return described[Math.floor(random() * described.length)] ?? null;
}

/**
 * The first screen: the large wordmark, the day's theme and number, the
 * traveller and an animal walking in place (the loading kit, from first
 * paint), and, once the animals arrive, a fact about one of them
 * (loadingFlow.ts rotates it). The traveller walks a path that is the progress
 * bar, the animal trotting behind: loadingFlow puts it on the stage, along
 * the ground.
 */
export function loadingView(props: LoadingProps): LoadingView {
  const party = h(
    'span',
    { class: 'loading__party', 'aria-hidden': 'true' },
    ...kitParty((child) => h('span', { class: 'loading__walker' }, child)),
  );
  const track = h(
    'div',
    {
      class: 'loading__track',
      role: 'progressbar',
      'aria-label': "Loading today's journey",
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': 0,
    },
    h('span', { class: 'loading__path' }),
    party,
  );
  const fact = h('p', { class: 'loading__fact', hidden: true });
  const hero = h(
    'div',
    { class: 'loading__hero', 'aria-hidden': 'true' },
    ...kitParty((child, traveller) =>
      h(
        'span',
        { class: traveller ? 'loading__buddy loading__buddy--traveller' : 'loading__buddy' },
        child,
      ),
    ),
  );
  const { el } = card({
    className: 'card--journal loading',
    label: `Tabimate #${props.puzzleNumber}`,
    body: [
      h('h1', { class: 'loading__mark' }, wordmark('lg')),
      themeChip(props.puzzleNumber, props.theme?.name ?? null),
      hero,
      h('p', { class: 'meta' }, loadingText(props.theme)),
      fact,
      track,
    ],
  });
  el.setAttribute('aria-busy', 'true');
  return {
    el,
    track,
    setProgress(fraction) {
      const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
      track.style.setProperty('--progress', `${percent}%`);
      track.setAttribute('aria-valuenow', String(percent));
    },
    setPortraits(portraits) {
      travellerFallback(hero, portraits);
    },
    setFact(animal) {
      fact.hidden = !animal?.description;
      fact.replaceChildren(
        ...(animal?.description
          ? [h('strong', {}, 'Did you know? '), `${animal.display}: ${animal.description}`]
          : []),
      );
    },
  };
}
