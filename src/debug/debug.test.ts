// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createBus, type GameEvents } from '@/core/events';
import { ANIMALS, PROMPT } from '@/core/matcher/testFixtures';
import { BACKUP_KEY, SAVE_KEY } from '@/services/saveData';
import { createMemoryStorageAdapter } from '@/services/storage';
import { createDebugPanel, readDebugParams } from './debugPanel';
import { explainGuess } from './explainGuess';

describe('readDebugParams', () => {
  it('is off unless ?debug=1, and only then takes a valid ?date', () => {
    expect(readDebugParams('')).toEqual({ enabled: false, date: null });
    expect(readDebugParams('?date=2026-11-20')).toEqual({ enabled: false, date: null });
    expect(readDebugParams('?debug=1&date=2026-11-20')).toEqual({
      enabled: true,
      date: '2026-11-20',
    });
    expect(readDebugParams('?debug=1&date=tomorrow')).toEqual({ enabled: true, date: null });
  });
});

describe('explainGuess', () => {
  it.each([
    ['Tiger', 'exact', 'Tiger', 'exact'],
    ['orca', 'alias', 'Killer whale', 'close'],
    ['platipus', 'typo', 'Platypus', 'close'],
    ['James', null, null, 'none'],
  ] as const)('%j: %s', (input, strategy, animal, verdict) => {
    const g = explainGuess(input, PROMPT, ANIMALS);
    expect(g).toMatchObject({ strategy, animal, verdict });
    if (strategy) expect(g.confidence).toBeGreaterThan(0);
  });

  it('says when a tie-break picked the answer, and why', () => {
    // Snow leopard and Amur leopard score the same for "leopard"; the lower level wins.
    const g = explainGuess('leopard', PROMPT, ANIMALS);
    expect(g).toMatchObject({ animal: 'Snow leopard', strategy: 'partial' });
    expect(g.tie).toBe('tie with Amur leopard, won by lower level');
    expect(explainGuess('Tiger', PROMPT, ANIMALS).tie).toBeNull();
  });

  it('says when a strategy hit was overruled as a list', () => {
    const g = explainGuess('snow leopard tiger', PROMPT, ANIMALS);
    expect(g.strategy).not.toBeNull();
    expect(g.verdict).toBe('none');
    expect(g.note).toContain('several animals');
  });
});

describe('createDebugPanel', () => {
  const setup = (confirm = true) => {
    const bus = createBus<GameEvents>();
    const storage = createMemoryStorageAdapter();
    storage.set(SAVE_KEY, { some: 'save' });
    storage.set(BACKUP_KEY, 'old');
    const navigate = vi.fn();
    const panel = createDebugPanel({
      bus,
      puzzle: { date: '2026-11-16', number: 11, prompts: [PROMPT] },
      animals: ANIMALS,
      storage,
      dateKey: '2026-11-16',
      navigate,
      confirm: () => confirm,
    });
    document.body.replaceChildren(panel.el);
    const button = (text: string) =>
      [...panel.el.querySelectorAll('button')].find((b) => b.textContent === text)!;
    return { bus, storage, navigate, panel, button };
  };

  it('logs how the matcher read each guess, newest first', () => {
    const t = setup();
    t.bus.emit('roundStarted', { index: 0, prompt: PROMPT, endsAt: 0 });
    t.bus.emit('answerRejected', { round: 0, input: 'James' });
    t.bus.emit('answerSuggested', { round: 0, input: 'orca', suggestion: 'Killer whale' });
    const lines = [...t.panel.el.querySelectorAll('.debug__log li')].map((li) => li.textContent);
    expect(lines[0]).toContain('alias');
    expect(lines[0]).toContain('Killer whale');
    expect(lines[1]).toContain('no strategy matched');
  });

  it('opens another date, or today', () => {
    const t = setup();
    t.panel.el.querySelector<HTMLInputElement>('.debug__date')!.value = '2026-11-20';
    t.button('Play this date').click();
    expect(t.navigate).toHaveBeenLastCalledWith('?debug=1&date=2026-11-20');
    t.button('Today').click();
    expect(t.navigate).toHaveBeenLastCalledWith('?debug=1');
  });

  it('wipes the save after asking, and keeps it if not', () => {
    const keep = setup(false);
    keep.button('Reset progress').click();
    expect(keep.storage.get(SAVE_KEY)).not.toBeNull();
    const wipe = setup(true);
    wipe.button('Reset progress').click();
    expect(wipe.storage.get(SAVE_KEY)).toBeNull();
    expect(wipe.storage.get(BACKUP_KEY)).toBeNull();
    expect(wipe.navigate).toHaveBeenCalled();
  });
});
