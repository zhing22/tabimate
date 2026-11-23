import type { RevealTiming } from '@/config/game';
import type { Clock } from '@/core/clock';
import type { Collection } from '@/core/collection';
import type { InstallOffer } from '@/core/install';
import type { GameBus } from '@/core/events';
import type { GameController } from '@/core/gameController';
import type { Backdrops, Portraits } from '@/core/portrait';
import type { ShareOutcome } from '@/core/share';
import type { DayStats } from '@/core/stats';
import type { Stats, StreakStatus } from '@/core/streak';
import type { Animal, AnimalId, DateKey, Puzzle } from '@/core/types';
import type { Delay, FrameLoop } from './frames';
import type { ScreenHost } from './host';
import type { FinishedRun } from './resultsProps';

export interface AppDeps {
  readonly host: ScreenHost;
  readonly bus: GameBus;
  readonly controller: GameController;
  readonly puzzle: Puzzle;
  readonly animals: ReadonlyMap<AnimalId, Animal>;
  readonly clock: Clock;
  readonly getStats: () => Stats;
  /** Today's streak, and whether a freeze is holding it (the start screen says so). */
  readonly getStreakStatus: () => StreakStatus;
  /** The saved Field Journal and achievements. */
  readonly getCollection: () => Collection;
  /** Loads the page again, e.g. when a new puzzle is out. */
  readonly reload: () => void;
  /** Pictures of the sprites, from the scene; without them the results use emoji. */
  readonly portraits?: Portraits;
  /** Pictures of any animal, for the Field Journal; else it uses `portraits`. */
  readonly journalPortraits?: Portraits | undefined;
  /** Stills of the biomes, from the scene: the line-up stands in one. */
  readonly backdrops?: Backdrops;
  /** Shares a finished run (main.ts builds the text; see services/share.ts). */
  readonly share: (run: FinishedRun) => Promise<ShareOutcome>;
  /** Saves the run's team image as a file; absent where none can be made. */
  readonly saveImage?: (run: FinishedRun) => void;
  /** Players' picks for a day (player stats); absent or null: the results show no shares. */
  readonly dayStats?: (dateKey: DateKey) => Promise<DayStats | null>;
  /** The "Install Tabimate" hint's browser side. */
  readonly install?: InstallOffer;
  /** The reveal's beats; tests pass INSTANT_REVEAL. */
  readonly revealTiming?: RevealTiming;
  readonly frames?: FrameLoop;
  readonly delay?: Delay;
}

export interface App {
  /** Shows the start screen (when there was no saved run to restore). */
  showStart(): void;
  /**
   * Shows the results. main.ts calls it after recording the run, instead of a
   * runFinished listener here, so the streak never depends on which listener
   * subscribed first.
   */
  showResults(run: FinishedRun): void;
  destroy(): void;
}
