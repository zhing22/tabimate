import type { Animal } from '@/core/types';
import { card } from '../components/card';
import { h } from '../dom';

export interface LoadingProps {
  readonly puzzleNumber: number;
  /** The day's theme, known from the date before anything loads. */
  readonly theme: { readonly name: string } | null;
  /** Walks behind the traveller. */
  readonly animalEmoji: string;
}

export interface LoadingView {
  readonly el: HTMLElement;
  /** 0..1: how far along the path the traveller has walked. */
  setProgress(fraction: number): void;
  /** Shows a "Did you know?" line once the animals have loaded. */
  setFact(animal: Pick<Animal, 'display' | 'description'> | null): void;
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
 * The first screen: the traveller walks a path that is the progress bar, an
 * animal trotting behind, with the puzzle number, the day's theme and, once
 * the animals arrive, a fact about one of them.
 */
export function loadingView(props: LoadingProps): LoadingView {
  const party = h(
    'span',
    { class: 'loading__party', 'aria-hidden': 'true' },
    h('span', { class: 'loading__walker' }, props.animalEmoji),
    h('span', { class: 'loading__walker' }, '🧑'),
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
  const { el } = card({
    className: 'card--journal loading',
    title: h(
      'h1',
      { id: 'loading-title', class: 'title title--sm' },
      `Tabimate #${props.puzzleNumber}`,
    ),
    body: [
      props.theme ? h('p', { class: 'loading__theme' }, props.theme.name) : null,
      track,
      h('p', { class: 'meta' }, loadingText(props.theme)),
      fact,
    ],
  });
  el.setAttribute('aria-busy', 'true');
  return {
    el,
    setProgress(fraction) {
      const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
      track.style.setProperty('--progress', `${percent}%`);
      track.setAttribute('aria-valuenow', String(percent));
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
