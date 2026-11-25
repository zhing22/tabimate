// Composition helpers for main.ts: sound and haptics.
import type { Clock } from '@/core/clock';
import type { GameBus } from '@/core/events';
import type { StorageAdapter } from '@/core/storage';
import { createAudio } from '@/services/audio';
import { createHaptics } from '@/services/haptics';
import type { SoundSetting } from '@/ui/components/settingsMenu';

/**
 * Sound listens to the bus like the scene. It returns the sound setting, for
 * the settings menus and the M key (wired by main.ts). Like the scene it is
 * extra: if it fails the game plays on, silently, with no setting to show.
 */
export function startAudio(
  bus: GameBus,
  storage: StorageAdapter,
  clock: Clock,
): SoundSetting | undefined {
  try {
    return createAudio({ bus, storage, clock });
  } catch (error) {
    console.error('Audio failed to start; playing without sound', error);
    return undefined;
  }
}

/** A buzz per answer on phones that can; muted with the same switch as the sound. */
export function startHaptics(bus: GameBus, storage: StorageAdapter): void {
  try {
    createHaptics({ bus, storage });
  } catch (error) {
    console.error('Haptics failed to start; playing without them', error);
  }
}
