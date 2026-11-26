// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { card } from './components/card';
import { settingsMenu, type SoundSetting } from './components/settingsMenu';
import { h } from './dom';
import { watchMuteKey } from './layout/muteKey';
import { openPage } from './layout/page';
import { currentLayout, pageOpen, PAGE_CLASS, sceneHidden, startLayout } from './layout/shell';
import { keyboardInset, watchViewport } from './viewport';
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

/** A touch screen (pointer: coarse), where a keyboard can shrink the window. */
const touch = (coarse: boolean) =>
  vi.stubGlobal('matchMedia', () => ({ matches: coarse }) as MediaQueryList);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('startLayout', () => {
  it('picks portrait or landscape from the window shape', () => {
    touch(false);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(844);
    const height = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(390);
    const stop = startLayout();
    expect(currentLayout()).toBe('landscape');
    expect(html().style.getPropertyValue('--panel-w')).toContain('clamp(');
    height.mockReturnValue(1200);
    window.dispatchEvent(new Event('resize'));
    expect(currentLayout()).toBe('portrait');
    stop();
  });

  it('never flips when a keyboard shrinks a touch screen window (same width)', () => {
    touch(true);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
    const height = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(844);
    const stop = startLayout();
    expect(currentLayout()).toBe('portrait');
    height.mockReturnValue(300); // resizes-content: the keyboard takes 544 px
    window.dispatchEvent(new Event('resize'));
    expect(currentLayout()).toBe('portrait');
    stop();
  });

  it('says the scene is hidden only in portrait, under a page', () => {
    html().dataset['layout'] = 'portrait';
    expect(sceneHidden()).toBe(false);
    html().classList.add(PAGE_CLASS);
    expect(sceneHidden()).toBe(true);
    html().dataset['layout'] = 'landscape';
    expect(sceneHidden()).toBe(false);
  });
});

describe('the keyboard inset', () => {
  it('is the layout height the visual viewport leaves out, never negative', () => {
    expect(keyboardInset(844, 508, 0)).toBe(336);
    expect(keyboardInset(844, 508, 20)).toBe(316); // iOS scrolled the visual viewport
    expect(keyboardInset(844, 900, 0)).toBe(0);
  });

  it('holds the keyboard-free height on a touch screen, so the inset covers both kinds of browser', () => {
    touch(true);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(412);
    const height = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(915);
    const vv = { height: 915, offsetTop: 0, addEventListener() {}, removeEventListener() {} };
    vi.stubGlobal('visualViewport', vv);
    const stop = watchViewport();
    const prop = (name: string) => html().style.getPropertyValue(name);
    expect(prop('--kb-inset')).toBe('0px');
    // iOS: the window stays, the visual viewport shrinks.
    vv.height = 585;
    window.dispatchEvent(new Event('resize'));
    expect(prop('--kb-inset')).toBe('330px');
    expect(prop('--app-h')).toBe('915px');
    // Android (resizes-content): the window shrinks too; the layout keeps its height.
    height.mockReturnValue(585);
    window.dispatchEvent(new Event('resize'));
    expect(prop('--app-h')).toBe('915px');
    expect(prop('--kb-inset')).toBe('330px');
    // The keyboard closes: back in place.
    height.mockReturnValue(915);
    vv.height = 915;
    window.dispatchEvent(new Event('resize'));
    expect(prop('--kb-inset')).toBe('0px');
    stop();
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
