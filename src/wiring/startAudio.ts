// Composition helper for main.ts: sound, and the corner mute button.
import type { Clock } from '@/core/clock';
import type { GameBus } from '@/core/events';
import type { StorageAdapter } from '@/core/storage';
import { createAudio } from '@/services/audio';
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
