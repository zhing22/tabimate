import { describe, expect, it } from 'vitest';
import { planAnswers } from './answers';
import { sheetLayout } from './sheetLayout';

const prompt = (...levels: number[]) => ({
  answers: levels.map((level) => ({ animalId: `a${level}`, level })),
});

describe('planAnswers', () => {
  it('captures each level once, taking the lowest missing level each prompt has', () => {
    const plan = planAnswers(
      [prompt(1, 2, 5), prompt(1, 2, 5), prompt(1, 3), prompt(1, 2, 5), prompt(4), prompt(1)],
      (id) => id.toUpperCase(),
    );
    expect(plan.map((p) => p.capture)).toEqual([
      'reveal-1',
      'reveal-2',
      'reveal-3',
      'reveal-5',
      'reveal-4',
      null,
    ]);
    expect(plan.map((p) => p.text)).toEqual(['A1', 'A2', 'A3', 'A5', 'A4', 'A1']);
  });
});

describe('sheetLayout', () => {
  const o = { rowHeight: 100, gap: 10, labelHeight: 20 };

  it('puts upright shots on the first row and wide ones on the second, at the row height', () => {
    const { placed, width, height } = sheetLayout(
      [
        { label: 'phone', width: 50, height: 100 },
        { label: 'wide', width: 200, height: 100 },
        { label: 'tablet', width: 75, height: 100 },
      ],
      o,
    );
    expect(placed).toEqual([
      { index: 0, left: 10, top: 10, width: 50, height: 100 },
      { index: 2, left: 70, top: 10, width: 75, height: 100 },
      { index: 1, left: 10, top: 140, width: 200, height: 100 },
    ]);
    expect(width).toBe(220);
    expect(height).toBe(270);
  });

  it('leaves out an empty row', () => {
    const { height } = sheetLayout([{ label: 'wide', width: 300, height: 100 }], o);
    expect(height).toBe(140);
  });
});
