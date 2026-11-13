// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserEnvironment } from './share';

const pointer = (coarse: boolean) =>
  vi
    .spyOn(window, 'matchMedia')
    .mockImplementation(
      (query: string) =>
        ({ matches: coarse && query === '(pointer: coarse)', media: query }) as MediaQueryList,
    );

afterEach(() => vi.restoreAllMocks());

describe('browserEnvironment', () => {
  // jsdom has no matchMedia; give it one to stub.
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({ matches: false, media: query }),
    });
  }

  it('prefers the share sheet on touch devices', () => {
    pointer(true);
    expect(browserEnvironment().preferSheet).toBe(true);
  });

  it('copies on devices with a mouse', () => {
    pointer(false);
    expect(browserEnvironment().preferSheet).toBe(false);
  });

  it('copies by hand through a hidden text box, and tidies up after', () => {
    pointer(false);
    const execCommand = vi.fn(() => true);
    document.execCommand = execCommand;
    expect(browserEnvironment().copyByHand?.('hello')).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });
});
