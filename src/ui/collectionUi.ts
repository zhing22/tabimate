// The collection's part of the UI: the Field Journal, Achievements and
// History screens, and toasts for achievements (tap one to open its page)
// and new journal animals. Driven by bus events; reads the
// saved collection through an injected getter (main.ts passes progress).
import type { Collection } from '@/core/collection';
import { dailyKey } from '@/core/date';
import type { GameBus } from '@/core/events';
import { isInJournal, journalSize } from '@/core/journal/journal';
import type { Portraits } from '@/core/portrait';
import type { Stats } from '@/core/streak';
import type { Clock } from '@/core/clock';
import type { AnimalId, AnimalLookup, RoundResult } from '@/core/types';
import type { SoundSetting } from './components/settingsMenu';
import { createToaster } from './components/toaster';
import type { Delay } from './frames';
import type { ScreenHost } from './host';
import { sceneHidden } from './layout/shell';
import { createScreenLoader, type OpenScreen } from './screenLoader';

// The collection pages load on first open (screenLoader.ts): they are not needed to play.
const loadJournal = () => Promise.all([import('./screens/journal'), import('./journalView')]);
const loadAchievements = () =>
  Promise.all([import('./screens/achievements'), import('./achievementsView')]);
const loadHistory = () => import('./screens/history');

export interface CollectionUiDeps {
  readonly host: ScreenHost;
  readonly bus: GameBus;
  readonly animals: AnimalLookup;
  readonly getCollection: () => Collection;
  readonly getStats: () => Stats;
  readonly clock: Clock;
  readonly portraits?: Portraits | undefined;
  readonly delay?: Delay | undefined;
  readonly sound?: SoundSetting | undefined;
  /** Shared with the results, so only the screen asked for last shows. */
  readonly openScreen?: OpenScreen | undefined;
}

const animalsText = (n: number) => (n === 1 ? '1 new animal' : `${n} new animals`);

export function createCollectionUi(deps: CollectionUiDeps) {
  const { host, bus, animals } = deps;
  // Toasts show over the scene: they wait while a reveal is up or the scene is hidden.
  const toaster = createToaster(host.toasts, deps.delay, () => host.hasOverlay || sceneHidden());
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
        openLabel: 'Open achievements',
        // Back from the page goes to the screen the toast showed over.
        open: () => ui.openAchievements(lastBack, achievement.id, lastHome),
      }),
    ),
  ];

  // The start or results screen last shown: where a tapped toast's page goes back
  // to (Back), and the screen under every page (×: start or the results summary).
  let lastBack: () => void = () => {};
  let lastHome: () => void = () => {};
  const open = deps.openScreen ?? createScreenLoader();

  const ui = {
    /** Opens the journal; `back` shows the screen it was opened from, `home` the one under every page. */
    openJournal(back: () => void, home: () => void = back) {
      open(loadJournal, ([{ journalScreen }, { journalTabs }]) => {
        const collection = deps.getCollection();
        host.show(
          journalScreen,
          {
            tabs: journalTabs(animals, collection),
            found: journalSize(collection.journal),
            total: animals.size,
            portraits: deps.portraits,
            sound: deps.sound,
          },
          { close: back, dismiss: home },
        );
      });
    },
    /** Opens the Achievements page, at one achievement if given; `back` as for the journal. */
    openAchievements(back: () => void, focusId?: string, home: () => void = back) {
      open(loadAchievements, ([{ achievementsScreen }, { badgeSections }]) => {
        const stats = deps.getStats();
        const record = { history: stats.history, stats, animals };
        host.show(
          achievementsScreen,
          { sections: badgeSections(deps.getCollection(), record), focusId, sound: deps.sound },
          { close: back, dismiss: home },
        );
      });
    },
    /** Opens the history calendar; `back` as for the journal. */
    openHistory(back: () => void, home: () => void = back) {
      open(loadHistory, ({ historyScreen }) =>
        host.show(
          historyScreen,
          {
            stats: deps.getStats(),
            animals,
            todayKey: dailyKey(deps.clock.now()),
            sound: deps.sound,
          },
          { close: back, dismiss: home },
        ),
      );
    },
    /**
     * The start, results and summary screens' Journal, Achievements and History
     * tiles: Back returns to `back`, × to `home` (the screen under every page).
     */
    links(back: () => void, home: () => void = back) {
      lastBack = back;
      lastHome = home;
      return {
        journal: () => ui.openJournal(back, home),
        achievements: () => ui.openAchievements(back, undefined, home),
        history: () => ui.openHistory(back, home),
      };
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
  return ui;
}
