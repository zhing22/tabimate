import { achievementById } from './achievements/registry';
import type { CollectedRun } from './collection';
import type { GameBus } from './events';
import type { DateKey } from './types';

/** Tells listeners what a recorded run added: the journal, then each new achievement. */
export function emitCollected(bus: GameBus, collected: CollectedRun, key: DateKey): void {
  bus.emit('journalUpdated', {
    journal: collected.collection.journal,
    newlyFound: collected.newlyFound,
  });
  for (const id of collected.unlocked) {
    const achievement = achievementById(id);
    if (achievement) bus.emit('achievementUnlocked', { achievement, unlockedKey: key });
  }
}
