import { h } from '../dom';
import type { Component } from './component';

export interface MuteButtonProps {
  readonly muted: boolean;
  /** Flips the setting and returns the new value (main.ts wires it to the audio). */
  onToggle(): boolean;
}

/**
 * A sound on/off toggle that floats in the corner on every screen. Pressing it
 * never takes focus from the answer box (that would close a phone keyboard).
 */
export function muteButton(props: MuteButtonProps): Component {
  const el = h('button', { class: 'mute-button', type: 'button', 'aria-label': 'Sound' });
  const show = (muted: boolean) => {
    el.textContent = muted ? '🔇' : '🔊';
    el.setAttribute('aria-pressed', String(!muted));
    el.title = muted ? 'Sound off' : 'Sound on';
  };
  show(props.muted);
  el.addEventListener('mousedown', (event) => event.preventDefault());
  el.addEventListener('click', () => show(props.onToggle()));
  return { el, destroy: () => el.remove() };
}
