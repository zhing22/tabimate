// Composition helpers for main.ts: sound, the corner mute button, and haptics.
import type { Clock } from '@/core/clock';
import type { GameBus } from '@/core/events';
import type { StorageAdapter } from '@/core/storage';
import { createAudio } from '@/services/audio';
import { createHaptics } from '@/services/haptics';
import { muteButton } from '@/ui/components/muteButton';

/**
 * Sound listens to the bus like the scene; the corner button only flips mute.
 * Like the scene, it is extra: if it fails the game plays on, silently.
 */
export function startAudio(bus: GameBus, storage: StorageAdapter, clock: Clock): void {
  try {
    const audio = createAudio({ bus, storage, clock });
    const toggle = muteButton({
      muted: audio.muted,
      onToggle: () => {
        audio.setMuted(!audio.muted);
        return audio.muted;
      },
    });
    document.body.append(toggle.el);
  } catch (error) {
    console.error('Audio failed to start; playing without sound', error);
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
