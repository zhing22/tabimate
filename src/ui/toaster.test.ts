// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { TOAST } from '@/config/collection';
import { createToaster } from './components/toaster';
import type { Delay } from './frames';

/** A delay the test drives: advance(ms) runs whatever falls due. */
function fakeDelay() {
  let now = 0;
  let timers: { at: number; fn: () => void; id: number }[] = [];
  let next = 0;
  const delay: Delay = (fn, ms) => {
    const id = next++;
    timers.push({ at: now + ms, fn, id });
    return () => (timers = timers.filter((t) => t.id !== id));
  };
  const advance = (ms: number) => {
    now += ms;
    for (const t of timers.filter((x) => x.at <= now)) {
      timers = timers.filter((x) => x.id !== t.id);
      t.fn();
    }
  };
  return { delay, advance };
}

function setup() {
  const layer = document.createElement('div');
  document.body.replaceChildren(layer);
  const time = fakeDelay();
  const toaster = createToaster(layer, time.delay);
  const open = vi.fn();
  toaster.show({
    icon: '🔥',
    title: 'Streak',
    text: 'Three days.',
    open,
    openLabel: 'Open achievements',
  });
  toaster.show({ icon: '📖', title: 'Journal', text: '2 new animals added' });
  const button = () => layer.querySelector<HTMLButtonElement>('.toast__open');
  return { layer, time, open, button };
}

describe('toaster', () => {
  it('gives an action toast a small, labelled Open button; the rest of the toast takes no taps', () => {
    const t = setup();
    expect(t.layer.querySelector('.toast')?.tagName).toBe('DIV');
    expect(t.button()?.getAttribute('aria-label')).toBe('Open achievements: Streak');
    t.button()!.click();
    expect(t.open).toHaveBeenCalledOnce();
    expect(t.layer.textContent).toContain('Journal'); // the next one shows
  });

  it('stays while its button has focus, then a little longer once focus leaves', () => {
    const t = setup();
    t.button()!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    t.time.advance(TOAST.showMs * 3);
    expect(t.layer.textContent).toContain('Streak');
    t.button()!.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    t.time.advance(TOAST.resumeMs - 1);
    expect(t.layer.textContent).toContain('Streak');
    t.time.advance(1);
    expect(t.layer.textContent).toContain('Journal');
  });

  it('stays while the pointer is over its button, even after focus leaves', () => {
    const t = setup();
    t.button()!.dispatchEvent(new Event('pointerenter'));
    t.button()!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    t.button()!.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    t.time.advance(TOAST.showMs * 3);
    expect(t.layer.textContent).toContain('Streak');
    t.button()!.dispatchEvent(new Event('pointerleave'));
    t.time.advance(TOAST.resumeMs);
    expect(t.layer.textContent).toContain('Journal');
  });

  it('times a plain toast out as before, with no button', () => {
    const t = setup();
    t.time.advance(TOAST.showMs);
    expect(t.layer.querySelector('.toast__open')).toBeNull();
    t.time.advance(TOAST.showMs);
    expect(t.layer.textContent).toBe('');
  });
});

describe('toaster while the scene is hidden', () => {
  it('keeps toasts queued while blocked, then shows them in turn', () => {
    const layer = document.createElement('div');
    document.body.replaceChildren(layer);
    const time = fakeDelay();
    let blocked = true;
    const toaster = createToaster(layer, time.delay, () => blocked);
    toaster.show({ icon: '🔥', title: 'Streak', text: 'Three days.' });
    toaster.show({ icon: '📖', title: 'Journal', text: '2 new animals added' });
    expect(layer.textContent).toBe('');
    time.advance(TOAST.blockedRetryMs * 3);
    expect(layer.textContent).toBe('');
    blocked = false;
    time.advance(TOAST.blockedRetryMs);
    expect(layer.textContent).toContain('Streak');
    time.advance(TOAST.showMs);
    expect(layer.textContent).toContain('Journal');
  });
});

describe('toaster timing and repeats', () => {
  it('goes by itself after five seconds, and never shows the same note twice', () => {
    expect(TOAST.showMs).toBe(5_000);
    const layer = document.createElement('div');
    document.body.replaceChildren(layer);
    const time = fakeDelay();
    const toaster = createToaster(layer, time.delay);
    const note = { icon: '📖', title: 'Field Journal', text: '7 new animals added' };
    toaster.show(note);
    expect(layer.textContent).toContain('Field Journal');
    time.advance(TOAST.showMs);
    expect(layer.textContent).toBe('');
    toaster.show({ ...note }); // a screen opening again must not replay it
    expect(layer.textContent).toBe('');
  });
});
