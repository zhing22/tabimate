// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { card } from './components/card';
import { settingsMenu, type SoundSetting } from './components/settingsMenu';
import { h } from './dom';
import { watchMuteKey } from './layout/muteKey';
import { openPage } from './layout/page';
import {
  currentLayout,
  pageOpen,
  PAGE_CLASS,
  sceneHidden,
  setTyping,
  startLayout,
  TYPING_CLASS,
} from './layout/shell';
import { pressKey } from './testUi';

const html = () => document.documentElement;

/** A sound setting kept in memory. */
function sound(muted = false): SoundSetting {
  let value = muted;
  return {
    get muted() {
      return value;
    },
    setMuted(next) {
      value = next;
    },
  };
}

describe('startLayout', () => {
  it('picks portrait or landscape from the window shape, and holds it while typing', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(844);
    const height = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(390);
    const stop = startLayout();
    expect(currentLayout()).toBe('landscape');
    expect(html().style.getPropertyValue('--panel-w')).toContain('clamp(');
    html().classList.add(TYPING_CLASS);
    height.mockReturnValue(1200);
    window.dispatchEvent(new Event('resize'));
    expect(currentLayout()).toBe('landscape'); // the keyboard must not flip it
    html().classList.remove(TYPING_CLASS);
    window.dispatchEvent(new Event('resize'));
    expect(currentLayout()).toBe('portrait');
    stop();
    vi.restoreAllMocks();
  });

  it('says the scene is hidden only in portrait, under a page or while typing', () => {
    html().dataset['layout'] = 'portrait';
    expect(sceneHidden()).toBe(false);
    html().classList.add(PAGE_CLASS);
    expect(sceneHidden()).toBe(true);
    html().dataset['layout'] = 'landscape';
    expect(sceneHidden()).toBe(false);
  });
});

describe('setTyping', () => {
  it('holds the sheet, the stage and the text size in px in portrait, and lets go after', () => {
    html().dataset['layout'] = 'portrait';
    const ui = h('main', { id: 'ui' });
    const scene = h('div', { id: 'scene' });
    document.body.replaceChildren(scene, ui);
    const rect = (height: number) => ({ height }) as DOMRect;
    vi.spyOn(ui, 'getBoundingClientRect').mockReturnValue(rect(420));
    vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue(rect(218));
    setTyping(true);
    expect(html().classList.contains(TYPING_CLASS)).toBe(true);
    expect(html().style.getPropertyValue('--typing-sheet-h')).toBe('420px');
    expect(html().style.getPropertyValue('--typing-stage-h')).toBe('218px');
    expect(html().style.getPropertyValue('--root-size')).not.toBe('');
    setTyping(false);
    expect(html().classList.contains(TYPING_CLASS)).toBe(false);
    expect(html().style.getPropertyValue('--typing-sheet-h')).toBe('');
    expect(html().style.getPropertyValue('--root-size')).toBe('');
    vi.restoreAllMocks();
  });

  it('holds nothing in landscape', () => {
    html().dataset['layout'] = 'landscape';
    document.body.replaceChildren(h('main', { id: 'ui' }));
    setTyping(true);
    expect(html().style.getPropertyValue('--typing-sheet-h')).toBe('');
    setTyping(false);
  });
});

describe('pageOpen', () => {
  it('is true while a page is open, in either layout', () => {
    html().dataset['layout'] = 'landscape';
    expect(pageOpen()).toBe(false);
    html().classList.add(PAGE_CLASS);
    expect(pageOpen()).toBe(true);
    html().classList.remove(PAGE_CLASS);
  });
});

describe('openPage', () => {
  function page() {
    const first = h('button', {}, 'first');
    const last = h('button', {}, 'last');
    const el = h('section', {}, first, last);
    document.body.replaceChildren(el, h('button', {}, 'outside'));
    return { el, first, last };
  }

  it('marks the page, closes on Escape and on the back gesture, and cleans up', () => {
    const { el } = page();
    const back = vi.fn();
    const close = openPage(el, back);
    expect(html().classList.contains(PAGE_CLASS)).toBe(true);
    pressKey(el, 'Escape');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(back).toHaveBeenCalledTimes(2);
    close();
    expect(html().classList.contains(PAGE_CLASS)).toBe(false);
    pressKey(el, 'Escape');
    expect(back).toHaveBeenCalledTimes(2);
  });

  it('keeps Tab inside the page in portrait', () => {
    html().dataset['layout'] = 'portrait';
    const { el, first, last } = page();
    const close = openPage(el, () => {});
    last.focus();
    pressKey(last, 'Tab');
    expect(document.activeElement).toBe(first);
    close();
  });
});

describe('watchMuteKey', () => {
  it('flips the sound with M, never while typing in a box', () => {
    const setting = sound();
    const said: string[] = [];
    const stop = watchMuteKey(setting, (text) => said.push(text));
    pressKey(document.body, 'm');
    expect(setting.muted).toBe(true);
    const input = h('input', {});
    document.body.append(input);
    pressKey(input, 'm');
    expect(setting.muted).toBe(true);
    expect(said).toEqual(['Sound off']);
    stop();
  });
});

describe('settingsMenu', () => {
  it('opens to a Sound switch that flips the setting, and closes on Escape', () => {
    const setting = sound(true);
    const menu = settingsMenu(setting);
    document.body.replaceChildren(menu.el);
    const gear = menu.el.querySelector<HTMLButtonElement>('.settings__gear')!;
    gear.click();
    expect(gear.getAttribute('aria-expanded')).toBe('true');
    const toggle = menu.el.querySelector<HTMLButtonElement>('[role="switch"]')!;
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    toggle.click();
    expect(setting.muted).toBe(false);
    expect(toggle.textContent).toContain('Sound on');
    pressKey(document.body, 'Escape');
    expect(gear.getAttribute('aria-expanded')).toBe('false');
    menu.destroy();
  });
});

describe('card', () => {
  it('has a header, a scrolling body and a footer, named by its title', () => {
    const back = vi.fn();
    const shown = card({
      className: 'test',
      title: h('h1', { id: 't' }, 'Title'),
      meta: '3 of 5',
      back,
      body: [h('p', {}, 'body')],
      footer: [h('button', {}, 'Go')],
    });
    expect(shown.el.getAttribute('aria-labelledby')).toBe('t');
    expect(shown.el.querySelector('.card__meta')?.textContent).toBe('3 of 5');
    shown.el.querySelector<HTMLButtonElement>('.card__back')!.click();
    expect(back).toHaveBeenCalled();
    expect(shown.body.textContent).toBe('body');
    expect(shown.footer?.textContent).toBe('Go');
  });

  it('leaves out an empty header and footer', () => {
    const shown = card({ className: 'test', label: 'Bare', body: ['x'] });
    expect(shown.el.querySelector('.card__header')).toBeNull();
    expect(shown.footer).toBeNull();
    expect(shown.el.getAttribute('aria-label')).toBe('Bare');
  });
});
