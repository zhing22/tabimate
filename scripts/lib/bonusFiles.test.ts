import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkBonusFiles } from './bonusFiles';

const items = [1, 2, 3].map((i) => ({ statement: `S${i}`, answer: true, explanation: 'Short.' }));
function dirWith(files: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'bonus-'));
  for (const [name, json] of Object.entries(files))
    writeFileSync(join(dir, name), JSON.stringify(json));
  return dir;
}

describe('checkBonusFiles', () => {
  it('needs a quiz for every upcoming Sunday, and nothing on other days', () => {
    const empty = checkBonusFiles(dirWith({}), ['2026-11-21', '2026-11-22']);
    expect(empty.problems).toEqual(['missing bonus quizzes for upcoming quiz days: 2026-11-22']);
    const ok = checkBonusFiles(dirWith({ '2026-11-22.json': { date: '2026-11-22', items } }), [
      '2026-11-22',
    ]);
    expect(ok.problems).toEqual([]);
    expect([...ok.files.keys()]).toEqual(['2026-11-22']);
  });

  it('reports a bad file, and warns about a quiz on a day without one', () => {
    const result = checkBonusFiles(
      dirWith({
        '2026-11-22.json': { date: '2026-11-22', items: items.slice(1) },
        '2026-11-21.json': { date: '2026-11-21', items },
      }),
      [],
    );
    expect(result.problems).toEqual([expect.stringContaining('bonus/2026-11-22.json')]);
    expect(result.warnings).toEqual([expect.stringContaining('2026-11-21 has no bonus quiz')]);
  });
});
