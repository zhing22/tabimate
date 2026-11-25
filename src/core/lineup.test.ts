import { describe, expect, it } from 'vitest';
import { lineupSides } from './lineup';

describe('lineupSides', () => {
  it('puts Q7 Q6 Q5 left of the traveller and Q4 Q3 Q2 Q1 right of them', () => {
    const { left, right } = lineupSides(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7']);
    expect(left).toEqual(['Q7', 'Q6', 'Q5']);
    expect(right).toEqual(['Q4', 'Q3', 'Q2', 'Q1']);
  });

  it('gives the extra one to the right on an odd day, and handles none', () => {
    expect(lineupSides(['Q1', 'Q2', 'Q3'])).toEqual({ left: ['Q3'], right: ['Q2', 'Q1'] });
    expect(lineupSides([])).toEqual({ left: [], right: [] });
  });
});
