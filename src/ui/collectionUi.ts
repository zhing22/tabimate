// The collection's part of the UI: the Field Journal screen, and toasts for
// achievements and new journal animals. Driven by bus events; reads the
// saved collection through an injected getter (main.ts passes progress).
import type { Collection } from '@/core/collection';
import { dailyKey } from '@/core/date';
import type { GameBus } from '@/core/events';
import { isInJournal, journalSize } from '@/core/journal/journal';
import type { Portraits } from '@/core/portrait';
import type { Stats } from '@/core/streak';
import type { Clock } from '@/core/clock';
import type { AnimalId, AnimalLookup, RoundResult } from '@/core/types';
import { createToaster } from './components/toaster';
import type { Delay } from './frames';
import type { ScreenHost } from './host';
import { badgeLines, journalTabs } from './journalView';
import { historyScreen } from './screens/history';
import { journalScreen } from './screens/journal';

export interface CollectionUiDeps {
  readonly host: ScreenHost;
  readonly bus: GameBus;
  readonly animals: AnimalLookup;
  readonly getCollection: () => Collection;
  readonly getStats: () => Stats;
  readonly clock: Clock;
  readonly portraits?: Portraits | undefined;
  readonly delay?: Delay | undefined;
}

const animalsText = (n: number) => (n === 1 ? '1 new animal' : `${n} new animals`);

export function createCollectionUi(deps: CollectionUiDeps) {
  const { host, bus, animals } = deps;
  const toaster = createToaster(host.toasts, deps.delay);
  const stops = [
    bus.on('journalUpdated', ({ newlyFound }) => {
      if (newlyFound.length === 0) return;
      toaster.show({
        icon: '📖',
        title: 'Field Journal',
        text: `${animalsText(newlyFound.length)} added`,
      });
    }),
    bus.on('achievementUnlocked', ({ achievement }) =>
      toaster.show({
        icon: achievement.icon,
        title: achievement.name,
        text: achievement.description,
      }),
    ),
  ];

  return {
    /** Opens the journal; `back` shows the screen it was opened from. */
    openJournal(back: () => void) {
      const collection = deps.getCollection();
      host.show(
        journalScreen,
        {
          tabs: journalTabs(animals, collection),
          badges: badgeLines(collection),
          found: journalSize(collection.journal),
          total: animals.size,
          portraits: deps.portraits,
        },
        { close: back },
      );
    },
    /** Opens the history calendar; `back` as for the journal. */
    openHistory(back: () => void) {
      host.show(
        historyScreen,
        { stats: deps.getStats(), animals, todayKey: dailyKey(deps.clock.now()) },
        { close: back },
      );
    },
    /** The start and results screens' journal and history buttons. */
    links(back: () => void) {
      return { journal: () => this.openJournal(back), history: () => this.openHistory(back) };
    },
    /** A first-ever find: not in the saved journal, nor answered earlier today. */
    isNewToJournal(id: AnimalId, earlier: readonly RoundResult[]): boolean {
      return (
        !isInJournal(deps.getCollection().journal, id) &&
        !earlier.some((r) => r.match.animalId === id)
      );
    },
    destroy() {
      for (const stop of stops) stop();
      toaster.destroy();
    },
  };
}
