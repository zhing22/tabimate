// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANIMALS } from '@/core/matcher/testFixtures';
import type { Portraits } from '@/core/portrait';
import { journalGrid } from './components/journalGrid';
import type { JournalCell } from './journalView';

const entry = { animalId: 'x', firstFoundKey: '2026-11-01', timesFound: 1, bestLevel: 1 } as const;
const cells: JournalCell[] = ['tiger', 'platypus'].map((id) => ({
  animal: ANIMALS.get(id)!,
  entry: { ...entry, animalId: id },
}));

/** A stand-in IntersectionObserver the test drives by hand. */
function fakeObserver() {
  let callback: IntersectionObserverCallback = () => {};
  const observed = new Set<Element>();
  const disconnect = vi.fn();
  class Fake {
    constructor(cb: IntersectionObserverCallback) {
      callback = cb;
    }
    observe = (el: Element) => observed.add(el);
    unobserve = (el: Element) => observed.delete(el);
    disconnect = disconnect;
  }
  vi.stubGlobal('IntersectionObserver', Fake);
  const show = (el: Element) =>
    callback([{ target: el, isIntersecting: true } as IntersectionObserverEntry], {} as never);
  return { observed, show, disconnect };
}

afterEach(() => vi.unstubAllGlobals());

describe('journalGrid', () => {
  it('asks for a sprite only once its cell scrolls into view', () => {
    const io = fakeObserver();
    const portraits = vi.fn<Portraits>(() => Promise.resolve(null));
    const grid = journalGrid(cells, { portraits, open: () => {} });
    expect(portraits).not.toHaveBeenCalled();
    expect(io.observed.size).toBe(2);
    io.show([...io.observed][1]!);
    expect(portraits).toHaveBeenCalledTimes(1);
    expect(portraits.mock.calls[0]![0]).toBe(cells[1]!.animal);
    expect(io.observed.size).toBe(1); // a loaded cell is no longer watched
    grid.destroy();
    expect(io.disconnect).toHaveBeenCalled();
  });

  it('loads every sprite at once where there is no IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const portraits = vi.fn<Portraits>(() => Promise.resolve(null));
    journalGrid(cells, { portraits, open: () => {} });
    expect(portraits).toHaveBeenCalledTimes(2);
  });
});
