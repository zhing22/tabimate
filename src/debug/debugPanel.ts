// A hidden panel for testing and playtests, shown only with ?debug=1:
// play another day's puzzle, see how the matcher read each guess, and wipe
// this browser's saved progress. Never shown to players who don't ask for it.
import { isDateKey } from '@/core/date';
import type { GameBus } from '@/core/events';
import type { StorageAdapter } from '@/core/storage';
import type { Animal, AnimalId, DateKey, Prompt, Puzzle } from '@/core/types';
import { BACKUP_KEY, SAVE_KEY } from '@/services/saveData';
import { h } from '@/ui/dom';
import { explainGuess, type GuessExplained } from './explainGuess';

const MAX_LOG = 8;

/** The debug options in a page URL: whether the panel is on, and a date to play. */
export function readDebugParams(search: string): { enabled: boolean; date: DateKey | null } {
  const params = new URLSearchParams(search);
  const enabled = params.get('debug') === '1';
  const date = params.get('date');
  return { enabled, date: enabled && date !== null && isDateKey(date) ? date : null };
}

export interface DebugPanelDeps {
  /** Absent when there is no puzzle to play (so nothing to explain). */
  readonly bus?: GameBus | undefined;
  readonly puzzle: Puzzle | null;
  readonly animals: ReadonlyMap<AnimalId, Animal>;
  readonly storage: StorageAdapter;
  /** The puzzle key in use (today's, or the ?date override). */
  readonly dateKey: DateKey;
  /** Opens the page with these debug options, e.g. another date. */
  readonly navigate: (search: string) => void;
  readonly confirm: (question: string) => boolean;
}

const line = (g: GuessExplained) =>
  [
    `"${g.input}" -> "${g.normalized}"`,
    g.strategy ? `${g.strategy} ${g.confidence?.toFixed(2)}` : 'no strategy matched',
    g.animal ? `${g.animal} (tier ${g.tier})` : '',
    `=> ${g.verdict}${g.note ? ` (${g.note})` : ''}`,
  ]
    .filter(Boolean)
    .join(' · ');

export function createDebugPanel(deps: DebugPanelDeps): { el: HTMLElement; destroy(): void } {
  const log = h('ol', { class: 'debug__log', reversed: true });
  const dateInput = h('input', { type: 'date', value: deps.dateKey, class: 'debug__date' });
  const go = h('button', { type: 'button' }, 'Play this date');
  const today = h('button', { type: 'button' }, 'Today');
  const reset = h('button', { type: 'button' }, 'Reset progress');
  const el = h(
    'details',
    // Starts folded to one line, so it never covers the game until asked.
    { class: 'debug' },
    h(
      'summary',
      {},
      `debug · ${deps.dateKey}${deps.puzzle ? ` · #${deps.puzzle.number}` : ' · no puzzle'}`,
    ),
    h('div', { class: 'debug__row' }, dateInput, go, today),
    h('div', { class: 'debug__row' }, reset),
    h('p', { class: 'debug__hint' }, 'Guesses (newest first):'),
    log,
  );

  go.addEventListener('click', () => {
    if (isDateKey(dateInput.value)) deps.navigate(`?debug=1&date=${dateInput.value}`);
  });
  today.addEventListener('click', () => deps.navigate('?debug=1'));
  reset.addEventListener('click', () => {
    if (!deps.confirm("Delete this browser's Tabimate save (runs, streak, history)?")) return;
    deps.storage.remove(SAVE_KEY);
    deps.storage.remove(BACKUP_KEY);
    deps.navigate(location.search);
  });

  let prompt: Prompt | null = null;
  const add = (input: string) => {
    if (!prompt) return;
    log.prepend(h('li', {}, line(explainGuess(input, prompt, deps.animals))));
    while (log.children.length > MAX_LOG) log.lastElementChild?.remove();
  };
  const bus = deps.bus;
  const stops = !bus
    ? []
    : [
        bus.on('roundStarted', ({ prompt: p }) => (prompt = p)),
        bus.on('answerRejected', ({ input }) => add(input)),
        bus.on('answerSuggested', ({ input }) => add(input)),
        bus.on('answerMatched', ({ result }) => add(result.match.input)),
      ];
  return {
    el,
    destroy() {
      for (const stop of stops) stop();
      el.remove();
    },
  };
}
