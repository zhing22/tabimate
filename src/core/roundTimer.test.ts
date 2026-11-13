import { describe, expect, it, vi } from 'vitest';
import { createRoundTimer } from './roundTimer';
import { createFakeTime } from './testFakes';

describe('createRoundTimer', () => {
  it('hands the text in the box to onExpire when time runs out', () => {
    const time = createFakeTime();
    const timer = createRoundTimer(time.scheduler);
    const onExpire = vi.fn();
    timer.start(1_000, onExpire);
    timer.setDraft('platypus');
    time.advance(999);
    expect(onExpire).not.toHaveBeenCalled();
    time.advance(1);
    expect(onExpire).toHaveBeenCalledWith('platypus');
  });

  it('forgets the last round when a new one starts', () => {
    const time = createFakeTime();
    const timer = createRoundTimer(time.scheduler);
    const onExpire = vi.fn();
    timer.start(1_000, onExpire);
    timer.setDraft('platypus');
    timer.start(1_000, onExpire);
    expect(timer.draft).toBe('');
    expect(time.pending()).toBe(1); // the old countdown was replaced, not doubled
    time.advance(1_000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(onExpire).toHaveBeenCalledWith('');
  });

  it('cancel stops the countdown', () => {
    const time = createFakeTime();
    const timer = createRoundTimer(time.scheduler);
    const onExpire = vi.fn();
    timer.start(1_000, onExpire);
    timer.cancel();
    time.advance(5_000);
    expect(onExpire).not.toHaveBeenCalled();
    expect(time.pending()).toBe(0);
  });
});
