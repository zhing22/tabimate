// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { h } from './dom';
import { createScreenHost, type Screen } from './host';
import { errorScreen, noPuzzleScreen } from './screens/message';
import { manualTime } from './testUi';

const note: Screen<{ text: string }, object> = (root, props) => {
  const unmount = vi.fn();
  root.append(h('p', { class: 'note' }, props.text));
  return unmount;
};

function setup() {
  document.body.innerHTML = '<main id="ui"></main>';
  const root = document.querySelector<HTMLElement>('#ui')!;
  return { root, host: createScreenHost(root) };
}

describe('createScreenHost', () => {
  it('shows one screen at a time, unmounting the last', () => {
    const { root, host } = setup();
    const unmount = vi.fn();
    host.show((r) => (r.append('first'), unmount), {}, {});
    host.show(note, { text: 'second' }, {});
    expect(unmount).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.screen-layer')?.textContent).toBe('second');
  });

  it('puts an overlay above the screen without removing it', () => {
    const { root, host } = setup();
    host.show(note, { text: 'below' }, {});
    host.showOverlay(note, { text: 'above' }, {});
    expect(root.querySelector('.screen-layer')?.textContent).toBe('below');
    expect(root.querySelector('.overlay-layer')?.textContent).toBe('above');
    host.clearOverlay();
    expect(root.querySelector('.overlay-layer')?.textContent).toBe('');
  });

  it('announces through a live region that survives screen changes', async () => {
    const { root, host } = setup();
    host.announce('Tiger: Endangered');
    host.show(note, { text: 'next' }, {});
    await Promise.resolve();
    const live = root.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe('Tiger: Endangered');
  });
});

describe('message screens', () => {
  it('noPuzzle counts down and reloads when the next puzzle is due', () => {
    const { root, host } = setup();
    const t = manualTime();
    const reload = vi.fn();
    host.show(
      noPuzzleScreen,
      { msUntilNext: () => 3_000 - t.now(), interval: t.interval },
      { reload },
    );
    expect(root.querySelector('.countdown')?.textContent).toBe('00:00:03');
    expect(document.activeElement?.tagName).toBe('H1');
    t.set(3_000);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('error explains and offers a retry, focused', () => {
    const { root, host } = setup();
    const reload = vi.fn();
    host.show(errorScreen, { message: 'data/animals.json: could not be fetched' }, { reload });
    expect(root.textContent).toContain('could not be fetched');
    expect(document.activeElement?.textContent).toBe('Try again');
    (document.activeElement as HTMLButtonElement).click();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
