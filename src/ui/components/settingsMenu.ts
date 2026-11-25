import { h } from '../dom';
import type { Component } from './component';

/** The saved sound setting (services/audio.ts; haptics follow it too). */
export interface SoundSetting {
  readonly muted: boolean;
  setMuted(muted: boolean): void;
}

const soundText = (muted: boolean) => (muted ? 'Sound off' : 'Sound on');

/** The menu's Sound switch: pressed means sound on. */
function soundSwitch(sound: SoundSetting): HTMLButtonElement {
  const button = h('button', { class: 'settings__item', type: 'button', role: 'switch' });
  const show = () => {
    button.setAttribute('aria-checked', String(!sound.muted));
    button.textContent = `${sound.muted ? '🔇' : '🔊'} ${soundText(sound.muted)}`;
  };
  show();
  button.addEventListener('click', () => {
    sound.setMuted(!sound.muted);
    show();
  });
  return button;
}

/**
 * A gear in a card header that opens a small menu: for now, Sound on/off
 * (the same saved setting as the M key). Escape or a tap elsewhere closes it.
 */
export function settingsMenu(sound: SoundSetting): Component {
  const gear = h(
    'button',
    {
      class: 'button settings__gear',
      type: 'button',
      'aria-label': 'Settings',
      'aria-expanded': 'false',
      'aria-controls': 'settings-menu',
    },
    '⚙',
  );
  const menu = h('div', { class: 'settings__menu', id: 'settings-menu', hidden: true });
  menu.append(soundSwitch(sound));
  const el = h('div', { class: 'settings' }, gear, menu);

  let open = false;
  const setOpen = (value: boolean) => {
    open = value;
    menu.hidden = !value;
    gear.setAttribute('aria-expanded', String(value));
  };
  gear.addEventListener('click', () => setOpen(!open));
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !open) return;
    event.preventDefault(); // a page's Escape (close) must not fire too
    setOpen(false);
    gear.focus();
  };
  const onPointer = (event: Event) => {
    if (open && event.target instanceof Node && !el.contains(event.target)) setOpen(false);
  };
  // Capture: the menu closes before a page's own Escape listener sees the key.
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onPointer);
  return {
    el,
    destroy() {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer);
      el.remove();
    },
  };
}
