import type { SoundSetting } from '../components/settingsMenu';

/** Typing in a box (the answer, a search) must never toggle the sound. */
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * The M key flips the sound on computers (the same setting as the settings
 * menu), and says which way it went.
 */
export function watchMuteKey(
  sound: SoundSetting,
  announce: (text: string) => void,
  doc: Document = document,
): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== 'm' || event.repeat) return;
    if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
    sound.setMuted(!sound.muted);
    announce(sound.muted ? 'Sound off' : 'Sound on');
  };
  doc.addEventListener('keydown', onKey);
  return () => doc.removeEventListener('keydown', onKey);
}
