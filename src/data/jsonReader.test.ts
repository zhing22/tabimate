import { describe, expect, it } from 'vitest';
import { createJsonReader, field, item } from './jsonReader';

describe('field and item paths', () => {
  it('joins paths', () => {
    expect(field('prompts[1]', 'text')).toBe('prompts[1].text');
    expect(item('prompts', 1)).toBe('prompts[1]');
    expect(item('', 3)).toBe('[3]');
  });

  it('a top-level field has no leading dot', () => {
    expect(field('', 'date')).toBe('date');
  });
});

describe('createJsonReader', () => {
  const r = createJsonReader('data/x.json');

  it('reports a top-level failure without a field', () => {
    expect(() => r.object([], '')).toThrow(/^data\/x\.json: must be an object \(got \[\]\)$/);
  });

  it('shows undefined values readably', () => {
    expect(() => r.string(undefined, 'name')).toThrow(/got undefined/);
  });
});
